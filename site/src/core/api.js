export function lerApelido() {
  try { return localStorage.getItem('dinamo-apelido') || ''; } catch (e) { return ''; }
}

export function salvarApelido(v) {
  try { localStorage.setItem('dinamo-apelido', v); } catch (e) { }
}

export function apelidoAtual() {
  const inp = document.getElementById('input-apelido');
  const val = (inp ? inp.value.trim().toUpperCase() : '') || lerApelido() || 'ANÔNIMO';
  return val.slice(0, 16) || 'ANÔNIMO';
}

export async function enviarScore(pontuacao, noitesCompletas, vitoria, faseMaxima) {
  try {
    let conqs = [];
    try { conqs = JSON.parse(localStorage.getItem('dinamo-achievements')||'[]'); } catch(e){}
    const resp = await fetch('/api/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apelido: apelidoAtual(), pontuacao, noites_completas: noitesCompletas, vitoria, fase_maxima: faseMaxima, conquistas: conqs })
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    return await resp.json();
  } catch (e) { return null; }
}

export async function carregarRanking(seletor, limit = 10) {
  const el = document.querySelector(seletor);
  if (!el) return;
  el.innerHTML = '<div class="rank-loading">CARREGANDO...</div>';
  try {
    const resp = await fetch(`/api/ranking?limit=${limit}`);
    if (!resp.ok) throw new Error();
    renderRanking(el, await resp.json());
  } catch (e) { el.innerHTML = '<div class="rank-offline">⚡ SERVIÇO INDISPONÍVEL</div>'; }
}

function renderRanking(el, dados) {
  if (!dados || dados.length === 0) { el.innerHTML = '<div class="rank-vazio">NENHUM OPERADOR REGISTRADO</div>'; return; }
  const medalhas = ['rank-ouro', 'rank-prata', 'rank-bronze'];
  const iconesFase = { 1: '⚙️ Dínamo', 2: '🕯️ Corredor', 3: '⛓️ Elevador', 4: '❄️ Exterior' };
  el.innerHTML = dados.map((r, i) => {
    const pos = r.posicao || (i + 1);
    const cls = medalhas[i] || '';
    const vCls = r.vitoria ? ' vitoria' : '';
    const icone = iconesFase[r.fase_maxima] || '⚙️';
    const numConq = r.conquistas ? (r.conquistas.split(',').filter(x=>x).length) : 0;
    const conqBadge = numConq > 0 ? ` <span style="color:#d8c9a3;font-size:0.8em">★${numConq}</span>` : '';
    return `<div class="rank-row ${cls}">
      <span class="rank-pos">#${pos}</span>
      <span class="rank-nome">${escHtml(r.apelido)}${conqBadge}</span>
      <span class="rank-fase${vCls}">${icone}</span>
      <span class="rank-pts">${r.pontuacao.toLocaleString('pt-BR')} pts</span>
    </div>`;
  }).join('');
}

function escHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
