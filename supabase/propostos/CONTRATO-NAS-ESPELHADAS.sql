-- =====================================================================
-- CONTRATO NAS O.S. ESPELHADAS PELA PONTE DA FISCALIZAÇÃO
-- Banco: EDUCAÇÃO (lgdnuyreaknxjswrfbjw) · SQL Editor
--
-- POR QUÊ: a ponte reversa (ponte_email_fiscais.ps1) copia para o os_campo
-- as O.S. emitidas pelos fiscais no app deles, mas o INSERT não gravava a
-- coluna `contrato`. Resultado: 13 O.S. (2446 a 2458) entraram com o
-- contrato VAZIO e ficam de fora de qualquer relatório separado por
-- contrato — inclusive o semanal e o fotográfico.
--
-- A ponte JÁ FOI CORRIGIDA (14/09): passou a deduzir o contrato pela
-- unidade, com a mesma regra do app (data/unidadesSaude.ts). Este SQL
-- resolve só o que entrou ANTES da correção.
--
-- SEGURO: só preenche linha que está com o contrato vazio. Não altera
-- nenhuma O.S. que já tem contrato definido. Idempotente.
--
-- CONFERIDO EM 14/09 antes de gerar: a regra foi rodada contra as 44 O.S.
-- da faixa que JÁ têm contrato e concordou com as 44 — zero divergência.
-- As 13 vazias são todas de escola (2446-2454, 2457, 2458), mais SEMEDE,
-- SUPRIMENTOS e IMERO: as 13 viram 'Educação'.
-- =====================================================================

-- ---------- ANTES ----------
-- esperado: 13 linhas, todas com contrato nulo/vazio
select numero, unidade, coalesce(nullif(contrato,''), '(vazio)') as contrato_hoje
from os_campo
where excluida = false
  and (contrato is null or contrato = '')
order by numero;

-- =====================================================================
-- APLICA
-- =====================================================================
begin;

update os_campo
set contrato = case
      -- ambíguas: atendidas pelos DOIS contratos, o nome sozinho não
      -- decide — ficam em Educação, que é o contrato de origem
      when lower(unaccent_ptbr(unidade)) in ('prefeitura','galpao recanto','casa da crianca')
        then 'Educação'
      -- siglas curtas só valem como palavra inteira: sem isto o 'esf'
      -- casaria dentro de "desfazer"
      when lower(unaccent_ptbr(unidade)) ~ '(^|[^a-z])(esf|ubs|upa|caps|posto|saude|coga|desge)([^a-z]|$)'
        then 'Saúde'
      when lower(unaccent_ptbr(unidade)) ~ 'semusa|semus|hospital|hmnm|naelma|pronto socorro|valmir hespanhol|farmacia municipal|resgate 24|posto de saude|clinica da familia|capsi|ambulatorio|saude mental|reabilitacao|nasca|residencia terapeutica|catarata|pre.operatorio|casa de recuperacao|vigilancia ambiental|lactario'
        then 'Saúde'
      else 'Educação'
    end
where excluida = false
  and (contrato is null or contrato = '');

commit;

-- ---------- DEPOIS ----------
-- esperado: nenhuma linha (zero O.S. sem contrato)
select count(*) as ainda_sem_contrato
from os_campo
where excluida = false and (contrato is null or contrato = '');

-- e a distribuição final — esperado: Educação 2629 · Saúde 16
select coalesce(nullif(contrato,''),'(vazio)') as contrato, count(*) as os
from os_campo where excluida = false
group by 1 order by os desc;


-- =====================================================================
-- ⚠ SE DER ERRO "function unaccent_ptbr does not exist"
-- O banco não tem o normalizador de acento. Duas saídas:
--
-- (a) criar o normalizador uma vez (recomendado — outros SQL vão usar):
--     create extension if not exists unaccent;
--     create or replace function unaccent_ptbr(t text) returns text
--       language sql immutable parallel safe as $$ select unaccent($1) $$;
--
-- (b) ou, como as 13 linhas de hoje são TODAS de Educação (conferido),
--     rodar só isto, que não depende de acento nenhum:
--     begin;
--     update os_campo set contrato = 'Educação'
--     where excluida = false and (contrato is null or contrato = '');
--     commit;
--     ⚠ só use (b) DEPOIS de conferir no SELECT "ANTES" que nenhuma das
--     linhas é unidade de saúde. Se aparecer SEMUSA, posto, hospital ou
--     ESF na lista, use (a).
-- =====================================================================
