# Banco do FPV Campo — o que está onde

Organizado em 12/09/2026. Antes disso eram 21 arquivos `.sql` soltos na raiz
do repositório, sem ordem e sem registro do que tinha sido rodado. Este
documento diz a verdade sobre o estado — inclusive o que ainda não fecha.

## As quatro pastas

| Pasta | O que é |
|---|---|
| `migrations/` | Mudanças de **estrutura**, numeradas e em ordem. É o que reconstrói o banco. |
| `aplicados/` | Correções de **dado** já rodadas (não mudam estrutura) e os arquivos antigos consolidados no baseline. Histórico — não rodar de novo. |
| `consultas/` | Só leitura. Ferramenta de conferência, nunca escreve. |
| `propostos/` | Escritos e **nunca aplicados**. Não rodar sem decidir antes. |

## O estado real, sem maquiagem

**A tabela `schema_version` não existe em produção.** Ela é criada pela
`0000` e serve para registrar o que já foi aplicado. Como nunca foi rodada,
hoje **não existe registro no banco** de qual migration entrou — a ordem
abaixo foi reconstruída pela data do git e confirmada consultando as colunas
que existem em produção.

**O baseline `0001` é de 28/07/2026 e não foi verificado contra a produção
de hoje.** Ele foi escrito consolidando os `.sql` antigos, não extraído do
banco. Para ter certeza de que ele reproduz a produção seria preciso um
`pg_dump` do Supabase, que não dá para fazer pela API REST. **Enquanto isso
não for feito, trate a `0001` como "muito provavelmente certa", não como
garantida.**

## migrations/ — a ordem

| Nº | Arquivo | Quando | Confirmado em produção por |
|---|---|---|---|
| 0000 | `schema_version` | — | **não aplicada** |
| 0001 | `baseline` | 28/07 | as 10 tabelas do app existem |
| 0002 | `andaime` | 17/08 | `andaime_item` e `andaime_movimento` existem |
| 0003 | `local_na_os` | 01/09 | `os_campo.local` existe |
| 0004 | `troca_equipe_setembro` | 01/09 | rodado e validado na conversa |
| 0005 | `contrato_na_os` | 02/09 | `os_campo.contrato` existe |
| 0006 | `contrato_na_saida` | 12/09 | `saida_material.contrato` existe, 3.780 linhas classificadas |

## propostos/ — escritos e nunca rodados

O pacote de segurança por papéis (`01` a `09`). Sei que não foi aplicado
porque a tabela `perfis`, que o `01-papeis.sql` cria, **não existe no banco**.

A RLS que está em produção hoje veio do `AUDITORIA-RLS-FIX.sql` (hoje em
`aplicados/`), que usa lista fixa de e-mails dentro da policy. Ela funciona —
testei: a chave pública não lê nada e escrever devolve 401 — mas cada pessoa
nova exige editar a policy no SQL. O pacote em `propostos/` resolveria isso
com papéis em tabela.

Também estão aqui `06-integridade`, `07-auditoria-estoque` e
`09-fotos-privadas`. O `09` tornaria o bucket de fotos privado — **atenção:
isso quebra o relatório fotográfico**, que monta HTML com URL direta. Decidir
antes de rodar.

## Tabelas que têm SQL e não existem no banco

`financeiro`, `os_edicao_log` e `perfis`. Nenhuma é chamada pelo app, então
não há tela quebrada. São restos de pacotes que não foram adiante.

(A tela Financeiro usa `contrato_financeiro`, que **existe**. O
`FINANCEIRO.sql` antigo criava outra coisa.)

## A regra daqui para frente

Todo SQL novo nasce como migration numerada nesta pasta, com o próximo
número livre. Nada de arquivo solto na raiz. Correção de dado vai para
`aplicados/` com a data no nome.

E quando der, rodar a `0000` em produção: sem ela, continuamos sem registro
de qual migration entrou, e a ordem acima segue sendo reconstrução, não fato.
