import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getAttendance } from "../api/client";
import type { AttendanceRecord } from "../types/attendance";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getDefaultMonth(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export default function DashboardPage() {
  const { supervisor, logout } = useAuth();
  const defaultRange = getDefaultMonth();
  const [startDate, setStartDate] = useState(defaultRange.start);
  const [endDate, setEndDate] = useState(defaultRange.end);
  const [workerId, setWorkerId] = useState("");
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getAttendance({
        startDate,
        endDate,
        workerId: workerId.trim() || undefined,
      });
      setRecords(data.records);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load";
      setError(msg);
      if (msg === "Session expired") logout();
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, workerId, logout]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Factory Flow</h1>
        <div className="dashboard-header-right">
          {supervisor && <span className="supervisor-name">{supervisor.name}</span>}
          <button type="button" onClick={logout} className="btn-logout">
            Log out
          </button>
        </div>
      </header>

      <section className="filters">
        <label>
          Start date
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>
        <label>
          End date
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </label>
        <label>
          Worker ID
          <input
            type="text"
            placeholder="Optional"
            value={workerId}
            onChange={(e) => setWorkerId(e.target.value)}
          />
        </label>
      </section>

      {error && <p className="dashboard-error">{error}</p>}

      <div className="table-wrap">
        {loading ? (
          <p className="loading">Loading…</p>
        ) : records.length === 0 ? (
          <p className="empty">No attendance records for this range.</p>
        ) : (
          <table className="attendance-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Worker</th>
                <th>Status</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Device</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td>{formatDate(r.date)}</td>
                  <td>
                    {r.worker.name}
                    <span className="biometric-id"> ({r.worker.biometricId})</span>
                  </td>
                  <td>
                    <span className={`status status-${r.status.toLowerCase()}`}>
                      {r.status.replace("_", " ")}
                    </span>
                  </td>
                  <td>{formatTime(r.checkInTime)}</td>
                  <td>{formatTime(r.checkOutTime)}</td>
                  <td>{r.deviceId ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
