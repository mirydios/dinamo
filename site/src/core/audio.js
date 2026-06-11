export let AC = null;

export function initAudio() {
  if (AC) return;
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) { AC = null; }
}

export function blip(freq, dur, vol, tipo) {
  if (!AC) return;
  const o = AC.createOscillator(), g = AC.createGain(); o.type = tipo || 'square'; o.frequency.value = freq;
  g.gain.setValueAtTime(vol, AC.currentTime); g.gain.exponentialRampToValueAtTime(.0001, AC.currentTime + dur);
  o.connect(g); g.connect(AC.destination); o.start(); o.stop(AC.currentTime + dur + .02);
}

export function somSusto() {
  if (!AC) return;
  const o = AC.createOscillator(), g = AC.createGain(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(700, AC.currentTime); o.frequency.exponentialRampToValueAtTime(60, AC.currentTime + .9);
  g.gain.setValueAtTime(.4, AC.currentTime); g.gain.exponentialRampToValueAtTime(.001, AC.currentTime + 1);
  o.connect(g); g.connect(AC.destination); o.start(); o.stop(AC.currentTime + 1);
}
