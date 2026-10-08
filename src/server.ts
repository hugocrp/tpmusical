import "reflect-metadata";
import { createApp } from "./app.js";
import { WakeUpService } from "./application/WakeUpService.js";
import { loadEnvConfig } from "./config/env.js";
import { buildContainer } from "./container.js";
import { LOGGER } from "./di/tokens.js";

const config = loadEnvConfig();
const container = buildContainer(config);
const app = createApp(container.resolve(WakeUpService), container.resolve(LOGGER));

app.listen(config.port, () => {
  console.log(`Réveil musical à l'écoute sur http://localhost:${config.port}`);
  console.log(`Fournisseurs : ${config.musicProviders.join(", ") || "secours local seul"} | Canaux : ${config.notificationChannels.join(", ")}`);
});
