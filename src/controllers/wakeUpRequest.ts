import { InvalidWakeUpRequestError } from "../domain/errors.js";
import { DAYS_OF_WEEK, WEATHERS, type WakeUpRequest } from "../domain/types.js";

function readText(body: Record<string, unknown>, field: string): string {
  const value = body[field];
  if (typeof value !== "string" || value.trim() === "") {
    throw new InvalidWakeUpRequestError(`le champ "${field}" est obligatoire (texte non vide)`);
  }
  return value.trim();
}

function readOneOf<T extends string>(body: Record<string, unknown>, field: string, allowed: readonly T[]): T {
  const value = readText(body, field);
  const match = allowed.find((candidate) => candidate === value.toUpperCase());
  if (!match) {
    throw new InvalidWakeUpRequestError(`valeur "${value}" inconnue pour "${field}" (attendu : ${allowed.join(" | ")})`);
  }
  return match;
}

export function parseWakeUpRequest(body: unknown): WakeUpRequest {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new InvalidWakeUpRequestError("un objet JSON est attendu (userId, day, weather)");
  }
  const fields = body as Record<string, unknown>;

  return {
    userId: readText(fields, "userId"),
    day: readOneOf(fields, "day", DAYS_OF_WEEK),
    weather: readOneOf(fields, "weather", WEATHERS),
  };
}
