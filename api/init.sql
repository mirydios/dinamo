-- Inicialização do banco Dínamo Sombrio
-- Executado automaticamente pelo container postgres na primeira inicialização

CREATE TABLE IF NOT EXISTS pontuacoes (
  id                SERIAL        PRIMARY KEY,
  apelido           VARCHAR(16)   NOT NULL DEFAULT 'ANÔNIMO',
  pontuacao         INTEGER       NOT NULL CHECK (pontuacao >= 0),
  noites_completas  SMALLINT      NOT NULL DEFAULT 0 CHECK (noites_completas >= 0),
  vitoria           BOOLEAN       NOT NULL DEFAULT FALSE,
  criado_em         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Índice para ordenação rápida por pontuação (ranking)
CREATE INDEX IF NOT EXISTS idx_pontuacoes_score
  ON pontuacoes (pontuacao DESC, criado_em ASC);

-- Comentários descritivos
COMMENT ON TABLE pontuacoes IS 'Registro global de pontuações do Dínamo Sombrio';
COMMENT ON COLUMN pontuacoes.apelido           IS 'Apelido do jogador (máx 16 chars, uppercase)';
COMMENT ON COLUMN pontuacoes.pontuacao         IS 'noites_completas*1000 + tempo_total_sobrevivido';
COMMENT ON COLUMN pontuacoes.noites_completas  IS 'Noites completadas com sucesso (0–N, extensível)';
COMMENT ON COLUMN pontuacoes.vitoria           IS 'TRUE se completou todas as noites disponíveis';
