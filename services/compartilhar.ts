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

// a legenda que vai junto com as fotos no grupo
export const legendaOS = (os: OSCampo, med?: string): string => {
  const L: string[] = [];
  L.push(`*O.S. ${refDaOS(os)} — ${os.unidade}*`);

  const cab: string[] = [];
  if (os.fiscal) cab.push(`Fiscal: ${os.fiscal}`);
  if (os.executor) cab.push(`Executor: ${os.executor}`);
  if (cab.length) L.push(cab.join(' · '));

  const datas: string[] = [];
  if (os.entrada) datas.push(`Entrada: ${br(os.entrada)}`);
  if (os.conclusao) datas.push(`Conclusão: ${br(os.conclusao)}`);
  datas.push(os.status);
  if (med || os.medicao) datas.push(String(med || os.medicao));
  L.push(datas.join(' · '));

  const bloco = (rot: string, val?: string | null) => {
    const v = (val || '').trim();
    if (v) L.push('', `*${rot}:* ${v}`);
  };
  bloco('Fiscal pediu', os.solicitado);
  bloco('Serviço executado', os.servico);
  bloco('Materiais', os.materiais);
  bloco('Memória de cálculo', os.memoria_calculo);

  const n = os.foto_urls?.length || 0;
  if (n) L.push('', `📷 ${n} foto${n > 1 ? 's' : ''}`);
  L.push('', '_F.P. Vieira Engenharia · FP.094 Educação_');
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
export const compartilharOS = async (os: OSCampo, med?: string): Promise<ResultadoShare> => {
  const texto = legendaOS(os, med);
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
