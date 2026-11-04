-- A failed or cancelled startup must not trap the player or consume their case.
-- The clock never started, so the player learned nothing beyond the public briefing.
create function public.release_unstarted_session(p_session uuid) returns void language plpgsql set search_path='' as $$
declare released uuid; begin
 update public.game_sessions set state='abandoned',updated_at=clock_timestamp()
 where id=p_session and state in ('created','preparing') returning scenario_id into released;
 if released is null then return; end if;
 delete from public.player_scenario_history where session_id=p_session;
 update public.scenario_allocations set lease_until='-infinity' where scenario_id=released;
end $$;
revoke all on function public.release_unstarted_session(uuid) from public,anon,authenticated;
grant execute on function public.release_unstarted_session(uuid) to service_role;

create or replace function public.end_session(p_player uuid,p_session uuid) returns jsonb
language plpgsql set search_path='' as $$
declare g public.game_sessions; at_time timestamptz:=clock_timestamp(); begin
 select * into g from public.game_sessions where id=p_session and player_id=p_player for update;
 if not found then raise exception 'SESSION_NOT_FOUND'; end if;
 if g.state in ('created','preparing') then
  perform public.release_unstarted_session(g.id);
 elsif g.state='active' then
  update public.game_sessions set state='ended',ended_at=least(at_time,started_at+interval '180 seconds'),updated_at=at_time where id=g.id;
 elsif g.state not in ('ended','scored','abandoned') then raise exception 'NOT_ACTIVE'; end if;
 insert into public.session_updates(session_id,kind) values(g.id,'state');
 return '{}';
end $$;

create or replace function public.agent_lifecycle(p_player uuid,p_session uuid,p_action text,p_agent text default null) returns jsonb language plpgsql set search_path='' as $$
declare g public.game_sessions; a public.agent_runs; begin
 select * into g from public.game_sessions where id=p_session and player_id=p_player for update;
 if not found then raise exception 'SESSION_NOT_FOUND'; end if;
 select * into a from public.agent_runs where session_id=g.id;
 if p_action='claim' then
  if g.state not in ('created','preparing','active') then raise exception 'NOT_ACTIVE'; end if;
  if a.session_id is not null then return jsonb_build_object('claimed',false,'state',a.state,'agentId',a.agent_id); end if;
  insert into public.agent_runs(session_id,state) values(g.id,'starting');
  update public.game_sessions set state='preparing',updated_at=now() where id=g.id;
  return jsonb_build_object('claimed',true);
 elsif p_action='commit' then
  if g.state<>'preparing' or a.state is distinct from 'starting' or p_agent is null then raise exception 'AGENT_STATE_CONFLICT'; end if;
  update public.agent_runs set state='running',agent_id=p_agent,updated_at=now() where session_id=g.id;
 elsif p_action='ready' then
  if g.state not in ('preparing','active') or a.state is distinct from 'running' or a.agent_id is null then raise exception 'AGENT_NOT_READY'; end if;
  if g.state='preparing' then update public.game_sessions set state='active',started_at=clock_timestamp(),updated_at=now() where id=g.id; end if;
 elsif p_action='stop' then
  if a.agent_id is not null and a.state<>'stopped' then
   update public.agent_runs set state='stopping',updated_at=now() where session_id=g.id;
   return jsonb_build_object('agentId',a.agent_id);
  end if;
 elsif p_action='stopped' then update public.agent_runs set state='stopped',updated_at=now() where session_id=g.id;
 elsif p_action='failed' then
  -- Fail closed on the run: an ambiguous timeout may have started a remote agent, so it
  -- is never retried. Its provider expiry bounds the cost. The player is released.
  update public.agent_runs set state='failed',updated_at=now() where session_id=g.id;
  perform public.release_unstarted_session(g.id);
 else raise exception 'UNKNOWN_ACTION'; end if;
 insert into public.session_updates(session_id,kind) values(g.id,'state');
 return '{}';
end $$;

-- Release sessions already trapped by a failed start.
select public.release_unstarted_session(g.id) from public.game_sessions g
join public.agent_runs a on a.session_id=g.id where g.state='preparing' and a.state='failed';

-- Leases now only prefer distinct cases. Once every eligible case is leased, players
-- share one instead of being refused. SKIP LOCKED still separates simultaneous joins.
create or replace function public.assign_scenario(p_player uuid,p_key uuid) returns uuid language plpgsql set search_path='' as $$
declare sid uuid; chosen uuid; ver int; begin
 -- Serializes only this player's requests; no global allocation lock.
 insert into public.players(id) values(p_player) on conflict do nothing;
 perform 1 from public.players where id=p_player for update;
 select session_id into sid from public.session_assignment_requests where player_id=p_player and idempotency_key=p_key;
 if sid is not null then return sid; end if;
 -- Reuse an unexpired open session even if a double-click used another key.
 select id into sid from public.game_sessions where player_id=p_player and state in ('created','preparing','active') and created_at>now()-interval '10 minutes' order by created_at desc limit 1;
 if sid is not null then
  insert into public.session_assignment_requests(player_id,idempotency_key,session_id) values(p_player,p_key,sid);
  return sid;
 end if;
 select a.scenario_id,s.version into chosen,ver from public.scenario_allocations a join public.scenarios s on s.id=a.scenario_id
 where s.status='published' and s.validated_at is not null
 and not exists(select 1 from public.player_scenario_history h where h.player_id=p_player and h.scenario_id=s.id)
 order by (a.lease_until>clock_timestamp()),a.assignments,random() limit 1 for update of a,s skip locked;
 if chosen is null then
  if exists(select 1 from public.scenarios s where s.status='published' and not exists(select 1 from public.player_scenario_history h where h.player_id=p_player and h.scenario_id=s.id)) then raise exception 'POOL_BUSY'; end if;
  raise exception 'POOL_EXHAUSTED';
 end if;
 update public.scenario_allocations set lease_until=clock_timestamp()+interval '5 minutes',assignments=assignments+1 where scenario_id=chosen;
 insert into public.game_sessions(player_id,scenario_id,scenario_version,idempotency_key) values(p_player,chosen,ver,p_key) returning id into sid;
 insert into public.player_scenario_history(player_id,scenario_id,session_id) values(p_player,chosen,sid);
 insert into public.session_assignment_requests(player_id,idempotency_key,session_id) values(p_player,p_key,sid);
 return sid;
end $$;
revoke all on function public.assign_scenario(uuid,uuid) from public,anon,authenticated;
grant execute on function public.assign_scenario(uuid,uuid) to service_role;

-- Provider history is polled, so a turn is timestamped when synced rather than when
-- spoken. A 15-second grace lets the final sync record what was said before the deadline.
create or replace function public.session_action(p_player uuid,p_session uuid,p_action text,p_payload jsonb default '{}') returns jsonb language plpgsql set search_path='' as $$
declare g public.game_sessions; d jsonb; f jsonb; e jsonb; ev public.session_events; v public.verdicts;
 ids text[]; known text[]; n int; vp int; ep int; fp int; tp int; at_time timestamptz;
begin
 select * into g from public.game_sessions where id=p_session and player_id=p_player for update;
 if not found then raise exception 'SESSION_NOT_FOUND'; end if;
 -- Measure after acquiring the row lock: queued calls cannot reuse a pre-lock clock.
 at_time:=clock_timestamp();
 select dossier into d from public.scenario_secrets where scenario_id=g.scenario_id;
 if p_action='read' then return jsonb_build_object('session',to_jsonb(g),'scenario',d,'factIds',coalesce((select jsonb_agg(fact_id) from public.session_facts where session_id=g.id),'[]'),'score',(select to_jsonb(s) from public.scores s where s.session_id=g.id),'verdict',(select to_jsonb(verdict_row) from public.verdicts verdict_row where verdict_row.session_id=g.id));
 elsif p_action='start' then
  if g.state='created' then update public.game_sessions set state='active',started_at=at_time,updated_at=at_time where id=g.id; end if;
 elsif p_action='end' then
  if g.state='active' then update public.game_sessions set state='ended',ended_at=least(at_time,g.started_at+interval '180 seconds'),updated_at=at_time where id=g.id;
  elsif g.state not in ('ended','scored') then raise exception 'NOT_ACTIVE'; end if;
 elsif p_action='turn' then
  if g.state<>'active' or at_time>=g.started_at+interval '195 seconds' then raise exception 'NOT_ACTIVE'; end if;
  select * into ev from public.session_events where session_id=g.id and turn_id=p_payload->>'turnId';
  if found then
   if ev.transcript<>p_payload->>'transcript' or ev.actor<>p_payload->>'actor' or ev.source<>p_payload->>'source' then raise exception 'TURN_CONFLICT'; end if;
  else insert into public.session_events(session_id,turn_id,actor,transcript,source) values(g.id,p_payload->>'turnId',p_payload->>'actor',p_payload->>'transcript',p_payload->>'source'); end if;
 elsif p_action='fact' then
  if exists(select 1 from public.session_facts where session_id=g.id and fact_id=p_payload->>'factId') then return '{}'; end if;
  if g.state<>'active' or at_time>=g.started_at+interval '195 seconds' then raise exception 'NOT_ACTIVE'; end if;
  select private_data into f from public.scenario_facts where scenario_id=g.scenario_id and id=p_payload->>'factId';
  if not found then raise exception 'UNKNOWN_FACT'; end if;
  select * into ev from public.session_events where session_id=g.id and turn_id=p_payload->>'turnId' and actor='suspect' and source=p_payload->>'source';
  if not found or ev.created_at<g.started_at or ev.created_at>=g.started_at+interval '195 seconds' then raise exception 'UNVERIFIED_DISCLOSURE'; end if;
  -- Conservative MVP: full canonical disclosure sentence, not a substring in a denial.
  if not exists(select 1 from jsonb_array_elements_text(f->'disclosurePhrases') p where lower(trim(p))=lower(trim(ev.transcript))) then raise exception 'UNSUPPORTED_DISCLOSURE'; end if;
  if exists(select 1 from jsonb_array_elements_text(f->'prerequisiteFactIds') p where not exists(select 1 from public.session_facts sf where sf.session_id=g.id and sf.fact_id=p)) then raise exception 'FACT_LOCKED'; end if;
  insert into public.session_facts(session_id,scenario_id,fact_id,turn_id) values(g.id,g.scenario_id,p_payload->>'factId',ev.turn_id) on conflict do nothing;
  for e in select private_data from public.secret_evidence where scenario_id=g.scenario_id loop
   if not exists(select 1 from jsonb_array_elements_text(e->'trigger'->'allFactIds') p where not exists(select 1 from public.session_facts sf where sf.session_id=g.id and sf.fact_id=p)) then
    insert into public.session_clues(session_id,scenario_id,evidence_id,public_data) values(g.id,g.scenario_id,e->>'id',(e-'interpretation'-'trigger')||case when e->>'category'='red_herring' then '{"category":"testimony"}'::jsonb else '{}'::jsonb end) on conflict do nothing;
   end if;
  end loop;
  insert into public.session_updates(session_id,kind) values(g.id,'clues_and_suggestions');
 elsif p_action='verdict' then
  select array_agg(distinct value order by value) into ids from jsonb_array_elements_text(p_payload->'evidenceIds'); ids:=coalesce(ids,'{}');
  select * into v from public.verdicts where session_id=g.id;
  if found then
   if v.verdict<>p_payload->>'verdict' or v.evidence_ids<>ids or coalesce(v.reasoning,'')<>coalesce(p_payload->>'reasoning','') then raise exception 'VERDICT_LOCKED'; end if;
   return '{}';
  end if;
  if g.state='active' and at_time>=g.started_at+interval '180 seconds' then
   update public.game_sessions set state='ended',ended_at=started_at+interval '180 seconds',updated_at=at_time where id=g.id returning * into g;
  end if;
  if g.state<>'ended' then raise exception 'END_INTERROGATION_FIRST'; end if;
  if exists(select 1 from unnest(ids) as cited(evidence_id) where not exists(select 1 from public.evidence e where e.scenario_id=g.scenario_id and e.id=cited.evidence_id) and not exists(select 1 from public.session_clues c where c.session_id=g.id and c.evidence_id=cited.evidence_id)) then raise exception 'EVIDENCE_NOT_VISIBLE'; end if;
  vp:=case when p_payload->>'verdict'=d->'answerKey'->>'verdict' then 500 else 0 end;
  select count(*) into n from jsonb_array_elements(d->'answerKey'->'pivotal') p where p->>'evidenceId'=any(ids);
  ep:=floor(300.0*n/jsonb_array_length(d->'answerKey'->'pivotal'));
  select count(*) into n from public.session_facts where session_id=g.id;
  fp:=floor(150.0*n/jsonb_array_length(d->'knowledge'->'facts'));
  tp:=floor(50.0*greatest(0,180-extract(epoch from (g.ended_at-g.started_at)))/180);
  insert into public.verdicts(session_id,verdict,evidence_ids,reasoning) values(g.id,p_payload->>'verdict',ids,p_payload->>'reasoning');
  insert into public.scores(session_id,verdict_points,evidence_points,fact_points,time_points,reason_codes) values(g.id,vp,ep,fp,tp,array[case when vp=500 then 'VERDICT_CORRECT' else 'VERDICT_INCORRECT' end]||case when ep<300 then array['PIVOTAL_EVIDENCE_MISSING'] else '{}'::text[] end);
  update public.game_sessions set state='scored',updated_at=at_time where id=g.id;
 else raise exception 'UNKNOWN_ACTION'; end if;
 if p_action in ('start','end','verdict') then insert into public.session_updates(session_id,kind) values(g.id,'state'); end if;
 return '{}';
end $$;
revoke all on function public.session_action(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.session_action(uuid,uuid,text,jsonb) to service_role;
