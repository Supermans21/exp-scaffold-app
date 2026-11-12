/** @type {import('@react-router/dev/config').Config} */
export default {
  ssr: true,
  allowedActionOrigins: [
    "admin.shopify.com",
    "*.myshopify.com",
    "*.trycloudflare.com",
    "localhost:*",
    "127.0.0.1:*",
    "**",
  ],
};
