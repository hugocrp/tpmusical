export interface EnvConfig {
  httpUserAgent: string;
  httpTimeoutMs: number;
  musicProviders: string[];
  musicCacheTtlMs: number;
  notificationChannels: string[];
  emailSender: string;
  simulatedChannelOutages: string[];
}

export const ENV_DEFAULTS = {
  HTTP_USER_AGENT: "ReveilMusical/1.0 (hugo.crepin@etu.mines-ales.fr)",
  HTTP_TIMEOUT_MS: "3000",
  MUSIC_PROVIDERS: "itunes,musicbrainz",
  MUSIC_CACHE_TTL_SECONDS: "86400",
  NOTIFICATION_CHANNELS: "email,sms,push",
  EMAIL_SENDER: "reveil@reveil-musical.example",
  SIMULATED_CHANNEL_OUTAGES: "",
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
    emailSender: env.EMAIL_SENDER ?? ENV_DEFAULTS.EMAIL_SENDER,
    simulatedChannelOutages: parseList(env.SIMULATED_CHANNEL_OUTAGES ?? ENV_DEFAULTS.SIMULATED_CHANNEL_OUTAGES),
  };
}
