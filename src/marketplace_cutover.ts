import { aggregateListings } from "./listing_aggregator.js";

const sampleRequest = {
  productName: "Analogue Pocket",
  includeDomains: ["ebay.com", "mercari.com"],
  buyerUpdate: {
    buyerId: "buyer_1024",
    maxPrice: 350,
    shippingCountry: "US",
    orderReference: "ORD-AP-2048"
  },
  sourceQueue: "marketplace-source-refresh"
};

const result = await aggregateListings(sampleRequest);

console.log(JSON.stringify({
  query: result.query,
  chosenListing: result.chosenAsset?.listingUrl ?? null,
  handoffStatus: result.handoff.status,
  buyerMessage: result.handoff.buyerMessage,
  scrapedCount: result.sellerAssets.length
}, null, 2));
