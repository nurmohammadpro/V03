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
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
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

// Log levels: error, warn, info, debug, trace
export const logger = {
  error: (message: string, meta?: any) => getLogger().error(message, meta),
  warn: (message: string, meta?: any) => getLogger().warn(message, meta),
  info: (message: string, meta?: any) => getLogger().info(message, meta),
  debug: (message: string, meta?: any) => getLogger().debug(message, meta),
  trace: (message: string, meta?: any) => getLogger().debug(message, meta),
};
