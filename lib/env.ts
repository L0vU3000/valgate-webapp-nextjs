const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

if (!mapboxToken) {
  throw new Error(
    "Missing NEXT_PUBLIC_MAPBOX_TOKEN. Add it to .env.local before starting the dev server."
  );
}

const sitePassword = process.env.SITE_PASSWORD;

export const env = {
  NEXT_PUBLIC_MAPBOX_TOKEN: mapboxToken,
  SITE_PASSWORD: sitePassword,
} as const;
