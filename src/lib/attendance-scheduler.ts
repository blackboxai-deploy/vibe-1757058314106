import cron from 'node-cron';
import { AttendanceSchedule, AttendanceRecord } from '@/types/attendance';

export class AttendanceScheduler {
  private scheduledJobs: Map<string, cron.ScheduledTask> = new Map();
  private activeTracking: Map<string, AttendanceSchedule> = new Map();

  public scheduleAttendanceTracking(schedule: AttendanceSchedule): void {
    const { roomId, startTime } = schedule;
    
    // Create cron pattern from start time
    const cronPattern = this.createCronPattern(startTime);
    
    // Schedule the attendance tracking
    const task = cron.schedule(cronPattern, () => {
      this.startAttendanceTracking(schedule);
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    this.scheduledJobs.set(roomId, task);
    console.log(`Scheduled attendance tracking for room ${roomId} at ${startTime}`);
  }

  private createCronPattern(date: Date): string {
    const minute = date.getUTCMinutes();
    const hour = date.getUTCHours();
    const day = date.getUTCDate();
    const month = date.getUTCMonth() + 1; // months are 0-indexed
    
    // Schedule for specific date and time
    return `${minute} ${hour} ${day} ${month} *`;
  }

  public startAttendanceTracking(schedule: AttendanceSchedule): void {
    const { roomId } = schedule;
    
    this.activeTracking.set(roomId, schedule);
    console.log(`Started attendance tracking for room: ${roomId}`);
    
    // Notify admin about attendance tracking start
    this.notifyAdminAttendanceStart(schedule);
    
    // Schedule end of tracking if endTime is specified
    if (schedule.endTime) {
      const endCronPattern = this.createCronPattern(schedule.endTime);
      
      cron.schedule(endCronPattern, () => {
        this.stopAttendanceTracking(roomId);
      }, {
        scheduled: true,
        timezone: 'UTC'
      });
    }
  }

  public stopAttendanceTracking(roomId: string): void {
    const schedule = this.activeTracking.get(roomId);
    if (schedule) {
      this.activeTracking.delete(roomId);
      console.log(`Stopped attendance tracking for room: ${roomId}`);
      
      // Generate attendance report
      this.generateAttendanceReport(roomId, schedule);
      
      // Notify admin about attendance tracking end
      this.notifyAdminAttendanceEnd(schedule);
    }
  }

  public markAttendance(roomId: string, userId: string, userName: string, action: 'join' | 'leave'): AttendanceRecord | null {
    const schedule = this.activeTracking.get(roomId);
    if (!schedule) {
      return null; // No active tracking for this room
    }

    const now = new Date();
    
    if (action === 'join') {
      const record: AttendanceRecord = {
        id: `${roomId}-${userId}-${Date.now()}`,
        roomId,
        userId,
        userName,
        joinTime: now,
        duration: 0,
        qualityMetrics: [],
        attendanceStatus: this.determineAttendanceStatus(now, schedule)
      };

      // Store the record (in a real implementation, this would go to a database)
      this.storeAttendanceRecord(record);
      
      return record;
    } else if (action === 'leave') {
      // Update existing record with leave time
      const record = this.findAttendanceRecord(roomId, userId);
      if (record) {
        record.leaveTime = now;
        record.duration = Math.floor((now.getTime() - record.joinTime.getTime()) / 1000);
        
        // Update attendance status if left early
        if (schedule.endTime && now < schedule.endTime) {
          const requiredDuration = schedule.requiredDuration || 0;
          if (record.duration < requiredDuration) {
            record.attendanceStatus = 'left-early';
          }
        }

        this.updateAttendanceRecord(record);
        return record;
      }
    }

    return null;
  }

  private determineAttendanceStatus(joinTime: Date, schedule: AttendanceSchedule): 'present' | 'late' | 'absent' {
    const timeDifference = (joinTime.getTime() - schedule.startTime.getTime()) / (1000 * 60); // difference in minutes
    const lateThreshold = schedule.lateThreshold || 10; // default 10 minutes

    if (timeDifference <= 0) {
      return 'present'; // Joined on time or early
    } else if (timeDifference <= lateThreshold) {
      return 'late'; // Joined within late threshold
    } else {
      return 'absent'; // Joined too late or didn't join
    }
  }

  public isAttendanceActive(roomId: string): boolean {
    return this.activeTracking.has(roomId);
  }

  public getActiveSchedule(roomId: string): AttendanceSchedule | undefined {
    return this.activeTracking.get(roomId);
  }

  public cancelSchedule(roomId: string): void {
    const task = this.scheduledJobs.get(roomId);
    if (task) {
      task.destroy();
      this.scheduledJobs.delete(roomId);
      console.log(`Cancelled attendance schedule for room: ${roomId}`);
    }

    if (this.activeTracking.has(roomId)) {
      this.stopAttendanceTracking(roomId);
    }
  }

  public listActiveTracking(): AttendanceSchedule[] {
    return Array.from(this.activeTracking.values());
  }

  public listScheduledJobs(): string[] {
    return Array.from(this.scheduledJobs.keys());
  }

  // Mock implementations for database operations
  // In a real application, these would interact with your database
  private storeAttendanceRecord(record: AttendanceRecord): void {
    console.log('Storing attendance record:', record);
    // Store in database
  }

  private findAttendanceRecord(roomId: string, userId: string): AttendanceRecord | null {
    console.log(`Finding attendance record for room: ${roomId}, user: ${userId}`);
    // Query database for existing record
    return null;
  }

  private updateAttendanceRecord(record: AttendanceRecord): void {
    console.log('Updating attendance record:', record);
    // Update record in database
  }

  private async generateAttendanceReport(roomId: string, schedule: AttendanceSchedule): Promise<void> {
    console.log(`Generating attendance report for room: ${roomId}`);
    
    try {
      const response = await fetch('/api/attendance/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roomId, schedule }),
      });

      if (response.ok) {
        const report = await response.json();
        console.log('Attendance report generated:', report);
      }
    } catch (error) {
      console.error('Failed to generate attendance report:', error);
    }
  }

  private async notifyAdminAttendanceStart(schedule: AttendanceSchedule): Promise<void> {
    try {
      await fetch('/api/notifications/attendance-start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ schedule }),
      });
    } catch (error) {
      console.error('Failed to notify admin of attendance start:', error);
    }
  }

  private async notifyAdminAttendanceEnd(schedule: AttendanceSchedule): Promise<void> {
    try {
      await fetch('/api/notifications/attendance-end', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ schedule }),
      });
    } catch (error) {
      console.error('Failed to notify admin of attendance end:', error);
    }
  }

  public dispose(): void {
    // Clean up all scheduled jobs
    this.scheduledJobs.forEach(task => {
      task.destroy();
    });
    
    this.scheduledJobs.clear();
    this.activeTracking.clear();
    console.log('Attendance scheduler disposed');
  }
}

// Singleton instance
let attendanceSchedulerInstance: AttendanceScheduler | null = null;

export function getAttendanceScheduler(): AttendanceScheduler {
  if (!attendanceSchedulerInstance) {
    attendanceSchedulerInstance = new AttendanceScheduler();
  }
  return attendanceSchedulerInstance;
}