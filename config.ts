// =============================================================
// CONFIGURAÇÃO OPERACIONAL — o que muda de semana em semana
// fica aqui, num lugar só.
// =============================================================

// Voz DESLIGADA nesta semana (decisão Renan 05/07/2026): a entrada
// de O.S. é pelo FORMULÁRIO. O código do Chat/transcrição continua
// no repo intacto — religar = trocar para true.
export const VOZ_ATIVA = false;

// Nicolas saiu em 01/09 (conta bloqueada); Marcio Junior assumiu a assistência
export const GESTORES = ['lucas', 'rafael', 'marcio', 'renan', 'edmar'];

// João só enxerga o Almoxarifado — ele é o responsável pelo estoque,
// não lança O.S. (gestão também vê a aba p/ acompanhar)
export const ALMOX = ['joao'];

// Equipes de emergência: o login é da EQUIPE — o fiscal da zona já
// vem preenchido e o executor se escolhe entre os membros em 1 toque.
// A visão "Minhas O.S." da equipe é POR FISCAL responsável (decisão
// Renan 05/07): equipe 1 vê as emergenciais do Renato, equipe 2 as
// do Wellington — não por executor.
// prefixo = numeração da equipe (decisão Renan 05/07 à noite): O.S. sem
// nº oficial nasce L01, L02… (Leandro) / M01, M02… (equipe 2), gerada
// pelo sistema — nunca colide com nº de e-mail nem com F-nn do legado.
// CORREÇÃO Renan 06/07 (teste real): Leandro é a equipe do fiscal
// WELLINGTON e a equipe 2 a do RENATO (estava invertido). Logins e senhas
// não mudam — só a zona que cada equipe enxerga.
// TROCA Renan 07/07: Miqueias SAIU da emergencia2; entrou o eletricista
// RENATO como encarregado (não confundir com o fiscal Renato, que é da
// prefeitura e por coincidência tem o mesmo nome).
// CORREÇÃO Renan 01/09: o M era do MIQUEIAS e ficou herdado por engano —
// a equipe do Renato passa a numerar R01, R02… As O.S. M-nn já existentes
// NÃO mudam: o material do almoxarifado está amarrado nessas referências
// (renomear em massa quebraria o vínculo material↔O.S.).
export interface Equipe { fiscal: string; membros: string[]; prefixo: string; apelido: string; }
export const EQUIPES: Record<string, Equipe> = {
  emergencia1: { fiscal: 'Wellington', membros: ['Wellington', 'Leandro'], prefixo: 'L', apelido: 'Equipe Leandro' },
  emergencia2: { fiscal: 'Renato', membros: ['Renato', 'Patrick'], prefixo: 'R', apelido: 'Equipe Renato' },
};

// Encarregados da CORRETIVA: painel próprio (igual ao emergencial, mas
// filtrado pelo EXECUTOR) e numeração própria (G01 Gilson / C01 Carlos)
export interface Corretiva { executor: string; prefixo: string; apelido: string; }
export const CORRETIVA: Record<string, Corretiva> = {
  gilson: { executor: 'Gilson', prefixo: 'G', apelido: 'Gilson' },
  carlosalberto: { executor: 'Carlos Alberto', prefixo: 'C', apelido: 'Carlos Alberto' },
  // Emiliano (01/09): encarregado geral, atende Educação e Saúde e assumiu a
  // frente do Carlos Alberto. O login do Carlos CONTINUA ativo — decisão do
  // Renan: ainda precisamos coletar as informações que estão com ele.
  emiliano: { executor: 'Emiliano', prefixo: 'E', apelido: 'Emiliano' },
};

// LOGIN EM 2 TOQUES (pedido Renan 07/07: "muita recusa" ao digitar o
// e-mail no celular): a tela de login lista esses nomes — tocar no nome
// preenche o e-mail e só a SENHA é digitada. Usuário novo? adiciona aqui.
export interface Acesso { rotulo: string; email: string; dica: string; emoji: string; grupo: 'campo' | 'gestao'; }
export const ACESSOS: Acesso[] = [
  { rotulo: 'Equipe Leandro', email: 'emergencia1@fpv.app', dica: 'emergência · zona Wellington', emoji: '🚨', grupo: 'campo' },
  { rotulo: 'Equipe Renato', email: 'emergencia2@fpv.app', dica: 'emergência · zona Renato', emoji: '🚨', grupo: 'campo' },
  { rotulo: 'Gilson', email: 'gilson@fpv.app', dica: 'corretiva', emoji: '🔧', grupo: 'campo' },
  { rotulo: 'Carlos Alberto', email: 'carlosalberto@fpv.app', dica: 'corretiva', emoji: '🔧', grupo: 'campo' },
  { rotulo: 'Emiliano', email: 'emiliano@fpv.app', dica: 'encarregado geral', emoji: '🔧', grupo: 'campo' },
  { rotulo: 'João', email: 'joao@fpv.app', dica: 'almoxarifado', emoji: '📦', grupo: 'campo' },
  // Nicolas saiu da operação (01/09) — conta bloqueada e fora das listas;
  // o histórico dele continua no banco (regra dura nº 11). Marcio Junior
  // entrou no lugar, com login e numeração próprios.
  { rotulo: 'Marcio Junior', email: 'marcio@fpv.app', dica: 'assistente · engenharia', emoji: '👷', grupo: 'gestao' },
  { rotulo: 'Renan', email: 'renan@fpv.app', dica: 'gestão', emoji: '📊', grupo: 'gestao' },
  { rotulo: 'Lucas', email: 'lucas@fpv.app', dica: 'gestor geral', emoji: '📊', grupo: 'gestao' },
  { rotulo: 'Rafael', email: 'rafael@fpv.app', dica: 'gestão', emoji: '📊', grupo: 'gestao' },
  { rotulo: 'Edmar', email: 'edmar@fpv.app', dica: 'medição', emoji: '📐', grupo: 'gestao' },
  { rotulo: 'Brendah', email: 'brendah@fpv.app', dica: 'cadastros · esteira', emoji: '📋', grupo: 'gestao' },
];

// DESIGNAÇÃO EM 1 TOQUE (pedido Renan 07/07): a gestão escolhe quem toca
// a O.S. direto no card da lista; junto do P1-P3, isso joga a O.S. na
// "Prioridade agora" do painel do encarregado (corretiva filtra por
// EXECUTOR; emergencial já entra pela ZONA do fiscal — o P manda pro topo).
// zap = WhatsApp com DDI+DDD, só dígitos (ex.: '5522999998888'); enquanto
// vazio, o botão "📲 Avisar" fica escondido para aquele destino.
export interface Designado { rotulo: string; executor: string; zap: string; }
export const DESIGNADOS: Designado[] = [
  { rotulo: 'Gilson', executor: 'Gilson', zap: '5522998952800' },
  { rotulo: 'Carlos Alberto', executor: 'Carlos Alberto', zap: '5522998294178' },
  { rotulo: 'Eq. Leandro', executor: 'Leandro', zap: '5522992455522' },
  { rotulo: 'Eq. Renato', executor: 'Renato', zap: '5522998888452' },
];

// Medição vigente pelo calendário: julho/2026 = MED 8, agosto = MED 9…
// (a 7ª fechou em junho/26 — âncora confirmada pelo Renan em 05/07)
export const medDoMes = (d = new Date()) =>
  `MED ${8 + (d.getFullYear() - 2026) * 12 + (d.getMonth() - 6)}`;

// Data de HOJE no fuso do CELULAR (Brasília) — nunca usar toISOString()
// para data: ele devolve UTC (3h à frente) e depois das 21h carimbaria
// a data de AMANHÃ na saída/O.S. (achado do Renan, 06/07)
export const hojeLocal = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
