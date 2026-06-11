'use strict';

const express = require('express');
const { Pool } = require('pg');
const cors    = require('cors');

const app = express();
app.use(express.json({ limit: '16kb' }));
app.use(cors());

// ---------- pool de conexões ----------
const pool = new Pool({
  host:     process.env.PG_HOST || 'postgres',
  port:     parseInt(process.env.PG_PORT || '5432'),
  database: process.env.PG_DB   || 'dinamo_ranking',
  user:     process.env.PG_USER || 'dinamo',
  password: process.env.PG_PASS || 'dinamo123',
  max:      10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 3000,
});

pool.on('error', (err) => {
  console.error('[pool] erro inesperado:', err.message);
});

// ---------- helpers ----------
function sanitizeApelido(raw) {
  if (typeof raw !== 'string') return 'ANÔNIMO';
  const limpo = raw
    .replace(/[<>&"'`]/g, '')   // strip chars perigosos
    .trim()
    .toUpperCase()
    .slice(0, 16);
  return limpo || 'ANÔNIMO';
}

function toInt(val, fallback = 0, min = 0) {
  const n = Math.floor(Number(val));
  return isNaN(n) ? fallback : Math.max(min, n);
}

// ---------- rotas ----------

// GET /api/health
app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, ts: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ ok: false, error: err.message });
  }
});

// GET /api/ranking?limit=20
app.get('/api/ranking', async (req, res) => {
  try {
    const limit = Math.min(toInt(req.query.limit, 20, 1), 50);
    const { rows } = await pool.query(
      `SELECT
         ROW_NUMBER() OVER (ORDER BY fase_maxima DESC, pontuacao DESC, criado_em ASC) AS posicao,
         apelido,
         pontuacao,
         noites_completas,
         vitoria,
         fase_maxima,
         TO_CHAR(criado_em AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YY') AS data
       FROM pontuacoes
       ORDER BY fase_maxima DESC, pontuacao DESC, criado_em ASC
       LIMIT $1`,
      [limit]
    );
    res.json(rows);
  } catch (err) {
    console.error('[GET /api/ranking]', err.message);
    res.status(500).json({ error: 'Erro ao buscar ranking' });
  }
});

// POST /api/score
// Body: { apelido, pontuacao, noites_completas, vitoria, fase_maxima }
app.post('/api/score', async (req, res) => {
  try {
    const apelido          = sanitizeApelido(req.body.apelido);
    const pontuacao        = toInt(req.body.pontuacao, 0, 0);
    const noites_completas = toInt(req.body.noites_completas, 0, 0);
    const vitoria          = Boolean(req.body.vitoria);
    const fase_maxima      = Math.max(1, Math.min(3, toInt(req.body.fase_maxima, 1, 1)));

    const insert = await pool.query(
      `INSERT INTO pontuacoes (apelido, pontuacao, noites_completas, vitoria, fase_maxima)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, apelido, pontuacao, noites_completas, vitoria, fase_maxima`,
      [apelido, pontuacao, noites_completas, vitoria, fase_maxima]
    );
    const registro = insert.rows[0];

    // Posição no ranking (mesmo critério de ordenação)
    const pos = await pool.query(
      `SELECT COUNT(*) + 1 AS posicao FROM pontuacoes
       WHERE fase_maxima > $1 OR (fase_maxima = $1 AND pontuacao > $2)`,
      [fase_maxima, pontuacao]
    );
    registro.posicao = parseInt(pos.rows[0].posicao);

    res.status(201).json(registro);
  } catch (err) {
    console.error('[POST /api/score]', err.message);
    res.status(500).json({ error: 'Erro ao salvar pontuação' });
  }
});

// ---------- iniciar servidor ----------
const PORT = parseInt(process.env.PORT || '3000');

async function main() {
  // Aguardar banco ficar disponível (retry simples)
  let tentativas = 0;
  while (tentativas < 10) {
    try {
      await pool.query('SELECT 1');
      console.log('[db] conectado ao PostgreSQL');
      break;
    } catch (err) {
      tentativas++;
      console.warn(`[db] aguardando postgres... tentativa ${tentativas}/10`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  app.listen(PORT, () => {
    console.log(`[api] Dínamo API rodando na porta ${PORT}`);
  });
}

main().catch(err => {
  console.error('[fatal]', err.message);
  process.exit(1);
});
