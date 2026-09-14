create table if not exists public.linkdesk_rooms (
 id text primary key check (id ~ '^[a-f0-9]{32}$'),
 host_hash text not null, join_hash text not null, guest_hash text,
 joined boolean not null default false, approved boolean not null default false,
 frame text, frame_at timestamptz,
 expires_at timestamptz not null default now() + interval '1 hour',
 created_at timestamptz not null default now()
);
create table if not exists public.linkdesk_messages (
 id bigint generated always as identity primary key,
 room_id text not null references public.linkdesk_rooms(id) on delete cascade,
 sender text not null check(sender in ('host','guest')),
 payload text not null check(length(payload)<60000),
 created_at timestamptz not null default now()
);
create index if not exists linkdesk_messages_room_idx on public.linkdesk_messages(room_id,id);
create index if not exists linkdesk_rooms_expiry_idx on public.linkdesk_rooms(expires_at);
create table if not exists public.linkdesk_limits (key text primary key, count integer not null default 1, expires_at timestamptz not null);
alter table public.linkdesk_rooms enable row level security;
alter table public.linkdesk_messages enable row level security;
alter table public.linkdesk_limits enable row level security;
revoke all on public.linkdesk_rooms, public.linkdesk_messages, public.linkdesk_limits from anon, authenticated;
grant all on public.linkdesk_rooms, public.linkdesk_messages, public.linkdesk_limits to service_role;
grant usage, select on sequence public.linkdesk_messages_id_seq to service_role;
create or replace function public.linkdesk_rate(bucket text, maximum integer, seconds integer) returns boolean language plpgsql security invoker set search_path='' as $$
declare n integer;
begin
 insert into public.linkdesk_limits as l(key,count,expires_at) values(bucket,1,now()+make_interval(secs=>seconds))
 on conflict(key) do update set count=case when l.expires_at < now() then 1 else l.count+1 end, expires_at=case when l.expires_at < now() then now()+make_interval(secs=>seconds) else l.expires_at end returning count into n;
 return n <= maximum;
end; $$;
revoke all on function public.linkdesk_rate(text,integer,integer) from public,anon,authenticated;
grant execute on function public.linkdesk_rate(text,integer,integer) to service_role;
