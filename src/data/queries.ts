import { supabase } from '../lib/supabase'
import type {
  ClienteComJardins,
  Colaborador,
  EstadoManutencao,
  EtapaRotativa,
  Execucao,
  ItemFaturavel,
  Jardim,
  JardimComCliente,
  Kit,
  KitComItensEVeiculos,
  KitInput,
  KitItem,
  Manutencao,
  ManutencaoMaterialExtra,
  MaterialExtraInput,
  Veiculo,
  VeiculoComKits,
  VeiculoInput,
  Volta,
} from '../types/db'

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export interface MaterialExtraDoDia {
  id: string
  descricao_material: string
  quantidade: number | null
  jardimNome: string
  manutencaoId: string
}

export interface CargaCarrinhaDia {
  veiculoId: string
  veiculoNome: string
  equipaNomes: string[]
  colaboradorIds: string[]
  kits: (Kit & { itens: KitItem[] })[]
  materiaisExtra: MaterialExtraDoDia[]
  trabalhosCount: number
}

export interface DashboardData {
  jardinsAtivos: number
  atrasadas: number
  materiaisPorFaturar: number
  proximas: JardimComCliente[]
  trabalhosHoje: (Manutencao & {
    jardim: { id: string; morada_rua: string | null; cliente: { nome: string } | null } | null
    veiculo: { id: string; nome: string } | null
  })[]
  cargasDoDia: CargaCarrinhaDia[]
}

export async function recalcularStatusJardins(): Promise<void> {
  try {
    await supabase.rpc('recalcular_status_jardins')
  } catch {
    // Ignora se a função ainda não tiver sido criada no Supabase
  }
}

export async function getDashboard(): Promise<DashboardData> {
  // Garante que o status de todos os jardins ativos está atualizado para a data de hoje
  await recalcularStatusJardins()

  const [jardinsRes, atrasadasRes, faturarRes, proximasRes, hojeRes] = await Promise.all([
    supabase.from('jardim').select('*', { count: 'exact', head: true }).eq('ativo', true),
    supabase
      .from('jardim')
      .select('*', { count: 'exact', head: true })
      .eq('ativo', true)
      .eq('status', 'atrasado'),
    supabase
      .from('item_faturavel')
      .select('*', { count: 'exact', head: true })
      .eq('faturado', false),
    supabase
      .from('jardim')
      .select('*, cliente:cliente(id,nome), volta:volta(id,nome)')
      .eq('ativo', true)
      .order('proxima_manutencao', { ascending: true })
      .limit(6),
    supabase
      .from('manutencao')
      .select(`
        *,
        jardim:jardim(id, morada_rua, morada_cidade, cliente:cliente(nome)),
        veiculo:veiculo(
          id, nome,
          veiculo_kit (
            kit (
              id, nome, ativo,
              itens:kit_item (id, kit_id, descricao_material, quantidade)
            )
          )
        ),
        equipa:manutencao_colaborador(colaborador_id, colaborador:colaborador(id, nome)),
        materiais_extra:manutencao_material_extra(id, manutencao_id, descricao_material, quantidade)
      `)
      .eq('data', hojeISO())
      .order('criado_em', { ascending: true }),
  ])

  const err =
    jardinsRes.error ||
    atrasadasRes.error ||
    faturarRes.error ||
    proximasRes.error ||
    hojeRes.error
  if (err) throw err

  const rawHoje = (hojeRes.data ?? []) as any[]
  const mapaCarrinhas = new Map<string, CargaCarrinhaDia>()

  for (const m of rawHoje) {
    const v = m.veiculo
    const vId = v?.id ?? '__sem_veiculo'
    const vNome = v?.nome ?? 'Sem carrinha atribuída'

    if (!mapaCarrinhas.has(vId)) {
      const kits = v
        ? (v.veiculo_kit ?? [])
            .map((vk: any) => vk.kit)
            .filter((k: any) => k && k.ativo !== false)
            .map((k: any) => ({
              ...k,
              itens: (k.itens ?? []).sort((a: any, b: any) =>
                a.descricao_material.localeCompare(b.descricao_material, 'pt'),
              ),
            }))
        : []

      mapaCarrinhas.set(vId, {
        veiculoId: vId,
        veiculoNome: vNome,
        equipaNomes: [],
        colaboradorIds: [],
        kits,
        materiaisExtra: [],
        trabalhosCount: 0,
      })
    }

    const cEntry = mapaCarrinhas.get(vId)!
    cEntry.trabalhosCount += 1

    for (const eq of m.equipa ?? []) {
      const cId = eq.colaborador_id
      const cNome = eq.colaborador?.nome
      if (cId && !cEntry.colaboradorIds.includes(cId)) {
        cEntry.colaboradorIds.push(cId)
      }
      if (cNome && !cEntry.equipaNomes.includes(cNome)) {
        cEntry.equipaNomes.push(cNome)
      }
    }

    const cliNome = m.jardim?.cliente?.nome ?? 'Jardim'
    for (const me of m.materiais_extra ?? []) {
      cEntry.materiaisExtra.push({
        id: me.id,
        descricao_material: me.descricao_material,
        quantidade: me.quantidade,
        jardimNome: cliNome,
        manutencaoId: m.id,
      })
    }
  }

  const cargasDoDia = Array.from(mapaCarrinhas.values())

  return {
    jardinsAtivos: jardinsRes.count ?? 0,
    atrasadas: atrasadasRes.count ?? 0,
    materiaisPorFaturar: faturarRes.count ?? 0,
    proximas: (proximasRes.data ?? []) as unknown as JardimComCliente[],
    trabalhosHoje: rawHoje as unknown as DashboardData['trabalhosHoje'],
    cargasDoDia,
  }
}

export async function getClientes(): Promise<ClienteComJardins[]> {
  const [clientesRes, itensPendentesRes] = await Promise.all([
    supabase
      .from('cliente')
      .select('*, jardins:jardim(*, volta:volta(id, nome))')
      .eq('ativo', true)
      .order('nome', { ascending: true }),
    supabase
      .from('item_faturavel')
      .select('id, execucao:execucao!inner(manutencao:manutencao!inner(jardim_id))')
      .eq('faturado', false),
  ])

  if (clientesRes.error) throw clientesRes.error

  const contagem = new Map<string, number>()
  if (itensPendentesRes.data) {
    for (const item of itensPendentesRes.data as any[]) {
      const jId = item.execucao?.manutencao?.jardim_id
      if (jId) {
        contagem.set(jId, (contagem.get(jId) ?? 0) + 1)
      }
    }
  }

  const clientes = (clientesRes.data ?? []).map((c: any) => ({
    ...c,
    jardins: (c.jardins ?? []).map((j: any) => ({
      ...j,
      itensPorFaturarCount: contagem.get(j.id) ?? 0,
    })),
  }))

  return clientes as unknown as ClienteComJardins[]
}

export interface ItemFaturavelComData extends ItemFaturavel {
  data_utilizacao: string | null
  manutencao_id: string | null
}

export interface HistoricoItem extends Execucao {
  manutencao: {
    id: string
    data: string
    jardim_id: string
    veiculo?: { id: string; nome: string } | null
    equipa?: {
      colaborador_id?: string
      colaborador: { id: string; nome: string } | null
    }[]
  } | null
  concluido_por_colaborador?: { id: string; nome: string } | null
  itens: ItemFaturavel[]
}

export interface JardimDetalhe {
  jardim: JardimComCliente
  etapas: EtapaRotativa[]
  itensFaturaveis: ItemFaturavelComData[]
  historico: HistoricoItem[]
}

export async function getJardim(id: string): Promise<JardimDetalhe> {
  const [jardimRes, etapasRes, histRes, itensRes] = await Promise.all([
    supabase
      .from('jardim')
      .select('*, cliente:cliente(id,nome), volta:volta(id,nome)')
      .eq('id', id)
      .single(),
    supabase
      .from('etapa_rotativa')
      .select('*')
      .eq('jardim_id', id)
      .order('ordem', { ascending: true }),
    supabase
      .from('execucao')
      .select(`
        *,
        manutencao:manutencao!inner(
          id, data, jardim_id,
          veiculo:veiculo(id, nome),
          equipa:manutencao_colaborador(
            colaborador_id,
            colaborador:colaborador(id, nome)
          )
        ),
        concluido_por_colaborador:colaborador!concluido_por(id, nome),
        itens:item_faturavel(*)
      `)
      .eq('manutencao.jardim_id', id)
      .order('concluido_em', { ascending: false })
      .limit(10),
    supabase
      .from('item_faturavel')
      .select(`
        *,
        execucao:execucao!inner(
          id,
          concluido_em,
          manutencao:manutencao!inner(id, data, jardim_id)
        )
      `)
      .eq('execucao.manutencao.jardim_id', id)
      .order('faturado', { ascending: true })
      .order('criado_em', { ascending: false }),
  ])
  if (jardimRes.error) throw jardimRes.error
  if (etapasRes.error) throw etapasRes.error
  if (histRes.error) throw histRes.error
  if (itensRes.error) throw itensRes.error

  const itensFormatados: ItemFaturavelComData[] = (itensRes.data ?? []).map((it: any) => ({
    id: it.id,
    execucao_id: it.execucao_id,
    descricao: it.descricao,
    quantidade: it.quantidade,
    faturado: it.faturado,
    faturado_em: it.faturado_em,
    criado_em: it.criado_em,
    data_utilizacao:
      it.execucao?.manutencao?.data ??
      (it.execucao?.concluido_em ? it.execucao.concluido_em.slice(0, 10) : null),
    manutencao_id: it.execucao?.manutencao?.id ?? null,
  }))

  return {
    jardim: jardimRes.data as unknown as JardimComCliente,
    etapas: (etapasRes.data ?? []) as EtapaRotativa[],
    itensFaturaveis: itensFormatados,
    historico: (histRes.data ?? []) as unknown as JardimDetalhe['historico'],
  }
}

export function moradaCurta(j: Pick<Jardim, 'morada_rua' | 'morada_cidade'>): string {
  return [j.morada_rua, j.morada_cidade].filter(Boolean).join(' · ') || '—'
}

// ---------- Planeamento ----------

export interface ManutencaoSemana {
  id: string
  jardim_id: string
  veiculo_id: string | null
  data: string
  status: EstadoManutencao
  observacoes_planeamento: string | null
  jardim: {
    id: string
    morada_rua: string | null
    morada_cidade: string | null
    cliente: { nome: string } | null
    volta: { id: string; nome: string } | null
  } | null
  veiculo: { id: string; nome: string } | null
  equipa: { colaborador_id: string; colaborador: { id: string; nome: string } | null }[]
  materiais_extra?: ManutencaoMaterialExtra[]
}

/** Manutenções entre duas datas (inclusive), com jardim, veículo, equipa e materiais extra. */
export async function getManutencoes(
  inicioISO: string,
  fimISO: string,
): Promise<ManutencaoSemana[]> {
  const { data, error } = await supabase
    .from('manutencao')
    .select(
      '*, jardim:jardim(id, morada_rua, morada_cidade, cliente:cliente(nome), volta:volta(id, nome)), veiculo:veiculo(id, nome), equipa:manutencao_colaborador(colaborador_id, colaborador:colaborador(id, nome)), materiais_extra:manutencao_material_extra(id, manutencao_id, descricao_material, quantidade)',
    )
    .gte('data', inicioISO)
    .lte('data', fimISO)
    .order('data', { ascending: true })
  if (error) throw error
  return (data ?? []) as unknown as ManutencaoSemana[]
}

export interface OpcaoJardim {
  id: string
  nome: string
  morada_rua: string | null
  cliente_nome: string
  volta_id: string | null
  volta_nome: string | null
}

export interface OpcaoVolta {
  id: string
  nome: string
  totalJardins: number
}

export interface OpcoesAgendamento {
  jardins: OpcaoJardim[]
  voltas: OpcaoVolta[]
  veiculos: VeiculoComKits[]
  trabalhadores: Colaborador[]
}

/** Opções para o formulário de agendamento de manutenção (inclui kits por veículo). */
export async function getOpcoesAgendamento(): Promise<OpcoesAgendamento> {
  const [jardinsRes, veiculosRes, colabRes, voltasRes] = await Promise.all([
    supabase
      .from('jardim')
      .select('id, morada_rua, volta_id, cliente:cliente(nome), volta:volta(id, nome)')
      .eq('ativo', true),
    supabase
      .from('veiculo')
      .select(`
        *,
        veiculo_kit (
          kit_id,
          kit (
            id,
            nome,
            ativo,
            itens:kit_item (
              id,
              kit_id,
              descricao_material,
              quantidade
            )
          )
        )
      `)
      .eq('ativo', true)
      .order('nome'),
    supabase.from('colaborador').select('*').eq('ativo', true).order('nome'),
    supabase.from('volta').select('id, nome').order('nome'),
  ])
  if (jardinsRes.error) throw jardinsRes.error
  if (veiculosRes.error) throw veiculosRes.error
  if (colabRes.error) throw colabRes.error
  if (voltasRes.error) throw voltasRes.error

  const jardins: OpcaoJardim[] = (
    (jardinsRes.data ?? []) as unknown as {
      id: string
      morada_rua: string | null
      volta_id: string | null
      cliente: { nome: string } | null
      volta: { id: string; nome: string } | null
    }[]
  )
    .map((j) => {
      const cNome = j.cliente?.nome ?? 'Cliente'
      return {
        id: j.id,
        nome: [cNome, j.morada_rua].filter(Boolean).join(' — '),
        morada_rua: j.morada_rua,
        cliente_nome: cNome,
        volta_id: j.volta_id,
        volta_nome: j.volta?.nome ?? null,
      }
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt'))

  const contagens = new Map<string, number>()
  for (const j of jardins) {
    if (j.volta_id) {
      contagens.set(j.volta_id, (contagens.get(j.volta_id) ?? 0) + 1)
    }
  }

  const voltas: OpcaoVolta[] = (
    (voltasRes.data ?? []) as { id: string; nome: string }[]
  ).map((v) => ({
    id: v.id,
    nome: v.nome,
    totalJardins: contagens.get(v.id) ?? 0,
  }))

  const rawVeiculos = (veiculosRes.data ?? []) as any[]
  const veiculos: VeiculoComKits[] = rawVeiculos.map((v) => {
    const kits = (v.veiculo_kit ?? [])
      .map((vk: any) => vk.kit)
      .filter((k: any) => k && k.ativo !== false)
      .map((k: any) => ({
        ...k,
        itens: (k.itens ?? []).sort((a: any, b: any) =>
          a.descricao_material.localeCompare(b.descricao_material, 'pt'),
        ),
      }))

    return {
      id: v.id,
      nome: v.nome,
      matricula: v.matricula,
      marca: v.marca,
      ativo: v.ativo,
      kits,
    }
  })

  return {
    jardins,
    voltas,
    veiculos,
    trabalhadores: (colabRes.data ?? []) as Colaborador[],
  }
}

export interface NovaManutencao {
  jardim_id: string
  data: string
  veiculo_id: string | null
  criado_por: string | null
  observacoes_planeamento: string | null
  colaboradorIds: string[]
  materiaisExtra?: MaterialExtraInput[]
}

/** Cria uma manutenção, associa a equipa e regista materiais extra a levar. */
export async function criarManutencao(input: NovaManutencao): Promise<void> {
  const { data, error } = await supabase
    .from('manutencao')
    .insert({
      jardim_id: input.jardim_id,
      data: input.data,
      veiculo_id: input.veiculo_id,
      criado_por: input.criado_por,
      observacoes_planeamento: input.observacoes_planeamento,
      status: 'agendada',
    })
    .select('id')
    .single()
  if (error) throw error

  const manutencaoId = (data as { id: string }).id

  if (input.colaboradorIds.length > 0) {
    const rows = input.colaboradorIds.map((cid) => ({
      manutencao_id: manutencaoId,
      colaborador_id: cid,
    }))
    const { error: e2 } = await supabase.from('manutencao_colaborador').insert(rows)
    if (e2) throw e2
  }

  if (input.materiaisExtra && input.materiaisExtra.length > 0) {
    const rowsExtra = input.materiaisExtra
      .filter((m) => m.descricao_material && m.descricao_material.trim().length > 0)
      .map((m) => ({
        manutencao_id: manutencaoId,
        descricao_material: m.descricao_material.trim(),
        quantidade:
          m.quantidade !== undefined && m.quantidade !== null && !isNaN(Number(m.quantidade))
            ? Number(m.quantidade)
            : null,
      }))

    if (rowsExtra.length > 0) {
      const { error: eExtra } = await supabase.from('manutencao_material_extra').insert(rowsExtra)
      if (eExtra) throw eExtra
    }
  }
}

/** Atualiza a data de uma manutenção (ex.: ao arrastar ou remarcar). */
export async function atualizarDataManutencao(id: string, novaData: string): Promise<void> {
  const { data: atual, error: errBusca } = await supabase
    .from('manutencao')
    .select('data, status')
    .eq('id', id)
    .single()

  if (errBusca) throw errBusca

  // Ao remarcar, não há distinção de reagendada: mantém agendada (e converte se vinha como reagendada)
  const novoStatus = atual.status === 'reagendada' ? 'agendada' : atual.status

  const { error } = await supabase
    .from('manutencao')
    .update({ data: novaData, status: novoStatus })
    .eq('id', id)

  if (error) throw error
}

export interface EdicaoManutencao {
  data?: string
  veiculo_id?: string | null
  status?: EstadoManutencao
  observacoes_planeamento?: string | null
  colaboradorIds?: string[]
  materiaisExtra?: MaterialExtraInput[]
}

/** Atualiza os dados de uma manutenção e sincroniza a equipa e materiais extra. */
export async function atualizarManutencao(id: string, input: EdicaoManutencao): Promise<void> {
  const camposManutencao: Record<string, unknown> = {}
  if (input.data !== undefined) camposManutencao.data = input.data
  if (input.veiculo_id !== undefined) camposManutencao.veiculo_id = input.veiculo_id
  if (input.status !== undefined) camposManutencao.status = input.status
  if (input.observacoes_planeamento !== undefined)
    camposManutencao.observacoes_planeamento = input.observacoes_planeamento

  if (Object.keys(camposManutencao).length > 0) {
    const { error } = await supabase.from('manutencao').update(camposManutencao).eq('id', id)
    if (error) throw error
  }

  if (input.colaboradorIds !== undefined) {
    const { error: errDel } = await supabase
      .from('manutencao_colaborador')
      .delete()
      .eq('manutencao_id', id)
    if (errDel) throw errDel

    if (input.colaboradorIds.length > 0) {
      const rows = input.colaboradorIds.map((cid) => ({
        manutencao_id: id,
        colaborador_id: cid,
      }))
      const { error: errIns } = await supabase.from('manutencao_colaborador').insert(rows)
      if (errIns) throw errIns
    }
  }

  if (input.materiaisExtra !== undefined) {
    const { error: errDelExtra } = await supabase
      .from('manutencao_material_extra')
      .delete()
      .eq('manutencao_id', id)
    if (errDelExtra) throw errDelExtra

    const rowsExtra = input.materiaisExtra
      .filter((m) => m.descricao_material && m.descricao_material.trim().length > 0)
      .map((m) => ({
        manutencao_id: id,
        descricao_material: m.descricao_material.trim(),
        quantidade:
          m.quantidade !== undefined && m.quantidade !== null && !isNaN(Number(m.quantidade))
            ? Number(m.quantidade)
            : null,
      }))

    if (rowsExtra.length > 0) {
      const { error: errInsExtra } = await supabase
        .from('manutencao_material_extra')
        .insert(rowsExtra)
      if (errInsExtra) throw errInsExtra
    }
  }
}

/** Elimina permanentemente uma manutenção. */
export async function eliminarManutencao(id: string): Promise<void> {
  const { error } = await supabase.from('manutencao').delete().eq('id', id)
  if (error) throw error
}

// ---------- Execução e Materiais a Faturar ----------

export interface DetalhesExecucao {
  manutencao: {
    id: string
    data: string
    status: EstadoManutencao
    observacoes_planeamento: string | null
    jardim: {
      id: string
      morada_rua: string | null
      morada_cidade: string | null
      frequencia: string
      tem_plano_rotativo: boolean
      cliente: { id: string; nome: string; contacto: string | null } | null
      etapa_atual: { id: string; ordem: number; instrucoes: string | null } | null
    } | null
    veiculo: (Pick<Veiculo, 'id' | 'nome'> & {
      kits: (Kit & { itens: KitItem[] })[]
    }) | null
    equipa: { colaborador: { id: string; nome: string } | null }[]
    materiais_extra: ManutencaoMaterialExtra[]
  }
  execucao: {
    id: string
    observacoes: string | null
    concluido_por: string | null
    concluido_por_nome: string | null
    concluido_em: string
  } | null
  itens: {
    id: string
    descricao: string
    quantidade: string | null
    faturado: boolean
    faturado_em: string | null
  }[]
}

export async function getDadosExecucao(manutencaoId: string): Promise<DetalhesExecucao> {
  const [manRes, execRes] = await Promise.all([
    supabase
      .from('manutencao')
      .select(`
        id, data, status, observacoes_planeamento,
        jardim:jardim(
          id, morada_rua, morada_cidade, frequencia, tem_plano_rotativo,
          cliente:cliente(id, nome, contacto),
          etapa_atual:etapa_rotativa!fk_jardim_etapa_atual(id, ordem, instrucoes)
        ),
        veiculo:veiculo(
          id, nome,
          veiculo_kit (
            kit (
              id, nome, ativo,
              itens:kit_item (id, kit_id, descricao_material, quantidade)
            )
          )
        ),
        equipa:manutencao_colaborador(colaborador:colaborador(id, nome)),
        materiais_extra:manutencao_material_extra(id, manutencao_id, descricao_material, quantidade)
      `)
      .eq('id', manutencaoId)
      .single(),
    supabase
      .from('execucao')
      .select('*, concluido_por_colaborador:colaborador!concluido_por(id, nome), itens:item_faturavel(*)')
      .eq('manutencao_id', manutencaoId)
      .maybeSingle(),
  ])

  if (manRes.error) throw manRes.error
  if (execRes.error) throw execRes.error

  const rawMan = manRes.data as any

  let veiculoNormalizado: DetalhesExecucao['manutencao']['veiculo'] = null
  if (rawMan.veiculo) {
    const kits = (rawMan.veiculo.veiculo_kit ?? [])
      .map((vk: any) => vk.kit)
      .filter((k: any) => k && k.ativo !== false)
      .map((k: any) => ({
        ...k,
        itens: (k.itens ?? []).sort((a: any, b: any) =>
          a.descricao_material.localeCompare(b.descricao_material, 'pt'),
        ),
      }))

    veiculoNormalizado = {
      id: rawMan.veiculo.id,
      nome: rawMan.veiculo.nome,
      kits,
    }
  }

  const manData: DetalhesExecucao['manutencao'] = {
    id: rawMan.id,
    data: rawMan.data,
    status: rawMan.status,
    observacoes_planeamento: rawMan.observacoes_planeamento,
    jardim: rawMan.jardim,
    veiculo: veiculoNormalizado,
    equipa: rawMan.equipa ?? [],
    materiais_extra: (rawMan.materiais_extra ?? []) as ManutencaoMaterialExtra[],
  }

  const execData = execRes.data as unknown as
    | (DetalhesExecucao['execucao'] & { itens?: DetalhesExecucao['itens'] })
    | null

  return {
    manutencao: manData,
    execucao: execData
      ? {
          id: execData.id,
          observacoes: execData.observacoes,
          concluido_por: execData.concluido_por,
          concluido_por_nome: (execData as any).concluido_por_colaborador?.nome ?? null,
          concluido_em: execData.concluido_em,
        }
      : null,
    itens: execData?.itens ?? [],
  }
}

export interface ItemFaturavelInput {
  id?: string
  descricao: string
  quantidade: string | null
  faturado?: boolean
}

export interface SalvarExecucaoInput {
  manutencao_id: string
  concluido_por: string | null
  observacoes: string | null
  itens: ItemFaturavelInput[]
}

export async function salvarExecucao(input: SalvarExecucaoInput): Promise<string> {
  // 1. Procura se já existe execucao para esta manutencao
  const { data: existente, error: errBusca } = await supabase
    .from('execucao')
    .select('id')
    .eq('manutencao_id', input.manutencao_id)
    .maybeSingle()

  if (errBusca) throw errBusca

  let execucaoId = existente?.id

  if (execucaoId) {
    const { error: errUpd } = await supabase
      .from('execucao')
      .update({
        observacoes: input.observacoes,
        editado_por: input.concluido_por,
        editado_em: new Date().toISOString(),
      })
      .eq('id', execucaoId)
    if (errUpd) throw errUpd
  } else {
    const { data: nova, error: errIns } = await supabase
      .from('execucao')
      .insert({
        manutencao_id: input.manutencao_id,
        concluido_por: input.concluido_por,
        observacoes: input.observacoes,
        concluido_em: new Date().toISOString(),
      })
      .select('id')
      .single()
    if (errIns) throw errIns
    execucaoId = (nova as { id: string }).id
  }

  // 2. Sincroniza item_faturavel
  const { error: errDel } = await supabase
    .from('item_faturavel')
    .delete()
    .eq('execucao_id', execucaoId)
  if (errDel) throw errDel

  const itensValidos = input.itens.filter((it) => it.descricao.trim() !== '')
  if (itensValidos.length > 0) {
    const rows = itensValidos.map((it) => ({
      execucao_id: execucaoId,
      descricao: it.descricao.trim(),
      quantidade: it.quantidade ? it.quantidade.trim() : null,
      faturado: it.faturado ?? false,
      faturado_em: it.faturado ? new Date().toISOString().slice(0, 10) : null,
    }))
    const { error: errItens } = await supabase.from('item_faturavel').insert(rows)
    if (errItens) throw errItens
  }

  // 3. Marca manutencao como 'concluida'
  const { error: errStatus } = await supabase
    .from('manutencao')
    .update({ status: 'concluida' })
    .eq('id', input.manutencao_id)
  if (errStatus) throw errStatus

  return execucaoId
}

export async function marcarItemFaturado(id: string, faturado: boolean): Promise<void> {
  const { error } = await supabase
    .from('item_faturavel')
    .update({
      faturado,
      faturado_em: faturado ? new Date().toISOString().slice(0, 10) : null,
    })
    .eq('id', id)
  if (error) throw error
}

export async function marcarTodosItensFaturados(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const hoje = new Date().toISOString().slice(0, 10)
  const { error } = await supabase
    .from('item_faturavel')
    .update({
      faturado: true,
      faturado_em: hoje,
    })
    .in('id', ids)
  if (error) throw error
}

export interface ObservacaoAnterior {
  id: string
  data: string
  observacoes: string
  observacoesPlaneamento: string | null
  concluidoPorNome: string | null
}

/**
 * Procura as últimas observações deixadas em manutenções anteriores de um jardim
 * (tanto em execução como no planeamento).
 */
export async function getUltimasObservacoesJardim(
  jardimId: string,
  limit: number = 2,
  ignorarManutencaoId?: string,
): Promise<ObservacaoAnterior[]> {
  try {
    let query = supabase
      .from('manutencao')
      .select(`
        id,
        data,
        status,
        observacoes_planeamento,
        execucao:execucao(
          id,
          observacoes,
          concluido_em,
          concluido_por:colaborador!execucao_concluido_por_fkey(nome)
        )
      `)
      .eq('jardim_id', jardimId)

    if (ignorarManutencaoId) {
      query = query.neq('id', ignorarManutencaoId)
    }

    const { data, error } = await query
      .order('data', { ascending: false })
      .limit(8)

    if (error) {
      // Fallback sem relação explícita com colaborador
      let fbQuery = supabase
        .from('manutencao')
        .select(`
          id,
          data,
          status,
          observacoes_planeamento,
          execucao:execucao(
            id,
            observacoes,
            concluido_em
          )
        `)
        .eq('jardim_id', jardimId)

      if (ignorarManutencaoId) {
        fbQuery = fbQuery.neq('id', ignorarManutencaoId)
      }

      const { data: fbData, error: fbError } = await fbQuery
        .order('data', { ascending: false })
        .limit(8)

      if (fbError) {
        console.warn('Erro ao carregar observações anteriores:', fbError)
        return []
      }

      return processarObservacoesRows(fbData ?? [], limit)
    }

    return processarObservacoesRows(data ?? [], limit)
  } catch (err) {
    console.warn('Erro em getUltimasObservacoesJardim:', err)
    return []
  }
}

function processarObservacoesRows(rows: any[], limit: number): ObservacaoAnterior[] {
  const resultado: ObservacaoAnterior[] = []

  for (const row of rows) {
    const exec = Array.isArray(row.execucao) ? row.execucao[0] : row.execucao
    const textoExec = exec?.observacoes?.trim() || null
    const textoPlan = row.observacoes_planeamento?.trim() || null

    if (textoExec || textoPlan) {
      resultado.push({
        id: row.id,
        data: row.data ?? (exec?.concluido_em ? exec.concluido_em.slice(0, 10) : ''),
        observacoes: textoExec || textoPlan || '',
        observacoesPlaneamento: textoPlan,
        concluidoPorNome: exec?.concluido_por?.nome ?? null,
      })
    }
  }

  return resultado.slice(0, limit)
}

// ---------- Gestão de Jardins e Voltas ----------

export async function getVoltas(): Promise<Volta[]> {
  const { data, error } = await supabase
    .from('volta')
    .select('*')
    .eq('ativo', true)
    .order('nome', { ascending: true })
  if (error) throw error
  return (data ?? []) as Volta[]
}

export async function criarVolta(nome: string): Promise<Volta> {
  const { data, error } = await supabase
    .from('volta')
    .insert({ nome: nome.trim(), ativo: true })
    .select('*')
    .single()
  if (error) throw error
  return data as Volta
}

export async function getClientesOpcoes(): Promise<{ id: string; nome: string }[]> {
  const { data, error } = await supabase
    .from('cliente')
    .select('id, nome')
    .eq('ativo', true)
    .order('nome', { ascending: true })
  if (error) throw error
  return (data ?? []) as { id: string; nome: string }[]
}

export interface CriarJardimInput {
  clienteModo: 'existente' | 'novo'
  clienteId?: string
  novoClienteNome?: string
  novoClienteContacto?: string
  voltaId?: string | null
  morada_rua?: string | null
  morada_cidade?: string | null
  morada_codigo_postal?: string | null
  frequencia: 'semanal' | 'quinzenal'
  notas?: string | null
  tem_plano_rotativo: boolean
  etapas?: { ordem: number; instrucoes: string }[]
}

export async function criarJardim(input: CriarJardimInput): Promise<string> {
  // 1. Obter ou criar o cliente
  let clienteId = input.clienteId
  if (input.clienteModo === 'novo') {
    if (!input.novoClienteNome || !input.novoClienteNome.trim()) {
      throw new Error('O nome do cliente é obrigatório.')
    }
    const { data: novoCli, error: errCli } = await supabase
      .from('cliente')
      .insert({
        nome: input.novoClienteNome.trim(),
        contacto: input.novoClienteContacto?.trim() || null,
        ativo: true,
      })
      .select('id')
      .single()
    if (errCli) throw errCli
    clienteId = (novoCli as { id: string }).id
  }

  if (!clienteId) {
    throw new Error('Cliente não selecionado.')
  }

  // 2. Inserir jardim
  const { data: jardim, error: errJardim } = await supabase
    .from('jardim')
    .insert({
      cliente_id: clienteId,
      volta_id: input.voltaId || null,
      morada_rua: input.morada_rua?.trim() || null,
      morada_cidade: input.morada_cidade?.trim() || null,
      morada_codigo_postal: input.morada_codigo_postal?.trim() || null,
      frequencia: input.frequencia,
      tem_plano_rotativo: input.tem_plano_rotativo,
      notas: input.notas?.trim() || null,
      status: 'ok',
      ativo: true,
    })
    .select('id')
    .single()

  if (errJardim) throw errJardim
  const jardimId = (jardim as { id: string }).id

  // 3. Etapas rotativas se ativado
  if (input.tem_plano_rotativo && input.etapas && input.etapas.length > 0) {
    const validEtapas = input.etapas
      .filter((e) => e.instrucoes && e.instrucoes.trim().length > 0)
      .map((e, idx) => ({
        jardim_id: jardimId,
        ordem: idx + 1,
        instrucoes: e.instrucoes.trim(),
      }))

    if (validEtapas.length > 0) {
      const { data: etapasCriadas, error: errEtapas } = await supabase
        .from('etapa_rotativa')
        .insert(validEtapas)
        .select('id, ordem')

      if (errEtapas) throw errEtapas

      const primeira = etapasCriadas?.find((e) => e.ordem === 1) || etapasCriadas?.[0]
      if (primeira) {
        const { error: errEtapaAtual } = await supabase
          .from('jardim')
          .update({ etapa_atual_id: primeira.id })
          .eq('id', jardimId)
        if (errEtapaAtual) throw errEtapaAtual
      }
    }
  }

  return jardimId
}

export interface AtualizarJardimInput {
  morada_rua?: string | null
  morada_cidade?: string | null
  morada_codigo_postal?: string | null
  volta_id?: string | null
  frequencia: 'semanal' | 'quinzenal'
  notas?: string | null
  tem_plano_rotativo: boolean
  etapas?: { ordem: number; instrucoes: string }[]
  etapa_atual_ordem?: number | null
}

export async function atualizarJardim(id: string, input: AtualizarJardimInput): Promise<void> {
  // 1. Atualizar dados gerais do jardim
  const { error: errJardim } = await supabase
    .from('jardim')
    .update({
      morada_rua: input.morada_rua?.trim() || null,
      morada_cidade: input.morada_cidade?.trim() || null,
      morada_codigo_postal: input.morada_codigo_postal?.trim() || null,
      volta_id: input.volta_id || null,
      frequencia: input.frequencia,
      notas: input.notas?.trim() || null,
      tem_plano_rotativo: input.tem_plano_rotativo,
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', id)

  if (errJardim) throw errJardim

  // 2. Sincronizar etapas rotativas
  if (!input.tem_plano_rotativo) {
    // Anula etapa_atual_id no jardim e remove etapas
    await supabase.from('jardim').update({ etapa_atual_id: null }).eq('id', id)
    const { error: errDel } = await supabase.from('etapa_rotativa').delete().eq('jardim_id', id)
    if (errDel) throw errDel
  } else {
    // Primeiro liberta a chave estrangeira etapa_atual_id
    await supabase.from('jardim').update({ etapa_atual_id: null }).eq('id', id)
    // Apaga as etapas antigas
    const { error: errDel } = await supabase.from('etapa_rotativa').delete().eq('jardim_id', id)
    if (errDel) throw errDel

    const validEtapas = (input.etapas ?? [])
      .filter((e) => e.instrucoes && e.instrucoes.trim().length > 0)
      .map((e, idx) => ({
        jardim_id: id,
        ordem: idx + 1,
        instrucoes: e.instrucoes.trim(),
      }))

    if (validEtapas.length > 0) {
      const { data: novasEtapas, error: errEtapas } = await supabase
        .from('etapa_rotativa')
        .insert(validEtapas)
        .select('id, ordem')

      if (errEtapas) throw errEtapas

      // Definir a etapa atual: pela ordem selecionada ou pela ordem 1
      const ordemAlvo = input.etapa_atual_ordem ?? 1
      const etapaAlvo =
        novasEtapas?.find((e) => e.ordem === ordemAlvo) ||
        novasEtapas?.find((e) => e.ordem === 1) ||
        novasEtapas?.[0]

      if (etapaAlvo) {
        const { error: errEtapaAtual } = await supabase
          .from('jardim')
          .update({ etapa_atual_id: etapaAlvo.id })
          .eq('id', id)
        if (errEtapaAtual) throw errEtapaAtual
      }
    }
  }
}

// ---------- Gestão de Veículos e Kits (Passo 5) ----------

export interface VeiculosEKitsData {
  veiculos: VeiculoComKits[]
  kits: KitComItensEVeiculos[]
}

export async function getVeiculosEKits(): Promise<VeiculosEKitsData> {
  const [veiculosRes, kitsRes] = await Promise.all([
    supabase
      .from('veiculo')
      .select(`
        *,
        veiculo_kit (
          kit_id,
          kit (
            id,
            nome,
            ativo,
            itens:kit_item (
              id,
              kit_id,
              descricao_material,
              quantidade
            )
          )
        )
      `)
      .order('nome', { ascending: true }),

    supabase
      .from('kit')
      .select(`
        *,
        itens:kit_item (*),
        veiculo_kit (
          veiculo:veiculo (
            id,
            nome,
            ativo
          )
        )
      `)
      .order('nome', { ascending: true }),
  ])

  if (veiculosRes.error) throw veiculosRes.error
  if (kitsRes.error) throw kitsRes.error

  const rawVeiculos = veiculosRes.data ?? []
  const rawKits = kitsRes.data ?? []

  // Normalização de veículos com os seus kits associados
  const veiculos: VeiculoComKits[] = rawVeiculos.map((v: any) => {
    const kits = (v.veiculo_kit ?? [])
      .map((vk: any) => vk.kit)
      .filter((k: any) => k && k.ativo !== false)
      .map((k: any) => ({
        ...k,
        itens: (k.itens ?? []).sort((a: any, b: any) =>
          a.descricao_material.localeCompare(b.descricao_material, 'pt'),
        ),
      }))

    return {
      id: v.id,
      nome: v.nome,
      matricula: v.matricula,
      marca: v.marca,
      ativo: v.ativo,
      kits,
    }
  })

  // Normalização de kits com os respetivos itens e veículos onde estão presentes
  const kits: KitComItensEVeiculos[] = rawKits.map((k: any) => {
    const veiculosAssociados = (k.veiculo_kit ?? [])
      .map((vk: any) => vk.veiculo)
      .filter((v: any) => v && v.ativo !== false)

    return {
      id: k.id,
      nome: k.nome,
      ativo: k.ativo,
      itens: (k.itens ?? []).sort((a: any, b: any) =>
        a.descricao_material.localeCompare(b.descricao_material, 'pt'),
      ),
      veiculos: veiculosAssociados,
    }
  })

  return { veiculos, kits }
}

export async function criarVeiculo(input: VeiculoInput): Promise<Veiculo> {
  const { data, error } = await supabase
    .from('veiculo')
    .insert({
      nome: input.nome.trim(),
      matricula: input.matricula?.trim() || null,
      marca: input.marca?.trim() || null,
      ativo: input.ativo ?? true,
    })
    .select('*')
    .single()

  if (error) throw error
  return data as Veiculo
}

export async function atualizarVeiculo(
  id: string,
  input: Partial<VeiculoInput>,
): Promise<void> {
  const updates: Record<string, any> = {}
  if (input.nome !== undefined) updates.nome = input.nome.trim()
  if (input.matricula !== undefined) updates.matricula = input.matricula?.trim() || null
  if (input.marca !== undefined) updates.marca = input.marca?.trim() || null
  if (input.ativo !== undefined) updates.ativo = input.ativo

  const { error } = await supabase
    .from('veiculo')
    .update(updates)
    .eq('id', id)

  if (error) throw error
}

export async function desativarVeiculo(id: string): Promise<void> {
  const { error } = await supabase
    .from('veiculo')
    .update({ ativo: false })
    .eq('id', id)

  if (error) throw error
}

export async function atualizarKitsDoVeiculo(
  veiculoId: string,
  kitIds: string[],
): Promise<void> {
  // 1. Apaga as associações atuais do veículo
  const { error: errDel } = await supabase
    .from('veiculo_kit')
    .delete()
    .eq('veiculo_id', veiculoId)

  if (errDel) throw errDel

  // 2. Insere as novas associações selecionadas
  if (kitIds.length > 0) {
    const rows = kitIds.map((kitId) => ({
      veiculo_id: veiculoId,
      kit_id: kitId,
    }))
    const { error: errIns } = await supabase
      .from('veiculo_kit')
      .insert(rows)

    if (errIns) throw errIns
  }
}

export async function criarKit(input: KitInput): Promise<Kit> {
  // 1. Cria o registo do kit
  const { data: kit, error: errKit } = await supabase
    .from('kit')
    .insert({
      nome: input.nome.trim(),
      ativo: input.ativo ?? true,
    })
    .select('*')
    .single()

  if (errKit) throw errKit

  // 2. Insere os itens pertencentes ao kit
  const itensValidos = (input.itens ?? [])
    .filter((it) => it.descricao_material && it.descricao_material.trim().length > 0)
    .map((it) => ({
      kit_id: kit.id,
      descricao_material: it.descricao_material.trim(),
      quantidade: it.quantidade !== undefined && it.quantidade !== null && !isNaN(it.quantidade)
        ? it.quantidade
        : null,
    }))

  if (itensValidos.length > 0) {
    const { error: errItens } = await supabase
      .from('kit_item')
      .insert(itensValidos)

    if (errItens) throw errItens
  }

  return kit as Kit
}

export async function atualizarKit(
  id: string,
  input: Partial<KitInput>,
): Promise<void> {
  // 1. Atualiza dados gerais do kit se fornecidos
  const updates: Record<string, any> = {}
  if (input.nome !== undefined) updates.nome = input.nome.trim()
  if (input.ativo !== undefined) updates.ativo = input.ativo

  if (Object.keys(updates).length > 0) {
    const { error: errKit } = await supabase
      .from('kit')
      .update(updates)
      .eq('id', id)

    if (errKit) throw errKit
  }

  // 2. Se a lista de itens foi passada, sincroniza a tabela kit_item
  if (input.itens !== undefined) {
    const { error: errDel } = await supabase
      .from('kit_item')
      .delete()
      .eq('kit_id', id)

    if (errDel) throw errDel

    const itensValidos = input.itens
      .filter((it) => it.descricao_material && it.descricao_material.trim().length > 0)
      .map((it) => ({
        kit_id: id,
        descricao_material: it.descricao_material.trim(),
        quantidade: it.quantidade !== undefined && it.quantidade !== null && !isNaN(it.quantidade)
          ? it.quantidade
          : null,
      }))

    if (itensValidos.length > 0) {
      const { error: errItens } = await supabase
        .from('kit_item')
        .insert(itensValidos)

      if (errItens) throw errItens
    }
  }
}

export async function desativarKit(id: string): Promise<void> {
  const { error } = await supabase
    .from('kit')
    .update({ ativo: false })
    .eq('id', id)

  if (error) throw error
}

export async function apagarKit(id: string): Promise<void> {
  const { error } = await supabase
    .from('kit')
    .delete()
    .eq('id', id)

  if (error) throw error
}


