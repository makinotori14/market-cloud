# Cloud Solution Recommender

Industrial-style local prototype for prompt-based cloud solution recommendations.

## Stack

- Frontend: Next.js, React, TypeScript, TanStack Query, Tailwind CSS, shadcn-style local UI components
- Backend: NestJS, Fastify, PostgreSQL, Redis/BullMQ, Zod, OpenAPI, OpenTelemetry
- Cloud-shaped local infra: Docker Compose with PostgreSQL, Redis, backend, frontend

The production-like flow uses Yandex AI Studio for intent extraction and a Python Sentence-BERT ranker for provider-service matching. Stub mode is still available through `YANDEX_CLOUD_API_MODE=stub`.

## Local Run

```bash
docker compose -f infra/docker-compose.yml up --build
```

For live AI Studio mode, create `.env` from `.env.example` and set:

```bash
YANDEX_CLOUD_API_MODE=live
YANDEX_AI_STUDIO_API_KEY=...
YANDEX_AI_STUDIO_PROJECT_ID=b1ge3ol7tsbh55ut2v4c
YANDEX_AI_STUDIO_PROMPT_ID=fvtsn39lkfeold9h0rfv
```

Then open:

- Frontend: http://localhost:3000
- Backend health: http://localhost:3001/health
- Swagger/OpenAPI: http://localhost:3001/docs
- Ranker health: http://localhost:8000/health

## Request Flow

1. User submits a prompt in the frontend.
2. Backend creates a recommendation request in PostgreSQL.
3. Backend enqueues processing in BullMQ/Redis.
4. Worker sends the user prompt to Yandex AI Studio Responses API.
5. AI Studio returns structured JSON intent.
6. Backend sends the intent to the Python ranker.
7. Ranker loads provider JSON files, builds Sentence-BERT vectors, applies hard filters, Jaccard matching, semantic scoring and budget scoring.
8. Backend validates, sorts by `finalScore`, stores the result in PostgreSQL, and the frontend polls until `completed`.
