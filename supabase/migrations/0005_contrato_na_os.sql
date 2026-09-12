-- =====================================================================
-- CONTRATO-OS.sql (v86, 02/09/2026) — marcador de CONTRATO na O.S.
--
-- Emiliano (encarregado geral) e Gilson atendem Educação E Saúde. Sem
-- este campo, o serviço que eles fazem numa unidade de saúde entra no
-- mesmo balaio da Educação e vai parar na medição errada.
--
-- O botão no formulário só aparece para quem está em DOIS_CONTRATOS
-- (config.ts). Quem é só da Educação nem vê — e a coluna fica nula,
-- que é lida como Educação.
--
-- Rodar 1x no SQL Editor. Idempotente. NÃO altera nenhum dado existente.
-- =====================================================================

alter table os_campo add column if not exists contrato text;

comment on column os_campo.contrato is
  'Educação | Saúde — marcado por quem atende os dois contratos (Emiliano, Gilson). Nulo = Educação (FP.094).';

-- conferência (padrão OK/FALTOU)
select 'os_campo.contrato' as coluna,
       case when exists (
         select 1 from information_schema.columns
         where table_name = 'os_campo' and column_name = 'contrato'
       ) then 'OK' else 'FALTOU' end as situacao,
       (select count(*) from os_campo where contrato is not null and contrato <> '') as ja_marcadas;
