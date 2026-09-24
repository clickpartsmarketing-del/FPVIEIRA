// v109 — DEEP LINK DO FISCAL (pedido do Renan 24/09).
// O emissor da fiscalização (SEMDE) compartilha no grupo um link
//   https://fpvieira.vercel.app/?os=2530&un=...&ar=...&ni=...&as=...&de=...&fi=...&dt=...
// O colaborador clica, cai na aba "Nova O.S." com o pedido do fiscal já
// preenchido e só registra a execução (fotos/serviço) — o compartilhar
// existente faz o resto. A ponte 3x/dia pula o insert quando o número já
// existe, então criar por aqui NÃO duplica (o xlsx oficial do Drive/Storage
// continua nascendo do lado da fiscalização).
import { OSCampo, FISCAL_OPTIONS, CLASSIF_OPTIONS } from '../types';
import { ESCOLAS } from '../data/escolas';

// nível do emissor (I/II/III) → vocabulário do campo. A convenção é a do
// import de 02/09: III=Emergencial · II=Urgente · I=Normal.
const NIVEL_CLASSIF: Record<string, string> = { III: 'Emergencial', II: 'Urgente', I: 'Normal' };

const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();

function lerDaURL(): Partial<OSCampo> | null {
  try {
    const q = new URLSearchParams(window.location.search);
    const numero = Number(q.get('os') || '');
    // sem número oficial o link não vale: é o número que impede a ponte de
    // duplicar e que ativa a guarda anti-duplicata do formulário
    if (!Number.isFinite(numero) || numero <= 0) return null;
    const p: Partial<OSCampo> = { numero: Math.trunc(numero) };

    const un = (q.get('un') || '').trim();
    if (un) {
      // usa a grafia CANÔNICA da lista do app quando bater — contrato, zona
      // e relatórios por unidade dependem do nome exato
      const canon = ESCOLAS.find(e => norm(e) === norm(un));
      p.unidade = canon || un;
    }

    const ar = (q.get('ar') || '').trim();
    if (ar) p.area = ar;

    const ni = (q.get('ni') || '').trim().toUpperCase();
    if (NIVEL_CLASSIF[ni]) p.classificacao = NIVEL_CLASSIF[ni];
    else {
      // aceita a palavra por extenso em qualquer caixa (ni=Urgente/URGENTE…)
      const porExtenso = CLASSIF_OPTIONS.find(c => c.toUpperCase() === ni);
      if (porExtenso) p.classificacao = porExtenso;
    }

    // fiscal do emissor ("Renato Medeiros") → opção do app ("Renato");
    // sem par, fica o padrão da zona do login
    const fi = (q.get('fi') || '').trim();
    if (fi) {
      const opcao = FISCAL_OPTIONS.find(f => norm(fi).startsWith(norm(f)) || norm(f).startsWith(norm(fi).split(' ')[0]));
      if (opcao) p.fiscal = opcao;
    }

    const dt = (q.get('dt') || '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(dt)) p.entrada = dt;

    // assunto + descrição do fiscal viram o "O que o fiscal solicitou" —
    // mesmo separador " — " que a ponte usa
    const solicitado = [q.get('as'), q.get('de')].map(v => (v || '').trim()).filter(Boolean).join(' — ');
    if (solicitado) p.solicitado = solicitado;

    return p;
  } catch {
    return null;
  }
}

// lido UMA vez, no load do módulo (antes de qualquer render — StrictMode-safe)
const prefillInicial = lerDaURL();
let consumido = false;

// a página ABRIU por um link do fiscal? Constante da carga: NÃO muda quando o
// formulário consome o prefill. (Bug do 1º teste 24/09: o efeito do NovaOS
// consumia antes do efeito de teleporte do App — filho roda antes do pai — e
// a equipe era teleportada pro Painel por cima do formulário preenchido.)
export const chegouPorLink = !!prefillInicial;

// o prefill, enquanto não consumido
export const deepLinkPrefill = (): Partial<OSCampo> | null =>
  consumido ? null : prefillInicial;

// consome: limpa a query da barra p/ F5/salvar não re-preencher (duplicata)
export function consomeDeepLink(): void {
  if (consumido) return;
  consumido = true;
  try { history.replaceState(null, '', window.location.pathname); } catch { /* ok */ }
}
