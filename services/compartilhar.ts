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
// LOCAL e TIPO quase nunca vêm preenchidos (a `area` está vazia na maioria
// das O.S. e não existe campo de local). Como a descrição do fiscal quase
// sempre diz — "MANUTENÇÃO NA COZINHA", "troca de torneira do banheiro" —
// a legenda deduz do texto. Conservador: só assume quando a palavra
// aparece; na dúvida a linha não sai (melhor faltar que mentir).
const LOCAIS: [RegExp, string][] = [
  [/cozinha/i, 'Cozinha'], [/refeit[óo]rio/i, 'Refeitório'],
  [/banheiro|sanit[áa]rio|vaso|lavat[óo]rio|wc\b/i, 'Banheiro'],
  [/secretaria/i, 'Secretaria'], [/dire[çc][ãa]o/i, 'Direção'],
  [/sala de aula|sala \d+|salas de aula/i, 'Sala de aula'],
  [/p[áa]tio/i, 'Pátio'], [/quadra/i, 'Quadra'], [/corredor/i, 'Corredor'],
  [/bebedouro/i, 'Bebedouro'], [/almoxarifado/i, 'Almoxarifado'],
  [/dep[óo]sito|despensa/i, 'Depósito'], [/vesti[áa]rio/i, 'Vestiário'],
  [/recep[çc][ãa]o/i, 'Recepção'], [/telhado|calha/i, 'Telhado'],
  [/caixa d.?[áa]gua|cisterna|reservat[óo]rio/i, 'Caixa d\'água'],
  [/portão|portao|entrada principal/i, 'Portão'],
  [/ber[çc][áa]rio/i, 'Berçário'], [/biblioteca/i, 'Biblioteca'],
];
const TIPOS: [RegExp, string][] = [
  [/l[âa]mpada|tomada|interruptor|disjuntor|el[ée]tric|fia[çc][ãa]o|circuito|luminária|calha de ilumina|energia|curto/i, 'ELÉTRICA'],
  [/torneira|sif[ãa]o|descarga|vazamento|hidr[áa]ulic|registro|bomba d.?[áa]gua|rabicho|v[áa]lvula|cuba|ducha|entupi|vaso sanit|parafuso de vaso|tampa de vaso|assento sanit|sp?ud|espude|anel de cera|caixa acoplada|mict[óo]rio|chuveiro|filtro|bebedouro|tubula[çc]|cano|joelho|luva de \d/i, 'HIDRÁULICA'],
  [/esgoto|caixa de gordura|fossa|ralo/i, 'HIDRÁULICA E ESGOTO'],
  [/fechadura|porta|ma[çc]aneta|dobradi[çc]a|caixilho|divis[óo]ria|alizar|batente/i, 'CARPINTARIA'],
  [/pintura|pintar|tinta|massa corrida|l[áa]tex/i, 'PINTURA'],
  [/vidro|vidra[çc]/i, 'VIDRAÇARIA'],
  [/grade|solda|serralh|port[ãa]o met[áa]lico|corrim[ãa]o/i, 'SERRALHERIA'],
  [/piso|azulejo|alvenaria|reboco|argamassa|parede|forro|gesso|pastilha|revestimento/i, 'CIVIL'],
  [/ar condicionado|refrigera[çc]|geladeira|freezer/i, 'REFRIGERAÇÃO'],
];
// vence quem tem MAIS ocorrências, não quem vem primeiro na lista: a O.S.
// "troca de espude, anel de cera, parafuso de vaso, INTERRUPTOR, descargas"
// é hidráulica com um item elétrico no meio — pela ordem sairia ELÉTRICA
const deduz = (tabela: [RegExp, string][], ...textos: (string | null | undefined)[]): string => {
  const t = textos.filter(Boolean).join(' ');
  if (!t.trim()) return '';
  let melhor = '', pontos = 0;
  for (const [re, valor] of tabela) {
    const n = (t.match(new RegExp(re.source, 'gi')) || []).length;
    if (n > pontos) { pontos = n; melhor = valor; }
  }
  return melhor;
};

export const legendaOS = (os: OSCampo, med?: string, opts: { detalhado?: boolean } = {}): string => {
  const L: string[] = [];
  L.push(`*${refDaOS(os)}* — ${STATUS_LEGENDA[os.status] || os.status}`);

  // só entra na legenda o que tem CONTEÚDO: a equipe às vezes digita "." ou
  // "," só pra passar da validação de memória obrigatória, e isso ia pro
  // grupo como "Quantificação: ,"
  const temTexto = (s: string) => /[a-zA-ZÀ-ÿ0-9]/.test(s);
  const linha = (rot: string, val?: string | null) => {
    const v = String(val ?? '').trim();
    if (v && temTexto(v)) L.push(`${rot}: ${v}`);
  };
  // o serviço executado é a melhor fonte pra deduzir; o pedido do fiscal
  // entra junto porque muita O.S. só tem ele preenchido
  const textos = [os.servico, os.solicitado, os.materiais];

  linha('Unidade', os.unidade);
  // Local: o que a equipe digitou; se não digitou, deduz do texto
  linha('Local', (os as any).local || deduz(LOCAIS, ...textos));
  // Tipo NUNCA fica vazio: sem disciplina identificada é "OUTROS SERVIÇOS"
  linha('Tipo', (os.area || deduz(TIPOS, ...textos) || 'OUTROS SERVIÇOS').toUpperCase());
  linha('Criticidade', String(os.classificacao || os.tipo || '').toUpperCase());
  // Quantificação É a memória de cálculo (definição do Renan): "1 fechadura",
  // "Vidro 18×26" — é o número que vira item EMOP na medição. Sem memória a
  // linha não sai; NÃO cai em materiais, que é outra coisa (o que saiu do
  // almoxarifado, não o que foi medido).
  linha('Quantificação', os.memoria_calculo);
  // O modelo do grupo mostra só o que FOI FEITO. A descrição (pedido do
  // fiscal) só entra quando ainda não há execução — aí é o que temos.
  const pedido = String(os.solicitado ?? '').trim();
  const feito = String(os.servico ?? '').trim();
  if (feito) linha('Executado', feito);
  else linha('Descrição', pedido);
  linha('Executante', os.executor);

  // detalhe extra só quando pedido (gestão/medição) — no grupo o curto é melhor
  if (opts.detalhado) {
    linha('Materiais', os.materiais);
    linha('Memória de cálculo', os.memoria_calculo);
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
