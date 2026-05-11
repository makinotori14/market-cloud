import type { CloudRecommendation } from "@cloud-recommender/shared";
import type { YandexCloudStubResponse } from "../schemas/recommendation.schema.js";

const demoRecommendations: CloudRecommendation[] = [
  {
    id: "yc-managed-kubernetes",
    provider: "Yandex Cloud",
    title: "Managed Kubernetes Platform",
    description:
      "Управляемый Kubernetes-контур для микросервисов, autoscaling и стандартизированного деплоя.",
    finalScore: 96,
    services: ["Managed Kubernetes", "Container Registry", "Network Load Balancer"],
    reasons: [
      "Подходит для масштабируемого приложения с несколькими сервисами.",
      "Снижает операционные затраты на поддержку control plane.",
    ],
    risks: ["Потребуется DevOps-практика для надежной эксплуатации кластеров."],
    estimatedCostLevel: "medium",
    icon: "/cloud-service.svg",
  },
  {
    id: "yc-serverless-container",
    provider: "Yandex Cloud",
    title: "Serverless Containers API",
    description:
      "Контейнерный backend без управления серверами для API, webhook и фоновых сценариев с переменной нагрузкой.",
    finalScore: 91,
    services: ["Serverless Containers", "API Gateway", "Lockbox"],
    reasons: [
      "Хорош для быстрого запуска и нерегулярной нагрузки.",
      "Упрощает деплой backend-заглушек и API-интеграций.",
    ],
    risks: ["Не все long-running сценарии удобно держать в serverless-модели."],
    estimatedCostLevel: "low",
    icon: "/cloud-service.svg",
  },
  {
    id: "yc-managed-postgresql",
    provider: "Yandex Cloud",
    title: "Managed PostgreSQL Core",
    description:
      "Надежная транзакционная база для истории промптов, результатов ранжирования и аудита ответов модели.",
    finalScore: 89,
    services: ["Managed PostgreSQL", "Backup", "Monitoring"],
    reasons: [
      "Сохраняет историю и результаты в воспроизводимой форме.",
      "Поддерживает сложные выборки и аналитические отчеты.",
    ],
    risks: ["Нужно контролировать рост таблиц с сырыми ответами модели."],
    estimatedCostLevel: "medium",
    icon: "/cloud-service.svg",
  },
  {
    id: "yc-datasphere-mlops",
    provider: "Yandex Cloud",
    title: "DataSphere Evaluation Loop",
    description:
      "Среда для экспериментов с качеством рекомендаций, датасетами, ручной разметкой и сравнением prompt-версий.",
    finalScore: 84,
    services: ["DataSphere", "Object Storage", "DataLens"],
    reasons: [
      "Помогает улучшать scoring и промпты на реальных примерах.",
      "Удобна для аналитики качества рекомендаций.",
    ],
    risks: ["Нужна дисциплина версионирования экспериментов."],
    estimatedCostLevel: "medium",
    icon: "/cloud-service.svg",
  },
  {
    id: "yc-object-storage-cdn",
    provider: "Yandex Cloud",
    title: "Object Storage + CDN",
    description:
      "Хранилище статических ассетов и быстрая доставка файлов интерфейса, отчетов и вложений пользователям.",
    finalScore: 78,
    services: ["Object Storage", "CDN", "Cloud DNS"],
    reasons: [
      "Подходит для ассетов и выгрузок без нагрузки на backend.",
      "Ускоряет доставку статического контента.",
    ],
    risks: ["Нужно настроить политики доступа и lifecycle rules."],
    estimatedCostLevel: "low",
    icon: "/cloud-service.svg",
  },
  {
    id: "yc-monitoring-logging",
    provider: "Yandex Cloud",
    title: "Observability Pack",
    description:
      "Метрики, логи и алерты для контроля latency, ошибок очереди, качества ответов и деградаций модели.",
    finalScore: 86,
    services: ["Monitoring", "Cloud Logging", "Managed Service for Prometheus"],
    reasons: [
      "Позволяет видеть узкие места request flow.",
      "Помогает быстро находить сбои интеграции с моделью.",
    ],
    risks: ["Без правил хранения логи могут стать дорогими."],
    estimatedCostLevel: "low",
    icon: "/cloud-service.svg",
  },
  {
    id: "yc-foundation-models",
    provider: "Yandex Cloud",
    title: "Foundation Models Scoring",
    description:
      "LLM-слой для преобразования пользовательского промпта в структурированные облачные рекомендации.",
    finalScore: 94,
    services: ["Foundation Models API", "IAM", "Lockbox"],
    reasons: [
      "Непосредственно решает задачу генерации и оценки вариантов.",
      "Может возвращать строгий JSON-контракт для backend-валидации.",
    ],
    risks: ["Требуется защита от некорректного JSON и prompt injection."],
    estimatedCostLevel: "medium",
    icon: "/cloud-service.svg",
  },
];

export class YandexCloudStub {
  async getRecommendations(prompt: string): Promise<YandexCloudStubResponse> {
    await new Promise((resolve) => setTimeout(resolve, 900));

    return {
      model: "yandexgpt-stub/v1",
      generatedAt: new Date().toISOString(),
      recommendations: demoRecommendations.map((recommendation) => ({
        ...recommendation,
        reasons: [
          ...recommendation.reasons,
          `Учтен пользовательский контекст: "${prompt.slice(0, 90)}${prompt.length > 90 ? "..." : ""}"`,
        ],
      })),
    };
  }
}
