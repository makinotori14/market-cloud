CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS recommendation_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prompt TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS cloud_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES recommendation_requests(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  final_score NUMERIC(5, 2) NOT NULL CHECK (final_score >= 0 AND final_score <= 100),
  monthly_price_rub NUMERIC(12, 2),
  services TEXT[] NOT NULL DEFAULT '{}',
  reasons TEXT[] NOT NULL DEFAULT '{}',
  risks TEXT[] NOT NULL DEFAULT '{}',
  estimated_cost_level TEXT NOT NULL CHECK (estimated_cost_level IN ('low', 'medium', 'high')),
  icon TEXT NOT NULL DEFAULT '/cloud-service.svg',
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recommendation_requests_created_at
  ON recommendation_requests (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cloud_recommendations_request_score
  ON cloud_recommendations (request_id, final_score DESC);
