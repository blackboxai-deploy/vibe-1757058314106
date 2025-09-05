import SimplePeer from 'simple-peer';
import { QualityManager } from './quality-manager';
import { AudioProcessor } from './audio-processor';
import { VideoQuality } from '@/types/room';
import { AudioSettings } from '@/types/audio';

export interface WebRTCConfig {
  stunServers: string[];
  turnServers?: RTCIceServer[];
  maxPeers: number;
}

export interface PeerConnection {
  id: string;
  peer: SimplePeer.Instance;
  stream?: MediaStream;
  isHost: boolean;
  quality: VideoQuality;
}

export class WebRTCManager {
  private peers: Map<string, PeerConnection> = new Map();
  private localStream: MediaStream | null = null;
  private qualityManager: QualityManager;
  private audioProcessor: AudioProcessor;
  private config: WebRTCConfig;
  private isInitialized: boolean = false;

  constructor(config: WebRTCConfig, audioSettings: AudioSettings) {
    this.config = config;
    this.qualityManager = new QualityManager();
    this.audioProcessor = new AudioProcessor(audioSettings);
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.setupLocalStream();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize WebRTC:', error);
      throw error;
    }
  }

  private async setupLocalStream(): Promise<void> {
    try {
      const constraints = this.qualityManager.getConstraints();
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      this.onLocalStreamReady(this.localStream);
    } catch (error) {
      console.error('Failed to get user media:', error);
      // Try audio-only fallback
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        this.qualityManager.setQuality('audio-only');
        this.onLocalStreamReady(this.localStream);
      } catch (fallbackError) {
        console.error('Failed to get audio-only stream:', fallbackError);
        throw fallbackError;
      }
    }
  }

  public createPeer(peerId: string, isInitiator: boolean): void {
    if (this.peers.has(peerId)) {
      this.removePeer(peerId);
    }

    const peer = new SimplePeer({
      initiator: isInitiator,
      trickle: false,
      config: {
        iceServers: [
          ...this.config.stunServers.map(url => ({ urls: url })),
          ...(this.config.turnServers || [])
        ]
      },
      stream: this.localStream || undefined
    });

    const connection: PeerConnection = {
      id: peerId,
      peer,
      isHost: isInitiator,
      quality: this.qualityManager.getCurrentTier().name
    };

    this.setupPeerEventHandlers(connection);
    this.peers.set(peerId, connection);
  }

  private setupPeerEventHandlers(connection: PeerConnection): void {
    const { peer, id } = connection;

    peer.on('signal', (data) => {
      this.onSignal(id, data);
    });

    peer.on('connect', () => {
      this.onPeerConnected(id);
      this.startConnectionMonitoring(id);
    });

    peer.on('data', (data) => {
      this.onDataReceived(id, data);
    });

    peer.on('stream', (stream) => {
      connection.stream = stream;
      this.onRemoteStream(id, stream);
    });

    peer.on('error', (error) => {
      console.error(`Peer ${id} error:`, error);
      this.onPeerError(id, error);
    });

    peer.on('close', () => {
      this.removePeer(id);
      this.onPeerDisconnected(id);
    });
  }

  public handleSignal(peerId: string, signalData: any): void {
    const connection = this.peers.get(peerId);
    if (connection) {
      connection.peer.signal(signalData);
    }
  }

  public sendMessage(peerId: string, message: any): void {
    const connection = this.peers.get(peerId);
    if (connection && connection.peer.connected) {
      connection.peer.send(JSON.stringify(message));
    }
  }

  public broadcastMessage(message: any): void {
    this.peers.forEach(connection => {
      if (connection.peer.connected) {
        connection.peer.send(JSON.stringify(message));
      }
    });
  }

  public async adjustQuality(bandwidth: number): Promise<void> {
    this.qualityManager.updateBandwidth(bandwidth);
    
    const newTier = this.qualityManager.getCurrentTier();
    
    // If quality changed, update local stream
    if (this.localStream) {
      const videoTracks = this.localStream.getVideoTracks();
      
      if (newTier.name === 'audio-only') {
        // Stop video tracks
        videoTracks.forEach(track => {
          track.stop();
          this.localStream?.removeTrack(track);
        });
      } else if (videoTracks.length === 0 && newTier.name !== 'audio-only') {
        // Re-add video if switching from audio-only
        await this.restartVideoStream();
      } else {
        // Adjust video constraints
        await this.applyVideoConstraints(newTier);
      }
    }
  }

  private async restartVideoStream(): Promise<void> {
    try {
      const constraints = this.qualityManager.getConstraints();
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      const videoTrack = newStream.getVideoTracks()[0];
      if (videoTrack) {
        this.localStream?.addTrack(videoTrack);
        
        // Update all peer connections with new video track
        this.peers.forEach(connection => {
          if (connection.peer.connected) {
            connection.peer.replaceTrack(
              this.localStream?.getVideoTracks()[0] || videoTrack,
              videoTrack,
              this.localStream!
            );
          }
        });
      }
    } catch (error) {
      console.error('Failed to restart video stream:', error);
    }
  }

  private async applyVideoConstraints(tier: any): Promise<void> {
    if (!this.localStream) return;

    const videoTracks = this.localStream.getVideoTracks();
    if (videoTracks.length === 0) return;

    const videoTrack = videoTracks[0];
    const constraints = {
      width: tier.resolution.width,
      height: tier.resolution.height,
      frameRate: tier.frameRate
    };

    try {
      await videoTrack.applyConstraints(constraints);
    } catch (error) {
      console.error('Failed to apply video constraints:', error);
    }
  }

  public async enableUltraLowBandwidthMode(): Promise<void> {
    const constraints = this.qualityManager.getUltraLowBandwidthConstraints();
    
    try {
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Replace existing stream
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
      }
      
      this.localStream = newStream;
      this.qualityManager.setQuality('144p');
      
      // Update all peer connections
      this.peers.forEach(connection => {
        if (connection.peer.connected) {
          connection.peer.streams = [newStream];
        }
      });
      
      this.audioProcessor.enableUltraLowBandwidthMode();
      this.onLocalStreamReady(newStream);
      
    } catch (error) {
      console.error('Failed to enable ultra-low bandwidth mode:', error);
    }
  }

  private startConnectionMonitoring(peerId: string): void {
    const connection = this.peers.get(peerId);
    if (!connection) return;

    const interval = setInterval(async () => {
      if (!connection.peer.connected) {
        clearInterval(interval);
        return;
      }

      try {
        const stats = await this.getConnectionStats(connection.peer);
        this.onConnectionStatsUpdate(peerId, stats);
      } catch (error) {
        console.error('Failed to get connection stats:', error);
      }
    }, 5000); // Check every 5 seconds
  }

  private async getConnectionStats(_peer: SimplePeer.Instance): Promise<any> {
    // This is a simplified stats implementation
    // In a real application, you'd use getStats() API
    return {
      bytesReceived: 0,
      bytesSent: 0,
      packetsLost: 0,
      jitter: 0,
      rtt: 0
    };
  }

  public removePeer(peerId: string): void {
    const connection = this.peers.get(peerId);
    if (connection) {
      connection.peer.destroy();
      this.peers.delete(peerId);
    }
  }

  public getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  public getCurrentQuality(): VideoQuality {
    return this.qualityManager.getCurrentTier().name;
  }

  public startSubtitles(): void {
    this.audioProcessor.startSpeechToText();
  }

  public stopSubtitles(): void {
    this.audioProcessor.stopSpeechToText();
  }

  public dispose(): void {
    this.peers.forEach(connection => {
      connection.peer.destroy();
    });
    this.peers.clear();

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }

    this.audioProcessor.dispose();
  }

  // Event handlers (to be overridden)
  protected onSignal(peerId: string, signalData: any): void {
    console.log('Signal from peer:', peerId, signalData);
  }

  protected onLocalStreamReady(_stream: MediaStream): void {
    console.log('Local stream ready');
  }

  protected onRemoteStream(peerId: string, _stream: MediaStream): void {
    console.log('Remote stream from peer:', peerId);
  }

  protected onPeerConnected(peerId: string): void {
    console.log('Peer connected:', peerId);
  }

  protected onPeerDisconnected(peerId: string): void {
    console.log('Peer disconnected:', peerId);
  }

  protected onPeerError(peerId: string, error: Error): void {
    console.error('Peer error:', peerId, error);
  }

  protected onDataReceived(peerId: string, data: any): void {
    console.log('Data received from peer:', peerId, data);
  }

  protected onConnectionStatsUpdate(peerId: string, stats: any): void {
    console.log('Connection stats updated for peer:', peerId, stats);
  }
}