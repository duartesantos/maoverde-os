# Jardins d'Óbidos — Contexto do Projeto (handoff para o agente)

> Este documento resume tudo o que foi decidido e construído até agora, para
> quem continuar o desenvolvimento. Lê-o antes de começar. Idioma do projeto:
> **português de Portugal** — nomes de código, UI, comentários e mensagens.

## 1. O que é

Aplicação de **gestão de serviços de jardinagem** para a empresa "Jardins
d'Óbidos". Coordena a **gerência (patrão/administrador)** e a **equipa de
jardineiros (trabalhadores)**. É **mobile-first**: o patrão anda quase sempre no
terreno e usa o telemóvel para a maior parte; o computador é o "modo sentado"
para planeamento mais pesado.

Dois perfis (`colaborador.tipo`):
- **patrao** — vê e faz tudo (clientes, jardins, veículos, kits, planeamento, faturação).
- **trabalhador** — vê os seus trabalhos, regista execuções e materiais a faturar.

## 2. Stack e convenções

- **React 19 + Vite + TypeScript + Tailwind CSS v4 + React Router 7 + Supabase.**
- Correr: `npm install`, `npm run dev` (localhost:5173), `npm run build`.
- Configuração via `.env` (a partir de `.env.example`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. **Nunca** commitar o `.env`.
- Estrutura:
  - `src/lib/supabase.ts` — cliente Supabase (único).
  - `src/auth/AuthContext.tsx` — sessão + perfil `colaborador` (via `useAuth()`).
  - `src/data/queries.ts` — **todas as leituras/escritas ao Supabase vivem aqui** (não espalhar chamadas pelos componentes).
  - `src/lib/useAsync.ts` — hook de fetch (loading/error/data).
  - `src/components/Layout.tsx` — navegação (sidebar desktop / tabs telemóvel), `ui.tsx` — peças reutilizáveis (Card, Badge, StatusDot, PageState).
  - `src/pages/` — um ficheiro por ecrã. `src/types/db.ts` — tipos que espelham o schema.
- **Estilo visual: minimalista neutro.** Tons de cinzento, cor mínima. Fontes **IBM Plex Sans / Mono**. Tokens de cor definidos em `src/index.css` (`--color-page`, `--color-surface`, `--color-line`, `--color-ink`, `--color-muted`, `--color-ok/urg/atr`, etc.) e usados via classes Tailwind (`bg-surface`, `text-muted`, …). Segue este vocabulário; não inventes cores novas.
- Estados de jardim: `ok` (verde), `urgente` (amarelo), `atrasado` (vermelho) — via `<StatusDot>`.
- Verifica sempre com `npm run build` antes de dar por concluído.

## 3. Modelo de dados (PostgreSQL / Supabase)

O SQL está em `supabase/`: **`reset.sql`** (apaga tudo), **`schema.sql`** (tabelas),
**`auth_and_rls.sql`** (trigger de contas + segurança), **`seed.sql`** (dados reais).
Correr por essa ordem no SQL Editor do Supabase.

Tabelas (todas com `id uuid`):
- **cliente** (nome, contacto, notas, ativo). *Não tem `premium` (foi removido).*
- **volta** (rota que agrupa jardins). Sem ecrã próprio: a volta define-se ao criar/editar o jardim.
- **jardim** — `cliente_id` (1 cliente → N jardins), `volta_id` (opcional), morada, `frequencia` ('semanal'|'quinzenal'), `ultima_manutencao`, `proxima_manutencao` (calculado), `status` (ok/urgente/atrasado, calculado), `tem_plano_rotativo`, `etapa_atual_id`.
- **etapa_rotativa** — etapas do plano rotativo de um jardim (nº variável, ordenadas). `jardim.etapa_atual_id` aponta para a etapa em curso.
- **veiculo** (carrinha: nome, marca).
- **kit** + **kit_item** + **veiculo_kit** — **kits nomeados e reutilizáveis** (ex.: "Kit Corte de Relva"); `veiculo_kit` é N:M (que kits cada carrinha leva).
- **colaborador** — `user_id` liga ao Supabase Auth; `tipo` ('patrao'|'trabalhador').
- **manutencao** (trabalho planeado) — `jardim_id`, `veiculo_id`, `criado_por`, `data`, `status` (agendada/em_progresso/concluida/reagendada/cancelada), `observacoes_planeamento`.
- **manutencao_colaborador** — equipa atribuída (N:M). **Só atribuição** (não há aceitar/recusar).
- **manutencao_material_extra** — materiais extra a levar além do kit da carrinha.
- **execucao** (1:1 com manutencao) — registo do que foi feito: `observacoes` (histórico/processo), `concluido_por`, `editado_por`.
- **item_faturavel** — materiais a faturar ao cliente (à parte das observações): `descricao`, `quantidade`, **`faturado` (bool)**, `faturado_em` *(sem campo preço — os jardineiros registam apenas item e quantidade gasta)*.

Regra de leitura: a FK está sempre no lado "muitos"; um jardim aponta para o cliente, etc.

## 4. Autenticação e segurança (RLS)

- Login por **Supabase Auth** (email/password). As contas são criadas pela gerência (sem registo público).
- Trigger **`handle_new_user`**: ao criar conta no Auth, cria/liga a linha em `colaborador` (por email).
- Helper **`is_patrao()`**: diz se o utilizador autenticado é patrão.
- **RLS** ativa em todas as tabelas. Ponto de partida **permissivo**: qualquer autenticado LÊ tudo; o patrão ESCREVE tudo; o fluxo de terreno (execucao, item_faturavel, manutencao_material_extra, update de manutencao) está aberto a autenticados. **A apertar depois** (por perfil).

## 5. Estado atual (o que já está feito)

Ecrãs e funcionalidades ligados a dados reais:
- **Login** — Supabase Auth.
- **Dashboard** — métricas + próximas manutenções + trabalhos de hoje (com recálculo automático de status na leitura).
- **Clientes** — lista cliente → jardins (multi-jardim expande) com **filtro por voltas, pesquisa rápida em tempo real e identificação da volta em cada jardim**.
- **Ficha de Jardim** — detalhes, plano rotativo (etapa atual), histórico.
- **Planeamento** — agenda semanal (grelha desktop / vista-dia telemóvel), navegação de semana, modal "Nova manutenção" (**com seleção de jardim inteligente filtrada por volta, contadores, busca rápida e aviso contextual da última observação com botão de cópia para notas**), **remarcação rápida (drag-and-drop entre colunas no desktop / alteração de data no telemóvel) e modal "Editar manutenção" com alteração de equipa, veículo, observações (também com histórico contextual) e eliminação**. **Visualização diária organizada por carrinha (caixas estruturadas por viatura/equipa com contagem de jardins e destaque a verde suave nas concluídas para fácil identificação do que ficou por fazer)**.
- **Automações de BD (Supabase)** — implementado em `supabase/triggers_jardins.sql` e incorporado em `schema.sql`:
  - Ao concluir manutenção (ou inserir `execucao`): atualiza `ultima_manutencao`, calcula `proxima_manutencao` (+7d ou +14d), atualiza `status` (`ok`/`urgente`/`atrasado`) e avança para a próxima etapa do plano rotativo.
  - Função `recalcular_status_jardins()` para sincronizar estados face ao dia de hoje sem depender de cron jobs externos.

- **Registar Execução (`/execucao/:id`)** — ecrã mobile-first de registo de trabalhos: observações técnicas para histórico do jardim + lista dinâmica de materiais a faturar (por defeito pendentes); métrica "Por faturar" no Dashboard; consulta e ação de marcar como faturado pelo patrão na Ficha de Jardim.

- **Veículos e Kits (`/veiculos`)** — ecrã completo de gestão da frota de carrinhas, catálogo de kits reutilizáveis e ferramentas (`kit_item`), e atribuição visual de kits a cada viatura (`veiculo_kit`).

- **Kits e Materiais Extra no Planeamento e Dashboard Matinal** — no agendamento e edição de manutenções (`/planeamento`), visualização instantânea dos kits e ferramentas a bordo da carrinha selecionada e gestão de lista de materiais extra a levar (`manutencao_material_extra`) com indicador visual `📦` nos cartões do calendário; no **Dashboard** (`/`), painel expansível de "Carga & Equipamento de Hoje" para consulta matinal da equipa antes da partida (kits padrão da carrinha atribuída com ferramentas verticais expansíveis + listagem informativa clara de materiais extra agregados para o dia); e no ecrã de execução móvel (`/execucao/:id`), indicação contextual simples dos materiais do serviço, mantendo o foco do registo nas observações e itens a faturar.

**Dados:** o `seed.sql` traz dados REAIS de um Excel do cliente (95 clientes, 9 voltas, 3 carrinhas, 3 kits, equipa). Os jardins **não têm datas de manutenção** (o Excel não as tinha) → o Dashboard e a agenda parecem "vazios/ao calhas". **Isto é falta de dados, não bug.**

## 6. Design / mockups (referência visual)

Há um canvas com **14 ecrãs** desenhados (estilo minimalista neutro), que é a
referência de UI: gestão em desktop (Login, Dashboard, Planeamento, Agendar
manutenção, Ficha de jardim, Clientes) e telemóvel (trabalhador: Vista do dia,
Registar execução; administrador: Início, Agenda, Nova manutenção, Ficha, Clientes,
Novo jardim). Segue estes ecrãs quando construíres os que faltam.

Mockups (Claude Artifact): https://claude.ai/code/artifact/32ecf1c9-970c-4d89-a872-6fd6551ab85e

## 7. Próximos passos (backlog, por prioridade)

1. [x] ~~**Planeamento:** remarcar (arrastar / mudar data) e editar manutenção.~~ *(Concluído)*
2. [x] ~~**Lógica dos jardins críticos:** cálculo de datas, avanço de etapas rotativas e recálculo de status via triggers SQL no Supabase.~~ *(Concluído)*
3. [x] ~~**Registar execução** (telemóvel): observações + itens a faturar (nascem por defeito como não faturados: `faturado = false`).~~ *(Concluído)*
4. [x] ~~**Formulários Novo/Editar jardim** (seletor de volta + "criar nova volta") e configuração de etapas rotativas.~~ *(Concluído)*
5. [x] ~~**Veículos e kits** (ecrã `/veiculos`) — gestão de carrinhas, catálogo de kits e ferramentas, e atribuição `veiculo_kit`.~~ *(Concluído)*
6. [x] ~~**Planeamento & Execução com Kits e Materiais Extra** (Passo 4 Parte B): visualização dos kits associados no agendamento e lista de materiais extra (`manutencao_material_extra`).~~ *(Concluído)*
7. **Apertar a RLS e Vistas por perfil** (trabalhador só vê/edita o que lhe toca no dia).
8. **Chatbot / Assistente IA (posterior)**: perguntas em linguagem natural sobre faturação, histórico e geração do relatório diário.

## 8. Decisões já tomadas (não voltar a discutir sem motivo)

- **Sem aba "Relatórios"** — substituída conceptualmente por futuro Chatbot/Assistente IA para consultas diretas e resumos diários.
- **Supabase (PostgreSQL relacional)** como base de dados; **React + Vite** (não Next/Refine) por simplicidade.
- **Cliente e Jardim são tabelas separadas** (1→N) mas **uma só aba "Clientes"** na navegação (a maioria dos clientes tem 1 jardim).
- **Sem aba "Voltas"** — a volta define-se no jardim.
- **Sem campo `premium`** no cliente (removido).
- **Sem estado 'cancelada' no planeamento** — se o serviço não se realiza ou se foi marcado por engano, ou se remarca para outro dia ou se elimina. O calendário deve manter-se sempre limpo e focado no que é executável.
- **Sem distinção de estado 'reagendada'** — manutenções remarcadas ou arrastadas no calendário mantêm simplesmente o estado 'agendada'. Não existe etiqueta nem opção 'reagendada' na interface.
- **Sem estado 'em progresso' / 'em curso'** — o fluxo operacional no terreno e no planeamento é binário e direto: os trabalhos dividem-se simplesmente entre 'agendada' (por realizar) e 'concluida' (trabalho efetuado com registo de execução).
- **Sem obrigatoriedade de cron jobs externos** — o recálculo do status é resiliente: dispara nos triggers de conclusão e ao abrir o Dashboard na aplicação.
- **Kits nomeados/reutilizáveis** (kit/kit_item/veiculo_kit), não presos à carrinha.
- **Observações** (texto/histórico) **separadas** dos **materiais a faturar** (tabela própria `item_faturavel`).
- **Ciclo dos materiais a faturar:** registados na execução pelo trabalhador sempre como pendentes (`faturado = false`); o Dashboard exibe o total de itens por faturar para alerta da gerência; e na ficha de cliente/jardim o patrão consulta e marca como faturados (`faturado = true`). **Sem campo de preço:** o trabalhador regista apenas descrição e quantidade (texto livre, permitindo unidades de medida como "2 sacos", "50L", "1 un").
- Atribuição de equipa **sem** aceitar/recusar; **sem** disponibilidade individual; **sem** GPS/mapas; **sem** inventário item-a-item.
- **Materiais extra no Dashboard matinal estritamente informativos** — sem checkboxes interativas ou estados de check por agora, servindo como guia rápido dos itens adicionais a colocar na carrinha para o dia.
- **Mobile-first** para os dois perfis.

