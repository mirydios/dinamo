import { GLOBAL, CanvasInfo } from '../core/global.js';
import { blip } from '../core/audio.js';
import { triggerMorte, completarFase } from '../main.js';

export const FaseElevador = {
  S: {},
  iniciar() {
    GLOBAL.faseMaximaDB = 3;
    this.S = {
      t: 0, y: 0, tensao: 0, freio: false, ultimaManivela: null, ultimoGiro: 0,
      cy: -15, // criatura começa abaixo
      tremerCabo: 0
    };
    this.configHUD();
  },
  configHUD() {
    document.getElementById('lbl-carga').textContent = '↕️ ALTURA';
    document.getElementById('lbl-calor').textContent = '⚠️ TENSÃO DO CABO';
    document.getElementById('box-calor').classList.remove('hidden');
    document.getElementById('fase-tag').textContent = 'FASE 3: POÇO';
    document.getElementById('lbl-timer').textContent = 'TEMPO';
    document.getElementById('zonaE').classList.remove('hidden');
    document.getElementById('zonaD').classList.remove('hidden');
    document.getElementById('dpad').classList.add('hidden');
    document.getElementById('btn-acao1').textContent = '[E] PUXAR FREIO';
    document.getElementById('btn-acao1').classList.remove('hidden');
    document.getElementById('acao1-prog').classList.add('hidden');
  },
  onKey(k, isDown) {
    if (GLOBAL.morto) return;
    if (k === 'e') { this.S.freio = isDown; return; }
    if (isDown && !this.S.freio) {
      if (k === 'arrowleft' || k === 'a') this.girar('E');
      if (k === 'arrowright' || k === 'd') this.girar('D');
    }
  },
  girar(lado) {
    if (this.S.ultimaManivela === lado) return;
    this.S.ultimaManivela = lado;
    const dtg = performance.now() - this.S.ultimoGiro; this.S.ultimoGiro = performance.now();

    this.S.y += 0.8;
    if (dtg < 250) this.S.tensao += 4;
    blip(180, .05, .08, 'square');
  },
  atualizar(dt) {
    const s = this.S; s.t += dt;
    document.getElementById('timer-val').textContent = Math.floor(s.t / 60) + ':' + String(Math.floor(s.t % 60)).padStart(2, '0');

    if (!s.freio) {
      s.y = Math.max(0, s.y - 1 * dt); // Gravidade
      s.tensao = Math.max(0, s.tensao - 15 * dt);
    }

    if (s.tensao >= 100) {
      s.y = Math.max(0, s.y - 15); s.tensao = 0; s.tremerCabo = 1; blip(80, .5, .5, 'sawtooth');
    }

    s.cy += 1.8 * dt;

    if (s.y >= 100) completarFase(s.t);
    else if (s.cy >= s.y) triggerMorte('A criatura invadiu o elevador pelo alçapão.');

    const cf = document.getElementById('carga-fill'); cf.style.width = s.y + '%';
    const hf = document.getElementById('calor-fill'); hf.style.width = s.tensao + '%'; hf.classList.toggle('critico', s.tensao > 80);
    s.tremerCabo = Math.max(0, s.tremerCabo - dt);
  },
  desenhar() {
    const s = this.S;
    const { ctx, W, H } = CanvasInfo;
    ctx.fillStyle = '#070605'; ctx.fillRect(0, 0, W, H);
    if (GLOBAL.morto) return;

    const cx = W / 2;
    ctx.fillStyle = '#111'; ctx.fillRect(cx - 60, 0, 120, H);

    const elevY = H - (s.y / 100) * (H - 100) - 50;

    ctx.strokeStyle = '#444'; ctx.lineWidth = 2;
    const tx = s.tremerCabo > 0 ? (Math.random() - .5) * 4 : 0;
    ctx.beginPath(); ctx.moveTo(cx + tx, 0); ctx.lineTo(cx + tx, elevY); ctx.stroke();

    ctx.fillStyle = '#2a2218'; ctx.fillRect(cx - 40, elevY, 80, 50);
    ctx.strokeStyle = s.freio ? '#c0392b' : '#b87333'; ctx.strokeRect(cx - 40, elevY, 80, 50);

    const criatY = H - (s.cy / 100) * (H - 100) - 50;
    if (criatY > elevY + 50) {
      ctx.fillStyle = 'white';
      ctx.beginPath(); ctx.arc(cx - 10, criatY, 4, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 10, criatY, 4, 0, 7); ctx.fill();
    }
  }
};
