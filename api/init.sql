-- Inicialização do banco Dínamo Sombrio
-- Executado automaticamente pelo container postgres na primeira inicialização

CREATE TABLE IF NOT EXISTS pontuacoes (
  id                SERIAL        PRIMARY KEY,
  apelido           VARCHAR(16)   NOT NULL DEFAULT 'ANÔNIMO',
  pontuacao         INTEGER       NOT NULL CHECK (pontuacao >= 0),
  noites_completas  SMALLINT      NOT NULL DEFAULT 0 CHECK (noites_completas >= 0),
  vitoria           BOOLEAN       NOT NULL DEFAULT FALSE,
  fase_maxima       SMALLINT      NOT NULL DEFAULT 1 CHECK (fase_maxima >= 1),
  conquistas        TEXT          NOT NULL DEFAULT '',
  criado_em         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pontuacoes_score
  ON pontuacoes (fase_maxima DESC, pontuacao DESC, criado_em ASC);

-- Migration: adiciona fase_maxima se a tabela já existia (upgrade de v1.x)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='pontuacoes' AND column_name='fase_maxima'
  ) THEN
    ALTER TABLE pontuacoes ADD COLUMN fase_maxima SMALLINT NOT NULL DEFAULT 1;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='pontuacoes' AND column_name='conquistas'
  ) THEN
    ALTER TABLE pontuacoes ADD COLUMN conquistas TEXT NOT NULL DEFAULT '';
  END IF;
END$$;

COMMENT ON TABLE  pontuacoes              IS 'Registro global de pontuações do Dínamo Sombrio';
COMMENT ON COLUMN pontuacoes.pontuacao         IS 'noites_completas*1000 + tempo_total_sobrevivido';
COMMENT ON COLUMN pontuacoes.noites_completas  IS 'Etapas concluídas (0-5: 3 noites dinamo + corredor + elevador)';
COMMENT ON COLUMN pontuacoes.fase_maxima       IS '1=Dínamo 2=Corredor 3=Elevador (fase em que morreu ou venceu)';
