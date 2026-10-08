import "reflect-metadata";
import { WakeUpService } from "./application/WakeUpService.js";
import { USAGE, parseWakeUpRequest } from "./cli/parseWakeUpRequest.js";
import { loadEnvConfig } from "./config/env.js";
import { buildContainer } from "./container.js";
import { InvalidWakeUpRequestError } from "./domain/errors.js";

try {
  const request = parseWakeUpRequest(process.argv.slice(2));
  const wakeUpService = buildContainer(loadEnvConfig()).resolve(WakeUpService);

  const result = await wakeUpService.wakeUp(request);

  console.log(
    `Réveil envoyé à ${result.userId} par ${result.channel} : « ${result.track.title} » de ${result.track.artist} (${result.trackSource})`,
  );
  if (result.degraded) {
    console.log(`Mode dégradé : ${result.incidents.join(" ; ")}`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  if (error instanceof InvalidWakeUpRequestError) {
    console.error(USAGE);
  }
  process.exitCode = 1;
}
