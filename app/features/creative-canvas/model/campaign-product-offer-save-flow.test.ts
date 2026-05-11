import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createBlankCampaignRecord,
  createCampaignProductOffer,
  getPersistedCampaignRecord,
  saveCampaignProductOfferDetails,
} from "./creative-canvas.ts";

test("campaign save flow persists and retrieves editable offer pricing discounts and terms", () => {
  const storage = new MemoryStorage();

  createBlankCampaignRecord(storage, {
    id: "campaign_product_offer_save_flow",
    now: () => "2026-05-11T00:00:00.000Z",
  });

  const productOffer = createCampaignProductOffer({
    product: {
      title: "Creator Starter Kit",
      brand: "OwnCanvas Goods",
    },
    offer: {
      headline: "Creator launch bundle",
      summary: "Bundle for creator-led commerce tests.",
      price: {
        amount: 4900,
        currency: "USD",
        display: "$49",
      },
      discount: "20% launch discount",
      terms: "Valid through May 31, one redemption per customer.",
      destinationUrl: "https://shop.example.com/offers/creator-starter-kit",
      callToAction: "Shop the kit",
    },
  });

  const savedCampaign = saveCampaignProductOfferDetails(
    storage,
    "campaign_product_offer_save_flow",
    productOffer,
    {
      now: () => "2026-05-11T00:06:00.000Z",
    },
  );
  const retrievedCampaign = getPersistedCampaignRecord(
    storage,
    "campaign_product_offer_save_flow",
  );

  assert.deepEqual(savedCampaign.productOffer, productOffer);
  assert.equal(savedCampaign.updatedAt, "2026-05-11T00:06:00.000Z");
  assert.equal(
    retrievedCampaign?.productOffer.offer.terms,
    "Valid through May 31, one redemption per customer.",
  );
});

test("campaign product offer save flow rejects invalid offer information without overwriting the campaign", () => {
  const storage = new MemoryStorage();
  const campaign = createBlankCampaignRecord(storage, {
    id: "campaign_product_offer_invalid_save_flow",
    now: () => "2026-05-11T00:00:00.000Z",
  });

  assert.throws(
    () =>
      saveCampaignProductOfferDetails(
        storage,
        "campaign_product_offer_invalid_save_flow",
        createCampaignProductOffer({
          product: {
            title: "",
          },
          offer: {
            headline: "",
            destinationUrl: "shop.example.com/offer",
            callToAction: "",
            price: {
              amount: -100,
              currency: "US",
            },
          },
        }),
      ),
    /Invalid campaign product offer: product.title_required, offer.headline_required, offer.destination_url_invalid, offer.call_to_action_required, offer.price_invalid, offer.currency_invalid/,
  );

  assert.deepEqual(
    getPersistedCampaignRecord(
      storage,
      "campaign_product_offer_invalid_save_flow",
    )?.productOffer,
    campaign.productOffer,
  );
});

test("campaign product offer save flow rejects missing campaigns", () => {
  const storage = new MemoryStorage();

  assert.throws(
    () =>
      saveCampaignProductOfferDetails(
        storage,
        "missing_campaign",
        createCampaignProductOffer({
          product: {
            title: "Creator Starter Kit",
          },
          offer: {
            headline: "Creator launch bundle",
            destinationUrl: "https://shop.example.com/offers/creator-kit",
            callToAction: "Shop now",
          },
        }),
      ),
    /Campaign "missing_campaign" was not found./,
  );
});

class MemoryStorage implements Pick<Storage, "getItem" | "setItem"> {
  private readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}
