import { Howl } from 'howler';

/**
 * Cinematic Sound System for Tactical Operations
 */
class SoundService {
  private sounds: Record<string, Howl> = {};

  constructor() {
    this.init();
  }

  private init() {
    // These are high-quality, professional assets from public/mixkit sources
    this.sounds = {
      intro_epic: new Howl({
        src: ['/sounds/admin-intro.mp3', 'https://assets.mixkit.co/active_storage/sfx/2645/2645-preview.mp3'], // Tactical hum/whoosh
        volume: 0.6
      }),
      intro_super: new Howl({
        src: ['/sounds/superadmin-intro.mp3', 'https://assets.mixkit.co/active_storage/sfx/2048/2048-preview.mp3'], // Deep cinematic hit
        volume: 0.8
      }),
      system_online: new Howl({
        src: ['/sounds/system-online.mp3', 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'], // Digital startup
        volume: 0.5
      }),
      sos_alert: new Howl({
        src: ['/sounds/sos-confirmed.mp3', 'https://assets.mixkit.co/active_storage/sfx/2004/2004-preview.mp3'], // High priority ping
        volume: 0.5
      }),
      success: new Howl({
        src: ['https://assets.mixkit.co/active_storage/sfx/1110/1110-preview.mp3'], // Interface success
        volume: 0.4
      }),
      voice_beep: new Howl({
        src: ['https://assets.mixkit.co/active_storage/sfx/2658/2658-preview.mp3'], // Listening start
        volume: 0.3
      })
    };
  }

  public play(name: keyof typeof this.sounds) {
    if (this.sounds[name]) {
      this.sounds[name].play();
    }
  }

  public stopAll() {
    Object.values(this.sounds).forEach(s => s.stop());
  }
}

export const soundService = new SoundService();
