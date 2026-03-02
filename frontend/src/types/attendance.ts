export type AttendanceStatus = "PRESENT" | "ABSENT" | "HALF_DAY";

export interface WorkerInfo {
  id: string;
  biometricId: string;
  name: string;
}

export interface AttendanceRecord {
  id: string;
  workerId: string;
  worker: WorkerInfo;
  deviceId: string | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  date: string;
  status: AttendanceStatus;
  createdAt: string;
}

export interface AttendanceResponse {
  start: string;
  end: string;
  records: AttendanceRecord[];
}

export interface LoginResponse {
  token: string;
  supervisor: { id: string; email: string; name: string };
}
