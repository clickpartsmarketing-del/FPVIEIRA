-- =====================================================================
-- CORRIGE A O.S. 2471 DUPLICADA
-- Banco: EDUCAÇÃO (lgdnuyreaknxjswrfbjw) · SQL Editor
--
-- O QUE ACONTECEU (apurado em 16/09/2026):
-- Em 27/08 a ponte do e-mail leu um documento do Simar Machado Sodré
-- (manutenção no telhado) e gravou com o número 2471. O número estava
-- ERRADO: o documento oficial no Drive diz, dentro da planilha,
-- "Nº OS = 2231" com data de abertura 27/08/2026. A ponte tira o número
-- do NOME DO ARQUIVO, e naquele dia o arquivo estava nomeado como 2471.
-- O arquivo foi renomeado depois, e em 16/09 a ponte inseriu de novo,
-- agora corretamente, como 2231.
--
-- RESULTADO HOJE: o mesmo serviço aparece duas vezes —
--   id 3220 · nº 2471 · Simar Machado Sodré · telhado   <- ERRADO
--   id 3522 · nº 2231 · Simar Machado Sodré · telhado   <- CORRETO
-- E o número 2471 colidia com a O.S. que o Wellington emitiu HOJE no app
-- da fiscalização para a Fazenda da Praia (id 3510), que o Leandro já
-- executou e concluiu com 3 fotos.
--
-- Tirando o registro errado, a colisão desaparece: o 2471 passa a ser
-- só da Fazenda da Praia, que é a dona legítima do número.
--
-- NÃO APAGA: segue a regra da casa — marca `excluida = true` e status
-- 'Cancelada'. O número continua sendo história e o registro fica
-- rastreável; `par_sugerido` aponta para onde o serviço foi parar.
-- =====================================================================

-- ---------- ANTES ----------
-- esperado: 3 linhas — 2231 (Simar, correta), 2471 Simar (errada, id 3220)
-- e 2471 Fazenda da Praia (id 3510, concluída pelo Leandro)
select id, numero, unidade, entrada, status, executor, excluida,
       left(regexp_replace(solicitado, '\s+', ' ', 'g'), 70) as pedido
from os_campo
where numero in (2231, 2471)
order by numero, id;

-- =====================================================================
-- APLICA — só a linha errada (id 3220)
-- =====================================================================
begin;

update os_campo
set excluida = true,
    status = 'Cancelada',
    par_sugerido = '2231'
where id = 3220
  and numero = 2471
  and unidade = 'Escola M. Simar Machado Sodré'   -- trava: se não for esta, não mexe
  and excluida = false;

commit;

-- ---------- DEPOIS ----------
-- esperado: 2471 aparece uma vez só, e é a da Fazenda da Praia
select id, numero, unidade, status, executor, excluida, par_sugerido
from os_campo
where numero in (2231, 2471)
order by numero, id;

-- e a varredura geral: os únicos números repetidos devem voltar a ser
-- o 1218 e o 1673 (cicatriz histórica, já conhecida)
select numero, count(*) as vezes,
       string_agg(unidade, '  x  ') as unidades
from os_campo
where excluida = false and numero is not null
group by numero
having count(*) > 1
order by numero;
