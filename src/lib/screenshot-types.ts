export type TemplateId =
  // Style 1 — classic layouts
  | "classic"
  | "modern"
  | "minimal"
  | "showcase"
  | "split-right"
  | "split-left"
  | "floating"
  | "hero"
  | "magazine"
  // Store styles (2–6)
  | "spotlight"
  | "feature-list"
  | "band"
  | "dark-glow"
  | "pill-badge";
export type DeviceId = "default" | "iphone15" | "pixel8" | "samsung" | "ipad" | "generic";
export type FrameColor = "black" | "white" | "titanium" | "gold";

export const DEVICE_LABELS: Record<DeviceId, string> = {
  default:  "Default",
  iphone15: "iPhone 15 Pro",
  pixel8:   "Pixel 8",
  samsung:  "Galaxy S24",
  ipad:     "iPad Pro",
  generic:  "Minimal",
};

export const DEVICE_ASPECT: Record<DeviceId, number> = {
  default:  9 / 19.5,
  iphone15: 9 / 19.5,
  pixel8:   9 / 19.5,
  samsung:  9 / 19.5,
  ipad:     3 / 4,
  generic:  9 / 19.5,
};

export const FRAME_COLOR_LABELS: Record<FrameColor, { label: string; bg: string }> = {
  black:    { label: "Black",    bg: "linear-gradient(135deg,#252525,#0e0e0e)" },
  white:    { label: "White",    bg: "linear-gradient(135deg,#f8f8f8,#e2e2e2)" },
  titanium: { label: "Titanium", bg: "linear-gradient(135deg,#bcbcbc,#787878)" },
  gold:     { label: "Gold",     bg: "linear-gradient(135deg,#f0d090,#c08828)" },
};
export type SizeId = "phone" | "tablet7" | "tablet10";

export const SIZES: Record<SizeId, { label: string; w: number; h: number }> = {
  phone: { label: "Phone", w: 1080, h: 1920 },
  tablet7: { label: '7" Tablet', w: 1200, h: 1920 },
  tablet10: { label: '10" Tablet', w: 1600, h: 2560 },
};

export const GRADIENTS: { id: string; label: string; css: string }[] = [
  { id: "violet", label: "Violet Dream", css: "linear-gradient(135deg,#7c3aed,#ec4899)" },
  { id: "ocean", label: "Ocean", css: "linear-gradient(135deg,#0ea5e9,#22d3ee)" },
  { id: "sunset", label: "Sunset", css: "linear-gradient(135deg,#f97316,#ec4899)" },
  { id: "mint", label: "Mint", css: "linear-gradient(135deg,#10b981,#14b8a6)" },
  { id: "midnight", label: "Midnight", css: "linear-gradient(135deg,#1e293b,#4f46e5)" },
  { id: "peach", label: "Peach", css: "linear-gradient(135deg,#fda4af,#fcd34d)" },
  { id: "aurora", label: "Aurora", css: "linear-gradient(135deg,#22d3ee,#a855f7,#ec4899)" },
  { id: "carbon", label: "Carbon", css: "linear-gradient(135deg,#111827,#374151)" },
];

// Used for auto-rotation when adding new screens (Style 1 only)
export const TEMPLATE_ORDER: TemplateId[] = [
  "classic", "modern", "minimal", "showcase",
  "split-right", "split-left", "floating", "hero", "magazine",
];

// Used by the layout picker UI
export const TEMPLATE_GROUPS: { label: string; ids: TemplateId[] }[] = [
  {
    label: "Style 1",
    ids: ["classic", "modern", "minimal", "showcase", "split-right", "split-left", "floating", "hero", "magazine"],
  },
  {
    label: "Store Styles",
    ids: ["spotlight", "feature-list", "band", "dark-glow", "pill-badge"],
  },
];

export const TEMPLATE_LABELS: Record<TemplateId, { label: string; desc: string }> = {
  classic:        { label: "Classic",    desc: "Headline top, device center" },
  modern:         { label: "Modern",     desc: "Tilted device, side text" },
  minimal:        { label: "Minimal",    desc: "Device only on gradient" },
  showcase:       { label: "Showcase",   desc: "Device top, text bottom" },
  "split-right":  { label: "Split R",    desc: "Device left, text right" },
  "split-left":   { label: "Split L",    desc: "Text left, device right" },
  floating:       { label: "Floating",   desc: "Small device, big text" },
  hero:           { label: "Hero",       desc: "Full-bleed device, text overlay" },
  magazine:       { label: "Magazine",   desc: "Bold text top, device center" },
  spotlight:      { label: "Spotlight",  desc: "Glow behind device, App Store style" },
  "feature-list": { label: "Features",   desc: "Device right, feature bullets left" },
  band:           { label: "Band",       desc: "Dark band top, device overlapping" },
  "dark-glow":    { label: "Dark Glow",  desc: "Glowing device on dark overlay" },
  "pill-badge":   { label: "Pill Badge", desc: "Badge top, headline bottom" },
};

export const TEMPLATE_DEFAULTS: Record<
  TemplateId,
  { deviceX: number; deviceY: number; deviceScale: number }
> = {
  // Style 1
  classic:        { deviceX: 50, deviceY: 62, deviceScale: 1 },
  modern:         { deviceX: 72, deviceY: 55, deviceScale: 1 },
  minimal:        { deviceX: 50, deviceY: 50, deviceScale: 1 },
  showcase:       { deviceX: 50, deviceY: 38, deviceScale: 0.95 },
  "split-right":  { deviceX: 28, deviceY: 50, deviceScale: 0.95 },
  "split-left":   { deviceX: 72, deviceY: 50, deviceScale: 0.95 },
  floating:       { deviceX: 50, deviceY: 32, deviceScale: 0.65 },
  hero:           { deviceX: 50, deviceY: 48, deviceScale: 1.25 },
  magazine:       { deviceX: 65, deviceY: 62, deviceScale: 0.80 },
  // Store styles
  spotlight:      { deviceX: 50, deviceY: 56, deviceScale: 0.95 },
  "feature-list": { deviceX: 74, deviceY: 50, deviceScale: 0.88 },
  band:           { deviceX: 50, deviceY: 58, deviceScale: 0.88 },
  "dark-glow":    { deviceX: 50, deviceY: 47, deviceScale: 1.0  },
  "pill-badge":   { deviceX: 50, deviceY: 52, deviceScale: 0.90 },
};

const DEFAULT_HEADLINES = [
  "Beautifully Crafted",
  "Powerful Features",
  "Built for You",
  "Made Simple",
  "Stay in Control",
  "Get Started Today",
];

export interface CustomText {
  id: string;
  content: string;
  x: number;           // 0-100% of canvas width
  y: number;           // 0-100% of canvas height
  size: number;        // font-size in canvas px
  bold: boolean;
  color: string;
  align: "left" | "center" | "right";
}

export interface Screen {
  id: string;
  screenshot: string | null;
  template: TemplateId;
  headline: string;
  subheadline: string;
  deviceX: number;
  deviceY: number;
  deviceScale: number;
  imgX: number;
  imgY: number;
  imgScale: number;
  customTexts: CustomText[];
}

export interface DesignState {
  screens: Screen[];
  activeScreenId: string;
  // shared style
  headlineSize: number;
  subSize: number;
  headlineWeight: number;
  textColor: string;
  bgType: "gradient" | "solid";
  bgGradient: string;
  bgSolid: string;
  device: DeviceId;
  frameColor: FrameColor;
  size: SizeId;
}

export type ResolvedDesign = Omit<DesignState, "screens" | "activeScreenId"> & Screen;

export function resolveDesign(state: DesignState, screen: Screen): ResolvedDesign {
  const { screens: _s, activeScreenId: _a, ...shared } = state;
  return { ...shared, ...screen };
}

let _autoIdx = 0;
export function makeScreen(
  template: TemplateId,
  screenshot: string | null = null,
  index?: number,
): Screen {
  const i = index ?? _autoIdx++;
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    screenshot,
    template,
    headline: DEFAULT_HEADLINES[i % DEFAULT_HEADLINES.length],
    subheadline: "The all-in-one experience your users will love.",
    ...TEMPLATE_DEFAULTS[template],
    imgX: 50,
    imgY: 50,
    imgScale: 1,
    customTexts: [],
  };
}

const initialScreen = makeScreen("classic", null, 0);

export const defaultDesign: DesignState = {
  screens: [initialScreen],
  activeScreenId: initialScreen.id,
  headlineSize: 72,
  subSize: 32,
  headlineWeight: 700,
  textColor: "#ffffff",
  bgType: "gradient",
  bgGradient: "linear-gradient(135deg,#7c3aed,#ec4899)",
  bgSolid: "#0f172a",
  device: "default",
  frameColor: "black",
  size: "phone",
};
