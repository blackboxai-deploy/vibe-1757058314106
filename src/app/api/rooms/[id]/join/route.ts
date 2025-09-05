import { NextRequest, NextResponse } from 'next/server';

interface JoinRoomRequest {
  userName: string;
  userRole: 'admin' | 'moderator' | 'participant';
}

// Mock room storage - in production, use a database
const rooms = new Map();
const joinRequests = new Map();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const roomId = params.id;
    const body: JoinRoomRequest = await request.json();
    const { userName, userRole } = body;

    if (!userName) {
      return NextResponse.json(
        { error: 'User name is required' },
        { status: 400 }
      );
    }

    // Check if room exists
    const room = rooms.get(roomId);
    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }

    // Check if room is at capacity
    if (room.participants.length >= room.maxParticipants) {
      return NextResponse.json(
        { error: 'Room is at capacity' },
        { status: 400 }
      );
    }

    // Create user object
    const user = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: userName,
      role: userRole,
      joinedAt: new Date(),
      isVideoEnabled: true,
      isAudioEnabled: true,
      isScreenSharing: false,
      connectionQuality: 'good' as const,
      currentQuality: '720p' as const,
      approvalStatus: userRole === 'admin' ? 'approved' : 'pending' as const
    };

    // Handle admin join (immediate approval)
    if (userRole === 'admin' || !room.requiresApproval) {
      room.participants.push(user);
      user.approvalStatus = 'approved';
      
      console.log(`User ${userName} joined room ${roomId} as ${userRole}`);
      
      return NextResponse.json({
        success: true,
        user,
        room: {
          id: room.id,
          name: room.name,
          requiresApproval: room.requiresApproval,
          attendanceTracking: room.attendanceTracking,
          qualitySettings: room.qualitySettings,
          audioSettings: room.audioSettings
        },
        status: 'approved'
      });
    }

    // Handle participant join request (requires approval)
    const requestId = `req-${Date.now()}`;
    const joinRequest = {
      id: requestId,
      roomId,
      userId: user.id,
      userName,
      requestedAt: new Date(),
      status: 'pending',
      message: `${userName} wants to join the room`
    };

    // Store join request
    const roomRequests = joinRequests.get(roomId) || [];
    roomRequests.push(joinRequest);
    joinRequests.set(roomId, roomRequests);

    console.log(`Join request from ${userName} for room ${roomId}`);

    return NextResponse.json({
      success: true,
      user,
      requestId,
      status: 'pending',
      message: 'Your join request has been sent to the room administrator. Please wait for approval.'
    });

  } catch (error) {
    console.error('Error joining room:', error);
    return NextResponse.json(
      { error: 'Failed to join room' },
      { status: 500 }
    );
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const roomId = params.id;
    
    // Get room info
    const room = rooms.get(roomId);
    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }

    // Get pending join requests for this room
    const roomRequests = joinRequests.get(roomId) || [];
    const pendingRequests = roomRequests.filter((req: any) => req.status === 'pending');

    return NextResponse.json({
      room: {
        id: room.id,
        name: room.name,
        participantCount: room.participants.length,
        maxParticipants: room.maxParticipants,
        requiresApproval: room.requiresApproval,
        attendanceTracking: room.attendanceTracking,
        isActive: room.isActive
      },
      participants: room.participants.map((p: any) => ({
        id: p.id,
        name: p.name,
        role: p.role,
        joinedAt: p.joinedAt,
        isVideoEnabled: p.isVideoEnabled,
        isAudioEnabled: p.isAudioEnabled,
        connectionQuality: p.connectionQuality
      })),
      pendingRequests: pendingRequests.map((req: any) => ({
        id: req.id,
        userName: req.userName,
        requestedAt: req.requestedAt,
        message: req.message
      }))
    });

  } catch (error) {
    console.error('Error fetching room info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch room information' },
      { status: 500 }
    );
  }
}