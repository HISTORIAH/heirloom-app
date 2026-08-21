import { Helmet } from "react-helmet-async";

const SITE_URL = "https://heirlm.xyz";
const DEFAULT_TITLE = "Heirloom — Self-Custody Vaults on Solana";
const DEFAULT_DESCRIPTION =
  "Lock SOL and SPL tokens into a vault only you control. They earn while they sit, a backup wallet can recover them if you lose your keys, and the wallets you name claim on-chain if you step away.";
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

export interface SeoProps {
  /** Full <title>. Falls back to the site default. */
  title?: string;
  description?: string;
  /** Path of the current route, e.g. "/dashboard". Used for canonical + og:url. */
  path?: string;
  /** Keep this route out of the index (wallet-gated / per-user pages). */
  noindex?: boolean;
}

/**
 * Single source of truth for per-route head tags. The static index.html already
 * carries correct defaults for the homepage; this overrides title/description/
 * canonical/robots when React Router navigates to another route.
 */
const Seo = ({ title, description, path = "/", noindex = false }: SeoProps) => {
  const resolvedTitle = title ?? DEFAULT_TITLE;
  const resolvedDescription = description ?? DEFAULT_DESCRIPTION;
  const canonical = `${SITE_URL}${path}`;

  return (
    <Helmet>
      <title>{resolvedTitle}</title>
      <meta name="description" content={resolvedDescription} />
      <link rel="canonical" href={canonical} />
      {noindex ? <meta name="robots" content="noindex, nofollow" /> : null}

      <meta property="og:title" content={resolvedTitle} />
      <meta property="og:description" content={resolvedDescription} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={DEFAULT_OG_IMAGE} />

      <meta name="twitter:title" content={resolvedTitle} />
      <meta name="twitter:description" content={resolvedDescription} />
      <meta name="twitter:image" content={DEFAULT_OG_IMAGE} />
    </Helmet>
  );
};

export default Seo;
