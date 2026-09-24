-- ============================================================
--  RESET — apaga as tabelas do sistema e TODOS os dados que contêm.
--  Correr SÓ para recriar o esquema do zero (fase de arranque).
--  Depois: schema.sql -> auth_and_rls.sql -> seed.sql
-- ============================================================
drop table if exists
  item_faturavel, execucao, manutencao_material_extra, manutencao_colaborador,
  manutencao, veiculo_kit, kit_item, kit, material_kit, etapa_rotativa,
  jardim, colaborador, veiculo, volta, cliente
  cascade;
drop function if exists handle_new_user() cascade;
drop function if exists is_patrao() cascade;
drop function if exists set_atualizado_em() cascade;
