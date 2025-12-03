-- Indoor location & corridor navigation schema

create table if not exists locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  district text,
  polygon jsonb, -- GeoJSON veya [ [lat,lng], ... ]
  default_floor_id uuid,
  created_by uuid references auth.users (id),
  created_at timestamptz default now()
);

create table if not exists location_floors (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations (id) on delete cascade,
  floor_index int not null,
  label text not null,
  entry_type text check (entry_type in ('parking','main','side')),
  plan_image_url text,
  calibration jsonb,
  created_at timestamptz default now()
);

create table if not exists floor_nodes (
  id uuid primary key default gen_random_uuid(),
  location_floor_id uuid not null references location_floors (id) on delete cascade,
  type text not null check (type in ('room','corridor','stairs','elevator','lobby')),
  code text,
  name text,
  x double precision not null,
  y double precision not null,
  gps_lat double precision,
  gps_lng double precision,
  is_hidden boolean default false,
  is_featured boolean default false,
  created_at timestamptz default now()
);

create table if not exists floor_edges (
  id uuid primary key default gen_random_uuid(),
  from_node_id uuid not null references floor_nodes (id) on delete cascade,
  to_node_id uuid not null references floor_nodes (id) on delete cascade,
  distance_m double precision not null,
  direction_hint text check (direction_hint in ('straight','left','right')),
  is_stairs boolean default false,
  is_elevator boolean default false,
  created_at timestamptz default now()
);

create table if not exists room_details (
  id uuid primary key default gen_random_uuid(),
  floor_node_id uuid not null unique references floor_nodes (id) on delete cascade,
  room_number text,
  tenant_name text,
  category text,
  status text check (status in ('active','empty','closed','hidden')) default 'active',
  tags jsonb,
  description text,
  created_at timestamptz default now()
);

create table if not exists room_suggestions (
  id uuid primary key default gen_random_uuid(),
  floor_node_id uuid not null references floor_nodes (id) on delete cascade,
  user_id uuid not null references auth.users (id),
  type text not null check (type in ('exists','closed','moved','rename','new_tenant')),
  proposed_tenant_name text,
  note text,
  status text not null check (status in ('pending','approved','rejected')) default 'pending',
  moderated_by uuid references auth.users (id),
  created_at timestamptz default now(),
  resolved_at timestamptz
);

-- Basic indexes
create index if not exists idx_location_floors_location on location_floors(location_id);
create index if not exists idx_floor_nodes_floor on floor_nodes(location_floor_id);
create index if not exists idx_floor_edges_from on floor_edges(from_node_id);
create index if not exists idx_floor_edges_to on floor_edges(to_node_id);
create index if not exists idx_room_suggestions_floor_node on room_suggestions(floor_node_id);
