import { QualityTier, VideoQuality } from '@/types/room';

export const QUALITY_TIERS: QualityTier[] = [
  {
    name: '1080p',
    resolution: { width: 1920, height: 1080 },
    frameRate: 30,
    videoBitrate: 2000,
    audioBitrate: 328,
    totalBandwidth: 2328
  },
  {
    name: '720p',
    resolution: { width: 1280, height: 720 },
    frameRate: 30,
    videoBitrate: 1200,
    audioBitrate: 256,
    totalBandwidth: 1456
  },
  {
    name: '480p',
    resolution: { width: 854, height: 480 },
    frameRate: 25,
    videoBitrate: 800,
    audioBitrate: 192,
    totalBandwidth: 992
  },
  {
    name: '240p',
    resolution: { width: 426, height: 240 },
    frameRate: 20,
    videoBitrate: 400,
    audioBitrate: 128,
    totalBandwidth: 528
  },
  {
    name: '144p',
    resolution: { width: 256, height: 144 },
    frameRate: 15,
    videoBitrate: 150,
    audioBitrate: 96,
    totalBandwidth: 246
  },
  {
    name: 'audio-only',
    resolution: { width: 0, height: 0 },
    frameRate: 0,
    videoBitrate: 0,
    audioBitrate: 64,
    totalBandwidth: 64
  }
];

export class QualityManager {
  private currentTier: QualityTier;
  private bandwidthHistory: number[] = [];
  private stabilizationTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(initialQuality: VideoQuality = '720p') {
    this.currentTier = QUALITY_TIERS.find(tier => tier.name === initialQuality) || QUALITY_TIERS[1];
  }

  public updateBandwidth(bandwidth: number): void {
    this.bandwidthHistory.push(bandwidth);
    if (this.bandwidthHistory.length > 10) {
      this.bandwidthHistory.shift();
    }

    // Clear existing timer
    if (this.stabilizationTimer) {
      clearTimeout(this.stabilizationTimer);
    }

    // Wait for stabilization before adjusting quality
    this.stabilizationTimer = setTimeout(() => {
      this.adjustQuality();
    }, 2000);
  }

  private adjustQuality(): void {
    const averageBandwidth = this.getAverageBandwidth();
    const recommendedTier = this.getRecommendedTier(averageBandwidth);

    if (recommendedTier.name !== this.currentTier.name) {
      this.currentTier = recommendedTier;
      this.onQualityChange(this.currentTier);
    }
  }

  private getAverageBandwidth(): number {
    if (this.bandwidthHistory.length === 0) return 0;
    return this.bandwidthHistory.reduce((sum, bw) => sum + bw, 0) / this.bandwidthHistory.length;
  }

  private getRecommendedTier(bandwidth: number): QualityTier {
    // Add buffer (20%) to prevent constant switching
    const bufferedBandwidth = bandwidth * 0.8;

    for (const tier of QUALITY_TIERS) {
      if (bufferedBandwidth >= tier.totalBandwidth) {
        return tier;
      }
    }

    // Fallback to audio-only for very poor connections
    return QUALITY_TIERS[QUALITY_TIERS.length - 1];
  }

  public getCurrentTier(): QualityTier {
    return this.currentTier;
  }

  public setQuality(quality: VideoQuality): void {
    const tier = QUALITY_TIERS.find(t => t.name === quality);
    if (tier) {
      this.currentTier = tier;
      this.onQualityChange(this.currentTier);
    }
  }

  public getConstraints(): MediaStreamConstraints {
    const tier = this.currentTier;
    
    if (tier.name === 'audio-only') {
      return { video: false, audio: true };
    }

    return {
      video: {
        width: { ideal: tier.resolution.width },
        height: { ideal: tier.resolution.height },
        frameRate: { ideal: tier.frameRate }
      },
      audio: true
    };
  }

  public getUltraLowBandwidthConstraints(): MediaStreamConstraints {
    return {
      video: {
        width: { ideal: 256 },
        height: { ideal: 144 },
        frameRate: { ideal: 10, max: 15 },
        facingMode: 'user'
      },
      audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    };
  }

  // Event handler for quality changes (to be overridden)
  protected onQualityChange(tier: QualityTier): void {
    console.log('Quality changed to:', tier.name);
  }

  public isUltraLowBandwidthMode(): boolean {
    return this.currentTier.name === '144p';
  }

  public canUpgrade(bandwidth: number): boolean {
    const currentIndex = QUALITY_TIERS.findIndex(t => t.name === this.currentTier.name);
    if (currentIndex <= 0) return false;
    
    const nextTier = QUALITY_TIERS[currentIndex - 1];
    return bandwidth * 1.2 >= nextTier.totalBandwidth; // 20% headroom
  }

  public shouldDowngrade(bandwidth: number): boolean {
    return bandwidth * 0.8 < this.currentTier.totalBandwidth;
  }
}