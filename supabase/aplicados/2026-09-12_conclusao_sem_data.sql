-- =====================================================================
-- O.S. "CONCLUÍDA" SEM DATA DE CONCLUSÃO — acerto retroativo
-- Rodar no SQL Editor do Supabase da EDUCAÇÃO (lgdnuyreaknxjswrfbjw).
--
-- POR QUÊ: até a v95 o app tratava status e data de conclusão como campos
-- independentes. O campo marcava "Concluído" e deixava a data em branco.
-- Medição é POR PERÍODO: O.S. sem data de conclusão não entra em mês
-- nenhum. A v95 já carimba a data ao marcar Concluído; isto trata o passado.
--
-- ⚠ ESCOPO ESTREITO DE PROPÓSITO. São 305 O.S. nessa situação, mas só 28
-- podem ser corrigidas automaticamente. As outras 277 NÃO são tocadas:
--
--   · 254 já estão marcadas para uma medição (MED 3 a MED 10). Carimbar
--     uma data agora pode colocá-la num mês diferente do da medição em que
--     ela já entrou — criaria contradição no que já foi faturado.
--   · 229 dessas foram lançadas no import em lote de 04/07/2026: nelas o
--     criado_em é a data da IMPORTAÇÃO, não do serviço. Usar essa data
--     diria que um serviço da MED 3 foi concluído em julho.
--   · mais 23 vieram do mesmo import e estão sem medição — mesma razão.
--
-- O que sobra são 28 O.S. lançadas pelo app no dia a dia, sem medição
-- atribuída. Nessas o criado_em é a data real do lançamento e serve.
--
-- SEGURO: não sobrescreve data existente, não toca O.S. já medida, e
-- rodar duas vezes não muda nada.
-- =====================================================================

-- 1) ANTES — o retrato completo, para você ver a divisão
select
  count(*) filter (where conclusao is null)                                        as sem_data_total,
  count(*) filter (where conclusao is null and coalesce(trim(medicao),'') <> '')   as ja_medidas_nao_tocar,
  count(*) filter (where conclusao is null and coalesce(trim(medicao),'') = ''
                     and criado_em::date = date '2026-07-04')                       as do_import_nao_tocar,
  count(*) filter (where conclusao is null and coalesce(trim(medicao),'') = ''
                     and criado_em::date <> date '2026-07-04')                      as vao_ser_corrigidas
from os_campo
where excluida = false and status in ('Concluído','Assinatura');
-- esperado hoje: 305 · 254 · 23 · 28

-- 2) a lista exata do que vai mudar — confira antes de aplicar
select coalesce(numero::text, fict_ref, 'F-'||numero_fict) as ref,
       unidade, executor, entrada,
       (criado_em at time zone 'America/Sao_Paulo')::date  as vira_conclusao
from os_campo
where excluida = false
  and status in ('Concluído','Assinatura')
  and conclusao is null
  and coalesce(trim(medicao), '') = ''
  and criado_em::date <> date '2026-07-04'
order by criado_em;

-- 3) APLICA
-- greatest(entrada, lançamento): a conclusão nunca fica ANTES da abertura,
-- que é a incoerência que já apareceu em 21 O.S. do histórico.
update os_campo
set conclusao = greatest(
      (criado_em at time zone 'America/Sao_Paulo')::date,
      coalesce(entrada, (criado_em at time zone 'America/Sao_Paulo')::date)
    ),
    memoria_calculo = case
      when coalesce(trim(memoria_calculo), '') in ('', '.', ',')
        then '[data de conclusão inferida do lançamento no app]'
      else memoria_calculo || ' · [data de conclusão inferida do lançamento no app]'
    end
where excluida = false
  and status in ('Concluído','Assinatura')
  and conclusao is null
  and coalesce(trim(medicao), '') = ''
  and criado_em::date <> date '2026-07-04';

-- 4) DEPOIS — conferência
select
  count(*) filter (where conclusao is null)                                      as ainda_sem_data,
  count(*) filter (where conclusao is null and coalesce(trim(medicao),'') <> '') as ja_medidas_intocadas
from os_campo
where excluida = false and status in ('Concluído','Assinatura');
-- esperado: 277 · 254  (as 28 saíram; as demais seguem intactas, de propósito)
