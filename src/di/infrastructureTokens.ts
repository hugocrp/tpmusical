import type { InjectionToken } from "tsyringe";
import type { Cache } from "../application/ports/Cache.js";
import type { Clock } from "../application/ports/Clock.js";
import type { HttpClient } from "../application/ports/HttpClient.js";
import type { MusicProvider } from "../application/ports/MusicProvider.js";
import type { UserPreferencesService } from "../application/ports/UserPreferencesService.js";
import type { Track, UserPreferences } from "../domain/types.js";
import type { LineWriter } from "../vendors/LineWriter.js";
import type { MockEmailClient } from "../vendors/MockEmailClient.js";
import type { MockPushService } from "../vendors/MockPushService.js";
import type { MockSmsGateway } from "../vendors/MockSmsGateway.js";

export const HTTP_CLIENT: InjectionToken<HttpClient> = Symbol("HttpClient");
export const HTTP_USER_AGENT: InjectionToken<string> = Symbol("HttpUserAgent");
export const HTTP_TIMEOUT_MS: InjectionToken<number> = Symbol("HttpTimeoutMs");
export const CLOCK: InjectionToken<Clock> = Symbol("Clock");

export const MUSIC_PROVIDER_CHAIN: InjectionToken<readonly MusicProvider[]> = Symbol("MusicProviderChain");
export const MUSIC_PROVIDER_NAME: InjectionToken<string> = Symbol("MusicProviderName");
export const MUSIC_PROVIDER_RATE_LIMIT: InjectionToken<number> = Symbol("MusicProviderRateLimit");
export const RAW_MUSIC_PROVIDER: InjectionToken<MusicProvider> = Symbol("RawMusicProvider");
export const RATE_LIMITED_MUSIC_PROVIDER: InjectionToken<MusicProvider> = Symbol("RateLimitedMusicProvider");
export const MUSIC_CACHE: InjectionToken<Cache<string, Track | null>> = Symbol("MusicCache");
export const CACHE_TTL_MS: InjectionToken<number> = Symbol("CacheTtlMs");

export const MOCK_EMAIL_CLIENT: InjectionToken<MockEmailClient> = Symbol("MockEmailClient");
export const MOCK_SMS_GATEWAY: InjectionToken<MockSmsGateway> = Symbol("MockSmsGateway");
export const MOCK_PUSH_SERVICE: InjectionToken<MockPushService> = Symbol("MockPushService");
export const MOCK_OUTPUT: InjectionToken<LineWriter> = Symbol("MockOutput");
export const SIMULATED_OUTAGES: InjectionToken<readonly string[]> = Symbol("SimulatedOutages");
export const EMAIL_SENDER: InjectionToken<string> = Symbol("EmailSender");

export const RAW_USER_PREFERENCES_SERVICE: InjectionToken<UserPreferencesService> = Symbol("RawUserPreferencesService");
export const PREFERENCES_CACHE: InjectionToken<Cache<string, UserPreferences>> = Symbol("PreferencesCache");
export const PREFERENCES_CACHE_FILE: InjectionToken<string> = Symbol("PreferencesCacheFile");
