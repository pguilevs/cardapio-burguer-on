create table if not exists public.pedidos (
  id uuid primary key default gen_random_uuid(),
  numero text not null,
  tipo text not null check (tipo in ('delivery', 'retirada')),
  status text not null default 'pendente' check (status in ('pendente', 'preparo', 'entrega', 'finalizado')),
  impresso boolean not null default false,
  distancia_km numeric(5, 1) not null default 0,
  cliente jsonb not null,
  itens jsonb not null,
  subtotal numeric(10, 2) not null check (subtotal >= 0),
  frete numeric(10, 2) not null default 0 check (frete >= 0),
  total numeric(10, 2) not null check (total >= 0),
  pagamento jsonb not null,
  criado_em_ms bigint not null default (extract(epoch from now()) * 1000)::bigint,
  data_hora_formatada text not null default ''
);

alter table public.pedidos
  add column if not exists arquivado_em_ms bigint,
  add column if not exists dia_id date not null default (now() at time zone 'America/Sao_Paulo')::date;

create table if not exists public.configuracao_loja (
  id boolean primary key default true check (id = true),
  pedidos_abertos boolean not null default true,
  atualizado_em_ms bigint not null default (extract(epoch from now()) * 1000)::bigint
);

insert into public.configuracao_loja (id)
values (true)
on conflict (id) do nothing;

create table if not exists public.sequencias_pedidos (
  dia_id date primary key,
  ultimo_numero integer not null check (ultimo_numero >= 1000)
);

alter table public.pedidos enable row level security;
alter table public.configuracao_loja enable row level security;
alter table public.sequencias_pedidos enable row level security;

grant usage on schema public to anon, authenticated;
grant insert on table public.pedidos to anon;
grant select, update on table public.pedidos to authenticated;
grant select on table public.configuracao_loja to anon, authenticated;
grant update on table public.configuracao_loja to authenticated;
grant select on table public.sequencias_pedidos to authenticated;

drop policy if exists "clientes autenticados podem ler pedidos" on public.pedidos;
drop policy if exists "clientes anonimos podem criar pedidos" on public.pedidos;
drop policy if exists "administradores autenticados podem atualizar pedidos" on public.pedidos;
create policy "clientes autenticados podem ler pedidos"
  on public.pedidos for select to authenticated using (true);

create policy "administradores autenticados podem atualizar pedidos"
  on public.pedidos for update to authenticated using (true) with check (true);

drop policy if exists "todos podem consultar status da loja" on public.configuracao_loja;
create policy "todos podem consultar status da loja"
  on public.configuracao_loja for select to anon, authenticated using (true);

drop policy if exists "administradores podem atualizar status da loja" on public.configuracao_loja;
create policy "administradores podem atualizar status da loja"
  on public.configuracao_loja for update to authenticated using (true) with check (true);

create or replace function public.loja_aceita_pedidos()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select pedidos_abertos from public.configuracao_loja where id = true;
$$;

create or replace function public.proximo_numero_pedido()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  proximo integer;
begin
  insert into public.sequencias_pedidos (dia_id, ultimo_numero)
  values (hoje, 1001)
  on conflict (dia_id) do update
    set ultimo_numero = public.sequencias_pedidos.ultimo_numero + 1
  returning ultimo_numero into proximo;

  return proximo;
end;
$$;

create or replace function public.definir_pedidos_abertos(novo_status boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.configuracao_loja
  set pedidos_abertos = novo_status,
      atualizado_em_ms = (extract(epoch from now()) * 1000)::bigint
  where id = true;
  return novo_status;
end;
$$;

create or replace function public.encerrar_dia()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  pedidos_em_aberto integer;
  pedidos_arq integer;
begin
  select count(*) into pedidos_em_aberto
  from public.pedidos
  where arquivado_em_ms is null
    and status <> 'finalizado';

  if pedidos_em_aberto > 0 then
    raise exception 'Ainda existem % pedido(s) não finalizado(s).', pedidos_em_aberto
      using errcode = 'P0001';
  end if;

  update public.configuracao_loja
  set pedidos_abertos = false,
      atualizado_em_ms = (extract(epoch from now()) * 1000)::bigint
  where id = true;

  update public.pedidos
  set arquivado_em_ms = (extract(epoch from now()) * 1000)::bigint
  where arquivado_em_ms is null;

  get diagnostics pedidos_arq = row_count;
  return pedidos_arq;
end;
$$;

create policy "clientes anonimos podem criar pedidos"
  on public.pedidos for insert to anon
  with check (status = 'pendente' and impresso = false and public.loja_aceita_pedidos());

grant execute on function public.proximo_numero_pedido() to anon, authenticated;
grant execute on function public.definir_pedidos_abertos(boolean) to authenticated;
grant execute on function public.encerrar_dia() to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'pedidos'
  ) then
    alter publication supabase_realtime add table public.pedidos;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'configuracao_loja'
  ) then
    alter publication supabase_realtime add table public.configuracao_loja;
  end if;
end
$$;
