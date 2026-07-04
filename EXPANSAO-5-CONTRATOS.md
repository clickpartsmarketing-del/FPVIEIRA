# Expansão FP Vieira — replicar o sistema FPV Campo para os demais contratos

> Briefing para a força-tarefa (conta/máquina 2). Contexto completo do que já existe
> e o passo a passo de replicação. NÃO contém chaves — cada contrato cria as suas.

## O que já existe (contrato FP.094 Educação Rio das Ostras)

- **App em produção:** https://fpvieira.vercel.app — este repositório (React 19 + Vite +
  Tailwind CDN + Supabase cloud + Vercel, custo R$ 0). 9 usuários, 5 papéis.
- **Fluxo:** apontador registra O.S. por voz/chat ou formulário → foto p/ Storage →
  memória de cálculo → engenheiro roda a Rota de Conferência e colhe assinatura →
  esteira de medição do Edmar (5 selos: Concluída/Memória/Foto/Nº/Assinatura) →
  export CSV p/ planilha oficial de MEDIÇÃO. Almoxarifado lança saída de material
  vinculada à O.S.
- **Papéis por prefixo de e-mail** (App.tsx): gestores (`lucas`, `rafael`) veem o
  boletim do contrato; `nicolas` (engenheiro) vê o app de rota; `edmar` (medição) vê a
  esteira; encarregados (nome = executor) veem "Minhas O.S." com alerta de prazo.
- **Empresa:** F.P. Vieira Engenharia. Contrato 064/2025 (FP.094) ≈ R$ 11,7M/ano,
  ~68 escolas, preços EMOP-RJ, medição mensal cumulativa. Dores que o sistema ataca:
  serviço concluído que nunca vira cobrança ("dinheiro travado", 141 casos na planilha
  antiga), gargalo de assinatura do fiscal, O.S. sem nº oficial = risco de glosa/TCE-RJ.

## Como replicar para um novo contrato (~2h de infraestrutura)

1. **Clonar este repo** → novo repo (ex.: `fpv-saude`). Ajustar em `index.html` o
   título e, se quiser, a cor `fpv` do Tailwind config.
2. **Supabase:** criar projeto novo (grátis) → rodar `supabase.sql` + `supabase_vps.sql`
   (sequência F + trigger) + `almoxarifado.sql` + `alter table os_campo add column if
   not exists solicitado text;` → bucket `fotos-os` público c/ as 2 policies do
   supabase.sql → criar usuários (Auth > Add user, Auto Confirm) conforme a equipe
   do contrato.
3. **Ajustar o app ao contrato:** `data/escolas.ts` (unidades do contrato),
   `types.ts` (FISCAL_OPTIONS, EXECUTOR_OPTIONS, MED_OPTIONS), `GESTORES` e o
   cabeçalho em `App.tsx`, nº do contrato em `FechamentoSemanal.tsx`, função
   `medAtual()` em `components/Gestao.tsx` (âncora de calendário da medição).
4. **Vercel:** import do repo + 2 env vars (`VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY`). Build automático a cada push.
5. **(Opcional) Edge function `transcrever`** p/ áudio real: painel Supabase → Edge
   Functions → Via Editor → colar `supabase/functions/transcrever/index.ts` → secret
   `OPENAI_API_KEY` (ou `GROQ_API_KEY`). Sem ela o app usa o reconhecimento do
   navegador (funciona).

## Antes do app: a auditoria (é ela que gera valor imediato)

O padrão FP.094 foi: auditar a planilha de controle do contrato (status, furos,
"dinheiro travado", 80/20 dos executores) → cruzar O.S. × saída de materiais →
fila de fechamento por encarregado → só então o app. Para cada contrato novo,
pedir: planilha de controle de O.S., planilha de saída de materiais, planilha da
última MEDIÇÃO e a relação de unidades. REGRA DURA: nunca alterar arquivos
originais — trabalhar sempre em cópias numa pasta nova.

## Ordem sugerida da expansão

1. **FP.096 Saúde** (já ativo, ~7 pessoas, compras próprias) — tem dados hoje.
2. Os demais contratos da Região dos Lagos conforme forem assinados/entregarem
   planilhas (potencial total ≈ 5 × R$ 11,7M/ano).

## Visão de arquitetura futura (não bloquear a replicação por isso)

Multi-contrato de verdade = 1 banco com coluna `contrato_id` + login multi-contrato
(schema já desenhado em `estoque_schema.sql`) + n8n na VPS da empresa espelhando
p/ Google Sheets. Por ora, 1 projeto Supabase por contrato é mais simples, isola
riscos e continua grátis.
