-- ============================================================
--  Jardins d'Óbidos — Dados de Demonstração / Apresentação
-- ============================================================
--  Este script prepara a aplicação para uma demonstração com o patrão/cliente.
--  Utiliza datas relativas (CURRENT_DATE) para que, em qualquer dia em que a
--  apresentação seja feita, o Dashboard, o Planeamento Semanal e a Execução
--  estejam com um aspeto realista, dinâmico e profissional.
--
--  Como correr:
--  1. Abrir o Supabase -> SQL Editor -> New Query
--  2. Colar o conteúdo deste ficheiro e clicar em "Run"
--
--  O que este script faz:
--  - Limpa manutenções antigas de teste (mantendo clientes, jardins e carrinhas reais).
--  - Atribui moradas e notas realistas a jardins selecionados.
--  - Configura um plano rotativo de 4 etapas para demonstração.
--  - Cria trabalhos para HOJE (concluídos a verde e agendados por fazer).
--  - Adiciona materiais extra na carrinha e itens por faturar na execução.
--  - Preenche a agenda para o resto da semana (amanhã e próximos dias).
--  - Recalcula automaticamente os estados (OK, Urgente, Atrasado).
-- ============================================================

-- 1. LIMPAR MANUTENÇÕES E EXECUÇÕES ANTERIORES
delete from manutencao;

-- 2. ENRIQUECER DADOS DE JARDINS (Moradas, notas e frequências realistas)
update jardim
set morada_rua = 'Rua do Pinhal, Lote 14',
    morada_cidade = 'Praia d''El Rey',
    morada_codigo_postal = '2510-451 Óbidos',
    notas = 'Acesso pelo portão lateral junto à garagem. Cuidado com o cão pequeno.',
    proxima_manutencao = current_date,
    status = 'ok'
where id = '835e1459-7722-478d-bf1f-58bbc8fb1f4c'; -- Ulrich (West Cliffs)

update jardim
set morada_rua = 'Avenida do Golfe, Vivenda 22',
    morada_cidade = 'Praia d''El Rey',
    morada_codigo_postal = '2510-451 Óbidos',
    notas = 'Regar canteiros de hortênsias com especial atenção.',
    proxima_manutencao = current_date + interval '1 day',
    status = 'urgente'
where id = '618c319a-afcc-45c9-9b2a-db83bbd6d585'; -- Marion Walksperia (West Cliffs)

update jardim
set morada_rua = 'Rua das Flores, 8',
    morada_cidade = 'Óbidos',
    morada_codigo_postal = '2510-001 Óbidos',
    notas = 'Cliente solicita corte quinzenal e aplicação de herbicida nos passeios.',
    frequencia = 'quinzenal',
    proxima_manutencao = current_date - interval '3 days',
    status = 'atrasado'
where id = 'cf732f9f-09d2-4c20-b0e4-9cb2a7129078'; -- Óbidos Sr. Duarte

update jardim
set morada_rua = 'Estrada Principal, Quinta da Vigia',
    morada_cidade = 'Óbidos',
    morada_codigo_postal = '2510-045 Óbidos',
    notas = 'Jardim de grande dimensão com plano rotativo trimestral.',
    tem_plano_rotativo = true,
    proxima_manutencao = current_date,
    status = 'ok'
where id = '63b19ce3-f7fb-418f-b687-6fbffc74200c'; -- Sr. João Suiço (Volta Óbidos)

update jardim
set morada_rua = 'Rua do Miradouro, 5',
    morada_cidade = 'Foz do Arelho',
    morada_codigo_postal = '2500-480 Caldas da Rainha',
    proxima_manutencao = current_date + interval '2 days',
    status = 'ok'
where id = '0df2cf51-0f1b-4709-ab21-312298246d58'; -- Margarida (Volta do mar)

update jardim
set morada_rua = 'Casal dos Cucos, Lote 3',
    morada_cidade = 'Nadadouro',
    morada_codigo_postal = '2500-501 Caldas da Rainha',
    proxima_manutencao = current_date + interval '7 days',
    status = 'ok'
where id = '826fe742-8504-47f4-b6ce-98e5e85ad5b3'; -- Comandante (Volta do mar)

-- 3. CONFIGURAR PLANO ROTATIVO DE EXEMPLO (Sr. João Suiço)
delete from etapa_rotativa where jardim_id = '63b19ce3-f7fb-418f-b687-6fbffc74200c';

insert into etapa_rotativa (id, jardim_id, ordem, instrucoes) values
  ('e1000001-0000-0000-0000-000000000001', '63b19ce3-f7fb-418f-b687-6fbffc74200c', 1, 'Corte geral de relva e limpeza profunda de canteiros'),
  ('e1000002-0000-0000-0000-000000000002', '63b19ce3-f7fb-418f-b687-6fbffc74200c', 2, 'Poda técnica de sebes perimetrais e arbustos altos'),
  ('e1000003-0000-0000-0000-000000000003', '63b19ce3-f7fb-418f-b687-6fbffc74200c', 3, 'Adubação de relvados e tratamento fitossanitário preventivo'),
  ('e1000004-0000-0000-0000-000000000004', '63b19ce3-f7fb-418f-b687-6fbffc74200c', 4, 'Revisão geral do sistema de rega automática e afinação de aspersores');

update jardim
set etapa_atual_id = 'e1000002-0000-0000-0000-000000000002'
where id = '63b19ce3-f7fb-418f-b687-6fbffc74200c';


-- 4. MANUTENÇÕES DE HOJE (CURRENT_DATE)

-- --- Carrinha 1: Berlingo (Hélio & Gabriel) ---
-- Manutenção 1: Concluída hoje de manhã (destaque verde suave no planeamento!)
insert into manutencao (id, jardim_id, veiculo_id, data, status, observacoes_planeamento) values
  ('d1000001-0000-0000-0000-000000000001',
   '835e1459-7722-478d-bf1f-58bbc8fb1f4c', -- Ulrich
   'fec7b09f-5c10-4c3a-b1fc-3e2260dde838', -- Berlingo
   current_date,
   'concluida',
   'Corte de relvado principal e aplicação de adubo azul nos canteiros floridos.');

insert into manutencao_colaborador (manutencao_id, colaborador_id) values
  ('d1000001-0000-0000-0000-000000000001', '00edded7-4bbe-452d-842a-01120b7e0b09'), -- Hélio
  ('d1000001-0000-0000-0000-000000000001', 'f856e0a2-e81c-4416-be13-c46248947c1b'); -- Gabriel

insert into manutencao_material_extra (manutencao_id, descricao_material, quantidade) values
  ('d1000001-0000-0000-0000-000000000001', 'Sacos de adubo granulado azul', 2);

-- Registo da Execução e Materiais a Faturar (para demonstrar o contador "Por faturar" no Dashboard)
insert into execucao (id, manutencao_id, concluido_por, observacoes, concluido_em) values
  ('c1000001-0000-0000-0000-000000000001',
   'd1000001-0000-0000-0000-000000000001',
   '00edded7-4bbe-452d-842a-01120b7e0b09', -- Hélio
   'Corte de relva concluído na altura 4. Bordaduras alinhadas. Foram espalhados 2 sacos de adubo azul nos canteiros da frente e canteiro poente.',
   now() - interval '2 hours');

insert into item_faturavel (execucao_id, descricao, quantidade, faturado) values
  ('c1000001-0000-0000-0000-000000000001', 'Adubo granulado azul 50L', '2 sacos', false),
  ('c1000001-0000-0000-0000-000000000001', 'Fio de roçadora reforçado', '1 rolo', false);

-- Manutenção 2: Agendada para hoje (segundo trabalho da Berlingo)
insert into manutencao (id, jardim_id, veiculo_id, data, status, observacoes_planeamento) values
  ('d1000002-0000-0000-0000-000000000002',
   '3fb88b4c-8ba9-4a3d-b389-2731a58542ea', -- Fresh
   'fec7b09f-5c10-4c3a-b1fc-3e2260dde838', -- Berlingo
   current_date,
   'agendada',
   'Limpeza geral de folhas acumuladas e corte rápido de relva.');

insert into manutencao_colaborador (manutencao_id, colaborador_id) values
  ('d1000002-0000-0000-0000-000000000002', '00edded7-4bbe-452d-842a-01120b7e0b09'),
  ('d1000002-0000-0000-0000-000000000002', 'f856e0a2-e81c-4416-be13-c46248947c1b');

insert into manutencao_material_extra (manutencao_id, descricao_material, quantidade) values
  ('d1000002-0000-0000-0000-000000000002', 'Big bags reforçados para biomassa', 4);

-- Manutenção 3: Agendada para hoje (terceiro trabalho da Berlingo)
insert into manutencao (id, jardim_id, veiculo_id, data, status, observacoes_planeamento) values
  ('d1000003-0000-0000-0000-000000000003',
   '7be9471f-fa8b-49b6-9987-f99dad089999', -- Joeri
   'fec7b09f-5c10-4c3a-b1fc-3e2260dde838', -- Berlingo
   current_date,
   'agendada',
   'Verificar aspersores e aparar sebes da entrada.');

insert into manutencao_colaborador (manutencao_id, colaborador_id) values
  ('d1000003-0000-0000-0000-000000000003', '00edded7-4bbe-452d-842a-01120b7e0b09'),
  ('d1000003-0000-0000-0000-000000000003', 'f856e0a2-e81c-4416-be13-c46248947c1b');


-- --- Carrinha 2: Toyota (Sábio & Miguel) ---
-- Manutenção 4: Agendada para hoje (primeiro trabalho da Toyota)
insert into manutencao (id, jardim_id, veiculo_id, data, status, observacoes_planeamento) values
  ('d1000004-0000-0000-0000-000000000004',
   '63b19ce3-f7fb-418f-b687-6fbffc74200c', -- Sr. João Suiço (Plano rotativo)
   'f277dcba-7e34-43f7-bee3-78a1d57c1026', -- Toyota
   current_date,
   'agendada',
   'Executar Etapa 2 do plano rotativo: Poda de sebes e arbustos altos.');

insert into manutencao_colaborador (manutencao_id, colaborador_id) values
  ('d1000004-0000-0000-0000-000000000004', 'b0bca27b-cfcd-4d6c-96b2-b4731657e8a9'), -- Sábio
  ('d1000004-0000-0000-0000-000000000004', 'e55c60ee-3a76-4e3f-9b85-3b76c37a4b4b'); -- Miguel

insert into manutencao_material_extra (manutencao_id, descricao_material, quantidade) values
  ('d1000004-0000-0000-0000-000000000004', 'Tesourão telescópico de poda alta', 1);

-- Manutenção 5: Agendada para hoje à tarde
insert into manutencao (id, jardim_id, veiculo_id, data, status, observacoes_planeamento) values
  ('d1000005-0000-0000-0000-000000000005',
   '334aadcd-e603-4d16-a853-fe5fd6c424f5', -- Sobral
   'f277dcba-7e34-43f7-bee3-78a1d57c1026', -- Toyota
   current_date,
   'agendada',
   'Manutenção geral e corte de relvado de trás.');

insert into manutencao_colaborador (manutencao_id, colaborador_id) values
  ('d1000005-0000-0000-0000-000000000005', 'b0bca27b-cfcd-4d6c-96b2-b4731657e8a9'),
  ('d1000005-0000-0000-0000-000000000005', 'e55c60ee-3a76-4e3f-9b85-3b76c37a4b4b');


-- --- Sem Carrinha atribuída (Para demonstrar atribuição no planeamento) ---
insert into manutencao (id, jardim_id, veiculo_id, data, status, observacoes_planeamento) values
  ('d1000006-0000-0000-0000-000000000006',
   '618c319a-afcc-45c9-9b2a-db83bbd6d585', -- Marion Walksperia
   null, -- Sem carrinha
   current_date,
   'agendada',
   'Serviço extra solicitado pelo cliente. Aguarda definição de viatura.');


-- 5. HISTÓRICO DE ONTEM (CURRENT_DATE - 1) — Mostra histórico na Ficha de Jardim
insert into manutencao (id, jardim_id, veiculo_id, data, status, observacoes_planeamento) values
  ('d1000007-0000-0000-0000-000000000007',
   '0df2cf51-0f1b-4709-ab21-312298246d58', -- Margarida
   'fec7b09f-5c10-4c3a-b1fc-3e2260dde838', -- Berlingo
   current_date - interval '1 day',
   'concluida',
   'Manutenção semanal regular.');

insert into manutencao_colaborador (manutencao_id, colaborador_id) values
  ('d1000007-0000-0000-0000-000000000007', '00edded7-4bbe-452d-842a-01120b7e0b09');

insert into execucao (id, manutencao_id, concluido_por, observacoes, concluido_em) values
  ('c1000002-0000-0000-0000-000000000002',
   'd1000007-0000-0000-0000-000000000007',
   '00edded7-4bbe-452d-842a-01120b7e0b09',
   'Corte de relva e limpeza de calçada. Substituído 1 aspersor danificado.',
   now() - interval '1 day');

insert into item_faturavel (execucao_id, descricao, quantidade, faturado, faturado_em) values
  ('c1000002-0000-0000-0000-000000000002', 'Aspersor pop-up 1804 Rain Bird', '1 un', true, current_date);


-- 6. AGENDA DE AMANHÃ (CURRENT_DATE + 1)
insert into manutencao (id, jardim_id, veiculo_id, data, status, observacoes_planeamento) values
  ('d1000008-0000-0000-0000-000000000008',
   '1eb614bd-e693-4a0a-89d9-7a77918678b0', -- Tatjana
   'fec7b09f-5c10-4c3a-b1fc-3e2260dde838', -- Berlingo
   current_date + interval '1 day',
   'agendada',
   'Corte de relva semanal e desmatação leve no talude.'),

  ('d1000009-0000-0000-0000-000000000009',
   '90ba42d9-bede-46b4-92e8-74a36a3921f4', -- Tamara
   'fec7b09f-5c10-4c3a-b1fc-3e2260dde838', -- Berlingo
   current_date + interval '1 day',
   'agendada',
   'Manutenção do relvado e limpeza de folhas.'),

  ('d1000010-0000-0000-0000-000000000010',
   'cf732f9f-09d2-4c20-b0e4-9cb2a7129078', -- Óbidos Sr. Duarte
   'f277dcba-7e34-43f7-bee3-78a1d57c1026', -- Toyota
   current_date + interval '1 day',
   'agendada',
   'Serviço atrasado — prioridade da manhã.'),

  ('d1000011-0000-0000-0000-000000000011',
   '2b4dd9d2-c816-486f-be8d-2e6004e7a30f', -- Moinho
   'f277dcba-7e34-43f7-bee3-78a1d57c1026', -- Toyota
   current_date + interval '1 day',
   'agendada',
   'Limpeza perimetral e revisão de rega.');

-- Equipa para amanhã
insert into manutencao_colaborador (manutencao_id, colaborador_id) values
  ('d1000008-0000-0000-0000-000000000008', '00edded7-4bbe-452d-842a-01120b7e0b09'),
  ('d1000008-0000-0000-0000-000000000008', 'f856e0a2-e81c-4416-be13-c46248947c1b'),
  ('d1000009-0000-0000-0000-000000000009', '00edded7-4bbe-452d-842a-01120b7e0b09'),
  ('d1000009-0000-0000-0000-000000000009', 'f856e0a2-e81c-4416-be13-c46248947c1b'),
  ('d1000010-0000-0000-0000-000000000010', 'b0bca27b-cfcd-4d6c-96b2-b4731657e8a9'),
  ('d1000010-0000-0000-0000-000000000010', 'e55c60ee-3a76-4e3f-9b85-3b76c37a4b4b'),
  ('d1000011-0000-0000-0000-000000000011', 'b0bca27b-cfcd-4d6c-96b2-b4731657e8a9'),
  ('d1000011-0000-0000-0000-000000000011', 'e55c60ee-3a76-4e3f-9b85-3b76c37a4b4b');


-- 7. AGENDA DE DEPOIS DE AMANHÃ (CURRENT_DATE + 2)
insert into manutencao (id, jardim_id, veiculo_id, data, status, observacoes_planeamento) values
  ('d1000012-0000-0000-0000-000000000012',
   'eab3c774-8769-43e1-8d0a-7029bc30adb4', -- Sol
   'fec7b09f-5c10-4c3a-b1fc-3e2260dde838', -- Berlingo
   current_date + interval '2 days',
   'agendada',
   'Manutenção semanal habitual.'),

  ('d1000013-0000-0000-0000-000000000013',
   '142abfd6-0e49-493b-9aa6-7cdd050f0e15', -- Deepack
   'fec7b09f-5c10-4c3a-b1fc-3e2260dde838', -- Berlingo
   current_date + interval '2 days',
   'agendada',
   'Aparo de sebes laterais e corte de relva.'),

  ('d1000014-0000-0000-0000-000000000014',
   '7d445163-e9f4-46d8-9cc1-54b1eec8c43f', -- Óbidos vizinho costa
   'f277dcba-7e34-43f7-bee3-78a1d57c1026', -- Toyota
   current_date + interval '2 days',
   'agendada',
   'Aparar heras e limpeza geral.');

insert into manutencao_colaborador (manutencao_id, colaborador_id) values
  ('d1000012-0000-0000-0000-000000000012', '00edded7-4bbe-452d-842a-01120b7e0b09'),
  ('d1000012-0000-0000-0000-000000000012', 'f856e0a2-e81c-4416-be13-c46248947c1b'),
  ('d1000013-0000-0000-0000-000000000013', '00edded7-4bbe-452d-842a-01120b7e0b09'),
  ('d1000013-0000-0000-0000-000000000013', 'f856e0a2-e81c-4416-be13-c46248947c1b'),
  ('d1000014-0000-0000-0000-000000000014', 'b0bca27b-cfcd-4d6c-96b2-b4731657e8a9'),
  ('d1000014-0000-0000-0000-000000000014', 'e55c60ee-3a76-4e3f-9b85-3b76c37a4b4b');


-- 8. RECALCULAR STATUS DE TODOS OS JARDINS
select recalcular_status_jardins();

-- Fim do script de demonstração.
