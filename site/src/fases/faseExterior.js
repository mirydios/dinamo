import { GLOBAL, CanvasInfo } from '../core/global.js';
import { blip } from '../core/audio.js';
import { triggerMorte, completarFase } from '../main.js';

export const FaseExterior = {
  S: {},
  iniciar() {
    GLOBAL.faseMaximaDB = 4;
    const { W, H } = CanvasInfo;
    this.S = {
      t: 0, 
      px: W / 2, py: H * 0.8, // player starts near bottom
      calor: 100,
      distanciaFinal: 10000,
      progresso: 0, // goes up to 10000
      vel: 0,
      neve: [],
      obstaculos: [], // {x, y, tipo: 'arvore' | 'barril'}
      keys: {}
    };

    // Gerar nevasca
    for(let i=0; i<150; i++) {
      this.S.neve.push({ x: Math.random()*W, y: Math.random()*H, s: 2+Math.random()*4, vx: -5 + Math.random()*10, vy: 15 + Math.random()*20 });
    }

    // Gerar mapa (obstáculos e barris)
    let cy = 200;
    while(cy < this.S.distanciaFinal - 300) {
      if(Math.random() < 0.15) {
        // Barril de fogo
        this.S.obstaculos.push({ x: W*0.2 + Math.random()*W*0.6, y: cy, tipo: 'barril' });
        cy += 400 + Math.random()*300;
      } else {
        // Árvores secas espalhadas
        const qtd = 1 + Math.floor(Math.random()*3);
        for(let j=0; j<qtd; j++) {
          this.S.obstaculos.push({ x: Math.random()*W, y: cy + (Math.random()-0.5)*100, tipo: 'arvore' });
        }
        cy += 150 + Math.random()*200;
      }
    }

    this.configHUD();
  },
  configHUD() {
    document.getElementById('lbl-carga').textContent = '🌡️ CALOR CORPORAL';
    document.getElementById('lbl-calor').textContent = '🏁 DISTÂNCIA P/ PORTÃO';
    document.getElementById('box-calor').classList.remove('hidden');
    document.getElementById('fase-tag').textContent = 'FASE 4: O EXTERIOR';
    document.getElementById('lbl-timer').textContent = 'TEMPO';
    document.getElementById('zonaE').classList.add('hidden');
    document.getElementById('zonaD').classList.add('hidden');
    document.getElementById('btn-acao1').classList.add('hidden');
    document.getElementById('acao1-prog').classList.add('hidden');
    
    // Mostramos setas, escondemos botão do meio
    document.getElementById('dpad').classList.remove('hidden');
    const dc = document.getElementById('d-center');
    if(dc) dc.classList.add('hidden');
  },
  onKey(k, isDown) {
    if (GLOBAL.morto) return;
    this.S.keys[k] = isDown;
  },
  atualizar(dt) {
    const s = this.S; s.t += dt;
    const { W, H } = CanvasInfo;
    document.getElementById('timer-val').textContent = Math.floor(s.t / 60) + ':' + String(Math.floor(s.t % 60)).padStart(2, '0');

    // Movimentação do jogador (esquerda/direita)
    let dx = 0;
    if (s.keys['arrowleft'] || s.keys['a']) dx = -1;
    if (s.keys['arrowright'] || s.keys['d']) dx = 1;
    
    // Movimentação (frente/trás) dita a velocidade de progressão
    let targetVel = 0;
    if (s.keys['arrowup'] || s.keys['w']) targetVel = 250;
    else if (s.keys['arrowdown'] || s.keys['s']) targetVel = -100;
    
    s.vel += (targetVel - s.vel) * 4 * dt;
    if(s.vel < 0 && s.progresso <= 0) s.vel = 0;

    s.px += dx * 200 * dt;
    s.px = Math.max(10, Math.min(W-10, s.px));
    s.progresso += s.vel * dt;

    // Verificar colisões
    let pertoDoFogo = false;
    for (let o of s.obstaculos) {
      // Distância relativa (y visual do obstáculo desce enquanto progredimos)
      const visualY = H * 0.8 - (o.y - s.progresso);
      
      // Se o objeto estiver na tela (ou quase)
      if (visualY > -100 && visualY < H + 100) {
        const dist = Math.hypot(o.x - s.px, visualY - s.py);
        
        if (o.tipo === 'barril') {
          if (dist < 80) pertoDoFogo = true;
          if (dist < 20) { s.vel = 0; s.progresso = o.y; } // Bateu no barril (para)
        } else if (o.tipo === 'arvore') {
          if (dist < 20) {
            // Colisão com árvore: machuca/para
            s.vel = -50;
            s.px += (s.px > o.x ? 1 : -1) * 30; // empurra pro lado
            blip(100, 0.1, 0.2, 'square');
          }
        }
      }
    }

    // Gerenciamento Térmico
    if (pertoDoFogo) {
      s.calor = Math.min(100, s.calor + 25 * dt); // Aquece rápido
      if(Math.random()<0.1) blip(400, 0.05, 0.02, 'sine');
    } else {
      s.calor -= 2.5 * dt; // Congela
    }

    const cf = document.getElementById('carga-fill'); cf.style.width = s.calor + '%'; cf.classList.toggle('critico', s.calor < 20);
    const percProgresso = (s.progresso / s.distanciaFinal) * 100;
    const hf = document.getElementById('calor-fill'); hf.style.width = Math.min(100, percProgresso) + '%'; hf.classList.remove('critico');

    // Neve
    s.neve.forEach(n => {
      n.y += n.vy * dt;
      n.x += n.vx * dt - dx * 50 * dt; // vento oposto ao movimento horizontal
      if (n.y > H) { n.y = -10; n.x = Math.random()*W; }
      if (n.x < 0) n.x = W;
      if (n.x > W) n.x = 0;
    });

    if (s.calor <= 0) triggerMorte('Hipotermia. O frio abraçou você.');
    else if (s.progresso >= s.distanciaFinal) completarFase(s.t);
  },
  desenhar() {
    const s = this.S;
    const { ctx, W, H } = CanvasInfo;
    
    // Fundo azul escuro gelado
    ctx.fillStyle = '#050a12'; ctx.fillRect(0, 0, W, H);
    if (GLOBAL.morto) return;

    // Gradiente de neblina no horizonte (topo)
    const grd = ctx.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, '#101522');
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);

    // Obstáculos
    for (let o of s.obstaculos) {
      const visualY = H * 0.8 - (o.y - s.progresso);
      if (visualY > -100 && visualY < H + 100) {
        // Pseudo perspectiva (fica maior mais embaixo)
        const scale = 0.5 + (visualY / H) * 0.8;
        
        if (o.tipo === 'arvore') {
          ctx.fillStyle = '#0a0a0a';
          ctx.beginPath();
          ctx.moveTo(o.x, visualY);
          ctx.lineTo(o.x - 15 * scale, visualY + 40 * scale);
          ctx.lineTo(o.x + 15 * scale, visualY + 40 * scale);
          ctx.fill();
        } else if (o.tipo === 'barril') {
          ctx.fillStyle = '#3a2010';
          ctx.fillRect(o.x - 12 * scale, visualY - 15 * scale, 24 * scale, 30 * scale);
          // Fogo
          ctx.fillStyle = `rgba(255, ${80+Math.random()*100}, 0, 0.8)`;
          ctx.beginPath(); ctx.arc(o.x, visualY - 20 * scale, 10 * scale + Math.random()*5, 0, 7); ctx.fill();
          
          // Luz no chão
          const lz = ctx.createRadialGradient(o.x, visualY, 0, o.x, visualY, 150 * scale);
          lz.addColorStop(0, 'rgba(255,100,0,0.3)');
          lz.addColorStop(1, 'transparent');
          ctx.fillStyle = lz; ctx.fillRect(o.x - 150*scale, visualY - 150*scale, 300*scale, 300*scale);
        }
      }
    }

    // Jogador
    ctx.fillStyle = '#b87333';
    ctx.beginPath(); ctx.arc(s.px, s.py, 10, 0, 7); ctx.fill();
    // Lanterna fraca do jogador
    const pxLuz = ctx.createRadialGradient(s.px, s.py, 0, s.px, s.py, 100);
    pxLuz.addColorStop(0, 'rgba(255,200,150,0.4)');
    pxLuz.addColorStop(1, 'transparent');
    ctx.fillStyle = pxLuz; ctx.fillRect(s.px-100, s.py-100, 200, 200);

    // Neve (camada cima)
    ctx.fillStyle = 'rgba(200,220,255,0.6)';
    s.neve.forEach(n => {
      ctx.fillRect(n.x, n.y, n.s, n.s * 1.5);
    });

    // Frio na borda da tela
    if(s.calor < 50) {
      const frio = ctx.createRadialGradient(W/2, H/2, Math.max(10, (s.calor/50)*Math.min(W,H)*0.5), W/2, H/2, Math.max(W,H)*0.8);
      frio.addColorStop(0, 'transparent');
      frio.addColorStop(1, `rgba(180, 220, 255, ${1 - s.calor/50})`);
      ctx.fillStyle = frio; ctx.fillRect(0,0,W,H);
    }
  }
};
