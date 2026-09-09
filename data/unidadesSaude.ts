// UNIDADES DE SAÚDE (contrato 005/2026 · SEMUSA Rio das Ostras)
// Trazidas do repo da Saúde em 03/09/2026 — transcrição do "Anexo I —
// Unidades da Secretaria Municipal de Saúde" que o Renan fotografou do
// contrato em 12/08 (32 unidades oficiais + 6 locais fora do anexo onde a
// equipe já atendeu).
//
// Por que estão AQUI, no app da Educação: Emiliano e Gilson atendem os dois
// contratos, e manter dois sistemas separados para a mesma equipe é
// retrabalho. Quando o botão de contrato está em SAÚDE, a digitação rápida
// passa a sugerir estas unidades; em EDUCAÇÃO, as escolas de sempre.
// Objetivo declarado do Renan (03/09): um sistema só para os dois contratos
// e, depois, para Saquarema — no mesmo padrão.
//
// O nº do Anexo I fica no comentário: é a ponte para a medição oficial.
export const UNIDADES_SAUDE = [
  // ---- grandes unidades ----
  'SEMUSA (Sede)',                                        // 32
  'Hospital Municipal Naelma Monteira (HMNM)',            // 21
  'Pronto Socorro Maria Rosa da Conceição',               // 23
  'UPA Valmir Hespanhol',                                 // 31
  'Farmácia Municipal',                                   // 20
  'Resgate 24h',                                          // 24
  // ---- ESF / postos ----
  'ESF Âncora',                                           // 9
  'ESF Cantagalo',                                        // 10
  'ESF Cidade Praiana',                                   // 11
  'ESF Cláudio Ribeiro',                                  // 12
  'Clínica da Família Paulo H. Gussen',                   // 13
  'ESF Dona Edimeia (Edméia)',                            // 14
  'ESF Mar do Norte',                                     // 15
  'ESF Nova Cidade',                                      // 16
  'ESF Operário',                                         // 17
  'ESF Recanto',                                          // 18
  'ESF Rocha Leão',                                       // 19
  // ---- UBS ----
  'UBS Boca da Barra',                                    // 27
  'UBS Jardim Mariléia',                                  // 28
  'UBS Nova Esperança',                                   // 29
  'UBS Nilson Gonçalves Marins',                          // 30
  // ---- centros e especializadas ----
  'Extensão do Bosque (Sal Sal)',                         // 6
  'Ambulatório de Saúde Mental',                          // 1
  'CAPS',                                                 // 2
  'CAPSI Rui Ribeiro de Freitas',                         // 3
  'Centro de Reabilitação Rocha Leão (Cória Gomes)',      // 4
  'Centro de Reabilitação Laércio Lúcio de Carvalho',     // 5
  'NASCA (Saúde da Criança e Adolescente)',               // 22
  'Residência Terapêutica I',                             // 25
  'Residência Terapêutica II',                            // 26
  // ---- administrativas ----
  'COGA (Gestão Auditoria)',                              // 7
  'DESGE',                                                // 8
  // ---- fora do Anexo I: a equipe já reportou serviço nesses locais ----
  'Galpão Recanto',
  'Prefeitura',
  'Caminhão Catarata / Tenda (eventos)',
  'Pré-Operatório',
  'Casa de Recuperação',
  'Casa da Criança',
];

// FISCAIS DA SEMUSA por unidade (regra do Renan 03/09):
//   · postos de saúde (ESF / UBS / Clínica da Família) → FERNANDO
//   · SEMUSA sede                                       → ELISANGELA
//   · todo o restante (hospital, UPA, PS, CAPS, centros,
//     residências, administrativas, locais fora do anexo) → CUNHA
// Mesma ideia da zona por fiscal da Educação: a equipe digita a unidade e
// o fiscal já vem preenchido, sem depender de decorar quem é de quem.
export const fiscalDaUnidadeSaude = (unidade: string): string => {
  const u = (unidade || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (!u.trim()) return 'Cunha';
  if (/\bsemusa\b/.test(u)) return 'Elisangela';
  // posto = ESF, UBS ou Clínica da Família (as três formas que a rede usa)
  if (/\besf\b|\bubs\b|clinica da familia|\bposto\b/.test(u)) return 'Fernando';
  return 'Cunha';
};

// CONTRATO PELA UNIDADE (v91 — pedido do Renan 09/09): o João é um só e
// atende os dois contratos; quando ele dá baixa de material, o sistema é
// que tem de saber se aquilo saiu para a Educação ou para a Saúde. Sem
// isso, o consumo dos dois vira um bolo só e não há como prestar contas
// separadas — nem defender a medição de cada contrato.
//
// Reconhece a unidade escrita de qualquer jeito: nome oficial do Anexo I,
// apelido do campo ("posto do recanto") ou sigla. Na dúvida devolve
// 'Educação', que é o contrato de origem do almoxarifado.
// ATENÇÃO: estes são testados com `includes`, então NÃO pode entrar aqui
// sigla curta que caiba dentro de outra palavra — 'esf' casaria com
// "desfazer" e classificaria uma parede como unidade de saúde. Sigla curta
// vai na regra de palavra inteira, logo abaixo.
const CHAVES_SAUDE = [
  'semusa', 'semus', 'hospital', 'hmnm', 'naelma', 'pronto socorro',
  'valmir hespanhol', 'farmacia municipal', 'resgate 24',
  'posto de saude', 'clinica da familia',
  'capsi', 'ambulatorio', 'saude mental',
  'reabilitacao', 'nasca', 'residencia terapeutica',
  'catarata', 'pre-operatorio', 'pre operatorio', 'casa de recuperacao',
  'vigilancia ambiental', 'lactario',
];
// siglas e palavras curtas: só valem inteiras
const PALAVRAS_SAUDE = /\besf\b|\bubs\b|\bupa\b|\bcaps\b|\bposto\b|\bsaude\b|\bcoga\b|\bdesge\b/;
// Nomes que estão na lista da Saúde mas NÃO são exclusivos dela: a
// Prefeitura tem 66 saídas do almoxarifado da Educação, e "Casa da
// Criança"/"Galpão Recanto" são atendidos pelos dois. Estes ficam de fora
// do casamento automático — quem lança decide.
const AMBIGUAS = ['prefeitura', 'galpao recanto', 'casa da crianca'];
export const contratoDaUnidade = (unidade: string): 'Educação' | 'Saúde' => {
  const u = (unidade || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  if (!u) return 'Educação';
  if (AMBIGUAS.includes(u)) return 'Educação';
  // nome exato do Anexo I resolve sem heurística
  const exato = UNIDADES_SAUDE.some(n =>
    n.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') === u);
  if (exato) return 'Saúde';
  if (PALAVRAS_SAUDE.test(u)) return 'Saúde';
  return CHAVES_SAUDE.some(c => u.includes(c)) ? 'Saúde' : 'Educação';
};

// locais DENTRO da unidade de saúde (o "Local" da legenda) — a sala de
// vacina não existe em escola, e a sala de aula não existe em posto
export const LOCAIS_SAUDE = [
  'Recepção', 'Consultório', 'Sala de vacina', 'Sala de curativo',
  'Sala de coleta', 'Sala de medicação', 'Farmácia', 'Enfermaria',
  'Odontologia', 'Esterilização', 'Cozinha', 'Copa', 'Banheiro',
  'Almoxarifado', 'Corredor', 'Sala de espera', 'Área externa',
  'Telhado', 'Caixa d\'água',
];
