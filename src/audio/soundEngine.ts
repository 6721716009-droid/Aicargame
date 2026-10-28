// Procedural Web Audio Synthesizer for Realistic Automotive Garage SFX (Zero External Audio Files)

class MechanicSoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private engineTimer: number | null = null;

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(mute: boolean) {
    this.muted = mute;
    if (mute) {
      this.stopEngineLoop();
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  // Crisp metallic pawl clicks of a reversible socket ratchet
  public playRatchetClick() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const offsets = [0, 0.055, 0.11, 0.17];
    offsets.forEach((offset, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1650 + idx * 120, now + offset);
      osc.frequency.exponentialRampToValueAtTime(420, now + offset + 0.035);
      gain.gain.setValueAtTime(0.18, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.038);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.04);
    });
  }

  // Pneumatic Air Impact Wrench (rapid hammer impacts + compressed air exhaust hiss)
  public playImpactWrench() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 5 hammer blows
    for (let i = 0; i < 5; i++) {
      const t = now + i * 0.042;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(290, t);
      osc.frequency.exponentialRampToValueAtTime(75, t + 0.032);
      gain.gain.setValueAtTime(0.24, t);
      gain.gain.exponentialRampToValueAtTime(0.002, t + 0.036);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.038);
    }

    // Air release hiss
    const bufferSize = Math.floor(ctx.sampleRate * 0.18);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 3200;
    const hissGain = ctx.createGain();
    hissGain.gain.setValueAtTime(0.12, now + 0.18);
    hissGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    noise.connect(filter);
    filter.connect(hissGain);
    hissGain.connect(ctx.destination);
    noise.start(now + 0.18);
  }

  // Digital Torque Wrench progressive tick or target spec double-beep
  public playTorqueBeep(reachedTarget: boolean) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (reachedTarget) {
      [0, 0.11].forEach((offset, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(i === 0 ? 2200 : 2850, now + offset);
        gain.gain.setValueAtTime(0.22, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.09);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.095);
      });
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1350, now);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.035);
    }
  }

  // Mechanical part clunk / snap
  public playPartClunk(heavy = false) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(heavy ? 140 : 260, now);
    osc.frequency.exponentialRampToValueAtTime(heavy ? 42 : 85, now + 0.11);
    gain.gain.setValueAtTime(heavy ? 0.28 : 0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  // Hydraulic lift hum
  public playLiftMotor() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(108, now);
    osc.frequency.linearRampToValueAtTime(118, now + 0.35);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 340;
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.44);
  }

  // Oil glug / pouring sound
  public playFluidPour() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const t = now + i * 0.09;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320 + i * 45, t);
      osc.frequency.exponentialRampToValueAtTime(520, t + 0.07);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.075);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.08);
    }
  }

  // OBD-II / Multimeter electronic chime
  public playDiagnosticChime(isFault = false) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = isFault ? 'sawtooth' : 'sine';
    osc.frequency.setValueAtTime(isFault ? 420 : 1680, now);
    if (!isFault) {
      osc.frequency.setValueAtTime(2120, now + 0.06);
    }
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  // Continuous 4-cylinder engine idle (smooth or misfiring)
  public startEngineLoop(isHealthy: boolean) {
    this.stopEngineLoop();
    const ctx = this.ensureContext();
    if (!ctx) return;

    // Initial starter crank
    const now = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(95 + i * 18, now + i * 0.11);
      g.gain.setValueAtTime(0.14, now + i * 0.11);
      g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.11 + 0.09);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now + i * 0.11);
      osc.stop(now + i * 0.11 + 0.095);
    }

    let beat = 0;
    this.engineTimer = window.setInterval(() => {
      if (this.muted || !this.ctx) return;
      const t = this.ctx.currentTime;
      beat = (beat + 1) % 4;
      const skipFire = !isHealthy && (beat === 1 || beat === 3);

      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(skipFire ? 42 : 68, t);
      filter.type = 'lowpass';
      filter.frequency.value = skipFire ? 150 : 240;

      gain.gain.setValueAtTime(skipFire ? 0.03 : 0.085, t);
      gain.gain.exponentialRampToValueAtTime(0.015, t + 0.085);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.09);
    }, isHealthy ? 78 : 105);
  }

  public stopEngineLoop() {
    if (this.engineTimer !== null) {
      window.clearInterval(this.engineTimer);
      this.engineTimer = null;
    }
  }
}

export const soundEngine = new MechanicSoundEngine();
