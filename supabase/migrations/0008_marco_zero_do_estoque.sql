-- =====================================================================
-- 0008 · MARCO ZERO DO ESTOQUE — a contagem passa a ter data
-- Banco fpv-campo22 · lgdnuyreaknxjswrfbjw · 12/09/2026
--
-- DECISÃO DO RENAN (12/09): "saiu saiu — pare de descontar as saídas
-- antigas. O que subirmos agora é o que vale."
--
-- O PROBLEMA: o saldo era contagem_inicial + entradas − TODAS as saídas,
-- desde 06/01/2026. Só 21 dos 431 itens têm contagem física; os outros 410
-- entraram no catálogo automaticamente com zero. Resultado: 404 itens com
-- saldo NEGATIVO — lâmpada tubular 18W marcando −1.109. Saldo calculado a
-- partir de um ponto de partida que nunca existiu não significa nada.
--
-- O DESENHO NOVO (marco zero): a contagem é uma FOTOGRAFIA com data.
--   saldo = contagem + movimento que aconteceu DEPOIS dela
-- As 3.780 saídas antigas saem da conta. Da contagem em diante, saída
-- desconta e entrada soma — então os alertas de cor voltam a funcionar
-- (conta 100, saem 60, o sistema avisa "repor já").
--
-- POR QUE `now()` NOS 21 JÁ CONTADOS: não existe registro de QUANDO cada
-- um foi contado. Carimbar agora é o próprio marco zero — o número que
-- está lá passa a valer a partir de hoje, que é exatamente o pedido.
--
-- SEGURO: só ACRESCENTA coluna. Nenhuma linha é apagada, nenhum saldo é
-- alterado. Rodar 2x não muda nada.
-- =====================================================================

-- 1) a coluna
alter table estoque_item add column if not exists contagem_em timestamptz;

comment on column estoque_item.contagem_em is
  'Quando a contagem física de saldo_inicial foi feita. O saldo do app é '
  'saldo_inicial + movimento POSTERIOR a esta data. Nulo = item nunca '
  'contado (aparece como "sem contagem", sem alarme).';

-- 2) marco zero: quem já tem contagem passa a valer a partir de agora
update estoque_item
set contagem_em = now()
where contagem_em is null and coalesce(saldo_inicial, 0) > 0;

-- 3) índice: o app filtra movimento por data a cada carregamento
create index if not exists idx_saida_material_data on saida_material (data);
create index if not exists idx_entrada_material_data on entrada_material (data);

-- ---------------- CONFERÊNCIA ----------------
-- esperado: com_contagem 21 · sem_contagem 410 · total 431
select
  count(*) filter (where contagem_em is not null) as com_contagem,
  count(*) filter (where contagem_em is null)     as sem_contagem,
  count(*)                                        as total
from estoque_item;

-- os 21 que ganharam marco zero — o saldo deles passa a ser este número,
-- sem desconto do passado
select descricao, saldo_inicial, unidade, contagem_em::date as marco_zero
from estoque_item
where contagem_em is not null
order by saldo_inicial desc;
