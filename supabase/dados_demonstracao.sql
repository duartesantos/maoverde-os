-- ============================================================
--  Jardins d'Óbidos — Dados de Demonstração / Apresentação
-- ============================================================
--  Este script prepara a aplicação para uma demonstração com o cliente/patrão.
--  Utiliza datas dinâmicas relativas a CURRENT_DATE para que o Dashboard,
--  o Planeamento e a Ficha de Jardim exibam um histórico realista e contínuo,
--  com notas operacionais genuínas e sem repetições artificiais.
--
--  Como correr:
--  1. Abrir o Supabase -> SQL Editor -> New Query
--  2. Colar o conteúdo deste ficheiro e clicar em "Run"
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
    notas = 'Regar canteiros de hortênsias com especial atenção. Casca de pinho nos canteiros da frente.',
    proxima_manutencao = current_date + interval '1 day',
    status = 'urgente'
where id = '618c319a-afcc-45c9-9b2a-db83bbd6d585'; -- Marion Walksperia (West Cliffs)

update jardim
set morada_rua = 'Rua das Flores, 8',
    morada_cidade = 'Óbidos',
    morada_codigo_postal = '2510-001 Óbidos',
    notas = 'Cliente solicita corte quinzenal. Zona sombreada norte tem tendência a criar musgo.',
    frequencia = 'quinzenal',
    proxima_manutencao = current_date - interval '3 days',
    status = 'atrasado'
where id = 'cf732f9f-09d2-4c20-b0e4-9cb2a7129078'; -- Óbidos Sr. Duarte

update jardim
set morada_rua = 'Estrada Principal, Quinta da Vigia',
    morada_cidade = 'Óbidos',
    morada_codigo_postal = '2510-045 Óbidos',
    notas = 'Propriedade de grande porte com plano rotativo anual em 4 etapas.',
    tem_plano_rotativo = true,
    proxima_manutencao = current_date,
    status = 'ok'
where id = '63b19ce3-f7fb-418f-b687-6fbffc74200c'; -- Sr. João Suiço (Volta Óbidos)

update jardim
set morada_rua = 'Rua do Miradouro, 5',
    morada_cidade = 'Foz do Arelho',
    morada_codigo_postal = '2500-480 Caldas da Rainha',
    notas = 'Talude com inclinação acentuada nas traseiras. Verificar programador na garagem.',
    proxima_manutencao = current_date + interval '6 days',
    status = 'ok'
where id = '0df2cf51-0f1b-4709-ab21-312298246d58'; -- Margarida (Volta do mar)

update jardim
set morada_rua = 'Casal dos Cucos, Lote 3',
    morada_cidade = 'Nadadouro',
    morada_codigo_postal = '2500-501 Caldas da Rainha',
    proxima_manutencao = current_date + interval '7 days',
    status = 'ok'
where id = '826fe742-8504-47f4-b6ce-98e5e85ad5b3'; -- Comandante (Volta do mar)

-- 3. CONFIGURAR PLANO ROTATIVO (Sr. João Suiço)
delete from etapa_rotativa where jardim_id = '63b19ce3-f7fb-418f-b687-6fbffc74200c';

insert into etapa_rotativa (id, jardim_id, ordem, instrucoes) values
  ('e1000001-0000-0000-0000-000000000001', '63b19ce3-f7fb-418f-b687-6fbffc74200c', 1, 'Corte geral de relva e limpeza profunda de calçadas e canteiros'),
  ('e1000002-0000-0000-0000-000000000002', '63b19ce3-f7fb-418f-b687-6fbffc74200c', 2, 'Poda técnica de sebes perimetrais e arbustos altos com tesourão telescópico'),
  ('e1000003-0000-0000-0000-000000000003', '63b19ce3-f7fb-418f-b687-6fbffc74200c', 3, 'Adubação de relvados, escarificação e controlo preventivo de infestantes'),
  ('e1000004-0000-0000-0000-000000000004', '63b19ce3-f7fb-418f-b687-6fbffc74200c', 4, 'Revisão integral do sistema de rega automática e afinação de aspersores');

update jardim
set etapa_atual_id = 'e1000002-0000-0000-0000-000000000002'
where id = '63b19ce3-f7fb-418f-b687-6fbffc74200c';


-- ============================================================
-- 4. HISTÓRICO ANTERIOR (Visitas concluídas nas últimas semanas)
--    Cria um histórico realista de terreno visível na Ficha de Jardim
--    e nas "Observações Anteriores" do planeamento.
-- ============================================================

-- --- Ulrich: Visita há 14 dias (concluída) ---
insert into manutencao (id, jardim_id, veiculo_id, data, status, observacoes_planeamento) values
  ('d1000020-0000-0000-0000-000000000020',
   '835e1459-7722-478d-bf1f-58bbc8fb1f4c', -- Ulrich
   'fec7b09f-5c10-4c3a-b1fc-3e2260dde838', -- Berlingo
   current_date - interval '14 days',
   'concluida',
   'Corte de relvado geral e corte de bordaduras junto à piscina.');

insert into manutencao_colaborador (manutencao_id, colaborador_id) values
  ('d1000020-0000-0000-0000-000000000020', '00edded7-4bbe-452d-842a-01120b7e0b09'); -- Hélio

insert into execucao (id, manutencao_id, concluido_por, observacoes, concluido_em) values
  ('c1000020-0000-0000-0000-000000000020',
   'd1000020-0000-0000-0000-000000000020',
   '00edded7-4bbe-452d-842a-01120b7e0b09',
   'Corte de relva concluído. Detetámos que o aspersor de canto do setor 2 está com o bico rachado e a perder pressão. Foi desligado provisoriamente.',
   now() - interval '14 days');

insert into item_faturavel (execucao_id, descricao, quantidade, faturado, faturado_em) values
  ('c1000020-0000-0000-0000-000000000020', 'Aspersor Rain Bird 1804', '1 un', true, current_date - interval '14 days');

-- --- Ulrich: Visita há 7 dias (concluída) ---
insert into manutencao (id, jardim_id, veiculo_id, data, status, observacoes_planeamento) values
  ('d1000021-0000-0000-0000-000000000021',
   '835e1459-7722-478d-bf1f-58bbc8fb1f4c', -- Ulrich
   'fec7b09f-5c10-4c3a-b1fc-3e2260dde838', -- Berlingo
   current_date - interval '7 days',
   'concluida',
   'Substituir o aspersor avariado do setor 2 (assinalado na semana passada) e corte semanal habitual.');

insert into manutencao_colaborador (manutencao_id, colaborador_id) values
  ('d1000021-0000-0000-0000-000000000021', '00edded7-4bbe-452d-842a-01120b7e0b09'),
  ('d1000021-0000-0000-0000-000000000021', 'f856e0a2-e81c-4416-be13-c46248947c1b');

insert into execucao (id, manutencao_id, concluido_por, observacoes, concluido_em) values
  ('c1000021-0000-0000-0000-000000000021',
   'd1000021-0000-0000-0000-000000000021',
   '00edded7-4bbe-452d-842a-01120b7e0b09',
   'Aspersor substituído e afinação do raio efetuada. Setor testado sem fugas. Canteiros floridos precisam de adubação azul na próxima visita.',
   now() - interval '7 days');

-- --- Sr. João Suiço: Visita há 14 dias (concluída — Etapa 1 do Plano Rotativo) ---
insert into manutencao (id, jardim_id, veiculo_id, data, status, observacoes_planeamento) values
  ('d1000022-0000-0000-0000-000000000022',
   '63b19ce3-f7fb-418f-b687-6fbffc74200c', -- Sr. João Suiço
   'f277dcba-7e34-43f7-bee3-78a1d57c1026', -- Toyota
   current_date - interval '14 days',
   'concluida',
   'Arranque do Plano Rotativo: Executar Etapa 1 (limpeza intensiva de calçadas e canteiros centrais).');

insert into manutencao_colaborador (manutencao_id, colaborador_id) values
  ('d1000022-0000-0000-0000-000000000022', 'b0bca27b-cfcd-4d6c-96b2-b4731657e8a9'); -- Sábio

insert into execucao (id, manutencao_id, concluido_por, observacoes, concluido_em) values
  ('c1000022-0000-0000-0000-000000000022',
   'd1000022-0000-0000-0000-000000000022',
   'b0bca27b-cfcd-4d6c-96b2-b4731657e8a9',
   'Etapa 1 concluída na totalidade. Retiradas infestantes entre as juntas da calçada e podadas as hastes secas dos buxos. Para a Etapa 2 será necessário tesourão telescópico para as sebes altas.',
   now() - interval '14 days');

-- --- Fresh: Visita há 7 dias (concluída) ---
insert into manutencao (id, jardim_id, veiculo_id, data, status, observacoes_planeamento) values
  ('d1000023-0000-0000-0000-000000000023',
   '3fb88b4c-8ba9-4a3d-b389-2731a58542ea', -- Fresh
   'fec7b09f-5c10-4c3a-b1fc-3e2260dde838', -- Berlingo
   current_date - interval '7 days',
   'concluida',
   'Corte semanal e sopro de carumas caídas dos pinheiros.');

insert into manutencao_colaborador (manutencao_id, colaborador_id) values
  ('d1000023-0000-0000-0000-000000000023', 'f856e0a2-e81c-4416-be13-c46248947c1b'); -- Gabriel

insert into execucao (id, manutencao_id, concluido_por, observacoes, concluido_em) values
  ('c1000023-0000-0000-0000-000000000023',
   'd1000023-0000-0000-0000-000000000023',
   'f856e0a2-e81c-4416-be13-c46248947c1b',
   'Muita acumulação de carumas no telheiro e no relvado. Enchemos 4 sacas mas não foi suficiente. Recomenda-se trazer big bags reforçados na próxima visita.',
   now() - interval '7 days');

-- --- Margarida: Visita de Ontem (concluída) ---
insert into manutencao (id, jardim_id, veiculo_id, data, status, observacoes_planeamento) values
  ('d1000007-0000-0000-0000-000000000007',
   '0df2cf51-0f1b-4709-ab21-312298246d58', -- Margarida
   'fec7b09f-5c10-4c3a-b1fc-3e2260dde838', -- Berlingo
   current_date - interval '1 day',
   'concluida',
   'Corte habitual e substituição de pilha de 9V do programador de rega.');

insert into manutencao_colaborador (manutencao_id, colaborador_id) values
  ('d1000007-0000-0000-0000-000000000007', '00edded7-4bbe-452d-842a-01120b7e0b09');

insert into execucao (id, manutencao_id, concluido_por, observacoes, concluido_em) values
  ('c1000002-0000-0000-0000-000000000002',
   'd1000007-0000-0000-0000-000000000007',
   '00edded7-4bbe-452d-842a-01120b7e0b09',
   'Corte de relva concluído e limpeza de calçada. Pilha de 9V do relógio de rega substituída com sucesso. Rega testada e funcional.',
   now() - interval '1 day');

insert into item_faturavel (execucao_id, descricao, quantidade, faturado, faturado_em) values
  ('c1000002-0000-0000-0000-000000000002', 'Pilha alcalina 9V industrial', '1 un', true, current_date - interval '1 day');

-- --- Óbidos Sr. Duarte: Visita há 18 dias (concluída — justifica o estado 'atrasado') ---
insert into manutencao (id, jardim_id, veiculo_id, data, status, observacoes_planeamento) values
  ('d1000024-0000-0000-0000-000000000024',
   'cf732f9f-09d2-4c20-b0e4-9cb2a7129078', -- Óbidos Sr. Duarte
   'f277dcba-7e34-43f7-bee3-78a1d57c1026', -- Toyota
   current_date - interval '18 days',
   'concluida',
   'Manutenção quinzenal e aparo de hera no muro de pedra.');

insert into manutencao_colaborador (manutencao_id, colaborador_id) values
  ('d1000024-0000-0000-0000-000000000024', 'b0bca27b-cfcd-4d6c-96b2-b4731657e8a9');

insert into execucao (id, manutencao_id, concluido_por, observacoes, concluido_em) values
  ('c1000024-0000-0000-0000-000000000024',
   'd1000024-0000-0000-0000-000000000024',
   'b0bca27b-cfcd-4d6c-96b2-b4731657e8a9',
   'Corte e aparo efetuados. O relvado na zona norte está com muito musgo e ervas daninhas. Recomenda-se escarificação profunda e adubo com sulfato de ferro na próxima visita.',
   now() - interval '18 days');


-- ============================================================
-- 5. MANUTENÇÕES DE HOJE (CURRENT_DATE)
--    Trabalhos do dia atual com notas operacionais contextualizadas.
-- ============================================================

-- --- Carrinha 1: Berlingo (Hélio & Gabriel) ---

-- Trabalho 1 (Concluído hoje de manhã — destaque visual verde suave!)
insert into manutencao (id, jardim_id, veiculo_id, data, status, observacoes_planeamento) values
  ('d1000001-0000-0000-0000-000000000001',
   '835e1459-7722-478d-bf1f-58bbc8fb1f4c', -- Ulrich
   'fec7b09f-5c10-4c3a-b1fc-3e2260dde838', -- Berlingo
   current_date,
   'concluida',
   'Aplicar 2 sacos de adubo azul nos canteiros floridos (ficou recomendado na semana passada) e corte de relva habitual.');

insert into manutencao_colaborador (manutencao_id, colaborador_id) values
  ('d1000001-0000-0000-0000-000000000001', '00edded7-4bbe-452d-842a-01120b7e0b09'), -- Hélio
  ('d1000001-0000-0000-0000-000000000001', 'f856e0a2-e81c-4416-be13-c46248947c1b'); -- Gabriel

insert into manutencao_material_extra (manutencao_id, descricao_material, quantidade) values
  ('d1000001-0000-0000-0000-000000000001', 'Sacos de adubo granulado azul 50L', 2);

insert into execucao (id, manutencao_id, concluido_por, observacoes, concluido_em) values
  ('c1000001-0000-0000-0000-000000000001',
   'd1000001-0000-0000-0000-000000000001',
   '00edded7-4bbe-452d-842a-01120b7e0b09',
   'Adubação azul concluída com sucesso em todos os canteiros (2 sacos aplicados). Relva cortada na altura 4 e bordaduras alinhadas com fio reforçado. O cliente confirmou que o aspersor arranjado na semana passada está perfeito.',
   now() - interval '2 hours');

insert into item_faturavel (execucao_id, descricao, quantidade, faturado) values
  ('c1000001-0000-0000-0000-000000000001', 'Adubo granulado azul 50L', '2 sacos', false),
  ('c1000001-0000-0000-0000-000000000001', 'Fio de roçadora reforçado', '1 rolo', false);

-- Trabalho 2 (Agendado para hoje — segundo trabalho da Berlingo)
insert into manutencao (id, jardim_id, veiculo_id, data, status, observacoes_planeamento) values
  ('d1000002-0000-0000-0000-000000000002',
   '3fb88b4c-8ba9-4a3d-b389-2731a58542ea', -- Fresh
   'fec7b09f-5c10-4c3a-b1fc-3e2260dde838', -- Berlingo
   current_date,
   'agendada',
   'Levar 4 big bags adicionais (pedido pelo Gabriel na semana passada) para recolha completa de carumas no telheiro e relvado.');

insert into manutencao_colaborador (manutencao_id, colaborador_id) values
  ('d1000002-0000-0000-0000-000000000002', '00edded7-4bbe-452d-842a-01120b7e0b09'),
  ('d1000002-0000-0000-0000-000000000002', 'f856e0a2-e81c-4416-be13-c46248947c1b');

insert into manutencao_material_extra (manutencao_id, descricao_material, quantidade) values
  ('d1000002-0000-0000-0000-000000000002', 'Big bags reforçados para biomassa', 4);

-- Trabalho 3 (Agendado para hoje — final de tarde)
insert into manutencao (id, jardim_id, veiculo_id, data, status, observacoes_planeamento) values
  ('d1000003-0000-0000-0000-000000000003',
   '7be9471f-fa8b-49b6-9987-f99dad089999', -- Joeri
   'fec7b09f-5c10-4c3a-b1fc-3e2260dde838', -- Berlingo
   current_date,
   'agendada',
   'Aparar sebes da entrada e regular abertura dos aspersores do setor frontal.');

insert into manutencao_colaborador (manutencao_id, colaborador_id) values
  ('d1000003-0000-0000-0000-000000000003', '00edded7-4bbe-452d-842a-01120b7e0b09'),
  ('d1000003-0000-0000-0000-000000000003', 'f856e0a2-e81c-4416-be13-c46248947c1b');


-- --- Carrinha 2: Toyota (Sábio & Miguel) ---

-- Trabalho 4 (Agendado para hoje — Etapa 2 do Plano Rotativo)
insert into manutencao (id, jardim_id, veiculo_id, data, status, observacoes_planeamento) values
  ('d1000004-0000-0000-0000-000000000004',
   '63b19ce3-f7fb-418f-b687-6fbffc74200c', -- Sr. João Suiço (Plano rotativo)
   'f277dcba-7e34-43f7-bee3-78a1d57c1026', -- Toyota
   current_date,
   'agendada',
   'Executar Etapa 2 do plano rotativo: Poda técnica de sebes perimetrais e arbustos altos com tesourão telescópico. Cuidado com iluminação embutida.');

insert into manutencao_colaborador (manutencao_id, colaborador_id) values
  ('d1000004-0000-0000-0000-000000000004', 'b0bca27b-cfcd-4d6c-96b2-b4731657e8a9'), -- Sábio
  ('d1000004-0000-0000-0000-000000000004', 'e55c60ee-3a76-4e3f-9b85-3b76c37a4b4b'); -- Miguel

insert into manutencao_material_extra (manutencao_id, descricao_material, quantidade) values
  ('d1000004-0000-0000-0000-000000000004', 'Tesourão telescópico de poda alta', 1);

-- Trabalho 5 (Agendado para hoje à tarde)
insert into manutencao (id, jardim_id, veiculo_id, data, status, observacoes_planeamento) values
  ('d1000005-0000-0000-0000-000000000005',
   '334aadcd-e603-4d16-a853-fe5fd6c424f5', -- Sobral
   'f277dcba-7e34-43f7-bee3-78a1d57c1026', -- Toyota
   current_date,
   'agendada',
   'Aparar buxos nas traseiras da habitação conforme indicação do cliente e corte geral de relvado.');

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
   'Serviço extra solicitado pelo cliente: levar 3 sacos de casca de pinho para teste nos canteiros da entrada.');


-- ============================================================
-- 6. AGENDA DE AMANHÃ (CURRENT_DATE + 1)
-- ============================================================
insert into manutencao (id, jardim_id, veiculo_id, data, status, observacoes_planeamento) values
  ('d1000008-0000-0000-0000-000000000008',
   '1eb614bd-e693-4a0a-89d9-7a77918678b0', -- Tatjana
   'fec7b09f-5c10-4c3a-b1fc-3e2260dde838', -- Berlingo
   current_date + interval '1 day',
   'agendada',
   'Corte de relva semanal e desmatação leve no talude junto à vedação.'),

  ('d1000009-0000-0000-0000-000000000009',
   '90ba42d9-bede-46b4-92e8-74a36a3921f4', -- Tamara
   'fec7b09f-5c10-4c3a-b1fc-3e2260dde838', -- Berlingo
   current_date + interval '1 day',
   'agendada',
   'Manutenção do relvado, corte de bordaduras e limpeza de folhas.'),

  ('d1000010-0000-0000-0000-000000000010',
   'cf732f9f-09d2-4c20-b0e4-9cb2a7129078', -- Óbidos Sr. Duarte
   'f277dcba-7e34-43f7-bee3-78a1d57c1026', -- Toyota
   current_date + interval '1 day',
   'agendada',
   'Prioridade da manhã (serviço atrasado há 18 dias): levar escarificador para remover musgo na zona norte conforme nota da visita anterior.'),

  ('d1000011-0000-0000-0000-000000000011',
   '2b4dd9d2-c816-486f-be8d-2e6004e7a30f', -- Moinho
   'f277dcba-7e34-43f7-bee3-78a1d57c1026', -- Toyota
   current_date + interval '1 day',
   'agendada',
   'Limpeza perimetral, corte de relvado e afinação da linha de rega.');

insert into manutencao_colaborador (manutencao_id, colaborador_id) values
  ('d1000008-0000-0000-0000-000000000008', '00edded7-4bbe-452d-842a-01120b7e0b09'),
  ('d1000008-0000-0000-0000-000000000008', 'f856e0a2-e81c-4416-be13-c46248947c1b'),
  ('d1000009-0000-0000-0000-000000000009', '00edded7-4bbe-452d-842a-01120b7e0b09'),
  ('d1000009-0000-0000-0000-000000000009', 'f856e0a2-e81c-4416-be13-c46248947c1b'),
  ('d1000010-0000-0000-0000-000000000010', 'b0bca27b-cfcd-4d6c-96b2-b4731657e8a9'),
  ('d1000010-0000-0000-0000-000000000010', 'e55c60ee-3a76-4e3f-9b85-3b76c37a4b4b'),
  ('d1000011-0000-0000-0000-000000000011', 'b0bca27b-cfcd-4d6c-96b2-b4731657e8a9'),
  ('d1000011-0000-0000-0000-000000000011', 'e55c60ee-3a76-4e3f-9b85-3b76c37a4b4b');


-- ============================================================
-- 7. AGENDA DE DEPOIS DE AMANHÃ (CURRENT_DATE + 2)
-- ============================================================
insert into manutencao (id, jardim_id, veiculo_id, data, status, observacoes_planeamento) values
  ('d1000012-0000-0000-0000-000000000012',
   'eab3c774-8769-43e1-8d0a-7029bc30adb4', -- Sol
   'fec7b09f-5c10-4c3a-b1fc-3e2260dde838', -- Berlingo
   current_date + interval '2 days',
   'agendada',
   'Manutenção semanal habitual e limpeza da calçada circundante.'),

  ('d1000013-0000-0000-0000-000000000013',
   '142abfd6-0e49-493b-9aa6-7cdd050f0e15', -- Deepack
   'fec7b09f-5c10-4c3a-b1fc-3e2260dde838', -- Berlingo
   current_date + interval '2 days',
   'agendada',
   'Aparo de sebes laterais e corte do relvado central.'),

  ('d1000014-0000-0000-0000-000000000014',
   '7d445163-e9f4-46d8-9cc1-54b1eec8c43f', -- Óbidos vizinho costa
   'f277dcba-7e34-43f7-bee3-78a1d57c1026', -- Toyota
   current_date + interval '2 days',
   'agendada',
   'Aparar heras no muro e limpeza geral de infestantes.');

insert into manutencao_colaborador (manutencao_id, colaborador_id) values
  ('d1000012-0000-0000-0000-000000000012', '00edded7-4bbe-452d-842a-01120b7e0b09'),
  ('d1000012-0000-0000-0000-000000000012', 'f856e0a2-e81c-4416-be13-c46248947c1b'),
  ('d1000013-0000-0000-0000-000000000013', '00edded7-4bbe-452d-842a-01120b7e0b09'),
  ('d1000013-0000-0000-0000-000000000013', 'f856e0a2-e81c-4416-be13-c46248947c1b'),
  ('d1000014-0000-0000-0000-000000000014', 'b0bca27b-cfcd-4d6c-96b2-b4731657e8a9'),
  ('d1000014-0000-0000-0000-000000000014', 'e55c60ee-3a76-4e3f-9b85-3b76c37a4b4b');


-- ============================================================
-- 8. RECALCULAR STATUS DE TODOS OS JARDINS
-- ============================================================
select recalcular_status_jardins();

-- Fim do script de demonstração.
