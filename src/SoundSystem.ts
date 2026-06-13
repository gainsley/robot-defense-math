type SoundName =
  | 'rail'
  | 'machine'
  | 'missile'
  | 'lightning'
  | 'drone'
  | 'alien'
  | 'hit'
  | 'explosion'
  | 'correct'
  | 'wrong'
  | 'frenzy'
  | 'upgrade'
  | 'boss'
  | 'stage';

export class SoundSystem {
  private readonly outputBoost = 5.5;
  private context?: AudioContext;
  private masterGain?: GainNode;
  private volume = 1;
  private readonly lastPlayed = new Map<SoundName, number>();

  public constructor() {
    window.addEventListener('pointerdown', () => this.unlock(), { once: true });
    window.addEventListener('keydown', () => this.unlock(), { once: true });
  }

  public unlock(): void {
    const context = this.getContext();
    if (context.state === 'suspended') {
      void context.resume();
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    const context = this.getContext();
    this.getOutput().gain.setTargetAtTime(this.volume * this.outputBoost, context.currentTime, 0.015);
  }

  public weapon(kind: string): void {
    if (kind === 'railGun') {
      this.sweep('rail', 220, 95, 95, 'triangle', 0.075, 0.08);
      this.tone('rail', 130, 70, 'sine', 0.05, 0.08);
    } else if (kind === 'machineGun') {
      this.tone('machine', 360 + Math.random() * 80, 45, 'square', 0.04, 0.05);
    } else if (kind === 'missileLauncher') {
      this.sweep('missile', 190, 80, 150, 'sawtooth', 0.06, 0.1);
    } else if (kind === 'lightningGun') {
      this.noise('lightning', 100, 900, 0.055, 0.08);
      this.tone('lightning', 1180, 80, 'triangle', 0.025, 0.05);
    } else if (kind === 'droneLauncher') {
      this.tone('drone', 520, 70, 'triangle', 0.025, 0.06);
    }
  }

  public alienShot(): void {
    this.sweep('alien', 520, 250, 90, 'triangle', 0.04, 0.07);
  }

  public hit(): void {
    this.tone('hit', 170, 55, 'square', 0.045, 0.05);
  }

  public explosion(big = false): void {
    this.noise('explosion', big ? 360 : 190, big ? 700 : 450, big ? 0.12 : 0.075, 0.08);
    this.sweep('explosion', big ? 130 : 180, 45, big ? 260 : 150, 'sawtooth', big ? 0.08 : 0.045, 0.08);
  }

  public correct(): void {
    this.tone('correct', 520, 75, 'triangle', 0.04, 0.08);
    window.setTimeout(() => this.tone('correct', 780, 95, 'triangle', 0.04, 0.08), 70);
  }

  public wrong(): void {
    this.sweep('wrong', 210, 90, 180, 'sawtooth', 0.05, 0.09);
  }

  public frenzy(): void {
    this.sweep('frenzy', 260, 980, 420, 'sawtooth', 0.06, 0.08);
  }

  public upgrade(): void {
    this.tone('upgrade', 440, 80, 'triangle', 0.04, 0.08);
    window.setTimeout(() => this.tone('upgrade', 660, 80, 'triangle', 0.04, 0.08), 80);
    window.setTimeout(() => this.tone('upgrade', 990, 130, 'triangle', 0.04, 0.08), 160);
  }

  public boss(): void {
    this.sweep('boss', 90, 55, 520, 'sawtooth', 0.1, 0.1);
  }

  public stage(): void {
    this.tone('stage', 330, 90, 'square', 0.035, 0.08);
    window.setTimeout(() => this.tone('stage', 495, 90, 'square', 0.035, 0.08), 90);
    window.setTimeout(() => this.tone('stage', 660, 120, 'square', 0.035, 0.08), 180);
  }

  private getContext(): AudioContext {
    this.context ??= new AudioContext();
    return this.context;
  }

  private getOutput(): GainNode {
    const context = this.getContext();
    if (!this.masterGain) {
      this.masterGain = context.createGain();
      this.masterGain.gain.value = this.volume * this.outputBoost;
      this.masterGain.connect(context.destination);
    }
    return this.masterGain;
  }

  private canPlay(name: SoundName, cooldownMs: number): boolean {
    const now = performance.now();
    if (now - (this.lastPlayed.get(name) ?? 0) < cooldownMs) {
      return false;
    }
    this.lastPlayed.set(name, now);
    return true;
  }

  private tone(
    name: SoundName,
    frequency: number,
    durationMs: number,
    type: OscillatorType,
    gainValue: number,
    cooldownMs: number,
  ): void {
    if (!this.canPlay(name, cooldownMs)) {
      return;
    }

    const context = this.getContext();
    const start = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(gainValue, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + durationMs / 1000);
    oscillator.connect(gain).connect(this.getOutput());
    oscillator.start(start);
    oscillator.stop(start + durationMs / 1000);
  }

  private sweep(
    name: SoundName,
    startFrequency: number,
    endFrequency: number,
    durationMs: number,
    type: OscillatorType,
    gainValue: number,
    cooldownMs: number,
  ): void {
    if (!this.canPlay(name, cooldownMs)) {
      return;
    }

    const context = this.getContext();
    const start = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(startFrequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + durationMs / 1000);
    gain.gain.setValueAtTime(gainValue, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + durationMs / 1000);
    oscillator.connect(gain).connect(this.getOutput());
    oscillator.start(start);
    oscillator.stop(start + durationMs / 1000);
  }

  private noise(name: SoundName, durationMs: number, filterFrequency: number, gainValue: number, cooldownMs: number): void {
    if (!this.canPlay(name, cooldownMs)) {
      return;
    }

    const context = this.getContext();
    const sampleCount = Math.max(1, Math.floor(context.sampleRate * (durationMs / 1000)));
    const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < sampleCount; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / sampleCount);
    }

    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    const start = context.currentTime;

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFrequency, start);
    gain.gain.setValueAtTime(gainValue, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + durationMs / 1000);
    source.buffer = buffer;
    source.connect(filter).connect(gain).connect(this.getOutput());
    source.start(start);
  }
}
