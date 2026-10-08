import { inject, injectable } from "tsyringe";
import type { HttpClient } from "../../application/ports/HttpClient.js";
import { HTTP_TIMEOUT_MS, HTTP_USER_AGENT } from "../../di/infrastructureTokens.js";

@injectable()
export class FetchHttpClient implements HttpClient {
  constructor(
    @inject(HTTP_USER_AGENT) private readonly userAgent: string,
    @inject(HTTP_TIMEOUT_MS) private readonly timeoutMs: number,
  ) {}

  async getJson<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": this.userAgent,
      },
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!response.ok) {
      throw new Error(`Requête HTTP échouée (${response.status}) vers ${url}`);
    }

    return (await response.json()) as T;
  }
}
