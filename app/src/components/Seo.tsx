import { Helmet } from "react-helmet-async";
import { LANDING_URL } from "@/config";

const APP_URL = "https://app.heirlm.xyz";
const DEFAULT_TITLE = "Heirloom App";
const DEFAULT_DESCRIPTION =
  "Open an estate, check in, route yield, and claim — the Heirloom app on Solana.";
/** One copy of the artwork, served by the marketing site. */
const OG_IMAGE = `${LANDING_URL}/og-image.png`;

export interface SeoProps {
  /** Full <title>. Falls back to the app default. */
  title?: string;
  description?: string;
  /** Path of the current route, e.g. "/dashboard". Used for canonical + og:url. */
  path?: string;
}

/**
 * Per-route head tags for the app.
 *
 * Every route here is wallet-gated and per-user, so the whole origin carries a
 * noindex directive — there is nothing on app.heirlm.xyz a crawler should
 * hold. The indexable pages are the Astro landing on heirlm.xyz.
 */
const Seo = ({ title, description, path = "/" }: SeoProps) => {
  const resolvedTitle = title ?? DEFAULT_TITLE;
  const resolvedDescription = description ?? DEFAULT_DESCRIPTION;
  const canonical = `${APP_URL}${path}`;

  return (
    <Helmet>
      <title>{resolvedTitle}</title>
      <meta name="description" content={resolvedDescription} />
      <link rel="canonical" href={canonical} />
      <meta name="robots" content="noindex, nofollow" />

      <meta property="og:title" content={resolvedTitle} />
      <meta property="og:description" content={resolvedDescription} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={OG_IMAGE} />

      <meta name="twitter:title" content={resolvedTitle} />
      <meta name="twitter:description" content={resolvedDescription} />
      <meta name="twitter:image" content={OG_IMAGE} />
    </Helmet>
  );
};

export default Seo;
