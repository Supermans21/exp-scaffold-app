import { useState } from "react";
import { Form, redirect, useLoaderData } from "react-router";
import qrcode from "qrcode";

import { login } from "../../shopify.server";
import { PUBLIC_LINKS, SiteFooter, SiteHeader } from "../../components/PublicChrome";

const SAMPLE_MODES = {
  cart: {
    id: "cart",
    label: "Cart checkout",
    title: "Merino Travel Pack",
    handle: "merino-pack-checkout",
    destinationLabel: "Direct cart checkout",
    url: "example-shop.myshopify.com/cart/4492018812:1?discount=PACK15",
    discount: "PACK15",
    summary:
      "Routes shoppers straight to checkout with your variant and discount applied.",
  },
  product: {
    id: "product",
    label: "Product page",
    title: "Ceramic Pour-Over Dripper",
    handle: "dripper-shelf-card",
    destinationLabel: "Storefront product detail",
    url: "example-shop.myshopify.com/products/ceramic-dripper?variant=982104",
    discount: "None",
    summary:
      "Opens the exact storefront product variant page when a label is scanned.",
  },
};

export const links = () => PUBLIC_LINKS;

export const meta = () => [
  { title: "QR Studio for Shopify checkout and product labels" },
  {
    name: "description",
    content:
      "Create scannable product and cart QR codes, discount tags, and retail stickers inside Shopify Admin.",
  },
];

export async function loader({ request }) {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  const qrOptions = {
    margin: 1,
    width: 360,
    color: {
      dark: "#1c2a26",
      light: "#fdfcf8",
    },
  };

  const [cartQrUrl, productQrUrl] = await Promise.all([
    qrcode.toDataURL(`https://${SAMPLE_MODES.cart.url}`, qrOptions),
    qrcode.toDataURL(`https://${SAMPLE_MODES.product.url}`, qrOptions),
  ]);

  return {
    showForm: Boolean(login),
    cartQrUrl,
    productQrUrl,
  };
}

export default function Index() {
  const { showForm, cartQrUrl, productQrUrl } = useLoaderData();
  const [selectedMode, setSelectedMode] = useState("cart");

  const activeSample = SAMPLE_MODES[selectedMode];
  const activeQrUrl = selectedMode === "cart" ? cartQrUrl : productQrUrl;

  return (
    <>
      <SiteHeader />

      <main>
        <section className="hero" id="shop-connect">
          <div className="container hero-grid">
            <div className="hero__copy">
              <h1>Scannable QR labels tied to Shopify checkout.</h1>
              <p className="lead">
                Generate product or cart QR codes, discount tags, and printable
                shop stickers.
              </p>

              {showForm ? (
                <Form
                  method="post"
                  action="/auth/login"
                  className="connect-form"
                >
                  <div className="field-group">
                    <label className="field-label" htmlFor="shop-domain">
                      Shopify store domain
                    </label>
                    <div className="field-row">
                      <input
                        id="shop-domain"
                        className="field-input"
                        type="text"
                        name="shop"
                        placeholder="my-store.myshopify.com"
                        autoComplete="url"
                        required
                      />
                      <button type="submit" className="btn btn--primary">
                        Open in Shopify
                      </button>
                    </div>
                  </div>
                  <p className="field-help">
                    Enter your myshopify.com domain to open QR Studio in Shopify
                    Admin.
                  </p>
                </Form>
              ) : null}
            </div>

            <div className="sticker-tray">
              <div className="sticker-tray__header">
                <span className="sticker-tray__title">
                  Sample sticker output
                </span>
                <div
                  className="mode-pills"
                  role="tablist"
                  aria-label="Preview destination mode"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={selectedMode === "cart"}
                    className={`mode-pill ${selectedMode === "cart" ? "is-active" : ""}`}
                    onClick={() => setSelectedMode("cart")}
                  >
                    Cart checkout
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={selectedMode === "product"}
                    className={`mode-pill ${selectedMode === "product" ? "is-active" : ""}`}
                    onClick={() => setSelectedMode("product")}
                  >
                    Product page
                  </button>
                </div>
              </div>

              <div className="sticker-sheet">
                <img
                  className="sticker-qr-img"
                  src={activeQrUrl}
                  width="244"
                  height="244"
                  alt={`Sample QR sticker for ${activeSample.title}`}
                />
                <div className="sticker-meta">
                  <div className="sticker-name">{activeSample.title}</div>
                  <div className="sticker-route">{activeSample.url}</div>
                  <div className="sticker-stub">
                    <span className="mono">{activeSample.handle}</span>
                    {activeSample.discount !== "None" ? (
                      <span className="seal-stamp seal-stamp--tilted">
                        Code {activeSample.discount}
                      </span>
                    ) : (
                      <span className="seal-stamp">Product link</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="sticker-tray__footer">
                <span>Route: {activeSample.destinationLabel}</span>
                <span>Exports: PNG, ZIP, 3-up print sheet</span>
              </div>
            </div>
          </div>
        </section>

        <section className="section-switcher" id="destinations">
          <div className="container">
            <div className="section-head-split">
              <h2>Two scan routes, one printed code.</h2>
              <p className="lead">
                Choose whether a scanned label opens the storefront product page
                or jumps straight into cart checkout.
              </p>
            </div>

            <div className="switcher-panel">
              <dl className="spec-list">
                <div className="spec-row">
                  <dt>Destination mode</dt>
                  <dd>{activeSample.destinationLabel}</dd>
                </div>
                <div className="spec-row">
                  <dt>Resolved path</dt>
                  <dd className="mono">{activeSample.url}</dd>
                </div>
                <div className="spec-row">
                  <dt>Discount code</dt>
                  <dd className="mono">{activeSample.discount}</dd>
                </div>
                <div className="spec-row">
                  <dt>Storage definition</dt>
                  <dd className="mono">$app:qr_code</dd>
                </div>
              </dl>

              <p>{activeSample.summary}</p>
            </div>
          </div>
        </section>

        <section className="band--ink" id="stickers">
          <div className="container">
            <div className="band-head">
              <h2>Print labels one by one or by sheet.</h2>
              <p className="lead">
                Every QR code stays synced with your Shopify catalog and exports
                without external layout tools.
              </p>
            </div>

            <div className="exports-grid">
              <div className="export-item">
                <h3>Shareable public QR card</h3>
                <p className="export-item__desc">
                  Clean public link for PNG downloads and single labels.
                </p>
                <span className="export-item__meta">Route: /qrcodes/:id</span>
              </div>
              <div className="export-item">
                <h3>Selected handle archive</h3>
                <p className="export-item__desc">
                  Bulk-export selected table rows as titled QR PNGs.
                </p>
                <span className="export-item__meta">Format: Batch ZIP</span>
              </div>
              <div className="export-item">
                <h3>Printable sticker sheets</h3>
                <p className="export-item__desc">
                  Cut-guided packaging grid with product title and code.
                </p>
                <span className="export-item__meta">Layout: 3-column sheet</span>
              </div>
            </div>
          </div>
        </section>

        <section className="section-faq" id="faq">
          <div className="container faq-layout">
            <h2>Common questions.</h2>
            <div className="faq-list">
              <div className="faq-row">
                <h3>Where are codes saved?</h3>
                <p>Inside Shopify as app-owned metaobjects.</p>
              </div>
              <div className="faq-row">
                <h3>Do scans apply discounts?</h3>
                <p>Yes, active codes attach on redirect.</p>
              </div>
              <div className="faq-row">
                <h3>How are scans counted?</h3>
                <p>Each scan increments its counter via API.</p>
              </div>
              <div className="faq-row">
                <h3>What if products change?</h3>
                <p>Labels resolve updated handles dynamically.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="close-band">
          <div className="container close-band__row">
            <div className="close-band__copy">
              <h2>Open inside Shopify Admin.</h2>
            </div>
            <a href="#shop-connect" className="btn btn--primary">
              Connect store
            </a>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
