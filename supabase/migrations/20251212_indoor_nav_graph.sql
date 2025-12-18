-- Indoor navigation graph schema
-- Tables: floors, nav_nodes, nav_edges, pois, floor_revisions

-- id defaults need gen_random_uuid(); ensure pgcrypto or extensions already present

create table if not exists floors (
  id uuid primary key default gen_random_uuid(),
  building_id uuid,
  name text not null,
  level_index integer default 0,
  origin_lat double precision,
  origin_lng double precision,
  origin_heading double precision default 0,
  scale numeric(10,4) default 1.0,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists nav_nodes (
  id uuid primary key default gen_random_uuid(),
  floor_id uuid not null references floors(id) on delete cascade,
  name text,
  type text not null check (type in ('corridor','room','door','stairs','elevator','junction')),
  x numeric not null,
  y numeric not null,
  z numeric default 0,
  heading_hint numeric,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists nav_edges (
  id uuid primary key default gen_random_uuid(),
  floor_id uuid not null references floors(id) on delete cascade,
  from_node uuid not null references nav_nodes(id) on delete cascade,
  to_node uuid not null references nav_nodes(id) on delete cascade,
  weight numeric not null default 1,
  bidirectional boolean not null default true,
  width numeric,
  is_accessible boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists pois (
  id uuid primary key default gen_random_uuid(),
  floor_id uuid references floors(id) on delete cascade,
  node_id uuid references nav_nodes(id) on delete set null,
  label text not null,
  room_number text,
  category text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists floor_revisions (
  id uuid primary key default gen_random_uuid(),
  floor_id uuid not null references floors(id) on delete cascade,
  editor_id uuid,
  note text,
  payload jsonb not null,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_nav_nodes_floor on nav_nodes(floor_id);
create index if not exists idx_nav_edges_floor on nav_edges(floor_id);
create index if not exists idx_nav_edges_from_to on nav_edges(from_node, to_node);
create index if not exists idx_pois_floor on pois(floor_id);
create index if not exists idx_pois_node on pois(node_id);
create index if not exists idx_floor_revisions_floor on floor_revisions(floor_id);
create index if not exists idx_nav_nodes_metadata_gin on nav_nodes using gin (metadata);
create index if not exists idx_nav_edges_metadata_gin on nav_edges using gin (metadata);
create index if not exists idx_pois_metadata_gin on pois using gin (metadata);

-- RLS: authenticated users can select/insert/update; delete restricted to future policies
alter table floors enable row level security;
alter table nav_nodes enable row level security;
alter table nav_edges enable row level security;
alter table pois enable row level security;
alter table floor_revisions enable row level security;

-- Basic policies (adjust as needed for stricter roles)
create policy floors_select on floors for select using (true);
create policy floors_ins on floors for insert to authenticated with check (true);
create policy floors_upd on floors for update to authenticated using (true) with check (true);

create policy nav_nodes_select on nav_nodes for select using (true);
create policy nav_nodes_ins on nav_nodes for insert to authenticated with check (true);
create policy nav_nodes_upd on nav_nodes for update to authenticated using (true) with check (true);

create policy nav_edges_select on nav_edges for select using (true);
create policy nav_edges_ins on nav_edges for insert to authenticated with check (true);
create policy nav_edges_upd on nav_edges for update to authenticated using (true) with check (true);

create policy pois_select on pois for select using (true);
create policy pois_ins on pois for insert to authenticated with check (true);
create policy pois_upd on pois for update to authenticated using (true) with check (true);

create policy floor_revisions_select on floor_revisions for select using (true);
create policy floor_revisions_ins on floor_revisions for insert to authenticated with check (true);
create policy floor_revisions_upd on floor_revisions for update to authenticated using (true) with check (true);

-- Updated_at triggers (optional lightweight)
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at_floors before update on floors for each row execute procedure set_updated_at();
create trigger set_updated_at_nav_nodes before update on nav_nodes for each row execute procedure set_updated_at();
create trigger set_updated_at_nav_edges before update on nav_edges for each row execute procedure set_updated_at();
create trigger set_updated_at_pois before update on pois for each row execute procedure set_updated_at();
