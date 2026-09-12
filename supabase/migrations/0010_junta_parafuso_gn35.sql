-- =====================================================================
-- 0010 · JUNTA O PARAFUSO GN 35
-- Banco fpv-campo22 · lgdnuyreaknxjswrfbjw · 12/09/2026
--
-- Apareceu na folha de contagem do João: os itens 26 e 44 do top 50 eram a
-- MESMA peça escrita de dois jeitos. Ele confirmou que é a mesma.
--
-- POR QUE A 0009 NÃO PEGOU: lá a régua colapsava espaço das PONTAS e
-- acento. Aqui o espaço está no MEIO — "GN 35" contra "GN35" — e isso o
-- normalizador trata como palavras diferentes, corretamente: colapsar todo
-- espaço interno juntaria coisas que não devem ser juntadas.
-- Para este caso o instrumento certo é a tabela de apelidos, não a régua.
--
-- QUEM FICA: 'PARAFUSO GN 35' (id 225) — 6 saídas e 78 unidades, contra 3
-- saídas e 41,5 do 'PARAFUSO GN35' (id 226). É também o que já tem apelido.
--
-- TERCEIRA GRAFIA: o histórico ainda tem 'PARAFUSO DRYWALL GN 35' (1 saída,
-- 30 un). Não existe no catálogo — foi digitada solta no balcão. Entra como
-- apelido para não virar item novo na próxima vez.
--
-- SEGURO: as duas contagens estão em zero, então a soma não muda nada. O
-- histórico de saída não é reescrito. Rodar 2x não muda nada.
-- =====================================================================

begin;

-- 1) soma a contagem do que sai no que fica (ambos em zero hoje, mas a
--    conta fica certa se alguém contar entre a leitura disto e o Run)
update estoque_item k
set saldo_inicial = coalesce(k.saldo_inicial, 0) + coalesce(d.saldo_inicial, 0),
    contagem_em   = coalesce(k.contagem_em, d.contagem_em),
    qtd_minima    = greatest(coalesce(k.qtd_minima, 0), coalesce(d.qtd_minima, 0)),
    categoria     = case when k.categoria = 'DIVERSOS' and d.categoria <> 'DIVERSOS'
                         then d.categoria else k.categoria end
from estoque_item d
where k.id = 225 and d.id = 226;

-- 2) apaga o duplicado
delete from estoque_item where id = 226;

-- 3) as duas outras grafias viram apelido do item certo — é assim que o
--    app resolve sozinho na próxima digitação, em vez de criar item novo
insert into apelido_material (digitado, canonico, usos)
values ('PARAFUSO GN35',          'PARAFUSO GN 35', 3),
       ('PARAFUSO DRYWALL GN 35', 'PARAFUSO GN 35', 1)
on conflict (digitado) do update set canonico = excluded.canonico;

commit;

-- ---------------- CONFERÊNCIA ----------------
-- esperado: 1 item · id 225 · 'PARAFUSO GN 35'
select id, descricao, categoria, unidade, saldo_inicial, qtd_minima
from estoque_item where descricao ilike '%GN%35%' order by descricao;

-- esperado: 3 apelidos, todos apontando para 'PARAFUSO GN 35'
select digitado, canonico, usos from apelido_material
where digitado ilike '%GN%35%' order by digitado;

-- o histórico continua inteiro: 10 saídas nas três grafias
select descricao, count(*) as saidas, sum(quantidade) as unidades
from saida_material where descricao ~* 'GN\s*35'
group by descricao order by saidas desc;
