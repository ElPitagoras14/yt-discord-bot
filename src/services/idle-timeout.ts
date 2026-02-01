import { AUDIO_CONSTANTS } from "../constants/audio.js";
import logger from "../logger.js";
import { Queue } from "../types/queue.js";

/**
 * Clear existing idle timeout to prevent disconnection
 */
export const clearIdleTimeout = (queue: Queue): void => {
  if (queue.idleTimer) {
    clearTimeout(queue.idleTimer);
    queue.idleTimer = null;
  }
};

/**
 * Start idle timeout to disconnect bot after inactivity
 * Uses setImmediate to ensure non-blocking execution
 */
export const startIdleTimeout = (queue: Queue, onTimeout: () => void): void => {
  clearIdleTimeout(queue);

  const timeoutDuration = AUDIO_CONSTANTS.TIMEOUTS.IDLE_DISCONNECT;

  // Prevent invalid timeout durations that could cause issues
  if (timeoutDuration <= 0 || !Number.isInteger(timeoutDuration)) {
    logger.error(
      `Invalid timeout duration: ${timeoutDuration} (type: ${typeof timeoutDuration}). Must be positive integer.`,
    );
    return;
  }

  queue.idleTimer = setTimeout(() => {
    logger.info("Bot idle timeout reached, disconnecting...");

    // Use setImmediate to avoid blocking the event loop
    setImmediate(() => {
      try {
        onTimeout();
      } catch (error) {
        logger.error(`Error in idle timeout callback: ${error}`);
      }
    });
  }, timeoutDuration);
};

/**
 * Reset idle timeout - useful when user interacts again
 * Prevents bot disconnecting during active usage
 */
export const resetIdleTimeout = (queue: Queue, onTimeout: () => void): void => {
  startIdleTimeout(queue, onTimeout);
};
