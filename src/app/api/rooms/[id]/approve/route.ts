import { NextRequest, NextResponse } from 'next/server';

interface ApprovalRequest {
  requestId: string;
  action: 'approve' | 'deny';
  adminId: string;
}

// Mock storage - in production, use a database
const rooms = new Map();
const joinRequests = new Map();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const roomId = params.id;
    const body: ApprovalRequest = await request.json();
    const { requestId, action, adminId } = body;

    if (!requestId || !action || !adminId) {
      return NextResponse.json(
        { error: 'Request ID, action, and admin ID are required' },
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

    // Verify admin permissions
    const isAdmin = room.adminId === adminId || 
                   room.participants.some((p: any) => p.id === adminId && p.role === 'admin');
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Find the join request
    const roomRequests = joinRequests.get(roomId) || [];
    const requestIndex = roomRequests.findIndex((req: any) => req.id === requestId);
    
    if (requestIndex === -1) {
      return NextResponse.json(
        { error: 'Join request not found' },
        { status: 404 }
      );
    }

    const joinRequest = roomRequests[requestIndex];

    if (action === 'approve') {
      // Check room capacity
      if (room.participants.length >= room.maxParticipants) {
        return NextResponse.json(
          { error: 'Room is at capacity' },
          { status: 400 }
        );
      }

      // Create participant object
      const participant = {
        id: joinRequest.userId,
        name: joinRequest.userName,
        role: 'participant',
        joinedAt: new Date(),
        isVideoEnabled: true,
        isAudioEnabled: true,
        isScreenSharing: false,
        connectionQuality: 'good',
        currentQuality: '720p',
        approvalStatus: 'approved'
      };

      // Add to room participants
      room.participants.push(participant);

      // Update request status
      joinRequest.status = 'approved';
      joinRequest.approvedAt = new Date();
      joinRequest.approvedBy = adminId;

      console.log(`Join request approved: ${joinRequest.userName} → Room ${roomId}`);

      // In a real application, notify the user via WebSocket or polling
      
      return NextResponse.json({
        success: true,
        action: 'approved',
        participant,
        message: `${joinRequest.userName} has been approved to join the room`
      });

    } else if (action === 'deny') {
      // Update request status
      joinRequest.status = 'denied';
      joinRequest.deniedAt = new Date();
      joinRequest.deniedBy = adminId;

      // Remove from pending requests
      roomRequests.splice(requestIndex, 1);
      joinRequests.set(roomId, roomRequests);

      console.log(`Join request denied: ${joinRequest.userName} → Room ${roomId}`);

      return NextResponse.json({
        success: true,
        action: 'denied',
        message: `${joinRequest.userName}'s join request has been denied`
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Must be "approve" or "deny"' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error processing approval request:', error);
    return NextResponse.json(
      { error: 'Failed to process approval request' },
      { status: 500 }
    );
  }
}

// Get pending approvals for admin dashboard
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const roomId = params.id;

    // Get pending join requests for this room
    const roomRequests = joinRequests.get(roomId) || [];
    const pendingRequests = roomRequests.filter((req: any) => req.status === 'pending');

    return NextResponse.json({
      roomId,
      pendingRequests: pendingRequests.map((req: any) => ({
        id: req.id,
        userId: req.userId,
        userName: req.userName,
        requestedAt: req.requestedAt,
        message: req.message,
        status: req.status
      })),
      total: pendingRequests.length
    });

  } catch (error) {
    console.error('Error fetching pending approvals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending approvals' },
      { status: 500 }
    );
  }
}