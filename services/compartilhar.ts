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
// v87: baixar 15 fotos no 4G da escola leva tempo REAL e antes não havia
// nenhum sinal na tela — o Renato achou que travou e clicou várias vezes,
// cada clique disparando um novo lote de downloads. Agora reporta progresso
// e cada foto tem prazo próprio: a que não vier em 20s fica de fora em vez
// de segurar o compartilhamento inteiro.
const buscarFotos = async (
  urls: string[], ref: string,
  aoProgredir?: (feitas: number, total: number) => void,
): Promise<File[]> => {
  const alvo = urls.slice(0, 30); // teto igual ao do formulário (v101: era 15)
  // v107: grava por ÍNDICE, não com push. Com push a posição no álbum era a
  // ordem em que cada download TERMINOU — a foto leve do "depois" chegava antes
  // da pesada do "antes", e o fiscal recebia a prova fora de ordem. Pior: o
  // corte do lote (maiorLoteAceito) tira as últimas do array, então "quem fica
  // de fora" era sorteio. É o mesmo defeito que a v103 matou no upload e que
  // sobreviveu aqui, do lado do download.
  const porIndice: (File | null)[] = new Array(alvo.length).fill(null);
  let feitas = 0;
  await Promise.all(alvo.map(async (u, i) => {
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 20000);
      const r = await fetch(u, { signal: ctl.signal });
      clearTimeout(t);
      if (!r.ok) return;
      const b = await r.blob();
      const ext = (b.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
      porIndice[i] = new File([b], `OS_${ref}_${i + 1}.${ext}`, { type: b.type || 'image/jpeg' });
    } catch { /* foto que não veio fica de fora */ }
    finally { feitas++; aoProgredir?.(feitas, alvo.length); }
  }));
  return porIndice.filter((f): f is File => !!f);   // ordem da O.S. preservada
};

export type ResultadoShare =
  | 'compartilhado'        // texto + TODAS as fotos
  | 'compartilhado-parcial' // texto + parte das fotos (o aparelho não aceitou todas)
  | 'compartilhado-sem-fotos' // só o texto — as fotos NÃO foram
  | 'copiado' | 'cancelado' | 'erro';

// O MÁXIMO que ESTE aparelho aceita numa folha de compartilhamento.
//
// O canShare do Android recusa lote grande (por peso total ou por número de
// arquivos) e cada fabricante corta num ponto diferente — por isso a mesma
// O.S. vai inteira no celular do Caleb e não vai no do Emiliano.
//
// v93 (regra do Renan 11/09): mandar o MÁXIMO que couber, seja 15 ou 3 —
// o que não pode é ir nada. A v92 testava só 15/10/8/5/3/2/1 e num aparelho
// que aceita 12 mandava 10, perdendo 2 fotos que caberiam. Agora desce de
// um em um e acha o teto exato. São no máximo 15 chamadas síncronas e
// baratas: não pesa no celular.
const maiorLoteAceito = (nav: any, files: File[]): File[] => {
  if (!files.length) return [];
  if (!nav.canShare) return [];           // aparelho sem suporte a arquivo
  for (let n = files.length; n >= 1; n--) {
    const lote = files.slice(0, n);
    try { if (nav.canShare({ files: lote })) return lote; } catch { /* tenta com uma a menos */ }
  }
  return [];
};

// Compartilha no grupo: no celular abre a folha nativa (WhatsApp, e-mail…)
// com legenda + fotos; no desktop copia a legenda pra área de transferência.
export const compartilharOS = async (
  os: OSCampo, med?: string,
  opts: { detalhado?: boolean; aoProgredir?: (feitas: number, total: number) => void } = {},
): Promise<ResultadoShare> => {
  const texto = legendaOS(os, med, opts);
  const urls = os.foto_urls || [];
  const nav = navigator as any;

  // 1) share nativo COM fotos (celular) — é o caminho que resolve a dor
  //
  // v92: ATÉ AQUI ISTO FALHAVA CALADO. Se o canShare recusasse o lote, o
  // código caía no share só-texto e devolvia 'compartilhado' — a tela dizia
  // "enviado" e as fotos não iam. Foi o que aconteceu com o Emiliano.
  // Agora: tenta o lote inteiro, depois lotes menores, e o retorno DIZ o que
  // realmente foi.
  // v103 — ESTE RAMO É TERMINAL. Ele nunca mais escorre para o bloco 2.
  // Dois defeitos reais que estavam aqui, os dois com cara do caso do Neilson:
  //  (a) DUAS MENSAGENS. Se o `nav.share` com arquivos falhasse com qualquer
  //      coisa que não fosse o usuário cancelando, o catch não retornava e a
  //      execução caía no bloco 2, que abria uma SEGUNDA folha de
  //      compartilhamento para a mesma O.S. — a segunda sem foto nenhuma.
  //  (b) MENTIRA NA TELA. Se NENHUMA foto conseguisse ser baixada do Storage
  //      (sinal caindo na escola, storage restringido), `buscarFotos` devolvia
  //      lista vazia sem erro, os dois testes abaixo davam falso e o fluxo caía
  //      no bloco 2, devolvendo 'compartilhado'. A tela dizia "enviado: cartão
  //      + todas as fotos" com ZERO foto enviada. É a mesma dor do Emiliano que
  //      a v92 se propôs a matar, sobrevivendo num ramo que ela não fechou.
  if (nav.share && urls.length > 0) {
    let fotos: File[] = [];
    try {
      fotos = await buscarFotos(urls, refDaOS(os), opts.aoProgredir);
    } catch { fotos = []; /* buscarFotos já engole falha por foto; aqui é o geral */ }

    // REGRA DO RENAN (18/09): a legenda VAI SEMPRE. Cheguei a tirar o
    // `text` do share para o WhatsApp não repetir o cartão em cada foto,
    // e ele vetou: o cartão em texto é o padrão do grupo e não se abre
    // mão dele. Então o share leva legenda + fotos numa ÚNICA chamada.
    const lote = maiorLoteAceito(nav, fotos);
    if (lote.length) {
      const faltam = urls.length - lote.length;
      const txt = faltam > 0
        ? `${texto}\n\n_${lote.length} de ${urls.length} fotos — as outras ${faltam} estão no app._`
        : texto;
      // a legenda também fica na área de transferência: se o aparelho
      // engolir o texto, é só colar no grupo sem redigitar
      try { await (navigator as any).clipboard?.writeText(txt); } catch { /* sem permissão: segue */ }
      try {
        await nav.share({ text: txt, files: lote });
        return faltam > 0 ? 'compartilhado-parcial' : 'compartilhado';
      } catch (e: any) {
        if (e?.name === 'AbortError') return 'cancelado';  // usuário fechou a folha
        return 'erro';   // recusou a folha: NÃO abre uma segunda
      }
    }

    // tem foto no banco e nenhuma pôde ir — ou o download não veio, ou o
    // aparelho recusou todas. Manda o texto e DIZ que a foto não foi.
    try { await (navigator as any).clipboard?.writeText(texto); } catch { /* segue */ }
    try {
      await nav.share({ text: texto });
      return 'compartilhado-sem-fotos';
    } catch (e: any) {
      if (e?.name === 'AbortError') return 'cancelado';
      return 'copiado';   // a legenda ficou na área de transferência
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
