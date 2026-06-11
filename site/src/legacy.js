
// ---------- VARS GLOBAIS ----------
const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
let W, H, DPR;
function resize(){
  DPR=Math.min(window.devicePixelRatio||1,2);
  W=window.innerWidth; H=window.innerHeight;
  cv.width=W*DPR; cv.height=H*DPR;
  cv.style.width=W+'px'; cv.style.height=H+'px';
  ctx.setTransform(DPR,0,0,DPR,0,0);
}
window.addEventListener('resize',resize); resize();

const GLOBAL = {
  faseID: 1, // 1=Dinamo(noites 1,2,3), 2=Corredor, 3=Elevador
  noiteDinamo: 0, // 0,1,2
  tempoAcumulado: 0,
  pontuacaoFinal: 0,
  faseMaximaDB: 1, // Para enviar ao db
  morto: false,
  faseObj: null
};

// ---------- API & UTIL ----------
function lerApelido(){try{return localStorage.getItem('dinamo-apelido')||'';}catch(e){return '';}}
function salvarApelido(v){try{localStorage.setItem('dinamo-apelido',v);}catch(e){}}
function apelidoAtual(){
  const inp=document.getElementById('input-apelido');
  const val=(inp?inp.value.trim().toUpperCase():'')||lerApelido()||'ANÔNIMO';
  return val.slice(0,16)||'ANÔNIMO';
}
async function enviarScore(pontuacao, noitesCompletas, vitoria, faseMaxima){
  try {
    const resp = await fetch('/api/score', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({apelido: apelidoAtual(), pontuacao, noites_completas: noitesCompletas, vitoria, fase_maxima: faseMaxima})
    });
    if(!resp.ok) throw new Error('HTTP '+resp.status);
    return await resp.json();
  } catch(e){return null;}
}
async function carregarRanking(seletor, limit=10){
  const el = document.querySelector(seletor);
  if(!el) return;
  el.innerHTML='<div class="rank-loading">CARREGANDO...</div>';
  try {
    const resp = await fetch(`/api/ranking?limit=${limit}`);
    if(!resp.ok) throw new Error();
    renderRanking(el, await resp.json());
  } catch(e){el.innerHTML='<div class="rank-offline">⚡ SERVIÇO INDISPONÍVEL</div>';}
}
function renderRanking(el, dados){
  if(!dados||dados.length===0){el.innerHTML='<div class="rank-vazio">NENHUM OPERADOR REGISTRADO</div>';return;}
  const medalhas=['rank-ouro','rank-prata','rank-bronze'];
  const iconesFase = {1:'⚙️ Dínamo', 2:'🕯️ Corredor', 3:'⛓️ Elevador'};
  el.innerHTML = dados.map((r,i)=>{
    const pos = r.posicao || (i+1);
    const cls = medalhas[i] || '';
    const vCls = r.vitoria ? ' vitoria' : '';
    const icone = iconesFase[r.fase_maxima] || '⚙️';
    return `<div class="rank-row ${cls}">
      <span class="rank-pos">#${pos}</span>
      <span class="rank-nome">${escHtml(r.apelido)}</span>
      <span class="rank-fase${vCls}">${icone}</span>
      <span class="rank-pts">${r.pontuacao.toLocaleString('pt-BR')} pts</span>
    </div>`;
  }).join('');
}
function escHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

// ---------- AUDIO ----------
let AC=null;
function initAudio(){
  if(AC)return;
  try{
    AC=new(window.AudioContext||window.webkitAudioContext)();
  }catch(e){AC=null;}
}
function blip(freq,dur,vol,tipo){
  if(!AC)return;
  const o=AC.createOscillator(),g=AC.createGain();o.type=tipo||'square';o.frequency.value=freq;
  g.gain.setValueAtTime(vol,AC.currentTime);g.gain.exponentialRampToValueAtTime(.0001,AC.currentTime+dur);
  o.connect(g);g.connect(AC.destination);o.start();o.stop(AC.currentTime+dur+.02);
}
function somSusto(){
  if(!AC)return;
  const o=AC.createOscillator(),g=AC.createGain();o.type='sawtooth';
  o.frequency.setValueAtTime(700,AC.currentTime);o.frequency.exponentialRampToValueAtTime(60,AC.currentTime+.9);
  g.gain.setValueAtTime(.4,AC.currentTime);g.gain.exponentialRampToValueAtTime(.001,AC.currentTime+1);
  o.connect(g);g.connect(AC.destination);o.start();o.stop(AC.currentTime+1);
}

// ---------- FASE 1: DINAMO ----------
const NOITES_DINAMO = [
  { dur:180, decai0:6, decai1:12, fuseMin:38, fuseMax:55, criatura:13, calorTaxa:16, travaDur:3.0, sub:'O turno começa calmo. Mantenha o ritmo.' },
  { dur:210, decai0:7, decai1:15, fuseMin:26, fuseMax:40, criatura:16, calorTaxa:21, travaDur:4.5, sub:'Os fusíveis estão velhos.' },
  { dur:240, decai0:8, decai1:18, fuseMin:18, fuseMax:30, criatura:19, calorTaxa:24, travaDur:5.5, sub:'A última noite. Não pare.' }
];
const FaseDinamo = {
  S: {},
  iniciar(){
    const cfg = NOITES_DINAMO[GLOBAL.noiteDinamo];
    this.S = {
      cfg, t:0, carga:70, calor:0, prox:0, rpm:0, ang:0,
      ultimaManivela:null, ultimoGiro:0,
      fusivelOK:true, proxFusivel:cfg.fuseMin+Math.random()*(cfg.fuseMax-cfg.fuseMin),
      trocando:false, trocaProg:0, travado:0, tremor:0,
      faiscas:[], vapor:[], olhos:[], gotas:[],
      relampago:0, proxTrovao:10+Math.random()*15
    };
    for(let i=0;i<90;i++) this.S.gotas.push({x:Math.random()*W,y:Math.random()*H,vel:220+Math.random()*180,len:10+Math.random()*14,opac:0.04+Math.random()*0.08});
    this.configHUD();
  },
  configHUD(){
    document.getElementById('lbl-carga').textContent='⚡ CARGA';
    document.getElementById('lbl-calor').textContent='🔥 TEMPERATURA';
    document.getElementById('box-calor').classList.remove('hidden');
    document.getElementById('fase-tag').textContent=`NOITE ${GLOBAL.noiteDinamo+1} / 3`;
    document.getElementById('lbl-timer').textContent='ATÉ O AMANHECER';
    document.getElementById('zonaE').classList.remove('hidden');
    document.getElementById('zonaD').classList.remove('hidden');
    document.getElementById('dpad').classList.add('hidden');
    document.getElementById('btn-acao1').textContent='⚠ SEGURE [E] — TROCAR FUSÍVEL';
    document.getElementById('btn-acao1').classList.toggle('hidden', this.S.fusivelOK);
    document.getElementById('acao1-prog').classList.toggle('hidden', this.S.fusivelOK);
  },
  onKey(k, isDown){
    if(GLOBAL.morto)return;
    if(k==='e'){ this.S.trocando=isDown; return; }
    if(isDown && !this.S.trocando && this.S.travado<=0){
      if(k==='arrowleft'||k==='a') this.girar('E');
      if(k==='arrowright'||k==='d') this.girar('D');
    }
  },
  girar(lado){
    if(this.S.ultimaManivela===lado)return;
    this.S.ultimaManivela=lado;
    const agora=performance.now(); const dtg=agora-this.S.ultimoGiro; this.S.ultimoGiro=agora;
    let forca=2.6*(dtg<220?1.25:1);
    if(!this.S.fusivelOK)forca*=.18;
    this.S.carga=Math.min(100,this.S.carga+forca); this.S.rpm=Math.min(20,this.S.rpm+3);
    blip(120+Math.random()*80,.07,.06,'square');
    if(Math.random()<.4)this.S.faiscas.push({x:W/2+(Math.random()-.5)*40,y:H*.72,vx:(Math.random()-.5)*3,vy:-2-Math.random()*2,vida:1});
  },
  atualizar(dt){
    const s=this.S; s.t+=dt;
    const prog=s.t/s.cfg.dur;
    let decai=s.cfg.decai0+(s.cfg.decai1-s.cfg.decai0)*prog;
    if(s.travado>0)decai+=4;
    s.carga=Math.max(0,s.carga-decai*dt); s.rpm=Math.max(0,s.rpm-8*dt);
    if(s.travado<=0) s.ang+=s.rpm*dt;

    if(s.travado>0){
      s.travado-=dt; s.vapor.push({x:W/2+(Math.random()-.5)*60,y:H*.62,vy:-.6-Math.random(),vida:1,r:4+Math.random()*6});
      if(s.travado<=0)s.calor=45;
    } else {
      if(s.carga>78)s.calor=Math.min(100,s.calor+((s.carga-78)/22)*s.cfg.calorTaxa*dt);
      else s.calor=Math.max(0,s.calor-20*dt);
      if(s.calor>=100){s.travado=s.cfg.travaDur; s.rpm=0; s.tremor=1; blip(200,.8,.25,'sawtooth');}
    }

    if(s.fusivelOK){
      if(s.t>s.proxFusivel){s.fusivelOK=false; s.trocaProg=0; s.tremor=.5; blip(900,.25,.15,'sawtooth');}
    } else if(s.trocando){
      s.trocaProg+=dt/2.4;
      if(s.trocaProg>=1){s.fusivelOK=true; s.trocando=false; s.trocaProg=0; s.proxFusivel=s.t+s.cfg.fuseMin+Math.random()*(s.cfg.fuseMax-s.cfg.fuseMin); blip(500,.15,.12,'triangle');}
    } else s.trocaProg=Math.max(0,s.trocaProg-dt*2);

    if(s.carga<35){
      s.prox=Math.min(100,s.prox+((35-s.carga)/35)*s.cfg.criatura*dt);
      if(!s.olhos.length){
        const n=2+Math.floor(Math.random()*3)+GLOBAL.noiteDinamo;
        for(let i=0;i<n;i++) s.olhos.push({x:Math.random()<.5?W*(.05+Math.random()*.18):W*(.77+Math.random()*.18),y:H*(.25+Math.random()*.45),pisca:Math.random()*6});
      }
    } else { s.prox=Math.max(0,s.prox-(s.carga/100)*16*dt); if(s.prox<8)s.olhos=[]; }
    s.olhos.forEach(o=>{o.pisca-=dt;if(o.pisca<0)o.pisca=2+Math.random()*5;});

    s.proxTrovao-=dt;
    if(s.proxTrovao<=0){ s.relampago=.12+Math.random()*.1; s.proxTrovao=10+Math.random()*20; }
    if(s.relampago>0)s.relampago=Math.max(0,s.relampago-dt*3);

    s.gotas.forEach(g=>{g.y+=g.vel*dt;if(g.y>H+20){g.y=-10;g.x=Math.random()*W;}});
    s.faiscas=s.faiscas.filter(f=>f.vida>0);s.faiscas.forEach(f=>{f.x+=f.vx;f.y+=f.vy;f.vy+=.15;f.vida-=dt*2;});
    s.vapor=s.vapor.filter(v=>v.vida>0);s.vapor.forEach(v=>{v.y+=v.vy;v.r+=dt*8;v.vida-=dt*.9;});
    s.tremor=Math.max(0,s.tremor-dt);

    if(s.prox>=100) triggerMorte('O dínamo parou. A criatura o alcançou.');
    else if(s.t>=s.cfg.dur) completarFase(s.cfg.dur);

    // Update HUD
    const cf=document.getElementById('carga-fill');cf.style.width=s.carga+'%';cf.classList.toggle('critico',s.carga<35);
    const hf=document.getElementById('calor-fill');hf.style.width=s.calor+'%';hf.classList.toggle('critico',s.calor>75||s.travado>0);
    const rest=Math.max(0,s.cfg.dur-s.t);
    document.getElementById('timer-val').textContent=Math.floor(rest/60)+':'+String(Math.floor(rest%60)).padStart(2,'0');
    
    const av=document.getElementById('aviso');
    if(s.travado>0){av.textContent='DÍNAMO TRAVADO';av.className='quente on';}
    else if(!s.fusivelOK){av.textContent='FUSÍVEL QUEIMADO';av.className='on';}
    else if(s.prox>45){av.textContent='ELE ESTÁ SE APROXIMANDO';av.className='on';}
    else av.className='';
    
    document.getElementById('btn-acao1').classList.toggle('hidden',s.fusivelOK);
    const fp=document.getElementById('acao1-prog'); fp.classList.toggle('hidden',s.fusivelOK);
    fp.firstElementChild.style.width=(s.trocaProg*100)+'%';
  },
  desenhar(){
    const s=this.S;
    ctx.fillStyle='#070605';ctx.fillRect(0,0,W,H);
    if(s.relampago>0){ctx.fillStyle=`rgba(230,240,255,${s.relampago*.7})`;ctx.fillRect(0,0,W,H);}
    const tx=s.tremor>0?(Math.random()-.5)*8*s.tremor:0, ty=s.tremor>0?(Math.random()-.5)*8*s.tremor:0;
    ctx.save();ctx.translate(tx,ty);
    let luz=GLOBAL.morto?0:s.carga/100; if(!s.fusivelOK)luz*=(Math.random()<.12?.8:.35);
    const flicker=Math.min(1,luz*(0.9+Math.sin(performance.now()/40)*.04+(Math.random()-.5)*.05)+(s.relampago>0?s.relampago*.6:0));
    const cx=W/2, dy=H*.7, R=Math.min(W,H)*.13;
    
    // fundo e máquina (simplificado para economia de código)
    ctx.fillStyle='#100d09';ctx.fillRect(cx-R*1.6,dy+R*.8,R*3.2,R*.5);
    ctx.lineWidth=R*.18; ctx.strokeStyle=`rgb(${40+90*flicker},${28+60*flicker},${16+30*flicker})`;
    ctx.beginPath();ctx.arc(cx,dy,R,0,7);ctx.stroke();
    ctx.save();ctx.translate(cx,dy);ctx.rotate(s.ang);ctx.strokeStyle=`rgb(${50+110*flicker},${35+70*flicker},${18+30*flicker})`;ctx.lineWidth=R*.08;
    for(let i=0;i<3;i++){ctx.rotate(Math.PI/3);ctx.beginPath();ctx.moveTo(-R*.72,0);ctx.lineTo(R*.72,0);ctx.stroke();}
    ctx.restore();

    s.faiscas.forEach(f=>{ctx.fillStyle=`rgba(255,210,120,${f.vida})`;ctx.fillRect(f.x,f.y,2.5,2.5);});
    s.vapor.forEach(v=>{ctx.fillStyle=`rgba(200,200,200,${v.vida*.18})`;ctx.beginPath();ctx.arc(v.x,v.y,v.r,0,7);ctx.fill();});
    ctx.save();s.gotas.forEach(g=>{ctx.strokeStyle=`rgba(160,180,200,${g.opac})`;ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(g.x,g.y);ctx.lineTo(g.x-3,g.y+g.len);ctx.stroke();});ctx.restore();
    
    if(s.prox>5){
      const intens=(s.prox/100)*Math.max(.25,1-flicker);
      s.olhos.forEach(o=>{if(o.pisca<.18)return;const ax=o.x+(cx-o.x)*(s.prox/100)*.45;const ay=o.y+(dy-o.y)*(s.prox/100)*.3;const r=2.2+(s.prox/100)*3.5;ctx.fillStyle=`rgba(220,235,245,${intens})`;ctx.beginPath();ctx.arc(ax-7,ay,r,0,7);ctx.fill();ctx.beginPath();ctx.arc(ax+7,ay,r,0,7);ctx.fill();});
    }
    const vin=ctx.createRadialGradient(cx,H*.5,Math.max(40,(1-s.prox/130)*Math.max(W,H)*.6),cx,H*.5,Math.max(W,H)*.85);
    vin.addColorStop(0,'rgba(0,0,0,0)');vin.addColorStop(1,`rgba(0,0,0,${.75+(s.prox/100)*.25})`);ctx.fillStyle=vin;ctx.fillRect(0,0,W,H);
    ctx.restore();
  }
};

// ---------- FASE 2: CORREDOR ----------
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
const FaseCorredor = {
  S: {},
  iniciar(){
    GLOBAL.faseMaximaDB = 2;
    this.S = {
      t:0, px:1.5, py:1.5, cx:1.5, cy:7.5, combustivel:100,
      bombando:false, bombCooldown:0, grid:LABIRINTO,
      tileSize: Math.min(W/15, H/9), tremor:0, calcPath:0, path:[]
    };
    this.configHUD();
  },
  configHUD(){
    document.getElementById('lbl-carga').textContent='🛢️ ÓLEO (ESPAÇO)';
    document.getElementById('box-calor').classList.add('hidden');
    document.getElementById('fase-tag').textContent='FASE 2: CORREDOR';
    document.getElementById('lbl-timer').textContent='TEMPO';
    document.getElementById('zonaE').classList.add('hidden');
    document.getElementById('zonaD').classList.add('hidden');
    document.getElementById('btn-acao1').classList.add('hidden');
    document.getElementById('acao1-prog').classList.add('hidden');
    document.getElementById('dpad').classList.remove('hidden');
  },
  onKey(k, isDown){
    if(GLOBAL.morto)return;
    const s=this.S;
    if(k===' '){
      if(isDown && s.bombCooldown<=0){
        s.combustivel=Math.min(100,s.combustivel+15);
        s.bombCooldown=0.8; s.bombando=true; blip(150,.1,.1,'sawtooth');
      }
      if(!isDown) s.bombando=false;
    }
    s.keys = s.keys||{}; s.keys[k] = isDown;
  },
  isWall(x,y){
    const col=Math.floor(x), row=Math.floor(y);
    if(row<0||row>=this.S.grid.length||col<0||col>=this.S.grid[0].length) return true;
    return this.S.grid[row][col]==='1';
  },
  atualizar(dt){
    const s=this.S; s.t+=dt;
    document.getElementById('timer-val').textContent=Math.floor(s.t/60)+':'+String(Math.floor(s.t%60)).padStart(2,'0');
    
    s.bombCooldown -= dt;
    s.combustivel = Math.max(0, s.combustivel - 3*dt);
    const cf=document.getElementById('carga-fill');cf.style.width=s.combustivel+'%';cf.classList.toggle('critico',s.combustivel<20);

    // Movimento jogador
    if(!s.bombando){
      let dx=0, dy=0;
      if(s.keys?.arrowleft || s.keys?.a) dx=-1;
      if(s.keys?.arrowright || s.keys?.d) dx=1;
      if(s.keys?.arrowup || s.keys?.w) dy=-1;
      if(s.keys?.arrowdown || s.keys?.s) dy=1;
      if(dx!==0 && dy!==0){ dx*=.7; dy*=.7; }
      const vel = 3*dt;
      if(!this.isWall(s.px+dx*vel, s.py)) s.px+=dx*vel;
      if(!this.isWall(s.px, s.py+dy*vel)) s.py+=dy*vel;
    }

    // Saída
    const col=Math.floor(s.px), row=Math.floor(s.py);
    if(s.grid[row] && s.grid[row][col]==='E'){
      completarFase(s.t); return;
    }

    // Criatura
    s.calcPath -= dt;
    if(s.calcPath<=0){
      s.calcPath = 1.0;
      // pathfinding super simples direto ao jogador (em um grid real usaria BFS, simplificado por tokens)
      s.path = [{x:Math.floor(s.px)+.5, y:Math.floor(s.py)+.5}];
    }
    const speedC = (s.combustivel<20 ? 2.5 : 1.5) * dt;
    const dxC = s.px - s.cx, dyC = s.py - s.cy;
    const distC = Math.hypot(dxC, dyC);
    if(distC > 0.1){ s.cx += (dxC/distC)*speedC; s.cy += (dyC/distC)*speedC; }

    if(distC < 0.8) triggerMorte('Foi pego no escuro do corredor.');
    s.tremor=Math.max(0,s.tremor-dt);
  },
  desenhar(){
    const s=this.S, ts=s.tileSize;
    ctx.fillStyle='#070605'; ctx.fillRect(0,0,W,H);
    if(GLOBAL.morto) return;

    ctx.save();
    // Camera centralizada no jogador
    ctx.translate(W/2 - s.px*ts, H/2 - s.py*ts);

    // Grid visivel apenas perto
    for(let r=0; r<s.grid.length; r++){
      for(let c=0; c<s.grid[0].length; c++){
        const distP = Math.hypot(c+.5-s.px, r+.5-s.py);
        const luzR = (s.combustivel/100)*4 + 2;
        if(distP > luzR+1) continue;

        if(s.grid[r][c]==='1'){
          ctx.fillStyle='#14110d'; ctx.fillRect(c*ts, r*ts, ts+1, ts+1);
          ctx.strokeStyle='#2a2218'; ctx.strokeRect(c*ts, r*ts, ts, ts);
        } else if(s.grid[r][c]==='E'){
          ctx.fillStyle='#004400'; ctx.fillRect(c*ts, r*ts, ts, ts);
        }
      }
    }

    // Jogador
    ctx.fillStyle='rgba(255,179,71,0.8)';
    ctx.beginPath(); ctx.arc(s.px*ts, s.py*ts, ts*0.25, 0, 7); ctx.fill();

    // Criatura
    const distC = Math.hypot(s.cx-s.px, s.cy-s.py);
    const luzR = (s.combustivel/100)*4 + 2;
    if(distC < luzR){
      ctx.fillStyle='white';
      ctx.beginPath(); ctx.arc(s.cx*ts - 4, s.cy*ts, 3, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(s.cx*ts + 4, s.cy*ts, 3, 0, 7); ctx.fill();
    }

    ctx.restore();

    // Vignette
    const cx=W/2, cy=H/2;
    const raioLuz = Math.max(50, (s.combustivel/100) * Math.min(W,H)*0.4);
    const vin=ctx.createRadialGradient(cx,cy,raioLuz*0.3, cx,cy,raioLuz);
    vin.addColorStop(0,'rgba(0,0,0,0)');vin.addColorStop(1,'rgba(0,0,0,0.98)');
    ctx.fillStyle=vin;ctx.fillRect(0,0,W,H);
  }
};

// ---------- FASE 3: ELEVADOR ----------
const FaseElevador = {
  S: {},
  iniciar(){
    GLOBAL.faseMaximaDB = 3;
    this.S = {
      t:0, y:0, tensao:0, freio:false, ultimaManivela:null, ultimoGiro:0,
      cy: -15, // criatura começa abaixo
      tremerCabo:0
    };
    this.configHUD();
  },
  configHUD(){
    document.getElementById('lbl-carga').textContent='↕️ ALTURA';
    document.getElementById('lbl-calor').textContent='⚠️ TENSÃO DO CABO';
    document.getElementById('box-calor').classList.remove('hidden');
    document.getElementById('fase-tag').textContent='FASE 3: POÇO';
    document.getElementById('lbl-timer').textContent='TEMPO';
    document.getElementById('zonaE').classList.remove('hidden');
    document.getElementById('zonaD').classList.remove('hidden');
    document.getElementById('dpad').classList.add('hidden');
    document.getElementById('btn-acao1').textContent='[E] PUXAR FREIO';
    document.getElementById('btn-acao1').classList.remove('hidden');
    document.getElementById('acao1-prog').classList.add('hidden');
  },
  onKey(k, isDown){
    if(GLOBAL.morto)return;
    if(k==='e'){ this.S.freio=isDown; return; }
    if(isDown && !this.S.freio){
      if(k==='arrowleft'||k==='a') this.girar('E');
      if(k==='arrowright'||k==='d') this.girar('D');
    }
  },
  girar(lado){
    if(this.S.ultimaManivela===lado)return;
    this.S.ultimaManivela=lado;
    const dtg = performance.now() - this.S.ultimoGiro; this.S.ultimoGiro=performance.now();
    
    this.S.y += 0.8;
    if(dtg < 250) this.S.tensao += 4;
    blip(180,.05,.08,'square');
  },
  atualizar(dt){
    const s=this.S; s.t+=dt;
    document.getElementById('timer-val').textContent=Math.floor(s.t/60)+':'+String(Math.floor(s.t%60)).padStart(2,'0');

    if(!s.freio) {
      s.y = Math.max(0, s.y - 1*dt); // Gravidade
      s.tensao = Math.max(0, s.tensao - 15*dt);
    }

    if(s.tensao>=100){
      // Cabo estoura
      s.y = Math.max(0, s.y - 15); s.tensao=0; s.tremerCabo=1; blip(80,.5,.5,'sawtooth');
    }

    // Criatura sobe
    s.cy += 1.8*dt;

    if(s.y >= 100) completarFase(s.t);
    else if(s.cy >= s.y) triggerMorte('A criatura invadiu o elevador pelo alçapão.');

    const cf=document.getElementById('carga-fill');cf.style.width=s.y+'%';
    const hf=document.getElementById('calor-fill');hf.style.width=s.tensao+'%';hf.classList.toggle('critico',s.tensao>80);
    s.tremerCabo=Math.max(0,s.tremerCabo-dt);
  },
  desenhar(){
    const s=this.S;
    ctx.fillStyle='#070605'; ctx.fillRect(0,0,W,H);
    if(GLOBAL.morto) return;

    const cx=W/2;
    // Poço
    ctx.fillStyle='#111'; ctx.fillRect(cx-60, 0, 120, H);
    
    // Y visual: 0 = fundo da tela, 100 = topo
    const elevY = H - (s.y/100)*(H-100) - 50;
    
    // Cabo
    ctx.strokeStyle='#444'; ctx.lineWidth=2;
    const tx = s.tremerCabo>0 ? (Math.random()-.5)*4 : 0;
    ctx.beginPath(); ctx.moveTo(cx+tx, 0); ctx.lineTo(cx+tx, elevY); ctx.stroke();

    // Elevador
    ctx.fillStyle='#2a2218'; ctx.fillRect(cx-40, elevY, 80, 50);
    ctx.strokeStyle=s.freio?'#c0392b':'#b87333'; ctx.strokeRect(cx-40, elevY, 80, 50);

    // Criatura
    const criatY = H - (s.cy/100)*(H-100) - 50;
    if(criatY > elevY+50){
      ctx.fillStyle='white';
      ctx.beginPath(); ctx.arc(cx-10, criatY, 4, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(cx+10, criatY, 4, 0, 7); ctx.fill();
    }
  }
};


// ---------- GAME LOOP GERAL ----------
let ultimo = performance.now();
function loop(agora){
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (agora-ultimo)/1000); ultimo=agora;
  
  if(GLOBAL.faseObj && !GLOBAL.morto){
    GLOBAL.faseObj.atualizar(dt);
    GLOBAL.faseObj.desenhar();
  }
}

// Inputs globais repassam para a fase ativa
window.addEventListener('keydown', e=>{
  if(e.repeat)return;
  if(GLOBAL.faseObj && GLOBAL.faseObj.onKey) GLOBAL.faseObj.onKey(e.key.toLowerCase(), true);
});
window.addEventListener('keyup', e=>{
  if(GLOBAL.faseObj && GLOBAL.faseObj.onKey) GLOBAL.faseObj.onKey(e.key.toLowerCase(), false);
});
['zonaE','zonaD'].forEach(id=>{
  document.getElementById(id).addEventListener('pointerdown', e=>{ e.preventDefault(); if(GLOBAL.faseObj && GLOBAL.faseObj.girar) GLOBAL.faseObj.girar(id==='zonaE'?'E':'D'); });
});
document.getElementById('btn-acao1').addEventListener('pointerdown', e=>{ e.preventDefault(); if(GLOBAL.faseObj && GLOBAL.faseObj.onKey) GLOBAL.faseObj.onKey('e', true); });
window.addEventListener('pointerup', ()=>{ if(GLOBAL.faseObj && GLOBAL.faseObj.onKey) GLOBAL.faseObj.onKey('e', false); });

// D-pad mobile touch
['up','left','right','down'].forEach(dir=>{
  const el=document.getElementById('d-'+dir);
  if(el){
    el.addEventListener('pointerdown', e=>{ e.preventDefault(); if(GLOBAL.faseObj && GLOBAL.faseObj.onKey) GLOBAL.faseObj.onKey('arrow'+dir, true); });
    el.addEventListener('pointerup', e=>{ e.preventDefault(); if(GLOBAL.faseObj && GLOBAL.faseObj.onKey) GLOBAL.faseObj.onKey('arrow'+dir, false); });
  }
});
const dCenter = document.getElementById('d-center');
if(dCenter){
  dCenter.addEventListener('pointerdown', e=>{ e.preventDefault(); if(GLOBAL.faseObj && GLOBAL.faseObj.onKey) GLOBAL.faseObj.onKey(' ', true); });
  dCenter.addEventListener('pointerup', e=>{ e.preventDefault(); if(GLOBAL.faseObj && GLOBAL.faseObj.onKey) GLOBAL.faseObj.onKey(' ', false); });
}

// ---------- FLUXO DE FASES ----------
function iniciarPartida(){
  salvarApelido(document.getElementById('input-apelido').value.trim().toUpperCase().slice(0,16));
  initAudio(); if(AC&&AC.state==='suspended')AC.resume();
  document.getElementById('tela-inicio').classList.add('hidden');
  
  GLOBAL.tempoAcumulado = 0;
  GLOBAL.faseID = 1;
  GLOBAL.noiteDinamo = 0;
  
  prepararFase();
}

function prepararFase(){
  GLOBAL.morto = false;
  document.getElementById('hud').classList.add('hidden');
  document.getElementById('tela-fase').classList.remove('hidden');
  
  if(GLOBAL.faseID === 1){
    document.getElementById('fase-titulo').textContent = `DÍNAMO - NOITE ${GLOBAL.noiteDinamo+1}`;
    document.getElementById('fase-sub').textContent = NOITES_DINAMO[GLOBAL.noiteDinamo].sub;
  } else if(GLOBAL.faseID === 2){
    document.getElementById('fase-titulo').textContent = 'CORREDOR ESCURO';
    document.getElementById('fase-sub').textContent = 'A luz atrai, mas a escuridão mata. Encontre o elevador.';
  } else if(GLOBAL.faseID === 3){
    document.getElementById('fase-titulo').textContent = 'POÇO DO ELEVADOR';
    document.getElementById('fase-sub').textContent = 'Suba. Não pare. Não olhe para baixo.';
  }
}

document.getElementById('btn-fase').addEventListener('click', ()=>{
  document.getElementById('tela-fase').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  
  if(GLOBAL.faseID === 1) GLOBAL.faseObj = FaseDinamo;
  else if(GLOBAL.faseID === 2) GLOBAL.faseObj = FaseCorredor;
  else if(GLOBAL.faseID === 3) GLOBAL.faseObj = FaseElevador;
  
  GLOBAL.faseObj.iniciar();
});

function completarFase(tempoLongo){
  GLOBAL.faseObj = null;
  GLOBAL.tempoAcumulado += tempoLongo;
  document.getElementById('hud').classList.add('hidden');
  document.getElementById('zonaE').classList.add('hidden');
  document.getElementById('zonaD').classList.add('hidden');
  document.getElementById('btn-acao1').classList.add('hidden');
  document.getElementById('acao1-prog').classList.add('hidden');
  document.getElementById('dpad').classList.add('hidden');
  
  if(GLOBAL.faseID === 1){
    GLOBAL.noiteDinamo++;
    if(GLOBAL.noiteDinamo >= 3){
      GLOBAL.faseID = 2; // Avança pro corredor
      mostrarCutscene([
        "O dínamo estabilizou. A energia está mantida.",
        "Mas a saída... A saída fica três andares acima.",
        "O elevador ainda funciona. Mas o corredor até lá está no escuro."
      ], prepararFase);
    } else {
      prepararFase();
    }
  } else if(GLOBAL.faseID === 2){
    GLOBAL.faseID = 3; // Avança pro elevador
    mostrarCutscene([
      "Você bate as portas de metal do elevador.",
      "Seguro. Por enquanto.",
      "As engrenagens estão velhas. Gire a manivela para subir.",
      "Cuidado com a tensão do cabo."
    ], prepararFase);
  } else if(GLOBAL.faseID === 3){
    // Vitória final!
    GLOBAL.pontuacaoFinal = (5 * 1000) + Math.floor(GLOBAL.tempoAcumulado);
    enviarScore(GLOBAL.pontuacaoFinal, 5, true, 3).then(dados=>{
      mostrarFim('FUGA CONCLUÍDA', 'vitoria', 'A luz do sol. Você sobreviveu à Usina Nº 7.', GLOBAL.pontuacaoFinal, dados?dados.posicao:null);
    });
  }
}

function triggerMorte(textoCausa){
  GLOBAL.morto = true;
  somSusto();
  document.getElementById('susto-aviso').textContent = 'PEGO';
  document.getElementById('susto-aviso').className = 'on';
  
  const noc = GLOBAL.faseID === 1 ? GLOBAL.noiteDinamo : (GLOBAL.faseID===2 ? 3 : 4);
  const pts = (noc * 1000) + Math.floor(GLOBAL.tempoAcumulado + GLOBAL.faseObj.S.t);
  
  enviarScore(pts, noc, false, GLOBAL.faseMaximaDB).then(dados=>{
    setTimeout(()=>{
      document.getElementById('susto-aviso').className = '';
      mostrarFim('FIM DA LINHA', 'morte', textoCausa, pts, dados?dados.posicao:null);
    }, 1500);
  });
}

function mostrarFim(titulo, classe, texto, pts, pos){
  GLOBAL.faseObj = null;
  document.getElementById('hud').classList.add('hidden');
  document.getElementById('zonaE').classList.add('hidden');
  document.getElementById('zonaD').classList.add('hidden');
  document.getElementById('btn-acao1').classList.add('hidden');
  document.getElementById('acao1-prog').classList.add('hidden');
  document.getElementById('dpad').classList.add('hidden');
  
  const t = document.getElementById('fim-titulo'); t.textContent=titulo; t.className=classe;
  document.getElementById('fim-texto').textContent=texto;
  document.getElementById('fim-rank-posicao').textContent = pos ? `★ #${pos} NO RANKING GLOBAL — ${pts.toLocaleString()} pts` : `PONTUAÇÃO: ${pts.toLocaleString()} pts`;
  document.getElementById('tela-fim').classList.remove('hidden');
  carregarRanking('#ranking-lista',10);
}

document.getElementById('btn-reiniciar').addEventListener('click', ()=>{
  document.getElementById('tela-fim').classList.add('hidden');
  // Sempre recomeça da Fase 1, Noite 1 pra punição real, 
  // ou poderíamos recomeçar a fase atual. A instrução diz "1 tentativa única por fase".
  // Se morre, volta ao início de tudo pra manter o hardcore.
  iniciarPartida(); 
});

// Cutscene genérica
function mostrarCutscene(linhas, callbackFim){
  const el=document.getElementById('tela-cutscene');
  el.classList.remove('hidden'); setTimeout(()=>el.classList.add('visivel'),50);
  const txt = document.getElementById('cutscene-texto'); txt.innerHTML='';
  const btn = document.getElementById('btn-cutscene'); btn.classList.remove('visivel');
  
  let l=0, c=0, esp=false;
  function avancar(){
    if(l >= linhas.length){
      const cur=document.getElementById('cutscene-cursor');if(cur)cur.remove();
      btn.classList.add('visivel');
      btn.onclick = () => { el.classList.remove('visivel'); setTimeout(()=>{el.classList.add('hidden'); callbackFim();}, 800); };
      return;
    }
    if(esp){esp=false; l++; c=0; avancar(); return;}
    let spanAtual=txt.querySelector('.linha-atual');
    if(!spanAtual){spanAtual=document.createElement('span');spanAtual.className='linha linha-atual';txt.appendChild(spanAtual);}
    if(c < linhas[l].length){
      spanAtual.textContent = linhas[l].slice(0,c+1); c++;
      setTimeout(avancar, 30);
    } else {
      spanAtual.classList.remove('linha-atual'); esp=true; setTimeout(avancar, 1000);
    }
  }
  const cursor=document.createElement('span');cursor.id='cutscene-cursor';txt.appendChild(cursor);
  setTimeout(avancar, 800);
}

// Botoes tela inicial
document.getElementById('btn-iniciar').addEventListener('click', iniciarPartida);
document.getElementById('btn-ver-ranking').addEventListener('click', ()=>{
  document.getElementById('tela-ranking').classList.remove('hidden');
  carregarRanking('#ranking-full-lista',20);
});
document.getElementById('btn-fechar-ranking').addEventListener('click', ()=>{ document.getElementById('tela-ranking').classList.add('hidden'); });

// Boot
const apelidoSalvo=lerApelido();
if(apelidoSalvo) document.getElementById('input-apelido').value=apelidoSalvo;
carregarRanking('#ranking-lista',10);
requestAnimationFrame(loop);

