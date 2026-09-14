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
-- SEM DEPENDÊNCIA: a primeira versão usava unaccent_ptbr() e o banco não
-- tem essa função (erro 42883 ao rodar em 14/09). Agora o acento sai com
-- translate(), que é PostgreSQL puro — não precisa criar extensão nem
-- função nenhuma. Cole e rode.
--
-- SEGURO: só preenche linha com contrato vazio. Não altera nenhuma O.S.
-- que já tem contrato definido. Idempotente.
--
-- CONFERIDO EM 14/09 antes de gerar: a regra foi rodada contra as 44 O.S.
-- da faixa que JÁ têm contrato e concordou com as 44 — zero divergência.
-- =====================================================================

-- ---------- ANTES ----------
-- esperado: 13 linhas (2446 a 2458), todas com contrato vazio
select numero, unidade, coalesce(nullif(contrato,''), '(vazio)') as contrato_hoje
from os_campo
where excluida = false
  and (contrato is null or contrato = '')
order by numero;

-- =====================================================================
-- APLICA
-- =====================================================================
begin;

with base as (
  select id,
         translate(lower(unidade),
                   'áàãâäéèêëíìîïóòõôöúùûüç',
                   'aaaaaeeeeiiiiooooouuuuc') as u
  from os_campo
  where excluida = false and (contrato is null or contrato = '')
)
update os_campo o
set contrato = case
      -- ambíguas: atendidas pelos DOIS contratos, o nome sozinho não
      -- decide — ficam em Educação, que é o contrato de origem
      when b.u in ('prefeitura','galpao recanto','casa da crianca')
        then 'Educação'
      -- siglas curtas só valem como palavra inteira: sem isto o 'esf'
      -- casaria dentro de "desfazer"
      when b.u ~ '(^|[^a-z])(esf|ubs|upa|caps|posto|saude|coga|desge)([^a-z]|$)'
        then 'Saúde'
      when b.u ~ 'semusa|semus|hospital|hmnm|naelma|pronto socorro|valmir hespanhol|farmacia municipal|resgate 24|posto de saude|clinica da familia|capsi|ambulatorio|saude mental|reabilitacao|nasca|residencia terapeutica|catarata|pre.operatorio|casa de recuperacao|vigilancia ambiental|lactario'
        then 'Saúde'
      else 'Educação'
    end
from base b
where o.id = b.id;

commit;

-- ---------- DEPOIS ----------
-- esperado: ainda_sem_contrato = 0
select count(*) as ainda_sem_contrato
from os_campo
where excluida = false and (contrato is null or contrato = '');

-- distribuição final — esperado: Educação 2629 · Saúde 16
select coalesce(nullif(contrato,''),'(vazio)') as contrato, count(*) as os
from os_campo where excluida = false
group by 1 order by os desc;

-- e as 13 que acabaram de ser preenchidas, para você conferir uma a uma
select numero, unidade, contrato
from os_campo
where excluida = false and numero between 2446 and 2458
order by numero;
