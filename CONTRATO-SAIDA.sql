-- =====================================================================
-- CONTRATO NA SAÍDA DE MATERIAL — separar o consumo dos dois contratos
-- Rodar no SQL Editor do Supabase da EDUCAÇÃO (lgdnuyreaknxjswrfbjw).
--
-- POR QUÊ: o João é um só e atende Educação e Saúde no mesmo balcão, do
-- mesmo estoque. Hoje as 3.765 saídas não dizem para qual contrato o
-- material foi — só 4 delas têm qualquer marca de Saúde. Sem isso não há
-- como prestar conta separada de cada contrato nem defender a medição.
--
-- SEGURO: só ACRESCENTA coluna. Nada é apagado nem alterado.
-- O app já sabe conviver com a coluna ausente (salva sem ela), então
-- rodar isto não é urgente — mas sem ele o contrato não fica gravado.
-- =====================================================================

-- 1) a coluna
alter table saida_material add column if not exists contrato text;

-- 2) preenche o passado pela unidade de destino, com a MESMA regra do app
--    (data/unidadesSaude.ts → contratoDaUnidade). Só toca linha que ainda
--    não tem contrato: rodar de novo não desfaz correção feita à mão.
update saida_material set contrato = 'Saúde'
where contrato is null and (
     escola ilike '%semusa%' or escola ilike '%semus%'
  or escola ilike '%hospital%' or escola ilike '%hmnm%' or escola ilike '%naelma%'
  or escola ilike '%pronto socorro%' or escola ilike '%valmir hespanhol%'
  or escola ilike '%farmácia municipal%' or escola ilike '%farmacia municipal%'
  or escola ilike '%resgate 24%' or escola ilike '%posto de saúde%' or escola ilike '%posto de saude%'
  or escola ilike '%clínica da família%' or escola ilike '%clinica da familia%'
  or escola ilike '%capsi%' or escola ilike '%ambulatório%' or escola ilike '%ambulatorio%'
  or escola ilike '%saúde mental%' or escola ilike '%saude mental%'
  or escola ilike '%reabilitação%' or escola ilike '%reabilitacao%'
  or escola ilike '%nasca%' or escola ilike '%residência terapêutica%' or escola ilike '%residencia terapeutica%'
  or escola ilike '%catarata%' or escola ilike '%pré-operatório%' or escola ilike '%pre-operatorio%'
  or escola ilike '%casa de recuperação%' or escola ilike '%casa de recuperacao%'
  or escola ilike '%vigilância ambiental%' or escola ilike '%vigilancia ambiental%'
  or escola ilike '%lactário%' or escola ilike '%lactario%'
  -- siglas: só como palavra inteira, senão 'esf' casa dentro de "desfazer"
  or escola ~* '(^|[^a-zà-ÿ])(esf|ubs|upa|caps|posto|saúde|saude|coga|desge)([^a-zà-ÿ]|$)'
);

-- 3) todo o resto é Educação (é o contrato de origem do almoxarifado).
--    Prefeitura, Casa da Criança e Galpão Recanto ficam aqui de propósito:
--    são atendidos pelos dois e o nome sozinho não decide.
update saida_material set contrato = 'Educação' where contrato is null;

-- 4) índice: os relatórios vão filtrar por contrato o tempo todo
create index if not exists idx_saida_contrato on saida_material (contrato);

-- ---------------- CONFERÊNCIA ----------------
-- esperado hoje: Saúde = 4 · Educação = 3761 (total 3765)
-- se Saúde vier MUITO acima de 4, algum ilike pegou escola demais: me chame
select contrato, count(*) as saidas, count(distinct escola) as unidades
from saida_material group by contrato order by saidas desc;
