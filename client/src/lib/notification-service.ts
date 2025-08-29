class NotificationService {
  private audioContext: AudioContext | null = null;
  private notificationSound: HTMLAudioElement | null = null;

  constructor() {
    // Initialize audio context
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn('Web Audio API not supported');
    }

    // Create notification sound
    this.createNotificationSound();
  }

  private createNotificationSound() {
    // Create a simple notification tone using Web Audio API
    if (this.audioContext) {
      this.createWebAudioTone();
    } else {
      // Fallback to HTML5 audio with data URL
      this.createFallbackSound();
    }
  }

  private createWebAudioTone() {
    // This will be called when we want to play the sound
  }

  private createFallbackSound() {
    // Create a simple beep sound using data URL
    const audioData = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhCzeV2fPNdSgEJXfH8N2QQAoUXrTp66hVFApGn+DyvmwhCzeV2fPNdSgEJXfH8N2QQAoUXrTp66hVFApGn+DyvmwhCzeV2fPNdSgEJXfH8N2QQAoUXrTp66hVFApGn+DyvmwhCzeV2fPNdSgEJXfH8N2QQAoUXrTp66hVFApGn+DyvmwhCzeV2fPNdSgEJXfH8N2QQAoUXrTp66hVFApGn+DyvmwhCzeV2fPNdSgEJXfH8N2QQAoUXrTp66hVFApGn+DyvmwhCzeV2fPNdSgEJXfH8N2QQAoUXrTp66hVFApGn+DyvmwhCzeV2fPNdSgEJXfH8N2QQAoUXrTp66hVFApGn+DyvmwhCzeV2fPNdSgEJXfH8N2QQAoUXrTp66hVFApGn+DyvmwhCzeV2fPNdSgEJXfH8N2QQAoUXrTp66hVFApGn+DyvmwhCzeV2fPNdSgEJXfH8N2QQAoUXrTp66hVFApGn+DyvmwhCzeV2fPNdSgEJXfH8N2QQAoUXrTp66hVFApGn+DyvmwhCzeV2fPNdSgE';
    
    this.notificationSound = new Audio(audioData);
    this.notificationSound.volume = 0.3;
  }

  public async playNotificationSound(repeat: number = 3) {
    try {
      // Resume audio context if suspended (required for user interaction)
      if (this.audioContext && this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Use Web Audio API for better sound
      if (this.audioContext) {
        this.playWebAudioNotification(repeat);
      } else if (this.notificationSound) {
        // Fallback to HTML5 audio
        this.playFallbackNotification(repeat);
      }
    } catch (error) {
      console.warn('Failed to play notification sound:', error);
    }
  }

  private playWebAudioNotification(repeat: number) {
    for (let i = 0; i < repeat; i++) {
      setTimeout(() => {
        this.createAndPlayTone(800, 0.1); // 800Hz tone for 100ms
        setTimeout(() => {
          this.createAndPlayTone(1000, 0.1); // 1000Hz tone for 100ms
        }, 150);
      }, i * 600); // Repeat every 600ms
    }
  }

  private createAndPlayTone(frequency: number, duration: number) {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  private playFallbackNotification(repeat: number) {
    let count = 0;
    const playSound = () => {
      if (count < repeat && this.notificationSound) {
        this.notificationSound.currentTime = 0;
        this.notificationSound.play().catch(() => {
          // Ignore play errors
        });
        count++;
        setTimeout(playSound, 600);
      }
    };
    playSound();
  }

  public async requestNotificationPermission(): Promise<boolean> {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  public showBrowserNotification(title: string, options?: NotificationOptions) {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'plumber-call',
        requireInteraction: true,
        ...options,
      });

      // Auto close after 10 seconds
      setTimeout(() => {
        notification.close();
      }, 10000);

      return notification;
    }
    return null;
  }

  public async showCallNotification(customerName: string, issue: string) {
    // Play sound notification
    await this.playNotificationSound(3);

    // Show browser notification
    const notification = this.showBrowserNotification(
      '🔧 New Plumbing Call!',
      {
        body: `${customerName} needs help: ${issue}`,
        icon: '/favicon.ico',
        tag: 'incoming-call',
        requireInteraction: true,
      }
    );

    return notification;
  }
}

export const notificationService = new NotificationService();