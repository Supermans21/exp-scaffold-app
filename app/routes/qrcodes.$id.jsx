import invariant from "tiny-invariant";
import { Link, isRouteErrorResponse, useLoaderData, useRouteError } from "react-router";

import { unauthenticated } from "../shopify.server";
import { getQRCodeImage, METAOBJECT_TYPE } from "../models/QRCode.server";
import {
  PUBLIC_LINKS,
  SiteFooter,
  SubpageHeader,
} from "../components/PublicChrome";

export const links = () => PUBLIC_LINKS;

export const meta = ({ data }) => [
  {
    title: data?.title
      ? `${data.title} | QR Studio`
      : "QR label | QR Studio",
  },
  {
    name: "description",
    content: "Scannable Shopify product QR sticker ready to download or print.",
  },
];

// [START loader]
export const loader = async ({ request, params }) => {
  invariant(params.id, "Could not find QR code destination");

  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  invariant(shop, "Missing shop parameter");

  const { admin } = await unauthenticated.admin(shop);

  const response = await admin.graphql(
    `
      query GetQRCodeTitle($handle: MetaobjectHandleInput!) {
        metaobjectByHandle(handle: $handle) {
          title: field(key: "title") { value }
          destination: field(key: "destination") { value }
          discountCode: field(key: "discount_code") { value }
        }
      }
    `,
    {
      variables: {
        handle: { type: METAOBJECT_TYPE, handle: params.id },
      },
    },
  );

  const { data } = await response.json();
  const metaobject = data?.metaobjectByHandle;
  invariant(metaobject, "Could not find QR code destination");

  return {
    handle: params.id,
    shop,
    title: metaobject.title.value,
    destination: metaobject.destination?.value || "product",
    discountCode: metaobject.discountCode?.value || "",
    image: await getQRCodeImage(params.id, shop),
  };
};
// [END loader]

// [START component]
export default function QRCode() {
  const { handle, shop, image, title, destination, discountCode } =
    useLoaderData();

  return (
    <>
      <SubpageHeader />

      <main className="utility-main">
        <div className="container">
          <article className="public-qr-sticker">
            <h1>{title}</h1>

            <img
              className="public-qr-image"
              src={image}
              width="260"
              height="260"
              alt={`QR code for ${title}`}
            />

            <div className="public-qr-actions">
              <a
                href={image}
                download={`${handle}.png`}
                className="btn btn--primary"
              >
                Download PNG
              </a>
              <button
                type="button"
                onClick={() => window.print()}
                className="btn btn--secondary"
              >
                Print sticker
              </button>
            </div>

            <div className="public-qr-footer">
              <span className="mono">{shop}</span>
              {discountCode ? (
                <span className="seal-stamp">Code {discountCode}</span>
              ) : (
                <span>
                  {destination === "cart" ? "Cart checkout" : "Product page"}
                </span>
              )}
            </div>
          </article>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
// [END component]

export function ErrorBoundary() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? error.statusText
    : error instanceof Error
      ? error.message
      : "This QR code label could not be loaded.";

  return (
    <>
      <SubpageHeader />
      <main className="utility-main">
        <div className="container">
          <div className="auth-card">
            <h1>QR code unavailable</h1>
            <p className="field-help">{message}</p>
            <div>
              <Link to="/" className="btn btn--secondary">
                Return home
              </Link>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
