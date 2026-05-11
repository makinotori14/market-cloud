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
2. Если пользователь пишет "VPS", "VDS", "ВПС", "ВДС", "облачный сервер", "виртуальная машина", "ВМ", "сервер для backend", "backend-сервер" -> primary_service_type: "virtual_server".
3. Если пользователь указывает CPU/RAM/disk, ОБЯЗАТЕЛЬНО извлеки числа в resource_requirements: cpu_min, ram_gb_min, disk_gb_min. Не теряй эти ограничения и не оставляй их только в semantic_query.
4. Для SSD-диска ставь resource_requirements.disk_type: "ssd". Если пользователь просит быстрый диск, IOPS, production под нагрузкой или стабильность важнее цены -> high_iops_preferred: true.
5. Защита и 152-ФЗ: Если упомянуты "пользователи", "паспорта", "медицина", "оплата", "РФ", "Россия", "госсектор", "152-ФЗ", "персональные данные", "безопасно" -> requires_152fz: true. Если упомянута Россия/РФ, ставь country: "RU".
6. WAF добавляй только если есть публичное web-приложение, личный кабинет, формы, платежи, HTTP/API под атаками или явное требование защиты web-трафика. Не добавляй WAF только из-за 152-ФЗ.
7. Managed Database добавляй только если явно упомянуты база данных, PostgreSQL, MySQL, ClickHouse, MongoDB, Redis как хранилище данных. Не добавляй Managed Database для обычного backend-сервера без упоминания БД.
8. "Резервные копии", "бэкап", "backup", "восстановление" -> workload.backup_required: true и inferred_needs добавь "cloud_backup".
9. "Стабильная сеть", "production", "надежность", "нагрузка" -> workload.stage: "production", workload.stable_network_required: true. Load Balancer добавляй в optional_needs, если не сказано явно про балансировку, горизонтальное масштабирование или несколько инстансов.
10. "Пет-проект, MVP, стартап" -> budget_priority: "min_price" или "balanced", inferred_needs: "managed", "serverless". "production", "enterprise", "стабильность важнее цены" -> budget_priority: "performance_over_min_price".
11. Используй канонические теги в explicit_needs, inferred_needs и optional_needs: "virtual_server", "backend", "production", "ssd", "high_iops_ssd", "cloud_backup", "load_balancer", "managed_database", "object_storage", "kubernetes", "waf", "cdn", "152-fz", "ru".
12. Фильтр провайдеров: используй enabled_providers только если пользователь явно просит видеть или не видеть конкретных провайдеров. Канонические id: "vkcloud" (VK Cloud), "selectel" (Selectel), "t1cloud" (T1 Cloud / Т1 Облако), "edgecenter" (EdgeCenter). Если ограничений по провайдерам нет, enabled_providers: null. Если пользователь пишет "только Selectel и VK Cloud" — enabled_providers: ["selectel", "vkcloud"]. Если пишет "без Selectel" или "не показывай T1" — enabled_providers должны содержать всех провайдеров, кроме исключенных.

ПРАВИЛА ГЕНЕРАЦИИ SEMANTIC QUERY:
Ты должен написать 2-3 связных предложения (на русском языке), которые профессионально описывают архитектуру проекта.
Включи в этот текст как явно упомянутые технологии, так и выявленные тобой скрытые потребности. Точные числовые требования к машине (CPU/RAM/диск) обязательно держи в resource_requirements; semantic_query не должен быть единственным местом, где эти числа присутствуют. НЕ используй JSON-форматирование или списки в этом поле, только связный текст.

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
  "enabled_providers": ["vkcloud" | "selectel" | "t1cloud" | "edgecenter"] | null,
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

const allProviderIds = ["vkcloud", "selectel", "t1cloud", "edgecenter"] as const;
type ProviderId = (typeof allProviderIds)[number];

const providerAliases: Record<ProviderId, RegExp[]> = {
  vkcloud: [/\bvk\s*cloud\b/i, /\bvkcloud\b/i, /\bvk\b/i, /вк\s*клауд/i],
  selectel: [/\bselectel\b/i, /селектел/i],
  t1cloud: [/\bt1\s*cloud\b/i, /\bt1cloud\b/i, /\bt1\b/i, /т1\s*облак\w*/i, /т1\s*cloud/i],
  edgecenter: [/\bedge\s*center\b/i, /\bedgecenter\b/i, /эдж\s*центр/i, /эджцентр/i],
};

type ProviderMention = {
  provider: ProviderId;
  index: number;
  end: number;
};

const serviceTypeAliases: Array<{ type: string; patterns: RegExp[] }> = [
  {
    type: "virtual_server",
    patterns: [
      /\bvps\b/i,
      /\bvds\b/i,
      /\bvm\b/i,
      /\bвпс\b/i,
      /\bвдс\b/i,
      /\bвм\b/i,
      /виртуальн\w*\s+машин/i,
      /виртуальн\w*\s+сервер/i,
      /облачн\w*\s+сервер/i,
      /backend-?сервер/i,
      /сервер\s+для\s+backend/i,
    ],
  },
  {
    type: "managed_database",
    patterns: [/\bpostgres(?:ql)?\b/i, /\bmysql\b/i, /\bclickhouse\b/i, /\bredis\b/i, /баз\w*\s+данн/i, /\bбд\b/i],
  },
  {
    type: "managed_kubernetes",
    patterns: [/\bkubernetes\b/i, /\bk8s\b/i, /кубер/i, /контейнер/i],
  },
  {
    type: "object_storage",
    patterns: [/\bs3\b/i, /object\s+storage/i, /объектн\w*\s+хранилищ/i, /бакет/i],
  },
  {
    type: "gpu_server",
    patterns: [/\bgpu\b/i, /\bvgpu\b/i, /видеокарт/i],
  },
  {
    type: "bare_metal",
    patterns: [/bare\s+metal/i, /выделенн\w*\s+сервер/i],
  },
];

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
    const parsedIntent = aiStudioIntentSchema.parse(parsedJson);
    const intent = this.enrichEnabledProviders(
      input,
      this.enrichResourceRequirements(input, this.enrichPrimaryServiceType(input, parsedIntent)),
    );

    return { intent, raw };
  }

  private enrichPrimaryServiceType(input: string, intent: AiStudioIntent): AiStudioIntent {
    const primaryServiceType = this.extractPrimaryServiceType(input);
    if (!primaryServiceType) {
      return intent;
    }

    return {
      ...intent,
      primary_service_type: primaryServiceType,
    };
  }

  private enrichEnabledProviders(input: string, intent: AiStudioIntent): AiStudioIntent {
    const extracted = this.extractEnabledProviders(input);

    if (extracted === undefined) {
      return { ...intent, enabled_providers: null };
    }

    return {
      ...intent,
      enabled_providers: extracted,
    };
  }

  private enrichResourceRequirements(input: string, intent: AiStudioIntent): AiStudioIntent {
    const extracted = this.extractResourceRequirements(input);
    if (Object.keys(extracted).length === 0) {
      return intent;
    }

    const current = intent.resource_requirements ?? {};
    return {
      ...intent,
      resource_requirements: {
        ...current,
        cpu_min: current.cpu_min ?? extracted.cpu_min,
        ram_gb_min: current.ram_gb_min ?? extracted.ram_gb_min,
        disk_gb_min: current.disk_gb_min ?? extracted.disk_gb_min,
        disk_type: current.disk_type ?? extracted.disk_type,
        high_iops_preferred: current.high_iops_preferred ?? extracted.high_iops_preferred,
      },
    };
  }

  private extractResourceRequirements(input: string): Partial<NonNullable<AiStudioIntent["resource_requirements"]>> {
    const normalized = input.toLowerCase().replace(",", ".");
    const extracted: Partial<NonNullable<AiStudioIntent["resource_requirements"]>> = {};

    const cpu = this.firstNumber([
      /(\d+(?:\.\d+)?)\s*(?:v?cpu|vcpu|cpu|core|cores|ядра|ядер|ядро)/i,
      /(?:v?cpu|vcpu|cpu|core|cores|ядра|ядер|ядро)\D{0,16}(\d+(?:\.\d+)?)/i,
    ], normalized);
    if (cpu !== undefined) {
      extracted.cpu_min = cpu;
    }

    const ram = this.firstSizedNumber([
      /(\d+(?:\.\d+)?)\s*(гб|gb|тб|tb)\s*(?:ram|озу|оператив|памят)/i,
      /(?:ram|озу|оператив\w*|памят\w*)\D{0,20}(\d+(?:\.\d+)?)\s*(гб|gb|тб|tb)/i,
    ], normalized);
    if (ram !== undefined) {
      extracted.ram_gb_min = ram;
    }

    const disk = this.firstSizedNumber([
      /(\d+(?:\.\d+)?)\s*(гб|gb|тб|tb)\s*(?:ssd|hdd|nvme|диск|storage|хранилищ)/i,
      /(?:ssd|hdd|nvme|диск|storage|хранилищ\w*)\D{0,24}(\d+(?:\.\d+)?)\s*(гб|gb|тб|tb)/i,
    ], normalized);
    if (disk !== undefined) {
      extracted.disk_gb_min = disk;
    }

    if (/\bnvme\b/.test(normalized)) {
      extracted.disk_type = "nvme";
      extracted.high_iops_preferred = true;
    } else if (/\bssd\b|ссд/.test(normalized)) {
      extracted.disk_type = "ssd";
    } else if (/\bhdd\b|жестк/.test(normalized)) {
      extracted.disk_type = "hdd";
    }

    if (/\bhigh[-\s]?iops\b|iops|быстр\w*\s+диск|производительн\w*\s+диск/.test(normalized)) {
      extracted.high_iops_preferred = true;
    }

    return extracted;
  }

  private extractEnabledProviders(input: string): ProviderId[] | undefined {
    const normalized = input.toLowerCase();
    if (this.hasNoProviderPreferenceCue(normalized)) {
      return undefined;
    }

    const mentions = this.findProviderMentions(normalized);
    if (mentions.length === 0) {
      return undefined;
    }

    const mentioned = this.uniqueProviderIds(mentions.map((mention) => mention.provider));
    const excluded = this.extractExcludedProviders(normalized, mentions);

    if (excluded.size > 0) {
      const hasPositiveMention = mentions.some(
        (mention) => !excluded.has(mention.provider) && this.hasPositiveProviderCue(normalized, mention),
      );
      const base = hasPositiveMention ? mentioned : [...allProviderIds];
      return base.filter((provider) => !excluded.has(provider));
    }

    return mentioned;
  }

  private extractPrimaryServiceType(input: string): string | undefined {
    return serviceTypeAliases.find(({ patterns }) => patterns.some((pattern) => pattern.test(input)))?.type;
  }

  private findProviderMentions(value: string): ProviderMention[] {
    const mentions = allProviderIds.flatMap((provider) =>
      providerAliases[provider].flatMap((pattern) => {
        const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
        const matcher = new RegExp(pattern.source, flags);
        const matches: ProviderMention[] = [];
        let match: RegExpExecArray | null;

        while ((match = matcher.exec(value)) !== null) {
          matches.push({
            provider,
            index: match.index,
            end: match.index + match[0].length,
          });
        }

        return matches;
      }),
    );

    const seen = new Set<string>();
    return mentions
      .sort((a, b) => a.index - b.index || b.end - a.end)
      .filter((mention) => {
        const key = `${mention.provider}:${mention.index}:${mention.end}`;
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
  }

  private extractExcludedProviders(value: string, mentions: ProviderMention[]): Set<ProviderId> {
    return new Set(
      mentions
        .filter((mention) => this.hasNegativeProviderCue(value, mention))
        .map((mention) => mention.provider),
    );
  }

  private hasNegativeProviderCue(value: string, mention: ProviderMention): boolean {
    const beforeScope = this.providerScopeBefore(value, mention.index);
    const afterScope = this.providerScopeAfter(value, mention.end);

    return /(?:без|кроме|исключи|исключить|убери|не\s+(?:хочу|надо|нужно|показывай|показывать|рассматривай|видеть|включай))/i.test(beforeScope) ||
      /(?:не\s+нужн|не\s+показывать|не\s+рассматривать|исключить|убрать)/i.test(afterScope);
  }

  private hasPositiveProviderCue(value: string, mention: ProviderMention): boolean {
    const beforeScope = this.providerScopeBefore(value, mention.index);
    return /(только|лишь|исключительно|среди|выбирай из|выбери из|рассмотри|покажи|сравни|предложи|подбери|найди|хочу|нужен|нужны|нужна|можно|оставь|включи|у|в|от)/i.test(beforeScope);
  }

  private hasNoProviderPreferenceCue(value: string): boolean {
    return /(?:не\s+важно|без\s+разницы|любой\s+провайдер|провайдер\s+не\s+важен|все\s+провайдеры)/i.test(value);
  }

  private providerScopeBefore(value: string, index: number): string {
    const prefix = value.slice(0, index);
    const punctuationBoundary = Math.max(
      prefix.lastIndexOf("."),
      prefix.lastIndexOf("!"),
      prefix.lastIndexOf("?"),
      prefix.lastIndexOf(";"),
      prefix.lastIndexOf("\n"),
    );
    const contrastBoundary = this.lastRegexEnd(prefix, /\b(?:но|однако)\b/gi);
    const start = Math.max(punctuationBoundary + 1, contrastBoundary);
    return value.slice(start, index);
  }

  private providerScopeAfter(value: string, end: number): string {
    const suffix = value.slice(end);
    const punctuation = suffix.search(/[,.!?;\n]/);
    return punctuation >= 0 ? suffix.slice(0, punctuation) : suffix;
  }

  private lastRegexEnd(value: string, pattern: RegExp): number {
    let last = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(value)) !== null) {
      last = match.index + match[0].length;
    }
    return last;
  }

  private uniqueProviderIds(values: readonly ProviderId[]): ProviderId[] {
    return [...new Set(values)];
  }

  private normalizeProviderIds(values: readonly string[]): ProviderId[] {
    const normalized = values
      .map((value) => value.toLowerCase().replace(/[\s_-]+/g, ""))
      .flatMap((value) => {
        if (value === "vkcloud" || value === "vk") return ["vkcloud" as ProviderId];
        if (value === "selectel") return ["selectel" as ProviderId];
        if (value === "t1cloud" || value === "t1" || value === "т1облако") return ["t1cloud" as ProviderId];
        if (value === "edgecenter") return ["edgecenter" as ProviderId];
        return [];
      });

    return [...new Set(normalized)];
  }

  private firstNumber(patterns: RegExp[], value: string): number | undefined {
    for (const pattern of patterns) {
      const match = value.match(pattern);
      if (match?.[1]) {
        return Number(match[1]);
      }
    }
    return undefined;
  }

  private firstSizedNumber(patterns: RegExp[], value: string): number | undefined {
    for (const pattern of patterns) {
      const match = value.match(pattern);
      if (match?.[1] && match[2]) {
        const numeric = Number(match[1]);
        return /тб|tb/i.test(match[2]) ? numeric * 1024 : numeric;
      }
    }
    return undefined;
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
