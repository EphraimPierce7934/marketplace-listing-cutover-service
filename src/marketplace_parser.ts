import type { SellerAsset } from "./types.js";

function firstMatch(text: string, pattern: RegExp): string | null {
  const match = text.match(pattern);
  return match?.[1]?.trim() ?? null;
}

function extractImageUrls(markdown: string): string[] {
  const matches = [...markdown.matchAll(/!\[[^\]]*\]\((https?:\/\/[^)]+)\)/g)];
  return matches.map((match) => match[1]);
}

function parsePrice(priceText: string): number | null {
  const match = priceText.replace(/,/g, "").match(/(\d+(?:\.\d{1,2})?)/);
  return match ? Number(match[1]) : null;
}

export function parseSellerAsset(args: { url: string; markdown: string }): SellerAsset {
  const markdown = args.markdown;
  const title = firstMatch(markdown, /^#\s+(.+)$/m) ?? firstMatch(markdown, /^##\s+(.+)$/m) ?? args.url;
  const priceText = firstMatch(markdown, /(\$\s?\d[\d,]*(?:\.\d{1,2})?)/) ?? "unknown";
  const sellerHandle = firstMatch(markdown, /(?:seller|sold by|vendor)\s*[:\-]\s*([A-Za-z0-9_\-.@]+)/i);
  const imageUrls = extractImageUrls(markdown);
  const summary = [title, priceText, sellerHandle ?? "unknown seller"].join(" | ");

  return {
    title,
    listingUrl: args.url,
    priceText,
    parsedPrice: parsePrice(priceText),
    sellerHandle,
    imageUrls,
    summary,
  };
}
