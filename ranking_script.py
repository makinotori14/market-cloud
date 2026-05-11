from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any, Optional

import numpy as np
import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity


MODEL_NAME = os.getenv("RANKER_MODEL_NAME", "paraphrase-multilingual-MiniLM-L12-v2")
PROVIDERS_DIR = Path(os.getenv("PROVIDERS_JSON_DIR", "providers_json"))


class ResourceRequirements(BaseModel):
    cpu_min: Optional[float] = None
    ram_gb_min: Optional[float] = None
    disk_gb_min: Optional[float] = None
    disk_type: Optional[str] = None
    high_iops_preferred: bool = False


class WorkloadRequirements(BaseModel):
    stage: Optional[str] = None
    availability: Optional[str] = None
    backup_required: bool = False
    stable_network_required: bool = False


class UserIntent(BaseModel):
    task_type: str = Field(..., description="Бизнес-задача пользователя")
    primary_service_type: Optional[str] = Field(None, description="Основной тип услуги")
    requires_152fz: bool = Field(False, description="Требуется ли соблюдение 152-ФЗ")
    budget_max_rub: Optional[float] = Field(None, description="Максимальный бюджет в рублях")
    budget_priority: Optional[str] = Field(None, description="Приоритет бюджета")
    region: Optional[str] = Field(None, description="Требуемый регион")
    country: Optional[str] = Field(None, description="Требуемая страна")
    resource_requirements: ResourceRequirements = Field(default_factory=ResourceRequirements)
    workload: WorkloadRequirements = Field(default_factory=WorkloadRequirements)
    explicit_needs: list[str] = Field(default_factory=list)
    extracted_tech_stack: list[str] = Field(default_factory=list)
    inferred_needs: list[str] = Field(default_factory=list)
    optional_needs: list[str] = Field(default_factory=list)
    semantic_query: str = Field("", description="Текст для векторизации Sentence-BERT")
    reasoning_summary: str = Field("", description="Краткое объяснение скрытых потребностей")


class RankRequest(BaseModel):
    user_intent: UserIntent
    top_n: int = Field(7, ge=1, le=20)


class MetricBreakdown(BaseModel):
    semantic_similarity: float
    jaccard_index: float
    resource_fit: float
    capability_score: float
    economy_score: float


class RecommendedService(BaseModel):
    service_id: str
    name: str
    description: str
    provider_name: str
    category: Optional[str]
    price_rub: float
    final_score_100: float
    matched_tags: list[str]
    matched_requirements: list[str]
    tech_stack: list[str]
    compliance_tags: list[str]
    regions: list[str]
    source_url: Optional[str]
    metrics_breakdown: MetricBreakdown


class RankResponse(BaseModel):
    user_context: dict[str, Any]
    top_recommendations: list[RecommendedService]
    top_3_recommendations: list[RecommendedService]


class IndexedService(BaseModel):
    service_id: str
    name: str
    description: str
    provider_name: str
    provider_id: Optional[str]
    is_152fz_compliant: bool
    category: Optional[str]
    price_rub: float
    regions: list[str]
    tech_stack: list[str]
    compliance_tags: list[str]
    source_url: Optional[str]
    attributes: dict[str, Any]
    search_text: str


app = FastAPI(
    title="Cloud Marketplace Ranking API",
    description="Hybrid Deterministic Ranking Engine (SBERT + hard filters + structured fit)",
    version="3.1.0",
)

ml_model: Optional[SentenceTransformer] = None
indexed_services: list[IndexedService] = []
service_vectors: Optional[np.ndarray] = None


SERVICE_TYPE_ALIASES: dict[str, list[str]] = {
    "virtual_server": [
        "virtual server",
        "cloud server",
        "cloud servers",
        "compute",
        "vm",
        "вм",
        "виртуальный сервер",
        "облачный сервер",
        "сервер",
    ],
    "managed_kubernetes": [
        "managed kubernetes",
        "kubernetes",
        "k8s",
        "cloud containers",
        "kubernetes cluster",
        "kubernetes_cluster",
        "контейнер",
    ],
    "managed_database": [
        "managed database",
        "cloud databases",
        "database",
        "dbaas",
        "dedicated db server",
        "dedicated_db_server",
        "postgresql",
        "postgres",
        "mysql",
        "clickhouse",
        "redis",
        "kafka",
        "opensearch",
        "бд",
    ],
    "object_storage": ["object storage", "cloud storage", "s3", "bucket", "бакет", "хранилище"],
    "cloud_backup": ["cloud backup", "backup", "veeam", "кибер бэкап", "резерв", "backup_storage"],
    "load_balancer": ["load balancer", "load_balancer", "балансировщик"],
    "cdn": ["cdn"],
    "waf": ["waf"],
    "gpu_server": ["gpu", "cloud gpu", "gpu server", "gpu_instance", "vgpu", "vgpu_instance"],
    "bare_metal": ["bare metal", "bare_metal", "dedicated", "выделенный"],
    "cloud_desktop": ["cloud desktop", "vdi", "vdi_server", "vdi_desktop", "рабочие места"],
    "file_storage": ["file storage", "file_storage", "файловое хранилище"],
    "analytics": ["analytics", "data platform", "spark", "trino", "iceberg", "bi", "аналит"],
    "ml_platform": ["ml platform", "machine learning", "llm", "ml"],
    "network_security": ["anti ddos", "ddos", "network security", "endpoint security"],
}

CAPABILITY_ALIASES: dict[str, list[str]] = {
    "cloud_backup": SERVICE_TYPE_ALIASES["cloud_backup"],
    "load_balancer": SERVICE_TYPE_ALIASES["load_balancer"] + ["health checks", "ha", "отказоустойчив"],
    "waf": SERVICE_TYPE_ALIASES["waf"],
    "managed_database": SERVICE_TYPE_ALIASES["managed_database"],
    "object_storage": SERVICE_TYPE_ALIASES["object_storage"],
    "kubernetes": SERVICE_TYPE_ALIASES["managed_kubernetes"],
    "cdn": SERVICE_TYPE_ALIASES["cdn"],
    "file_storage": SERVICE_TYPE_ALIASES["file_storage"],
    "cloud_desktop": SERVICE_TYPE_ALIASES["cloud_desktop"],
    "network_security": SERVICE_TYPE_ALIASES["network_security"],
}


def parse_price(value: Any) -> float:
    if value is None:
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    cleaned = str(value).replace(" ", "").replace(",", ".")
    match = re.search(r"-?\d+(?:\.\d+)?", cleaned)
    return float(match.group(0)) if match else 0.0


def as_list(value: Any) -> list[Any]:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [value]


def normalize_tags(tags: Any) -> list[str]:
    return [str(tag).strip() for tag in as_list(tags) if tag is not None and str(tag).strip()]


def normalize_token(value: Any) -> str:
    return str(value).lower().replace("_", " ").replace("-", " ").strip()


def canonical_service_type(value: Any) -> Optional[str]:
    text = normalize_token(value)
    if not text:
        return None

    for canonical, aliases in SERVICE_TYPE_ALIASES.items():
        if any(normalize_token(alias) in text for alias in aliases):
            return canonical
    return text.replace(" ", "_")


def service_search_text(service: dict[str, Any], provider_name: str) -> str:
    tech_stack = " ".join(normalize_tags(service.get("tech_stack") or []))
    compliance = " ".join(normalize_tags(service.get("compliance_tags") or []))
    attributes = service.get("attributes") or {}
    attributes_text = " ".join(str(value) for value in attributes.values() if value is not None)
    canonical_type = canonical_service_type(attributes.get("resource_type") or service.get("category")) or ""

    return " ".join(
        part
        for part in [
            provider_name,
            service.get("category"),
            canonical_type,
            service.get("name"),
            service.get("description"),
            tech_stack,
            compliance,
            attributes_text,
        ]
        if part
    )


def infer_service_regions(provider: dict[str, Any], service: dict[str, Any]) -> list[str]:
    attributes = service.get("attributes") or {}
    raw_regions: list[Any] = [
        *as_list(provider.get("regions")),
        *as_list(service.get("regions")),
        attributes.get("region"),
        attributes.get("country"),
    ]

    if provider.get("is_152fz_compliant"):
        raw_regions.extend(["Россия", "RU"])

    seen: set[str] = set()
    regions: list[str] = []
    for region in normalize_tags(raw_regions):
        key = normalize_token(region)
        if key not in seen:
            seen.add(key)
            regions.append(region)
    return regions


def load_provider_services() -> list[IndexedService]:
    if not PROVIDERS_DIR.exists():
        raise RuntimeError(f"Providers directory does not exist: {PROVIDERS_DIR}")

    services: list[IndexedService] = []
    for path in sorted(PROVIDERS_DIR.glob("*.json")):
        payload = json.loads(path.read_text(encoding="utf-8"))
        provider = payload.get("provider") or {}
        provider_name = provider.get("name") or path.stem

        for item in payload.get("services") or []:
            pricing = item.get("pricing") or {}
            attributes = item.get("attributes") or {}
            tech_stack = normalize_tags(item.get("tech_stack") or [])
            compliance_tags = normalize_tags(item.get("compliance_tags") or [])
            provider_compliant = bool(provider.get("is_152fz_compliant", False))
            service_compliant = any("152" in normalize_token(tag) for tag in compliance_tags)

            services.append(
                IndexedService(
                    service_id=str(item.get("service_id") or f"{path.stem}-{len(services)}"),
                    name=str(item.get("name") or "Unnamed service"),
                    description=str(item.get("description") or item.get("name") or ""),
                    provider_name=str(provider_name),
                    provider_id=provider.get("provider_id"),
                    is_152fz_compliant=provider_compliant or service_compliant,
                    category=item.get("category"),
                    price_rub=parse_price(
                        item.get("price_from_rub")
                        or pricing.get("price_per_month_rub")
                        or pricing.get("price_from_rub")
                    ),
                    regions=infer_service_regions(provider, item),
                    tech_stack=tech_stack,
                    compliance_tags=compliance_tags,
                    source_url=item.get("source_url"),
                    attributes=attributes,
                    search_text=service_search_text(item, provider_name),
                )
            )

    return services


@app.on_event("startup")
def load_ml_model() -> None:
    global indexed_services, ml_model, service_vectors

    indexed_services = load_provider_services()
    if not indexed_services:
        raise RuntimeError("No provider services were loaded")

    print(f"Loaded {len(indexed_services)} provider services from {PROVIDERS_DIR}")
    print(f"Loading Sentence-BERT model: {MODEL_NAME}")

    ml_model = SentenceTransformer(MODEL_NAME)
    service_vectors = ml_model.encode(
        [service.search_text for service in indexed_services],
        convert_to_numpy=True,
        normalize_embeddings=True,
        show_progress_bar=True,
    )
    print("Sentence-BERT vectors are ready")


def calculate_economy_score(max_budget: Optional[float], price: float) -> float:
    if max_budget is None or max_budget <= 0:
        return 0.0
    if price <= 0:
        return 1.0
    if price > max_budget:
        return -1.0
    return 1.0 - (price / max_budget) ** 2


def get_strict_service_tags(service: IndexedService) -> set[str]:
    raw_tags: list[Any] = [
        service.provider_name,
        service.provider_id,
        service.category,
        service.attributes.get("resource_type"),
        service.attributes.get("disk_type"),
        canonical_service_type(service.category),
        canonical_service_type(service.attributes.get("resource_type")),
        *service.tech_stack,
        *service.compliance_tags,
    ]
    if service.is_152fz_compliant:
        raw_tags.extend(["152-fz", "152fz", "ru", "россия"])
    return {str(tag).lower().strip() for tag in raw_tags if tag}


def normalize_user_tags(intent: UserIntent) -> set[str]:
    raw_tags = [
        intent.task_type,
        intent.primary_service_type,
        *intent.explicit_needs,
        *intent.extracted_tech_stack,
        *intent.inferred_needs,
        *intent.optional_needs,
    ]
    tags = {str(tag).lower().strip() for tag in raw_tags if tag is not None and str(tag).strip()}
    canonical_primary = canonical_service_type(intent.primary_service_type)
    if canonical_primary:
        tags.add(canonical_primary)
    if intent.requires_152fz:
        tags.update(["152-fz", "152fz"])
    if intent.country and intent.country.upper() == "RU":
        tags.update(["ru", "россия"])
    return tags


def numeric_attribute(service: IndexedService, key: str) -> Optional[float]:
    value = service.attributes.get(key)
    if isinstance(value, (int, float)):
        return float(value)
    if value is None:
        return None
    match = re.search(r"-?\d+(?:[.,]\d+)?", str(value))
    return float(match.group(0).replace(",", ".")) if match else None


def service_type(service: IndexedService) -> Optional[str]:
    return canonical_service_type(service.attributes.get("resource_type")) or canonical_service_type(
        service.category,
    )


def score_minimum_requirement(
    actual: Optional[float],
    required: Optional[float],
    label: str,
    unit: str,
) -> tuple[Optional[float], Optional[str]]:
    if required is None or required <= 0:
        return None, None
    if actual is None:
        return 0.0, None

    score = min(actual / required, 1.0)
    matched = f"{label}: {actual:g} {unit} >= {required:g} {unit}" if actual >= required else None
    return score, matched


def has_resource_requirements(intent: UserIntent) -> bool:
    requirements = intent.resource_requirements
    return any(
        [
            intent.primary_service_type,
            requirements.cpu_min,
            requirements.ram_gb_min,
            requirements.disk_gb_min,
            requirements.disk_type,
            requirements.high_iops_preferred,
        ],
    )


def calculate_resource_fit_score(intent: UserIntent, service: IndexedService) -> tuple[float, list[str]]:
    requirements = intent.resource_requirements
    scores: list[float] = []
    matched_requirements: list[str] = []

    expected_type = canonical_service_type(intent.primary_service_type)
    actual_type = service_type(service)
    if expected_type:
        type_score = 1.0 if actual_type == expected_type else 0.0
        scores.append(type_score)
        if type_score == 1.0:
            matched_requirements.append(f"тип услуги: {expected_type}")

    for key, label, unit, required in [
        ("cpu", "CPU", "CPU", requirements.cpu_min),
        ("ram_gb", "RAM", "GB", requirements.ram_gb_min),
        ("disk_gb", "disk", "GB", requirements.disk_gb_min),
    ]:
        score, matched = score_minimum_requirement(numeric_attribute(service, key), required, label, unit)
        if score is not None:
            scores.append(score)
        if matched:
            matched_requirements.append(matched)

    disk_type_required = normalize_token(requirements.disk_type) if requirements.disk_type else ""
    service_text = normalize_token(
        " ".join(
            [
                str(service.attributes.get("disk_type") or ""),
                " ".join(service.tech_stack),
                service.name,
                service.description,
            ],
        ),
    )

    if disk_type_required:
        disk_type_score = 1.0 if disk_type_required in service_text else 0.0
        scores.append(disk_type_score)
        if disk_type_score == 1.0:
            matched_requirements.append(f"тип диска: {requirements.disk_type}")

    if requirements.high_iops_preferred:
        if "high" in service_text or "iops" in service_text or "быстр" in service_text:
            high_iops_score = 1.0
        elif "ssd" in service_text:
            high_iops_score = 0.65
        else:
            high_iops_score = 0.0
        scores.append(high_iops_score)
        if high_iops_score >= 1.0:
            matched_requirements.append("High-IOPS SSD")
        elif high_iops_score > 0:
            matched_requirements.append("SSD")

    if not scores:
        return 0.0, matched_requirements

    score = sum(scores) / len(scores)
    if expected_type and actual_type and actual_type != expected_type:
        score = min(score, 0.35)
    return score, matched_requirements


def requested_capabilities(intent: UserIntent) -> list[str]:
    need_text = normalize_token(
        " ".join(
            [
                intent.task_type,
                intent.primary_service_type or "",
                *intent.explicit_needs,
                *intent.extracted_tech_stack,
                *intent.inferred_needs,
                *intent.optional_needs,
            ],
        ),
    )
    if intent.workload.backup_required:
        need_text += " cloud backup backup резерв"
    if intent.workload.stable_network_required:
        need_text += " stable network load balancer"

    return [
        capability
        for capability, aliases in CAPABILITY_ALIASES.items()
        if any(normalize_token(alias) in need_text for alias in aliases)
    ]


def calculate_capability_score(
    requested: list[str],
    service: IndexedService,
) -> tuple[float, list[str]]:
    if not requested:
        return 0.0, []

    service_text = normalize_token(
        " ".join(
            [
                service.category or "",
                service.name,
                service.description,
                *service.tech_stack,
                *service.compliance_tags,
                str(service.attributes.get("resource_type") or ""),
                " ".join(str(value) for value in service.attributes.values() if value is not None),
            ],
        ),
    )

    matched = [
        capability
        for capability in requested
        if any(normalize_token(alias) in service_text for alias in CAPABILITY_ALIASES[capability])
    ]
    return len(matched) / len(requested), matched


def normalize_region(value: str) -> str:
    return normalize_token(value).replace("ё", "е")


def is_russia_region(value: str) -> bool:
    region = normalize_region(value)
    return any(alias in region for alias in ["ru", "росси", "рф", "москва", "санкт петербург", "снг"])


def region_matches(requested_region: Optional[str], service_regions: list[str]) -> bool:
    if not requested_region or not service_regions:
        return True

    requested = normalize_region(requested_region)
    requested_is_russia = is_russia_region(requested)
    for region in service_regions:
        normalized = normalize_region(region)
        if requested in normalized or normalized in requested:
            return True
        if requested_is_russia and is_russia_region(normalized):
            return True
    return False


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok" if ml_model is not None and service_vectors is not None else "loading",
        "services": len(indexed_services),
        "model": MODEL_NAME,
    }


@app.post("/api/v1/rank", response_model=RankResponse, tags=["Recommendation Engine"])
async def rank_services(request: RankRequest) -> RankResponse:
    if ml_model is None or service_vectors is None:
        raise HTTPException(status_code=503, detail="ML model is still loading")

    intent = request.user_intent
    semantic_query = intent.semantic_query or " ".join(
        [
            intent.task_type,
            intent.primary_service_type or "",
            *intent.explicit_needs,
            *intent.extracted_tech_stack,
            *intent.inferred_needs,
            *intent.optional_needs,
        ],
    )

    user_tags = normalize_user_tags(intent)
    capabilities = requested_capabilities(intent)

    user_vector = ml_model.encode([semantic_query], convert_to_numpy=True, normalize_embeddings=True)
    semantic_scores = cosine_similarity(user_vector, service_vectors)[0]

    has_budget = intent.budget_max_rub is not None and intent.budget_max_rub > 0
    has_resources = has_resource_requirements(intent)
    has_capabilities = len(capabilities) > 0

    if has_resources:
        weight_semantic = 0.25
        weight_jaccard = 0.15
        weight_resource = 0.45
        weight_capability = 0.10 if has_capabilities else 0.0
        weight_economy = 0.05 if has_budget else 0.0
    else:
        weight_semantic = 0.55
        weight_jaccard = 0.30
        weight_resource = 0.0
        weight_capability = 0.15 if has_capabilities else 0.0
        weight_economy = 0.10 if has_budget else 0.0

    total_weight = weight_semantic + weight_jaccard + weight_resource + weight_capability + weight_economy

    scored_services: list[RecommendedService] = []
    for index, service in enumerate(indexed_services):
        if intent.requires_152fz and not service.is_152fz_compliant:
            continue
        if not region_matches(intent.region, service.regions):
            continue

        economy_score = calculate_economy_score(intent.budget_max_rub, service.price_rub)
        if economy_score < 0:
            continue

        service_tags = get_strict_service_tags(service)
        matched_tags = sorted(user_tags.intersection(service_tags))
        union_len = len(user_tags.union(service_tags))
        jaccard_score = len(matched_tags) / union_len if union_len > 0 else 0.0

        resource_fit_score, matched_requirements = calculate_resource_fit_score(intent, service)
        capability_score, matched_capabilities = calculate_capability_score(capabilities, service)
        matched_requirements.extend(f"capability: {capability}" for capability in matched_capabilities)

        raw_semantic = float(semantic_scores[index])
        norm_semantic = max(0.0, min(1.0, (raw_semantic - 0.3) / 0.5))

        final_score_raw = (
            norm_semantic * weight_semantic
            + jaccard_score * weight_jaccard
            + resource_fit_score * weight_resource
            + capability_score * weight_capability
            + economy_score * weight_economy
        ) / total_weight
        final_score_100 = round(min(final_score_raw * 100 * 1.1, 99.9), 1)

        scored_services.append(
            RecommendedService(
                service_id=service.service_id,
                name=service.name,
                description=service.description,
                provider_name=service.provider_name,
                category=service.category,
                price_rub=round(service.price_rub, 2),
                final_score_100=final_score_100,
                matched_tags=matched_tags,
                matched_requirements=matched_requirements,
                tech_stack=service.tech_stack,
                compliance_tags=service.compliance_tags,
                regions=service.regions,
                source_url=service.source_url,
                metrics_breakdown=MetricBreakdown(
                    semantic_similarity=round(norm_semantic, 3),
                    jaccard_index=round(jaccard_score, 3),
                    resource_fit=round(resource_fit_score, 3),
                    capability_score=round(capability_score, 3),
                    economy_score=round(max(0.0, economy_score), 3),
                ),
            ),
        )

    scored_services.sort(key=lambda x: x.final_score_100, reverse=True)
    top = scored_services[: request.top_n]

    return RankResponse(
        user_context={
            "task_type": intent.task_type,
            "primary_service_type": intent.primary_service_type,
            "requires_152fz": intent.requires_152fz,
            "budget_max_rub": intent.budget_max_rub,
            "budget_priority": intent.budget_priority,
            "region": intent.region,
            "country": intent.country,
            "resource_requirements": intent.resource_requirements.model_dump(),
            "workload": intent.workload.model_dump(),
            "explicit_needs": intent.explicit_needs,
            "extracted_tech_stack": intent.extracted_tech_stack,
            "inferred_needs": intent.inferred_needs,
            "optional_needs": intent.optional_needs,
            "semantic_query": intent.semantic_query,
            "reasoning_summary": intent.reasoning_summary,
            "requested_capabilities": capabilities,
        },
        top_recommendations=top,
        top_3_recommendations=top[:3],
    )


if __name__ == "__main__":
    uvicorn.run(
        app,
        host=os.getenv("RANKER_HOST", "0.0.0.0"),
        port=int(os.getenv("RANKER_PORT", "8000")),
        reload=False,
    )
