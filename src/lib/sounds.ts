/**
 * Sound effects using Web Audio API — no external files needed.
 */

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.15): void {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.value = freq;

  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

export function playSuccess(): void {
  playTone(523.25, 0.1, 'sine', 0.12);
  setTimeout(() => playTone(659.25, 0.1, 'sine', 0.12), 80);
  setTimeout(() => playTone(783.99, 0.2, 'sine', 0.12), 160);
}

export function playError(): void {
  playTone(200, 0.15, 'sawtooth', 0.08);
  setTimeout(() => playTone(150, 0.2, 'sawtooth', 0.08), 100);
}

export function playClick(): void {
  playTone(800, 0.03, 'sine', 0.05);
}

export function playNotification(): void {
  playTone(880, 0.08, 'sine', 0.1);
  setTimeout(() => playTone(1108.73, 0.12, 'sine', 0.1), 60);
}
