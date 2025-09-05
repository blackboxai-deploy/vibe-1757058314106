import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

interface CreateRoomRequest {
  name: string;
  adminName: string;
  requiresApproval: boolean;
  attendanceTracking: boolean;
  maxParticipants?: number;
  scheduledTime?: string;
}

// In a real application, this would be stored in a database
const rooms = new Map();

export async function POST(request: NextRequest) {
  try {
    const body: CreateRoomRequest = await request.json();
    const { name, adminName, requiresApproval, attendanceTracking, maxParticipants = 50, scheduledTime } = body;

    // Validate required fields
    if (!name || !adminName) {
      return NextResponse.json(
        { error: 'Room name and admin name are required' },
        { status: 400 }
      );
    }

    // Generate unique room ID
    const roomId = uuidv4().substring(0, 8);

    // Create room object
    const room = {
      id: roomId,
      name,
      adminId: `admin-${Date.now()}`,
      adminName,
      requiresApproval,
      attendanceTracking,
      maxParticipants,
      scheduledTime: scheduledTime ? new Date(scheduledTime) : null,
      createdAt: new Date(),
      isActive: true,
      participants: [],
      qualitySettings: {
        enableAdaptiveQuality: true,
        maxResolution: '1080p',
        minResolution: '144p',
        targetBitrate: 1000,
        enableUltraLowMode: true
      },
      audioSettings: {
        minBitrate: 64,
        maxBitrate: 328,
        enableNoiseReduction: true,
        enableEchoCancellation: true,
        enableSubtitles: true,
        enableTranslation: false,
        defaultLanguage: 'en-US'
      }
    };

    // Store room (in production, save to database)
    rooms.set(roomId, room);

    console.log(`Room created: ${roomId} by ${adminName}`);

    // Schedule attendance tracking if requested
    if (attendanceTracking && scheduledTime) {
      // In a real implementation, this would integrate with the attendance scheduler
      console.log(`Scheduled attendance tracking for room ${roomId} at ${scheduledTime}`);
    }

    return NextResponse.json({
      roomId,
      room: {
        id: roomId,
        name,
        adminName,
        requiresApproval,
        attendanceTracking,
        maxParticipants,
        createdAt: room.createdAt
      }
    });

  } catch (error) {
    console.error('Error creating room:', error);
    return NextResponse.json(
      { error: 'Failed to create room' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Return list of active rooms (admin functionality)
    const activeRooms = Array.from(rooms.values())
      .filter((room: any) => room.isActive)
      .map((room: any) => ({
        id: room.id,
        name: room.name,
        adminName: room.adminName,
        participantCount: room.participants.length,
        maxParticipants: room.maxParticipants,
        createdAt: room.createdAt,
        attendanceTracking: room.attendanceTracking
      }));

    return NextResponse.json({ rooms: activeRooms });

  } catch (error) {
    console.error('Error fetching rooms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rooms' },
      { status: 500 }
    );
  }
}