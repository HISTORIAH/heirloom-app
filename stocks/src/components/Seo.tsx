import { Helmet } from "react-helmet-async";

const STOCKS_URL = "https://stocks.heirlm.xyz";
/**
 * The stocks share card, served from this app's public/. index.html names it
 * too, for the link previews that never run this code.
 */
const OG_IMAGE = `${STOCKS_URL}/og-image.png`;

export interface SeoProps {
  title: string;
  description: string;
  /** Path of the current route, e.g. "/dashboard". Used for canonical + og:url. */
  path?: string;
  /** Whether search engines may index the route. Only the landing is. */
  indexable?: boolean;
}

/**
 * Per-route head tags. The app routes show what a wallet holds, per visitor,
 * so they carry noindex; the landing at the root is the one page here meant
 * to be found. robots.txt keeps crawlers to that one path.
 */
const Seo = ({ title, description, path = "/", indexable = false }: SeoProps) => {
  const canonical = `${STOCKS_URL}${path}`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <meta name="robots" content={indexable ? "index, follow" : "noindex, nofollow"} />

      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={OG_IMAGE} />

      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={OG_IMAGE} />
    </Helmet>
  );
};

export default Seo;
