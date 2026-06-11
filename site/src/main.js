import { GLOBAL, resizeCanvas, CanvasInfo, salvarApelido, lerApelido, enviarScore, carregarRanking } from './core/global.js';
import { initAudio, somSusto } from './core/audio.js';
import { FaseDinamo } from './fases/faseDinamo.js';
import { FaseCorredor } from './fases/faseCorredor.js';
import { FaseElevador } from './fases/faseElevador.js';
import { carregarRanking as cRank } from './core/api.js';

let ultimo = performance.now();

function loop(agora) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (agora - ultimo) / 1000); ultimo = agora;
  if (GLOBAL.faseObj && !GLOBAL.morto) {
    GLOBAL.faseObj.atualizar(dt);
    GLOBAL.faseObj.desenhar();
  }
}

window.addEventListener('keydown', e => {
  if (e.repeat) return;
  if (GLOBAL.faseObj && GLOBAL.faseObj.onKey) GLOBAL.faseObj.onKey(e.key.toLowerCase(), true);
});
window.addEventListener('keyup', e => {
  if (GLOBAL.faseObj && GLOBAL.faseObj.onKey) GLOBAL.faseObj.onKey(e.key.toLowerCase(), false);
});
['zonaE', 'zonaD'].forEach(id => {
  document.getElementById(id).addEventListener('pointerdown', e => { e.preventDefault(); if (GLOBAL.faseObj && GLOBAL.faseObj.girar) GLOBAL.faseObj.girar(id === 'zonaE' ? 'E' : 'D'); });
});
document.getElementById('btn-acao1').addEventListener('pointerdown', e => { e.preventDefault(); if (GLOBAL.faseObj && GLOBAL.faseObj.onKey) GLOBAL.faseObj.onKey('e', true); });
window.addEventListener('pointerup', () => { if (GLOBAL.faseObj && GLOBAL.faseObj.onKey) GLOBAL.faseObj.onKey('e', false); });

['up', 'left', 'right', 'down'].forEach(dir => {
  const el = document.getElementById('d-' + dir);
  if (el) {
    el.addEventListener('pointerdown', e => { e.preventDefault(); if (GLOBAL.faseObj && GLOBAL.faseObj.onKey) GLOBAL.faseObj.onKey('arrow' + dir, true); });
    el.addEventListener('pointerup', e => { e.preventDefault(); if (GLOBAL.faseObj && GLOBAL.faseObj.onKey) GLOBAL.faseObj.onKey('arrow' + dir, false); });
  }
});
const dCenter = document.getElementById('d-center');
if (dCenter) {
  dCenter.addEventListener('pointerdown', e => { e.preventDefault(); if (GLOBAL.faseObj && GLOBAL.faseObj.onKey) GLOBAL.faseObj.onKey(' ', true); });
  dCenter.addEventListener('pointerup', e => { e.preventDefault(); if (GLOBAL.faseObj && GLOBAL.faseObj.onKey) GLOBAL.faseObj.onKey(' ', false); });
}

export function iniciarPartida() {
  salvarApelido(document.getElementById('input-apelido').value.trim().toUpperCase().slice(0, 16));
  initAudio();
  document.getElementById('tela-inicio').classList.add('hidden');

  GLOBAL.tempoAcumulado = 0;
  GLOBAL.faseID = 1;
  GLOBAL.noiteDinamo = 0;

  prepararFase();
}

function prepararFase() {
  GLOBAL.morto = false;
  document.getElementById('hud').classList.add('hidden');
  document.getElementById('tela-fase').classList.remove('hidden');

  if (GLOBAL.faseID === 1) {
    document.getElementById('fase-titulo').textContent = `DÍNAMO - NOITE ${GLOBAL.noiteDinamo + 1}`;
    document.getElementById('fase-sub').textContent = FaseDinamo.NOITES_DINAMO ? FaseDinamo.NOITES_DINAMO[GLOBAL.noiteDinamo].sub : '';
  } else if (GLOBAL.faseID === 2) {
    document.getElementById('fase-titulo').textContent = 'CORREDOR ESCURO';
    document.getElementById('fase-sub').textContent = 'A luz atrai, mas a escuridão mata. Encontre o elevador.';
  } else if (GLOBAL.faseID === 3) {
    document.getElementById('fase-titulo').textContent = 'POÇO DO ELEVADOR';
    document.getElementById('fase-sub').textContent = 'Suba. Não pare. Não olhe para baixo.';
  }
}

document.getElementById('btn-fase').addEventListener('click', () => {
  document.getElementById('tela-fase').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');

  if (GLOBAL.faseID === 1) GLOBAL.faseObj = FaseDinamo;
  else if (GLOBAL.faseID === 2) GLOBAL.faseObj = FaseCorredor;
  else if (GLOBAL.faseID === 3) GLOBAL.faseObj = FaseElevador;

  GLOBAL.faseObj.iniciar();
});

export function completarFase(tempoLongo) {
  GLOBAL.faseObj = null;
  GLOBAL.tempoAcumulado += tempoLongo;
  document.getElementById('hud').classList.add('hidden');
  document.getElementById('zonaE').classList.add('hidden');
  document.getElementById('zonaD').classList.add('hidden');
  document.getElementById('btn-acao1').classList.add('hidden');
  document.getElementById('acao1-prog').classList.add('hidden');
  document.getElementById('dpad').classList.add('hidden');

  if (GLOBAL.faseID === 1) {
    GLOBAL.noiteDinamo++;
    if (GLOBAL.noiteDinamo >= 3) {
      GLOBAL.faseID = 2;
      mostrarCutscene([
        "O dínamo estabilizou. A energia está mantida.",
        "Mas a saída... A saída fica três andares acima.",
        "O elevador ainda funciona. Mas o corredor até lá está no escuro."
      ], prepararFase);
    } else {
      prepararFase();
    }
  } else if (GLOBAL.faseID === 2) {
    GLOBAL.faseID = 3;
    mostrarCutscene([
      "Você bate as portas de metal do elevador.",
      "Seguro. Por enquanto.",
      "As engrenagens estão velhas. Gire a manivela para subir.",
      "Cuidado com a tensão do cabo."
    ], prepararFase);
  } else if (GLOBAL.faseID === 3) {
    GLOBAL.pontuacaoFinal = (5 * 1000) + Math.floor(GLOBAL.tempoAcumulado);
    import('./core/api.js').then(({ enviarScore }) => {
      enviarScore(GLOBAL.pontuacaoFinal, 5, true, 3).then(dados => {
        mostrarFim('FUGA CONCLUÍDA', 'vitoria', 'A luz do sol. Você sobreviveu à Usina Nº 7.', GLOBAL.pontuacaoFinal, dados ? dados.posicao : null);
      });
    });
  }
}

export function triggerMorte(textoCausa) {
  GLOBAL.morto = true;
  somSusto();
  document.getElementById('susto-aviso').textContent = 'PEGO';
  document.getElementById('susto-aviso').className = 'on';

  const noc = GLOBAL.faseID === 1 ? GLOBAL.noiteDinamo : (GLOBAL.faseID === 2 ? 3 : 4);
  const pts = (noc * 1000) + Math.floor(GLOBAL.tempoAcumulado + GLOBAL.faseObj.S.t);

  import('./core/api.js').then(({ enviarScore }) => {
    enviarScore(pts, noc, false, GLOBAL.faseMaximaDB).then(dados => {
      setTimeout(() => {
        document.getElementById('susto-aviso').className = '';
        mostrarFim('FIM DA LINHA', 'morte', textoCausa, pts, dados ? dados.posicao : null);
      }, 1500);
    });
  });
}

function mostrarFim(titulo, classe, texto, pts, pos) {
  GLOBAL.faseObj = null;
  document.getElementById('hud').classList.add('hidden');
  document.getElementById('zonaE').classList.add('hidden');
  document.getElementById('zonaD').classList.add('hidden');
  document.getElementById('btn-acao1').classList.add('hidden');
  document.getElementById('acao1-prog').classList.add('hidden');
  document.getElementById('dpad').classList.add('hidden');

  const t = document.getElementById('fim-titulo'); t.textContent = titulo; t.className = classe;
  document.getElementById('fim-texto').textContent = texto;
  document.getElementById('fim-rank-posicao').textContent = pos ? `★ #${pos} NO RANKING GLOBAL — ${pts.toLocaleString()} pts` : `PONTUAÇÃO: ${pts.toLocaleString()} pts`;
  document.getElementById('tela-fim').classList.remove('hidden');
  import('./core/api.js').then(({ carregarRanking }) => carregarRanking('#ranking-lista', 10));
}

document.getElementById('btn-reiniciar').addEventListener('click', () => {
  document.getElementById('tela-fim').classList.add('hidden');
  iniciarPartida();
});

function mostrarCutscene(linhas, callbackFim) {
  const el = document.getElementById('tela-cutscene');
  el.classList.remove('hidden'); setTimeout(() => el.classList.add('visivel'), 50);
  const txt = document.getElementById('cutscene-texto'); txt.innerHTML = '';
  const btn = document.getElementById('btn-cutscene'); btn.classList.remove('visivel');

  let l = 0, c = 0, esp = false;
  function avancar() {
    if (l >= linhas.length) {
      const cur = document.getElementById('cutscene-cursor'); if (cur) cur.remove();
      btn.classList.add('visivel');
      btn.onclick = () => { el.classList.remove('visivel'); setTimeout(() => { el.classList.add('hidden'); callbackFim(); }, 800); };
      return;
    }
    if (esp) { esp = false; l++; c = 0; avancar(); return; }
    let spanAtual = txt.querySelector('.linha-atual');
    if (!spanAtual) { spanAtual = document.createElement('span'); spanAtual.className = 'linha linha-atual'; txt.appendChild(spanAtual); }
    if (c < linhas[l].length) {
      spanAtual.textContent = linhas[l].slice(0, c + 1); c++;
      setTimeout(avancar, 30);
    } else {
      spanAtual.classList.remove('linha-atual'); esp = true; setTimeout(avancar, 1000);
    }
  }
  const cursor = document.createElement('span'); cursor.id = 'cutscene-cursor'; txt.appendChild(cursor);
  setTimeout(avancar, 800);
}

document.getElementById('btn-iniciar').addEventListener('click', iniciarPartida);
document.getElementById('btn-ver-ranking').addEventListener('click', () => {
  document.getElementById('tela-ranking').classList.remove('hidden');
  import('./core/api.js').then(({ carregarRanking }) => carregarRanking('#ranking-full-lista', 20));
});
document.getElementById('btn-fechar-ranking').addEventListener('click', () => { document.getElementById('tela-ranking').classList.add('hidden'); });

function init() {
  const cv = document.getElementById('game');
  resizeCanvas(cv, cv.getContext('2d'));
  import('./core/api.js').then(({ lerApelido, carregarRanking }) => {
    const apelidoSalvo = lerApelido();
    if (apelidoSalvo) document.getElementById('input-apelido').value = apelidoSalvo;
    carregarRanking('#ranking-lista', 10);
  });
  requestAnimationFrame(loop);
}

window.addEventListener('resize', () => {
  resizeCanvas(document.getElementById('game'), document.getElementById('game').getContext('2d'));
});

init();
