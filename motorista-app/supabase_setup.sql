-- ============================================================
-- TRANS AMBIENTAL — App Motorista
-- Execute este script no Supabase SQL Editor
-- ============================================================

-- Tabela de motoristas
CREATE TABLE IF NOT EXISTS motoristas (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       TEXT NOT NULL,
  celular    TEXT,
  ativo      BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de trocas enviadas pelos motoristas
CREATE TABLE IF NOT EXISTS trocas_pendentes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  motorista_id     UUID REFERENCES motoristas(id) ON DELETE SET NULL,
  motorista_nome   TEXT NOT NULL,
  cliente          TEXT NOT NULL,
  cacamba_retirada TEXT NOT NULL,
  cacamba_entregue TEXT NOT NULL,
  observacao       TEXT,
  status           TEXT NOT NULL DEFAULT 'PENDENTE'
                     CHECK (status IN ('PENDENTE', 'APROVADO', 'REJEITADO')),
  motivo_rejeicao  TEXT,
  aprovado_por     TEXT,
  aprovado_em      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS trocas_pendentes_motorista_idx ON trocas_pendentes(motorista_id);
CREATE INDEX IF NOT EXISTS trocas_pendentes_status_idx ON trocas_pendentes(status);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE motoristas       ENABLE ROW LEVEL SECURITY;
ALTER TABLE trocas_pendentes ENABLE ROW LEVEL SECURITY;

-- Motoristas: leitura pública (select no login do app)
DROP POLICY IF EXISTS "motoristas_select" ON motoristas;
CREATE POLICY "motoristas_select" ON motoristas
  FOR SELECT USING (true);

-- Trocas: qualquer um pode inserir e ler
DROP POLICY IF EXISTS "trocas_insert" ON trocas_pendentes;
CREATE POLICY "trocas_insert" ON trocas_pendentes
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "trocas_select" ON trocas_pendentes;
CREATE POLICY "trocas_select" ON trocas_pendentes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "trocas_update" ON trocas_pendentes;
CREATE POLICY "trocas_update" ON trocas_pendentes
  FOR UPDATE USING (true);

-- ── Dados iniciais (ajuste os nomes) ─────────────────────────────────────────
INSERT INTO motoristas (nome, ativo) VALUES
  ('Carlos Silva',   true),
  ('João Pereira',   true),
  ('Pedro Santos',   true),
  ('Marcos Lima',    true)
ON CONFLICT DO NOTHING;
