Execute todo este SQL no Supabase SQL Editor antes de publicar os arquivos novos:

```sql
create extension if not exists pgcrypto;

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

alter table books add column if not exists author text;
alter table books add column if not exists isbn text;
alter table books add column if not exists page_count integer;
alter table books add column if not exists promotional_price numeric(12,2);
alter table books add column if not exists promotion_start timestamptz;
alter table books add column if not exists promotion_end timestamptz;
alter table books add column if not exists images jsonb not null default '[]'::jsonb;

update books
set images = jsonb_build_array(cover)
where coalesce(jsonb_array_length(images), 0) = 0
  and cover is not null
  and trim(cover) <> '';

alter table orders add column if not exists payment_id text;
alter table orders add column if not exists payment_status text;
alter table orders add column if not exists payment_detail text;
alter table orders add column if not exists tracking_code text;
alter table orders add column if not exists shipping jsonb;
alter table orders add column if not exists items jsonb not null default '[]'::jsonb;
alter table orders add column if not exists stock_deducted boolean not null default false;
alter table orders add column if not exists melhor_envio_order_id text;
alter table orders add column if not exists melhor_envio_service_id text;
alter table orders add column if not exists melhor_envio_label_url text;
alter table orders add column if not exists melhor_envio_raw jsonb;

update orders set items = '[]'::jsonb where items is null;
update orders set stock_deducted = false where stock_deducted is null;

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  book_id text not null,
  customer_email text not null,
  customer_name text,
  rating integer not null check (rating between 1 and 5),
  comment text not null check (char_length(comment) between 3 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (book_id, customer_email)
);

create index if not exists reviews_book_id_idx on reviews(book_id);
create index if not exists reviews_customer_email_idx on reviews(customer_email);
create index if not exists orders_payment_status_idx on orders(payment_status);

alter table reviews enable row level security;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'book-images',
  'book-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

create or replace function public.deduct_order_stock(p_order_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_items jsonb;
  v_stock_deducted boolean;
  v_item jsonb;
  v_book_id text;
  v_qty integer;
begin
  select coalesce(items, '[]'::jsonb), coalesce(stock_deducted, false)
    into v_items, v_stock_deducted
  from orders
  where id = p_order_id
  for update;

  if not found then
    return false;
  end if;

  if v_stock_deducted then
    return false;
  end if;

  for v_item in select value from jsonb_array_elements(v_items)
  loop
    v_book_id := nullif(v_item ->> 'book_id', '');
    v_qty := greatest(coalesce(nullif(v_item ->> 'qty', '')::integer, 1), 1);

    if v_book_id is not null then
      update books
      set stock = greatest(coalesce(stock, 0) - v_qty, 0)
      where id = v_book_id;
    end if;
  end loop;

  update orders
  set stock_deducted = true
  where id = p_order_id;

  return true;
end;
$$;

revoke all on function public.deduct_order_stock(text) from public;
grant execute on function public.deduct_order_stock(text) to service_role;

create table if not exists app_settings (
  key text primary key,
  value jsonb,
  updated_at timestamptz default now()
);
```
