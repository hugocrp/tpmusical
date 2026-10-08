export interface EnvConfig {
  httpUserAgent: string;
  httpTimeoutMs: number;
  musicProviders: string[];
  musicCacheTtlMs: number;
  notificationChannels: string[];
  notificationRounds: number;
  notificationRetryDelayMs: number;
  preferencesCacheFile: string;
  emailSender: string;
  simulatedOutages: string[];
}

export const ENV_DEFAULTS = {
  HTTP_USER_AGENT: "ReveilMusical/1.0 (hugo.crepin@etu.mines-ales.fr)",
  HTTP_TIMEOUT_MS: "3000",
  MUSIC_PROVIDERS: "itunes,musicbrainz",
  MUSIC_CACHE_TTL_SECONDS: "86400",
  NOTIFICATION_CHANNELS: "email,sms,push",
  NOTIFICATION_ROUNDS: "3",
  NOTIFICATION_RETRY_DELAY_MS: "2000",
  PREFERENCES_CACHE_FILE: ".reveil-musical/preferences.json",
  EMAIL_SENDER: "reveil@reveil-musical.example",
  SIMULATED_OUTAGES: "",
} as const;

function parseList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 0);
}

function parsePositiveInteger(name: string, value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} invalide : "${value}" (entier strictement positif attendu)`);
  }
  return parsed;
}

export function loadEnvConfig(env: NodeJS.ProcessEnv = process.env): EnvConfig {
  return {
    httpUserAgent: env.HTTP_USER_AGENT ?? ENV_DEFAULTS.HTTP_USER_AGENT,
    httpTimeoutMs: parsePositiveInteger("HTTP_TIMEOUT_MS", env.HTTP_TIMEOUT_MS ?? ENV_DEFAULTS.HTTP_TIMEOUT_MS),
    musicProviders: parseList(env.MUSIC_PROVIDERS ?? ENV_DEFAULTS.MUSIC_PROVIDERS),
    musicCacheTtlMs:
      parsePositiveInteger("MUSIC_CACHE_TTL_SECONDS", env.MUSIC_CACHE_TTL_SECONDS ?? ENV_DEFAULTS.MUSIC_CACHE_TTL_SECONDS) *
      1000,
    notificationChannels: parseList(env.NOTIFICATION_CHANNELS ?? ENV_DEFAULTS.NOTIFICATION_CHANNELS),
    notificationRounds: parsePositiveInteger("NOTIFICATION_ROUNDS", env.NOTIFICATION_ROUNDS ?? ENV_DEFAULTS.NOTIFICATION_ROUNDS),
    notificationRetryDelayMs: parsePositiveInteger(
      "NOTIFICATION_RETRY_DELAY_MS",
      env.NOTIFICATION_RETRY_DELAY_MS ?? ENV_DEFAULTS.NOTIFICATION_RETRY_DELAY_MS,
    ),
    preferencesCacheFile: env.PREFERENCES_CACHE_FILE ?? ENV_DEFAULTS.PREFERENCES_CACHE_FILE,
    emailSender: env.EMAIL_SENDER ?? ENV_DEFAULTS.EMAIL_SENDER,
    simulatedOutages: parseList(env.SIMULATED_OUTAGES ?? ENV_DEFAULTS.SIMULATED_OUTAGES),
  };
}
