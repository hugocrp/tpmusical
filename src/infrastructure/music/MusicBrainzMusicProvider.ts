import { inject, injectable } from "tsyringe";
import type { HttpClient } from "../../application/ports/HttpClient.js";
import type { MusicProvider } from "../../application/ports/MusicProvider.js";
import { MusicProviderUnavailableError } from "../../domain/errors.js";
import type { Track } from "../../domain/types.js";
import { HTTP_CLIENT } from "../../di/infrastructureTokens.js";

interface MusicBrainzArtistCredit {
  name?: string;
  joinphrase?: string;
}

interface MusicBrainzRecording {
  title?: string;
  "artist-credit"?: MusicBrainzArtistCredit[];
}

interface MusicBrainzSearchResponse {
  recordings?: MusicBrainzRecording[];
}

const MUSICBRAINZ_RECORDING_URL = "https://musicbrainz.org/ws/2/recording";

@injectable()
export class MusicBrainzMusicProvider implements MusicProvider {
  constructor(@inject(HTTP_CLIENT) private readonly httpClient: HttpClient) {}

  async findTrack(query: string): Promise<Track | null> {
    const url = `${MUSICBRAINZ_RECORDING_URL}?query=${encodeURIComponent(query)}&fmt=json&limit=5`;

    let response: MusicBrainzSearchResponse;
    try {
      response = await this.httpClient.getJson<MusicBrainzSearchResponse>(url);
    } catch (cause) {
      throw new MusicProviderUnavailableError("MusicBrainz", "appel en échec", cause);
    }

    if (!Array.isArray(response?.recordings)) {
      throw new MusicProviderUnavailableError("MusicBrainz", "réponse inattendue");
    }

    for (const recording of response.recordings) {
      const artist = (recording["artist-credit"] ?? [])
        .map((credit) => `${credit.name ?? ""}${credit.joinphrase ?? ""}`)
        .join("")
        .trim();
      if (recording.title && artist) {
        return { title: recording.title, artist };
      }
    }
    return null;
  }
}
