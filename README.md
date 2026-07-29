# agentkit-backend

REST API for [AgentKit](https://github.com/RutvikMakvana4/agentkit-frontend) —
connect an existing Node.js backend, turn its APIs into AI tools, and run
agents that call them.

## Stack

Node.js · Express 5 · TypeScript (ESM) · Prisma 7 (driver adapters) ·
Supabase Postgres · OpenAI SDK · Zod

## Getting started

```bash
npm install
cp .env.example .env   # fill in OPENAI_API_KEY, DATABASE_URL, DIRECT_URL

npm run db:generate    # generates the Prisma client — do this first
npm run db:migrate     # creates the schema in your Supabase database
npm run db:seed        # seeds the "Customer Support Agent" (PRD's first agent)

npm run start:dev      # http://localhost:5000
```

## Architecture

```
Existing Node.js Function
        │
        ▼
   AgentKit Tool          (src/tools — code-registered, not DB rows)
        │
        ▼
   Agent Runner           (src/services/agentRunner.service.ts — the loop)
        │
        ▼
   Tool Call → Real Backend Result → Useful AI Response
```

The core loop lives in `agentRunner.service.ts`: load the agent's
instructions and enabled tools, call the LLM, and if it requests a tool,
execute it (with a timeout) and feed the result back — repeating up to
`MAX_AGENT_ITERATIONS` times. It never throws; a failed run still returns a
full trace so the failure is persisted and debuggable, not silently lost.

## Adding a new tool

Tools are code, not database rows — this is deliberate (see `prisma/schema.prisma`'s
comment on why `Agent.tools` is a JSON column, not a relational join). To add one:

1. Create `src/tools/yourTool.tool.ts` following the pattern in `getOrder.tool.ts`
2. Register it in `src/tools/index.ts`
3. It's now selectable from any agent via `GET /api/tools`

## Routes

**Internal (used by agentkit-frontend, no auth):**

| Route | Description |
|---|---|
| `GET/POST/PATCH/DELETE /api/agents` | Agent CRUD |
| `POST /api/agents/:id/chat` | Non-streaming chat |
| `GET /api/agents/:id/chat/stream` | SSE streaming chat (`?message=...`) |
| `GET /api/agents/:id/executions` | Execution history for one agent |
| `GET /api/tools` | Registered tools |
| `GET/POST/DELETE /api/executions`, `/api/api-keys` | Execution/API-key management |

**Public (API-key authenticated, for calling a deployed agent from your own app):**

| Route | Description |
|---|---|
| `POST /api/v1/agents/:id/run` | `Authorization: Bearer ak_live_...` |

Both chat endpoints accept an optional `conversationId` — omit it to start a
fresh conversation (its id comes back on the response / as an SSE
`conversation_started` frame), or pass one back to continue that thread with
full prior-turn context.

## Environment variables

See `.env.example`. Two connection strings are required for Supabase:
`DATABASE_URL` (pooled, port 6543 — used by the running app) and
`DIRECT_URL` (direct, port 5432 — used only by Prisma migrations).

## Known limitations

- No authentication/authorization beyond API keys scoped to the public
  agent-run endpoint — the internal `/api` routes are wide open, since
  they're only meant to be called by `agentkit-frontend` on a trusted network.
- Tool timeout/max-iteration limits are process-wide (`.env`), not
  per-agent yet.
- No `@agentkit/node` SDK or OpenAPI-import yet — both are explicitly
  post-MVP per the PRD.
