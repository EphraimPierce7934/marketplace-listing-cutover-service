import test from "node:test";
import assert from "node:assert/strict";
import { decideOrderHandoff } from "../src/order_handoff.js";
import type { AggregateRequest, SellerAsset } from "../src/types.js";

test("marks a matched in-budget listing as ready for buyer handoff", () => {
  const request: AggregateRequest = {
    productName: "Analogue Pocket",
    includeDomains: ["example.com"],
    buyerUpdate: {
      buyerId: "buyer_1024",
      maxPrice: 350,
      shippingCountry: "US",
      orderReference: "ORD-AP-2048"
    },
    sourceQueue: "marketplace-source-refresh"
  };

  const chosenAsset: SellerAsset = {
    title: "Analogue Pocket Black Handheld",
    listingUrl: "https://example.com/listings/analogue-pocket-black",
    priceText: "$329",
    parsedPrice: 329,
    sellerHandle: "retro_seller",
    imageUrls: ["https://images.example.com/a.jpg"],
    summary: "Analogue Pocket Black Handheld | $329 | retro_seller"
  };

  const handoff = decideOrderHandoff({ request, chosenAsset });

  assert.equal(handoff.status, "ready_for_buyer");
  assert.equal(handoff.listingUrl, "https://example.com/listings/analogue-pocket-black");
  assert.match(handoff.buyerMessage, /buyer_1024/);
});
