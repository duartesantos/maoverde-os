# Regra do projeto — Jardins d'Óbidos

Ativar como **Always On**.

Este é o sistema de gestão de jardinagem "Jardins d'Óbidos" (React + Vite +
TypeScript + Tailwind v4 + Supabase). Idioma do projeto: **português de Portugal**
(código, UI, comentários).

Antes de trabalhar, lê o contexto completo em **@/AGENTS.md** — cobre o produto,
o modelo de dados, as decisões já tomadas, o estado atual e o backlog.

Convenções obrigatórias:
- Todas as chamadas ao Supabase vivem em `src/data/queries.ts` (não espalhar pelos componentes).
- Estilo minimalista neutro; usa os tokens de cor de `src/index.css` (não inventar cores).
- Segue os mockups como referência de UI (link no AGENTS.md).
- Verifica com `npm run build` antes de concluir.
- Respeita as decisões já tomadas listadas no AGENTS.md (ex.: kits nomeados; cliente/jardim separados mas uma só aba; sem `premium`; sem aba Voltas; observações separadas da faturação).

## Manter o contexto atualizado

Sempre que fizeres uma mudança **estrutural** — nova tabela ou coluna, alteração
de uma decisão, um ecrã concluído (passa de backlog para "estado atual"), ou
mudança de convenção — **pergunta primeiro ao utilizador** se ele quer registar
essa mudança no `AGENTS.md`. Só atualizas o `AGENTS.md` **depois de ele
confirmar**. Nunca o alteres sem confirmação.
