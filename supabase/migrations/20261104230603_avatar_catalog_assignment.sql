-- A pre-feature remote agent may be using an environment-level avatar. Its
-- actual cast cannot be inferred from the old session row. Never recast a live
-- or ambiguous remote run during the backfill; reconcile/stop it first.
do $$ begin
 if exists(select 1 from public.agent_runs where state in ('starting','running','stopping','failed')) then
  raise exception 'ACTIVE_AGENTS_REQUIRE_RECONCILIATION: stop or reconcile active/failed agent runs before installing per-session casting';
 end if;
end $$;

-- Anam avatars are cast performers, not case identities or verdict labels.
-- Source: user-provided ../anam-avatar-catalog.json. Only avatarId is used;
-- personaId/build IDs are deliberately not used for Agora avatar configuration.
create table public.avatar_catalog (
 id uuid primary key,
 enabled boolean not null default true,
 voice_id text not null check(length(trim(voice_id))>0),
 label text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.avatar_catalog enable row level security;
revoke all on public.avatar_catalog from public,anon,authenticated;
grant select,insert,update on public.avatar_catalog to service_role;
insert into public.avatar_catalog(id,label,voice_id) values
 ('36d8b673-a812-4656-8589-f518bdfab4c1','David - Decision Coach','English_Steadymentor'),
 ('32673c5e-f85f-4a87-a104-b92b7de9cb39','Mei - Mandarin Partner','English_Graceful_Lady'),
 ('ccf00c0e-7302-455b-ace2-057e0cf58127','Kevin - Language Tutor','English_PatientMan'),
 ('6f7d4c45-4b5a-4258-9518-b48c2e92be1b','Arthur - Roman History Professor','English_WiseScholar'),
 ('c98240cb-78df-4ddf-a042-000ffa1821e6','Eleanor - Patient Roleplay','English_Wiselady'),
 ('400b9683-114e-4336-8348-f78a6860de54','Mateo - Portuguese Barista','English_FriendlyPerson'),
 ('9e34b769-2fa0-44d8-893a-10ef913aa60e','Gavin - Site Compliance Foreman','English_Diligent_Man'),
 ('ecfb2ddb-80ec-4526-88a7-299a4738957c','Hunter - Consultative Sales','English_Debator'),
 ('a64dd018-7dff-4f86-a623-0230f71fffa6','Harold - Executive Coach','English_Deep-VoicedGentleman'),
 ('8d832471-2229-471a-86bb-ef3b9849647e','Lio Wren - Bakery Apprentice','English_DecentYoungMan'),
 ('76c28378-31c2-4b17-849c-a8cab2a700fd','Nessa Quill - Route Coordinator','English_ConfidentWoman'),
 ('a7665182-6b91-4e51-9baf-5f815ffac08c','Mara - Clock Restorer','English_CalmWoman'),
 ('b9360f87-0c5c-40c3-9def-e54044fa159e','Vesper - 2055 City Guide','English_SereneWoman'),
 ('a9282e1d-7261-4eee-ae7e-c990f40b2826','Bren Ash - Canal Maintenance Scheduler','English_MaturePartner');

alter table public.game_sessions add column avatar_id uuid references public.avatar_catalog(id);
alter table public.game_sessions add column minimax_voice_id text check(length(trim(minimax_voice_id))>0);
create index game_sessions_player_avatar on public.game_sessions(player_id,avatar_id);

-- Existing sessions receive stable assignments in chronological player order.
-- The case dossier, identity and verdict are never changed by this backfill.
with roster as (
 select id,voice_id,row_number() over(order by id)-1 as position,count(*) over() as size
 from public.avatar_catalog where enabled
), sessions as (
 select id,row_number() over(partition by player_id order by created_at,id)-1 as position
 from public.game_sessions
)
update public.game_sessions g set avatar_id=r.id,minimax_voice_id=r.voice_id
from sessions h join roster r on (h.position % r.size)=r.position
where g.id=h.id and g.avatar_id is null;
alter table public.game_sessions alter column avatar_id set not null;
alter table public.game_sessions alter column minimax_voice_id set not null;

create function public.assign_session_avatar() returns trigger language plpgsql set search_path='' as $$
declare previous_avatar uuid; chosen uuid; chosen_voice text; begin
 if new.avatar_id is not null or new.minimax_voice_id is not null then raise exception 'AVATAR_ASSIGNED_BY_SERVER'; end if;
 -- Also serialize direct trusted inserts; the assignment RPC already owns this lock.
 perform 1 from public.players where id=new.player_id for update;
 select g.avatar_id into previous_avatar from public.game_sessions g
 where g.player_id=new.player_id order by g.created_at desc,g.id desc limit 1;
 select c.id,c.voice_id into chosen,chosen_voice from public.avatar_catalog c
 where c.enabled and (previous_avatar is null or c.id<>previous_avatar
  or not exists(select 1 from public.avatar_catalog alternative where alternative.enabled and alternative.id<>previous_avatar))
 order by (select count(*) from public.game_sessions prior where prior.player_id=new.player_id and prior.avatar_id=c.id),random()
 limit 1 for share of c;
 if chosen is null then raise exception 'AVATAR_POOL_EMPTY'; end if;
 new.avatar_id:=chosen;
 new.minimax_voice_id:=chosen_voice;
 return new;
end $$;
create trigger assign_avatar before insert on public.game_sessions
for each row execute function public.assign_session_avatar();

create function public.freeze_session_assignment() returns trigger language plpgsql set search_path='' as $$
begin
 if (new.id,new.player_id,new.scenario_id,new.scenario_version,new.idempotency_key,new.avatar_id,new.minimax_voice_id,new.created_at)
  is distinct from (old.id,old.player_id,old.scenario_id,old.scenario_version,old.idempotency_key,old.avatar_id,old.minimax_voice_id,old.created_at)
 then raise exception 'IMMUTABLE_SESSION_ASSIGNMENT'; end if;
 return new;
end $$;
create trigger freeze_session_assignment before update on public.game_sessions
for each row execute function public.freeze_session_assignment();

create function public.freeze_avatar_identity() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='DELETE' then raise exception 'IMMUTABLE_AVATAR_ID'; end if;
 if new.id is distinct from old.id then raise exception 'IMMUTABLE_AVATAR_ID'; end if;
 new.updated_at:=clock_timestamp();
 return new;
end $$;
create trigger freeze_avatar_identity before update or delete on public.avatar_catalog
for each row execute function public.freeze_avatar_identity();

-- Randomize equally-used eligible mysteries without reading or changing guilt.
-- No-repeat history, player locking, idempotency and leases are unchanged.
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
 where s.status='published' and s.validated_at is not null and a.lease_until<=clock_timestamp()
 and not exists(select 1 from public.player_scenario_history h where h.player_id=p_player and h.scenario_id=s.id)
 order by a.assignments,random() limit 1 for update of a,s skip locked;
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
revoke all on function public.assign_session_avatar(),public.freeze_session_assignment(),public.freeze_avatar_identity(),public.assign_scenario(uuid,uuid) from public,anon,authenticated;
grant execute on function public.assign_scenario(uuid,uuid) to service_role;
