import React from 'react';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';

const Image = ({ src, alt, className, width, height, placeholderSrc = '/placeholder.jpg', ...props }) => {
    // Handle WebP conversion logic if we had a CDN/image service
    // For now, we use the raw src but wrap it in LazyLoad

    // Ensure we have a valid src
    const imageSrc = src || placeholderSrc;

    return (
        <LazyLoadImage
            alt={alt || 'image'}
            src={imageSrc}
            className={`transition-opacity duration-500 ${className}`}
            effect="blur" // Adds a nice blur effect while loading
            placeholderSrc={placeholderSrc} // Low-res placeholder
            wrapperClassName={className} // Ensures wrapper matches layout
            width={width}
            height={height}
            onError={(e) => {
                e.target.src = placeholderSrc;
                e.target.onerror = null;
            }}
            threshold={200} // Load 200px before appearing in viewport
            {...props}
        />
    );
};

export default Image;
