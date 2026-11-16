import { useState } from "react";
import { Form, Link, useActionData, useLoaderData } from "react-router";

import { login } from "../../shopify.server";
import {
  PUBLIC_LINKS,
  SiteFooter,
  SubpageHeader,
} from "../../components/PublicChrome";
import { loginErrorMessage } from "./error.server";

export const links = () => PUBLIC_LINKS;

export const meta = () => [
  { title: "Store login | QR Studio" },
  {
    name: "description",
    content: "Log in with your myshopify.com domain to open QR Studio.",
  },
];

export const loader = async ({ request }) => {
  const errors = loginErrorMessage(await login(request));

  return { errors };
};

export const action = async ({ request }) => {
  const errors = loginErrorMessage(await login(request));

  return {
    errors,
  };
};

export default function Auth() {
  const loaderData = useLoaderData();
  const actionData = useActionData();
  const [shop, setShop] = useState("");
  const { errors } = actionData || loaderData;

  return (
    <>
      <SubpageHeader />

      <main className="utility-main">
        <div className="container">
          <div className="auth-card">
            <div className="field-group">
              <h1>Connect your store</h1>
              <p className="field-help">
                Sign in to open QR Studio inside your Shopify Admin workspace.
              </p>
            </div>

            <Form method="post" className="connect-form">
              <div className="field-group">
                <label className="field-label" htmlFor="auth-shop">
                  Shop domain
                </label>
                <input
                  id="auth-shop"
                  className="field-input"
                  type="text"
                  name="shop"
                  placeholder="example.myshopify.com"
                  value={shop}
                  onChange={(e) => setShop(e.target.value)}
                  autoComplete="url"
                />
                <p className="field-help">
                  Use your permanent myshopify.com subdomain.
                </p>
              </div>

              {errors?.shop ? (
                <div className="field-error" role="alert">
                  {errors.shop}
                </div>
              ) : null}

              <div className="field-row">
                <button type="submit" className="btn btn--primary">
                  Log in
                </button>
                <Link to="/" className="btn btn--secondary">
                  Overview
                </Link>
              </div>
            </Form>
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
