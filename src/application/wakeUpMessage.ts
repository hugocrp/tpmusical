import type { DayOfWeek, Track, WakeUpMessage, Weather } from "../domain/types.js";

const WEATHER_LABELS: Record<Weather, string> = {
  SOLEIL: "grand soleil",
  PLUIE: "pluie",
  NEIGE: "neige",
  NUAGEUX: "ciel nuageux",
};

export function composeWakeUpMessage(context: { day: DayOfWeek; weather: Weather }, track: Track): WakeUpMessage {
  return {
    title: "Réveil musical",
    body: `Bonjour ! Nous sommes ${context.day.toLowerCase()}, ${WEATHER_LABELS[context.weather]} aujourd'hui. Votre morceau du jour : « ${track.title} » de ${track.artist}.`,
  };
}
