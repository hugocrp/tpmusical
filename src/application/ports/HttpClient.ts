export interface HttpClient {
  getJson<T>(url: string): Promise<T>;
}
