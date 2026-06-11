export const GLOBAL = {
  faseID: 1, // 1=Dinamo(noites 1,2,3), 2=Corredor, 3=Elevador
  noiteDinamo: 0, // 0,1,2
  tempoAcumulado: 0,
  pontuacaoFinal: 0,
  faseMaximaDB: 1, // Para enviar ao db
  morto: false,
  faseObj: null,
  pesadelo: false
};

// Canvas references
export const CanvasInfo = {
  cv: null,
  ctx: null,
  W: 0,
  H: 0,
  DPR: 1
};

export function resizeCanvas(cv, ctx) {
  CanvasInfo.cv = cv;
  CanvasInfo.ctx = ctx;
  CanvasInfo.DPR = Math.min(window.devicePixelRatio || 1, 2);
  CanvasInfo.W = window.innerWidth;
  CanvasInfo.H = window.innerHeight;
  cv.width = CanvasInfo.W * CanvasInfo.DPR;
  cv.height = CanvasInfo.H * CanvasInfo.DPR;
  cv.style.width = CanvasInfo.W + 'px';
  cv.style.height = CanvasInfo.H + 'px';
  ctx.setTransform(CanvasInfo.DPR, 0, 0, CanvasInfo.DPR, 0, 0);
}
