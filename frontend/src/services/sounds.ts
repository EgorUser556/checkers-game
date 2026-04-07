/**
 * Звуки генерируются через Web Audio API — никаких внешних файлов.
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  gain = 0.3,
  decay = 0.8,
) {
  try {
    const ac = getCtx();
    const osc = ac.createOscillator();
    const gainNode = ac.createGain();
    osc.connect(gainNode);
    gainNode.connect(ac.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ac.currentTime);
    gainNode.gain.setValueAtTime(gain, ac.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration * decay);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + duration);
  } catch (_) {
    // AudioContext может быть заблокирован до первого взаимодействия
  }
}

/** Стук шашки при обычном ходе */
export function playMove() {
  playTone(220, 0.12, 'triangle', 0.25);
  setTimeout(() => playTone(180, 0.08, 'triangle', 0.15), 60);
}

/** Глухой удар при взятии шашки */
export function playCapture() {
  playTone(120, 0.18, 'sawtooth', 0.35, 0.6);
  setTimeout(() => playTone(90, 0.15, 'triangle', 0.2, 0.5), 80);
}

/** Фанфара при превращении в дамку */
export function playKing() {
  const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.18, 'sine', 0.3), i * 90);
  });
}

/** Победный звук */
export function playWin() {
  const notes = [523, 659, 784, 659, 784, 1047];
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.2, 'sine', 0.28), i * 110);
  });
}

/** Звук поражения */
export function playLose() {
  const notes = [440, 392, 349, 294];
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.25, 'triangle', 0.28), i * 130);
  });
}
