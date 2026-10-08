import { InvalidWakeUpRequestError } from "../domain/errors.js";
import { DAYS_OF_WEEK, WEATHERS, type DayOfWeek, type WakeUpRequest, type Weather } from "../domain/types.js";

export const USAGE = `Usage : npm run wake -- <idUtilisateur> <jour> <meteo>
  jour  : ${DAYS_OF_WEEK.join(" | ")}
  meteo : ${WEATHERS.join(" | ")}`;

function parseOneOf<T extends string>(label: string, value: string, allowed: readonly T[]): T {
  const normalized = value.trim().toUpperCase();
  const match = allowed.find((candidate) => candidate === normalized);
  if (!match) {
    throw new InvalidWakeUpRequestError(`valeur "${value}" inconnue pour ${label} (attendu : ${allowed.join(" | ")})`);
  }
  return match;
}

export function parseWakeUpRequest(args: readonly string[]): WakeUpRequest {
  const [userId, day, weather] = args;
  if (args.length !== 3 || !userId?.trim() || day === undefined || weather === undefined) {
    throw new InvalidWakeUpRequestError("trois arguments attendus (idUtilisateur, jour, meteo)");
  }

  return {
    userId: userId.trim(),
    day: parseOneOf<DayOfWeek>("le jour", day, DAYS_OF_WEEK),
    weather: parseOneOf<Weather>("la météo", weather, WEATHERS),
  };
}
