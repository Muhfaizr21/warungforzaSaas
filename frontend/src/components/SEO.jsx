import React from 'react';
import { Helmet } from 'react-helmet-async';

const SEO = ({
    title,
    description,
    keywords,
    image,
    url,
    type = 'website',
    product = null, // For product schema
}) => {
    const defaultTitle = 'Warung Forza Shop';
    const defaultDescription = "Indonesia's Premier Collectibles Store - Premium Statues, Action Figures & Limited Edition Collectibles from Hot Toys, Prime 1 Studio, Sideshow & More";
    const defaultImage = '/og-image.jpg';
    const siteUrl = 'https://warungforzashop.com';

    const fullTitle = title ? `${title} | ${defaultTitle}` : defaultTitle;
    const metaDescription = description || defaultDescription;
    const metaImage = image || defaultImage;
    const metaUrl = url || siteUrl;

    // Generate Product Schema (JSON-LD) for SEO
    const productSchema = product ? {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": product.name,
        "image": product.images,
        "description": product.description,
        "sku": product.sku,
        "brand": {
            "@type": "Brand",
            "name": product.Brand?.name || "Unknown Brand"
        },
        "offers": {
            "@type": "Offer",
            "url": metaUrl,
            "priceCurrency": "IDR",
            "price": product.price,
            "availability": product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            "seller": {
                "@type": "Organization",
                "name": "Warung Forza Shop"
            }
        }
    } : null;

    return (
        <Helmet>
            {/* Basic Meta Tags */}
            <title>{fullTitle}</title>
            <meta name="description" content={metaDescription} />
            {keywords && <meta name="keywords" content={keywords} />}

            {/* Open Graph (Facebook, WhatsApp) */}
            <meta property="og:type" content={type} />
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={metaDescription} />
            <meta property="og:image" content={metaImage} />
            <meta property="og:url" content={metaUrl} />
            <meta property="og:site_name" content="Warung Forza Shop" />

            {/* Twitter Card */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={fullTitle} />
            <meta name="twitter:description" content={metaDescription} />
            <meta name="twitter:image" content={metaImage} />

            {/* Additional Tags */}
            <link rel="canonical" href={metaUrl} />

            {/* Product Schema */}
            {productSchema && (
                <script type="application/ld+json">
                    {JSON.stringify(productSchema)}
                </script>
            )}
        </Helmet>
    );
};

export default SEO;
