-- Safe, bounded hosted smoke test. Everything (including synthetic users) rolls back.
-- Run as the database owner through trusted management SQL, never browser credentials.
begin;
set local statement_timeout='25s';
set local lock_timeout='5s';

-- This shared bookkeeping is temporary and disappears at rollback.
create temporary table alibai_smoke_ids(player_a uuid,player_b uuid,session_a uuid,session_b uuid) on commit drop;
create temporary table alibai_smoke_checks(check_name text primary key) on commit drop;

do $$
declare
 pa uuid:=gen_random_uuid(); pb uuid:=gen_random_uuid(); pc uuid:=gen_random_uuid(); ka uuid:=gen_random_uuid(); kb uuid:=gen_random_uuid(); second_key uuid:=gen_random_uuid();
 sa uuid; sb uuid; sa_again uuid; sn uuid; before_a jsonb; after_a jsonb; snap_b jsonb; snap_next jsonb;
 fact jsonb; case_row record; history_session uuid; fids text[]; evs jsonb; payload jsonb; expected_score int; matched int; avatar_count int; hidden text; rejected boolean;
begin
 select count(*) into avatar_count from public.avatar_catalog where enabled;
 if avatar_count<>14 then raise exception 'SMOKE: expected 14 enabled avatars, found %',avatar_count; end if;
 insert into alibai_smoke_checks values('14_enabled_avatars');
 if (select count(*) from public.scenarios where status='published' and validated_at is not null)<8 then raise exception 'SMOKE: fewer than 8 validated published scenarios'; end if;
 insert into alibai_smoke_checks values('published_inventory');
 if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relname=any(array['players','scenarios','scenario_secrets','suspects','evidence','secret_evidence','suggested_questions','scenario_facts','scenario_allocations','game_sessions','session_assignment_requests','player_scenario_history','session_events','session_facts','session_clues','session_updates','verdicts','scores','scenario_generation_jobs','agent_runs','avatar_catalog']) and not c.relrowsecurity) then raise exception 'SMOKE: an app table lacks RLS'; end if;
 insert into alibai_smoke_checks values('all_app_tables_rls_enabled');
 if exists(select 1 from unnest(array['anon','authenticated']) browser_role
  cross join unnest(array['scenario_secrets','secret_evidence','scenario_facts','suggested_questions','session_events','session_facts','verdicts','scores','agent_runs','scenario_generation_jobs','scenario_allocations','session_assignment_requests','avatar_catalog']) secret_table
  where has_table_privilege(browser_role,'public.'||secret_table,'SELECT')) then raise exception 'SMOKE: browser role has private SELECT grant'; end if;
 insert into alibai_smoke_checks values('all_private_tables_browser_grants_denied');
 insert into auth.users(id,email,role,aud,email_confirmed_at,created_at,updated_at)
 values(pa,'smoke-'||pa||'@example.invalid','authenticated','authenticated',now(),now(),now()),
       (pb,'smoke-'||pb||'@example.invalid','authenticated','authenticated',now(),now(),now()),
       (pc,'smoke-'||pc||'@example.invalid','authenticated','authenticated',now(),now(),now());
 sa:=public.assign_scenario(pa,ka); sb:=public.assign_scenario(pb,kb);
 before_a:=public.session_action(pa,sa,'read','{}'); snap_b:=public.session_action(pb,sb,'read','{}');
 if before_a#>>'{session,scenario_id}'=snap_b#>>'{session,scenario_id}' then raise exception 'SMOKE: lease allocation did not choose distinct cases'; end if;
 insert into alibai_smoke_checks values('two_player_distinct_allocation');
 if public.assign_scenario(pa,ka)<>sa or public.assign_scenario(pa,second_key)<>sa then raise exception 'SMOKE: assignment retry mismatch'; end if;
 if (select count(*) from public.player_scenario_history where player_id=pa)<>1 then raise exception 'SMOKE: duplicate history'; end if;
 insert into alibai_smoke_checks values('idempotent_assignment_and_history');
 if not exists(select 1 from public.avatar_catalog where id=(before_a#>>'{session,avatar_id}')::uuid and voice_id=before_a#>>'{session,minimax_voice_id}') then raise exception 'SMOKE: avatar voice mismatch'; end if;
 insert into alibai_smoke_checks values('avatar_voice_snapshot');
 rejected:=false;
 begin
  update public.game_sessions set minimax_voice_id='tampered' where id=sa;
 exception when others then
  if sqlerrm='IMMUTABLE_SESSION_ASSIGNMENT' then rejected:=true; else raise; end if;
 end;
 if not rejected then raise exception 'SMOKE: session casting mutated'; end if;
 insert into alibai_smoke_checks values('immutable_session_casting');
 rejected:=false;
 begin perform public.session_action(pb,sa,'read','{}');
 exception when others then if sqlerrm='SESSION_NOT_FOUND' then rejected:=true; else raise; end if; end;
 if not rejected then raise exception 'SMOKE: cross-player session access'; end if;
 insert into alibai_smoke_checks values('owner_validation');
 rejected:=false;
 begin perform public.session_action(pa,sa,'verdict','{"verdict":"guilty","evidenceIds":[]}');
 exception when others then if sqlerrm='END_INTERROGATION_FIRST' then rejected:=true; else raise; end if; end;
 if not rejected then raise exception 'SMOKE: briefing accepted verdict'; end if;
 insert into alibai_smoke_checks values('briefing_verdict_rejected');
 perform public.session_action(pb,sb,'start','{}'); perform public.session_action(pb,sb,'end','{}');
 hidden:=snap_b#>>'{scenario,answerKey,pivotal,0,evidenceId}'; rejected:=false;
 begin perform public.session_action(pb,sb,'verdict',jsonb_build_object('verdict',snap_b#>>'{scenario,answerKey,verdict}','evidenceIds',jsonb_build_array(hidden)));
 exception when others then if sqlerrm='EVIDENCE_NOT_VISIBLE' then rejected:=true; else raise; end if; end;
 if not rejected then raise exception 'SMOKE: hidden evidence citation accepted'; end if;
 insert into alibai_smoke_checks values('hidden_evidence_citation_rejected');
 perform public.session_action(pa,sa,'start','{}');
 fact:=before_a#>'{scenario,knowledge,facts,0}'; rejected:=false;
 perform public.session_action(pa,sa,'turn',jsonb_build_object('turnId','detective-test','actor','detective','transcript',fact#>>'{disclosurePhrases,0}','source','smoke-provider'));
 begin perform public.session_action(pa,sa,'fact',jsonb_build_object('factId',fact->>'id','turnId','detective-test','source','smoke-provider'));
 exception when others then if sqlerrm='UNVERIFIED_DISCLOSURE' then rejected:=true; else raise; end if; end;
 if not rejected then raise exception 'SMOKE: detective utterance awarded a fact'; end if;
 insert into alibai_smoke_checks values('detective_speech_not_discovery');
 for fact in select value from jsonb_array_elements(before_a#>'{scenario,knowledge,facts}') loop
  perform public.session_action(pa,sa,'turn',jsonb_build_object('turnId',fact->>'id','actor','suspect','transcript',fact#>>'{disclosurePhrases,0}','source','smoke-provider'));
  perform public.session_action(pa,sa,'fact',jsonb_build_object('factId',fact->>'id','turnId',fact->>'id','source','smoke-provider'));
  perform public.session_action(pa,sa,'fact',jsonb_build_object('factId',fact->>'id','turnId',fact->>'id','source','smoke-provider'));
 end loop;
 after_a:=public.session_action(pa,sa,'read','{}');
 if jsonb_array_length(after_a->'factIds')<>jsonb_array_length(before_a#>'{scenario,knowledge,facts}') then raise exception 'SMOKE: fact deduplication/count mismatch'; end if;
 if (select count(*) from public.session_clues where session_id=sa)<>3 then raise exception 'SMOKE: discovered clue count'; end if;
 if exists(select 1 from public.session_clues where session_id=sa and (public_data ? 'interpretation' or public_data ? 'trigger' or public_data->>'category'='red_herring')) then raise exception 'SMOKE: private clue metadata leaked'; end if;
 insert into alibai_smoke_checks values('verified_fact_discovery_idempotent');
 insert into alibai_smoke_checks values('clue_projection_private_fields_removed');
 perform public.session_action(pa,sa,'end','{}');
 select jsonb_agg(p->>'evidenceId') into evs from jsonb_array_elements(before_a#>'{scenario,answerKey,pivotal}') p;
 payload:=jsonb_build_object('verdict',before_a#>>'{scenario,answerKey,verdict}','evidenceIds',evs,'reasoning','Rollback smoke test corroboration.');
 perform public.session_action(pa,sa,'verdict',payload); perform public.session_action(pa,sa,'verdict',payload);
 after_a:=public.session_action(pa,sa,'read','{}');
 if after_a#>>'{session,state}'<>'scored' then raise exception 'SMOKE: not scored'; end if;
 select 950+floor(50.0*greatest(0,180-extract(epoch from (ended_at-started_at)))/180)::int into expected_score from public.game_sessions where id=sa;
 if (after_a#>>'{score,total}')::int<>expected_score or (after_a#>>'{score,evidence_points}')::int<>300 or (after_a#>>'{score,fact_points}')::int<>150 then raise exception 'SMOKE: deterministic score mismatch'; end if;
 insert into alibai_smoke_checks values('deterministic_1000_point_rubric');
 if public.assign_scenario(pa,second_key)<>sa then raise exception 'SMOKE: reused key changed after scoring'; end if;
 insert into alibai_smoke_checks values('retry_key_stable_after_scoring');
 rejected:=false;
 begin perform public.session_action(pa,sa,'verdict',jsonb_set(payload,'{verdict}',to_jsonb(case when payload->>'verdict'='guilty' then 'innocent' else 'guilty' end)));
 exception when others then if sqlerrm='VERDICT_LOCKED' then rejected:=true; else raise; end if; end;
 if not rejected then raise exception 'SMOKE: locked verdict changed'; end if;
 insert into alibai_smoke_checks values('verdict_locked');
 sn:=public.assign_scenario(pa,gen_random_uuid()); snap_next:=public.session_action(pa,sn,'read','{}');
 if snap_next#>>'{session,scenario_id}'=before_a#>>'{session,scenario_id}' or snap_next#>>'{session,avatar_id}'=before_a#>>'{session,avatar_id}' then raise exception 'SMOKE: round repeated case or avatar'; end if;
 if before_a#>'{scenario,truth}'<>(select dossier->'truth' from public.scenario_secrets where scenario_id=(before_a#>>'{session,scenario_id}')::uuid) then raise exception 'SMOKE: casting changed truth'; end if;
 insert into alibai_smoke_checks values('next_round_case_avatar_variety_immutable_truth');
 -- Populate only synthetic history to exercise exhaustion without altering real leases.
 insert into public.players(id) values(pc);
 for case_row in select id,version from public.scenarios where status='published' loop
  insert into public.game_sessions(player_id,scenario_id,scenario_version,idempotency_key,state,started_at,ended_at)
  values(pc,case_row.id,case_row.version,gen_random_uuid(),'ended',now()-interval '180 seconds',now()) returning id into history_session;
  insert into public.player_scenario_history(player_id,scenario_id,session_id) values(pc,case_row.id,history_session);
 end loop;
 rejected:=false;
 begin perform public.assign_scenario(pc,gen_random_uuid());
 exception when others then if sqlerrm='POOL_EXHAUSTED' then rejected:=true; else raise; end if; end;
 if not rejected then raise exception 'SMOKE: exhausted player received a repeat'; end if;
 insert into alibai_smoke_checks values('strict_pool_exhaustion_no_repeat');
 insert into alibai_smoke_ids values(pa,pb,sa,sb);
end $$;

-- RLS is checked with an actual authenticated role and synthetic player claim.
grant select on alibai_smoke_ids to authenticated;
select set_config('request.jwt.claim.sub',(select player_a::text from alibai_smoke_ids),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',(select player_a::text from alibai_smoke_ids),'role','authenticated')::text,true);
set local role authenticated;
do $$ declare n int; blocked boolean:=false; begin
 select count(*) into n from public.game_sessions where player_id=(select player_b from alibai_smoke_ids);
 if n<>0 then raise exception 'SMOKE: RLS exposed another player session'; end if;
 begin perform 1 from public.scenario_secrets limit 1; exception when insufficient_privilege then blocked:=true; end;
 if not blocked then raise exception 'SMOKE: browser could SELECT scenario_secrets'; end if;
 blocked:=false;
 begin perform 1 from public.avatar_catalog limit 1; exception when insufficient_privilege then blocked:=true; end;
 if not blocked then raise exception 'SMOKE: browser could SELECT avatar_catalog'; end if;
 blocked:=false;
 begin perform public.session_action((select player_a from alibai_smoke_ids),(select session_a from alibai_smoke_ids),'read','{}'); exception when insufficient_privilege then blocked:=true; end;
 if not blocked then raise exception 'SMOKE: browser could execute private RPC'; end if;
end $$;
reset role;
insert into alibai_smoke_checks values('actual_authenticated_role_owner_rls'),('actual_authenticated_role_secret_denial'),('actual_authenticated_role_catalog_denial'),('actual_authenticated_role_private_rpc_denial');

select count(*) as passed_checks,array_agg(check_name order by check_name) as checks from alibai_smoke_checks;
rollback;
