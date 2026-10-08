import { inject, injectable } from "tsyringe";
import type { HttpClient } from "../../application/ports/HttpClient.js";
import type { MusicProvider } from "../../application/ports/MusicProvider.js";
import { MusicProviderUnavailableError } from "../../domain/errors.js";
import type { Track } from "../../domain/types.js";
import { HTTP_CLIENT } from "../../di/infrastructureTokens.js";

interface ItunesResult {
  trackName?: string;
  artistName?: string;
  trackViewUrl?: string;
}

interface ItunesSearchResponse {
  results?: ItunesResult[];
}

const ITUNES_SEARCH_URL = "https://itunes.apple.com/search";

@injectable()
export class ItunesMusicProvider implements MusicProvider {
  constructor(@inject(HTTP_CLIENT) private readonly httpClient: HttpClient) {}

  async findTrack(query: string): Promise<Track | null> {
    const url = `${ITUNES_SEARCH_URL}?term=${encodeURIComponent(query)}&media=music&limit=5`;

    let response: ItunesSearchResponse;
    try {
      response = await this.httpClient.getJson<ItunesSearchResponse>(url);
    } catch (cause) {
      throw new MusicProviderUnavailableError("iTunes", "appel en échec", cause);
    }

    if (!Array.isArray(response?.results)) {
      throw new MusicProviderUnavailableError("iTunes", "réponse inattendue");
    }

    for (const result of response.results) {
      if (result.trackName && result.artistName) {
        return { title: result.trackName, artist: result.artistName };
      }
    }
    return null;
  }
}
