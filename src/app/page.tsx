'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AuthManager } from '@/lib/auth';

export default function HomePage() {
  const [roomId, setRoomId] = useState('');
  const [userName, setUserName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [authState, setAuthState] = useState<any>(null);
  const router = useRouter();
  const authManager = AuthManager.getInstance();

  useEffect(() => {
    // Initialize auth state
    authManager.initializeFromStorage();
    const state = authManager.getAuthState();
    setAuthState(state);
    setIsAdmin(state.isAdmin);
  }, []);

  const handleCreateRoom = async () => {
    if (!userName.trim()) return;

    try {
      const response = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `${userName}'s Room`,
          adminName: userName,
          requiresApproval: true,
          attendanceTracking: true,
        }),
      });

      if (response.ok) {
        const { roomId: newRoomId } = await response.json();
        router.push(`/room/${newRoomId}?name=${encodeURIComponent(userName)}&role=admin`);
      }
    } catch (error) {
      console.error('Failed to create room:', error);
    }
  };

  const handleJoinRoom = () => {
    if (!roomId.trim() || !userName.trim()) return;
    
    router.push(`/room/${roomId}?name=${encodeURIComponent(userName)}&role=participant`);
  };

  const generateRandomRoomId = () => {
    const randomId = Math.random().toString(36).substring(2, 12);
    setRoomId(randomId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 py-16 sm:py-24">
          <div className="text-center">
            <h1 className="text-4xl sm:text-6xl font-bold text-gray-900 mb-6">
              Ultra-Low Bandwidth
              <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Video Conferencing
              </span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Professional video conferencing that works seamlessly even on slow connections. 
              From 1080p to 144p adaptive quality, real-time subtitles, and administrative controls.
            </p>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-blue-600/10"></div>
            <CardHeader className="relative">
              <CardTitle className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                Adaptive Quality
              </CardTitle>
              <CardDescription>
                6-tier quality system from 1080p down to 144p ultra-low bandwidth mode
              </CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">1080p</Badge>
                <Badge variant="secondary">720p</Badge>
                <Badge variant="secondary">480p</Badge>
                <Badge variant="secondary">240p</Badge>
                <Badge variant="outline">144p</Badge>
                <Badge variant="destructive">Audio-only</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-green-600/10"></div>
            <CardHeader className="relative">
              <CardTitle className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                AI-Powered Audio
              </CardTitle>
              <CardDescription>
                Real-time subtitles with multi-language translation support
              </CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <div className="space-y-2">
                <div className="text-sm text-gray-600">• Speech-to-Text transcription</div>
                <div className="text-sm text-gray-600">• Multi-language translation</div>
                <div className="text-sm text-gray-600">• 64-328kbps adaptive audio</div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-purple-600/10"></div>
            <CardHeader className="relative">
              <CardTitle className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                Admin Controls
              </CardTitle>
              <CardDescription>
                Advanced administrative features with attendance tracking
              </CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <div className="space-y-2">
                <div className="text-sm text-gray-600">• Join approval system</div>
                <div className="text-sm text-gray-600">• Scheduled attendance</div>
                <div className="text-sm text-gray-600">• Admin-only chat</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Interface */}
        <div className="max-w-2xl mx-auto">
          <Card className="relative overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5"></div>
            <CardHeader className="relative text-center">
              <CardTitle className="text-2xl mb-2">Get Started</CardTitle>
              <CardDescription>
                Create a new room or join an existing conference
              </CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <Tabs defaultValue="join" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="join">Join Room</TabsTrigger>
                  <TabsTrigger value="create">Create Room</TabsTrigger>
                </TabsList>

                <TabsContent value="join" className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="join-name">Your Name</Label>
                      <Input
                        id="join-name"
                        placeholder="Enter your name"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="room-id">Room ID</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          id="room-id"
                          placeholder="Enter room ID"
                          value={roomId}
                          onChange={(e) => setRoomId(e.target.value)}
                        />
                        <Button
                          variant="outline"
                          onClick={generateRandomRoomId}
                          className="shrink-0"
                        >
                          Random
                        </Button>
                      </div>
                    </div>
                    <Button
                      onClick={handleJoinRoom}
                      disabled={!roomId.trim() || !userName.trim()}
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                    >
                      Join Room
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="create" className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="create-name">Admin Name</Label>
                      <Input
                        id="create-name"
                        placeholder="Enter your name"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <Button
                      onClick={handleCreateRoom}
                      disabled={!userName.trim()}
                      className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
                    >
                      Create New Room
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Admin Portal Link */}
              {isAdmin && (
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-4">Administrative Portal</p>
                    <Button
                      variant="outline"
                      onClick={() => router.push('/admin/dashboard')}
                      className="border-2 border-gray-300 hover:border-gray-400"
                    >
                      Access Admin Dashboard
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Technical Specifications */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Optimized for Any Connection
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Advanced algorithms ensure smooth communication regardless of network conditions
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-2">144p</div>
              <div className="text-sm text-gray-600">Ultra-low bandwidth mode</div>
              <div className="text-xs text-gray-500 mt-1">~200kbps total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 mb-2">64-328</div>
              <div className="text-sm text-gray-600">Audio quality range (kbps)</div>
              <div className="text-xs text-gray-500 mt-1">Adaptive bitrate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 mb-2">6</div>
              <div className="text-sm text-gray-600">Quality tiers</div>
              <div className="text-xs text-gray-500 mt-1">Auto-switching</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 mb-2">&lt; 2s</div>
              <div className="text-sm text-gray-600">Translation latency</div>
              <div className="text-xs text-gray-500 mt-1">Real-time processing</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}