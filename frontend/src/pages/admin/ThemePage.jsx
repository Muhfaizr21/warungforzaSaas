import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { adminService } from "../../services/adminService";
import { useTheme, DEFAULT_THEME } from "../../context/ThemeContext";
import { showToast } from "../../utils/toast";
import PreviewWrapper from "./PreviewWrapper";
import { UPLOAD_BASE_URL } from "../../config/api";
import {
  HiOutlineColorSwatch,
  HiOutlineSave,
  HiOutlineGlobe,
  HiOutlineTemplate,
  HiOutlineCubeTransparent,
  HiOutlineCollection,
  HiOutlineAnnotation,
  HiOutlineTag,
  HiOutlineCheckCircle,
  HiOutlineDesktopComputer,
  HiOutlineDeviceMobile,
  HiOutlineArrowLeft,
  HiArrowLeft,
  HiArrowRight,
  HiOutlineSparkles,
  HiOutlineSearch,
  HiOutlinePhotograph,
  HiOutlineAdjustments,
  HiOutlineViewGrid,
  HiOutlineChip,
  HiOutlineNewspaper,
  HiOutlineShoppingCart,
  HiOutlineCube,
  HiOutlinePencilAlt,
  HiOutlineMenuAlt3,
  HiOutlineCode,
} from "react-icons/hi";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const generatePreset = (
  name,
  emoji,
  type,
  primary,
  primaryHover,
  bg,
  surface,
  navBg,
  font,
) => {
  const isDark = type === "dark";
  const textPrimary = isDark ? "#ffffff" : "#111827";
  const textSecondary = isDark ? "#9ca3af" : "#4b5563";
  const textMuted = isDark ? "#6b7280" : "#9ca3af";

  const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const borderStrong = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.2)";

  return {
    name,
    emoji,
    type,
    colors: {
      theme_accent_color: primary,
      theme_accent_hover: primaryHover,
      theme_accent_muted: isDark
        ? "rgba(255,255,255,0.05)"
        : "rgba(0,0,0,0.05)",
      theme_bg_color: bg,
      theme_surface_color: surface,
      theme_surface_2: surface,
      theme_border_color: border,
      theme_border_strong: borderStrong,

      theme_text_primary: textPrimary,
      theme_text_secondary: textSecondary,
      theme_text_muted: textMuted,
      theme_text_accent: primary,

      theme_navbar_bg: navBg,
      theme_navbar_text: textSecondary,
      theme_navbar_text_hover: textPrimary,
      theme_navbar_border: border,

      theme_btn_primary_bg: primary,
      theme_btn_primary_text: "#ffffff",
      theme_btn_primary_hover: primaryHover,
      theme_btn_secondary_bg: isDark ? "rgba(255,255,255,0.1)" : "#f3f4f6",
      theme_btn_secondary_text: textPrimary,
      theme_btn_secondary_hover: isDark ? "rgba(255,255,255,0.2)" : "#e5e7eb",
      theme_btn_radius: "8px",

      theme_card_bg: surface,
      theme_card_border: border,
      theme_card_radius: "12px",
      theme_card_hover_border: primaryHover,
      theme_card_price_color: primary,
      theme_card_title_color: textPrimary,
      theme_card_brand_color: textSecondary,

      theme_blog_card_bg: surface,
      theme_blog_card_border: border,
      theme_blog_card_radius: "12px",
      theme_blog_card_hover_border: primaryHover,
      theme_blog_tag_color: primaryHover,
      theme_blog_tag_bg: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
      theme_blog_title_color: textPrimary,
      theme_blog_title_hover: primary,
      theme_blog_text_color: textSecondary,
      theme_blog_date_color: textMuted,
      theme_blog_section_bg: bg,

      theme_shop_filter_bg: surface,
      theme_shop_filter_border: border,
      theme_shop_filter_text: textSecondary,
      theme_shop_filter_active_bg: primary,
      theme_shop_filter_active_text: "#ffffff",
      theme_shop_section_bg: bg,
      theme_shop_section_heading: textPrimary,
      theme_shop_label_color: primaryHover,

      theme_detail_bg: bg,
      theme_detail_panel_bg: surface,
      theme_detail_panel_border: border,
      theme_detail_price_color: primary,
      theme_detail_title_color: textPrimary,
      theme_detail_text_color: textSecondary,
      theme_detail_tab_active: primary,
      theme_detail_tab_bg: borderStrong,

      theme_input_bg: isDark ? "rgba(0,0,0,0.3)" : "#ffffff",
      theme_input_border: borderStrong,
      theme_input_text: textPrimary,
      theme_input_placeholder: textMuted,
      theme_input_focus_border: primary,
      theme_input_radius: "8px",
      theme_label_color: textSecondary,

      theme_section_label_color: primaryHover,
      theme_section_heading_color: textPrimary,
      theme_section_subtext_color: textSecondary,
      theme_section_divider: border,
      theme_section_bg_alt: surface,

      theme_footer_bg: bg,
      theme_footer_text: textSecondary,
      theme_footer_heading: textPrimary,
      theme_footer_link: textSecondary,
      theme_footer_link_hover: textPrimary,
      theme_footer_border: border,

      theme_font_primary: font || "'Outfit', sans-serif",
      theme_font_heading: font || "'Outfit', sans-serif",

      theme_badge_success: "#10b981",
      theme_badge_warning: "#f59e0b",
      theme_badge_error: "#ef4444",
      theme_badge_info: "#3b82f6",
    },
  };
};

const PRESETS = [
  generatePreset(
    "Midnight Rose",
    "🌹",
    "dark",
    "#e11d48",
    "#be123c",
    "#030303",
    "#0d0d0d",
    "rgba(3,3,3,0.92)",
  ),
  generatePreset(
    "Ocean Deep",
    "🌊",
    "dark",
    "#0ea5e9",
    "#0284c7",
    "#020c18",
    "#041020",
    "rgba(2,12,24,0.92)",
  ),
  generatePreset(
    "Forest Dark",
    "🌲",
    "dark",
    "#10b981",
    "#059669",
    "#030a06",
    "#050f09",
    "rgba(3,10,6,0.92)",
  ),
  generatePreset(
    "Gold Rush",
    "✨",
    "dark",
    "#f59e0b",
    "#d97706",
    "#0a0804",
    "#120f06",
    "rgba(10,8,4,0.92)",
    "'Playfair Display', serif",
  ),
  generatePreset(
    "Violet Storm",
    "⚡",
    "dark",
    "#8b5cf6",
    "#7c3aed",
    "#05030f",
    "#090618",
    "rgba(5,3,15,0.92)",
  ),
  generatePreset(
    "Pure Light",
    "☀️",
    "light",
    "#6366f1",
    "#4f46e5",
    "#f8fafc",
    "#ffffff",
    "rgba(248,250,252,0.95)",
    "'Inter', sans-serif",
  ),
  generatePreset(
    "Neon Tokyo",
    "🏙️",
    "dark",
    "#f0abfc",
    "#e879f9",
    "#020008",
    "#0a0015",
    "rgba(2,0,8,0.95)",
    "'Space Grotesk', sans-serif",
  ),
  generatePreset(
    "Crimson Light",
    "🎭",
    "light",
    "#dc2626",
    "#b91c1c",
    "#fff1f2",
    "#ffffff",
    "rgba(255,241,242,0.95)",
  ),
  generatePreset(
    "Minimalist White",
    "⚪️",
    "light",
    "#111827",
    "#000000",
    "#ffffff",
    "#fcfcfc",
    "rgba(255,255,255,0.95)",
    "'Plus Jakarta Sans', sans-serif",
  ),
];

const RADIUS_OPTIONS = [
  { value: "0px", label: "Square" },
  { value: "2px", label: "Micro" },
  { value: "4px", label: "Sharp" },
  { value: "8px", label: "Rounded" },
  { value: "12px", label: "Soft" },
  { value: "16px", label: "Smooth" },
  { value: "24px", label: "Pill" },
  { value: "9999px", label: "Full" },
];

const FONT_OPTIONS = [
  { value: "'Outfit', sans-serif", label: "Outfit" },
  { value: "'Inter', sans-serif", label: "Inter" },
  { value: "'Plus Jakarta Sans', sans-serif", label: "Plus Jakarta Sans" },
  { value: "'DM Sans', sans-serif", label: "DM Sans" },
  { value: "'Space Grotesk', sans-serif", label: "Space Grotesk" },
  { value: "'Poppins', sans-serif", label: "Poppins" },
  { value: "'Syne', sans-serif", label: "Syne (Display)" },
  { value: "'Bebas Neue', cursive", label: "Bebas Neue" },
  { value: "'Playfair Display', serif", label: "Playfair Display" },
  { value: "Georgia, serif", label: "Georgia (Serif)" },
];

const NAV_SECTIONS = [
  {
    id: "presets",
    label: "Tema Otomatis",
    icon: HiOutlineSparkles,
    bg: "#ec4899",
    desc: "1-Klik Ubah Tema",
  },
  {
    id: "site",
    label: "Situs & Logo",
    icon: HiOutlineGlobe,
    bg: "#3b82f6",
    desc: "Identitas utama",
  },
  {
    id: "colors",
    label: "Warna Global",
    icon: HiOutlineColorSwatch,
    bg: "#e11d48",
    desc: "Palet utama",
  },
  {
    id: "typography",
    label: "Font & Teks",
    icon: HiOutlineAnnotation,
    bg: "#eab308",
    desc: "Gaya karakter tulisan",
  },
  {
    id: "navbar",
    label: "Navigasi Atas",
    icon: HiOutlineTemplate,
    bg: "#8b5cf6",
    desc: "Menu Navbar",
  },
  {
    id: "hero",
    label: "Banner Utama",
    icon: HiOutlineAdjustments,
    bg: "#f97316",
    desc: "Teks & latar banner",
  },
  {
    id: "jurassic",
    label: "Banner Jurassic",
    icon: HiOutlineCollection,
    bg: "#059669",
    desc: "Teks Koleksi Mendatang",
  },
  {
    id: "buttons",
    label: "Tombol Aksi",
    icon: HiOutlineCubeTransparent,
    bg: "#06b6d4",
    desc: "Tombol CTA & link",
  },
  {
    id: "cards",
    label: "Kartu Produk",
    icon: HiOutlineViewGrid,
    bg: "#14b8a6",
    desc: "Gaya box produk",
  },
  {
    id: "blog",
    label: "Kartu Artikel",
    icon: HiOutlineNewspaper,
    bg: "#d4af37",
    desc: "Tampilan berita",
  },
  {
    id: "shop",
    label: "Halaman Toko",
    icon: HiOutlineShoppingCart,
    bg: "#0ea5e9",
    desc: "Daftar & filter",
  },
  {
    id: "detail",
    label: "Detail Produk",
    icon: HiOutlineCube,
    bg: "#a78bfa",
    desc: "Halaman deskripsi",
  },
  {
    id: "forms",
    label: "Kolom Input",
    icon: HiOutlinePencilAlt,
    bg: "#f472b6",
    desc: "Tampilan formulir",
  },
  {
    id: "sections",
    label: "Judul Bagian",
    icon: HiOutlineMenuAlt3,
    bg: "#34d399",
    desc: "Pemisah blok konten",
  },
  {
    id: "footer",
    label: "Bagian Bawah",
    icon: HiOutlineChip,
    bg: "#64748b",
    desc: "Catatan & link footer",
  },
  {
    id: "badges",
    label: "Label Status",
    icon: HiOutlineTag,
    bg: "#10b981",
    desc: "Warna status pesanan",
  },
  {
    id: "advanced",
    label: "Kode CSS",
    icon: HiOutlineCode,
    bg: "#475569",
    desc: "Suntik kode khusus",
  },
];

// ─── SUB-COMPONENTS ────────────────────────────────────────────────────────────
const SectionLabel = ({ emoji, label }) => (
  <div className="flex items-center gap-2 mt-5 mb-2 first:mt-2">
    <div className="h-px flex-1 bg-white/5" />
    <span className="text-gray-500 text-[8px] font-black uppercase tracking-widest">
      {emoji} {label}
    </span>
    <div className="h-px flex-1 bg-white/5" />
  </div>
);

const FieldWrap = ({ label, desc, dirty, children }) => (
  <div className="p-3 rounded-xl bg-black/20 border border-white/[0.04] hover:border-white/10 transition-all mt-1.5">
    <div className="flex items-center justify-between mb-2">
      <div>
        <p className="text-white text-[10px] font-bold leading-none">
          {label}
          {dirty && (
            <span className="ml-2 w-1.5 h-1.5 rounded-full bg-amber-400 inline-block align-middle" />
          )}
        </p>
        {desc && (
          <p className="text-gray-600 text-[8px] mt-0.5 uppercase tracking-widest">
            {desc}
          </p>
        )}
      </div>
    </div>
    {children}
  </div>
);

// ─── SMART COLOR PICKER ────────────────────────────────────────────────────────
const QUICK_SWATCHES = [
  "#ffffff",
  "#000000",
  "#111118",
  "#1a1a2e",
  "#0a0a0b",
  "#030303",
  "#e11d48",
  "#be123c",
  "#f43f5e",
  "#fb7185",
  "#fda4af",
  "#fecdd3",
  "#f97316",
  "#ea580c",
  "#fb923c",
  "#fdba74",
  "#fde68a",
  "#fef3c7",
  "#eab308",
  "#ca8a04",
  "#d4af37",
  "#facc15",
  "#fef08a",
  "#fefce8",
  "#22c55e",
  "#16a34a",
  "#4ade80",
  "#10b981",
  "#34d399",
  "#6ee7b7",
  "#06b6d4",
  "#0891b2",
  "#22d3ee",
  "#3b82f6",
  "#2563eb",
  "#60a5fa",
  "#8b5cf6",
  "#7c3aed",
  "#a78bfa",
  "#ec4899",
  "#db2777",
  "#f472b6",
  "#64748b",
  "#475569",
  "#94a3b8",
  "#9ca3af",
  "#6b7280",
  "#374151",
  "rgba(255,255,255,0.05)",
  "rgba(255,255,255,0.1)",
  "rgba(255,255,255,0.15)",
  "rgba(255,255,255,0.2)",
  "rgba(255,255,255,0.4)",
  "rgba(255,255,255,0.6)",
  "rgba(0,0,0,0.2)",
  "rgba(0,0,0,0.4)",
  "rgba(0,0,0,0.6)",
  "rgba(0,0,0,0.8)",
  "rgba(3,3,3,0.80)",
  "rgba(3,3,3,0.95)",
];

const getDisplayColor = (val) => {
  if (!val) return "#000000";
  if (/^#[0-9a-f]{3,8}$/i.test(val)) return val;
  // rgba -> extract hex
  const m = val.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (m)
    return `#${(+m[1]).toString(16).padStart(2, "0")}${(+m[2]).toString(16).padStart(2, "0")}${(+m[3]).toString(16).padStart(2, "0")}`;
  return "#888888";
};

const ColorRow = ({ label, desc, tokenKey, value, onChange, isDirty }) => {
  const [open, setOpen] = useState(false);
  const ref = React.useRef(null);
  const isHex = /^#[0-9a-f]{6}$/i.test(value);
  const displayHex = getDisplayColor(value);

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <FieldWrap label={label} desc={desc} dirty={isDirty}>
      <div className="flex items-center gap-2.5">
        {/* Swatch button */}
        <div ref={ref} className="relative flex-shrink-0">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="w-10 h-10 rounded-xl border-2 border-white/15 hover:border-white/40 transition-all shadow-inner cursor-pointer flex-shrink-0 overflow-hidden relative"
            style={{ backgroundColor: displayHex }}
            title="Click to pick color"
          >
            {/* Checkerboard for transparency indicators */}
            {value?.includes("rgba") && (
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8'%3E%3Crect width='4' height='4' fill='%23ccc'/%3E%3Crect x='4' y='4' width='4' height='4' fill='%23ccc'/%3E%3C/svg%3E\")",
                }}
              />
            )}
          </button>

          {open && (
            <div className="absolute z-50 top-12 left-0 bg-[#111118] border border-white/15 rounded-2xl shadow-2xl shadow-black/60 p-3 w-[240px]">
              {/* Native hex picker for hex values */}
              {isHex && (
                <div className="mb-3">
                  <p className="text-[7px] font-black uppercase tracking-widest text-gray-600 mb-1.5">
                    Color Wheel
                  </p>
                  <input
                    type="color"
                    value={value}
                    onChange={(e) => onChange(tokenKey, e.target.value)}
                    className="w-full h-8 rounded-lg cursor-pointer border-0 bg-transparent"
                    style={{ colorScheme: "dark" }}
                  />
                </div>
              )}

              {/* Swatches grid */}
              <p className="text-[7px] font-black uppercase tracking-widest text-gray-600 mb-1.5">
                Quick Swatches
              </p>
              <div className="grid grid-cols-6 gap-1 mb-3">
                {QUICK_SWATCHES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      onChange(tokenKey, c);
                      setOpen(false);
                    }}
                    className="w-full aspect-square rounded-md border-2 transition-all hover:scale-110 hover:z-10"
                    style={{
                      backgroundColor: c.includes("rgba")
                        ? getDisplayColor(c)
                        : c,
                      borderColor: value === c ? "white" : "transparent",
                      opacity: c.includes("rgba") ? 0.7 : 1,
                    }}
                    title={c}
                  />
                ))}
              </div>

              {/* Manual input */}
              <p className="text-[7px] font-black uppercase tracking-widest text-gray-600 mb-1">
                Manual value
              </p>
              <input
                value={value || ""}
                onChange={(e) => onChange(tokenKey, e.target.value)}
                placeholder="#e11d48 or rgba(225,29,72,0.8)"
                className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-2 text-white text-[9px] font-mono focus:outline-none focus:border-rose-500/40"
              />
            </div>
          )}
        </div>

        {/* Text input */}
        <input
          value={value || ""}
          onChange={(e) => onChange(tokenKey, e.target.value)}
          placeholder="#hex or rgba()"
          className="flex-1 bg-black/30 border border-white/8 rounded-lg px-3 py-2.5 text-white text-[10px] font-mono focus:outline-none focus:border-rose-500/40 transition-all"
        />
      </div>
    </FieldWrap>
  );
};

const TextRow = ({
  label,
  desc,
  tokenKey,
  value,
  onChange,
  placeholder,
  isDirty,
  multiline,
}) => (
  <FieldWrap label={label} desc={desc} dirty={isDirty}>
    {multiline ? (
      <textarea
        value={value || ""}
        onChange={(e) => onChange(tokenKey, e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full bg-black/30 border border-white/8 rounded-lg px-3 py-2 text-white text-[10px] focus:outline-none focus:border-blue-500/40 transition-all resize-none leading-relaxed"
      />
    ) : (
      <input
        value={value || ""}
        onChange={(e) => onChange(tokenKey, e.target.value)}
        placeholder={placeholder}
        className="w-full bg-black/30 border border-white/8 rounded-lg px-3 py-2 text-white text-[10px] focus:outline-none focus:border-blue-500/40 transition-all"
      />
    )}
  </FieldWrap>
);

const SelectRow = ({
  label,
  desc,
  tokenKey,
  value,
  onChange,
  options,
  isDirty,
}) => (
  <FieldWrap label={label} desc={desc} dirty={isDirty}>
    <select
      value={value || ""}
      onChange={(e) => onChange(tokenKey, e.target.value)}
      className="w-full bg-black/40 border border-white/8 rounded-lg px-3 py-2.5 text-white text-[10px] focus:outline-none focus:border-blue-500/40 transition-all appearance-none cursor-pointer"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} style={{ fontFamily: o.value }}>
          {o.label}
        </option>
      ))}
    </select>
  </FieldWrap>
);

const ImageRow = ({ label, desc, tokenKey, value, onChange }) => {
  const [uploading, setUploading] = useState(false);
  const src = value
    ? value.startsWith("http")
      ? value
      : `${UPLOAD_BASE_URL}${value}`
    : null;

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await adminService.uploadFile(file);
      onChange(tokenKey, res.url || res.path || res.file_url);
    } catch (err) {
      showToast.error("Upload gagal");
    } finally {
      setUploading(false);
    }
  };

  return (
    <FieldWrap label={label} desc={desc}>
      {src && (
        <div
          className="relative mb-2 rounded-lg overflow-hidden bg-black/30"
          style={{ aspectRatio: "16/5" }}
        >
          <img
            src={src}
            alt=""
            className="w-full h-full object-cover opacity-80"
            onError={(e) => (e.target.style.display = "none")}
          />
          <div className="absolute inset-0 bg-black/20" />
          <button
            onClick={() => onChange(tokenKey, "")}
            className="absolute top-2 right-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-red-500/60 transition-all text-xs"
          >
            ×
          </button>
        </div>
      )}
      <label className="flex items-center justify-center gap-2 w-full py-2.5 bg-white/[0.04] border border-dashed border-white/15 rounded-lg cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/5 text-[10px] uppercase tracking-widest font-black text-gray-500 hover:text-blue-400 transition-all">
        <HiOutlinePhotograph className="w-3.5 h-3.5" />
        {uploading ? "Uploading…" : src ? "Change Image" : "Upload Image"}
        <input
          type="file"
          className="hidden"
          accept="image/*"
          onChange={upload}
          disabled={uploading}
        />
      </label>
    </FieldWrap>
  );
};

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────────
const ThemePage = () => {
  const { updateThemeContext } = useTheme();
  const [draft, setDraft] = useState({ ...DEFAULT_THEME });
  const [savedBase, setSavedBase] = useState({ ...DEFAULT_THEME });
  const [history, setHistory] = useState([{ ...DEFAULT_THEME }]);
  const [histIdx, setHistIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [activeSection, setActiveSection] = useState("presets");
  const [viewport, setViewport] = useState("desktop");
  const [search, setSearch] = useState("");

  // FIX #3: Always-fresh refs so keyboard handlers never get stale closures
  const draftRef = React.useRef(draft);
  const savedBaseRef = React.useRef(savedBase);
  useEffect(() => { draftRef.current = draft; }, [draft]);
  useEffect(() => { savedBaseRef.current = savedBase; }, [savedBase]);

  // Load settings from API
  useEffect(() => {
    adminService
      .getSettings()
      .then((data) => {
        const arr = Array.isArray(data) ? data : data?.data || [];
        const obj = {};
        arr.forEach((s) => {
          obj[s.key] = s.value;
        });
        const merged = { ...DEFAULT_THEME };
        Object.keys(DEFAULT_THEME).forEach((k) => {
          if (obj[k]) merged[k] = obj[k];
        });
        setDraft(merged);
        setSavedBase(merged);
        setHistory([merged]);
        setHistIdx(0);
        // Instead of firing 70 times, rely on the global context which loads its own state on mount.
        // Or broadcast a bulk update event if supported.
        if (window.ThemeContext_BulkUpdate) {
          window.ThemeContext_BulkUpdate(merged);
        } else {
          // If it isn't available, only update the ones that differ from context's current state
          // However ThemeProvider handles its own fetch on mount, so we can avoid doing anything here!
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // FIX #3: Keyboard shortcuts use refs for fresh state (no stale closures)
  const handleSaveRef = React.useRef(null);
  useEffect(() => {
    const handler = (e) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === "z" && !e.shiftKey) {
          e.preventDefault();
          handleUndo();
        }
        if ((e.key === "z" && e.shiftKey) || e.key === "y") {
          e.preventDefault();
          handleRedo();
        }
        if (e.key === "s") {
          e.preventDefault();
          // Use refs to always access fresh draft and savedBase
          const currentDraft = draftRef.current;
          const currentSavedBase = savedBaseRef.current;
          const hasDirty = Object.keys(currentDraft).some(k => currentDraft[k] !== currentSavedBase[k]);
          if (hasDirty && handleSaveRef.current) handleSaveRef.current();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [histIdx, history]);

  const pushHistory = useCallback(
    (newDraft) => {
      setHistory((prev) => {
        const next = prev.slice(0, histIdx + 1);
        return [...next, newDraft];
      });
      setHistIdx((prev) => prev + 1);
    },
    [histIdx],
  );

  const handleUndo = useCallback(() => {
    if (histIdx <= 0) return;
    const prev = history[histIdx - 1];
    setHistIdx(histIdx - 1);
    setDraft(prev);
    Object.entries(prev).forEach(([k, v]) => updateThemeContext?.(k, v));
  }, [histIdx, history]);

  const handleRedo = useCallback(() => {
    if (histIdx >= history.length - 1) return;
    const next = history[histIdx + 1];
    setHistIdx(histIdx + 1);
    setDraft(next);
    Object.entries(next).forEach(([k, v]) => updateThemeContext?.(k, v));
  }, [histIdx, history]);

  // Throttle history saves for continuous inputs like color pickers
  const debounceHistory = React.useRef(null);
  const handleChange = (key, val) => {
    const newDraft = { ...draft, [key]: val };
    setDraft(newDraft);
    updateThemeContext?.(key, val);

    // Debounce pushing to history so sliding color pickers don't create thousands of undo states
    clearTimeout(debounceHistory.current);
    debounceHistory.current = setTimeout(() => {
      pushHistory(newDraft);
    }, 500);
  };

  const applyPreset = (preset) => {
    // Prepare content keys that should not be overwritten
    const preserveKeys = [
      "theme_hero_title",
      "theme_hero_subtitle",
      "theme_hero_image",
      "theme_logo",
      "theme_custom_css",
    ];
    const contentTokens = {};
    preserveKeys.forEach((k) => (contentTokens[k] = draft[k]));

    // Construct a highly robust full draft merging current structural parameters safely
    const newDraft = {
      ...DEFAULT_THEME,
      ...draft,
      ...preset.colors,
      ...contentTokens,
    };

    setDraft(newDraft);
    if (window.ThemeContext_BulkUpdate) {
      window.ThemeContext_BulkUpdate(newDraft);
    } else {
      // Dispatch postMessage for UI preview
      try {
        Array.from(document.querySelectorAll("iframe")).forEach((iframe) => {
          iframe.contentWindow?.postMessage(
            { type: "THEME_PREVIEW", theme: newDraft },
            window.location.origin,
          );
        });
      } catch (e) { }
      // Fallback injection
      Object.entries(newDraft).forEach(([k, v]) => updateThemeContext?.(k, v));
    }
    pushHistory(newDraft);
    showToast.success(`Tema "${preset.name}" berhasil diterapkan!`);
  };

  // FIX #1: Single bulk request instead of N individual requests
  const handleSave = async () => {
    setSaving(true);
    try {
      // Use fresh refs so this also works correctly from keyboard shortcut
      const currentDraft = draftRef.current;
      const currentSavedBase = savedBaseRef.current;

      // Collect all dirty keys
      const toUpdate = Object.keys(currentDraft)
        .filter(k => currentDraft[k] !== currentSavedBase[k])
        .map(k => ({ key: k, value: currentDraft[k] }));

      if (toUpdate.length === 0) {
        showToast.info("Tidak ada perubahan untuk disimpan.");
        setSaving(false);
        return;
      }

      // FIX #1: Single bulk HTTP request instead of N requests
      await adminService.bulkUpdateSettings(toUpdate);

      setSavedBase({ ...currentDraft });
      setSavedFeedback(true);
      showToast.success(`${toUpdate.length} perubahan tema berhasil dipublish!`);
      setTimeout(() => setSavedFeedback(false), 3000);
    } catch (e) {
      showToast.error("Gagal menyimpan: " + e.message);
    } finally {
      setSaving(false);
    }
  };
  // Keep handleSaveRef in sync so keyboard shortcut always calls latest version
  handleSaveRef.current = handleSave;

  const dirtyKeys = Object.keys(draft).filter((k) => draft[k] !== savedBase[k]);
  const isDirty = (key) => dirtyKeys.includes(key);
  const activeSec = NAV_SECTIONS.find((s) => s.id === activeSection);

  // Color sections config
  const colorGroups = {
    colors: [
      {
        key: "theme_accent_color",
        label: "Accent / Primary",
        desc: "CTA, links & highlights",
      },
      {
        key: "theme_accent_hover",
        label: "Accent Hover",
        desc: "Hover & active state",
      },
      {
        key: "theme_bg_color",
        label: "Page Background",
        desc: "Main site fill",
      },
      {
        key: "theme_surface_color",
        label: "Surface / Panel",
        desc: "Cards & modals",
      },
      {
        key: "theme_border_color",
        label: "Border Color",
        desc: "Dividers & outlines",
      },
      {
        key: "theme_text_primary",
        label: "Primary Text",
        desc: "Headings & labels",
      },
      {
        key: "theme_text_secondary",
        label: "Secondary Text",
        desc: "Body & muted text",
      },
      {
        key: "theme_text_accent",
        label: "Accent Text",
        desc: "Colored labels",
      },
    ],
    navbar: [
      { key: "theme_navbar_bg", label: "Background", desc: "rgba() supported" },
      { key: "theme_navbar_text", label: "Nav Links", desc: "Default color" },
      {
        key: "theme_navbar_text_hover",
        label: "Link Hover",
        desc: "Active/hovered",
      },
      {
        key: "theme_navbar_border",
        label: "Bottom Border",
        desc: "Dividing line",
      },
    ],
    footer: [
      { key: "theme_footer_bg", label: "Background" },
      { key: "theme_footer_border", label: "Top Border" },
      { key: "theme_footer_heading", label: "Column Headings" },
      { key: "theme_footer_text", label: "Body Text" },
      { key: "theme_footer_link", label: "Links" },
      { key: "theme_footer_link_hover", label: "Link Hover" },
    ],
    badges: [
      {
        key: "theme_badge_success",
        label: "Success / Completed",
        desc: "Paid, Delivered",
      },
      {
        key: "theme_badge_warning",
        label: "Warning / Pending",
        desc: "Awaiting payment",
      },
      {
        key: "theme_badge_error",
        label: "Error / Cancelled",
        desc: "Failed, Rejected",
      },
      { key: "theme_badge_info", label: "Info / Shipping", desc: "In transit" },
    ],
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-white/10 border-t-rose-500 rounded-full animate-spin" />
          <p className="text-gray-600 text-[9px] font-black uppercase tracking-widest">
            Loading Theme Studio…
          </p>
        </div>
      </div>
    );

  const colorSectionKeys = Object.keys(colorGroups);

  return (
    <div
      className="flex flex-col -mx-4 md:-mx-6 -my-4 md:-my-6 bg-[#07070e]"
      style={{ height: "calc(100vh - 72px)", overflow: "hidden" }}
    >
      {/* ── TOP BAR ── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06] bg-[#09090f] flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/settings"
            className="flex items-center gap-1.5 text-gray-600 hover:text-white transition-colors text-[9px] font-black uppercase tracking-widest"
          >
            <HiOutlineArrowLeft className="w-3.5 h-3.5" /> Kembali
          </Link>
          <span className="text-white/10">|</span>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-rose-500 via-violet-500 to-blue-500 flex items-center justify-center shadow-lg shadow-rose-500/20">
              <HiOutlineColorSwatch className="w-3 h-3 text-white" />
            </div>
            <div>
              <span className="text-white font-black text-[11px] uppercase tracking-tight">
                Theme Studio
              </span>
              {dirtyKeys.length > 0 && (
                <span className="ml-2 text-amber-400 text-[8px] font-black uppercase tracking-widest">
                  • {dirtyKeys.length} belum tersimpan
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Undo/Redo */}
          <div className="flex items-center gap-0.5 bg-white/[0.04] rounded-lg p-1 border border-white/[0.06]">
            <button
              onClick={handleUndo}
              disabled={histIdx <= 0}
              title="Undo (⌘Z)"
              className="p-1.5 rounded-md text-gray-500 hover:text-white disabled:opacity-25 hover:bg-white/10 transition-all"
            >
              <HiArrowLeft className="w-3 h-3" />
            </button>
            <span className="text-gray-700 text-[8px] font-bold px-1 tabular-nums">
              {histIdx}/{history.length - 1}
            </span>
            <button
              onClick={handleRedo}
              disabled={histIdx >= history.length - 1}
              title="Redo (⌘Y)"
              className="p-1.5 rounded-md text-gray-500 hover:text-white disabled:opacity-25 hover:bg-white/10 transition-all"
            >
              <HiArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Viewport */}
          <div className="flex items-center gap-0.5 bg-white/[0.04] rounded-lg p-1 border border-white/[0.06]">
            {[
              {
                v: "desktop",
                icon: HiOutlineDesktopComputer,
                label: "Desktop",
              },
              { v: "mobile", icon: HiOutlineDeviceMobile, label: "Mobile" },
            ].map(({ v, icon: Icon, label }) => (
              <button
                key={v}
                onClick={() => setViewport(v)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[9px] font-black uppercase tracking-wide transition-all ${viewport === v ? "bg-white/15 text-white" : "text-gray-600 hover:text-gray-300"}`}
              >
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </div>

          {/* Publish */}
          <button
            onClick={handleSave}
            disabled={saving || dirtyKeys.length === 0}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-lg ${savedFeedback ? "bg-emerald-500 text-white shadow-emerald-500/20" : dirtyKeys.length > 0 ? "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-emerald-500/20" : "bg-white/[0.04] text-gray-600 cursor-not-allowed border border-white/[0.06]"}`}
          >
            {savedFeedback ? (
              <HiOutlineCheckCircle className="w-3.5 h-3.5" />
            ) : (
              <HiOutlineSave className="w-3.5 h-3.5" />
            )}
            {saving
              ? "Memproses…"
              : savedFeedback
                ? "Tersimpan!"
                : `Simpan Tema${dirtyKeys.length > 0 ? ` (${dirtyKeys.length})` : ""}`}
          </button>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* LEFT: Grouped nav sidebar */}
        <div className="w-[200px] flex-shrink-0 bg-[#08080e] border-r border-white/[0.05] flex flex-col overflow-y-auto">
          {[
            { group: "✨ Tema Utama", items: ["presets"] },
            {
              group: "🌐 Pengaturan Umum",
              items: ["site", "colors", "typography"],
            },
            {
              group: "📄 Ubah Halaman",
              items: ["hero", "jurassic", "shop", "blog", "detail"],
            },
            {
              group: "🧩 Percantik Elemen",
              items: [
                "navbar",
                "buttons",
                "cards",
                "sections",
                "forms",
                "footer",
                "badges",
              ],
            },
            { group: "⚙️ Tingkat Lanjut", items: ["advanced"] },
          ].map(({ group, items }) => (
            <div key={group} className="pt-3 pb-1">
              <p className="px-3 text-[8px] font-black uppercase tracking-widest text-gray-700 mb-1">
                {group}
              </p>
              {items.map((id) => {
                const s = NAV_SECTIONS.find((n) => n.id === id);
                if (!s) return null;
                const hasDirty = dirtyKeys.some((k) => {
                  if (s.id === "colors")
                    return colorGroups.colors?.some((r) => r.key === k);
                  if (s.id === "navbar")
                    return colorGroups.navbar?.some((r) => r.key === k);
                  if (s.id === "footer")
                    return colorGroups.footer?.some((r) => r.key === k);
                  if (s.id === "badges")
                    return colorGroups.badges?.some((r) => r.key === k);
                  if (s.id === "site")
                    return ["theme_logo", "theme_hero_image"].some(
                      (x) => x === k,
                    );
                  if (s.id === "hero")
                    return ["theme_hero_title", "theme_hero_subtitle"].some(
                      (x) => x === k,
                    );
                  if (s.id === "jurassic")
                    return k.startsWith("theme_jurassic");
                  if (s.id === "buttons") return k.startsWith("theme_btn");
                  if (s.id === "cards") return k.startsWith("theme_card");
                  if (s.id === "blog") return k.startsWith("theme_blog");
                  if (s.id === "shop") return k.startsWith("theme_shop");
                  if (s.id === "detail") return k.startsWith("theme_detail");
                  if (s.id === "forms")
                    return (
                      k.startsWith("theme_input") || k === "theme_label_color"
                    );
                  if (s.id === "sections") return k.startsWith("theme_section");
                  if (s.id === "typography") return k.startsWith("theme_font");
                  if (s.id === "advanced") return k === "theme_custom_css";
                  return false;
                });
                const isActive = activeSection === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveSection(s.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 mx-0 transition-all text-left relative group ${isActive ? "text-white" : "text-gray-500 hover:text-gray-200 hover:bg-white/[0.03]"}`}
                    style={
                      isActive
                        ? {
                          backgroundColor: s.bg + "18",
                          borderLeft: `2px solid ${s.bg}`,
                        }
                        : { borderLeft: "2px solid transparent" }
                    }
                  >
                    <div
                      className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: isActive ? s.bg + "30" : "transparent",
                      }}
                    >
                      <s.icon
                        className="w-3 h-3"
                        style={{ color: isActive ? s.bg : "currentColor" }}
                      />
                    </div>
                    <span className="text-[10px] font-bold flex-1">
                      {s.label}
                    </span>
                    {hasDirty && (
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* CENTER: Editor panel */}
        <div className="w-[340px] flex-shrink-0 bg-[#09090f] border-r border-white/[0.05] flex flex-col overflow-hidden shadow-[20px_0_40px_rgba(0,0,0,0.5)]">
          {/* Section header */}
          <div className="flex-shrink-0 px-4 py-3 border-b border-white/[0.05] bg-[#0a0a11]">
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{
                  backgroundColor: activeSec?.bg + "22",
                  border: `1px solid ${activeSec?.bg}33`,
                }}
              >
                {activeSec && (
                  <activeSec.icon
                    className="w-3.5 h-3.5"
                    style={{ color: activeSec.bg }}
                  />
                )}
              </div>
              <div>
                <p className="text-white text-[10px] font-black uppercase tracking-widest">
                  {activeSec?.label}
                </p>
                <p className="text-gray-600 text-[8px] uppercase tracking-widest mt-0.5">
                  {activeSec?.desc}
                </p>
              </div>
            </div>

            {/* Search bar for color sections */}
            {[...colorSectionKeys, "navbar", "footer", "badges"].includes(
              activeSection,
            ) && (
                <div className="relative mt-2.5">
                  <HiOutlineSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-600" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search tokens…"
                    className="w-full bg-black/30 border border-white/[0.08] rounded-lg pl-7 pr-3 py-1.5 text-[9px] text-white focus:outline-none focus:border-blue-500/30 transition-all"
                  />
                </div>
              )}
          </div>

          {/* Scrollable editor */}
          <div
            className="flex-1 overflow-y-auto px-3 pb-6"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "#333 transparent",
            }}
          >
            {/* ── SITE ── */}
            {activeSection === "site" && (
              <div className="mt-2 space-y-0">
                <SectionLabel emoji="🏷️" label="Store Identity" />
                <ImageRow
                  label="Site Logo"
                  desc="Shown in navbar & footer"
                  tokenKey="theme_logo"
                  value={draft.theme_logo}
                  onChange={handleChange}
                />

                <SectionLabel emoji="🖼️" label="Background Image" />
                <ImageRow
                  label="Hero Background"
                  desc="Landing page cinematic image"
                  tokenKey="theme_hero_image"
                  value={draft.theme_hero_image}
                  onChange={handleChange}
                />
              </div>
            )}

            {/* ── HERO TEXT ── */}
            {activeSection === "hero" && (
              <div className="mt-2 space-y-0">
                <SectionLabel emoji="📝" label="Hero Text" />
                <TextRow
                  label="Hero Title"
                  desc="Main heading (H1)"
                  tokenKey="theme_hero_title"
                  value={draft.theme_hero_title}
                  onChange={handleChange}
                  placeholder="Discover the Best Collectibles…"
                  isDirty={isDirty("theme_hero_title")}
                />
                <TextRow
                  label="Hero Subtitle"
                  desc="Subheading below title"
                  tokenKey="theme_hero_subtitle"
                  value={draft.theme_hero_subtitle}
                  onChange={handleChange}
                  isDirty={isDirty("theme_hero_subtitle")}
                  multiline
                />

                <SectionLabel emoji="🎨" label="Background" />
                <ImageRow
                  label="Hero Background Image"
                  desc="Full cinematic background"
                  tokenKey="theme_hero_image"
                  value={draft.theme_hero_image}
                  onChange={handleChange}
                />
                <ColorRow
                  label="Page Background Color"
                  desc="Fallback when no image"
                  tokenKey="theme_bg_color"
                  value={draft.theme_bg_color}
                  onChange={handleChange}
                  isDirty={isDirty("theme_bg_color")}
                />

                <SectionLabel emoji="🔲" label="Hero Layout" />
                <ColorRow
                  label="Surface / Overlay"
                  desc="Cards & panels behind text"
                  tokenKey="theme_surface_color"
                  value={draft.theme_surface_color}
                  onChange={handleChange}
                  isDirty={isDirty("theme_surface_color")}
                />
              </div>
            )}

            {/* ── JURASSIC BANNER ── */}
            {activeSection === "jurassic" && (
              <div className="mt-2 space-y-0">
                <SectionLabel emoji="🦖" label="Jurassic Section Text" />
                <TextRow
                  label="Label / Series Name"
                  desc="Eyebrow text above title"
                  tokenKey="theme_jurassic_label"
                  value={draft.theme_jurassic_label}
                  onChange={handleChange}
                  isDirty={isDirty("theme_jurassic_label")}
                />
                <TextRow
                  label="Title"
                  desc="Heading text (supports HTML like <br/>)"
                  tokenKey="theme_jurassic_title"
                  value={draft.theme_jurassic_title}
                  onChange={handleChange}
                  isDirty={isDirty("theme_jurassic_title")}
                  multiline
                />
                <TextRow
                  label="Description"
                  desc="Paragraph below the title"
                  tokenKey="theme_jurassic_desc"
                  value={draft.theme_jurassic_desc}
                  onChange={handleChange}
                  isDirty={isDirty("theme_jurassic_desc")}
                  multiline
                />
                <TextRow
                  label="Button Text"
                  desc="Call to action button label"
                  tokenKey="theme_jurassic_btn"
                  value={draft.theme_jurassic_btn}
                  onChange={handleChange}
                  isDirty={isDirty("theme_jurassic_btn")}
                />

                <SectionLabel emoji="🖼️" label="Background Image" />
                <ImageRow
                  label="Background Image"
                  desc="Image mapped over the banner"
                  tokenKey="theme_jurassic_bg"
                  value={draft.theme_jurassic_bg}
                  onChange={handleChange}
                />

                <SectionLabel emoji="🖼️" label="Showcase Images" />
                <ImageRow
                  label="Showcase Image 1"
                  desc="Left/Top rotating image (leave empty to use product)"
                  tokenKey="theme_jurassic_img1"
                  value={draft.theme_jurassic_img1}
                  onChange={handleChange}
                />
                <ImageRow
                  label="Showcase Image 2"
                  desc="Right/Bottom rotating image (leave empty to use product)"
                  tokenKey="theme_jurassic_img2"
                  value={draft.theme_jurassic_img2}
                  onChange={handleChange}
                />
              </div>
            )}

            {/* ── COLORS ── */}
            {activeSection === "colors" && (
              <div className="mt-2">
                {colorGroups.colors
                  .filter(
                    (r) =>
                      !search ||
                      r.label.toLowerCase().includes(search.toLowerCase()) ||
                      (r.desc || "")
                        .toLowerCase()
                        .includes(search.toLowerCase()),
                  )
                  .map((r) => (
                    <ColorRow
                      key={r.key}
                      label={r.label}
                      desc={r.desc}
                      tokenKey={r.key}
                      value={draft[r.key]}
                      onChange={handleChange}
                      isDirty={isDirty(r.key)}
                    />
                  ))}

                {/* Live swatch preview */}
                <div className="mt-4 p-3 rounded-xl bg-black/20 border border-white/[0.05]">
                  <p className="text-[8px] font-black uppercase tracking-widest text-gray-600 mb-2">
                    Live Palette Preview
                  </p>
                  <div className="flex gap-1.5 flex-wrap">
                    {colorGroups.colors.map((r) => (
                      <div
                        key={r.key}
                        title={r.label}
                        className="flex flex-col items-center gap-1 group cursor-pointer"
                        onClick={() => setSearch(r.label)}
                      >
                        <div
                          className="w-7 h-7 rounded-md border border-white/10 shadow-md transition-transform group-hover:scale-110"
                          style={{ backgroundColor: draft[r.key] || "#333" }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── NAVBAR ── */}
            {activeSection === "navbar" && (
              <div className="mt-2">
                {colorGroups.navbar
                  .filter(
                    (r) =>
                      !search ||
                      r.label.toLowerCase().includes(search.toLowerCase()),
                  )
                  .map((r) => (
                    <ColorRow
                      key={r.key}
                      label={r.label}
                      desc={r.desc}
                      tokenKey={r.key}
                      value={draft[r.key]}
                      onChange={handleChange}
                      isDirty={isDirty(r.key)}
                    />
                  ))}

                {/* Navbar preview */}
                <div className="mt-4 rounded-xl overflow-hidden border border-white/[0.07]">
                  <div
                    className="flex items-center justify-between px-4 py-3"
                    style={{
                      backgroundColor: draft.theme_navbar_bg,
                      borderBottom: `1px solid ${draft.theme_navbar_border}`,
                    }}
                  >
                    <span
                      className="text-[10px] font-black uppercase tracking-widest"
                      style={{ color: draft.theme_text_primary }}
                    >
                      LOGO
                    </span>
                    <div className="flex gap-4">
                      {["Home", "Shop", "Blog"].map((l) => (
                        <span
                          key={l}
                          className="text-[8px] font-bold uppercase tracking-widest"
                          style={{ color: draft.theme_navbar_text }}
                        >
                          {l}
                        </span>
                      ))}
                    </div>
                    <div
                      className="px-3 py-1 rounded text-[8px] font-black uppercase"
                      style={{
                        backgroundColor: draft.theme_btn_primary_bg,
                        color: draft.theme_btn_primary_text,
                        borderRadius: draft.theme_btn_radius,
                      }}
                    >
                      Sign In
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── BUTTONS ── */}
            {activeSection === "buttons" && (
              <div className="mt-2">
                <SectionLabel emoji="▶" label="Primary Button" />
                <ColorRow
                  label="Background"
                  tokenKey="theme_btn_primary_bg"
                  value={draft.theme_btn_primary_bg}
                  onChange={handleChange}
                  isDirty={isDirty("theme_btn_primary_bg")}
                />
                <ColorRow
                  label="Text Color"
                  tokenKey="theme_btn_primary_text"
                  value={draft.theme_btn_primary_text}
                  onChange={handleChange}
                  isDirty={isDirty("theme_btn_primary_text")}
                />
                <ColorRow
                  label="Hover BG"
                  tokenKey="theme_btn_primary_hover"
                  value={draft.theme_btn_primary_hover}
                  onChange={handleChange}
                  isDirty={isDirty("theme_btn_primary_hover")}
                />

                <SectionLabel emoji="○" label="Secondary Button" />
                <ColorRow
                  label="Background"
                  tokenKey="theme_btn_secondary_bg"
                  value={draft.theme_btn_secondary_bg}
                  onChange={handleChange}
                  isDirty={isDirty("theme_btn_secondary_bg")}
                />
                <ColorRow
                  label="Text Color"
                  tokenKey="theme_btn_secondary_text"
                  value={draft.theme_btn_secondary_text}
                  onChange={handleChange}
                  isDirty={isDirty("theme_btn_secondary_text")}
                />

                <SectionLabel emoji="⬛" label="Shape" />
                <SelectRow
                  label="Border Radius"
                  desc="Applies to all buttons"
                  tokenKey="theme_btn_radius"
                  value={draft.theme_btn_radius}
                  onChange={handleChange}
                  options={RADIUS_OPTIONS}
                  isDirty={isDirty("theme_btn_radius")}
                />

                {/* Button preview */}
                <div className="mt-4 p-4 rounded-xl bg-black/20 border border-white/[0.05] space-y-3">
                  <p className="text-[8px] font-black uppercase tracking-widest text-gray-600">
                    Preview
                  </p>
                  <div className="flex gap-3 flex-wrap">
                    <button
                      style={{
                        backgroundColor: draft.theme_btn_primary_bg,
                        color: draft.theme_btn_primary_text,
                        borderRadius: draft.theme_btn_radius,
                      }}
                      className="px-5 py-2.5 text-[9px] font-black uppercase tracking-widest"
                    >
                      Primary CTA
                    </button>
                    <button
                      style={{
                        backgroundColor: draft.theme_btn_secondary_bg,
                        color: draft.theme_btn_secondary_text,
                        borderRadius: draft.theme_btn_radius,
                        border: `1px solid ${draft.theme_border_color}`,
                      }}
                      className="px-5 py-2.5 text-[9px] font-black uppercase tracking-widest"
                    >
                      Secondary
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── CARDS ── */}
            {activeSection === "cards" && (
              <div className="mt-2">
                <SectionLabel emoji="🃏" label="Product Card Style" />
                <ColorRow
                  label="Card Background"
                  tokenKey="theme_card_bg"
                  value={draft.theme_card_bg}
                  onChange={handleChange}
                  isDirty={isDirty("theme_card_bg")}
                />
                <ColorRow
                  label="Card Border"
                  tokenKey="theme_card_border"
                  value={draft.theme_card_border}
                  onChange={handleChange}
                  isDirty={isDirty("theme_card_border")}
                />
                <ColorRow
                  label="Hover Border"
                  desc="On hover state"
                  tokenKey="theme_card_hover_border"
                  value={draft.theme_card_hover_border}
                  onChange={handleChange}
                  isDirty={isDirty("theme_card_hover_border")}
                />

                <SectionLabel emoji="⬛" label="Card Shape" />
                <SelectRow
                  label="Border Radius"
                  tokenKey="theme_card_radius"
                  value={draft.theme_card_radius}
                  onChange={handleChange}
                  options={RADIUS_OPTIONS}
                  isDirty={isDirty("theme_card_radius")}
                />

                {/* Card preview */}
                <div className="mt-4 p-4 rounded-xl bg-black/20 border border-white/[0.05]">
                  <p className="text-[8px] font-black uppercase tracking-widest text-gray-600 mb-3">
                    Preview
                  </p>
                  <div
                    style={{
                      backgroundColor: draft.theme_card_bg,
                      border: `1px solid ${draft.theme_card_border}`,
                      borderRadius: draft.theme_card_radius,
                    }}
                    className="p-3 max-w-[160px]"
                  >
                    <div
                      style={{
                        backgroundColor: draft.theme_accent_color + "15",
                        borderRadius:
                          Math.max(0, parseInt(draft.theme_card_radius) - 4) +
                          "px",
                      }}
                      className="aspect-square mb-2 flex items-center justify-center"
                    >
                      <span
                        style={{
                          color: draft.theme_accent_color,
                          opacity: 0.5,
                          fontSize: 10,
                        }}
                      >
                        IMAGE
                      </span>
                    </div>
                    <p
                      style={{
                        color: draft.theme_text_primary,
                        fontFamily: draft.theme_font_primary,
                      }}
                      className="text-[9px] font-bold mb-1"
                    >
                      Product Name
                    </p>
                    <p
                      style={{ color: draft.theme_accent_color }}
                      className="text-[11px] font-black"
                    >
                      Rp 1.200.000
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── TYPOGRAPHY ── */}
            {activeSection === "typography" && (
              <div className="mt-2">
                <SectionLabel emoji="🔤" label="Font Families" />
                <SelectRow
                  label="Body / UI Font"
                  desc="Paragraphs & buttons"
                  tokenKey="theme_font_primary"
                  value={draft.theme_font_primary}
                  onChange={handleChange}
                  options={FONT_OPTIONS}
                  isDirty={isDirty("theme_font_primary")}
                />
                <SelectRow
                  label="Heading Font"
                  desc="H1, H2, titles"
                  tokenKey="theme_font_heading"
                  value={draft.theme_font_heading}
                  onChange={handleChange}
                  options={FONT_OPTIONS}
                  isDirty={isDirty("theme_font_heading")}
                />

                {/* Font preview */}
                <div className="mt-4 p-4 rounded-xl bg-black/20 border border-white/[0.05] space-y-3">
                  <p className="text-[8px] font-black uppercase tracking-widest text-gray-600">
                    Live Preview
                  </p>
                  <h3
                    className="text-[22px] font-black uppercase tracking-tighter leading-none"
                    style={{
                      fontFamily: draft.theme_font_heading,
                      color: draft.theme_text_primary,
                    }}
                  >
                    Premium Collectibles
                  </h3>
                  <p
                    className="text-[12px] leading-relaxed"
                    style={{
                      fontFamily: draft.theme_font_primary,
                      color: draft.theme_text_secondary,
                    }}
                  >
                    Curating the finest specimens from global artisans. Your
                    gateway to the ultimate collection.
                  </p>
                  <p
                    className="text-[9px] font-bold uppercase tracking-widest"
                    style={{
                      color: draft.theme_accent_color,
                      fontFamily: draft.theme_font_primary,
                    }}
                  >
                    Shop Collection →
                  </p>
                </div>
              </div>
            )}

            {/* ── FOOTER ── */}
            {activeSection === "footer" && (
              <div className="mt-2">
                {colorGroups.footer
                  .filter(
                    (r) =>
                      !search ||
                      r.label.toLowerCase().includes(search.toLowerCase()),
                  )
                  .map((r) => (
                    <ColorRow
                      key={r.key}
                      label={r.label}
                      desc={r.desc || ""}
                      tokenKey={r.key}
                      value={draft[r.key]}
                      onChange={handleChange}
                      isDirty={isDirty(r.key)}
                    />
                  ))}

                {/* Footer preview */}
                <div className="mt-4 rounded-xl overflow-hidden border border-white/[0.07]">
                  <div
                    style={{
                      backgroundColor: draft.theme_footer_bg,
                      borderTop: `1px solid ${draft.theme_footer_border}`,
                    }}
                    className="p-4"
                  >
                    <p
                      style={{
                        color: draft.theme_footer_heading,
                        fontFamily: draft.theme_font_heading,
                      }}
                      className="text-[9px] font-black uppercase tracking-wider mb-2"
                    >
                      Warung Forza
                    </p>
                    <p
                      style={{ color: draft.theme_footer_text }}
                      className="text-[8px] mb-3"
                    >
                      Premium collectibles. Trusted worldwide.
                    </p>
                    <div className="flex gap-4">
                      {["Pre Order", "Ready Stock", "Blog"].map((l) => (
                        <span
                          key={l}
                          style={{ color: draft.theme_footer_link }}
                          className="text-[8px] font-bold uppercase tracking-wider"
                        >
                          {l}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── BADGES ── */}
            {activeSection === "badges" && (
              <div className="mt-2">
                {colorGroups.badges
                  .filter(
                    (r) =>
                      !search ||
                      r.label.toLowerCase().includes(search.toLowerCase()),
                  )
                  .map((r) => (
                    <ColorRow
                      key={r.key}
                      label={r.label}
                      desc={r.desc || ""}
                      tokenKey={r.key}
                      value={draft[r.key]}
                      onChange={handleChange}
                      isDirty={isDirty(r.key)}
                    />
                  ))}

                {/* Badge preview */}
                <div className="mt-4 p-3 rounded-xl bg-black/20 border border-white/[0.05]">
                  <p className="text-[8px] font-black uppercase tracking-widest text-gray-600 mb-3">
                    Status Badge Preview
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "Completed", c: draft.theme_badge_success },
                      { label: "Pending", c: draft.theme_badge_warning },
                      { label: "Cancelled", c: draft.theme_badge_error },
                      { label: "Shipped", c: draft.theme_badge_info },
                    ].map((b) => (
                      <span
                        key={b.label}
                        style={{
                          backgroundColor: `${b.c}20`,
                          color: b.c,
                          border: `1px solid ${b.c}40`,
                          borderRadius: 999,
                        }}
                        className="px-3 py-1 text-[8px] font-black uppercase tracking-widest"
                      >
                        {b.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── BLOG / NEWS ── */}
            {activeSection === "blog" && (
              <div className="mt-2">
                <SectionLabel emoji="🗂️" label="Blog Card Style" />
                <ColorRow
                  label="Card Background"
                  tokenKey="theme_blog_card_bg"
                  value={draft.theme_blog_card_bg}
                  onChange={handleChange}
                  isDirty={isDirty("theme_blog_card_bg")}
                />
                <ColorRow
                  label="Card Border"
                  tokenKey="theme_blog_card_border"
                  value={draft.theme_blog_card_border}
                  onChange={handleChange}
                  isDirty={isDirty("theme_blog_card_border")}
                />
                <ColorRow
                  label="Hover Border"
                  tokenKey="theme_blog_card_hover_border"
                  value={draft.theme_blog_card_hover_border}
                  onChange={handleChange}
                  isDirty={isDirty("theme_blog_card_hover_border")}
                />
                <SelectRow
                  label="Card Radius"
                  tokenKey="theme_blog_card_radius"
                  value={draft.theme_blog_card_radius}
                  onChange={handleChange}
                  options={RADIUS_OPTIONS}
                  isDirty={isDirty("theme_blog_card_radius")}
                />

                <SectionLabel emoji="🏷️" label="Tag / Category Badge" />
                <ColorRow
                  label="Tag Text Color"
                  tokenKey="theme_blog_tag_color"
                  value={draft.theme_blog_tag_color}
                  onChange={handleChange}
                  isDirty={isDirty("theme_blog_tag_color")}
                />
                <ColorRow
                  label="Tag Background"
                  tokenKey="theme_blog_tag_bg"
                  value={draft.theme_blog_tag_bg}
                  onChange={handleChange}
                  isDirty={isDirty("theme_blog_tag_bg")}
                />

                <SectionLabel emoji="📝" label="Typography" />
                <ColorRow
                  label="Post Title"
                  tokenKey="theme_blog_title_color"
                  value={draft.theme_blog_title_color}
                  onChange={handleChange}
                  isDirty={isDirty("theme_blog_title_color")}
                />
                <ColorRow
                  label="Title Hover"
                  tokenKey="theme_blog_title_hover"
                  value={draft.theme_blog_title_hover}
                  onChange={handleChange}
                  isDirty={isDirty("theme_blog_title_hover")}
                />
                <ColorRow
                  label="Excerpt Text"
                  tokenKey="theme_blog_text_color"
                  value={draft.theme_blog_text_color}
                  onChange={handleChange}
                  isDirty={isDirty("theme_blog_text_color")}
                />
                <ColorRow
                  label="Date Color"
                  tokenKey="theme_blog_date_color"
                  value={draft.theme_blog_date_color}
                  onChange={handleChange}
                  isDirty={isDirty("theme_blog_date_color")}
                />

                <SectionLabel emoji="🎨" label="Section" />
                <ColorRow
                  label="Section Background"
                  tokenKey="theme_blog_section_bg"
                  value={draft.theme_blog_section_bg}
                  onChange={handleChange}
                  isDirty={isDirty("theme_blog_section_bg")}
                />

                {/* Blog Card Preview */}
                <div className="mt-4 p-4 rounded-xl bg-black/20 border border-white/[0.05]">
                  <p className="text-[8px] font-black uppercase tracking-widest text-gray-600 mb-3">
                    Card Preview
                  </p>
                  <div
                    style={{
                      backgroundColor: draft.theme_blog_card_bg,
                      border: `1px solid ${draft.theme_blog_card_border}`,
                      borderRadius: draft.theme_blog_card_radius,
                    }}
                    className="overflow-hidden max-w-[220px]"
                  >
                    <div
                      style={{
                        backgroundColor: draft.theme_accent_color + "20",
                      }}
                      className="h-20 flex items-center justify-center"
                    >
                      <span
                        style={{
                          color: draft.theme_accent_color,
                          opacity: 0.5,
                          fontSize: 10,
                        }}
                      >
                        THUMBNAIL
                      </span>
                    </div>
                    <div className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          style={{
                            backgroundColor: draft.theme_blog_tag_bg,
                            color: draft.theme_blog_tag_color,
                          }}
                          className="text-[7px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                        >
                          News
                        </span>
                        <span
                          style={{ color: draft.theme_blog_date_color }}
                          className="text-[7px]"
                        >
                          Jan 15
                        </span>
                      </div>
                      <p
                        style={{
                          color: draft.theme_blog_title_color,
                          fontFamily: draft.theme_font_heading,
                        }}
                        className="text-[9px] font-bold mb-1 leading-tight"
                      >
                        Premium Collectible Arrives
                      </p>
                      <p
                        style={{ color: draft.theme_blog_text_color }}
                        className="text-[8px] leading-relaxed"
                      >
                        Exclusive piece joins our collection lineup...
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── SHOP / LISTING ── */}
            {activeSection === "shop" && (
              <div className="mt-2">
                <SectionLabel emoji="🎛️" label="Filter Buttons" />
                <ColorRow
                  label="Filter Background"
                  desc="Default state"
                  tokenKey="theme_shop_filter_bg"
                  value={draft.theme_shop_filter_bg}
                  onChange={handleChange}
                  isDirty={isDirty("theme_shop_filter_bg")}
                />
                <ColorRow
                  label="Filter Border"
                  tokenKey="theme_shop_filter_border"
                  value={draft.theme_shop_filter_border}
                  onChange={handleChange}
                  isDirty={isDirty("theme_shop_filter_border")}
                />
                <ColorRow
                  label="Filter Text"
                  tokenKey="theme_shop_filter_text"
                  value={draft.theme_shop_filter_text}
                  onChange={handleChange}
                  isDirty={isDirty("theme_shop_filter_text")}
                />
                <ColorRow
                  label="Active BG"
                  desc="Selected / active state"
                  tokenKey="theme_shop_filter_active_bg"
                  value={draft.theme_shop_filter_active_bg}
                  onChange={handleChange}
                  isDirty={isDirty("theme_shop_filter_active_bg")}
                />
                <ColorRow
                  label="Active Text"
                  tokenKey="theme_shop_filter_active_text"
                  value={draft.theme_shop_filter_active_text}
                  onChange={handleChange}
                  isDirty={isDirty("theme_shop_filter_active_text")}
                />

                <SectionLabel emoji="📄" label="Page Header" />
                <ColorRow
                  label="Section Background"
                  tokenKey="theme_shop_section_bg"
                  value={draft.theme_shop_section_bg}
                  onChange={handleChange}
                  isDirty={isDirty("theme_shop_section_bg")}
                />
                <ColorRow
                  label="Section Heading"
                  tokenKey="theme_shop_section_heading"
                  value={draft.theme_shop_section_heading}
                  onChange={handleChange}
                  isDirty={isDirty("theme_shop_section_heading")}
                />
                <ColorRow
                  label="Label / Tag Color"
                  tokenKey="theme_shop_label_color"
                  value={draft.theme_shop_label_color}
                  onChange={handleChange}
                  isDirty={isDirty("theme_shop_label_color")}
                />

                {/* Filter preview */}
                <div className="mt-4 p-4 rounded-xl bg-black/20 border border-white/[0.05]">
                  <p className="text-[8px] font-black uppercase tracking-widest text-gray-600 mb-3">
                    Filter Preview
                  </p>
                  <p
                    style={{ color: draft.theme_shop_label_color }}
                    className="text-[8px] font-black uppercase tracking-widest mb-2"
                  >
                    • Filter by
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {["All", "Pre-Order", "Ready Stock", "New"].map((f, i) => (
                      <span
                        key={f}
                        style={{
                          backgroundColor:
                            i === 0
                              ? draft.theme_shop_filter_active_bg
                              : draft.theme_shop_filter_bg,
                          color:
                            i === 0
                              ? draft.theme_shop_filter_active_text
                              : draft.theme_shop_filter_text,
                          border: `1px solid ${i === 0 ? draft.theme_shop_filter_active_bg : draft.theme_shop_filter_border}`,
                          borderRadius: draft.theme_btn_radius,
                        }}
                        className="text-[8px] font-bold uppercase tracking-wider px-3 py-1"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── PRODUCT DETAIL ── */}
            {activeSection === "detail" && (
              <div className="mt-2">
                <SectionLabel emoji="📦" label="Page Layout" />
                <ColorRow
                  label="Page Background"
                  tokenKey="theme_detail_bg"
                  value={draft.theme_detail_bg}
                  onChange={handleChange}
                  isDirty={isDirty("theme_detail_bg")}
                />
                <ColorRow
                  label="Info Panel BG"
                  tokenKey="theme_detail_panel_bg"
                  value={draft.theme_detail_panel_bg}
                  onChange={handleChange}
                  isDirty={isDirty("theme_detail_panel_bg")}
                />
                <ColorRow
                  label="Info Panel Border"
                  tokenKey="theme_detail_panel_border"
                  value={draft.theme_detail_panel_border}
                  onChange={handleChange}
                  isDirty={isDirty("theme_detail_panel_border")}
                />

                <SectionLabel emoji="🏷️" label="Typography" />
                <ColorRow
                  label="Product Title"
                  tokenKey="theme_detail_title_color"
                  value={draft.theme_detail_title_color}
                  onChange={handleChange}
                  isDirty={isDirty("theme_detail_title_color")}
                />
                <ColorRow
                  label="Price Color"
                  tokenKey="theme_detail_price_color"
                  value={draft.theme_detail_price_color}
                  onChange={handleChange}
                  isDirty={isDirty("theme_detail_price_color")}
                />
                <ColorRow
                  label="Description Text"
                  tokenKey="theme_detail_text_color"
                  value={draft.theme_detail_text_color}
                  onChange={handleChange}
                  isDirty={isDirty("theme_detail_text_color")}
                />

                <SectionLabel emoji="📑" label="Tabs / Accordion" />
                <ColorRow
                  label="Active Tab Color"
                  tokenKey="theme_detail_tab_active"
                  value={draft.theme_detail_tab_active}
                  onChange={handleChange}
                  isDirty={isDirty("theme_detail_tab_active")}
                />
                <ColorRow
                  label="Tab Background"
                  tokenKey="theme_detail_tab_bg"
                  value={draft.theme_detail_tab_bg}
                  onChange={handleChange}
                  isDirty={isDirty("theme_detail_tab_bg")}
                />

                {/* Detail preview */}
                <div className="mt-4 p-4 rounded-xl bg-black/20 border border-white/[0.05]">
                  <p className="text-[8px] font-black uppercase tracking-widest text-gray-600 mb-3">
                    Panel Preview
                  </p>
                  <div
                    style={{
                      backgroundColor: draft.theme_detail_panel_bg,
                      border: `1px solid ${draft.theme_detail_panel_border}`,
                      borderRadius: 10,
                    }}
                    className="p-3"
                  >
                    <p
                      style={{
                        color: draft.theme_detail_title_color,
                        fontFamily: draft.theme_font_heading,
                      }}
                      className="text-[10px] font-black mb-1"
                    >
                      NECA Ultimate Predator
                    </p>
                    <p
                      style={{ color: draft.theme_detail_price_color }}
                      className="text-[16px] font-black mb-2"
                    >
                      Rp 2.100.000
                    </p>
                    <p
                      style={{ color: draft.theme_detail_text_color }}
                      className="text-[8px] leading-relaxed mb-3"
                    >
                      Ultra-realistic 7-inch scale figure with 30+ points of
                      articulation...
                    </p>
                    <div className="flex gap-1">
                      {["Description", "Specs", "Shipping"].map((t, i) => (
                        <span
                          key={t}
                          style={{
                            backgroundColor:
                              i === 0
                                ? draft.theme_detail_tab_active
                                : draft.theme_detail_tab_bg,
                            color:
                              i === 0 ? "#fff" : draft.theme_detail_text_color,
                            borderRadius: 4,
                          }}
                          className="text-[7px] font-black uppercase tracking-wider px-2 py-1"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── FORMS & INPUTS ── */}
            {activeSection === "forms" && (
              <div className="mt-2">
                <SectionLabel emoji="⌨️" label="Input Fields" />
                <ColorRow
                  label="Input Background"
                  tokenKey="theme_input_bg"
                  value={draft.theme_input_bg}
                  onChange={handleChange}
                  isDirty={isDirty("theme_input_bg")}
                />
                <ColorRow
                  label="Input Border"
                  tokenKey="theme_input_border"
                  value={draft.theme_input_border}
                  onChange={handleChange}
                  isDirty={isDirty("theme_input_border")}
                />
                <ColorRow
                  label="Input Text"
                  tokenKey="theme_input_text"
                  value={draft.theme_input_text}
                  onChange={handleChange}
                  isDirty={isDirty("theme_input_text")}
                />
                <ColorRow
                  label="Placeholder"
                  tokenKey="theme_input_placeholder"
                  value={draft.theme_input_placeholder}
                  onChange={handleChange}
                  isDirty={isDirty("theme_input_placeholder")}
                />
                <ColorRow
                  label="Focus Border"
                  desc="Active/focused state"
                  tokenKey="theme_input_focus_border"
                  value={draft.theme_input_focus_border}
                  onChange={handleChange}
                  isDirty={isDirty("theme_input_focus_border")}
                />
                <SelectRow
                  label="Border Radius"
                  tokenKey="theme_input_radius"
                  value={draft.theme_input_radius}
                  onChange={handleChange}
                  options={RADIUS_OPTIONS}
                  isDirty={isDirty("theme_input_radius")}
                />
                <ColorRow
                  label="Label Color"
                  tokenKey="theme_label_color"
                  value={draft.theme_label_color}
                  onChange={handleChange}
                  isDirty={isDirty("theme_label_color")}
                />

                {/* Input preview */}
                <div className="mt-4 p-4 rounded-xl bg-black/20 border border-white/[0.05] space-y-3">
                  <p className="text-[8px] font-black uppercase tracking-widest text-gray-600">
                    Preview
                  </p>
                  <div>
                    <p
                      style={{ color: draft.theme_label_color }}
                      className="text-[8px] font-black uppercase tracking-widest mb-1"
                    >
                      Email Address
                    </p>
                    <div
                      style={{
                        backgroundColor: draft.theme_input_bg,
                        border: `1px solid ${draft.theme_input_border}`,
                        borderRadius: draft.theme_input_radius,
                        color: draft.theme_input_placeholder,
                        padding: "8px 12px",
                        fontSize: 10,
                      }}
                    >
                      Enter your email
                    </div>
                  </div>
                  <div>
                    <p
                      style={{ color: draft.theme_label_color }}
                      className="text-[8px] font-black uppercase tracking-widest mb-1"
                    >
                      Password (focused)
                    </p>
                    <div
                      style={{
                        backgroundColor: draft.theme_input_bg,
                        border: `2px solid ${draft.theme_input_focus_border}`,
                        borderRadius: draft.theme_input_radius,
                        color: draft.theme_input_text,
                        padding: "8px 12px",
                        fontSize: 10,
                      }}
                    >
                      ••••••••
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── SECTION HEADERS ── */}
            {activeSection === "sections" && (
              <div className="mt-2">
                <SectionLabel emoji="🔤" label="Section Label & Heading" />
                <ColorRow
                  label="Label / Eyebrow Color"
                  desc='e.g. "• Featured"'
                  tokenKey="theme_section_label_color"
                  value={draft.theme_section_label_color}
                  onChange={handleChange}
                  isDirty={isDirty("theme_section_label_color")}
                />
                <ColorRow
                  label="Section Heading Color"
                  tokenKey="theme_section_heading_color"
                  value={draft.theme_section_heading_color}
                  onChange={handleChange}
                  isDirty={isDirty("theme_section_heading_color")}
                />
                <ColorRow
                  label="Subtext Color"
                  desc="Tagline below heading"
                  tokenKey="theme_section_subtext_color"
                  value={draft.theme_section_subtext_color}
                  onChange={handleChange}
                  isDirty={isDirty("theme_section_subtext_color")}
                />
                <ColorRow
                  label="Divider Line"
                  desc="Between sections"
                  tokenKey="theme_section_divider"
                  value={draft.theme_section_divider}
                  onChange={handleChange}
                  isDirty={isDirty("theme_section_divider")}
                />
                <ColorRow
                  label="Alt Section BG"
                  desc="Alternating background"
                  tokenKey="theme_section_bg_alt"
                  value={draft.theme_section_bg_alt}
                  onChange={handleChange}
                  isDirty={isDirty("theme_section_bg_alt")}
                />

                {/* Section header preview */}
                <div className="mt-4 p-4 rounded-xl bg-black/20 border border-white/[0.05]">
                  <p className="text-[8px] font-black uppercase tracking-widest text-gray-600 mb-3">
                    Section Header Preview
                  </p>
                  <div>
                    <p
                      style={{ color: draft.theme_section_label_color }}
                      className="text-[8px] font-black uppercase tracking-[0.3em] mb-1"
                    >
                      • Featured
                    </p>
                    <h3
                      style={{
                        color: draft.theme_section_heading_color,
                        fontFamily: draft.theme_font_heading,
                      }}
                      className="text-[18px] font-black uppercase italic tracking-tight leading-tight mb-1"
                    >
                      Latest Arrivals
                    </h3>
                    <p
                      style={{ color: draft.theme_section_subtext_color }}
                      className="text-[8px] font-black uppercase tracking-widest"
                    >
                      New drops every week
                    </p>
                    <div
                      style={{
                        height: 1,
                        backgroundColor: draft.theme_section_divider,
                      }}
                      className="mt-3"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── ADVANCED / CUSTOM CSS ── */}
            {activeSection === "advanced" && (
              <div className="mt-2">
                <SectionLabel emoji="💻" label="Custom CSS Injection" />
                <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 mb-3">
                  <p className="text-amber-400 text-[8px] font-black uppercase tracking-widest mb-1">
                    ⚠ Advanced Feature
                  </p>
                  <p className="text-amber-400/70 text-[8px] leading-relaxed">
                    Raw CSS injected into all pages after theme variables.
                    Overrides anything. Use with care.
                  </p>
                </div>
                <FieldWrap
                  label="Custom CSS"
                  desc="Injected globally on all pages"
                >
                  <textarea
                    value={draft.theme_custom_css || ""}
                    onChange={(e) =>
                      handleChange("theme_custom_css", e.target.value)
                    }
                    placeholder={`/* Your custom CSS here */\n.btn-primary {\n  letter-spacing: 0.2em;\n}\n\n.theme-card {\n  backdrop-filter: blur(12px);\n}`}
                    rows={14}
                    className="w-full bg-black/60 border border-white/8 rounded-lg px-3 py-2 text-emerald-400 text-[9px] font-mono focus:outline-none focus:border-emerald-500/40 transition-all resize-y leading-relaxed"
                    spellCheck={false}
                  />
                </FieldWrap>
                {draft.theme_custom_css && (
                  <button
                    onClick={() => handleChange("theme_custom_css", "")}
                    className="mt-2 w-full text-[8px] font-black uppercase tracking-widest text-gray-600 hover:text-red-400 transition-colors"
                  >
                    Clear Custom CSS
                  </button>
                )}
                <div className="mt-4 p-3 rounded-xl bg-black/20 border border-white/[0.05]">
                  <p className="text-[8px] font-black uppercase tracking-widest text-gray-600 mb-2">
                    Available CSS Variables
                  </p>
                  <div className="space-y-0.5 max-h-40 overflow-y-auto">
                    {[
                      "--accent",
                      "--bg",
                      "--surface",
                      "--text-primary",
                      "--btn-primary-bg",
                      "--card-bg",
                      "--card-radius",
                      "--blog-card-bg",
                      "--shop-filter-active-bg",
                      "--input-bg",
                      "--section-label-color",
                      "--font-heading",
                    ].map((v) => (
                      <p
                        key={v}
                        className="text-[7.5px] font-mono text-gray-600 hover:text-gray-400 cursor-pointer"
                        onClick={() =>
                          navigator?.clipboard?.writeText(`var(${v})`)
                        }
                      >
                        var({v})
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── PRESETS ── */}
            {activeSection === "presets" && (
              <div className="mt-3 space-y-2">
                <p className="text-gray-600 text-[8px] font-black uppercase tracking-widest px-1 mb-3">
                  Satu klik untuk merubah total warna, latar, dan border elemen.
                  Gambar dan ketikan teks Anda akan kami pertahankan agar tidak
                  lelah mengatur ulang.
                </p>
                {PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => applyPreset(preset)}
                    className="w-full flex items-center gap-3 p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl hover:border-white/20 hover:bg-white/[0.06] transition-all group text-left"
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg"
                      style={{
                        background: `linear-gradient(135deg, ${preset.colors.theme_bg_color || "#000"} 0%, ${preset.colors.theme_bg_color || "#000"} 50%, ${preset.colors.theme_accent_color} 50%, ${preset.colors.theme_accent_color} 100%)`,
                        border: `2px solid ${preset.colors.theme_border_strong}`,
                      }}
                    >
                      <span className="text-sm">{preset.emoji}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-[10px] font-black">
                        {preset.name}
                      </p>
                      <p className="text-gray-600 text-[7.5px] font-bold tracking-widest uppercase">
                        {preset.type === "dark" ? "Gelap" : "Terang"} Theme Mode
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {[
                        preset.colors.theme_accent_color,
                        preset.colors.theme_surface_color || "#222",
                      ].map((c, i) => (
                        <div
                          key={i}
                          className="w-3 h-3 rounded-full border border-white/10"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Publish */}
            <button
              onClick={handleSave}
              disabled={saving || dirtyKeys.length === 0}
              className={`w-full mt-5 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${dirtyKeys.length > 0 ? "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg shadow-emerald-500/20" : "bg-white/[0.03] text-gray-700 cursor-not-allowed border border-white/[0.05]"}`}
            >
              {saving
                ? "Memproses Perubahan…"
                : `Simpan Tema Sekarang${dirtyKeys.length > 0 ? ` (${dirtyKeys.length})` : ""}`}
            </button>
          </div>
        </div>

        {/* RIGHT: Live preview */}
        <div
          className="flex-1 flex flex-col overflow-hidden"
          style={{
            background:
              "radial-gradient(ellipse at top, #0a0a1f 0%, #040408 100%)",
          }}
        >
          {/* Preview header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.05] bg-black/20 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400 text-[8px] font-black uppercase tracking-widest">
                Live Preview
              </span>
              {dirtyKeys.length > 0 && (
                <span className="text-amber-400/60 text-[8px] font-bold ml-1">
                  • {dirtyKeys.length} perubahan belum tersimpan
                </span>
              )}
            </div>
            <span className="text-gray-700 text-[8px] font-bold">
              {viewport === "desktop" ? "1280px" : "390px"} · {viewport}
            </span>
          </div>

          <div className="flex-1 overflow-auto p-6 flex justify-center">
            <PreviewWrapper
              draft={draft}
              viewport={viewport}
              activeSection={activeSection}
            />
          </div>
        </div>
      </div>

      {/* ── STATUS BAR ── */}
      <div className="flex-shrink-0 px-4 py-1.5 border-t border-white/[0.05] bg-[#07070e] flex items-center justify-between text-[7.5px] font-black uppercase tracking-widest">
        <div className="flex items-center gap-4">
          {dirtyKeys.length > 0 ? (
            <span className="text-amber-400">
              ● {dirtyKeys.length} modifikasi · (Cdr/Ctrl + S) untuk simpan
            </span>
          ) : (
            <span className="text-emerald-500">
              ✓ Seluruh tema tersimpan aman
            </span>
          )}
          <span className="text-gray-700">⌘Z undo · ⌘⇧Z redo</span>
        </div>
        <span className="text-gray-700">
          {Object.keys(DEFAULT_THEME).length} token aktif · stabil berkat CSS
          injection otomatis
        </span>
      </div>
    </div>
  );
};

export default ThemePage;
