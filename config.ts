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
// vem preenchido e o executor se escolhe entre os membros em 1 toque
export interface Equipe { fiscal: string; membros: string[]; }
export const EQUIPES: Record<string, Equipe> = {
  emergencia1: { fiscal: 'Renato', membros: ['Renato', 'Leandro', 'Caleb'] },
  emergencia2: { fiscal: 'Wellington', membros: ['Wellington', 'Miqueias', 'Patrick'] },
};

// Medição vigente pelo calendário: julho/2026 = MED 8, agosto = MED 9…
// (a 7ª fechou em junho/26 — âncora confirmada pelo Renan em 05/07)
export const medDoMes = (d = new Date()) =>
  `MED ${8 + (d.getFullYear() - 2026) * 12 + (d.getMonth() - 6)}`;
