import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  ogImage?: string;
  url?: string;
  type?: string;
}

export function SEO({ title, description, image, ogImage, url, type = 'website' }: SEOProps) {
  const siteTitle = 'FUTRA';
  const fullTitle = title ? `${title} — ${siteTitle}` : `${siteTitle} — Torne a incerteza legível`;
  const defaultDescription = 'Mercados de previsão para política, economia, cripto, futebol e cultura. Veja o que a multidão acha que vai acontecer.';
  const defaultImage = 'https://futra.app/og-default.png';
  const ogImg = ogImage || image || defaultImage;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description || defaultDescription} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description || defaultDescription} />
      <meta property="og:image" content={ogImg} />
      <meta property="og:url" content={url || typeof window !== 'undefined' ? window.location.href : ''} />
      <meta property="og:type" content={type} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description || defaultDescription} />
      <meta name="twitter:image" content={ogImg} />
    </Helmet>
  );
}
