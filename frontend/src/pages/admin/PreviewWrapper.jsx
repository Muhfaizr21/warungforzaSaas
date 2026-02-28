import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
    HiOutlineRefresh, HiArrowLeft, HiArrowRight, HiOutlineExternalLink, HiOutlineLockClosed
} from 'react-icons/hi';

// Which route to preview for each editor section
const SECTION_ROUTES = {
    site: '/',
    colors: '/',
    navbar: '/',
    hero: '/',
    jurassic: '/',
    buttons: '/preorder',
    cards: '/readystock',
    blog: '/blog',
    shop: '/readystock',
    detail: '/readystock',   // navigate to a product after load ideally
    forms: '/login',
    sections: '/',
    typography: '/',
    footer: '/',
    badges: '/readystock',
    advanced: '/',
    presets: '/',
};

const PreviewWrapper = ({ draft, viewport, activeSection }) => {
    const iframeRef = useRef(null);
    const [currentUrl, setCurrentUrl] = useState('localhost:5173/');
    const [historyStack, setHistoryStack] = useState(['/']);
    const [histIdx, setHistIdx] = useState(0);
    const [loaded, setLoaded] = useState(false);
    const lastSectionRef = useRef(activeSection);

    const mob = viewport === 'mobile';
    const w = mob ? 390 : 1280;
    const scale = mob ? 0.54 : 0.595;
    const marginBottom = -((w * (1 - scale)) * 0.45);

    // ── Send full draft theme to iframe ──────────────────────────────────────
    const sendTheme = useCallback(() => {
        const iframe = iframeRef.current;
        if (!iframe?.contentWindow) return;
        iframe.contentWindow.postMessage(
            { type: 'THEME_PREVIEW', theme: draft },
            window.location.origin
        );
    }, [draft]);

    // Re-send whenever draft changes (real-time live preview)
    useEffect(() => {
        if (loaded) {
            sendTheme();
        }
    }, [sendTheme, loaded]);

    // ── iframe load handler ───────────────────────────────────────────────────
    const handleLoad = () => {
        setLoaded(true);
        // Double-send as safety net for React hydration timing
        setTimeout(sendTheme, 250);
        setTimeout(sendTheme, 700);
        try {
            const path = iframeRef.current?.contentWindow?.location?.pathname || '/';
            setCurrentUrl('localhost:5173' + path);
        } catch { /* cross-origin guard */ }
    };

    // ── Auto-navigate when section changes ───────────────────────────────────
    useEffect(() => {
        if (!activeSection || lastSectionRef.current === activeSection) return;
        lastSectionRef.current = activeSection;
        const targetPath = SECTION_ROUTES[activeSection] || '/';
        const currentPath = historyStack[histIdx];
        if (targetPath !== currentPath) {
            navigateTo(targetPath);
        }
    }, [activeSection]);

    // ── Navigation ────────────────────────────────────────────────────────────
    const navigateTo = useCallback((path) => {
        const iframe = iframeRef.current;
        if (!iframe) return;
        setLoaded(false);
        try {
            iframe.contentWindow.location.replace(path);
        } catch {
            iframe.src = path;
        }
        setHistoryStack(prev => {
            const trimmed = prev.slice(0, histIdx + 1);
            return [...trimmed, path];
        });
        setHistIdx(prev => {
            const trimmed = historyStack.slice(0, prev + 1);
            return trimmed.length; // new index = length of trimmed (before push)
        });
    }, [histIdx, historyStack]);

    const handleBack = () => {
        if (histIdx <= 0) return;
        const newIdx = histIdx - 1;
        setHistIdx(newIdx);
        setLoaded(false);
        try { iframeRef.current.contentWindow.location.replace(historyStack[newIdx]); }
        catch { iframeRef.current.src = historyStack[newIdx]; }
    };

    const handleForward = () => {
        if (histIdx >= historyStack.length - 1) return;
        const newIdx = histIdx + 1;
        setHistIdx(newIdx);
        setLoaded(false);
        try { iframeRef.current.contentWindow.location.replace(historyStack[newIdx]); }
        catch { iframeRef.current.src = historyStack[newIdx]; }
    };

    const handleRefresh = () => {
        setLoaded(false);
        try { iframeRef.current.contentWindow.location.reload(); }
        catch { iframeRef.current.src = iframeRef.current.src; }
    };

    const navLinks = [
        { label: 'Home', path: '/' },
        { label: 'Pre Order', path: '/preorder' },
        { label: 'Ready Stock', path: '/readystock' },
        { label: 'Blog', path: '/blog' },
        { label: 'Contact', path: '/contact' },
        { label: 'Login', path: '/login' },
    ];

    return (
        <div style={{ width: `${w}px`, transform: `scale(${scale})`, transformOrigin: 'top center', marginBottom: `${marginBottom}px`, userSelect: 'none' }}>
            {/* ── Browser Chrome ── */}
            <div style={{ backgroundColor: '#1a1a2e', borderRadius: '12px 12px 0 0', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Top bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* macOS dots */}
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        {['#ff5f57', '#febc2e', '#28c840'].map(c => (
                            <div key={c} style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: c }} />
                        ))}
                    </div>

                    {/* Nav buttons */}
                    <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={handleBack} disabled={histIdx <= 0} style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 6, padding: '4px 6px', cursor: histIdx > 0 ? 'pointer' : 'not-allowed', opacity: histIdx > 0 ? 1 : 0.3, color: '#fff', display: 'flex', alignItems: 'center' }}>
                            <HiArrowLeft style={{ width: 13, height: 13 }} />
                        </button>
                        <button onClick={handleForward} disabled={histIdx >= historyStack.length - 1} style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 6, padding: '4px 6px', cursor: histIdx < historyStack.length - 1 ? 'pointer' : 'not-allowed', opacity: histIdx < historyStack.length - 1 ? 1 : 0.3, color: '#fff', display: 'flex', alignItems: 'center' }}>
                            <HiArrowRight style={{ width: 13, height: 13 }} />
                        </button>
                        <button onClick={handleRefresh} style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 6, padding: '4px 6px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center' }}>
                            <HiOutlineRefresh style={{ width: 13, height: 13 }} />
                        </button>
                    </div>

                    {/* URL bar */}
                    <div style={{ flex: 1, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                        <HiOutlineLockClosed style={{ width: 11, height: 11, color: '#10b981', flexShrink: 0 }} />
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentUrl}</span>
                    </div>

                    {/* Open in new tab */}
                    <a href={historyStack[histIdx]} target="_blank" rel="noopener noreferrer" style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 6, padding: '4px 6px', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                        <HiOutlineExternalLink style={{ width: 13, height: 13 }} />
                    </a>
                </div>

                {/* Quick nav tabs */}
                {!mob && (
                    <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 2 }}>
                        {navLinks.map(n => (
                            <button key={n.path} onClick={() => navigateTo(n.path)} style={{ flexShrink: 0, background: historyStack[histIdx] === n.path ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.04)', border: '1px solid', borderColor: historyStack[histIdx] === n.path ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)', borderRadius: 6, padding: '3px 12px', cursor: 'pointer', color: historyStack[histIdx] === n.path ? '#fff' : 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', transition: 'all 0.2s' }}>
                                {n.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Iframe — no key prop so it persists across navigation ── */}
            <div style={{ borderRadius: '0 0 12px 12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', borderTop: 'none', boxShadow: '0 40px 90px rgba(0,0,0,0.9)', position: 'relative' }}>
                {!loaded && (
                    <div style={{ position: 'absolute', inset: 0, backgroundColor: '#030303', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, flexDirection: 'column', gap: 12 }}>
                        <div style={{ width: 32, height: 32, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#e11d48', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em' }}>Loading Preview…</p>
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                )}
                <iframe
                    ref={iframeRef}
                    src="/"
                    title="Live Site Preview"
                    onLoad={handleLoad}
                    style={{ width: `${w}px`, height: mob ? 800 : 920, border: 'none', display: 'block', backgroundColor: draft?.theme_bg_color || '#030303' }}
                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
                />
            </div>
        </div>
    );
};

export default PreviewWrapper;
