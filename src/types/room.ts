export interface Room {
  id: string;
  name: string;
  adminId: string;
  requiresApproval: boolean;
  scheduledTime?: Date;
  attendanceTracking: boolean;
  maxParticipants: number;
  qualitySettings: QualityConfig;
  audioSettings: AudioConfig;
  createdAt: Date;
  isActive: boolean;
}

export interface QualityConfig {
  enableAdaptiveQuality: boolean;
  maxResolution: VideoQuality;
  minResolution: VideoQuality;
  targetBitrate: number;
  enableUltraLowMode: boolean; // 144p mode
}

export interface AudioConfig {
  minBitrate: number; // 64kbps
  maxBitrate: number; // 328kbps
  enableNoiseReduction: boolean;
  enableEchoCancellation: boolean;
  enableSubtitles: boolean;
  enableTranslation: boolean;
  defaultLanguage: string;
}

export type VideoQuality = '1080p' | '720p' | '480p' | '240p' | '144p' | 'audio-only';

export interface QualityTier {
  name: VideoQuality;
  resolution: { width: number; height: number };
  frameRate: number;
  videoBitrate: number;
  audioBitrate: number;
  totalBandwidth: number;
}

export interface Participant {
  id: string;
  name: string;
  role: 'admin' | 'moderator' | 'participant';
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isScreenSharing: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
  currentQuality: VideoQuality;
  joinedAt: Date;
}

export interface JoinRequest {
  userId: string;
  userName: string;
  roomId: string;
  requestedAt: Date;
  status: 'pending' | 'approved' | 'denied';
  message?: string;
}