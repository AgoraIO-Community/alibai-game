-- A cancelled startup must not leave a billable agent or start a clock later.
create function public.end_session(p_player uuid,p_session uuid) returns jsonb
language plpgsql set search_path='' as $$
declare g public.game_sessions; at_time timestamptz:=clock_timestamp(); begin
 select * into g from public.game_sessions where id=p_session and player_id=p_player for update;
 if not found then raise exception 'SESSION_NOT_FOUND'; end if;
 if g.state in ('created','preparing') then
  update public.game_sessions set state='abandoned',updated_at=at_time where id=g.id;
 elsif g.state='active' then
  update public.game_sessions set state='ended',ended_at=least(at_time,started_at+interval '180 seconds'),updated_at=at_time where id=g.id;
 elsif g.state not in ('ended','scored','abandoned') then raise exception 'NOT_ACTIVE'; end if;
 insert into public.session_updates(session_id,kind) values(g.id,'state');
 return '{}';
end $$;
revoke all on function public.end_session(uuid,uuid) from public,anon,authenticated;
grant execute on function public.end_session(uuid,uuid) to service_role;

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
  -- Fail closed: an ambiguous network timeout may have started the remote agent.
  -- Keep its reservation; operators reconcile it rather than creating duplicates.
  update public.agent_runs set state='failed',updated_at=now() where session_id=g.id;
 else raise exception 'UNKNOWN_ACTION'; end if;
 insert into public.session_updates(session_id,kind) values(g.id,'state');
 return '{}';
end $$;
revoke all on function public.agent_lifecycle(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.agent_lifecycle(uuid,uuid,text,text) to service_role;
