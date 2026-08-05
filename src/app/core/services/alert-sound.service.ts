import { Injectable } from '@angular/core';

/**
 * Short notification chimes via Web Audio API (no asset files required).
 * Browsers may block until the user has interacted with the page once.
 */
@Injectable({ providedIn: 'root' })
export class AlertSoundService {
  private ctx: AudioContext | null = null;
  private unlocked = false;
  private lastPlayAt = 0;

  /** Call once from a user gesture so later alerts can play without gesture. */
  unlock(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
    this.unlocked = true;
  }

  playMessage(): void {
    this.playChime([880, 1175], 0.08);
  }

  playEmail(): void {
    this.playChime([660, 880, 990], 0.07);
  }

  private playChime(freqs: number[], gainPeak: number): void {
    const now = Date.now();
    if (now - this.lastPlayAt < 700) return;
    this.lastPlayAt = now;

    const ctx = this.ensureContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      void ctx.resume().then(() => this.unlocked && this.runChime(ctx, freqs, gainPeak));
      return;
    }
    this.runChime(ctx, freqs, gainPeak);
  }

  private runChime(ctx: AudioContext, freqs: number[], gainPeak: number): void {
    const t0 = ctx.currentTime + 0.01;
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = t0 + i * 0.09;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(gainPeak, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.25);
    });
  }

  private ensureContext(): AudioContext | null {
    try {
      if (!this.ctx) {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) return null;
        this.ctx = new Ctx();
      }
      return this.ctx;
    } catch {
      return null;
    }
  }
}
