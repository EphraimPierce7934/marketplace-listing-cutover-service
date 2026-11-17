import { aggregateRequestSchema, type AggregateRequest, type AggregationResult, type SellerAsset } from "./types.js";
import { InfraiClient } from "./infrai_client.js";
import { parseSellerAsset } from "./marketplace_parser.js";
import { decideOrderHandoff } from "./order_handoff.js";

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

export async function aggregateListings(
  rawRequest: unknown,
  infrai = new InfraiClient()
): Promise<AggregationResult> {
  const request: AggregateRequest = aggregateRequestSchema.parse(rawRequest);

  const searchResults = await infrai.webSearch({
    query: `${request.productName} marketplace listing`,
    max_results: 5,
    include_domains: request.includeDomains
  });

  const sellerAssets: SellerAsset[] = [];

  for (const result of searchResults) {
    const scraped = await infrai.webScrape({
      url: result.url,
      format: "markdown"
    });

    const markdown = scraped.markdown ?? scraped.content ?? "";
    const asset = parseSellerAsset({ url: result.url, markdown });
    sellerAssets.push(asset);

    await infrai.queuePublish({
      queue: request.sourceQueue,
      payload: JSON.stringify({
        productName: request.productName,
        sourceUrl: result.url,
        sellerAsset: asset,
        buyerUpdate: request.buyerUpdate
      })
    });

  }

  let chosenAsset: SellerAsset | null = null;

  if (sellerAssets.length > 0) {
    const embeddings = await infrai.embedTexts([
      request.productName,
      ...sellerAssets.map((asset) => asset.summary)
    ]);

    const queryEmbedding = embeddings[0];
    let bestScore = -1;

    for (let i = 0; i < sellerAssets.length; i += 1) {
      const score = cosineSimilarity(queryEmbedding, embeddings[i + 1]);
      if (score > bestScore) {
        bestScore = score;
        chosenAsset = sellerAssets[i];
      }
    }
  }

  const handoff = decideOrderHandoff({ request, chosenAsset });

  return {
    query: request.productName,
    sellerAssets,
    chosenAsset,
    handoff
  };
}
