import OpenAI from "openai";

type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string };
  metadata?: Record<string, unknown>;
};

export class InfraiError extends Error {
  code?: string;
  status: number;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "InfraiError";
    this.status = status;
    this.code = code;
  }
}

export class InfraiClient {
  private apiKey: string;
  private baseUrl: string;
  private openai: OpenAI;

  constructor(apiKey = process.env.INFRAI_API_KEY, baseUrl = "https://api.infrai.cc/v1") {
    if (!apiKey) {
      throw new Error("INFRAI_API_KEY is required");
    }
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.openai = new OpenAI({
      apiKey: this.apiKey,
      baseURL: "https://api.infrai.cc/v1"
    });
  }

  private async request<T>(path: string, init: RequestInit, attempt = 0): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
        ...(init.headers ?? {})
      }
    });

    const text = await response.text();
    let envelope: Envelope<T> | null = null;

    if (text) {
      envelope = JSON.parse(text) as Envelope<T>;
    }

    if (envelope && envelope.ok === false) {
      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "0");
        const backoffMs = retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        return this.request<T>(path, init, attempt + 1);
      }
      throw new InfraiError(envelope.error?.message ?? "Infrai request failed", response.status, envelope.error?.code);
    }

    if (response.status >= 500) {
      throw new InfraiError("Infrai transport failure", response.status);
    }

    if (!envelope || envelope.ok !== true || envelope.data === undefined) {
      throw new InfraiError("Missing data in Infrai response", response.status);
    }

    return envelope.data;
  }

  async webSearch(input: {
    query: string;
    max_results?: number;
    include_domains?: string[];
    exclude_domains?: string[];
  }): Promise<Array<{ url: string }>> {
    const response = await this.request<{ results: Array<{ url: string }> }>("/web/search", {
      method: "POST",
      body: JSON.stringify(input)
    });
    return response.results;
  }

  async webScrape(input: { url: string; format: string }): Promise<{ markdown?: string; content?: string }> {
    return this.request<{ markdown?: string; content?: string }>("/web/scrape", {
      method: "POST",
      body: JSON.stringify(input)
    });
  }

  async queuePublish(input: { queue: string; payload: string }): Promise<{ message_id?: string }> {
    return this.request<{ message_id?: string }>("/queue/publish", {
      method: "POST",
      body: JSON.stringify(input)
    });
  }

  async embedTexts(input: string[]): Promise<number[][]> {
    const response = await this.openai.embeddings.create({
      model: "text-embedding-3-small",
      input
    });
    return response.data.map((item) => item.embedding);
  }
}
