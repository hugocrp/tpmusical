import express, { type Express } from "express";
import type { WakeUpService } from "./application/WakeUpService.js";
import type { Logger } from "./application/ports/Logger.js";
import { createErrorHandler, createWakeUpHandler } from "./controllers/wakeUpController.js";

export function createApp(wakeUpService: WakeUpService, logger: Logger): Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json());
  app.post("/wakeup", createWakeUpHandler(wakeUpService));
  app.use(createErrorHandler(logger));

  return app;
}
