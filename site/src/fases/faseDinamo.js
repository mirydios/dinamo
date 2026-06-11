import { GLOBAL, CanvasInfo } from '../core/global.js';
import { blip } from '../core/audio.js';
import { triggerMorte, completarFase } from '../main.js';

export const NOITES_DINAMO = [
  { dur: 180, decai0: 6, decai1: 12, fuseMin: 38, fuseMax: 55, criatura: 13, calorTaxa: 16, travaDur: 3.0, sub: 'O turno começa calmo. Mantenha o ritmo.' },
  { dur: 210, decai0: 7, decai1: 15, fuseMin: 26, fuseMax: 40, criatura: 16, calorTaxa: 21, travaDur: 4.5, sub: 'Os fusíveis estão velhos.' },
  { dur: 240, decai0: 8, decai1: 18, fuseMin: 18, fuseMax: 30, criatura: 19, calorTaxa: 24, travaDur: 5.5, sub: 'A última noite. Não pare.' }
];

export const FaseDinamo = {
  S: {},
  iniciar() {
    const cfg = NOITES_DINAMO[GLOBAL.noiteDinamo];
    const { W, H } = CanvasInfo;
    this.S = {
      cfg, t: 0, carga: 70, calor: 0, prox: 0, rpm: 0, ang: 0,
      ultimaManivela: null, ultimoGiro: 0,
      fusivelOK: true, proxFusivel: cfg.fuseMin + Math.random() * (cfg.fuseMax - cfg.fuseMin),
      trocando: false, trocaProg: 0, travado: 0, tremor: 0,
      faiscas: [], vapor: [], olhos: [], gotas: [],
      relampago: 0, proxTrovao: 10 + Math.random() * 15
    };
    for (let i = 0; i < 90; i++) this.S.gotas.push({ x: Math.random() * W, y: Math.random() * H, vel: 220 + Math.random() * 180, len: 10 + Math.random() * 14, opac: 0.04 + Math.random() * 0.08 });
    this.configHUD();
  },
  configHUD() {
    document.getElementById('lbl-carga').textContent = '⚡ CARGA';
    document.getElementById('lbl-calor').textContent = '🔥 TEMPERATURA';
    document.getElementById('box-calor').classList.remove('hidden');
    document.getElementById('fase-tag').textContent = `NOITE ${GLOBAL.noiteDinamo + 1} / 3`;
    document.getElementById('lbl-timer').textContent = 'ATÉ O AMANHECER';
    document.getElementById('zonaE').classList.remove('hidden');
    document.getElementById('zonaD').classList.remove('hidden');
    document.getElementById('dpad').classList.add('hidden');
    document.getElementById('btn-acao1').textContent = '⚠ SEGURE [E] — TROCAR FUSÍVEL';
    document.getElementById('btn-acao1').classList.toggle('hidden', this.S.fusivelOK);
    document.getElementById('acao1-prog').classList.toggle('hidden', this.S.fusivelOK);
  },
  onKey(k, isDown) {
    if (GLOBAL.morto) return;
    if (k === 'e') { this.S.trocando = isDown; return; }
    if (isDown && !this.S.trocando && this.S.travado <= 0) {
      if (k === 'arrowleft' || k === 'a') this.girar('E');
      if (k === 'arrowright' || k === 'd') this.girar('D');
    }
  },
  girar(lado) {
    if (this.S.ultimaManivela === lado) return;
    this.S.ultimaManivela = lado;
    const agora = performance.now(); const dtg = agora - this.S.ultimoGiro; this.S.ultimoGiro = agora;
    let forca = 2.6 * (dtg < 220 ? 1.25 : 1);
    if (!this.S.fusivelOK) forca *= .18;
    this.S.carga = Math.min(100, this.S.carga + forca); this.S.rpm = Math.min(20, this.S.rpm + 3);
    blip(120 + Math.random() * 80, .07, .06, 'square');
    if (Math.random() < .4) this.S.faiscas.push({ x: CanvasInfo.W / 2 + (Math.random() - .5) * 40, y: CanvasInfo.H * .72, vx: (Math.random() - .5) * 3, vy: -2 - Math.random() * 2, vida: 1 });
  },
  atualizar(dt) {
    const s = this.S; s.t += dt;
    const { W, H } = CanvasInfo;
    const prog = s.t / s.cfg.dur;
    let decai = s.cfg.decai0 + (s.cfg.decai1 - s.cfg.decai0) * prog;
    if (s.travado > 0) decai += 4;
    s.carga = Math.max(0, s.carga - decai * dt); s.rpm = Math.max(0, s.rpm - 8 * dt);
    if (s.travado <= 0) s.ang += s.rpm * dt;

    if (s.travado > 0) {
      s.travado -= dt; s.vapor.push({ x: W / 2 + (Math.random() - .5) * 60, y: H * .62, vy: -.6 - Math.random(), vida: 1, r: 4 + Math.random() * 6 });
      if (s.travado <= 0) s.calor = 45;
    } else {
      if (s.carga > 78) s.calor = Math.min(100, s.calor + ((s.carga - 78) / 22) * s.cfg.calorTaxa * dt);
      else s.calor = Math.max(0, s.calor - 20 * dt);
      if (s.calor >= 100) { s.travado = s.cfg.travaDur; s.rpm = 0; s.tremor = 1; blip(200, .8, .25, 'sawtooth'); }
    }

    if (s.fusivelOK) {
      if (s.t > s.proxFusivel) { s.fusivelOK = false; s.trocaProg = 0; s.tremor = .5; blip(900, .25, .15, 'sawtooth'); }
    } else if (s.trocando) {
      s.trocaProg += dt / 2.4;
      if (s.trocaProg >= 1) { s.fusivelOK = true; s.trocando = false; s.trocaProg = 0; s.proxFusivel = s.t + s.cfg.fuseMin + Math.random() * (s.cfg.fuseMax - s.cfg.fuseMin); blip(500, .15, .12, 'triangle'); }
    } else s.trocaProg = Math.max(0, s.trocaProg - dt * 2);

    if (s.carga < 35) {
      s.prox = Math.min(100, s.prox + ((35 - s.carga) / 35) * s.cfg.criatura * dt);
      if (!s.olhos.length) {
        const n = 2 + Math.floor(Math.random() * 3) + GLOBAL.noiteDinamo;
        for (let i = 0; i < n; i++) s.olhos.push({ x: Math.random() < .5 ? W * (.05 + Math.random() * .18) : W * (.77 + Math.random() * .18), y: H * (.25 + Math.random() * .45), pisca: Math.random() * 6 });
      }
    } else { s.prox = Math.max(0, s.prox - (s.carga / 100) * 16 * dt); if (s.prox < 8) s.olhos = []; }
    s.olhos.forEach(o => { o.pisca -= dt; if (o.pisca < 0) o.pisca = 2 + Math.random() * 5; });

    s.proxTrovao -= dt;
    if (s.proxTrovao <= 0) { s.relampago = .12 + Math.random() * .1; s.proxTrovao = 10 + Math.random() * 20; }
    if (s.relampago > 0) s.relampago = Math.max(0, s.relampago - dt * 3);

    s.gotas.forEach(g => { g.y += g.vel * dt; if (g.y > H + 20) { g.y = -10; g.x = Math.random() * W; } });
    s.faiscas = s.faiscas.filter(f => f.vida > 0); s.faiscas.forEach(f => { f.x += f.vx; f.y += f.vy; f.vy += .15; f.vida -= dt * 2; });
    s.vapor = s.vapor.filter(v => v.vida > 0); s.vapor.forEach(v => { v.y += v.vy; v.r += dt * 8; v.vida -= dt * .9; });
    s.tremor = Math.max(0, s.tremor - dt);

    if (s.prox >= 100) triggerMorte('O dínamo parou. A criatura o alcançou.');
    else if (s.t >= s.cfg.dur) completarFase(s.cfg.dur);

    const cf = document.getElementById('carga-fill'); cf.style.width = s.carga + '%'; cf.classList.toggle('critico', s.carga < 35);
    const hf = document.getElementById('calor-fill'); hf.style.width = s.calor + '%'; hf.classList.toggle('critico', s.calor > 75 || s.travado > 0);
    const rest = Math.max(0, s.cfg.dur - s.t);
    document.getElementById('timer-val').textContent = Math.floor(rest / 60) + ':' + String(Math.floor(rest % 60)).padStart(2, '0');

    const av = document.getElementById('aviso');
    if (s.travado > 0) { av.textContent = 'DÍNAMO TRAVADO'; av.className = 'quente on'; }
    else if (!s.fusivelOK) { av.textContent = 'FUSÍVEL QUEIMADO'; av.className = 'on'; }
    else if (s.prox > 45) { av.textContent = 'ELE ESTÁ SE APROXIMANDO'; av.className = 'on'; }
    else av.className = '';

    document.getElementById('btn-acao1').classList.toggle('hidden', s.fusivelOK);
    const fp = document.getElementById('acao1-prog'); fp.classList.toggle('hidden', s.fusivelOK);
    fp.firstElementChild.style.width = (s.trocaProg * 100) + '%';
  },
  desenhar() {
    const s = this.S;
    const { ctx, W, H } = CanvasInfo;
    ctx.fillStyle = '#070605'; ctx.fillRect(0, 0, W, H);
    if (s.relampago > 0) { ctx.fillStyle = `rgba(230,240,255,${s.relampago * .7})`; ctx.fillRect(0, 0, W, H); }
    const tx = s.tremor > 0 ? (Math.random() - .5) * 8 * s.tremor : 0, ty = s.tremor > 0 ? (Math.random() - .5) * 8 * s.tremor : 0;
    ctx.save(); ctx.translate(tx, ty);
    let luz = GLOBAL.morto ? 0 : s.carga / 100; if (!s.fusivelOK) luz *= (Math.random() < .12 ? .8 : .35);
    const flicker = Math.min(1, luz * (0.9 + Math.sin(performance.now() / 40) * .04 + (Math.random() - .5) * .05) + (s.relampago > 0 ? s.relampago * .6 : 0));
    const cx = W / 2, dy = H * .7, R = Math.min(W, H) * .13;

    ctx.fillStyle = '#100d09'; ctx.fillRect(cx - R * 1.6, dy + R * .8, R * 3.2, R * .5);
    ctx.lineWidth = R * .18; ctx.strokeStyle = `rgb(${40 + 90 * flicker},${28 + 60 * flicker},${16 + 30 * flicker})`;
    ctx.beginPath(); ctx.arc(cx, dy, R, 0, 7); ctx.stroke();
    ctx.save(); ctx.translate(cx, dy); ctx.rotate(s.ang); ctx.strokeStyle = `rgb(${50 + 110 * flicker},${35 + 70 * flicker},${18 + 30 * flicker})`; ctx.lineWidth = R * .08;
    for (let i = 0; i < 3; i++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(-R * .72, 0); ctx.lineTo(R * .72, 0); ctx.stroke(); }
    ctx.restore();

    s.faiscas.forEach(f => { ctx.fillStyle = `rgba(255,210,120,${f.vida})`; ctx.fillRect(f.x, f.y, 2.5, 2.5); });
    s.vapor.forEach(v => { ctx.fillStyle = `rgba(200,200,200,${v.vida * .18})`; ctx.beginPath(); ctx.arc(v.x, v.y, v.r, 0, 7); ctx.fill(); });
    ctx.save(); s.gotas.forEach(g => { ctx.strokeStyle = `rgba(160,180,200,${g.opac})`; ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(g.x - 3, g.y + g.len); ctx.stroke(); }); ctx.restore();

    if (s.prox > 5) {
      const intens = (s.prox / 100) * Math.max(.25, 1 - flicker);
      s.olhos.forEach(o => { if (o.pisca < .18) return; const ax = o.x + (cx - o.x) * (s.prox / 100) * .45; const ay = o.y + (dy - o.y) * (s.prox / 100) * .3; const r = 2.2 + (s.prox / 100) * 3.5; ctx.fillStyle = `rgba(220,235,245,${intens})`; ctx.beginPath(); ctx.arc(ax - 7, ay, r, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(ax + 7, ay, r, 0, 7); ctx.fill(); });
    }
    const vin = ctx.createRadialGradient(cx, H * .5, Math.max(40, (1 - s.prox / 130) * Math.max(W, H) * .6), cx, H * .5, Math.max(W, H) * .85);
    vin.addColorStop(0, 'rgba(0,0,0,0)'); vin.addColorStop(1, `rgba(0,0,0,${.75 + (s.prox / 100) * .25})`); ctx.fillStyle = vin; ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
};
