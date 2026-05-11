const solutions = [
  {
    name: "AWS Elastic Foundation",
    tag: "Compute",
    description:
      "Автоскейлинг приложений, балансировка нагрузки и управляемая сеть для стабильного запуска продукта.",
    features: ["EC2", "Auto Scaling", "VPC"],
  },
  {
    name: "Google Cloud Data Core",
    tag: "Data",
    description:
      "Облачное хранилище, потоковая обработка и аналитика для продуктовых метрик и BI-сценариев.",
    features: ["BigQuery", "Cloud Storage", "Pub/Sub"],
  },
  {
    name: "Azure Secure Landing Zone",
    tag: "Security",
    description:
      "Базовая защищенная среда с политиками доступа, аудитом и управлением корпоративными ресурсами.",
    features: ["Entra ID", "Policy", "Defender"],
  },
  {
    name: "Yandex Managed Kubernetes",
    tag: "Containers",
    description:
      "Контейнерная платформа для микросервисов с управляемым кластером, registry и сетевой изоляцией.",
    features: ["Kubernetes", "Registry", "Load Balancer"],
  },
  {
    name: "Selectel Private Cloud",
    tag: "Hybrid",
    description:
      "Выделенная облачная инфраструктура для проектов с особыми требованиями к данным и контролю.",
    features: ["VMware", "S3", "Backup"],
  },
  {
    name: "Cloudflare Edge Delivery",
    tag: "Edge",
    description:
      "CDN, защита от DDoS и edge-функции для быстрых пользовательских интерфейсов по всему миру.",
    features: ["CDN", "WAF", "Workers"],
  },
  {
    name: "DigitalOcean App Platform",
    tag: "Launch",
    description:
      "Простой запуск web-приложений, managed database и мониторинг для быстрых MVP и команд разработки.",
    features: ["Apps", "PostgreSQL", "Monitoring"],
  },
];

const form = document.querySelector("#promptForm");
const emptyState = document.querySelector("#emptyState");
const resultsPanel = document.querySelector("#resultsPanel");
const grid = document.querySelector("#solutionsGrid");
const template = document.querySelector("#solutionTemplate");

function renderSolutions() {
  grid.innerHTML = "";

  solutions.forEach((solution) => {
    const card = template.content.cloneNode(true);
    const title = card.querySelector("h3");
    const tag = card.querySelector(".solution-title-row span");
    const description = card.querySelector("p");
    const features = card.querySelector("ul");

    title.textContent = solution.name;
    tag.textContent = solution.tag;
    description.textContent = solution.description;

    solution.features.forEach((feature) => {
      const item = document.createElement("li");
      item.textContent = feature;
      features.append(item);
    });

    grid.append(card);
  });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  renderSolutions();
  emptyState.classList.add("is-hidden");
  resultsPanel.classList.remove("is-hidden");
});
