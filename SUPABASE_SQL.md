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
