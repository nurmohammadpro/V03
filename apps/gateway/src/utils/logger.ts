import winston from "winston";
import { getEnv } from "./env";

function createLogger() {
  const env = getEnv();

  const logger = winston.createLogger({
    level: env.LOG_LEVEL,
    format: winston.format.combine(
      winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    ),
    defaultMeta: { service: "v03-gateway", version: "1.0.0" },
    transports: [
      // Console transport (always enabled)
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, ...meta }: Record<string, any>) => {
            const metaStr = Object.keys(meta).length
              ? ` ${JSON.stringify(meta, null, 2)}`
              : "";
            return `${timestamp} [${level}]: ${message}${metaStr}`;
          }),
        ),
      }),

      // Error log file (production only)
      ...(env.NODE_ENV === "production"
        ? [
          new winston.transports.File({
            filename: "/var/log/v03/error.log",
            level: "error",
            format: winston.format.json(),
          }),
          new winston.transports.File({
            filename: "/var/log/v03/combined.log",
            format: winston.format.json(),
          }),
        ]
        : []),
    ],
  });

  return logger;
}

let loggerInstance: winston.Logger | null = null;

export function getLogger(): winston.Logger {
  if (!loggerInstance) {
    loggerInstance = createLogger();
  }
  return loggerInstance;
}

export function initializeLogger() {
  const logger = getLogger();
  logger.info("Logger initialized", {
    level: getEnv().LOG_LEVEL,
    environment: getEnv().NODE_ENV,
  });
  return logger;
}

// Fastify requires fatal/error/warn/info/debug/trace/child on a custom logger.
// Winston has no fatal or trace levels, so they map to error/debug.
export const logger = {
  fatal: (message: string, meta?: any) => getLogger().error(message, meta),
  error: (message: string, meta?: any) => getLogger().error(message, meta),
  warn: (message: string, meta?: any) => getLogger().warn(message, meta),
  info: (message: string, meta?: any) => getLogger().info(message, meta),
  debug: (message: string, meta?: any) => getLogger().debug(message, meta),
  trace: (message: string, meta?: any) => getLogger().debug(message, meta),
  child: (bindings: Record<string, any>) => ({
    fatal: (message: string, meta?: any) => getLogger().error(message, { ...bindings, ...meta }),
    error: (message: string, meta?: any) => getLogger().error(message, { ...bindings, ...meta }),
    warn: (message: string, meta?: any) => getLogger().warn(message, { ...bindings, ...meta }),
    info: (message: string, meta?: any) => getLogger().info(message, { ...bindings, ...meta }),
    debug: (message: string, meta?: any) => getLogger().debug(message, { ...bindings, ...meta }),
    trace: (message: string, meta?: any) => getLogger().debug(message, { ...bindings, ...meta }),
  }),
};
