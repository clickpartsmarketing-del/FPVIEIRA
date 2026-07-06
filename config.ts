// =============================================================
// CONFIGURAÇÃO OPERACIONAL — o que muda de semana em semana
// fica aqui, num lugar só.
// =============================================================

// Voz DESLIGADA nesta semana (decisão Renan 05/07/2026): a entrada
// de O.S. é pelo FORMULÁRIO. O código do Chat/transcrição continua
// no repo intacto — religar = trocar para true.
export const VOZ_ATIVA = false;

export const GESTORES = ['lucas', 'rafael', 'nicolas', 'edmar'];

// João só enxerga o Almoxarifado — ele é o responsável pelo estoque,
// não lança O.S. (gestão também vê a aba p/ acompanhar)
export const ALMOX = ['joao'];

// Equipes de emergência: o login é da EQUIPE — o fiscal da zona já
// vem preenchido e o executor se escolhe entre os membros em 1 toque.
// A visão "Minhas O.S." da equipe é POR FISCAL responsável (decisão
// Renan 05/07): equipe 1 vê as emergenciais do Renato, equipe 2 as
// do Wellington — não por executor.
// prefixo = numeração da equipe (decisão Renan 05/07 à noite): O.S. sem
// nº oficial nasce L01, L02… (Leandro) / M01, M02… (Miqueias), gerada
// pelo sistema — nunca colide com nº de e-mail nem com F-nn do legado.
export interface Equipe { fiscal: string; membros: string[]; prefixo: string; apelido: string; }
export const EQUIPES: Record<string, Equipe> = {
  emergencia1: { fiscal: 'Renato', membros: ['Renato', 'Leandro'], prefixo: 'L', apelido: 'Equipe Leandro' },
  emergencia2: { fiscal: 'Wellington', membros: ['Wellington', 'Miqueias', 'Patrick'], prefixo: 'M', apelido: 'Equipe Miqueias' },
};

// Encarregados da CORRETIVA: painel próprio (igual ao emergencial, mas
// filtrado pelo EXECUTOR) e numeração própria (G01 Gilson / C01 Carlos)
export interface Corretiva { executor: string; prefixo: string; apelido: string; }
export const CORRETIVA: Record<string, Corretiva> = {
  gilson: { executor: 'Gilson', prefixo: 'G', apelido: 'Gilson' },
  carlosalberto: { executor: 'Carlos Alberto', prefixo: 'C', apelido: 'Carlos Alberto' },
};

// Medição vigente pelo calendário: julho/2026 = MED 8, agosto = MED 9…
// (a 7ª fechou em junho/26 — âncora confirmada pelo Renan em 05/07)
export const medDoMes = (d = new Date()) =>
  `MED ${8 + (d.getFullYear() - 2026) * 12 + (d.getMonth() - 6)}`;
