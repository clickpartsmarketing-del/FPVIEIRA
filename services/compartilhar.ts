// =====================================================================
// COMPARTILHAR O.S. NO GRUPO (v78, pedido do Renan 31/08)
//
// A dor: a emergencial é atendida, a foto sobe no app e no grupo do
// WhatsApp chega SOLTA — sem dizer qual escola, qual serviço, quem fez.
// Depois ninguém liga a foto à O.S. e a evidência se perde.
//
// A solução: ao salvar, o app monta a LEGENDA no padrão e compartilha
// texto + fotos de uma vez. É o mesmo fluxo do contrato de Saquarema
// (fotos antes/depois obrigatórias via grupo), só que com carimbo.
//
// Formatação: negrito do WhatsApp é *asterisco simples* (não **markdown**).
// O texto também cola bem em markdown comum e em e-mail.
// =====================================================================
import { OSCampo, refDaOS } from '../types';

const br = (iso?: string | null) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '');

// o status concorda com "a O.S." (feminino) — é assim que o campo fala
const STATUS_LEGENDA: Record<string, string> = {
  'Concluído': 'Concluída',
  'Assinatura': 'Em assinatura',
  'Avaliando': 'Em avaliação',
  'Material': 'Aguardando material',
};

// LEGENDA PADRÃO (layout definido pelo Renan 31/08, vindo do contrato de
// Saquarema). A referência é a NOSSA (nº oficial da prefeitura ou a
// fictícia da equipe) — o OSE-nnnn é a numeração de lá, não a daqui.
// Linha sem valor não aparece: O.S. sem área/local sai enxuta em vez de
// sair com campo vazio.
//
//   *2190* — Concluída
//   Unidade: Creche M. Márcia Lustosa Machado
//   Local: Cozinha                (só quando houver o dado)
//   Tipo: HIDRÁULICA
//   Criticidade: Emergencial
//   Descrição: Manutenção na porta da sala de aula
export const legendaOS = (os: OSCampo, med?: string, opts: { detalhado?: boolean } = {}): string => {
  const L: string[] = [];
  L.push(`*${refDaOS(os)}* — ${STATUS_LEGENDA[os.status] || os.status}`);

  const linha = (rot: string, val?: string | null) => {
    const v = String(val ?? '').trim();
    if (v) L.push(`${rot}: ${v}`);
  };
  linha('Unidade', os.unidade);
  linha('Local', (os as any).local);           // campo opcional: aparece quando existir
  linha('Tipo', os.area);                      // disciplina: ELÉTRICA, HIDRÁULICA…
  linha('Criticidade', os.classificacao || os.tipo); // Emergencial · Urgente · Corretiva · Preventiva
  linha('Descrição', os.solicitado || os.servico);

  // o resto só quando pedido (relatório/gestão) — no grupo o curto é melhor
  if (opts.detalhado) {
    linha('Serviço executado', os.servico);
    linha('Materiais', os.materiais);
    linha('Memória de cálculo', os.memoria_calculo);
    linha('Executor', os.executor);
    linha('Conclusão', br(os.conclusao));
    linha('Medição', med || os.medicao);
  }
  return L.join('\n');
};

// baixa as fotos do Storage e devolve como File[] pro share nativo.
// Falha de rede em uma foto não derruba o compartilhamento: manda as
// que vieram (a legenda já diz quantas deveriam ser).
const buscarFotos = async (urls: string[], ref: string): Promise<File[]> => {
  const files: File[] = [];
  await Promise.all(urls.slice(0, 10).map(async (u, i) => {
    try {
      const r = await fetch(u);
      if (!r.ok) return;
      const b = await r.blob();
      const ext = (b.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
      files.push(new File([b], `OS_${ref}_${i + 1}.${ext}`, { type: b.type || 'image/jpeg' }));
    } catch { /* foto que não veio fica de fora */ }
  }));
  return files;
};

export type ResultadoShare = 'compartilhado' | 'copiado' | 'cancelado' | 'erro';

// Compartilha no grupo: no celular abre a folha nativa (WhatsApp, e-mail…)
// com legenda + fotos; no desktop copia a legenda pra área de transferência.
export const compartilharOS = async (os: OSCampo, med?: string, opts: { detalhado?: boolean } = {}): Promise<ResultadoShare> => {
  const texto = legendaOS(os, med, opts);
  const urls = os.foto_urls || [];
  const nav = navigator as any;

  // 1) share nativo COM fotos (celular) — é o caminho que resolve a dor
  if (nav.share && urls.length > 0) {
    try {
      const files = await buscarFotos(urls, refDaOS(os));
      if (files.length && nav.canShare?.({ files })) {
        await nav.share({ text: texto, files });
        return 'compartilhado';
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') return 'cancelado'; // usuário fechou a folha
      // qualquer outro erro cai pro share só-texto abaixo
    }
  }
  // 2) share nativo só com o texto
  if (nav.share) {
    try {
      await nav.share({ text: texto });
      return 'compartilhado';
    } catch (e: any) {
      if (e?.name === 'AbortError') return 'cancelado';
    }
  }
  // 3) desktop: copia a legenda (as fotos o gestor pega no app/relatório)
  try {
    await navigator.clipboard.writeText(texto);
    return 'copiado';
  } catch {
    try { window.prompt('Copie a legenda:', texto); return 'copiado'; } catch { return 'erro'; }
  }
};
