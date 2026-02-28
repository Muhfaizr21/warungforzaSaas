import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { showToast } from '../../utils/toast';
import { useTheme } from '../../context/ThemeContext';
import { UPLOAD_BASE_URL } from '../../config/api';
import {
    HiOutlineSave, HiOutlineMail, HiOutlineArrowLeft,
    HiOutlineDesktopComputer, HiOutlineDeviceMobile,
    HiOutlineSparkles, HiOutlinePhotograph,
    HiOutlineColorSwatch, HiOutlineTemplate,
    HiOutlineCode, HiOutlineCollection, HiOutlineCheckCircle,
    HiOutlineClipboardCopy, HiOutlineChip, HiOutlineRefresh,
} from 'react-icons/hi';

// ─── EMAIL PRESETS ────────────────────────────────────────────────────────────
const EMAIL_PRESETS = [
    {
        id: 'modern_box', name: 'Modern Boxed', emoji: '📦', color: '#6366f1',
        desc: 'Centered container, soft shadows, round corners.',
        build: (logo, accent, shop) => `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,0.06);border:1px solid #e2e8f0;">
        <tr><td style="padding:48px 48px 24px;text-align:center;">
          ${logo ? `<img src="${logo}" alt="${shop}" style="max-height:60px;">` : `<h1 style="margin:0;color:${accent};font-size:30px;font-weight:900;letter-spacing:-1px;">${shop}</h1>`}
        </td></tr>
        <tr><td style="padding:0 48px 48px;color:#334155;line-height:1.7;font-size:16px;">{{body_content}}</td></tr>
        <tr><td style="background:#f8fafc;padding:28px 48px;text-align:center;border-top:1px solid #f1f5f9;">
          <p style="margin:0;font-size:11px;color:#94a3b8;font-weight:600;letter-spacing:1px;text-transform:uppercase;">&copy; 2026 ${shop} · Premium Collectibles</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
    },
    {
        id: 'bold_header', name: 'Bold Identity', emoji: '🎨', color: '#ec4899',
        desc: 'Full-width colored header, strong brand presence.',
        build: (logo, accent, shop) => `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;box-shadow:0 10px 30px rgba(0,0,0,0.08);">
        <tr><td style="background:${accent};padding:56px 40px;text-align:center;">
          ${logo ? `<img src="${logo}" alt="${shop}" style="max-height:52px;filter:brightness(0) invert(1);">` : `<h1 style="margin:0;color:#fff;font-size:28px;font-weight:900;letter-spacing:2px;text-transform:uppercase;">${shop}</h1>`}
        </td></tr>
        <tr><td style="padding:48px 50px;color:#1f2937;line-height:1.8;font-size:15px;">{{body_content}}</td></tr>
        <tr><td style="padding:36px 40px;text-align:center;background:#fafafa;color:#9ca3af;font-size:11px;letter-spacing:1px;">
          <p style="margin:0;">TRUSTED BY COLLECTORS WORLDWIDE</p>
          <p style="margin:10px 0 0;">&copy; 2026 ${shop}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
    },
    {
        id: 'minimalist', name: 'Pure Minimal', emoji: '⚪', color: '#111827',
        desc: 'Airy and sophisticated. Best for luxury brands.',
        build: (logo, accent, shop) => `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:60px 20px;background:#fff;font-family:Georgia,serif;color:#1a1a1a;">
  <div style="max-width:560px;margin:0 auto;">
    <div style="margin-bottom:80px;text-align:center;">
      ${logo ? `<img src="${logo}" alt="${shop}" style="max-height:42px;">` : `<h1 style="margin:0;color:#000;font-size:20px;letter-spacing:4px;text-transform:uppercase;font-weight:300;">${shop}</h1>`}
    </div>
    <div style="line-height:2;font-size:17px;color:#333;">{{body_content}}</div>
    <div style="margin-top:100px;padding-top:30px;border-top:1px solid #ebebeb;font-size:11px;color:#aaa;text-align:center;letter-spacing:2px;text-transform:uppercase;">
      EST. 2026 · ${shop} · ALL RIGHTS RESERVED
    </div>
  </div>
</body></html>`,
    },
    {
        id: 'dark_luxury', name: 'Dark Luxury', emoji: '🌑', color: '#a78bfa',
        desc: 'Premium dark theme for exclusive collectors.',
        build: (logo, accent, shop) => `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#111118;border:1px solid rgba(255,255,255,0.08);border-radius:20px;overflow:hidden;">
        <tr><td style="padding:48px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.06);">
          ${logo ? `<img src="${logo}" alt="${shop}" style="max-height:52px;filter:brightness(1.2);">` : `<h1 style="margin:0;color:${accent};font-size:30px;font-weight:900;">${shop}</h1>`}
        </td></tr>
        <tr><td style="padding:48px;color:#e2e8f0;line-height:1.7;font-size:16px;">{{body_content}}</td></tr>
        <tr><td style="padding:28px 48px;text-align:center;background:rgba(0,0,0,0.3);border-top:1px solid rgba(255,255,255,0.06);">
          <p style="margin:0;font-size:11px;color:#475569;font-weight:600;letter-spacing:2px;text-transform:uppercase;">&copy; 2026 ${shop}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
    },
];

// ─── NAV GROUPS ───────────────────────────────────────────────────────────────
const NAV_SECTIONS = [
    { id: 'presets', label: 'Tema Otomatis', icon: HiOutlineSparkles, bg: '#ec4899', desc: 'Satu klik ubah total' },
    { id: 'layout', label: 'Layout & Logo', icon: HiOutlineTemplate, bg: '#3b82f6', desc: 'Header & footer wrapper' },
    { id: 'payment', label: 'Notif Pembayaran', icon: HiOutlineColorSwatch, bg: '#10b981', desc: 'Invoice & konfirmasi' },
    { id: 'po', label: 'Pre-Order Info', icon: HiOutlineCollection, bg: '#f59e0b', desc: 'Kedatangan & pelunasan' },
    { id: 'system', label: 'System Mails', icon: HiOutlineChip, bg: '#8b5cf6', desc: 'OTP & password reset' },
];

const NAV_GROUPS = [
    { group: '✨ Tema Email', items: ['presets'] },
    { group: '📄 Struktur', items: ['layout'] },
    { group: '📨 Isi Pesan', items: ['payment', 'po', 'system'] },
];

const TEMPLATES = {
    layout: [
        { key: 'email_tpl_logo_url', label: 'Logo URL (email header)', type: 'image' },
        { key: 'email_tpl_global_layout', label: 'Global Wrapper HTML', type: 'html', desc: 'Gunakan {{body_content}} sebagai placeholder isi email.' },
    ],
    payment: [
        { key: 'email_tpl_payment_subject', label: 'Subject Email Pembayaran', type: 'text' },
        { key: 'email_tpl_payment_success', label: 'Body HTML Konfirmasi', type: 'html' },
        { key: 'email_tpl_deposit_message', label: 'Teks Singkat Deposit', type: 'text' },
        { key: 'email_tpl_deposit_nextstep', label: 'Langkah Berikut (Deposit)', type: 'text' },
        { key: 'email_tpl_balance_message', label: 'Teks Singkat Pelunasan', type: 'text' },
        { key: 'email_tpl_balance_nextstep', label: 'Langkah Berikut (Pelunasan)', type: 'text' },
        { key: 'email_tpl_topup_message', label: 'Teks Konfirmasi Top-Up', type: 'text' },
        { key: 'email_tpl_full_message', label: 'Teks Full Payment', type: 'text' },
    ],
    po: [
        { key: 'email_tpl_po_arrival_subject', label: 'Subject Kedatangan PO', type: 'text' },
        { key: 'email_tpl_po_arrival', label: 'Body HTML (Sisa Bayar)', type: 'html' },
        { key: 'email_tpl_po_arrival_full', label: 'Body HTML (Lunas)', type: 'html' },
    ],
    system: [
        { key: 'email_tpl_welcome_otp', label: 'OTP Verifikasi HTML', type: 'html' },
        { key: 'email_tpl_refund', label: 'Notif Refund HTML', type: 'html' },
    ],
};

const DUMMY_DATA = {
    customer_name: 'John Collector',
    invoice_number: 'INV-2026-X123',
    amount: 'Rp 1.500.000',
    product_name: '1/4 Scale T-Rex Premium',
    balance: 'Rp 3.000.000',
    due_date: '12 Oct 2026',
    order_number: 'ORD-9999',
    refund_type: 'Store Wallet',
    reason: 'Out of Stock Guarantee',
    message: 'Terima kasih! Pembayaran Anda telah dikonfirmasi.',
    next_step: 'Kami sedang mengemas pesanan Anda dengan aman.',
    accent_color: '#e11d48',
    shop_name: 'Warung Forza',
    otp_code: '123456',
};

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function EmailTemplatePage() {
    const { theme } = useTheme();
    const [values, setValues] = useState({});
    const [savedValues, setSavedValues] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savedFeedback, setSavedFeedback] = useState(false);
    const [activeSection, setActiveSection] = useState('presets');
    const [viewport, setViewport] = useState('desktop');
    const [previewHtml, setPreviewHtml] = useState('');
    const [previewLoading, setPreviewLoading] = useState(false);
    const previewRef = useRef(null);

    // Map section ID to email preview type
    const SECTION_TO_TYPE = {
        presets: 'payment',
        layout: 'payment',
        payment: 'payment',
        po: 'po_arrival',
        system: 'otp',
    };

    useEffect(() => {
        adminService.getSettings()
            .then((data) => {
                const arr = Array.isArray(data) ? data : data?.data || [];
                const map = {};
                arr.forEach((s) => { if (s.key.startsWith('email_tpl_')) map[s.key] = s.value; });
                setValues(map);
                setSavedValues({ ...map });
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    // Fetch preview HTML from backend whenever section changes or after save
    const fetchPreview = useCallback(async (type, currentValues = {}) => {
        setPreviewLoading(true);
        try {
            const html = await adminService.getEmailPreview(type, currentValues);
            setPreviewHtml(html);
        } catch {
            setPreviewHtml('<div style="padding:40px;text-align:center;color:#999;">Preview unavailable</div>');
        } finally {
            setPreviewLoading(false);
        }
    }, []);

    useEffect(() => {
        const type = SECTION_TO_TYPE[activeSection] || 'payment';
        // Debounce preview rendering to prevent API spam while typing
        const timeoutId = setTimeout(() => {
            fetchPreview(type, values);
        }, 600);

        return () => clearTimeout(timeoutId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeSection, values]);

    const handleChange = useCallback((key, val) => {
        setValues((prev) => ({ ...prev, [key]: val }));
    }, []);

    const isDirty = useCallback((key) => (values[key] || '') !== (savedValues[key] || ''), [values, savedValues]);
    const dirtyKeys = Object.keys(values).filter((k) => isDirty(k));

    const handleSave = async () => {
        if (dirtyKeys.length === 0) { showToast('Tidak ada perubahan.', 'info'); return; }
        setSaving(true);
        try {
            await adminService.bulkUpdateSettings(dirtyKeys.map((k) => ({ key: k, value: values[k] || '' })));
            setSavedValues({ ...values });
            setSavedFeedback(true);
            showToast(`${dirtyKeys.length} perubahan berhasil dipublish!`, 'success');
            setTimeout(() => setSavedFeedback(false), 3000);
            // Refresh preview from backend after saving
            const type = SECTION_TO_TYPE[activeSection] || 'payment';
            fetchPreview(type, values);
        } catch { showToast('Gagal menyimpan.', 'error'); }
        finally { setSaving(false); }
    };

    const handleApplyPreset = (preset) => {
        const logo = values['email_tpl_logo_url'] || '';
        const accent = theme?.theme_accent_color || '#e11d48';
        const shop = theme?.shop_name || 'Warung Forza';
        handleChange('email_tpl_global_layout', preset.build(logo, accent, shop));
        showToast(`Preset "${preset.name}" diterapkan!`, 'success');
    };

    const handleUploadLogo = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const fd = new FormData();
        fd.append('image', file);
        try {
            showToast('Mengupload logo...', 'info');
            const res = await adminService.uploadGeneralImage(fd);
            handleChange('email_tpl_logo_url', UPLOAD_BASE_URL + '/' + res.url);
            showToast('Logo berhasil diupload!', 'success');
        } catch { showToast('Upload gagal', 'error'); }
    };

    const activeSec = NAV_SECTIONS.find((s) => s.id === activeSection);

    if (loading) return (
        <div className="flex flex-col -mx-4 md:-mx-6 -my-4 md:-my-6 bg-[#07070e] items-center justify-center" style={{ height: 'calc(100vh - 72px)' }}>
            <div className="w-8 h-8 border-2 border-white/10 border-t-rose-500 rounded-full animate-spin mb-4" />
            <p className="text-gray-600 text-[9px] font-black uppercase tracking-widest">Loading Email Studio…</p>
        </div>
    );

    return (
        <div className="flex flex-col -mx-4 md:-mx-6 -my-4 md:-my-6 bg-[#07070e]" style={{ height: 'calc(100vh - 72px)', overflow: 'hidden' }}>
            {/* ── TOP BAR (identical to Theme Studio) ── */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06] bg-[#09090f] flex-shrink-0">
                <div className="flex items-center gap-3">
                    <Link to="/admin/settings" className="flex items-center gap-1.5 text-gray-600 hover:text-white transition-colors text-[9px] font-black uppercase tracking-widest">
                        <HiOutlineArrowLeft className="w-3.5 h-3.5" /> Kembali
                    </Link>
                    <span className="text-white/10">|</span>
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-indigo-500 via-rose-500 to-amber-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <HiOutlineMail className="w-3 h-3 text-white" />
                        </div>
                        <div>
                            <span className="text-white font-black text-[11px] uppercase tracking-tight">Email Studio</span>
                            {dirtyKeys.length > 0 && (
                                <span className="ml-2 text-amber-400 text-[8px] font-black uppercase tracking-widest">• {dirtyKeys.length} belum tersimpan</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Viewport toggle */}
                    <div className="flex items-center gap-0.5 bg-white/[0.04] rounded-lg p-1 border border-white/[0.06]">
                        {[
                            { v: 'desktop', icon: HiOutlineDesktopComputer, label: 'Desktop' },
                            { v: 'mobile', icon: HiOutlineDeviceMobile, label: 'Mobile' },
                        ].map(({ v, icon: Icon, label }) => (
                            <button key={v} onClick={() => setViewport(v)}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[9px] font-black uppercase tracking-wide transition-all ${viewport === v ? 'bg-white/15 text-white' : 'text-gray-600 hover:text-gray-300'}`}
                            >
                                <Icon className="w-3.5 h-3.5" /> {label}
                            </button>
                        ))}
                    </div>

                    {/* Save */}
                    <button onClick={handleSave} disabled={saving || dirtyKeys.length === 0}
                        className={`flex items-center gap-2 px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-lg ${savedFeedback ? 'bg-emerald-500 text-white' : dirtyKeys.length > 0 ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-indigo-500/30' : 'bg-white/[0.04] text-gray-600 cursor-not-allowed border border-white/[0.06]'}`}
                    >
                        {savedFeedback ? <HiOutlineCheckCircle className="w-3.5 h-3.5" /> : <HiOutlineSave className="w-3.5 h-3.5" />}
                        {saving ? 'Memproses…' : savedFeedback ? 'Tersimpan!' : `Simpan Email${dirtyKeys.length > 0 ? ` (${dirtyKeys.length})` : ''}`}
                    </button>
                </div>
            </div>

            {/* ── BODY ── */}
            <div className="flex flex-1 overflow-hidden min-h-0">

                {/* LEFT: Grouped nav sidebar (identical style to Theme Studio) */}
                <div className="w-[200px] flex-shrink-0 bg-[#08080e] border-r border-white/[0.05] flex flex-col overflow-y-auto">
                    {NAV_GROUPS.map(({ group, items }) => (
                        <div key={group} className="pt-3 pb-1">
                            <p className="px-3 text-[8px] font-black uppercase tracking-widest text-gray-700 mb-1">{group}</p>
                            {items.map((id) => {
                                const s = NAV_SECTIONS.find((n) => n.id === id);
                                if (!s) return null;
                                const hasDirty = (TEMPLATES[id] || []).some((f) => isDirty(f.key));
                                const isActive = activeSection === s.id;
                                return (
                                    <button key={id} onClick={() => setActiveSection(id)}
                                        className={`w-full flex items-center gap-2.5 px-3 py-2 transition-all text-left relative group ${isActive ? 'text-white' : 'text-gray-500 hover:text-gray-200 hover:bg-white/[0.03]'}`}
                                        style={isActive ? { backgroundColor: s.bg + '18', borderLeft: `2px solid ${s.bg}` } : { borderLeft: '2px solid transparent' }}
                                    >
                                        <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: isActive ? s.bg + '30' : 'transparent' }}>
                                            <s.icon className="w-3 h-3" style={{ color: isActive ? s.bg : 'currentColor' }} />
                                        </div>
                                        <span className="text-[10px] font-bold flex-1">{s.label}</span>
                                        {hasDirty && <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />}
                                    </button>
                                );
                            })}
                        </div>
                    ))}

                    {/* Bottom: SIMPAN button like Theme Studio */}
                    <div className="mt-auto p-3">
                        <button onClick={handleSave} disabled={saving || dirtyKeys.length === 0}
                            className={`w-full py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${dirtyKeys.length > 0 ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg' : 'bg-white/[0.03] text-gray-700 cursor-not-allowed border border-white/[0.05]'}`}
                        >
                            {saving ? 'Memproses…' : `Simpan Sekarang${dirtyKeys.length > 0 ? ` (${dirtyKeys.length})` : ''}`}
                        </button>
                    </div>
                </div>

                {/* CENTER: Editor panel (same 340px as Theme Studio) */}
                <div className="w-[340px] flex-shrink-0 bg-[#09090f] border-r border-white/[0.05] flex flex-col overflow-hidden shadow-[20px_0_40px_rgba(0,0,0,0.5)]">
                    {/* Section header */}
                    <div className="flex-shrink-0 px-4 py-3 border-b border-white/[0.05] bg-[#0a0a11]">
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                                style={{ backgroundColor: activeSec?.bg + '22', border: `1px solid ${activeSec?.bg}33` }}>
                                {activeSec && <activeSec.icon className="w-3.5 h-3.5" style={{ color: activeSec.bg }} />}
                            </div>
                            <div>
                                <p className="text-white text-[10px] font-black uppercase tracking-widest">{activeSec?.label}</p>
                                <p className="text-gray-600 text-[8px] uppercase tracking-widest mt-0.5">{activeSec?.desc}</p>
                            </div>
                        </div>
                    </div>

                    {/* Scrollable content */}
                    <div className="flex-1 overflow-y-auto px-3 pb-6" style={{ scrollbarWidth: 'thin', scrollbarColor: '#333 transparent' }}>

                        {/* ── PRESETS ── */}
                        {activeSection === 'presets' && (
                            <div className="mt-3 space-y-2">
                                <p className="text-[8px] font-black uppercase tracking-widest text-gray-600 mb-3 px-1">
                                    Satu klik untuk merubah total warna, latar, dan border elemen. Gambar dan teks yang ada akan dipertahankan agar tidak selamanya mengganggu ulang.
                                </p>
                                {EMAIL_PRESETS.map((p) => (
                                    <button key={p.id} onClick={() => handleApplyPreset(p)}
                                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-black/20 border border-white/[0.04] hover:border-white/10 hover:bg-white/[0.03] transition-all group text-left">
                                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl flex-shrink-0 transition-transform group-hover:scale-110"
                                            style={{ backgroundColor: p.color + '20' }}>
                                            {p.emoji}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white text-[10px] font-black uppercase tracking-tight">{p.name}</p>
                                            <p className="text-gray-600 text-[8px] mt-0.5 truncate">{p.desc}</p>
                                        </div>
                                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* ── LAYOUT ── */}
                        {activeSection === 'layout' && (
                            <div className="mt-3 space-y-3">
                                {/* Logo upload */}
                                <div className="p-3 rounded-xl bg-black/20 border border-white/[0.04]">
                                    <p className="text-white text-[10px] font-bold mb-2">Logo Email Header</p>
                                    {values['email_tpl_logo_url'] ? (
                                        <div className="mb-3 relative group">
                                            <div className="bg-gray-100 rounded-lg p-3 flex items-center justify-center">
                                                <img src={values['email_tpl_logo_url']} alt="Logo" className="max-h-14 object-contain" />
                                            </div>
                                            <button onClick={() => handleChange('email_tpl_logo_url', '')}
                                                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-500 text-white text-xs opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">✕</button>
                                        </div>
                                    ) : (
                                        <div className="mb-3 p-6 border border-dashed border-white/10 rounded-lg text-center">
                                            <HiOutlinePhotograph className="w-8 h-8 text-gray-700 mx-auto mb-1" />
                                            <p className="text-[9px] text-gray-700 font-bold">Belum ada logo</p>
                                        </div>
                                    )}
                                    <div className="flex gap-2">
                                        <label className="flex-1 text-center py-2 rounded-lg bg-white/5 border border-white/[0.08] text-[9px] font-black text-gray-400 hover:text-white hover:border-white/20 transition-all cursor-pointer uppercase tracking-widest">
                                            {values['email_tpl_logo_url'] ? 'Ganti Logo' : 'Upload Logo'}
                                            <input type="file" className="hidden" accept="image/*" onChange={handleUploadLogo} />
                                        </label>
                                        {values['email_tpl_logo_url'] && (
                                            <button onClick={() => { navigator.clipboard.writeText(values['email_tpl_logo_url']); showToast('URL copied!', 'info'); }}
                                                className="p-2 rounded-lg bg-white/5 border border-white/[0.08] text-gray-500 hover:text-white transition-all">
                                                <HiOutlineClipboardCopy className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* HTML editor */}
                                <div className="p-3 rounded-xl bg-black/20 border border-white/[0.04]">
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="text-white text-[10px] font-bold flex items-center gap-1.5">
                                            <HiOutlineCode className="w-3.5 h-3.5 text-indigo-400" /> Global Layout HTML
                                            {isDirty('email_tpl_global_layout') && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />}
                                        </p>
                                        <button onClick={() => handleChange('email_tpl_global_layout', savedValues['email_tpl_global_layout'] || '')}
                                            className="text-[8px] font-black text-gray-600 hover:text-rose-400 uppercase tracking-widest transition-colors">Revert</button>
                                    </div>
                                    <p className="text-gray-600 text-[8px] mb-2">Gunakan <code className="text-indigo-400">{"{{body_content}}"}</code> sebagai tempat isi pesan.</p>
                                    <textarea
                                        value={values['email_tpl_global_layout'] || ''}
                                        onChange={(e) => handleChange('email_tpl_global_layout', e.target.value)}
                                        rows={18}
                                        spellCheck={false}
                                        className="w-full bg-black/50 border border-white/[0.08] rounded-lg p-3 text-[10px] font-mono text-emerald-400 outline-none focus:border-indigo-500/30 transition-all resize-none"
                                        placeholder="Masukkan HTML wrapper di sini..."
                                    />
                                </div>
                            </div>
                        )}

                        {/* ── CONTENT TEMPLATES (payment / po / system) ── */}
                        {['payment', 'po', 'system'].includes(activeSection) && (
                            <div className="mt-3 space-y-3">
                                {(TEMPLATES[activeSection] || []).map((field) => (
                                    <div key={field.key} className="p-3 rounded-xl bg-black/20 border border-white/[0.04] hover:border-white/10 transition-all">
                                        <p className="text-white text-[10px] font-bold mb-1 flex items-center gap-1.5">
                                            {field.label}
                                            {isDirty(field.key) && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                                        </p>
                                        {field.desc && <p className="text-gray-600 text-[8px] mb-2">{field.desc}</p>}
                                        {field.type === 'html' ? (
                                            <textarea
                                                value={values[field.key] || ''}
                                                onChange={(e) => handleChange(field.key, e.target.value)}
                                                rows={12}
                                                spellCheck={false}
                                                className="w-full bg-black/50 border border-white/[0.08] rounded-lg p-3 text-[10px] font-mono text-emerald-400 outline-none focus:border-indigo-500/30 transition-all resize-none"
                                            />
                                        ) : (
                                            <input
                                                type="text"
                                                value={values[field.key] || ''}
                                                onChange={(e) => handleChange(field.key, e.target.value)}
                                                className="w-full bg-black/40 border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-indigo-500/30 transition-all"
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: Live preview (full, large — same as Theme Studio) */}
                <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'radial-gradient(ellipse at top, #0a0a1f 0%, #040408 100%)' }}>
                    {/* Preview header */}
                    <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.05] bg-black/20 flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${previewLoading ? 'bg-amber-400 animate-ping' : 'bg-emerald-400 animate-pulse'}`} />
                            <span className="text-emerald-400 text-[8px] font-black uppercase tracking-widest">
                                {previewLoading ? 'Rendering...' : 'Live Preview'}
                            </span>
                            <span className="text-gray-700 text-[8px] font-bold">· Backend Engine</span>
                            {dirtyKeys.length > 0 && (
                                <span className="text-amber-400/60 text-[8px] font-bold ml-1">• Simpan dulu untuk lihat perubahan</span>
                            )}
                        </div>
                        <button
                            onClick={() => fetchPreview(SECTION_TO_TYPE[activeSection] || 'payment', values)}
                            className="flex items-center gap-1.5 text-[8px] font-black text-gray-600 hover:text-white uppercase tracking-widest transition-colors"
                        >
                            <HiOutlineRefresh className={`w-3 h-3 ${previewLoading ? 'animate-spin' : ''}`} /> Refresh
                        </button>
                    </div>

                    {/* Preview area */}
                    <div className="flex-1 overflow-auto p-6 flex justify-center items-start">
                        <div style={{ width: viewport === 'mobile' ? '375px' : '100%', maxWidth: '700px', transition: 'width 0.4s ease' }}>
                            {/* Fake email client chrome */}
                            <div className="bg-[#1a1a2e] rounded-xl overflow-hidden border border-white/5 shadow-2xl">
                                {/* Email client top bar */}
                                <div className="bg-[#12121e] px-4 py-2.5 border-b border-white/[0.05] flex items-center gap-3">
                                    <div className="flex gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500/60" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
                                    </div>
                                    <div className="flex-1 bg-[#0d0d1a] rounded-lg px-3 py-1 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-[9px] text-gray-500 font-mono flex-1 truncate">
                                            no-reply@warungforza.com — Kotak Masuk (John Collector)
                                        </span>
                                    </div>
                                </div>
                                {/* iframe for actual email render */}
                                <div className="relative">
                                    {previewLoading && (
                                        <div className="absolute inset-0 bg-white/80 backdrop-blur z-10 flex items-center justify-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                                                <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Rendering from server...</p>
                                            </div>
                                        </div>
                                    )}
                                    <iframe
                                        title="Email Live Preview"
                                        ref={previewRef}
                                        srcDoc={previewHtml}
                                        className="w-full border-none bg-white"
                                        style={{ height: '620px' }}
                                    />
                                </div>
                            </div>
                            <p className="text-center text-[8px] text-gray-700 font-black uppercase tracking-widest mt-4">
                                Rendered from backend engine · Data dummy: John Collector
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── STATUS BAR (same as Theme Studio) ── */}
            <div className="flex-shrink-0 px-4 py-1.5 border-t border-white/[0.05] bg-[#07070e] flex items-center justify-between text-[7.5px] font-black uppercase tracking-widest">
                <div className="flex items-center gap-4">
                    {dirtyKeys.length > 0 ? (
                        <span className="text-amber-400">● {dirtyKeys.length} modifikasi · Klik Simpan atau ⌘S untuk publish</span>
                    ) : (
                        <span className="text-emerald-500">✓ Seluruh template tersimpan aman</span>
                    )}
                </div>
                <span className="text-gray-700">{Object.values(TEMPLATES).flat().length} field aktif · Email Studio v2</span>
            </div>
        </div>
    );
}
