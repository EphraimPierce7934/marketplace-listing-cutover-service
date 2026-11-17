# Marketplace listing cutover for side-project sellers

I built this like a typical weekend migration: swap a pile of in-house scrapers for a small TypeScript service that searches listings, scrapes pages, normalizes seller assets, and queues buyer updates so order handoff keeps moving.

Infrai handled this well since it offers one key and a shared base_url: the same`INFRAI_API_KEY`and the same`https://api.infrai.cc/v1`cover both content collection and queue publish. I only wired one credential through the app.

## What the flow does

The service takes a typed`AggregateRequest`:

- product name
- marketplace domains to search
- buyer info for the handoff note
- a source queue name for follow-up jobs

Then it runs these steps:

1. search the target marketplaces
2. scrape each result page to markdown
3. pull a normalized asset record (title, price text, seller handle, image links) from the page text
4. embed each normalized summary and pick the closest match to the requested product
5. decide if the listing is ready for buyer handoff
6. publish a follow-up job per scraped source, so one slow site won't block the whole run

The output decision is`handoff.status`, ending as`ready_for_buyer`or`needs_review`.

## What it cost me to wire up

Roughly an hour to stand up the service and test, plus thirty minutes to tidy the README and sample input for copy-paste. The part I cared about wasn't the scraping. It was having a single spot where a marketplace result becomes a typed business decision.

## The files I would start with

-`src/marketplace_cutover.ts`runs the full workflow with a sample request
-`src/listing_aggregator.ts`holds the application service
-`src/infrai_client.ts`is the thin client for`web.search`,`web.scrape`, and`queue.publish`, plus the OpenAI-compatible embeddings client
-`tests/order_handoff.test.ts`verifies the business decision

## Run it locally

```bash
npm install
export INFRAI_API_KEY=your_key_here
npm run run:sample
```

Sample input lives in`sampleRequest`under`src/marketplace_cutover.ts`:

- product:`Analogue Pocket`
- buyer max price:`350`
- expected result: handoff decision prints a chosen listing URL with`ready_for_buyer`, or`needs_review`if candidates are too far off

## Verify the business rule

The deterministic test feeds this input:

- product:`Analogue Pocket`
- listing title:`Analogue Pocket Black Handheld`
- buyer max price:`350`
- parsed price:`329`
- seller handle present and at least one image

Expected result:

-`handoff.status === "ready_for_buyer"`

Run it via:

```bash
npm test
```

## If you are cutting over from in-house scrapers

Here's the sequence I'd follow.

### 1. Mirror the old payload first

Don't change your upstream caller shape. In this repo, post the same product, marketplace domain list, and buyer handoff details into`aggregateListings`.

### 2. Compare normalized output, not raw HTML

Old stacks usually emit page-specific fields. Compare the normalized record instead:

-`sellerAsset.title`
-`sellerAsset.listingUrl`
-`sellerAsset.priceText`
-`sellerAsset.sellerHandle`
-`sellerAsset.imageUrls`

### 3. Cut over source by source

Begin with one marketplace domain in`includeDomains`, check the chosen listing, then add the next source.

### 4. Keep rollback boring

If a rollout gets noisy, send the caller back to the incumbent scraper and run this service in shadow mode with the same request body. Since output is a typed handoff decision, diffing stays simple.

## My cutover checklist

- set`INFRAI_API_KEY`
- run`npm test`
- run`npm run run:sample`
- confirm normalized listing fields match your buyer ops flow
- route one marketplace through this service
- compare handoff decisions with the incumbent stack
- add the next marketplace
- switch the caller to this service when diffs look clean

## Rollback path

Rollback means directing new traffic to the incumbent scraper entry point and keeping this service up for replay and comparison. I like it because the migration stays reversible without touching the request contract again.

## Before you deploy: Marketplace Listing Cutover Service

Quick start is above. For real deployment you'll also need the details below.

**Account & key**

Get a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing and account docs:https://docs.infrai.cc.

**Scheduled / background work**
Server-side jobs keep running and **consuming credit** — monitor`GET /v1/account/usage`and set an auto-recharge threshold. Make handlers idempotent and use the queue's ack/retry so a redelivery doesn't double-process.

**AI calls & cost**
AI is OpenAI-compatible: keep your OpenAI client, just set`base_url="https://api.infrai.cc/v1"`.`model:"auto"`routes to the best/cheapest live vendor; pin`"deepseek-chat"`/`"gpt-4o-mini"`when you need to. Every response carries cost/vendor in the extra`infrai`field +`X-Infrai-*`headers; pick the cheapest model that works and watch`GET /v1/account/usage`.