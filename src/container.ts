import { container as rootContainer, instanceCachingFactory, type DependencyContainer } from "tsyringe";
import { FailoverNotifier } from "./application/FailoverNotifier.js";
import { DayAndWeatherTrackSelectionPolicy } from "./application/DayAndWeatherTrackSelectionPolicy.js";
import type { MusicProvider } from "./application/ports/MusicProvider.js";
import type { EnvConfig } from "./config/env.js";
import {
  MUSIC_PROVIDER_REGISTRY,
  notificationChannelAdapter,
  resolveMusicProviders,
  resolveNotificationChannels,
  type MusicProviderName,
} from "./config/providers.js";
import {
  CACHE_TTL_MS,
  CLOCK,
  EMAIL_SENDER,
  HTTP_CLIENT,
  HTTP_TIMEOUT_MS,
  HTTP_USER_AGENT,
  MOCK_EMAIL_CLIENT,
  MOCK_OUTPUT,
  MOCK_PUSH_SERVICE,
  MOCK_SMS_GATEWAY,
  MUSIC_CACHE,
  MUSIC_PROVIDER_CHAIN,
  MUSIC_PROVIDER_NAME,
  MUSIC_PROVIDER_RATE_LIMIT,
  RATE_LIMITED_MUSIC_PROVIDER,
  RAW_MUSIC_PROVIDER,
  SIMULATED_OUTAGES,
} from "./di/infrastructureTokens.js";
import {
  FALLBACK_TRACK_SOURCE,
  LOGGER,
  MUSIC_PROVIDER,
  NOTIFICATION_CHANNELS,
  NOTIFIER,
  TRACK_SELECTION_POLICY,
  USER_PREFERENCES_SERVICE,
} from "./di/tokens.js";
import { InMemoryCache } from "./infrastructure/cache/InMemoryCache.js";
import { FetchHttpClient } from "./infrastructure/http/FetchHttpClient.js";
import { ConsoleLogger } from "./infrastructure/logging/ConsoleLogger.js";
import { CachingMusicProvider } from "./infrastructure/music/CachingMusicProvider.js";
import { FailoverMusicProvider } from "./infrastructure/music/FailoverMusicProvider.js";
import { LocalFallbackTrackSource } from "./infrastructure/music/LocalFallbackTrackSource.js";
import { RateLimitedMusicProvider } from "./infrastructure/music/RateLimitedMusicProvider.js";
import { InMemoryUserPreferencesService } from "./infrastructure/preferences/InMemoryUserPreferencesService.js";
import { SystemClock } from "./infrastructure/time/SystemClock.js";
import { ConsoleLineWriter } from "./vendors/ConsoleLineWriter.js";
import { MockEmailClient } from "./vendors/MockEmailClient.js";
import { MockPushService } from "./vendors/MockPushService.js";
import { MockSmsGateway } from "./vendors/MockSmsGateway.js";

function resolveProtectedMusicProvider(parent: DependencyContainer, name: MusicProviderName): MusicProvider {
  const registration = MUSIC_PROVIDER_REGISTRY[name];
  const scope = parent.createChildContainer();

  scope.registerInstance(MUSIC_PROVIDER_NAME, name);
  scope.registerInstance(MUSIC_PROVIDER_RATE_LIMIT, registration.maxRequestsPerMinute);
  scope.registerSingleton(RAW_MUSIC_PROVIDER, registration.adapter);
  scope.registerSingleton(RATE_LIMITED_MUSIC_PROVIDER, RateLimitedMusicProvider);
  scope.registerSingleton(MUSIC_CACHE, InMemoryCache);

  return scope.resolve(CachingMusicProvider);
}

export function buildContainer(config: EnvConfig): DependencyContainer {
  const container = rootContainer.createChildContainer();
  const musicProviders = resolveMusicProviders(config.musicProviders);
  const notificationChannels = resolveNotificationChannels(config.notificationChannels);

  container.registerInstance(HTTP_USER_AGENT, config.httpUserAgent);
  container.registerInstance(HTTP_TIMEOUT_MS, config.httpTimeoutMs);
  container.registerInstance(CACHE_TTL_MS, config.musicCacheTtlMs);
  container.registerInstance(EMAIL_SENDER, config.emailSender);
  container.registerInstance(SIMULATED_OUTAGES, config.simulatedChannelOutages);

  container.registerSingleton(LOGGER, ConsoleLogger);
  container.registerSingleton(CLOCK, SystemClock);
  container.registerSingleton(HTTP_CLIENT, FetchHttpClient);

  container.registerSingleton(USER_PREFERENCES_SERVICE, InMemoryUserPreferencesService);
  container.registerSingleton(TRACK_SELECTION_POLICY, DayAndWeatherTrackSelectionPolicy);

  container.register(MUSIC_PROVIDER_CHAIN, {
    useFactory: instanceCachingFactory((scope) => musicProviders.map((name) => resolveProtectedMusicProvider(scope, name))),
  });
  container.registerSingleton(MUSIC_PROVIDER, FailoverMusicProvider);
  container.registerSingleton(FALLBACK_TRACK_SOURCE, LocalFallbackTrackSource);

  container.registerSingleton(MOCK_OUTPUT, ConsoleLineWriter);
  container.registerSingleton(MOCK_EMAIL_CLIENT, MockEmailClient);
  container.registerSingleton(MOCK_SMS_GATEWAY, MockSmsGateway);
  container.registerSingleton(MOCK_PUSH_SERVICE, MockPushService);
  container.register(NOTIFICATION_CHANNELS, {
    useFactory: instanceCachingFactory((scope) =>
      Object.fromEntries(notificationChannels.map((name) => [name, scope.resolve(notificationChannelAdapter(name))])),
    ),
  });
  container.registerSingleton(NOTIFIER, FailoverNotifier);

  return container;
}
