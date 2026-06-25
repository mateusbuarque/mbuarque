Rode no Supabase se ainda não rodou:

create table if not exists customers (
  id text primary key,
  created_at timestamptz default now(),
  name text,
  email text unique,
  password text,
  phone text,
  cpf text,
  cep text,
  street text,
  number text,
  complement text,
  neighborhood text,
  city text,
  state text
);

alter table orders add column if not exists payment_id text;
alter table orders add column if not exists payment_status text;
alter table orders add column if not exists payment_detail text;
alter table orders add column if not exists tracking_code text;
alter table orders add column if not exists shipping jsonb;
alter table orders add column if not exists melhor_envio_order_id text;
alter table orders add column if not exists melhor_envio_service_id text;
alter table orders add column if not exists melhor_envio_label_url text;
alter table orders add column if not exists melhor_envio_raw jsonb;


create table if not exists app_settings (
  key text primary key,
  value jsonb,
  updated_at timestamptz default now()
);
