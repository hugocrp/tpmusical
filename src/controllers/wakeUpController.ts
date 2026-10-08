import type { ErrorRequestHandler, RequestHandler } from "express";
import type { WakeUpService } from "../application/WakeUpService.js";
import type { Logger } from "../application/ports/Logger.js";
import { InvalidWakeUpRequestError, NotificationFailedError, UserNotFoundError } from "../domain/errors.js";
import { parseWakeUpRequest } from "./wakeUpRequest.js";

export function createWakeUpHandler(wakeUpService: WakeUpService): RequestHandler {
  return async (request, response) => {
    const result = await wakeUpService.wakeUp(parseWakeUpRequest(request.body));
    response.status(200).json(result);
  };
}

function isClientError(error: unknown): boolean {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === "number" && status >= 400 && status < 500;
}

export function createErrorHandler(logger: Logger): ErrorRequestHandler {
  return (error, _request, response, _next) => {
    if (error instanceof InvalidWakeUpRequestError) {
      response.status(400).json({ error: error.message });
      return;
    }
    if (isClientError(error)) {
      response.status(400).json({ error: "Demande de réveil invalide : corps JSON illisible" });
      return;
    }
    if (error instanceof UserNotFoundError) {
      response.status(404).json({ error: error.message });
      return;
    }
    if (error instanceof NotificationFailedError) {
      response.status(503).json({ error: error.message, incidents: error.incidents });
      return;
    }

    logger.warn(`Réveil en échec : ${error instanceof Error ? error.message : "erreur inconnue"}`);
    response.status(503).json({ error: "Réveil impossible pour le moment" });
  };
}
