/** Structured logging without secrets or sensitive data. */
export type LogLevel = "info" | "warning" | "error" | "debug";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

export function structuredLog(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>
): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
  };

  // In production, this would be sent to a logging service
  if (process.env.NODE_ENV !== "production") {
    console.log(JSON.stringify(entry));
  }
}
