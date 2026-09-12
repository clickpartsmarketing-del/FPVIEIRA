-- =====================================================================
-- LOCAL-OS.sql (v81, 01/09/2026) — campo LOCAL na O.S.
--
-- Pedido do Renan: a legenda que vai pro grupo precisa dizer ONDE dentro
-- da unidade ("Consultório 03 recepção principal", "Cozinha", "Sala 12").
-- Hoje isso só existe solto no meio da descrição — a legenda deduzia por
-- palavra-chave e acertava em 49% dos casos. Com o campo, é 100% do que
-- a equipe digitar.
--
-- Rodar 1x no SQL Editor. Idempotente. NÃO altera nenhum dado existente.
-- =====================================================================

alter table os_campo add column if not exists local text;

comment on column os_campo.local is
  'Local dentro da unidade (Cozinha, Sala 12, Consultório 03). Aparece na legenda de compartilhamento e no relatório fotográfico.';

-- conferência (padrão OK/FALTOU)
select 'os_campo.local' as coluna,
       case when exists (
         select 1 from information_schema.columns
         where table_name = 'os_campo' and column_name = 'local'
       ) then 'OK' else 'FALTOU' end as situacao,
       (select count(*) from os_campo where local is not null and local <> '') as ja_preenchidas;
