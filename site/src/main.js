import { GLOBAL, resizeCanvas, CanvasInfo } from './core/global.js';
import { initAudio, somSusto } from './core/audio.js';
import { FaseDinamo } from './fases/faseDinamo.js';
import { FaseCorredor } from './fases/faseCorredor.js';
import { FaseElevador } from './fases/faseElevador.js';
import { FaseExterior } from './fases/faseExterior.js';
import { carregarRanking as cRank, salvarApelido, lerApelido, enviarScore, carregarRanking } from './core/api.js';

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

  const boxTut = document.getElementById('fase-tutorial');

  if (GLOBAL.faseID === 1) {
    document.getElementById('fase-titulo').textContent = `DÍNAMO - NOITE ${GLOBAL.noiteDinamo + 1}`;
    document.getElementById('fase-sub').textContent = FaseDinamo.NOITES_DINAMO ? FaseDinamo.NOITES_DINAMO[GLOBAL.noiteDinamo].sub : '';
    if(boxTut) boxTut.innerHTML = `
      <b>COMO JOGAR:</b><br><br>
      • <b>[A]/[D]</b> ou <b>[←]/[→]</b> para girar a manivela (Mobile: toque nas laterais da tela).<br>
      • Mantenha a energia alta para afastar a criatura.<br>
      • <b>CUIDADO:</b> Girar muito aquece o motor (🔥). Se ferver, o dínamo trava.<br>
      • Quando o fusível queimar, segure <b>[E]</b> (Mobile: Botão Laranja) até trocar.
    `;
  } else if (GLOBAL.faseID === 2) {
    document.getElementById('fase-titulo').textContent = 'CORREDOR ESCURO';
    document.getElementById('fase-sub').textContent = 'A luz atrai, mas a escuridão mata. Encontre o elevador.';
    if(boxTut) boxTut.innerHTML = `
      <b>COMO JOGAR:</b><br><br>
      • <b>[W][A][S][D]</b> ou <b>Setas</b> para caminhar pelo labirinto.<br>
      • O óleo da lanterna vaza. Sem visão = morte.<br>
      • Aperte <b>[ESPAÇO]</b> (Mobile: Centro do D-Pad) repetidamente para bombear óleo.<br>
      • Você <b>não pode</b> andar enquanto bombeia.<br>
      • Encontre a saída (quadrado verde) antes que ela te alcance nas sombras.
    `;
  } else if (GLOBAL.faseID === 3) {
    document.getElementById('fase-titulo').textContent = 'POÇO DO ELEVADOR';
    document.getElementById('fase-sub').textContent = 'Suba. Não pare. Não olhe para baixo.';
    if(boxTut) boxTut.innerHTML = `
      <b>COMO JOGAR:</b><br><br>
      • <b>[A]/[D]</b> ou <b>[←]/[→]</b> para subir a manivela do guincho.<br>
      • Girar rápido demais aumenta a <b>Tensão do Cabo</b> (⚠️). Se chegar a 100%, ele arrebenta e o elevador despenca alguns metros.<br>
      • Parar de girar faz o elevador descer sozinho pela gravidade.<br>
      • Segure <b>[E]</b> para acionar o freio (trava a queda).<br>
      • Fuja da silhueta que escala pelo poço!
    `;
  } else if (GLOBAL.faseID === 4) {
    document.getElementById('fase-titulo').textContent = 'NEVASCA';
    document.getElementById('fase-sub').textContent = 'O portão da usina. Não congele.';
    if(boxTut) boxTut.innerHTML = `
      <b>COMO JOGAR:</b><br><br>
      • <b>[W]/[S]</b> ou <b>[↑]/[↓]</b> para correr pela neve.<br>
      • <b>[A]/[D]</b> ou <b>[←]/[→]</b> para desviar dos obstáculos.<br>
      • A nevasca causa <b>Hipotermia</b>. A barra térmica cai constantemente.<br>
      • Aproxime-se dos <b>Barris de Fogo</b> para recuperar calor corporal.<br>
      • Corra para a saída!
    `;
  }
}

document.getElementById('btn-fase').addEventListener('click', () => {
  document.getElementById('tela-fase').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');

  if (GLOBAL.faseID === 1) GLOBAL.faseObj = FaseDinamo;
  else if (GLOBAL.faseID === 2) GLOBAL.faseObj = FaseCorredor;
  else if (GLOBAL.faseID === 3) GLOBAL.faseObj = FaseElevador;
  else if (GLOBAL.faseID === 4) GLOBAL.faseObj = FaseExterior;

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
    GLOBAL.faseID = 4;
    mostrarCutscene([
      "O elevador tranca no topo. Você chuta as portas.",
      "A neve entra com o vento cortante.",
      "O portão da usina está no fim da rua principal.",
      "Corra. Aqueça-se nos barris se necessário. Não congele."
    ], prepararFase);
  } else if (GLOBAL.faseID === 4) {
    let base = (6 * 1000) + Math.floor(GLOBAL.tempoAcumulado);
    GLOBAL.pontuacaoFinal = GLOBAL.pesadelo ? Math.floor(base * 1.5) : base;

    // Salva a vitória para liberar pesadelo
    localStorage.setItem('dinamo-win', '1');

    import('./core/api.js').then(({ enviarScore }) => {
      // Se pesadelo, adiciona conquista
      if(GLOBAL.pesadelo) {
        let conqs = [];
        try{ conqs = JSON.parse(localStorage.getItem('dinamo-achievements')||'[]'); }catch(e){}
        if(!conqs.includes('💀')) { conqs.push('💀'); localStorage.setItem('dinamo-achievements', JSON.stringify(conqs)); }
      }

      enviarScore(GLOBAL.pontuacaoFinal, 6, true, 4).then(dados => {
        mostrarFim('FUGA CONCLUÍDA', 'vitoria', 'A luz do sol... Você sobreviveu à Usina Nº 7.', GLOBAL.pontuacaoFinal, dados ? dados.posicao : null);
      });
    });
  }
}

export function triggerMorte(textoCausa) {
  GLOBAL.morto = true;
  somSusto();
  document.getElementById('susto-aviso').textContent = 'PEGO';
  document.getElementById('susto-aviso').className = 'on';

  const noc = GLOBAL.faseID === 1 ? GLOBAL.noiteDinamo : (GLOBAL.faseID === 2 ? 3 : (GLOBAL.faseID === 3 ? 4 : 5));
  let pts = (noc * 1000) + Math.floor(GLOBAL.tempoAcumulado);
  if (GLOBAL.pesadelo) pts = Math.floor(pts * 1.5);

  import('./core/api.js').then(({ enviarScore }) => {
    enviarScore(pts, noc, false, GLOBAL.faseMaximaDB).then(dados => {
      setTimeout(() => {
        document.getElementById('susto-aviso').className = '';
        mostrarFim('FIM DA LINHA', 'morte', textoCausa, pts, dados ? dados.posicao : null);
      }, 1500);
    });
  });
}

let estadoFim = 'morte';

function mostrarFim(titulo, classe, texto, pts, pos) {
  estadoFim = classe;
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
  document.getElementById('btn-reiniciar').textContent = classe === 'morte' ? 'TENTAR NOVAMENTE' : 'JOGAR NOVAMENTE';
  document.getElementById('tela-fim').classList.remove('hidden');
  import('./core/api.js').then(({ carregarRanking }) => carregarRanking('#ranking-lista', 10));
}

document.getElementById('btn-reiniciar').addEventListener('click', () => {
  document.getElementById('tela-fim').classList.add('hidden');
  if (estadoFim === 'morte') {
    prepararFase();
  } else {
    iniciarPartida();
  }
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

document.getElementById('btn-iniciar').addEventListener('click', () => {
  const inp = document.getElementById('input-apelido');
  const apl = inp.value.trim().toUpperCase() || 'ANÔNIMO';
  salvarApelido(apl);

  const isPesadelo = document.getElementById('chk-pesadelo')?.checked;
  GLOBAL.pesadelo = isPesadelo;

  document.getElementById('tela-inicio').classList.add('hidden');
  initAudio();
  prepararFase();
});
document.getElementById('btn-ver-ranking').addEventListener('click', () => {
  document.getElementById('tela-ranking').classList.remove('hidden');
  import('./core/api.js').then(({ carregarRanking }) => carregarRanking('#ranking-full-lista', 20));
});
document.getElementById('btn-fechar-ranking').addEventListener('click', () => { document.getElementById('tela-ranking').classList.add('hidden'); });

const PÁGINAS_TEXTO = [
  "23 de Outubro. O gerador falhou de novo. As sombras pareciam se mover. Fiquei no escuro por 5 minutos, ouvi passos. Não eram os meus.",
  "25 de Outubro. Eu tranquei o elevador. Ele não pode subir. Só preciso manter o dínamo girando. O combustível está no fim.",
  "27 de Outubro. Não adianta mais. Ele aprendeu a abrir o alçapão do elevador. Fique na luz. Pelo amor de Deus, fique na luz."
];

function atualizarBtnArquivos() {
  const pgs = parseInt(localStorage.getItem('dinamo-paginas')||'0');
  const btn = document.getElementById('btn-ver-arquivos');
  if(btn) btn.textContent = `ARQUIVOS (${Math.min(pgs,3)}/3)`;
}

document.getElementById('btn-ver-arquivos')?.addEventListener('click', () => {
  const pgs = parseInt(localStorage.getItem('dinamo-paginas')||'0');
  document.getElementById('arquivos-sub').textContent = `${Math.min(pgs,3)}/3 PÁGINAS ENCONTRADAS NO CORREDOR`;
  const lista = document.getElementById('lista-arquivos');
  lista.innerHTML = '';
  for(let i=0; i<3; i++){
    if(i < pgs) {
      lista.innerHTML += `<div class="bilhete"><span class="bil-data">PÁGINA ${i+1}</span>${PÁGINAS_TEXTO[i]}</div>`;
    } else {
      lista.innerHTML += `<div class="bilhete" style="opacity:0.3; filter:blur(2px);">Página não encontrada...</div>`;
    }
  }
  document.getElementById('tela-arquivos').classList.remove('hidden');
});
document.getElementById('btn-fechar-arquivos')?.addEventListener('click', () => {
  document.getElementById('tela-arquivos').classList.add('hidden');
});

function init() {
  const cv = document.getElementById('game');
  resizeCanvas(cv, cv.getContext('2d'));
  
  if (localStorage.getItem('dinamo-win') === '1') {
    document.getElementById('wrap-pesadelo').classList.remove('hidden');
    document.getElementById('chk-pesadelo').addEventListener('change', (e) => {
      if(e.target.checked) {
        import('./core/audio.js').then(({ blip }) => blip(100, 0.4, 1.5, 'sawtooth'));
        document.body.style.background = '#1a0505';
      } else {
        document.body.style.background = 'var(--preto)';
      }
    });
  }

  import('./core/api.js').then(({ lerApelido, carregarRanking }) => {
    const apelidoSalvo = lerApelido();
    if (apelidoSalvo) document.getElementById('input-apelido').value = apelidoSalvo;
    carregarRanking('#ranking-lista', 10);
  });
  atualizarBtnArquivos();
  setInterval(atualizarBtnArquivos, 1000);
  requestAnimationFrame(loop);
}

window.addEventListener('resize', () => {
  resizeCanvas(document.getElementById('game'), document.getElementById('game').getContext('2d'));
});

init();
