import { z } from "zod";
const emptyStringToUndefined = (value) => (value === "" ? undefined : value);
const stringToBoolean = (value) => {
    if (typeof value !== "string") {
        return value;
    }
    return value.toLowerCase() === "true";
};
const envSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3001),
    DATABASE_URL: z.string().url(),
    REDIS_HOST: z.string().default("localhost"),
    REDIS_PORT: z.coerce.number().int().positive().default(6379),
    YANDEX_CLOUD_API_MODE: z.enum(["stub", "live"]).default("stub"),
    YANDEX_AI_STUDIO_API_KEY: z.preprocess(emptyStringToUndefined, z.string().min(1).optional()),
    YANDEX_AI_STUDIO_BASE_URL: z.string().url().default("https://ai.api.cloud.yandex.net/v1"),
    YANDEX_AI_STUDIO_PROJECT_ID: z.preprocess(emptyStringToUndefined, z.string().min(1).optional()),
    YANDEX_AI_STUDIO_PROMPT_ID: z.preprocess(emptyStringToUndefined, z.string().min(1).optional()),
    RANKER_API_URL: z.string().url().default("http://ranker:8000"),
    DEBUG_RANKER_INTENT: z.preprocess(stringToBoolean, z.boolean()).default(false),
});
export function validateEnv(config) {
    return envSchema.parse(config);
}
//# sourceMappingURL=env.schema.js.map