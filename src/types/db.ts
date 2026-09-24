// Tipos que espelham o schema do Supabase (ver /supabase/schema.sql).

export type Frequencia = 'semanal' | 'quinzenal'
export type EstadoJardim = 'ok' | 'urgente' | 'atrasado'
export type TipoColaborador = 'patrao' | 'trabalhador'
export type EstadoManutencao =
  | 'agendada'
  | 'em_progresso'
  | 'concluida'
  | 'reagendada'
  | 'cancelada'

export interface Cliente {
  id: string
  nome: string
  contacto: string | null
  notas: string | null
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

export interface Volta {
  id: string
  nome: string
  descricao: string | null
  ativo: boolean
}

export interface Jardim {
  id: string
  cliente_id: string
  volta_id: string | null
  morada_rua: string | null
  morada_cidade: string | null
  morada_codigo_postal: string | null
  frequencia: Frequencia
  ultima_manutencao: string | null
  proxima_manutencao: string | null
  status: EstadoJardim
  tem_plano_rotativo: boolean
  etapa_atual_id: string | null
  notas: string | null
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

export interface EtapaRotativa {
  id: string
  jardim_id: string
  ordem: number
  instrucoes: string | null
}

export interface Veiculo {
  id: string
  nome: string
  matricula: string | null
  marca: string | null
  ativo: boolean
}

export interface Kit {
  id: string
  nome: string
  ativo: boolean
}

export interface KitItem {
  id: string
  kit_id: string
  descricao_material: string
  quantidade: number | null
}

export interface VeiculoKit {
  id: string
  veiculo_id: string
  kit_id: string
}

export interface Colaborador {
  id: string
  user_id: string | null
  nome: string
  email: string
  tipo: TipoColaborador
  telefone: string | null
  ativo: boolean
}

export interface Manutencao {
  id: string
  jardim_id: string
  veiculo_id: string | null
  criado_por: string | null
  data: string
  status: EstadoManutencao
  observacoes_planeamento: string | null
  criado_em: string
  atualizado_em: string
}

export interface ManutencaoColaborador {
  id: string
  manutencao_id: string
  colaborador_id: string
}

export interface ManutencaoMaterialExtra {
  id: string
  manutencao_id: string
  descricao_material: string
  quantidade: number | null
}

export interface MaterialExtraInput {
  id?: string
  descricao_material: string
  quantidade?: number | null
}

export interface Execucao {
  id: string
  manutencao_id: string
  concluido_por: string | null
  observacoes: string | null
  concluido_em: string
  editado_por: string | null
  editado_em: string | null
}

export interface ItemFaturavel {
  id: string
  execucao_id: string
  descricao: string
  quantidade: string | null
  faturado: boolean
  faturado_em: string | null
  criado_em: string
}

// Formas úteis com relações embutidas (via select do Supabase).
export interface JardimComCliente extends Jardim {
  cliente: Pick<Cliente, 'id' | 'nome'> | null
  volta: Pick<Volta, 'id' | 'nome'> | null
}

export interface ClienteComJardins extends Cliente {
  jardins: (Jardim & {
    volta?: Pick<Volta, 'id' | 'nome'> | null
    itensPorFaturarCount?: number
  })[]
}

export interface VeiculoComKits extends Veiculo {
  kits: (Kit & { itens: KitItem[] })[]
}

export interface KitComItensEVeiculos extends Kit {
  itens: KitItem[]
  veiculos: Pick<Veiculo, 'id' | 'nome'>[]
}

export interface VeiculoInput {
  nome: string
  matricula?: string | null
  marca?: string | null
  ativo?: boolean
}

export interface KitItemInput {
  id?: string
  descricao_material: string
  quantidade?: number | null
}

export interface KitInput {
  nome: string
  ativo?: boolean
  itens: KitItemInput[]
}
