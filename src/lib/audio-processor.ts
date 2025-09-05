import { AudioSettings, Subtitle } from '@/types/audio';

export class AudioProcessor {
  private recognition: any; // SpeechRecognition
  private audioContext: AudioContext | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private isListening: boolean = false;
  private subtitles: Subtitle[] = [];
  private audioSettings: AudioSettings;

  constructor(audioSettings: AudioSettings) {
    this.audioSettings = audioSettings;
    this.initializeSpeechRecognition();
  }

  private initializeSpeechRecognition(): void {
    if (typeof window === 'undefined') return;

    // Check for Speech Recognition support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.setupSpeechRecognition();
    } else {
      console.warn('Speech Recognition not supported in this browser');
    }
  }

  private setupSpeechRecognition(): void {
    if (!this.recognition) return;

    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = this.audioSettings.sourceLanguage || 'en-US';

    this.recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        
        if (result.isFinal) {
          this.processTranscript(transcript, result[0].confidence);
        }
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
    };

    this.recognition.onend = () => {
      if (this.isListening) {
        // Restart recognition if it stops unexpectedly
        setTimeout(() => this.recognition.start(), 100);
      }
    };
  }

  public startSpeechToText(): void {
    if (!this.recognition || this.isListening) return;

    try {
      this.isListening = true;
      this.recognition.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      this.isListening = false;
    }
  }

  public stopSpeechToText(): void {
    if (!this.recognition || !this.isListening) return;

    this.isListening = false;
    this.recognition.stop();
  }

  private async processTranscript(text: string, confidence: number): Promise<void> {
    const subtitle: Subtitle = {
      id: Date.now().toString(),
      text,
      language: this.audioSettings.sourceLanguage,
      startTime: Date.now(),
      endTime: Date.now() + (text.length * 100), // Rough estimate
      confidence,
    };

    // Add translation if enabled
    if (this.audioSettings.enableTranslation) {
      try {
        const translation = await this.translateText(text, this.audioSettings.sourceLanguage, this.audioSettings.targetLanguage);
        subtitle.translation = translation;
      } catch (error) {
        console.error('Translation failed:', error);
      }
    }

    this.subtitles.push(subtitle);
    this.onSubtitleUpdate(subtitle);

    // Clean up old subtitles (keep last 50)
    if (this.subtitles.length > 50) {
      this.subtitles.splice(0, this.subtitles.length - 50);
    }
  }

  private async translateText(text: string, sourceLang: string, targetLang: string): Promise<string> {
    try {
      // Use the translation API
      const response = await fetch('/api/audio/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          sourceLang,
          targetLang
        }),
      });

      if (!response.ok) {
        throw new Error('Translation API failed');
      }

      const data = await response.json();
      return data.translation;
    } catch (error) {
      console.error('Translation error:', error);
      return text; // Return original text if translation fails
    }
  }

  public getAudioConstraints(): MediaTrackConstraints {
    return {
      sampleRate: this.getOptimalSampleRate(),
      channelCount: 1, // Mono for efficiency
      echoCancellation: this.audioSettings.enableEchoCancellation,
      noiseSuppression: this.audioSettings.enableNoiseReduction,
      autoGainControl: this.audioSettings.enableAutoGainControl,
    };
  }

  private getOptimalSampleRate(): number {
    // Choose sample rate based on bitrate
    if (this.audioSettings.bitrate <= 64) return 16000;
    if (this.audioSettings.bitrate <= 128) return 22050;
    if (this.audioSettings.bitrate <= 192) return 32000;
    return 44100; // High quality
  }

  public adjustBitrate(newBitrate: number): void {
    if (newBitrate < 64 || newBitrate > 328) {
      console.warn('Bitrate out of supported range (64-328 kbps)');
      return;
    }

    this.audioSettings.bitrate = newBitrate;
    this.onAudioSettingsChange(this.audioSettings);
  }

  public enableUltraLowBandwidthMode(): void {
    this.audioSettings = {
      ...this.audioSettings,
      bitrate: 64,
      enableNoiseReduction: true,
      enableEchoCancellation: true,
      enableAutoGainControl: true
    };
    
    this.onAudioSettingsChange(this.audioSettings);
  }

  public getSubtitles(): Subtitle[] {
    return [...this.subtitles];
  }

  public clearSubtitles(): void {
    this.subtitles = [];
  }

  public updateLanguages(sourceLanguage: string, targetLanguage: string): void {
    this.audioSettings.sourceLanguage = sourceLanguage;
    this.audioSettings.targetLanguage = targetLanguage;

    // Update speech recognition language
    if (this.recognition) {
      this.recognition.lang = sourceLanguage;
    }
  }

  // Event handlers (to be overridden)
  protected onSubtitleUpdate(subtitle: Subtitle): void {
    console.log('New subtitle:', subtitle.text);
  }

  protected onAudioSettingsChange(settings: AudioSettings): void {
    console.log('Audio settings changed:', settings);
  }

  public dispose(): void {
    this.stopSpeechToText();
    if (this.audioContext) {
      this.audioContext.close();
    }
    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
    }
  }
}