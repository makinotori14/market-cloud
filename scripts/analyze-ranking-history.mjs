const apiBase = process.env.EVAL_API_BASE ?? "http://backend:3001/api";

const prompts = [
  "Хочу облачный сервер для backend-приложения: 8 CPU, 32 ГБ RAM, SSD-диск от 300 ГБ, стабильная сеть и возможность делать резервные копии. Важно, чтобы сервер был надежным и подходил для нагрузки в production. Желательно размещение в России и соответствие 152-ФЗ. Бюджет умеренный, но производительность и стабильность важнее минимальной цены.",
  "Нужна инфраструктура для интернет-магазина в России: backend на Node.js, PostgreSQL, около 50 тысяч пользователей в месяц, личные кабинеты и оплата картой. Нужны безопасность, резервные копии и возможность масштабироваться перед распродажами.",
  "Запускаем MVP мобильного приложения для доставки еды. Нужен недорогой облачный backend, база данных, хранение фотографий блюд, API для курьеров и возможность быстро стартовать без большой DevOps-команды.",
  "Есть платформа онлайн-курсов: видео смотрят пользователи по всей России, примерно 20 тысяч активных студентов. Нужны хранение видео, быстрая отдача контента, backend API, PostgreSQL и защита персональных данных.",
  "Нужно перенести legacy ERP из офиса в облако. Есть 1С, файловое хранилище, VPN-доступ сотрудников, резервное копирование и требование размещения в РФ. Система критична для бизнеса.",
  "Нужен Kubernetes-кластер для микросервисов: 3 worker-ноды, production, autoscaling, CI/CD, отдельный PostgreSQL и балансировщик нагрузки. Важны отказоустойчивость и мониторинг.",
  "Хотим хранилище для архивных документов и старых логов: около 10 ТБ, доступ нужен редко, цена важнее скорости. Данные должны храниться в России, желательна совместимость с S3.",
  "Нужна аналитическая платформа для больших данных: ClickHouse или Spark, 16 CPU, 64 ГБ RAM, быстрый SSD, загрузка событий из Kafka и отчеты для бизнеса. Нагрузка production.",
  "Делаем чат-сервис с real-time сообщениями и WebSocket. Нужны backend-серверы, Redis, балансировщик, высокая доступность и возможность выдерживать пики нагрузки.",
  "Нужно развернуть корпоративный GitLab в облаке для команды из 80 разработчиков. Требуются SSD, резервное копирование, стабильная сеть, российская площадка и умеренный бюджет.",
  "Нужна защищенная инфраструктура для медицинского сервиса: персональные данные пациентов, API, PostgreSQL, резервные копии, WAF, соответствие 152-ФЗ и размещение в России.",
  "Хотим GPU-сервер для обучения ML-моделей и экспериментов с LLM. Нужна NVIDIA GPU, 8 CPU, 32 ГБ RAM, SSD, желательно быстро развернуть и платить помесячно.",
  "Нужен балансировщик нагрузки для двух backend-инстансов в production. Важно иметь стабильную сеть, отказоустойчивость, health checks и российскую инфраструктуру.",
  "Требуется managed PostgreSQL для финансового сервиса: 8 CPU, 32 ГБ RAM, 500 ГБ быстрый SSD, резервные копии, высокая доступность, 152-ФЗ и надежность важнее цены.",
  "Нужен VDI/облачные рабочие места для 30 сотрудников с доступом из дома. Нужны Windows или Astra Linux, безопасность, российское размещение и прогнозируемая стоимость.",
];

async function request(path) {
  const response = await fetch(`${apiBase}${path}`);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`);
  }
  return response.json();
}

function pairwise(items) {
  const pairs = [];
  for (let left = 0; left < items.length; left += 1) {
    for (let right = left + 1; right < items.length; right += 1) {
      pairs.push([items[left], items[right]]);
    }
  }
  return pairs;
}

function jaccard(left, right) {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  const intersection = [...leftSet].filter((item) => rightSet.has(item)).length;
  const union = new Set([...left, ...right]).size;
  return union === 0 ? 1 : intersection / union;
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function key(item) {
  return `${item.provider}::${item.title}`;
}

function evaluateRuns(runs) {
  const keysByRun = runs.map((run) => run.recommendations.map(key));
  const top3ByRun = keysByRun.map((keys) => keys.slice(0, 3));
  const top1 = keysByRun.map((keys) => keys[0] ?? null);
  const exactOrderStable = keysByRun.every((keys) => keys.join("|") === keysByRun[0].join("|"));
  const similarity = average(pairwise(keysByRun).map(([left, right]) => jaccard(left, right)));
  const top3Similarity = average(pairwise(top3ByRun).map(([left, right]) => jaccard(left, right)));

  const scoreDeltas = [];
  for (const [left, right] of pairwise(runs)) {
    const rightByKey = new Map(right.recommendations.map((item) => [key(item), item.finalScore]));
    for (const item of left.recommendations) {
      if (rightByKey.has(key(item))) {
        scoreDeltas.push(Math.abs(item.finalScore - rightByKey.get(key(item))));
      }
    }
  }

  const avgScoreDelta = average(scoreDeltas);
  const top1Stable = top1.every((id) => id === top1[0]);
  const determinism =
    (exactOrderStable ? 0.55 : 0) +
    (top1Stable ? 0.2 : 0) +
    top3Similarity * 0.2 +
    Math.max(0, 1 - avgScoreDelta / 10) * 0.05;

  return {
    similarity: Number((similarity * 100).toFixed(1)),
    top3Similarity: Number((top3Similarity * 100).toFixed(1)),
    determinism: Number((determinism * 100).toFixed(1)),
    exactOrderStable,
    top1Stable,
    avgScoreDelta: Number(avgScoreDelta.toFixed(2)),
    topTitlesByRun: runs.map((run) =>
      run.recommendations.slice(0, 3).map((item) => `${item.title} (${item.finalScore})`),
    ),
  };
}

const history = await request("/recommendations");
const results = [];

for (const [index, prompt] of prompts.entries()) {
  const matching = history
    .filter((item) => item.prompt === prompt && item.status === "completed")
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 3);

  const runs = [];
  for (const item of matching.reverse()) {
    runs.push(await request(`/recommendations/${item.id}`));
  }

  if (runs.length !== 3) {
    throw new Error(`Expected 3 completed runs for prompt ${index + 1}, got ${runs.length}`);
  }

  results.push({
    index: index + 1,
    prompt,
    ...evaluateRuns(runs),
  });
}

console.log(JSON.stringify(results, null, 2));
