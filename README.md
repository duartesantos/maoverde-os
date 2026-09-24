# Jardins d'Óbidos — Sistema de Gestão

Aplicação de gestão de serviços de jardinagem (React + Vite + Supabase).
Coordena a gerência (patrão) e a equipa de jardineiros. Mobile-first.

## O que já está feito

- **Autenticação** com Supabase Auth (login por email/palavra-passe).
- **Navegação responsiva**: barra lateral no computador, separadores no telemóvel.
- **Ecrãs ligados a dados reais**: Dashboard, Clientes (lista cliente → jardins),
  Ficha de Jardim (com plano rotativo e histórico).
- **Base de dados** completa (12 tabelas) + RLS por perfil + dados de exemplo.
- Planeamento, Veículos e Relatórios estão como espaços reservados — são os
  próximos ecrãs a construir.

## 1. Configurar o Supabase

1. Cria um projeto em [supabase.com](https://supabase.com).
2. No **SQL Editor**, corre por esta ordem (copia cada ficheiro e faz *Run*):
   1. `supabase/schema.sql` — cria as tabelas.
   2. `supabase/auth_and_rls.sql` — trigger de contas + segurança (RLS).
   3. `supabase/seed.sql` — dados de exemplo (opcional, mas recomendado para veres a app com conteúdo).
3. Cria a **conta do patrão**: *Authentication → Users → Add user* com o email
   `raquel@jardinsobidos.pt` (o mesmo do seed) e uma palavra-passe à tua escolha.
   O trigger liga automaticamente essa conta ao colaborador "Raquel Lopes".
   > Para ela entrar como **patrão**, no *Add user* põe o *User Metadata* como
   > `{ "nome": "Raquel Lopes", "tipo": "patrao" }` — ou, como o email já existe no
   > seed com `tipo = 'patrao'`, basta o email coincidir.
4. Em *Project Settings → API*, copia o **Project URL** e a **anon public key**.

## 2. Correr localmente

```bash
npm install
cp .env.example .env      # e preenche VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm run dev
```

Abre o endereço que o Vite mostrar e entra com a conta do patrão.

## Estrutura

```
src/
  auth/          AuthContext (sessão + perfil de colaborador)
  components/    Layout (navegação) + ui (peças reutilizáveis)
  data/          queries.ts (leituras ao Supabase)
  lib/           supabase.ts, useAsync, format
  pages/         Login, Dashboard, Clientes, Jardim, Placeholder
  types/db.ts    tipos que espelham o schema
supabase/        schema.sql, auth_and_rls.sql, seed.sql
```

## Próximos passos

- Ecrã de **Planeamento** (calendário + agendar/remarcar).
- Formulários de **Novo/Editar jardim** (com seletor de volta) e **manutenção**
  (kit da carrinha + materiais extra).
- **Registar execução** (observações + itens a faturar) no telemóvel.
- **Relatório semanal** e vista de **faturação** por cliente.
- Afinar as políticas de RLS por perfil (o ficheiro atual é um ponto de partida).
