import type { HttpClient } from "../../src/application/ports/HttpClient.js";

export class FakeHttpClient implements HttpClient {
  public readonly requestedUrls: string[] = [];
  private readonly routes: { urlPart: string; response: unknown }[] = [];

  constructor(private defaultResponse: unknown = undefined) {}

  respondWith(response: unknown): this {
    this.defaultResponse = response;
    return this;
  }

  failWith(error: Error): this {
    this.defaultResponse = error;
    return this;
  }

  route(urlPart: string, response: unknown): this {
    this.routes.unshift({ urlPart, response });
    return this;
  }

  async getJson<T>(url: string): Promise<T> {
    this.requestedUrls.push(url);
    const route = this.routes.find((candidate) => url.includes(candidate.urlPart));
    const response = route ? route.response : this.defaultResponse;
    if (response instanceof Error) {
      throw response;
    }
    return response as T;
  }
}
