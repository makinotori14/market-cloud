import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { EnvConfig } from "../../config/env.schema.js";

type ChatCompletionPayload = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ text?: string }>;
    };
  }>;
  error?: { message?: string };
};

type JsonSchema = Record<string, unknown>;

@Injectable()
export class OpenAiCompatibleClient {
  constructor(private readonly config: ConfigService<EnvConfig, true>) {}

  async completeJson<T>(options: {
    schemaName: string;
    schema: JsonSchema;
    systemPrompt: string;
    input: string;
  }): Promise<{ value: T; raw: ChatCompletionPayload }> {
    const apiKey = this.config.get("LLM_API_KEY", { infer: true });
    const model = this.config.get("LLM_MODEL", { infer: true });
    const baseUrl = this.config.get("LLM_BASE_URL", { infer: true }).replace(/\/$/, "");
    const timeoutMs = this.config.get("LLM_TIMEOUT_MS", { infer: true });

    const missing = [
      ["LLM_API_KEY", apiKey],
      ["LLM_MODEL", model],
    ]
      .filter(([, value]) => !value)
      .map(([name]) => name);

    if (missing.length > 0) {
      throw new Error(`Missing LLM env vars in live mode: ${missing.join(", ")}`);
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey as string}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model as string,
        messages: [
          { role: "system", content: options.systemPrompt },
          { role: "user", content: options.input },
        ],
        temperature: 0,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: options.schemaName,
            strict: true,
            schema: options.schema,
          },
        },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    const raw = (await response.json().catch(() => ({}))) as ChatCompletionPayload;
    if (!response.ok) {
      throw new Error(raw.error?.message ?? `LLM request failed: ${response.status}`);
    }

    const content = raw.choices?.[0]?.message?.content;
    const outputText = typeof content === "string"
      ? content
      : (content ?? []).map((part) => part.text ?? "").join("").trim();

    if (!outputText) {
      throw new Error("LLM response does not contain message content");
    }

    return {
      value: JSON.parse(this.stripJsonFence(outputText)) as T,
      raw,
    };
  }

  private stripJsonFence(value: string): string {
    return value
      .trim()
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/i, "")
      .trim();
  }
}
