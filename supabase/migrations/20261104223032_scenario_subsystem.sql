-- Public API uses allowlisted server projections. No client writes to game tables.
create table public.players (
 id uuid primary key references auth.users(id), display_name text not null default 'Detective' check(length(display_name) between 2 and 24),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.scenarios (
 id uuid primary key, version int not null check(version>0), schema_version int not null check(schema_version=1),
 title text not null, public_briefing text not null, setting text not null, difficulty text not null check(difficulty in ('easy','medium','hard')),
 status text not null check(status in ('draft','validated','published','retired')), validated_at timestamptz,
 fingerprint text not null unique check(length(fingerprint)=64), generator_version text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(status<>'published' or validated_at is not null), unique(id,version)
);
create table public.scenario_secrets (
 scenario_id uuid primary key references public.scenarios(id), dossier jsonb not null
);
create table public.suspects (
 scenario_id uuid primary key references public.scenarios(id), id text not null, public_persona jsonb not null
);
-- Public and hidden rows physically separate. Neither contains interpretation in browser projections.
create table public.evidence (
 scenario_id uuid not null references public.scenarios(id), id text not null, public_data jsonb not null,
 primary key(scenario_id,id)
);
create table public.secret_evidence (
 scenario_id uuid not null references public.scenarios(id), id text not null, private_data jsonb not null,
 primary key(scenario_id,id)
);
create table public.suggested_questions (
 scenario_id uuid not null references public.scenarios(id), id text not null, private_data jsonb not null,
 primary key(scenario_id,id)
);
create table public.scenario_facts (
 scenario_id uuid not null references public.scenarios(id), id text not null, private_data jsonb not null,
 primary key(scenario_id,id)
);
create table public.scenario_allocations (
 scenario_id uuid primary key references public.scenarios(id), lease_until timestamptz not null default '-infinity', assignments bigint not null default 0
);
create table public.game_sessions (
 id uuid primary key default gen_random_uuid(), player_id uuid not null references public.players(id),
 scenario_id uuid not null, scenario_version int not null, idempotency_key uuid not null,
 state text not null default 'created' check(state in ('created','preparing','active','ended','scored','abandoned')),
 started_at timestamptz, ended_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 foreign key(scenario_id,scenario_version) references public.scenarios(id,version),
 unique(player_id,idempotency_key), unique(id,scenario_id), unique(id,player_id),
 check(ended_at is null or started_at is not null), check(ended_at is null or ended_at>=started_at)
);
-- Every accepted join key remains bound to its original session, including
-- a second double-click key that reused an already-open session.
create table public.session_assignment_requests (
 player_id uuid not null references public.players(id), idempotency_key uuid not null,
 session_id uuid not null, created_at timestamptz not null default now(),
 primary key(player_id,idempotency_key),
 foreign key(session_id,player_id) references public.game_sessions(id,player_id)
);
create index assignment_requests_session on public.session_assignment_requests(session_id);
create table public.player_scenario_history (
 player_id uuid not null references public.players(id), scenario_id uuid not null references public.scenarios(id),
 session_id uuid not null unique, created_at timestamptz not null default now(),
 primary key(player_id,scenario_id), foreign key(session_id,scenario_id) references public.game_sessions(id,scenario_id),
 foreign key(session_id,player_id) references public.game_sessions(id,player_id)
);
create table public.session_events (
 session_id uuid not null references public.game_sessions(id), turn_id text not null, actor text not null check(actor in ('suspect','detective')),
 transcript text not null check(length(transcript) between 1 and 12000), source text not null,
 created_at timestamptz not null default clock_timestamp(), primary key(session_id,turn_id)
);
create table public.session_facts (
 session_id uuid not null, scenario_id uuid not null, fact_id text not null, turn_id text not null,
 created_at timestamptz not null default clock_timestamp(), primary key(session_id,fact_id),
 foreign key(session_id,scenario_id) references public.game_sessions(id,scenario_id),
 foreign key(scenario_id,fact_id) references public.scenario_facts(scenario_id,id),
 foreign key(session_id,turn_id) references public.session_events(session_id,turn_id)
);
create table public.session_clues (
 session_id uuid not null, scenario_id uuid not null, evidence_id text not null, public_data jsonb not null,
 created_at timestamptz not null default now(), primary key(session_id,evidence_id),
 foreign key(session_id,scenario_id) references public.game_sessions(id,scenario_id),
 foreign key(scenario_id,evidence_id) references public.secret_evidence(scenario_id,id)
);
create table public.session_updates (
 id bigint generated always as identity primary key, session_id uuid not null references public.game_sessions(id),
 kind text not null check(kind in ('state','clues_and_suggestions')), created_at timestamptz not null default now()
);
create table public.verdicts (
 session_id uuid primary key references public.game_sessions(id), verdict text not null check(verdict in ('guilty','innocent')),
 evidence_ids text[] not null, reasoning text check(length(reasoning)<=2000), created_at timestamptz not null default now()
);
create table public.scores (
 session_id uuid primary key references public.verdicts(session_id), verdict_points int not null check(verdict_points in (0,500)),
 evidence_points int not null check(evidence_points between 0 and 300), fact_points int not null check(fact_points between 0 and 150),
 time_points int not null check(time_points between 0 and 50),
 total int generated always as (verdict_points+evidence_points+fact_points+time_points) stored,
 scoring_version int not null default 1 check(scoring_version=1), reason_codes text[] not null,
 created_at timestamptz not null default now()
);
create table public.scenario_generation_jobs (
 id uuid primary key default gen_random_uuid(), seed text not null, generator_version text not null,
 status text not null check(status in ('running','failed','review','published')), failures jsonb not null default '[]',
 provenance jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index scenario_selection on public.scenarios(status,difficulty) where status='published';
create index allocation_selection on public.scenario_allocations(lease_until,assignments);
create index sessions_owner on public.game_sessions(player_id,created_at desc);
create index sessions_scenario on public.game_sessions(scenario_id);
create index history_scenario on public.player_scenario_history(scenario_id);
create index leaderboard_score on public.scores(total desc,created_at);
create index session_updates_session on public.session_updates(session_id,id);

-- Fail closed: grants and RLS are both required. Sensitive tables have no client policies.
do $$ declare t text; begin
 foreach t in array array['players','scenarios','scenario_secrets','suspects','evidence','secret_evidence','suggested_questions','scenario_facts','scenario_allocations','game_sessions','session_assignment_requests','player_scenario_history','session_events','session_facts','session_clues','session_updates','verdicts','scores','scenario_generation_jobs'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;
grant usage,select on sequence public.session_updates_id_seq to service_role;
grant select on public.players, public.game_sessions, public.session_clues, public.session_updates to authenticated;
create policy own_player on public.players for select to authenticated using(id=(select auth.uid()));
create policy own_session on public.game_sessions for select to authenticated using(player_id=(select auth.uid()));
create policy own_clues on public.session_clues for select to authenticated using(exists(select 1 from public.game_sessions g where g.id=session_id and g.player_id=(select auth.uid())));
create policy own_updates on public.session_updates for select to authenticated using(exists(select 1 from public.game_sessions g where g.id=session_id and g.player_id=(select auth.uid())));

create function public.freeze_scenario_content() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_table_name='scenarios' then
  if (to_jsonb(new)-'status'-'updated_at')<>(to_jsonb(old)-'status'-'updated_at') then raise exception 'IMMUTABLE_SCENARIO'; end if;
  return new;
 end if;
 raise exception 'IMMUTABLE_SCENARIO_CONTENT';
end $$;
create trigger freeze_scenarios before update on public.scenarios for each row execute function public.freeze_scenario_content();
do $$ declare t text; begin
 foreach t in array array['scenario_secrets','suspects','evidence','secret_evidence','suggested_questions','scenario_facts'] loop
 execute format('create trigger freeze_content before update or delete on public.%I for each row execute function public.freeze_scenario_content()',t);
 end loop;
end $$;

-- All RPCs below are SECURITY INVOKER, service-role only, and unavailable to browser JWTs.
create function public.publish_scenario(doc jsonb) returns uuid language plpgsql set search_path='' as $$
declare sid uuid:=(doc->>'scenarioId')::uuid; e jsonb; begin
 insert into public.scenarios(id,version,schema_version,title,public_briefing,setting,difficulty,status,validated_at,fingerprint,generator_version)
 values(sid,(doc->>'version')::int,1,doc->>'title',doc->>'publicBriefing',doc->>'setting',doc->>'difficulty','published',now(),doc->>'fingerprint',doc->>'generatorVersion');
 insert into public.scenario_secrets values(sid,doc);
 insert into public.suspects values(sid,doc->'suspect'->>'id',doc->'suspect');
 for e in select value from jsonb_array_elements((doc->'publicEvidence')||(doc->'discoverableEvidence')||(doc->'redHerrings')) loop
  if e->>'availability'='public' then insert into public.evidence values(sid,e->>'id',(e-'interpretation'-'trigger')||case when e->>'category'='red_herring' then '{"category":"testimony"}'::jsonb else '{}'::jsonb end);
  else insert into public.secret_evidence values(sid,e->>'id',e); end if;
 end loop;
 for e in select value from jsonb_array_elements(doc->'suggestedQuestions') loop insert into public.suggested_questions values(sid,e->>'id',e); end loop;
 for e in select value from jsonb_array_elements(doc->'knowledge'->'facts') loop insert into public.scenario_facts values(sid,e->>'id',e); end loop;
 insert into public.scenario_allocations(scenario_id) values(sid);
 return sid;
end $$;

create function public.assign_scenario(p_player uuid,p_key uuid) returns uuid language plpgsql set search_path='' as $$
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
 where s.status='published' and s.validated_at is not null and a.lease_until<=clock_timestamp()
 and not exists(select 1 from public.player_scenario_history h where h.player_id=p_player and h.scenario_id=s.id)
 order by a.assignments,a.scenario_id limit 1 for update of a,s skip locked;
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

create function public.session_action(p_player uuid,p_session uuid,p_action text,p_payload jsonb default '{}') returns jsonb language plpgsql set search_path='' as $$
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
  if g.state<>'active' or at_time>=g.started_at+interval '180 seconds' then raise exception 'NOT_ACTIVE'; end if;
  select * into ev from public.session_events where session_id=g.id and turn_id=p_payload->>'turnId';
  if found then
   if ev.transcript<>p_payload->>'transcript' or ev.actor<>p_payload->>'actor' or ev.source<>p_payload->>'source' then raise exception 'TURN_CONFLICT'; end if;
  else insert into public.session_events(session_id,turn_id,actor,transcript,source) values(g.id,p_payload->>'turnId',p_payload->>'actor',p_payload->>'transcript',p_payload->>'source'); end if;
 elsif p_action='fact' then
  if exists(select 1 from public.session_facts where session_id=g.id and fact_id=p_payload->>'factId') then return '{}'; end if;
  if g.state<>'active' or at_time>=g.started_at+interval '180 seconds' then raise exception 'NOT_ACTIVE'; end if;
  select private_data into f from public.scenario_facts where scenario_id=g.scenario_id and id=p_payload->>'factId';
  if not found then raise exception 'UNKNOWN_FACT'; end if;
  select * into ev from public.session_events where session_id=g.id and turn_id=p_payload->>'turnId' and actor='suspect' and source=p_payload->>'source';
  if not found or ev.created_at<g.started_at or ev.created_at>=g.started_at+interval '180 seconds' then raise exception 'UNVERIFIED_DISCLOSURE'; end if;
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

create function public.read_leaderboard() returns jsonb language sql set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(r)),'[]') from (
 select p.id as "playerId",p.display_name as "detectiveName",sum(s.total)::int as total,max(s.total) as "bestScore",count(*)::int as "gamesPlayed"
 from public.scores s join public.game_sessions g on g.id=s.session_id join public.players p on p.id=g.player_id
 group by p.id,p.display_name order by sum(s.total) desc,max(s.total) desc,p.id limit 50) r;
$$;
revoke all on function public.freeze_scenario_content(),public.publish_scenario(jsonb),public.assign_scenario(uuid,uuid),public.session_action(uuid,uuid,text,jsonb),public.read_leaderboard() from public,anon,authenticated;
grant execute on function public.publish_scenario(jsonb),public.assign_scenario(uuid,uuid),public.session_action(uuid,uuid,text,jsonb),public.read_leaderboard() to service_role;
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  alter publication supabase_realtime add table public.session_updates,public.session_clues,public.game_sessions;
 end if;
end $$;
