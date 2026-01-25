import winston from "winston";
import { randomUUID } from "crypto";

export const createSessionLogger = (sessionId?: string, user?: string) => {
  const format = winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.printf((info) => {
      const sessionIdStr = sessionId ? `[${sessionId}]` : "";
      const userStr = user ? `[${user}]` : "";
      return `${info.timestamp} ${sessionIdStr}${userStr} ${info.level}: ${info.message}`;
    })
  );

  return winston.createLogger({
    level: "debug",
    format,
    transports: [new winston.transports.Console()],
  });
};

const logger = winston.createLogger({
  level: "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.printf(
      (info) => `${info.timestamp} ${info.level}: ${info.message}`
    )
  ),
  transports: [new winston.transports.Console()],
});

export const generateSessionId = (): string => randomUUID().substring(0, 8);

export default logger;
