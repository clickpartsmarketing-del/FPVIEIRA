-- =====================================================================
-- 0009 · LIMPA O CATÁLOGO ANTES DA CONTAGEM
-- Banco fpv-campo22 · lgdnuyreaknxjswrfbjw · 12/09/2026
--
-- POR QUÊ AGORA: o João vai contar os 410 itens sem contagem. Do jeito que
-- o catálogo está, ele contaria a MESMA coisa duas vezes em 7 casos —
-- diferença só de acento, espaço ou barra.
--
-- O PADRÃO DA CASA (o que 80% do catálogo já segue): CAIXA ALTA, acento
-- correto, espaço simples, sem espaço no começo nem no fim.
--
-- QUEM FICA foi decidido pelo que o HISTÓRICO mais usa, não por gosto:
--   SIFÃO ........................ 72 saídas  (contra 18 de "SIFAO")
--   LIXA 120 ..................... 42 saídas  (contra 1 de "LIXA  120")
--   PARAFUSO P/ VASO B-10 ......... 6 saídas  (contra 1 de "B/10")
--   VÁLVULA DE LAVATÓRIO .......... 3 saídas  (contra 1 sem acento)
--   TINTA LARANJA 16L ............. 7 saídas  (contra 0 da versão c/ espaço)
--   ALISAR PEÇA / LÁPIS CARPINTEIRO — empate no histórico, vence a regra
--     da casa (caixa alta + acento correto)
--
-- AS CONTAGENS SÃO SOMADAS (decisão do Renan): o que já foi lançado nos
-- dois lados vira um número só. Hoje só a tinta laranja tem contagem (12),
-- os outros 6 pares estão zerados dos dois lados.
--
-- O HISTÓRICO NÃO É REESCRITO. As 3.780 saídas ficam com o texto que a
-- pessoa digitou na época — é registro do que aconteceu. O app já casa as
-- duas grafias porque normaliza (tira acento, caixa e espaço) na leitura.
--
-- SEGURO: nenhuma saída, entrada ou O.S. é tocada. Rodar 2x não muda nada
-- (os id já apagados não existem mais).
-- =====================================================================

begin;

-- ---------------------------------------------------------------
-- 1) SOMA a contagem do duplicado no item que fica, e herda a
--    categoria e a data de contagem quando o que fica não tem
-- ---------------------------------------------------------------
with par(fica, sai) as (
  values (216, 10),    -- ALISAR PEÇA          <- 'Alisar peça'
         (297, 145),   -- LÁPIS CARPINTEIRO    <- 'LAPIS CARPINTEIRO'
         (72,  296),   -- LIXA 120             <- 'LIXA  120'
         (50,  354),   -- PARAFUSO P/ VASO B-10<- '...B/10'
         (279, 90),    -- SIFÃO                <- 'SIFAO'
         (183, 492),   -- TINTA LARANJA 16L    <- ' TINTA LARANJA 16L' (tem 12 e categoria PINTURA)
         (281, 426)    -- VÁLVULA DE LAVATÓRIO <- 'VALVULA DE LAVATÓRIO'
)
update estoque_item k
set saldo_inicial = coalesce(k.saldo_inicial, 0) + coalesce(d.saldo_inicial, 0),
    contagem_em   = coalesce(k.contagem_em, d.contagem_em),
    -- categoria só é herdada quando a do que fica ainda é o genérico
    categoria     = case when k.categoria = 'DIVERSOS' and d.categoria <> 'DIVERSOS'
                         then d.categoria else k.categoria end,
    -- mínimo: fica o maior dos dois (nenhum é zerado por engano)
    qtd_minima    = greatest(coalesce(k.qtd_minima, 0), coalesce(d.qtd_minima, 0))
from par p
join estoque_item d on d.id = p.sai
where k.id = p.fica;

-- ---------------------------------------------------------------
-- 2) APAGA os 7 duplicados
--    O histórico deles NÃO é apagado: saida_material guarda o texto,
--    não o id, e o app normaliza na leitura.
-- ---------------------------------------------------------------
delete from estoque_item where id in (10, 145, 296, 354, 90, 492, 426);

-- ---------------------------------------------------------------
-- 3) TIRA o espaço sobrando dos outros 6 (não são duplicata, só
--    estão fora do padrão — e espaço invisível vira duplicata nova
--    na próxima vez que alguém digitar)
-- ---------------------------------------------------------------
update estoque_item
set descricao = regexp_replace(btrim(descricao), '\s+', ' ', 'g')
where descricao <> regexp_replace(btrim(descricao), '\s+', ' ', 'g');

-- ---------------------------------------------------------------
-- 4) APONTA os apelidos para a grafia certa
--    A tabela apelido_material existe para isto: `digitado` é o que a
--    pessoa escreveu, `canonico` é o item de verdade. Hoje os dois estão
--    iguais e errados — então digitar "SIFAO" continuava criando o
--    caminho errado. Agora resolve sozinho.
-- ---------------------------------------------------------------
update apelido_material set canonico = 'SIFÃO'                 where digitado = 'SIFAO';
update apelido_material set canonico = 'LIXA 120'              where digitado = 'LIXA  120';
update apelido_material set canonico = 'ALISAR PEÇA'           where digitado = 'Alisar peça';
update apelido_material set canonico = 'LÁPIS CARPINTEIRO'     where digitado = 'LAPIS CARPINTEIRO';
update apelido_material set canonico = 'PARAFUSO P/ VASO B-10' where digitado = 'PARAFUSO P/ VASO B/10';
update apelido_material set canonico = 'VÁLVULA DE LAVATÓRIO'  where digitado = 'VALVULA DE LAVATÓRIO';
-- e o espaço sobrando também sai do canônico dos apelidos
update apelido_material
set canonico = regexp_replace(btrim(canonico), '\s+', ' ', 'g')
where canonico <> regexp_replace(btrim(canonico), '\s+', ' ', 'g');

commit;

-- ---------------- CONFERÊNCIA ----------------
-- A chave de comparação tem que ignorar CAIXA, ESPAÇO e ACENTO — é a mesma
-- régua que o app usa. Sem tirar o acento, "SIFAO" e "SIFÃO" passariam como
-- itens diferentes e a conferência diria que está tudo certo quando não está.
-- translate() em vez da extensão unaccent, que pode não estar instalada.
--
-- esperado: itens 424 (eram 431) · grupos_duplicados 0 · com_espaco 0
select
  (select count(*) from estoque_item) as itens,
  (select count(*) from (
      select translate(
               regexp_replace(lower(btrim(descricao)), '\s+', ' ', 'g'),
               'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
               'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC') as chave
      from estoque_item
      group by 1 having count(*) > 1) d)                                       as grupos_duplicados,
  (select count(*) from estoque_item
     where descricao <> regexp_replace(btrim(descricao), '\s+', ' ', 'g'))      as com_espaco_sobrando,
  (select count(*) from estoque_item where contagem_em is not null)             as com_contagem;

-- e os 7 que sobraram, para bater o olho
select id, descricao, categoria, saldo_inicial, qtd_minima, contagem_em::date
from estoque_item
where id in (216, 297, 72, 50, 279, 183, 281)
order by descricao;
-- TINTA LARANJA 16L deve estar com saldo 12 e categoria PINTURA
