-- =============================================================
-- ANDAIME.sql (v76, 17/08/2026) — patrimônio de andaime FORA do
-- contrato. Pedido do Renan: setor próprio na aba do almoxarifado,
-- SEPARADO do estoque de contrato — saida_material alimenta a
-- medição (método material→EMOP) e andaime não pode poluir aquilo.
-- Modelo: catálogo de peças + movimentos com retorno.
--   disponível no pátio = quantidade_total − Σ movimentos abertos
-- Rodar 1x no SQL Editor. Idempotente (pode re-rodar sem estrago).
-- =============================================================

-- 1) catálogo de peças (PAINEL 1,00x1,00 / PISO METÁLICO / SAPATA...)
create table if not exists andaime_item (
  id bigint generated always as identity primary key,
  descricao text not null,
  quantidade_total numeric(12,2) not null default 1,
  obs text,
  criado_em timestamptz not null default now()
);
alter table andaime_item enable row level security;
drop policy if exists "and_select" on andaime_item;
drop policy if exists "and_insert" on andaime_item;
drop policy if exists "and_update" on andaime_item;
drop policy if exists "and_delete" on andaime_item;
create policy "and_select" on andaime_item for select to authenticated using (true);
create policy "and_insert" on andaime_item for insert to authenticated with check (true);
create policy "and_update" on andaime_item for update to authenticated using (true) with check (true);
create policy "and_delete" on andaime_item for delete to authenticated
  using (auth.jwt() ->> 'email' in
    ('lucas@fpv.app','rafael@fpv.app','nicolas@fpv.app','renan@fpv.app','edmar@fpv.app','joao@fpv.app'));

-- 2) movimentos: lote que saiu p/ obra; volta = null enquanto está lá
create table if not exists andaime_movimento (
  id bigint generated always as identity primary key,
  item_id bigint not null references andaime_item(id) on delete cascade,
  quantidade numeric(12,2) not null default 1,
  obra text,
  com_quem text,
  os_ref text,
  saida date not null default current_date,
  volta date,
  obs text,
  criado_em timestamptz not null default now()
);
alter table andaime_movimento enable row level security;
drop policy if exists "andmov_select" on andaime_movimento;
drop policy if exists "andmov_insert" on andaime_movimento;
drop policy if exists "andmov_update" on andaime_movimento;
drop policy if exists "andmov_delete" on andaime_movimento;
create policy "andmov_select" on andaime_movimento for select to authenticated using (true);
create policy "andmov_insert" on andaime_movimento for insert to authenticated with check (true);
create policy "andmov_update" on andaime_movimento for update to authenticated using (true) with check (true);
create policy "andmov_delete" on andaime_movimento for delete to authenticated
  using (auth.jwt() ->> 'email' in
    ('lucas@fpv.app','rafael@fpv.app','nicolas@fpv.app','renan@fpv.app','edmar@fpv.app','joao@fpv.app'));

-- 3) tempo real p/ a tela do João (padrão do módulo)
do $$ begin
  begin
    alter publication supabase_realtime add table andaime_item;
  exception when duplicate_object then null; end;
  begin
    alter publication supabase_realtime add table andaime_movimento;
  exception when duplicate_object then null; end;
end $$;

-- 4) conferência (padrão OK/FALTOU)
select 'andaime_item' as tabela,
       case when exists (select 1 from information_schema.tables where table_name = 'andaime_item') then 'OK' else 'FALTOU' end as situacao,
       (select count(*) from andaime_item) as linhas
union all
select 'andaime_movimento',
       case when exists (select 1 from information_schema.tables where table_name = 'andaime_movimento') then 'OK' else 'FALTOU' end,
       (select count(*) from andaime_movimento);
