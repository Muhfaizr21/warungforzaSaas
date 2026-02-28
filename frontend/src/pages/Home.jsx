import React from 'react';
import SEO from '../components/SEO';
import Hero from '../components/Hero';
import ReadyStockSection from '../components/ReadyStockSection';
import MostPopularSection from '../components/MostPopularSection';
import JurassicSeriesSection from '../components/JurassicSeriesSection';
import CharacterSeriesSection from '../components/CharacterSeriesSection';
import BlogSection from '../components/BlogSection';

const Home = () => {
    return (
        <div className="min-h-screen bg-[#030303]">
            <SEO
                title="Premium Statues & Action Figures Indonesia"
                description="Discover Indonesia's finest collection of premium collectibles - Hot Toys, Prime 1 Studio, Sideshow, JND Studios. Ready Stock & Pre-Order available. Free shipping for Jakarta area."
                keywords="hot toys indonesia, prime 1 studio, sideshow collectibles, action figures jakarta, statue collectibles, limited edition figures, jnd studios, queen studios"
            />
            <Hero />
            <ReadyStockSection />
            <MostPopularSection />
            <JurassicSeriesSection />
            <CharacterSeriesSection />
            <BlogSection />
        </div>
    );
};

export default Home;
