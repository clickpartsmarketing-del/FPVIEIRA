export interface OSCampo {
  id?: number;
  numero: number | null;
  numero_fict?: number | null; // legado F-77/F-78 (sequência global antiga)
  fict_ref?: string | null;    // numeração POR EQUIPE: L01, L02… / M01, M02…
  emergencial: boolean;
  tipo?: string | null; // Emergencial | Corretiva | Preventiva (spec Renan 06/07)
  unidade: string;
  fiscal: string;
  classificacao: string;
  entrada: string | null;
  conclusao: string | null;
  executor: string;
  status: string;
  medicao: string;
  area?: string | null;
  solicitado?: string;
  servico: string;
  materiais: string;
  memoria_calculo: string;
  foto_urls: string[];
  criado_em?: string;
  assinado?: boolean;
  excluida?: boolean; // marca de exclusão — número preservado, log no banco
  prioridade?: number | null;     // 1..3 — definida pela gestão (RV000)
  par_sugerido?: string | null;   // matchmaking fictícia↔oficial (n8n)
  oficializada_em?: string | null;
}

// referência única da O.S. em TODA tela/planilha: nº oficial > ref da
// equipe (L01/M01) > F-nn legado > sem número
export const refDaOS = (o: Pick<OSCampo, 'numero' | 'fict_ref' | 'numero_fict'>): string =>
  o.numero != null ? String(o.numero)
    : (o.fict_ref || (o.numero_fict ? `F-${o.numero_fict}` : 'S/Nº'));

export const TIPO_OPTIONS = ['Emergencial', 'Corretiva', 'Preventiva'];
// 'Avaliando' entrou pelo RV000 do engenheiro (funil: pendente →
// executando → assinatura → avaliando → concluída)
export const STATUS_OPTIONS = ['Pendente', 'Executando', 'Assinatura', 'Avaliando', 'Concluído', 'Material', 'Cancelada'];
export const FISCAL_OPTIONS = ['Wellington', 'Renato', 'Central'];
export const CLASSIF_OPTIONS = ['Emergencial', 'Urgente', 'Normal'];
// REGRA (Renan 07/07): quem sai da operação SAI desta lista — o histórico
// mora só no banco (os_campo.executor guarda o nome como texto; a busca
// retroativa consulta os registros, não as opções). Miqueias saiu 07/07.
export const EXECUTOR_OPTIONS = ['Gilson', 'Leandro', 'Carlos Alberto', 'Renato', 'Patrick', 'Edison', 'Emiliano', 'Matheus', 'Geilton', 'Nicolas', 'Serviço Externo'];
// só a medição vigente por decisão do Renan (05/07) — valores antigos
// (MED 7 etc.) continuam visíveis ao editar O.S. que já os têm
export const MED_OPTIONS = ['', 'MED 8'];
