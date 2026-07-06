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
}

// referência única da O.S. em TODA tela/planilha: nº oficial > ref da
// equipe (L01/M01) > F-nn legado > sem número
export const refDaOS = (o: Pick<OSCampo, 'numero' | 'fict_ref' | 'numero_fict'>): string =>
  o.numero != null ? String(o.numero)
    : (o.fict_ref || (o.numero_fict ? `F-${o.numero_fict}` : 'S/Nº'));

export const TIPO_OPTIONS = ['Emergencial', 'Corretiva', 'Preventiva'];
export const STATUS_OPTIONS = ['Pendente', 'Executando', 'Concluído', 'Assinatura', 'Material', 'Cancelada'];
export const FISCAL_OPTIONS = ['Wellington', 'Renato', 'Central'];
export const CLASSIF_OPTIONS = ['Emergencial', 'Urgente', 'Normal'];
export const EXECUTOR_OPTIONS = ['Gilson', 'Leandro', 'Miqueias', 'Carlos Alberto', 'Patrick', 'Edison', 'Emiliano', 'Matheus', 'Geilton', 'Nicolas', 'Serviço Externo'];
// só a medição vigente por decisão do Renan (05/07) — valores antigos
// (MED 7 etc.) continuam visíveis ao editar O.S. que já os têm
export const MED_OPTIONS = ['', 'MED 8'];
