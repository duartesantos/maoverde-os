-- Inserção dos Kits Reais indicados pela gerência
-- Executar no SQL Editor do Supabase
-- Remove a coluna categoria caso ainda exista na tabela kit
alter table kit drop column if exists categoria;

do $$
declare
  id_cabine uuid;
  id_azul uuid;
  id_vermelho uuid;
  id_pulverizacao uuid;
begin
  -- 1. Kit: Ferramentas Bolsa Cabine
  select id into id_cabine from kit where nome = 'Ferramentas Bolsa Cabine';
  if id_cabine is null then
    insert into kit (nome, ativo)
    values ('Ferramentas Bolsa Cabine', true)
    returning id into id_cabine;
  end if;

  delete from kit_item where kit_id = id_cabine;
  insert into kit_item (kit_id, descricao_material, quantidade) values
    (id_cabine, 'Na bolsa (lá à frente) (Hélio)', null),
    (id_cabine, 'Tesoura', 1),
    (id_cabine, 'Espátulas para relva', null),
    (id_cabine, 'Chave de contador', 1),
    (id_cabine, 'Chave de fendas', 1),
    (id_cabine, 'Chave de estrelas', 1),
    (id_cabine, 'Chaves de aspersores', null);

  -- 2. Kit Manutenção Azul
  select id into id_azul from kit where nome = 'Kit Manutenção Azul';
  if id_azul is null then
    insert into kit (nome, ativo)
    values ('Kit Manutenção Azul', true)
    returning id into id_azul;
  end if;

  delete from kit_item where kit_id = id_azul;
  insert into kit_item (kit_id, descricao_material, quantidade) values
    (id_azul, 'Máquina de cortar relva', 1),
    (id_azul, 'Roçadora', 1),
    (id_azul, 'Soprador', 1),
    (id_azul, 'Canecos', 2),
    (id_azul, 'Sacas', 5),
    (id_azul, 'Big bags', 4),
    (id_azul, 'Enxadas pequenas', 2),
    (id_azul, 'Enxada grande', 1),
    (id_azul, 'Apanha folhas', 2),
    (id_azul, 'Pás de corte', 2);

  -- 3. Kit Manutenção Vermelho
  select id into id_vermelho from kit where nome = 'Kit Manutenção Vermelho';
  if id_vermelho is null then
    insert into kit (nome, ativo)
    values ('Kit Manutenção Vermelho', true)
    returning id into id_vermelho;
  end if;

  delete from kit_item where kit_id = id_vermelho;
  insert into kit_item (kit_id, descricao_material, quantidade) values
    (id_vermelho, 'Máquina de cortar relva', 1),
    (id_vermelho, 'Roçadora', 1),
    (id_vermelho, 'Soprador', 1),
    (id_vermelho, 'Canecos', 2),
    (id_vermelho, 'Sacas', 5),
    (id_vermelho, 'Big bags', 4),
    (id_vermelho, 'Enxadas pequenas', 2),
    (id_vermelho, 'Enxada grande', 1),
    (id_vermelho, 'Apanha folhas', 2),
    (id_vermelho, 'Pás de corte', 2);

  -- 4. Kit Pulverizações
  select id into id_pulverizacao from kit where nome = 'Kit Pulverizações';
  if id_pulverizacao is null then
    insert into kit (nome, ativo)
    values ('Kit Pulverizações', true)
    returning id into id_pulverizacao;
  end if;

  delete from kit_item where kit_id = id_pulverizacao;
  insert into kit_item (kit_id, descricao_material, quantidade) values
    (id_pulverizacao, 'Pulverizador (verificar pressão)', 1),
    (id_pulverizacao, 'Bateria do pulverizador (carregar)', 1),
    (id_pulverizacao, 'Produto fitofármaco (registar qual)', 1),
    (id_pulverizacao, 'EPI — luvas de proteção', 1),
    (id_pulverizacao, 'EPI — máscara de proteção', 1),
    (id_pulverizacao, 'EPI — óculos de proteção', 1),
    (id_pulverizacao, 'Fato de proteção', 1),
    (id_pulverizacao, 'Balde para preparação', 1),
    (id_pulverizacao, 'Fichas de segurança do produto', 1);

  -- 5. Elimina quaisquer outros kits antigos para deixar APENAS os 4 oficiais
  delete from kit
  where id not in (id_cabine, id_azul, id_vermelho, id_pulverizacao);

end $$;
