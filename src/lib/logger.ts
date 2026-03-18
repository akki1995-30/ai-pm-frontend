/**
 * Frontend structured logger
 *
 * Levels: DEBUG < INFO < WARN < ERROR
 * In production (VITE_LOG_LEVEL=WARN or ERROR) debug/info are suppressed.
 *
 * Usage:
 *   import logger from "../lib/logger";
 *   logger.info("TeamsPage", "component mounted");
 *   logger.error("LoginPage", "login failed", { message });
 */

type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

const LEVEL_RANK: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO:  1,
  WARN:  2,
  ERROR: 3,
};

const LEVEL_STYLES: Record<LogLevel, string> = {
  DEBUG: "color:#94a3b8;font-weight:500",
  INFO:  "color:#6366f1;font-weight:600",
  WARN:  "color:#f59e0b;font-weight:600",
  ERROR: "color:#ef4444;font-weight:700",
};

const LEVEL_ICONS: Record<LogLevel, string> = {
  DEBUG: "🔍",
  INFO:  "ℹ️",
  WARN:  "⚠️",
  ERROR: "🔴",
};

function getMinLevel(): LogLevel {
  const env = (import.meta.env.VITE_LOG_LEVEL as LogLevel | undefined) ?? "DEBUG";
  return (env in LEVEL_RANK ? env : "DEBUG") as LogLevel;
}

function ts(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 23);
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_RANK[level] >= LEVEL_RANK[getMinLevel()];
}

function write(level: LogLevel, context: string, message: string, meta?: unknown): void {
  if (!shouldLog(level)) return;

  const prefix = `%c${LEVEL_ICONS[level]} [${level}] ${ts()} [${context}]`;
  const style  = LEVEL_STYLES[level];

  if (meta !== undefined) {
    // eslint-disable-next-line no-console
    (level === "ERROR" ? console.error : level === "WARN" ? console.warn : console.log)(
      prefix, style, message, meta
    );
  } else {
    // eslint-disable-next-line no-console
    (level === "ERROR" ? console.error : level === "WARN" ? console.warn : console.log)(
      prefix, style, message
    );
  }
}

const logger = {
  debug: (context: string, message: string, meta?: unknown) => write("DEBUG", context, message, meta),
  info:  (context: string, message: string, meta?: unknown) => write("INFO",  context, message, meta),
  warn:  (context: string, message: string, meta?: unknown) => write("WARN",  context, message, meta),
  error: (context: string, message: string, meta?: unknown) => write("ERROR", context, message, meta),
};

export default logger;
