-- =====================================================================
-- FISCAL DA SAÚDE — acerto retroativo das 6 O.S. já lançadas
-- Regra do Renan (03/09): posto (ESF/UBS/Clínica da Família) -> Fernando
--                         SEMUSA (sede)                      -> Elisangela
--                         todo o restante                    -> Cunha
--
-- Estas 6 nasceram antes da v89, quando o app ainda punha 'Central'
-- (herdado do login) ou o rótulo provisório 'SEMUSA'. Da v89 em diante
-- o fiscal se resolve sozinho ao digitar a unidade.
--
-- SEGURO: só toca contrato='Saúde', só a coluna fiscal, nada é apagado.
-- =====================================================================

-- 1) ANTES — veja o que vai mudar
select fict_ref, unidade, fiscal as fiscal_atual,
       case
         when unidade ilike '%semusa%' then 'Elisangela'
         when unidade ilike '%esf %' or unidade ilike '%ubs %'
           or unidade ilike '%clínica da família%' or unidade ilike '%clinica da familia%'
           or unidade ilike '%posto%' then 'Fernando'
         else 'Cunha'
       end as fiscal_novo
from os_campo
where contrato = 'Saúde' and excluida = false
order by id;

-- 2) APLICA
update os_campo
set fiscal = case
      when unidade ilike '%semusa%' then 'Elisangela'
      when unidade ilike '%esf %' or unidade ilike '%ubs %'
        or unidade ilike '%clínica da família%' or unidade ilike '%clinica da familia%'
        or unidade ilike '%posto%' then 'Fernando'
      else 'Cunha'
    end
where contrato = 'Saúde' and excluida = false;

-- 3) DEPOIS — confere
select fiscal, count(*) as qtd
from os_campo
where contrato = 'Saúde' and excluida = false
group by fiscal order by qtd desc;
