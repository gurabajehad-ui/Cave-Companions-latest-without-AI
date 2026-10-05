/**
 * Audio Notification Service for Cave Companions
 * Synthesizes harmonic adhan and gentle reminder chimes using Web Audio API.
 * 100% offline capable, zero external MP3 dependencies, low latency and reliable across devices.
 */

export type SoundType = 'adhan_chime' | 'gentle_bell' | 'spiritual_tone';

class AudioNotificationService {
  private audioCtx: AudioContext | null = null;
  private isUnlocked = false;

  constructor() {
    // Attempt lazy init on first user interaction
    if (typeof window !== 'undefined') {
      const unlockAudio = () => {
        this.getAudioContext();
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
          this.audioCtx.resume();
        }
        this.isUnlocked = true;
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
      };

      window.addEventListener('click', unlockAudio, { once: true, passive: true });
      window.addEventListener('touchstart', unlockAudio, { once: true, passive: true });
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    return this.audioCtx;
  }

  /**
   * Play prayer alert sound
   */
  public async playPrayerAlert(soundType: SoundType = 'adhan_chime', volume: number = 0.8): Promise<boolean> {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return false;

      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      switch (soundType) {
        case 'adhan_chime':
          this.playAdhanHarmonicChime(ctx, volume);
          break;
        case 'gentle_bell':
          this.playGentleBell(ctx, volume);
          break;
        case 'spiritual_tone':
          this.playSpiritualTone(ctx, volume);
          break;
        default:
          this.playAdhanHarmonicChime(ctx, volume);
      }
      return true;
    } catch (err) {
      console.warn('[AudioNotificationService] Could not play sound:', err);
      return false;
    }
  }

  /**
   * Harmonic Adhan Chime: Inspired by peaceful spiritual adhan motifs (E4, G4, A4, B4, E5)
   */
  private playAdhanHarmonicChime(ctx: AudioContext, masterVolume: number) {
    const notes = [
      { freq: 329.63, time: 0, duration: 0.9 },     // E4
      { freq: 392.00, time: 0.8, duration: 0.9 },   // G4
      { freq: 440.00, time: 1.6, duration: 1.1 },   // A4
      { freq: 493.88, time: 2.6, duration: 1.0 },   // B4
      { freq: 659.25, time: 3.5, duration: 2.2 }    // E5 (sustained warm finish)
    ];

    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(masterVolume, now);
    masterGain.connect(ctx.destination);

    notes.forEach(note => {
      const startTime = now + note.time;
      const endTime = startTime + note.duration;

      // Primary tone (sine wave for pure clarity)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.freq, startTime);

      // Subtle harmonic overtone (triangle wave for warmth)
      const overtone = ctx.createOscillator();
      const overtoneGain = ctx.createGain();
      overtone.type = 'triangle';
      overtone.frequency.setValueAtTime(note.freq * 2, startTime);

      // Envelope: gentle attack and smooth exponential decay
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.4, startTime + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, endTime);

      overtoneGain.gain.setValueAtTime(0.001, startTime);
      overtoneGain.gain.linearRampToValueAtTime(0.12, startTime + 0.08);
      overtoneGain.gain.exponentialRampToValueAtTime(0.001, endTime);

      osc.connect(gain);
      gain.connect(masterGain);

      overtone.connect(overtoneGain);
      overtoneGain.connect(masterGain);

      osc.start(startTime);
      osc.stop(endTime);

      overtone.start(startTime);
      overtone.stop(endTime);
    });
  }

  /**
   * Gentle Bell: Soft double-strike chime
   */
  private playGentleBell(ctx: AudioContext, masterVolume: number) {
    const notes = [
      { freq: 523.25, time: 0, duration: 1.5 },   // C5
      { freq: 659.25, time: 0.5, duration: 2.0 }  // E5
    ];

    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(masterVolume, now);
    masterGain.connect(ctx.destination);

    notes.forEach(n => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(n.freq, now + n.time);

      gain.gain.setValueAtTime(0.001, now + n.time);
      gain.gain.linearRampToValueAtTime(0.5, now + n.time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + n.time + n.duration);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(now + n.time);
      osc.stop(now + n.time + n.duration);
    });
  }

  /**
   * Spiritual Tone: Rich resonant meditative chord
   */
  private playSpiritualTone(ctx: AudioContext, masterVolume: number) {
    const chord = [261.63, 329.63, 392.00, 523.25]; // C major chord
    const now = ctx.currentTime;
    const duration = 2.8;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(masterVolume, now);
    masterGain.connect(ctx.destination);

    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(now);
      osc.stop(now + duration);
    });
  }
}

export const audioNotificationService = new AudioNotificationService();
