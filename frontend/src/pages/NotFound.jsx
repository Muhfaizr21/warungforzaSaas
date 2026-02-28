import React from 'react';
import { Link } from 'react-router-dom';

/**
 * NotFound page — shown when user navigates to an unknown URL.
 * Replaces the silent redirect-to-home catch-all.
 */
const NotFound = () => {
    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #030303 0%, #0a0a0b 50%, #0d0208 100%)',
                color: '#fff',
                fontFamily: "'Inter', -apple-system, sans-serif",
                textAlign: 'center',
                padding: '2rem',
            }}
        >
            {/* Glowing 404 number */}
            <div style={{ position: 'relative', marginBottom: '2rem' }}>
                <span
                    style={{
                        fontSize: 'clamp(8rem, 20vw, 14rem)',
                        fontWeight: 900,
                        letterSpacing: '-0.05em',
                        lineHeight: 1,
                        color: 'transparent',
                        WebkitTextStroke: '2px rgba(225,29,72,0.4)',
                        textShadow: '0 0 80px rgba(225,29,72,0.15)',
                        userSelect: 'none',
                    }}
                >
                    404
                </span>
            </div>

            {/* Message */}
            <h1
                style={{
                    fontSize: 'clamp(1.2rem, 3vw, 2rem)',
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    letterSpacing: '0.2em',
                    marginBottom: '1rem',
                    background: 'linear-gradient(90deg, #fff, rgba(255,255,255,0.6))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                }}
            >
                Page Not Found
            </h1>

            <p
                style={{
                    color: 'rgba(255,255,255,0.4)',
                    fontSize: '0.9rem',
                    marginBottom: '3rem',
                    maxWidth: '400px',
                    lineHeight: 1.7,
                    fontWeight: 500,
                }}
            >
                The artifact you&apos;re looking for has been lost to the void.
                It may have been moved, deleted, or never existed.
            </p>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <Link
                    to="/"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem 2rem',
                        background: '#e11d48',
                        color: '#fff',
                        borderRadius: '9999px',
                        fontWeight: 800,
                        fontSize: '0.75rem',
                        letterSpacing: '0.2em',
                        textTransform: 'uppercase',
                        textDecoration: 'none',
                        transition: 'all 0.3s ease',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#be123c'}
                    onMouseLeave={e => e.currentTarget.style.background = '#e11d48'}
                >
                    Back to Home
                </Link>

                <button
                    onClick={() => window.history.back()}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem 2rem',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'rgba(255,255,255,0.6)',
                        borderRadius: '9999px',
                        fontWeight: 800,
                        fontSize: '0.75rem',
                        letterSpacing: '0.2em',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
                >
                    Go Back
                </button>
            </div>

            {/* Subtle grid decoration */}
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
                    backgroundSize: '50px 50px',
                    pointerEvents: 'none',
                    zIndex: 0,
                }}
            />
        </div>
    );
};

export default NotFound;
