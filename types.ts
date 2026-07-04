export interface OSCampo {
  id?: number;
  numero: number | null;
  numero_fict?: number | null;
  emergencial: boolean;
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
}

export const STATUS_OPTIONS = ['Pendente', 'Executando', 'Concluído', 'Assinatura', 'Material', 'Cancelada'];
export const FISCAL_OPTIONS = ['Wellington', 'Renato', 'Central'];
export const CLASSIF_OPTIONS = ['Emergencial', 'Urgente', 'Normal', 'I', 'II', 'III'];
export const EXECUTOR_OPTIONS = ['Gilson', 'Leandro', 'Miqueias', 'Carlos Alberto', 'Edison', 'Emiliano', 'Matheus', 'Geilton', 'Nicolas', 'Serviço Externo'];
export const MED_OPTIONS = ['', 'MED 7', 'MED 8'];
