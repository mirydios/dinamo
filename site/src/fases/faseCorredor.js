import { GLOBAL, CanvasInfo } from '../core/global.js';
import { blip } from '../core/audio.js';
import { triggerMorte, completarFase } from '../main.js';

const LABIRINTO = [
  "111111111111111",
  "100000100000001",
  "101110101111101",
  "101000000000101",
  "101011111010101",
  "100000001010001",
  "101111101011101",
  "1000001000000E1",
  "111111111111111"
];

export const FaseCorredor = {
  S: {},
  iniciar() {
    GLOBAL.faseMaximaDB = 2;
    const { W, H } = CanvasInfo;
    this.S = {
      t: 0, px: 1.5, py: 1.5, cx: 1.5, cy: 7.5, combustivel: 100,
      bombando: false, bombCooldown: 0, grid: [...LABIRINTO],
      tileSize: Math.min(W / 15, H / 9), tremor: 0, calcPath: 0, path: [],
      paginasEncontradas: 0, totalPaginas: 3
    };
    this.espalharPaginas();
    this.configHUD();
  },
  espalharPaginas() {
    let vazios = [];
    for(let r=1; r<this.S.grid.length-1; r++){
      for(let c=1; c<this.S.grid[0].length-1; c++){
        if(this.S.grid[r][c] === '0' && (r>3 || c>3)) vazios.push({r,c});
      }
    }
    for(let i=0; i<this.S.totalPaginas; i++){
      if(vazios.length===0) break;
      const idx = Math.floor(Math.random()*vazios.length);
      const {r,c} = vazios.splice(idx,1)[0];
      let row = this.S.grid[r].split('');
      row[c] = 'P';
      this.S.grid[r] = row.join('');
    }
  },
  configHUD() {
    document.getElementById('lbl-carga').textContent = '🛢️ ÓLEO (ESPAÇO)';
    document.getElementById('box-calor').classList.add('hidden');
    document.getElementById('fase-tag').textContent = 'FASE 2: CORREDOR';
    document.getElementById('lbl-timer').textContent = 'TEMPO';
    document.getElementById('zonaE').classList.add('hidden');
    document.getElementById('zonaD').classList.add('hidden');
    document.getElementById('btn-acao1').classList.add('hidden');
    document.getElementById('acao1-prog').classList.add('hidden');
    document.getElementById('dpad').classList.remove('hidden');
  },
  onKey(k, isDown) {
    if (GLOBAL.morto) return;
    const s = this.S;
    if (k === ' ') {
      if (isDown && s.bombCooldown <= 0) {
        s.combustivel = Math.min(100, s.combustivel + 15);
        s.bombCooldown = 0.8; s.bombando = true; blip(150, .1, .1, 'sawtooth');
      }
      if (!isDown) s.bombando = false;
    }
    s.keys = s.keys || {}; s.keys[k] = isDown;
  },
  isWall(x, y) {
    const col = Math.floor(x), row = Math.floor(y);
    if (row < 0 || row >= this.S.grid.length || col < 0 || col >= this.S.grid[0].length) return true;
    return this.S.grid[row][col] === '1';
  },
  atualizar(dt) {
    const s = this.S; s.t += dt;
    document.getElementById('timer-val').textContent = Math.floor(s.t / 60) + ':' + String(Math.floor(s.t % 60)).padStart(2, '0');

    s.bombCooldown -= dt;
    s.combustivel = Math.max(0, s.combustivel - 3 * dt);
    const cf = document.getElementById('carga-fill'); cf.style.width = s.combustivel + '%'; cf.classList.toggle('critico', s.combustivel < 20);

    if (!s.bombando) {
      let dx = 0, dy = 0;
      if (s.keys?.arrowleft || s.keys?.a) dx = -1;
      if (s.keys?.arrowright || s.keys?.d) dx = 1;
      if (s.keys?.arrowup || s.keys?.w) dy = -1;
      if (s.keys?.arrowdown || s.keys?.s) dy = 1;
      if (dx !== 0 && dy !== 0) { dx *= .7; dy *= .7; }
      const vel = 3 * dt;
      if (!this.isWall(s.px + dx * vel, s.py)) s.px += dx * vel;
      if (!this.isWall(s.px, s.py + dy * vel)) s.py += dy * vel;
    }

    const col = Math.floor(s.px), row = Math.floor(s.py);
    if (s.grid[row] && s.grid[row][col] === 'E') {
      completarFase(s.t); return;
    }
    if (s.grid[row] && s.grid[row][col] === 'P') {
      s.paginasEncontradas++;
      blip(600, 0.1, 0.2, 'sine'); blip(800, 0.15, 0.2, 'sine');
      let strRow = s.grid[row].split(''); strRow[col] = '0'; s.grid[row] = strRow.join('');
      // Adiciona na DOM globalmente
      let pgs = parseInt(localStorage.getItem('dinamo-paginas')||'0') + 1;
      localStorage.setItem('dinamo-paginas', pgs);
    }

    s.calcPath -= dt;
    if (s.calcPath <= 0) {
      s.calcPath = 1.0;
      s.path = [{ x: Math.floor(s.px) + .5, y: Math.floor(s.py) + .5 }];
    }
    const speedC = (s.combustivel < 20 ? 2.5 : 1.5) * dt;
    const dxC = s.px - s.cx, dyC = s.py - s.cy;
    const distC = Math.hypot(dxC, dyC);
    if (distC > 0.1) { s.cx += (dxC / distC) * speedC; s.cy += (dyC / distC) * speedC; }

    if (distC < 0.8) triggerMorte('Foi pego no escuro do corredor.');
    s.tremor = Math.max(0, s.tremor - dt);
  },
  desenhar() {
    const s = this.S, ts = s.tileSize;
    const { ctx, W, H } = CanvasInfo;
    ctx.fillStyle = '#070605'; ctx.fillRect(0, 0, W, H);
    if (GLOBAL.morto) return;

    ctx.save();
    ctx.translate(W / 2 - s.px * ts, H / 2 - s.py * ts);

    // -- RAYCASTING ---
    const luzR = (s.combustivel / 100) * 4 + 2;
    ctx.beginPath();
    ctx.moveTo(s.px * ts, s.py * ts);
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 90) {
      let dx = Math.cos(a), dy = Math.sin(a);
      let rx = s.px, ry = s.py;
      let hit = false;
      for (let step = 0; step < luzR * 4; step++) {
        rx += dx * 0.25; ry += dy * 0.25;
        const c = Math.floor(rx), r = Math.floor(ry);
        if (r < 0 || r >= s.grid.length || c < 0 || c >= s.grid[0].length || s.grid[r][c] === '1') {
          ctx.lineTo(rx * ts, ry * ts);
          hit = true; break;
        }
      }
      if (!hit) ctx.lineTo(rx * ts, ry * ts);
    }
    ctx.closePath();
    ctx.clip(); // APENAS desenha o que está dentro do polígono de luz
    // -----------------

    for (let r = 0; r < s.grid.length; r++) {
      for (let c = 0; c < s.grid[0].length; c++) {
        if (s.grid[r][c] === '1') {
          ctx.fillStyle = '#14110d'; ctx.fillRect(c * ts, r * ts, ts + 1, ts + 1);
          ctx.strokeStyle = '#2a2218'; ctx.strokeRect(c * ts, r * ts, ts, ts);
        } else if (s.grid[r][c] === 'E') {
          ctx.fillStyle = '#004400'; ctx.fillRect(c * ts, r * ts, ts, ts);
        } else if (s.grid[r][c] === 'P') {
          ctx.fillStyle = '#d8c9a3'; ctx.fillRect(c * ts + ts*.3, r * ts + ts*.3, ts*.4, ts*.5);
          ctx.strokeStyle = '#b87333'; ctx.strokeRect(c * ts + ts*.3, r * ts + ts*.3, ts*.4, ts*.5);
        }
      }
    }

    ctx.fillStyle = 'rgba(255,179,71,0.8)';
    ctx.beginPath(); ctx.arc(s.px * ts, s.py * ts, ts * 0.25, 0, 7); ctx.fill();

    const distC = Math.hypot(s.cx - s.px, s.cy - s.py);
    if (distC < luzR) {
      ctx.fillStyle = 'white';
      ctx.beginPath(); ctx.arc(s.cx * ts - 4, s.cy * ts, 3, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(s.cx * ts + 4, s.cy * ts, 3, 0, 7); ctx.fill();
    }
    ctx.restore();

    const cx = W / 2, cy = H / 2;
    const raioLuz = Math.max(50, (s.combustivel / 100) * Math.min(W, H) * 0.4);
    const vin = ctx.createRadialGradient(cx, cy, raioLuz * 0.3, cx, cy, raioLuz);
    vin.addColorStop(0, 'rgba(0,0,0,0)'); vin.addColorStop(1, 'rgba(0,0,0,0.98)');
    ctx.fillStyle = vin; ctx.fillRect(0, 0, W, H);
  }
};
