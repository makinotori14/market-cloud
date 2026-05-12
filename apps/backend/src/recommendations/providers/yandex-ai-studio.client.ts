import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { EnvConfig } from "../../config/env.schema.js";
import {
  aiStudioIntentSchema,
  extractionAgentOutputSchema,
  type AiStudioIntent,
  type ExtractionAgentOutput,
} from "../schemas/recommendation.schema.js";

type ResponsesApiPayload = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
};

const allProviderIds = ["vkcloud", "selectel", "t1cloud", "edgecenter", "yandexcloud", "cloudru"] as const;
type ProviderId = (typeof allProviderIds)[number];

const providerAliases: Record<ProviderId, RegExp[]> = {
  vkcloud: [/\bvk\s*cloud\b/i, /\bvkcloud\b/i, /\bvk\b/i, /вк\s*клауд/i],
  selectel: [/\bselectel\b/i, /селектел/i],
  t1cloud: [/\bt1\s*cloud\b/i, /\bt1cloud\b/i, /\bt1\b/i, /т1\s*облак\w*/i, /т1\s*cloud/i],
  edgecenter: [/\bedge\s*center\b/i, /\bedgecenter\b/i, /эдж\s*центр/i, /эджцентр/i],
  yandexcloud: [/\byandex\s*cloud\b/i, /\byandexcloud\b/i, /яндекс\s*облак\w*/i, /яндекс\s*cloud/i],
  cloudru: [/\bcloud\.?\s*ru\b/i, /\bcloudru\b/i, /клауд\.?\s*ру/i, /облако\.?\s*ру/i, /сбер\s*cloud/i, /сбер\s*клауд/i],
};

type ProviderMention = {
  provider: ProviderId;
  index: number;
  end: number;
};

const cityAliases: Array<{ city: string; patterns: RegExp[] }> = [
  { city: "Москва", patterns: [/москв/i, /\bmoscow\b/i] },
  { city: "Санкт-Петербург", patterns: [/санкт[-\s]?петербург/i, /петербург/i, /(^|[^a-zа-я0-9])питер(?=$|[^a-zа-я0-9])/i, /\bspb\b/i, /\bsaint[-\s]?petersburg\b/i, /\bst[-\s]?petersburg\b/i] },
  { city: "Новосибирск", patterns: [/новосибирск/i, /\bnovosibirsk\b/i] },
  { city: "Екатеринбург", patterns: [/екатеринбург/i, /\byekaterinburg\b/i, /\bekaterinburg\b/i] },
  { city: "Казань", patterns: [/казан/i, /\bkazan\b/i] },
  { city: "Нижний Новгород", patterns: [/нижн[а-яёa-z0-9-]*\s+новгород/i, /\bnizhny\s+novgorod\b/i] },
  { city: "Краснодар", patterns: [/краснодар/i, /\bkrasnodar\b/i] },
];

const serviceTypeAliases: Array<{ type: string; patterns: RegExp[] }> = [
  {
    type: "virtual_server",
    patterns: [
      /\bvps\b/i,
      /\bvds\b/i,
      /\bvm\b/i,
      /(^|[^a-zа-я0-9])впс(?=$|[^a-zа-я0-9])/i,
      /(^|[^a-zа-я0-9])вдс(?=$|[^a-zа-я0-9])/i,
      /(^|[^a-zа-я0-9])вм(?=$|[^a-zа-я0-9])/i,
      /виртуальн[а-яёa-z0-9-]*\s+машин/i,
      /виртуальн[а-яёa-z0-9-]*\s+сервер/i,
      /облачн[а-яёa-z0-9-]*\s+сервер/i,
      /backend-?сервер/i,
      /сервер\s+для\s+backend/i,
    ],
  },
  {
    type: "managed_database",
    patterns: [
      /\bpostgres(?:ql)?\b/i,
      /\bmysql\b/i,
      /\bclickhouse\b/i,
      /\bredis\b/i,
      /баз[а-яёa-z0-9-]*\s+данн/i,
      /(^|[^a-zа-я0-9])бд(?=$|[^a-zа-я0-9])/i,
    ],
  },
  {
    type: "managed_kubernetes",
    patterns: [/\bkubernetes\b/i, /\bk8s\b/i, /кубер/i, /контейнер/i],
  },
  {
    type: "object_storage",
    patterns: [/\bs3\b/i, /object\s+storage/i, /объектн[а-яёa-z0-9-]*\s+хранилищ/i, /бакет/i],
  },
  {
    type: "gpu_server",
    patterns: [/\bgpu\b/i, /\bvgpu\b/i, /видеокарт/i],
  },
  {
    type: "bare_metal",
    patterns: [/bare\s+metal/i, /выделенн[а-яёa-z0-9-]*\s+сервер/i],
  },
];

@Injectable()
export class YandexAiStudioClient {
  constructor(private readonly config: ConfigService<EnvConfig, true>) {}

  async extractIntent(
    input: string,
  ): Promise<{ intent: AiStudioIntent; extraction: ExtractionAgentOutput; raw: unknown }> {
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
    const extraction = extractionAgentOutputSchema.parse(parsedJson);
    const parsedIntent = aiStudioIntentSchema.parse(this.toAiStudioIntent(extraction));
    const intent = this.enrichEnabledProviders(
      input,
      this.enrichResourceRequirements(
        input,
        this.enrichPreferredCities(input, this.enrichPrimaryServiceType(input, parsedIntent)),
      ),
    );

    return { intent, extraction, raw: { ...raw, extraction } };
  }

  private toAiStudioIntent(extraction: ExtractionAgentOutput): AiStudioIntent {
    const requires152Fz = extraction.compliance_tags.some((tag) => this.normalizeToken(tag) === "152fz");
    const country = extraction.regional_requirements.some((region) => this.isRussiaRegion(region)) || requires152Fz
      ? "RU"
      : null;
    const serviceTypes = this.serviceTypesFromCategories(extraction.service_categories);
    const preferredCities = this.citiesFromRegionalRequirements(extraction.regional_requirements);

    return {
      task_type: extraction.task_category || "web-hosting",
      primary_service_type: serviceTypes[0] ?? null,
      service_types: serviceTypes,
      requires_152fz: requires152Fz,
      budget_max_rub: extraction.budget_max_rub,
      budget_priority: this.budgetPriorityFromConstraints(extraction.budget_constraints),
      region: extraction.regional_requirements[0] ?? null,
      country,
      preferred_cities: preferredCities,
      enabled_providers: this.enabledProvidersFromExcluded(extraction.excluded_providers),
      resource_requirements: {
        cpu_min: null,
        ram_gb_min: null,
        disk_gb_min: null,
        disk_type: null,
        high_iops_preferred: extraction.expanded_tags.some((tag) => /high[-\s]?iops|nvme/.test(tag)),
      },
      workload: {
        stage: extraction.availability_requirements.length > 0 ? "production" : null,
        availability: extraction.availability_requirements.includes("high-availability")
          ? "high-availability"
          : null,
        backup_required: extraction.availability_requirements.includes("backup-required"),
        stable_network_required: extraction.availability_requirements.includes("high-availability"),
      },
      explicit_needs: this.unique([
        ...extraction.service_categories.map((category) => this.serviceTypesFromCategories([category])[0] ?? category),
        ...extraction.compliance_tags.map((tag) => tag.toLowerCase()),
      ]),
      extracted_tech_stack: extraction.tech_stack,
      inferred_needs: this.unique([
        ...extraction.predicted_needs,
        ...extraction.availability_requirements,
        ...extraction.business_context,
      ]),
      optional_needs: this.unique([
        ...extraction.expanded_tags,
        ...extraction.embedding_chunks,
        ...(extraction.implicit_use_case ? [extraction.implicit_use_case] : []),
      ]),
      excluded_service_categories: extraction.excluded_service_categories,
      semantic_query: this.semanticQueryFromExtraction(extraction),
      reasoning_summary: extraction.task_summary || extraction.semantic_query || extraction.task_category,
    };
  }

  private serviceTypesFromCategories(categories: readonly string[]): string[] {
    return this.unique(
      categories
        .map((category) => this.serviceTypeFromCategory(category))
        .filter((serviceType): serviceType is string => Boolean(serviceType)),
    );
  }

  private serviceTypeFromCategory(category: string): string | null {
    const text = this.normalizeToken(category);

    if (!text) {
      return null;
    }
    if (/cloudcompute|compute|vps|vds|virtualserver/.test(text)) return "virtual_server";
    if (/managedserviceforpostgresql|managedserviceformysql|database|postgres|mysql|clickhouse|redis/.test(text)) return "managed_database";
    if (/objectstorage|s3|bucket/.test(text)) return "object_storage";
    if (/kubernetes|containers/.test(text)) return "managed_kubernetes";
    if (/backup/.test(text)) return "cloud_backup";
    if (/cdn/.test(text)) return "cdn";
    if (/waf/.test(text)) return "waf";
    if (/loadbalancer/.test(text)) return "load_balancer";

    return null;
  }

  private budgetPriorityFromConstraints(constraints: readonly string[]): AiStudioIntent["budget_priority"] {
    const normalized = constraints.map((constraint) => this.normalizeToken(constraint));

    if (normalized.some((constraint) => constraint === "enterprisebudget")) {
      return "performance_over_min_price";
    }
    if (normalized.some((constraint) => constraint === "lowbudget" || constraint === "costoptimized")) {
      return "min_price";
    }
    if (normalized.some((constraint) => constraint === "mediumbudget")) {
      return "balanced";
    }

    return null;
  }

  private enabledProvidersFromExcluded(excludedProviders: readonly string[]): ProviderId[] | null {
    const excluded = new Set(this.normalizeProviderIds(excludedProviders));
    if (excluded.size === 0) {
      return null;
    }

    return allProviderIds.filter((provider) => !excluded.has(provider));
  }

  private semanticQueryFromExtraction(extraction: ExtractionAgentOutput): string {
    const semanticParts = [
      extraction.semantic_query,
      ...extraction.embedding_chunks,
      ...extraction.expanded_tags,
    ]
      .map((value) => value.trim())
      .filter(Boolean);

    return this.unique(semanticParts).join(" ").slice(0, 500) || extraction.task_summary || extraction.task_category;
  }

  private isRussiaRegion(value: string): boolean {
    const normalized = this.normalizeToken(value);
    return /росси|москва|санкт|петербург|рф|ru|russia/.test(normalized);
  }

  private citiesFromRegionalRequirements(regions: readonly string[]): string[] {
    return this.unique(
      regions.flatMap((region) =>
        cityAliases
          .filter(({ patterns }) => patterns.some((pattern) => pattern.test(region)))
          .map(({ city }) => city),
      ),
    );
  }

  private normalizeToken(value: string): string {
    return value.toLowerCase().replace(/ё/g, "е").replace(/[^a-zа-я0-9]+/g, "");
  }

  private unique<T>(values: readonly T[]): T[] {
    return [...new Set(values)];
  }

  private enrichPrimaryServiceType(input: string, intent: AiStudioIntent): AiStudioIntent {
    const extractedServiceTypes = this.extractPrimaryServiceTypes(input);
    const serviceTypes = this.unique([
      ...extractedServiceTypes,
      ...(intent.service_types ?? []),
    ]);
    const primaryServiceType = serviceTypes[0] ?? intent.primary_service_type;

    return {
      ...intent,
      primary_service_type: primaryServiceType ?? null,
      service_types: serviceTypes,
    };
  }

  private enrichEnabledProviders(input: string, intent: AiStudioIntent): AiStudioIntent {
    const extracted = this.extractEnabledProviders(input);

    if (extracted === undefined) {
      return { ...intent, enabled_providers: intent.enabled_providers ?? null };
    }

    return {
      ...intent,
      enabled_providers: extracted,
    };
  }

  private enrichPreferredCities(input: string, intent: AiStudioIntent): AiStudioIntent {
    const extractedCities = this.extractPreferredCities(input);
    const preferredCities = this.unique([
      ...extractedCities,
      ...(intent.preferred_cities ?? []),
    ]);

    return {
      ...intent,
      preferred_cities: preferredCities,
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

  private extractPrimaryServiceTypes(input: string): string[] {
    return this.unique(
      serviceTypeAliases
        .flatMap(({ type, patterns }) =>
          patterns.flatMap((pattern) => {
            const match = input.match(pattern);
            return match?.index === undefined ? [] : [{ type, index: match.index }];
          }),
        )
        .sort((left, right) => left.index - right.index)
        .map((match) => match.type),
    );
  }

  private extractPreferredCities(input: string): string[] {
    return this.unique(
      cityAliases
        .flatMap(({ city, patterns }) =>
          patterns.flatMap((pattern) => {
            const match = input.match(pattern);
            return match?.index === undefined ? [] : [{ city, index: match.index }];
          }),
        )
        .sort((left, right) => left.index - right.index)
        .map((match) => match.city),
    );
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
      .map((value) => value.toLowerCase().replace(/[\s._-]+/g, ""))
      .flatMap((value) => {
        if (value === "vkcloud" || value === "vk") return ["vkcloud" as ProviderId];
        if (value === "selectel") return ["selectel" as ProviderId];
        if (value === "t1cloud" || value === "t1" || value === "т1облако") return ["t1cloud" as ProviderId];
        if (value === "edgecenter") return ["edgecenter" as ProviderId];
        if (value === "yandexcloud" || value === "yandex" || value === "яндексоблако") return ["yandexcloud" as ProviderId];
        if (value === "cloudru" || value === "клаудру" || value === "облакору" || value === "сберcloud" || value === "сберклауд") return ["cloudru" as ProviderId];
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
