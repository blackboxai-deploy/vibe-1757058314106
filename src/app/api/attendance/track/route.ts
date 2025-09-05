import { NextRequest, NextResponse } from 'next/server';
import { getAttendanceScheduler } from '@/lib/attendance-scheduler';

interface AttendanceTrackRequest {
  roomId: string;
  userId: string;
  userName: string;
  action: 'join' | 'leave';
  timestamp?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: AttendanceTrackRequest = await request.json();
    const { roomId, userId, userName, action, timestamp } = body;

    if (!roomId || !userId || !userName || !action) {
      return NextResponse.json(
        { error: 'Room ID, user ID, user name, and action are required' },
        { status: 400 }
      );
    }

    if (!['join', 'leave'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be "join" or "leave"' },
        { status: 400 }
      );
    }

    const scheduler = getAttendanceScheduler();
    
    // Check if attendance tracking is active for this room
    if (!scheduler.isAttendanceActive(roomId)) {
      return NextResponse.json({
        success: false,
        message: 'Attendance tracking is not active for this room',
        tracked: false
      });
    }

    // Mark attendance
    const record = scheduler.markAttendance(roomId, userId, userName, action);

    if (record) {
      console.log(`Attendance tracked: ${userName} ${action}ed room ${roomId}`);
      
      return NextResponse.json({
        success: true,
        record: {
          id: record.id,
          roomId: record.roomId,
          userId: record.userId,
          userName: record.userName,
          action,
          timestamp: record.joinTime || record.leaveTime,
          attendanceStatus: record.attendanceStatus,
          duration: record.duration
        },
        tracked: true
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Failed to track attendance - no active session found',
        tracked: false
      });
    }

  } catch (error) {
    console.error('Error tracking attendance:', error);
    return NextResponse.json(
      { error: 'Failed to track attendance' },
      { status: 500 }
    );
  }
}

// Get attendance status for a room
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');

    if (!roomId) {
      return NextResponse.json(
        { error: 'Room ID is required' },
        { status: 400 }
      );
    }

    const scheduler = getAttendanceScheduler();
    const isActive = scheduler.isAttendanceActive(roomId);
    const schedule = scheduler.getActiveSchedule(roomId);

    return NextResponse.json({
      roomId,
      attendanceActive: isActive,
      schedule: schedule ? {
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        autoTrack: schedule.autoTrack,
        notifyAdmin: schedule.notifyAdmin,
        requiredDuration: schedule.requiredDuration,
        lateThreshold: schedule.lateThreshold
      } : null
    });

  } catch (error) {
    console.error('Error getting attendance status:', error);
    return NextResponse.json(
      { error: 'Failed to get attendance status' },
      { status: 500 }
    );
  }
}