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

// locais DENTRO da unidade de saúde (o "Local" da legenda) — a sala de
// vacina não existe em escola, e a sala de aula não existe em posto
export const LOCAIS_SAUDE = [
  'Recepção', 'Consultório', 'Sala de vacina', 'Sala de curativo',
  'Sala de coleta', 'Sala de medicação', 'Farmácia', 'Enfermaria',
  'Odontologia', 'Esterilização', 'Cozinha', 'Copa', 'Banheiro',
  'Almoxarifado', 'Corredor', 'Sala de espera', 'Área externa',
  'Telhado', 'Caixa d\'água',
];
