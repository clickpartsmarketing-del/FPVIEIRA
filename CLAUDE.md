# FPV CAMPO — identidade do projeto (leia antes de mexer)

App de campo da F.P. Vieira Engenharia para o contrato **FP.094 (Educação,
Rio das Ostras, ~68 escolas)**: registro de O.S., almoxarifado, medição.
Stack: **React 19 + Vite + Tailwind CDN + Supabase** (auth + postgres +
storage + realtime). Deploy: **Vercel builda a cada push na `main`** —
push = produção imediata. NÃO há Node/npm na máquina local do Renan;
validação de build acontece na Vercel.

- Produção: https://fpvieira.vercel.app · Supabase `lgdnuyreaknxjswrfbjw` (sa-east-1)
- Fork de avaliação (arquivado): github `clickpartsmarketing-del/FPVIEIRA-SIMPLES`
- Requisitos vêm dos DOCX do Nicolas/Lucas: RV000 (painel emergência),
  REV001/REV002 (almoxarifado). Expansão: `EXPANSAO-5-CONTRATOS.md`.
- Antes de entregar: consulte `ERROS-E-LICOES.md` (não regrida) e, se mexeu
  em banco, rode `CONFERENCIA-GERAL.sql` no SQL Editor (66 checks, só leitura).

## Regras DURAS (decisões travadas — não reverter sem o Renan)

1. **Número de O.S. é ETERNO.** Nunca delete físico pelo app: `osService.excluir`
   marca `excluida=true` + status Cancelada. O livro-razão (`os_campo_log`,
   trigger `trg_fpv_log_os`) grava toda edição/exclusão com e-mail do JWT.
2. **Toda release visível bumpa `VERSAO` em `App.tsx`.** É o diagnóstico
   definitivo de cache de bundle no celular do campo.
3. **Datas sempre com `hojeLocal()`** (config.ts). `toISOString().slice(0,10)`
   é proibido — carimba data UTC (amanhã depois das 21h).
4. **Zonas (correção Renan 06/07):** Equipe Leandro (`emergencia1`, prefixo L)
   = fiscal **WELLINGTON**; Equipe Miqueias (`emergencia2`, M) = fiscal
   **RENATO**. Corretiva: Gilson G, Carlos Alberto C. Legado global F-nn
   (piso 88 calculado no app — `osService.proximaF`).
5. **Chaves:** anon key só em env da Vercel (aparecer no bundle é ok, RLS
   protege). Service role key NUNCA no repo — mora em
   `C:\Users\nicol\.claude\fpv_supabase.env` (uso local/REST).
6. **Planilhas originais do contrato são read-only.** Entregas sempre em
   arquivo novo na pasta `_AUDITORIA E FERRAMENTAS FPV (Nicolas)`.
7. **Status são strings** — fonte única `STATUS_OPTIONS` em `types.ts`.
   Status novo → revisar `FILTROS_STATUS` (ListaOS) e o funil (PainelEquipe).
8. **Lucas é o gestor geral:** quando um DOC restringir um poder a nomes
   (ex.: prioridade/contagem = Nicolas/Renan), Lucas herda por padrão.
9. **Referência única da O.S.:** `refDaOS()` em types.ts (oficial > L/M/G/C >
   F-nn). Toda tela/planilha nova usa ela, nunca monta a ref na mão.
10. **RLS:** delete de `os_campo` só gestores; `saida_material` gestores+João.
    Nada de `USING (true)` em delete. Conferir com CONFERENCIA-GERAL.

## Convenções de código

- Comentários em pt-BR contando o **porquê operacional** (quem pediu, quando,
  qual dor de campo resolve) — este arquivo e o git log são a memória do projeto.
- `osService.salvar` é resiliente a coluna ausente (re-insere sem ela). Manter
  esse padrão ao adicionar coluna nova: app nunca quebra por SQL pendente.
- Botões de salvar: travar com ref/state ANTES do primeiro `await`
  (anti duplo-toque — lição #7).
- Realtime: sempre com debounce (~1,2s) contra rajadas.
- SQLs novos: idempotentes (`if not exists` / `drop policy if exists`) e com
  SELECT de conferência no fim (padrão OK/FALTOU).

## Pessoas e logins (@fpv.app, 10)

emergencia1 (Equipe Leandro) · emergencia2 (Equipe Miqueias) · gilson ·
carlosalberto · joao (almox) · nicolas (engenharia) · renan · lucas (gestor
geral) · rafael · edmar (medição). Lista com rótulos: `ACESSOS` em config.ts
(alimenta o login em 2 toques). Usuário novo = criar no Supabase Auth +
adicionar em ACESSOS (+ GESTORES/ALMOX/EQUIPES/CORRETIVA se for o caso).

## Treinamento

Site estático em `public/treinamento/` (servido em /treinamento/ no mesmo
deploy): trilhas por papel com progresso local. Atualizar quando um fluxo
de tela mudar.
