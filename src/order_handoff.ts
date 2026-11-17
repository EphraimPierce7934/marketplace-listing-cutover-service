import type { AggregateRequest, BuyerHandoff, SellerAsset } from "./types.js";

export function decideOrderHandoff(input: {
  request: AggregateRequest;
  chosenAsset: SellerAsset | null;
}): BuyerHandoff {
  const asset = input.chosenAsset;

  if (!asset) {
    return {
      status: "needs_review",
      reason: "No marketplace listing matched the requested product.",
      listingUrl: null,
      buyerMessage: `Could not confirm a listing for order ${input.request.buyerUpdate.orderReference}.`,
    };
  }

  if (asset.parsedPrice === null) {
    return {
      status: "needs_review",
      reason: "Matched listing is missing a usable price.",
      listingUrl: asset.listingUrl,
      buyerMessage: `Listing found for order ${input.request.buyerUpdate.orderReference}, but price needs review.`,
    };
  }

  if (asset.parsedPrice > input.request.buyerUpdate.maxPrice) {
    return {
      status: "needs_review",
      reason: "Matched listing is above the buyer price limit.",
      listingUrl: asset.listingUrl,
      buyerMessage: `Listing found for order ${input.request.buyerUpdate.orderReference}, but it is above the buyer budget.`,
    };
  }

  if (!asset.sellerHandle || asset.imageUrls.length === 0) {
    return {
      status: "needs_review",
      reason: "Matched listing is missing seller or image details.",
      listingUrl: asset.listingUrl,
      buyerMessage: `Listing found for order ${input.request.buyerUpdate.orderReference}, but seller details need review.`,
    };
  }

  return {
    status: "ready_for_buyer",
    reason: "Matched listing is within budget and has seller details for handoff.",
    listingUrl: asset.listingUrl,
    buyerMessage: `Send buyer ${input.request.buyerUpdate.buyerId} the listing ${asset.listingUrl} for order ${input.request.buyerUpdate.orderReference}.`,
  };
}
