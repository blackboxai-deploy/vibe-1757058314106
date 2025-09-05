export interface AudioSettings {
  bitrate: number; // 64-328 kbps
  enableSubtitles: boolean;
  enableTranslation: boolean;
  sourceLanguage: string;
  targetLanguage: string;
  enableNoiseReduction: boolean;
  enableEchoCancellation: boolean;
  enableAutoGainControl: boolean;
}

export interface SpeechToTextConfig {
  language: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  confidence: number;
}

export interface TranslationConfig {
  sourceLanguage: string;
  targetLanguage: string;
  autoDetect: boolean;
  enableCache: boolean;
}

export interface Subtitle {
  id: string;
  text: string;
  language: string;
  startTime: number;
  endTime: number;
  confidence: number;
  speakerId?: string;
  translation?: string;
}

export interface AudioQualityMetrics {
  bitrate: number;
  sampleRate: number;
  channels: number;
  latency: number;
  packetLoss: number;
  jitter: number;
}

export interface SpeechRecognitionResult {
  text: string;
  confidence: number;
  isFinal: boolean;
  alternatives: Array<{
    text: string;
    confidence: number;
  }>;
}

export interface Translation {
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number;
}

export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
  supportsSpeechToText: boolean;
  supportsTranslation: boolean;
}