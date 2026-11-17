import { z } from "zod";

export const aggregateRequestSchema = z.object({
  productName: z.string().min(1),
  includeDomains: z.array(z.string().min(1)).min(1),
  buyerUpdate: z.object({
    buyerId: z.string().min(1),
    maxPrice: z.number().positive(),
    shippingCountry: z.string().min(2),
    orderReference: z.string().min(1)
  }),
  sourceQueue: z.string().min(1)
});

export type AggregateRequest = z.infer<typeof aggregateRequestSchema>;

export type SellerAsset = {
  title: string;
  listingUrl: string;
  priceText: string;
  parsedPrice: number | null;
  sellerHandle: string | null;
  imageUrls: string[];
  summary: string;
};

export type BuyerHandoff = {
  status: "ready_for_buyer" | "needs_review";
  reason: string;
  listingUrl: string | null;
  buyerMessage: string;
};

export type AggregationResult = {
  query: string;
  sellerAssets: SellerAsset[];
  chosenAsset: SellerAsset | null;
  handoff: BuyerHandoff;
};
