import type { AttendanceResponse, LoginResponse } from "../types/attendance";

const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

function getToken(): string | null {
  return localStorage.getItem("token");
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message ?? "Login failed");
  }
  return data as LoginResponse;
}

export async function getAttendance(params: {
  startDate?: string;
  endDate?: string;
  workerId?: string;
}): Promise<AttendanceResponse> {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");
  const search = new URLSearchParams();
  if (params.startDate) search.set("startDate", params.startDate);
  if (params.endDate) search.set("endDate", params.endDate);
  if (params.workerId) search.set("workerId", params.workerId);
  const url = `${baseUrl}/attendance${search.toString() ? `?${search}` : ""}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("supervisor");
    throw new Error("Session expired");
  }
  if (!res.ok) {
    throw new Error(data.message ?? "Failed to load attendance");
  }
  return data as AttendanceResponse;
}
