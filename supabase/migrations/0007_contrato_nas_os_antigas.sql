-- =====================================================================
-- 0007 · CONTRATO NAS O.S. ANTIGAS — o discriminador que faltava
-- Banco da EDUCAÇÃO (lgdnuyreaknxjswrfbjw) · 12/09/2026
--
-- POR QUÊ AGORA: a coluna `contrato` existe desde a v86, mas só era
-- preenchida por quem tem o botão dos dois contratos na tela. Resultado:
-- 2.607 das 2.621 O.S. estão com ela VAZIA.
--
-- Isso trava a unificação dos sistemas. Não dá para juntar um terceiro
-- contrato (Fiscalização) num banco onde o discriminador do segundo
-- (Saúde) não funciona — o problema piora em vez de resolver.
--
-- ⚠ NÃO USAR O FISCAL COMO CRITÉRIO. A convenção "Central = Saúde" é
-- FALSA: das 184 O.S. com fiscal Central, 183 são de Educação — SEMEDE
-- (71), CEMAEE (42), NUGEPE (24), estádios, campos e a Praça do Skate.
-- Só a do Pronto Socorro Maria Rosa é da Saúde. Classificar por fiscal
-- jogaria 183 O.S. de Educação para dentro da Saúde.
--
-- O critério certo é a UNIDADE, a mesma regra da saída de material
-- (data/unidadesSaude.ts → contratoDaUnidade, aplicada na migration 0006).
--
-- CONFERIDO ANTES DE ESCREVER: rodando a regra contra as 158 unidades
-- distintas de os_campo, NENHUMA unidade de Educação tem nome que sugira
-- saúde — ou seja, não há falso positivo possível.
--
-- ⚠ PROJETO ALVO: fpv-campo22 · lgdnuyreaknxjswrfbjw
--   NÃO é o da Fiscalização (irprgd…) nem o de Saquarema. Confira o nome
--   na barra do Supabase antes de dar Run.
--
-- SEGURO: só toca linha com contrato NULO ou em branco. Não sobrescreve
-- nada já preenchido. Rodar 2x não muda nada.
-- =====================================================================

-- 1) ANTES
select coalesce(nullif(trim(contrato), ''), '(vazio)') as contrato, count(*)
from os_campo where excluida = false
group by 1 order by 2 desc;
-- apurado em 12/09 às 21h: (vazio) 2607 · Saúde 13 · Educação 1
-- (os números sobem a cada O.S. nova; o que não pode mudar é (vazio) → 0 no fim)

-- 2) SAÚDE pela unidade — mesma regra da 0006
update os_campo set contrato = 'Saúde'
where excluida = false
  and coalesce(trim(contrato), '') = ''
  and (
     unidade ilike '%semusa%' or unidade ilike '%semus%'
  or unidade ilike '%hospital%' or unidade ilike '%hmnm%' or unidade ilike '%naelma%'
  or unidade ilike '%pronto socorro%' or unidade ilike '%valmir hespanhol%'
  or unidade ilike '%farmácia municipal%' or unidade ilike '%farmacia municipal%'
  or unidade ilike '%resgate 24%' or unidade ilike '%posto de saúde%' or unidade ilike '%posto de saude%'
  or unidade ilike '%clínica da família%' or unidade ilike '%clinica da familia%'
  or unidade ilike '%capsi%' or unidade ilike '%ambulatório%' or unidade ilike '%ambulatorio%'
  or unidade ilike '%saúde mental%' or unidade ilike '%saude mental%'
  or unidade ilike '%reabilitação%' or unidade ilike '%reabilitacao%'
  or unidade ilike '%nasca%' or unidade ilike '%residência terapêutica%' or unidade ilike '%residencia terapeutica%'
  or unidade ilike '%catarata%' or unidade ilike '%pré-operatório%' or unidade ilike '%pre-operatorio%'
  or unidade ilike '%casa de recuperação%' or unidade ilike '%casa de recuperacao%'
  or unidade ilike '%vigilância ambiental%' or unidade ilike '%vigilancia ambiental%'
  or unidade ilike '%lactário%' or unidade ilike '%lactario%'
  -- siglas só como palavra inteira: senão 'esf' casa dentro de "desfazer"
  or unidade ~* '(^|[^a-zà-ÿ])(esf|ubs|upa|caps|posto|saúde|saude|coga|desge)([^a-zà-ÿ]|$)'
  );

-- 3) todo o resto é Educação (contrato de origem do app)
update os_campo set contrato = 'Educação'
where excluida = false and coalesce(trim(contrato), '') = '';

-- 4) índice: todo relatório vai filtrar por contrato daqui pra frente
create index if not exists idx_os_campo_contrato on os_campo (contrato);

-- 5) DEPOIS — conferência
select coalesce(nullif(trim(contrato), ''), '(vazio)') as contrato,
       count(*) as os, count(distinct unidade) as unidades
from os_campo where excluida = false
group by 1 order by 2 desc;
-- esperado: Educação ~2607 · Saúde ~14 · (vazio) 0
-- O QUE IMPORTA CONFERIR: (vazio) = 0, e Saúde na casa da DEZENA.
-- Se Saúde vier na casa da CENTENA, algum ilike pegou escola demais —
-- pare e me chame antes de seguir.

-- 6) e quais unidades ficaram na Saúde — confira se faz sentido
select unidade, count(*) as os
from os_campo where excluida = false and contrato = 'Saúde'
group by unidade order by os desc;
-- esperado: Hospital Naelma 3 · SEMUSA (Sede) 3 · Posto mar do norte 2 ·
--           Resgate 24h · Pronto Socorro Maria Rosa · Centro de Reabilitação
--           Rocha Leão · Semusa · ESF Nova Cidade (1 cada)
