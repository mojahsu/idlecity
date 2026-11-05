// A tiny synthesiser on Web Audio. Every sound is generated from oscillators
// and filtered noise, so there are no audio files to ship. The context is
// created on the first click or key press (browsers block sound before that).

interface ToneOpts { attack?: number; release?: number; slideTo?: number; lowpass?: number; detune?: number; delay?: number }
interface NoiseOpts { lowpass?: number; highpass?: number; bandpass?: number; q?: number; attack?: number; delay?: number }

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private ambience = new Map<string, GainNode>();
  private muted: boolean;
  private volume = 0.7;

  constructor(muted = false) {
    this.muted = muted;
    const wake = () => { this.ensure(); };
    window.addEventListener('pointerdown', wake);
    window.addEventListener('keydown', wake);
  }

  get ready(): boolean { return !!this.ctx && this.ctx.state === 'running'; }
  isMuted(): boolean { return this.muted; }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : this.volume, this.ctx.currentTime, 0.05);
  }

  /** Create the context and the looping ambience beds. Safe to call often. */
  ensure(): void {
    if (this.ctx) { if (this.ctx.state === 'suspended') void this.ctx.resume(); return; }
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!C) return;
    const ctx = new C();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;
    // A gentle compressor keeps overlapping one-shots from clipping.
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 4; comp.attack.value = 0.01; comp.release.value = 0.2;
    this.master.connect(comp); comp.connect(ctx.destination);
    // Two seconds of white noise, looped by every noise source.
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buf;
    // Ambience beds: wind, rain, river. Each is a looping noise through a filter into its own gain.
    this.bed('wind', { lowpass: 380 });
    this.bed('rain', { highpass: 1800 });
    this.bed('river', { bandpass: 700, q: 0.6 });
    this.bed('blaze', { bandpass: 1200, q: 0.4 });
    // Wind swells slowly.
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.08; const lg = ctx.createGain(); lg.gain.value = 0.5;
    const wind = this.ambience.get('wind')!; lfo.connect(lg); lg.connect(wind.gain); lfo.start();
  }

  private bed(name: string, f: NoiseOpts): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource(); src.buffer = this.noiseBuffer; src.loop = true;
    const filt = ctx.createBiquadFilter();
    if (f.lowpass) { filt.type = 'lowpass'; filt.frequency.value = f.lowpass; }
    else if (f.highpass) { filt.type = 'highpass'; filt.frequency.value = f.highpass; }
    else { filt.type = 'bandpass'; filt.frequency.value = f.bandpass ?? 800; filt.Q.value = f.q ?? 1; }
    const g = ctx.createGain(); g.gain.value = 0;
    src.connect(filt); filt.connect(g); g.connect(this.master!);
    src.start();
    this.ambience.set(name, g);
  }

  /** Set the level of an ambience bed; it glides there over a second or so. */
  setBed(name: string, level: number): void {
    const g = this.ambience.get(name);
    if (!g || !this.ctx) return;
    g.gain.setTargetAtTime(Math.max(0, level), this.ctx.currentTime, 0.8);
  }

  /** A single oscillator note with an envelope, optional pitch slide and low-pass. */
  tone(freq: number, type: OscillatorType, dur: number, gain: number, o: ToneOpts = {}): void {
    if (!this.ready || this.muted) return;
    const ctx = this.ctx!, t0 = ctx.currentTime + (o.delay ?? 0);
    const osc = ctx.createOscillator(); osc.type = type; osc.frequency.setValueAtTime(freq, t0);
    if (o.detune) osc.detune.value = o.detune;
    if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slideTo), t0 + dur);
    const g = ctx.createGain();
    const a = o.attack ?? 0.005, r = o.release ?? dur * 0.6;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + a); g.gain.setValueAtTime(gain, t0 + Math.max(a, dur - r)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let node: AudioNode = osc;
    if (o.lowpass) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lowpass; osc.connect(f); node = f; }
    node.connect(g); g.connect(this.master!);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  }

  /** A burst of filtered noise with an envelope. */
  noise(dur: number, gain: number, o: NoiseOpts = {}): void {
    if (!this.ready || this.muted) return;
    const ctx = this.ctx!, t0 = ctx.currentTime + (o.delay ?? 0);
    const src = ctx.createBufferSource(); src.buffer = this.noiseBuffer; src.loop = true;
    let node: AudioNode = src;
    if (o.lowpass || o.highpass || o.bandpass) {
      const f = ctx.createBiquadFilter();
      if (o.lowpass) { f.type = 'lowpass'; f.frequency.value = o.lowpass; }
      else if (o.highpass) { f.type = 'highpass'; f.frequency.value = o.highpass; }
      else { f.type = 'bandpass'; f.frequency.value = o.bandpass!; f.Q.value = o.q ?? 1; }
      src.connect(f); node = f;
    }
    const g = ctx.createGain();
    const a = o.attack ?? 0.005;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    node.connect(g); g.connect(this.master!);
    src.start(t0); src.stop(t0 + dur + 0.05);
  }

  // ---- named sounds ---------------------------------------------------------------

  bell(gain = 0.12, pitch = 520, delay = 0): void {
    this.tone(pitch, 'sine', 2.2, gain, { release: 2, delay });
    this.tone(pitch * 2.4, 'sine', 1.2, gain * 0.35, { release: 1.1, delay });
    this.tone(pitch * 0.5, 'triangle', 1.6, gain * 0.25, { release: 1.5, delay });
  }
  chirp(): void {
    const f = 2200 + Math.random() * 1200;
    for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) this.tone(f, 'sine', 0.09, 0.025, { slideTo: f * 1.35, delay: i * 0.13 });
  }
  cricket(): void { for (let i = 0; i < 3; i++) this.tone(4300, 'square', 0.03, 0.006, { delay: i * 0.07, lowpass: 6000 }); }
  owl(): void { this.tone(380, 'sine', 0.3, 0.04, { attack: 0.05, slideTo: 330 }); this.tone(360, 'sine', 0.45, 0.04, { attack: 0.05, slideTo: 300, delay: 0.4 }); }
  howl(): void { this.tone(300, 'sawtooth', 1.6, 0.02, { attack: 0.3, slideTo: 520, lowpass: 900 }); this.tone(300, 'sine', 1.6, 0.03, { attack: 0.3, slideTo: 520 }); }
  crackle(): void { this.noise(0.02, 0.05, { highpass: 2500 }); }
  chop(): void { this.noise(0.06, 0.05, { lowpass: 900 }); this.tone(180, 'square', 0.05, 0.02, { slideTo: 90 }); }
  hammer(): void { this.tone(1900, 'sine', 0.05, 0.03, { slideTo: 1500 }); this.noise(0.03, 0.03, { highpass: 3000 }); }
  pick(): void { this.tone(2600, 'triangle', 0.06, 0.025, { slideTo: 2200 }); this.noise(0.04, 0.03, { bandpass: 2400, q: 2 }); }
  splash(): void { this.noise(0.25, 0.06, { lowpass: 1600, attack: 0.02 }); }
  hit(): void { this.noise(0.07, 0.08, { bandpass: 1400, q: 1.5 }); this.tone(90, 'sine', 0.12, 0.08, { slideTo: 50 }); }
  clank(): void { this.tone(900, 'square', 0.08, 0.03, { slideTo: 700 }); this.tone(1340, 'sine', 0.2, 0.03); this.noise(0.04, 0.04, { highpass: 2000 }); }
  whoosh(): void { this.noise(0.18, 0.05, { bandpass: 900, q: 0.8, attack: 0.06 }); }
  fireball(): void { this.noise(0.4, 0.07, { lowpass: 2400, attack: 0.12 }); this.tone(140, 'sawtooth', 0.35, 0.03, { slideTo: 60, lowpass: 600 }); }
  frost(): void { for (let i = 0; i < 4; i++) this.tone(1800 + i * 300, 'sine', 0.3, 0.03, { delay: i * 0.05, release: 0.25 }); this.noise(0.3, 0.02, { highpass: 4000 }); }
  holy(): void { for (const [i, f] of [523, 659, 784, 1047].entries()) this.tone(f, 'sine', 0.9, 0.035, { attack: 0.08, delay: i * 0.04, release: 0.7 }); }
  taunt(): void { this.tone(170, 'sawtooth', 0.18, 0.04, { slideTo: 220, lowpass: 1200 }); }
  rise(): void { for (const [i, f] of [392, 523, 659, 784].entries()) this.tone(f, 'triangle', 0.25, 0.04, { delay: i * 0.07 }); }
  levelUp(): void { for (const [i, f] of [660, 880, 1320].entries()) this.tone(f, 'triangle', 0.14, 0.035, { delay: i * 0.08 }); }
  coins(n = 4): void { for (let i = 0; i < n; i++) this.tone(2400 + Math.random() * 900, 'sine', 0.12, 0.03, { delay: i * 0.06 + Math.random() * 0.03, release: 0.1 }); }
  chest(): void { this.tone(523, 'triangle', 0.15, 0.04); this.tone(784, 'triangle', 0.4, 0.04, { delay: 0.14 }); this.coins(6); }
  slain(): void { this.tone(420, 'sawtooth', 0.3, 0.025, { slideTo: 110, lowpass: 1500 }); this.noise(0.15, 0.03, { lowpass: 800 }); }
  roar(deep = false): void {
    const f = deep ? 48 : 70;
    this.tone(f, 'sawtooth', 1.3, 0.09, { attack: 0.08, slideTo: f * 0.6, lowpass: 500 });
    this.tone(f * 1.5, 'square', 1.1, 0.03, { attack: 0.1, slideTo: f, lowpass: 400 });
    this.noise(1.2, 0.07, { lowpass: 300, attack: 0.1 });
  }
  thunder(): void { const d = 0.3 + Math.random() * 1.2; this.noise(2.4, 0.3, { lowpass: 140, attack: 0.08, delay: d }); this.noise(1, 0.12, { lowpass: 600, attack: 0.02, delay: d }); }
  fanfare(): void {
    const seq = [523, 659, 784, 1047];
    seq.forEach((f, i) => this.tone(f, 'triangle', 0.18, 0.06, { delay: i * 0.13 }));
    for (const f of [523, 659, 784, 1047]) this.tone(f, 'triangle', 1.2, 0.04, { delay: 0.55, release: 1 });
  }
  jingle(): void { for (const [i, f] of [1047, 1319, 1568, 2093].entries()) this.bell(0.05, f / 2, i * 0.12); }
  alarm(): void { for (let i = 0; i < 5; i++) this.bell(0.08, 700, i * 0.22); }
  weddingBells(): void { for (let i = 0; i < 6; i++) this.bell(0.07, i % 2 ? 660 : 520, i * 0.3); }
  lament(): void { for (const [i, f] of [392, 349, 311, 262].entries()) this.tone(f, 'sine', 0.9, 0.045, { attack: 0.1, delay: i * 0.5, release: 0.7 }); }
  chime(): void { for (const [i, f] of [1047, 1319, 1568].entries()) this.tone(f, 'sine', 0.5, 0.03, { delay: i * 0.1, release: 0.4 }); }
  rocket(): void { this.noise(0.5, 0.03, { bandpass: 1500, q: 2, attack: 0.05 }); }
  burst(): void { this.noise(0.5, 0.08, { lowpass: 900, attack: 0.005 }); }
  /** One note of the tavern tune, plus a soft drone underneath. */
  tuneNote(freq: number, dur: number): void { this.tone(freq, 'triangle', dur, 0.028, { attack: 0.02, release: dur * 0.5, lowpass: 2500 }); this.tone(freq / 2, 'sine', dur, 0.012, { attack: 0.03 }); }
}
