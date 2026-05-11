import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { EnvConfig } from "../../config/env.schema.js";
import {
  aiStudioIntentSchema,
  type AiStudioIntent,
} from "../schemas/recommendation.schema.js";

const systemPrompt = `Ты — Senior Cloud Solutions Architect и бизнес-аналитик в Т1 Облако. Твоя задача — проанализировать свободный текстовый запрос клиента, понять его бизнес-логику (даже если она описана простыми словами) и перевести её в структурированный JSON.

Этот JSON будет использоваться детерминированным Python-движком для жесткой фильтрации, символьного матчинга (Jaccard Index) и векторного поиска (Sentence-BERT).

ПРАВИЛА АНАЛИЗА И "ТЕЛЕПАТИИ" (Эвристики):
1. Определи primary_service_type — основной тип услуги, которую ищет клиент. Используй канонические значения: "virtual_server", "managed_kubernetes", "managed_database", "object_storage", "cloud_backup", "load_balancer", "cdn", "waf", "message_queue", "api_gateway", "bare_metal", "gpu_server".
2. Если пользователь пишет "облачный сервер", "виртуальная машина", "ВМ", "сервер для backend", "backend-сервер" -> primary_service_type: "virtual_server".
3. Если пользователь указывает CPU/RAM/disk, ОБЯЗАТЕЛЬНО извлеки числа в resource_requirements: cpu_min, ram_gb_min, disk_gb_min. Не теряй эти ограничения и не оставляй их только в semantic_query.
4. Для SSD-диска ставь resource_requirements.disk_type: "ssd". Если пользователь просит быстрый диск, IOPS, production под нагрузкой или стабильность важнее цены -> high_iops_preferred: true.
5. Защита и 152-ФЗ: Если упомянуты "пользователи", "паспорта", "медицина", "оплата", "РФ", "Россия", "госсектор", "152-ФЗ", "персональные данные", "безопасно" -> requires_152fz: true. Если упомянута Россия/РФ, ставь country: "RU".
6. WAF добавляй только если есть публичное web-приложение, личный кабинет, формы, платежи, HTTP/API под атаками или явное требование защиты web-трафика. Не добавляй WAF только из-за 152-ФЗ.
7. Managed Database добавляй только если явно упомянуты база данных, PostgreSQL, MySQL, ClickHouse, MongoDB, Redis как хранилище данных. Не добавляй Managed Database для обычного backend-сервера без упоминания БД.
8. "Резервные копии", "бэкап", "backup", "восстановление" -> workload.backup_required: true и inferred_needs добавь "cloud_backup".
9. "Стабильная сеть", "production", "надежность", "нагрузка" -> workload.stage: "production", workload.stable_network_required: true. Load Balancer добавляй в optional_needs, если не сказано явно про балансировку, горизонтальное масштабирование или несколько инстансов.
10. "Пет-проект, MVP, стартап" -> budget_priority: "min_price" или "balanced", inferred_needs: "managed", "serverless". "production", "enterprise", "стабильность важнее цены" -> budget_priority: "performance_over_min_price".
11. Используй канонические теги в explicit_needs, inferred_needs и optional_needs: "virtual_server", "backend", "production", "ssd", "high_iops_ssd", "cloud_backup", "load_balancer", "managed_database", "object_storage", "kubernetes", "waf", "cdn", "152-fz", "ru".

ПРАВИЛА ГЕНЕРАЦИИ SEMANTIC QUERY:
Ты должен написать 2-3 связных предложения (на русском языке), которые профессионально описывают архитектуру проекта.
Включи в этот текст как явно упомянутые технологии, так и выявленные тобой скрытые потребности. НЕ используй JSON-форматирование или списки в этом поле, только связный текст.

ФОРМАТ ОТВЕТА:
Исключительно валидный JSON. Без маркдауна, без вводных слов.

СХЕМА JSON:
{
  "task_type": "string",
  "primary_service_type": "string" | null,
  "requires_152fz": boolean,
  "budget_max_rub": number | null,
  "budget_priority": "min_price" | "balanced" | "performance_over_min_price" | null,
  "region": "string" | null,
  "country": "string" | null,
  "resource_requirements": {
    "cpu_min": number | null,
    "ram_gb_min": number | null,
    "disk_gb_min": number | null,
    "disk_type": "string" | null,
    "high_iops_preferred": boolean
  },
  "workload": {
    "stage": "string" | null,
    "availability": "string" | null,
    "backup_required": boolean,
    "stable_network_required": boolean
  },
  "explicit_needs": ["string"],
  "extracted_tech_stack": ["string"],
  "inferred_needs": ["string"],
  "optional_needs": ["string"],
  "semantic_query": "string",
  "reasoning_summary": "string"
}`;

type ResponsesApiPayload = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
};

@Injectable()
export class YandexAiStudioClient {
  constructor(private readonly config: ConfigService<EnvConfig, true>) {}

  async extractIntent(input: string): Promise<{ intent: AiStudioIntent; raw: unknown }> {
    const apiKey = this.config.get("YANDEX_AI_STUDIO_API_KEY", { infer: true });
    const promptId = this.config.get("YANDEX_AI_STUDIO_PROMPT_ID", { infer: true });
    const projectId = this.config.get("YANDEX_AI_STUDIO_PROJECT_ID", { infer: true });
    const baseUrl = this.config.get("YANDEX_AI_STUDIO_BASE_URL", { infer: true });

    const missing = [
      ["YANDEX_AI_STUDIO_API_KEY", apiKey],
      ["YANDEX_AI_STUDIO_PROMPT_ID", promptId],
      ["YANDEX_AI_STUDIO_PROJECT_ID", projectId],
    ]
      .filter(([, value]) => !value)
      .map(([name]) => name);

    if (missing.length > 0) {
      throw new Error(`Missing AI Studio env vars in live mode: ${missing.join(", ")}`);
    }

    const resolvedApiKey = apiKey as string;
    const resolvedPromptId = promptId as string;
    const resolvedProjectId = projectId as string;

    const response = await fetch(`${baseUrl}/responses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resolvedApiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Project": resolvedProjectId,
      },
      body: JSON.stringify({
        prompt: {
          id: resolvedPromptId,
        },
        instructions: systemPrompt,
        input,
      }),
    });

    const raw = (await response.json().catch(() => ({}))) as ResponsesApiPayload & {
      error?: { message?: string };
    };

    if (!response.ok) {
      throw new Error(raw.error?.message ?? `Yandex AI Studio request failed: ${response.status}`);
    }

    const outputText = this.extractOutputText(raw);
    const parsedJson = JSON.parse(this.stripJsonFence(outputText)) as unknown;
    const intent = aiStudioIntentSchema.parse(parsedJson);

    return { intent, raw };
  }

  private extractOutputText(payload: ResponsesApiPayload): string {
    if (payload.output_text) {
      return payload.output_text;
    }

    const chunks = (payload.output ?? [])
      .flatMap((item) => item.content ?? [])
      .map((content) => content.text)
      .filter((text): text is string => Boolean(text));

    const outputText = chunks.join("\n").trim();
    if (!outputText) {
      throw new Error("Yandex AI Studio response does not contain output_text");
    }

    return outputText;
  }

  private stripJsonFence(value: string): string {
    return value
      .trim()
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/i, "")
      .trim();
  }
}
