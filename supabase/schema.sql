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

alter table public.pedidos enable row level security;

grant usage on schema public to anon, authenticated;
grant insert on table public.pedidos to anon;
grant select, update on table public.pedidos to authenticated;

create policy "clientes autenticados podem ler pedidos"
  on public.pedidos for select to authenticated using (true);

create policy "clientes anonimos podem criar pedidos"
  on public.pedidos for insert to anon with check (status = 'pendente' and impresso = false);

create policy "administradores autenticados podem atualizar pedidos"
  on public.pedidos for update to authenticated using (true) with check (true);

alter publication supabase_realtime add table public.pedidos;
