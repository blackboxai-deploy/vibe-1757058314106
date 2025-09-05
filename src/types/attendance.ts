export interface AttendanceRecord {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  joinTime: Date;
  leaveTime?: Date;
  duration: number; // in seconds
  qualityMetrics: ConnectionStats[];
  attendanceStatus: 'present' | 'late' | 'absent' | 'left-early';
}

export interface ConnectionStats {
  timestamp: Date;
  bandwidth: number;
  latency: number;
  packetLoss: number;
  quality: 'excellent' | 'good' | 'poor' | 'disconnected';
  videoResolution: string;
  audioBitrate: number;
}

export interface AttendanceSchedule {
  roomId: string;
  startTime: Date;
  endTime: Date;
  autoTrack: boolean;
  notifyAdmin: boolean;
  requiredDuration: number; // minimum duration to be marked as present
  lateThreshold: number; // minutes after start time to be marked as late
}

export interface AttendanceReport {
  roomId: string;
  roomName: string;
  scheduledTime: Date;
  totalParticipants: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  averageDuration: number;
  records: AttendanceRecord[];
  generatedAt: Date;
}

export interface AttendanceSummary {
  userId: string;
  userName: string;
  totalSessions: number;
  presentSessions: number;
  lateSessions: number;
  absentSessions: number;
  averageJoinTime: number; // minutes after scheduled time
  totalDuration: number; // total time in all sessions
  attendanceRate: number; // percentage
}