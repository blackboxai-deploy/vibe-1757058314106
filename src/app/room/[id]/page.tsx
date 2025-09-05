'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { WebRTCManager } from '@/lib/webrtc';
import { QualityManager, QUALITY_TIERS } from '@/lib/quality-manager';
import { AudioProcessor } from '@/lib/audio-processor';
import { VideoQuality, Participant } from '@/types/room';
import { Subtitle, AudioSettings } from '@/types/audio';

interface ConnectionStats {
  bandwidth: number;
  latency: number;
  quality: 'excellent' | 'good' | 'poor' | 'disconnected';
}

export default function RoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const roomId = params.id as string;
  const userName = searchParams.get('name') || 'Anonymous';
  const userRole = searchParams.get('role') || 'participant';
  const isAdmin = userRole === 'admin';

  // State management
  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [currentQuality, setCurrentQuality] = useState<VideoQuality>('720p');
  const [connectionStats, setConnectionStats] = useState<ConnectionStats>({
    bandwidth: 0,
    latency: 0,
    quality: 'good'
  });
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [adminMessages, setAdminMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [newAdminMessage, setNewAdminMessage] = useState('');
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [audioSettings, setAudioSettings] = useState<AudioSettings>({
    bitrate: 192,
    enableSubtitles: true,
    enableTranslation: false,
    sourceLanguage: 'en-US',
    targetLanguage: 'es-ES',
    enableNoiseReduction: true,
    enableEchoCancellation: true,
    enableAutoGainControl: true
  });
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [attendanceActive, setAttendanceActive] = useState(false);

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const webrtcManager = useRef<WebRTCManager | null>(null);
  const qualityManager = useRef<QualityManager | null>(null);
  const audioProcessor = useRef<AudioProcessor | null>(null);

  // Initialize WebRTC
  useEffect(() => {
    const initializeWebRTC = async () => {
      try {
        const config = {
          stunServers: ['stun:stun.l.google.com:19302'],
          maxPeers: 50
        };

        webrtcManager.current = new WebRTCManager(config, audioSettings);
        qualityManager.current = new QualityManager();
        audioProcessor.current = new AudioProcessor(audioSettings);

        // Set up event handlers
        webrtcManager.current.onLocalStreamReady = (stream: MediaStream) => {
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        };

        webrtcManager.current.onConnectionStatsUpdate = (_peerId: string, stats: any) => {
          setConnectionStats({
            bandwidth: stats.bandwidth || 1000,
            latency: stats.latency || 50,
            quality: stats.bandwidth > 1000 ? 'excellent' : stats.bandwidth > 500 ? 'good' : 'poor'
          });
        };

        audioProcessor.current.onSubtitleUpdate = (subtitle: Subtitle) => {
          setSubtitles(prev => [...prev.slice(-9), subtitle]); // Keep last 10 subtitles
        };

        await webrtcManager.current.initialize();
        setIsConnected(true);

        // Start subtitles if enabled
        if (audioSettings.enableSubtitles) {
          audioProcessor.current.startSpeechToText();
        }

      } catch (error) {
        console.error('Failed to initialize WebRTC:', error);
      }
    };

    initializeWebRTC();

    return () => {
      if (webrtcManager.current) {
        webrtcManager.current.dispose();
      }
      if (audioProcessor.current) {
        audioProcessor.current.dispose();
      }
    };
  }, []);

  // Quality adjustment based on connection
  useEffect(() => {
    if (webrtcManager.current && connectionStats.bandwidth > 0) {
      webrtcManager.current.adjustQuality(connectionStats.bandwidth);
      setCurrentQuality(webrtcManager.current.getCurrentQuality());
    }
  }, [connectionStats.bandwidth]);

  const toggleVideo = useCallback(async () => {
    if (webrtcManager.current) {
      const stream = webrtcManager.current.getLocalStream();
      if (stream) {
        const videoTracks = stream.getVideoTracks();
        videoTracks.forEach(track => {
          track.enabled = !isVideoEnabled;
        });
        setIsVideoEnabled(!isVideoEnabled);
      }
    }
  }, [isVideoEnabled]);

  const toggleAudio = useCallback(() => {
    if (webrtcManager.current) {
      const stream = webrtcManager.current.getLocalStream();
      if (stream) {
        const audioTracks = stream.getAudioTracks();
        audioTracks.forEach(track => {
          track.enabled = !isAudioEnabled;
        });
        setIsAudioEnabled(!isAudioEnabled);
      }
    }
  }, [isAudioEnabled]);

  const toggleScreenShare = useCallback(async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });

        // Replace video track with screen share
        if (webrtcManager.current) {
          // Implementation would replace the video track
          setIsScreenSharing(true);
        }

        screenStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
        };
      } else {
        // Stop screen sharing and return to camera
        setIsScreenSharing(false);
      }
    } catch (error) {
      console.error('Screen sharing failed:', error);
    }
  }, [isScreenSharing]);

  const handleQualityChange = useCallback(async (quality: VideoQuality) => {
    if (qualityManager.current) {
      qualityManager.current.setQuality(quality);
      setCurrentQuality(quality);

      if (quality === '144p' && webrtcManager.current) {
        await webrtcManager.current.enableUltraLowBandwidthMode();
      }
    }
  }, []);

  const sendChatMessage = useCallback(() => {
    if (!newMessage.trim()) return;

    const message = {
      id: Date.now(),
      sender: userName,
      text: newMessage,
      timestamp: new Date(),
      type: 'chat'
    };

    setChatMessages(prev => [...prev, message]);
    setNewMessage('');

    // Send to other participants via WebRTC data channel
    if (webrtcManager.current) {
      webrtcManager.current.broadcastMessage(message);
    }
  }, [newMessage, userName]);

  const sendAdminMessage = useCallback(() => {
    if (!newAdminMessage.trim() || !isAdmin) return;

    const message = {
      id: Date.now(),
      sender: userName,
      text: newAdminMessage,
      timestamp: new Date(),
      type: 'admin'
    };

    setAdminMessages(prev => [...prev, message]);
    setNewAdminMessage('');

    // Send only to other admins
    if (webrtcManager.current) {
      webrtcManager.current.broadcastMessage(message);
    }
  }, [newAdminMessage, userName, isAdmin]);

  const approveJoinRequest = useCallback((requestId: string) => {
    setJoinRequests(prev => prev.filter(req => req.id !== requestId));
    // Implementation would notify the waiting user
  }, []);

  const denyJoinRequest = useCallback((requestId: string) => {
    setJoinRequests(prev => prev.filter(req => req.id !== requestId));
    // Implementation would notify the waiting user
  }, []);

  const getQualityColor = (quality: VideoQuality) => {
    switch (quality) {
      case '1080p': return 'bg-green-500';
      case '720p': return 'bg-green-400';
      case '480p': return 'bg-yellow-500';
      case '240p': return 'bg-orange-500';
      case '144p': return 'bg-red-500';
      case 'audio-only': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  const getConnectionQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold">Room: {roomId}</h1>
            <Badge variant={isConnected ? 'default' : 'destructive'}>
              {isConnected ? 'Connected' : 'Connecting...'}
            </Badge>
            {isAdmin && (
              <Badge variant="secondary">Admin</Badge>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-300">
              Participants: {participants.length}
            </div>
            {attendanceActive && (
              <Badge variant="outline" className="border-green-500 text-green-500">
                Attendance Active
              </Badge>
            )}
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${getQualityColor(currentQuality)}`}></div>
              <span className="text-sm text-gray-300">{currentQuality}</span>
            </div>
            <div className={`text-sm ${getConnectionQualityColor(connectionStats.quality)}`}>
              {Math.round(connectionStats.bandwidth)}kbps
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-64px)]">
        {/* Main Video Area */}
        <div className="flex-1 relative">
          {/* Local Video */}
          <div className="absolute top-4 right-4 w-64 h-48 bg-gray-800 rounded-lg overflow-hidden z-10">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2 text-xs bg-black/50 px-2 py-1 rounded">
              {userName} (You)
            </div>
          </div>

          {/* Remote Videos Grid */}
          <div className="w-full h-full grid grid-cols-2 gap-2 p-4">
            {participants.map(participant => (
              <div key={participant.id} className="bg-gray-800 rounded-lg relative overflow-hidden">
                <video
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 text-sm bg-black/50 px-2 py-1 rounded">
                  {participant.name}
                </div>
                <div className="absolute top-2 right-2 flex gap-1">
                  {!participant.isVideoEnabled && (
                    <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-xs">
                      V
                    </div>
                  )}
                  {!participant.isAudioEnabled && (
                    <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-xs">
                      M
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Subtitles Overlay */}
          {audioSettings.enableSubtitles && subtitles.length > 0 && (
            <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 max-w-4xl">
              <div className="bg-black/80 rounded-lg p-4 space-y-1">
                {subtitles.slice(-3).map(subtitle => (
                  <div key={subtitle.id} className="text-center">
                    <div className="text-white">{subtitle.text}</div>
                    {subtitle.translation && audioSettings.enableTranslation && (
                      <div className="text-yellow-300 text-sm">{subtitle.translation}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Controls Bar */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
            <div className="bg-gray-800 rounded-full px-6 py-3 flex items-center gap-4">
              <Button
                size="sm"
                variant={isAudioEnabled ? "default" : "destructive"}
                onClick={toggleAudio}
                className="rounded-full w-10 h-10 p-0"
              >
                {isAudioEnabled ? 'M' : 'X'}
              </Button>
              
              <Button
                size="sm"
                variant={isVideoEnabled ? "default" : "destructive"}
                onClick={toggleVideo}
                className="rounded-full w-10 h-10 p-0"
              >
                {isVideoEnabled ? 'V' : 'X'}
              </Button>
              
              <Button
                size="sm"
                variant={isScreenSharing ? "secondary" : "outline"}
                onClick={toggleScreenShare}
                className="rounded-full w-10 h-10 p-0"
              >
                S
              </Button>
              
              <Button
                size="sm"
                variant="destructive"
                onClick={() => window.close()}
                className="rounded-full w-10 h-10 p-0"
              >
                E
              </Button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
          <Tabs defaultValue="chat" className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-3 bg-gray-700">
              <TabsTrigger value="chat">Chat</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              {isAdmin && <TabsTrigger value="admin">Admin</TabsTrigger>}
            </TabsList>

            <TabsContent value="chat" className="flex-1 flex flex-col p-4">
              <div className="flex-1 space-y-3 overflow-y-auto mb-4">
                {chatMessages.map(message => (
                  <div key={message.id} className="bg-gray-700 rounded-lg p-3">
                    <div className="text-sm font-medium text-blue-300">{message.sender}</div>
                    <div className="text-sm text-gray-200">{message.text}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                  className="bg-gray-700 border-gray-600"
                />
                <Button onClick={sendChatMessage} size="sm">Send</Button>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="flex-1 p-4 space-y-4">
              <div>
                <Label className="text-sm font-medium">Video Quality</Label>
                <Select value={currentQuality} onValueChange={handleQualityChange}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QUALITY_TIERS.map(tier => (
                      <SelectItem key={tier.name} value={tier.name}>
                        {tier.name} - {tier.totalBandwidth}kbps
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator className="bg-gray-600" />

              <div className="space-y-3">
                <Label className="text-sm font-medium">Audio Settings</Label>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="subtitles" className="text-sm">Subtitles</Label>
                  <Switch
                    id="subtitles"
                    checked={audioSettings.enableSubtitles}
                    onCheckedChange={(checked) => 
                      setAudioSettings(prev => ({ ...prev, enableSubtitles: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="translation" className="text-sm">Translation</Label>
                  <Switch
                    id="translation"
                    checked={audioSettings.enableTranslation}
                    onCheckedChange={(checked) => 
                      setAudioSettings(prev => ({ ...prev, enableTranslation: checked }))
                    }
                  />
                </div>

                {audioSettings.enableTranslation && (
                  <div className="space-y-2">
                    <Select
                      value={audioSettings.sourceLanguage}
                      onValueChange={(value) => 
                        setAudioSettings(prev => ({ ...prev, sourceLanguage: value }))
                      }
                    >
                      <SelectTrigger className="bg-gray-700 border-gray-600">
                        <SelectValue placeholder="Source Language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en-US">English</SelectItem>
                        <SelectItem value="es-ES">Spanish</SelectItem>
                        <SelectItem value="fr-FR">French</SelectItem>
                        <SelectItem value="de-DE">German</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select
                      value={audioSettings.targetLanguage}
                      onValueChange={(value) => 
                        setAudioSettings(prev => ({ ...prev, targetLanguage: value }))
                      }
                    >
                      <SelectTrigger className="bg-gray-700 border-gray-600">
                        <SelectValue placeholder="Target Language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en-US">English</SelectItem>
                        <SelectItem value="es-ES">Spanish</SelectItem>
                        <SelectItem value="fr-FR">French</SelectItem>
                        <SelectItem value="de-DE">German</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label className="text-sm">Audio Bitrate: {audioSettings.bitrate}kbps</Label>
                  <input
                    type="range"
                    min="64"
                    max="328"
                    step="32"
                    value={audioSettings.bitrate}
                    onChange={(e) => 
                      setAudioSettings(prev => ({ ...prev, bitrate: parseInt(e.target.value) }))
                    }
                    className="w-full mt-1"
                  />
                </div>
              </div>
            </TabsContent>

            {isAdmin && (
              <TabsContent value="admin" className="flex-1 p-4 space-y-4">
                <div>
                  <Label className="text-sm font-medium">Join Requests</Label>
                  {joinRequests.length === 0 ? (
                    <p className="text-sm text-gray-400 mt-2">No pending requests</p>
                  ) : (
                    <div className="space-y-2 mt-2">
                      {joinRequests.map(request => (
                        <div key={request.id} className="bg-gray-700 rounded-lg p-3">
                          <div className="text-sm font-medium">{request.userName}</div>
                          <div className="flex gap-2 mt-2">
                            <Button size="sm" onClick={() => approveJoinRequest(request.id)}>
                              Approve
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => denyJoinRequest(request.id)}>
                              Deny
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Separator className="bg-gray-600" />

                <div>
                  <Label className="text-sm font-medium">Admin Chat</Label>
                  <div className="space-y-2 mt-2 max-h-40 overflow-y-auto">
                    {adminMessages.map(message => (
                      <div key={message.id} className="bg-gray-700 rounded p-2">
                        <div className="text-xs font-medium text-purple-300">{message.sender}</div>
                        <div className="text-sm">{message.text}</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Input
                      value={newAdminMessage}
                      onChange={(e) => setNewAdminMessage(e.target.value)}
                      placeholder="Admin message..."
                      onKeyPress={(e) => e.key === 'Enter' && sendAdminMessage()}
                      className="bg-gray-700 border-gray-600"
                    />
                    <Button onClick={sendAdminMessage} size="sm">Send</Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="attendance" className="text-sm">Attendance Tracking</Label>
                  <Switch
                    id="attendance"
                    checked={attendanceActive}
                    onCheckedChange={setAttendanceActive}
                  />
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  );
}