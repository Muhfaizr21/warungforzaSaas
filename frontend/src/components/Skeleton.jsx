import React from 'react';

export const ProductSkeleton = () => {
    return (
        <div className="bg-[#080808] h-full rounded-[4px] border border-white/5 overflow-hidden relative animate-pulse">
            {/* Image Placeholder */}
            <div className="aspect-[3/4] w-full bg-white/5 relative overflow-hidden">
                {/* Shimmer Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]"></div>
            </div>

            {/* Content Placeholder */}
            <div className="p-4 space-y-3">
                {/* Badge */}
                <div className="h-3 w-16 bg-white/10 rounded-sm"></div>

                {/* Title */}
                <div className="space-y-2">
                    <div className="h-3 w-3/4 bg-white/10 rounded-sm"></div>
                    <div className="h-3 w-1/2 bg-white/10 rounded-sm"></div>
                </div>

                {/* Price */}
                <div className="h-5 w-1/3 bg-white/10 rounded-sm mt-4"></div>

                {/* Button */}
                <div className="h-10 w-full bg-white/5 rounded-sm mt-4 border border-white/5"></div>
            </div>
        </div>
    );
};

export const SkeletonGrid = ({ count = 8 }) => {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
            {Array(count).fill(0).map((_, i) => (
                <ProductSkeleton key={i} />
            ))}
        </div>
    );
};

export default ProductSkeleton;
