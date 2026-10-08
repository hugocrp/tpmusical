import { describe, expect, it } from "vitest";
import { DayAndWeatherTrackSelectionPolicy } from "../../src/application/DayAndWeatherTrackSelectionPolicy.js";
import { composeWakeUpMessage } from "../../src/application/wakeUpMessage.js";
import { WEATHERS } from "../../src/domain/types.js";
import { ALICE } from "../fakes/fixtures.js";

describe("DayAndWeatherTrackSelectionPolicy", () => {
  const policy = new DayAndWeatherTrackSelectionPolicy();

  it("retourne en priorité le morceau choisi pour ce jour et cette météo", () => {
    expect(policy.select(ALICE, { day: "DIMANCHE", weather: "PLUIE" })).toBe("Sunday Morning");
  });

  it("le même temps ne donne pas le même morceau selon le jour", () => {
    expect(policy.select(ALICE, { day: "DIMANCHE", weather: "PLUIE" })).not.toBe(
      policy.select(ALICE, { day: "LUNDI", weather: "PLUIE" }),
    );
  });

  it("jour sans choix particulier pour cette météo -> morceau choisi pour la météo", () => {
    expect(policy.select(ALICE, { day: "DIMANCHE", weather: "SOLEIL" })).toBe("Here Comes the Sun");
    expect(policy.select(ALICE, { day: "LUNDI", weather: "SOLEIL" })).toBe("Here Comes the Sun");
    expect(policy.select(ALICE, { day: "LUNDI", weather: "PLUIE" })).toBe("Riders on the Storm");
  });

  it("ni le jour ni la météo ne sont couverts -> morceau de secours de l'utilisateur", () => {
    expect(policy.select(ALICE, { day: "DIMANCHE", weather: "NEIGE" })).toBe("Good Morning");
    expect(policy.select(ALICE, { day: "LUNDI", weather: "NEIGE" })).toBe("Good Morning");
    expect(policy.select(ALICE, { day: "LUNDI", weather: "NUAGEUX" })).toBe("Good Morning");
  });
});

describe("composeWakeUpMessage", () => {
  it("mentionne le jour, la météo, le titre et l'artiste", () => {
    const message = composeWakeUpMessage({ day: "SAMEDI", weather: "NEIGE" }, { title: "Let It Snow", artist: "Dean Martin" });

    expect(message.title).toBe("Réveil musical");
    expect(message.body).toBe(
      "Bonjour ! Nous sommes samedi, neige aujourd'hui. Votre morceau du jour : « Let It Snow » de Dean Martin.",
    );
  });

  it.each(WEATHERS)("sait décrire la météo %s", (weather) => {
    const message = composeWakeUpMessage({ day: "LUNDI", weather }, { title: "Titre", artist: "Artiste" });

    expect(message.body).not.toContain("undefined");
  });
});
