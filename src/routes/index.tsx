import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ChevronDown,
  ChevronUp,
  Download,
  FileImage,
  FileType,
  ImagePlus,
  Loader2,
  Monitor,
  Moon,
  Move,
  Plus,
  Sparkles,
  Sun,
  Trash2,
  Type,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Canvas } from "@/components/Canvas";
import { useTheme } from "@/hooks/use-theme";
import { exportOne, exportZip, type ExportItem } from "@/lib/export";
import {
  defaultDesign,
  resolveDesign,
  GRADIENTS,
  SIZES,
  TEMPLATE_DEFAULTS,
  TEMPLATE_LABELS,
  TEMPLATE_ORDER,
  TEMPLATE_GROUPS,
  DEVICE_LABELS,
  DEVICE_ASPECT,
  FRAME_COLOR_LABELS,
  makeScreen,
  type CustomText,
  type DesignState,
  type DeviceId,
  type FrameColor,
  type Screen,
  type SizeId,
  type TemplateId,
} from "@/lib/screenshot-types";

export const Route = createFileRoute("/")({ component: Index });

const CARD_W = 240;
const ALL_DEVICES: DeviceId[] = ["default", "iphone15", "pixel8", "samsung", "ipad", "generic"];
const ALL_COLORS: FrameColor[] = ["black", "white", "titanium", "gold"];

/* ─────────────────────────────────────────────────────────────────────── */

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Center-crop + resize image to match the device frame's aspect ratio. */
function resizeToFrame(dataUrl: string, aspect: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const sw = img.naturalWidth;
      const sh = img.naturalHeight;
      const srcAspect = sw / sh;

      let cropW: number, cropH: number;
      if (srcAspect > aspect) {
        cropH = sh;
        cropW = sh * aspect;
      } else {
        cropW = sw;
        cropH = sw / aspect;
      }
      const sx = (sw - cropW) / 2;
      const sy = (sh - cropH) / 2;
      const scale = Math.min(1, 1080 / cropW);
      const outW = Math.round(cropW * scale);
      const outH = Math.round(cropH * scale);

      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      canvas.getContext("2d")!.drawImage(img, sx, sy, cropW, cropH, 0, 0, outW, outH);
      resolve(canvas.toDataURL("image/png"));
    };
    img.src = dataUrl;
  });
}

/** Pick the next template in the rotation so no two consecutive screens share a layout. */
function pickTemplate(screens: Screen[]): TemplateId {
  const lastIdx = screens.length > 0
    ? TEMPLATE_ORDER.indexOf(screens[screens.length - 1].template)
    : -1;
  return TEMPLATE_ORDER[(lastIdx + 1) % TEMPLATE_ORDER.length];
}

/* ─────────────────────────────────────────────────────────────────────── */

function Index() {
  const { theme, toggle: toggleTheme } = useTheme();

  const [design, setDesignState] = useState<DesignState>(defaultDesign);
  const setDesign = (updater: (d: DesignState) => DesignState) =>
    setDesignState((prev) => updater(prev));

  const exportRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [exporting, setExporting] = useState(false);

  const [showFramePicker, setShowFramePicker] = useState(false);
  const [pickerDevice, setPickerDevice] = useState<DeviceId>("iphone15");
  const [pickerColor, setPickerColor] = useState<FrameColor>("black");
  const [showPosition, setShowPosition] = useState(false);
  const [showImageEdit, setShowImageEdit] = useState(false);

  // ── Inline text editor overlay ────────────────────────────────
  const [textOverlay, setTextOverlay] = useState<{
    field: "headline" | "subheadline" | string;
    isCustom: boolean;
    value: string;
    x: number; y: number; w: number;
    fontSize: number; color: string; bold: boolean;
  } | null>(null);
  const overlayRef = useRef<HTMLTextAreaElement>(null);

  const [selectedCtId, setSelectedCtId] = useState<string | null>(null);

  const size = SIZES[design.size];
  const cardScale = CARD_W / size.w;
  const cardH = Math.round(size.h * cardScale);

  const activeScreen =
    design.screens.find((s) => s.id === design.activeScreenId) ?? design.screens[0];
  const activeIdx = design.screens.findIndex((s) => s.id === design.activeScreenId);

  const updateActive = (patch: Partial<Screen>) =>
    setDesign((d) => ({
      ...d,
      screens: d.screens.map((s) =>
        s.id === d.activeScreenId ? { ...s, ...patch } : s,
      ),
    }));

  const selectedCt = activeScreen.customTexts.find((ct) => ct.id === selectedCtId) ?? null;

  const updateSelectedCt = (patch: Partial<CustomText>) => {
    if (!selectedCtId) return;
    updateActive({
      customTexts: activeScreen.customTexts.map((ct) =>
        ct.id === selectedCtId ? { ...ct, ...patch } : ct,
      ),
    });
  };

  const addCustomText = () => {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `ct_${Date.now()}`;
    const newCt: CustomText = {
      id,
      content: "Your text",
      x: 50,
      y: 50,
      size: 48,
      bold: false,
      color: design.textColor,
      align: "center",
    };
    updateActive({ customTexts: [...activeScreen.customTexts, newCt] });
    setSelectedCtId(id);
  };

  const commitTextOverlay = () => {
    if (!textOverlay) return;
    const { field, isCustom, value } = textOverlay;
    if (isCustom) {
      updateActive({
        customTexts: activeScreen.customTexts.map((ct) =>
          ct.id === field ? { ...ct, content: value } : ct,
        ),
      });
    } else {
      updateActive({ [field]: value });
    }
    setTextOverlay(null);
  };

  useEffect(() => {
    if (textOverlay) overlayRef.current?.select();
  }, [!!textOverlay, textOverlay?.field]);

  // ── Drop handler ──────────────────────────────────────────────────
  const deviceRef = useRef(design.device);
  deviceRef.current = design.device;

  const onDrop = useCallback(async (files: File[]) => {
    if (!files.length) return;
    try {
      const rawUrls = await Promise.all(files.map(readFileAsDataUrl));
      const aspect = DEVICE_ASPECT[deviceRef.current];
      const dataUrls = await Promise.all(rawUrls.map((u) => resizeToFrame(u, aspect)));

      setDesign((d) => {
        const existing = d.screens;
        const firstEmptyIdx = existing.findIndex((s) => !s.screenshot);
        const newScreens = [...existing];
        const cursor = firstEmptyIdx === -1 ? newScreens.length : firstEmptyIdx;
        dataUrls.forEach((url, i) => {
          const tpl = pickTemplate(newScreens.slice(0, cursor + i));
          if (cursor + i < newScreens.length) {
            const target = newScreens[cursor + i];
            newScreens[cursor + i] = {
              ...target,
              screenshot: url,
              imgX: 50,
              imgY: 50,
              imgScale: 1,
              ...(target.screenshot ? {} : { template: tpl, ...TEMPLATE_DEFAULTS[tpl] }),
            };
          } else {
            newScreens.push(makeScreen(tpl, url, cursor + i));
          }
        });
        return {
          ...d,
          screens: newScreens,
          activeScreenId: newScreens[cursor]?.id ?? d.activeScreenId,
        };
      });
      toast.success(`Added ${files.length} screenshot${files.length === 1 ? "" : "s"}`);
    } catch (err) {
      console.error(err);
      toast.error("Couldn't read those files. Try again with a JPG or PNG.");
    }
  }, []);

  const { getRootProps, getInputProps: getGalleryInputProps, isDragActive } = useDropzone({
    accept: { "image/*": [] }, multiple: true, noClick: true, onDrop,
  });

  const { getRootProps: getUploadRootProps, getInputProps: getUploadInputProps, isDragActive: isUploadDragActive } = useDropzone({
    accept: { "image/*": [] }, multiple: true, onDrop,
  });

  // ── Screen management ─────────────────────────────────────────────
  const confirmAddScreen = () => {
    setDesign((d) => {
      const s = makeScreen(pickTemplate(d.screens), null, d.screens.length);
      return {
        ...d,
        device: pickerDevice,
        frameColor: pickerColor,
        screens: [...d.screens, s],
        activeScreenId: s.id,
      };
    });
    setShowFramePicker(false);
  };

  const removeScreen = (id: string) => {
    setDesign((d) => {
      if (d.screens.length === 1) {
        toast.info("You need at least one screen.");
        return d;
      }
      const screens = d.screens.filter((s) => s.id !== id);
      return {
        ...d,
        screens,
        activeScreenId: d.activeScreenId === id ? screens[0].id : d.activeScreenId,
      };
    });
  };

  // ── Export ─────────────────────────────────────────────────────────
  const buildItems = (): ExportItem[] =>
    design.screens
      .map((s, i) => {
        const node = exportRefs.current.get(s.id);
        return node ? { id: s.id, filename: `screen-${i + 1}-${design.size}`, node } : null;
      })
      .filter((x): x is ExportItem => x !== null);

  const doExport = async (mode: "current" | "all", format: "png" | "jpeg") => {
    if (exporting) return;
    setExporting(true);
    const items = buildItems();
    const target =
      mode === "current"
        ? items.filter((it) => it.id === design.activeScreenId)
        : items;

    if (target.length === 0) {
      toast.error("Nothing to export yet.");
      setExporting(false);
      return;
    }

    const toastId = toast.loading(
      target.length === 1
        ? `Rendering screenshot…`
        : `Rendering screen 1 of ${target.length}…`,
    );

    try {
      if (target.length === 1) {
        await exportOne(target[0], {
          width: size.w, height: size.h, format,
          onProgress: (done, total, current) => {
            toast.loading(`Rendering ${current}…`, { id: toastId });
            void done; void total;
          },
        });
        toast.success("Screenshot downloaded", { id: toastId });
      } else {
        await exportZip(target, `shotforge-${design.size}-${Date.now()}`, {
          width: size.w, height: size.h, format,
          onProgress: (done, total) => {
            toast.loading(`Rendering screen ${done} of ${total}…`, { id: toastId });
          },
        });
        toast.success(`Exported ${target.length} screens`, { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error("Export failed. Please try again.", { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  const filledCount = useMemo(
    () => design.screens.filter((s) => s.screenshot).length,
    [design.screens],
  );
  const recommended = useMemo(() => {
    const a = DEVICE_ASPECT[design.device];
    const w = 1080;
    return `${w} × ${Math.round(w / a)} px`;
  }, [design.device]);

  return (
    <div className="h-screen flex flex-col bg-background text-foreground" {...getRootProps()}>
      <input {...getGalleryInputProps()} />

      {/* Drag overlay */}
      {isDragActive && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          style={{
            background: "color-mix(in oklch, var(--color-primary) 8%, transparent)",
            border: "2px dashed var(--color-primary)",
          }}
        >
          <div className="glass rounded-2xl px-10 py-6 shadow-lg text-center anim-in">
            <p className="text-sm font-semibold text-foreground">Drop screenshots to add</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Each file becomes a new screen · frames auto-adapt
            </p>
          </div>
        </div>
      )}

      {/* ── FRAME PICKER MODAL ── */}
      {showFramePicker && (
        <FramePickerModal
          device={pickerDevice}
          color={pickerColor}
          onDeviceChange={setPickerDevice}
          onColorChange={setPickerColor}
          onCancel={() => setShowFramePicker(false)}
          onConfirm={confirmAddScreen}
        />
      )}

      {/* ── HEADER (TOP NAV) ── */}
      <header className="h-14 shrink-0 border-b border-border bg-card/60 backdrop-blur-md flex items-center gap-3 px-5 z-30 relative">
        {/* Subtle ambient glow behind header */}
        <div
          className="absolute inset-0 -z-10 pointer-events-none opacity-60"
          style={{ background: "var(--gradient-hero)" }}
        />

        <div className="flex items-center gap-2.5 mr-2 shrink-0">
          <div
            className="h-9 w-9 rounded-xl flex items-center justify-center shadow-md"
            style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-elegant)" }}
          >
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div className="leading-none">
            <div className="font-bold tracking-tight text-foreground text-[15px] gradient-text">ShotForge</div>
            <div className="text-[10px] text-muted-foreground tracking-widest uppercase">Screenshot studio</div>
          </div>
        </div>

        <div className="flex-1" />

        {/* Canvas size segmented control */}
        <SegmentedControl
          options={(Object.keys(SIZES) as SizeId[]).map((id) => ({ value: id, label: SIZES[id].label }))}
          value={design.size}
          onChange={(v) => setDesign((d) => ({ ...d, size: v as SizeId }))}
        />

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to light" : "Switch to dark"}
          aria-label="Toggle theme"
          className="h-9 w-9 rounded-xl border border-border bg-card hover:bg-muted transition-colors flex items-center justify-center text-foreground"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* Export menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              disabled={exporting}
              className="gap-1.5 font-semibold text-xs text-white h-9 px-4 rounded-xl shadow-md"
              style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-elegant)" }}
            >
              {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              {exporting ? "Exporting…" : "Export"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Current screen
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => doExport("current", "png")} className="gap-2">
              <FileImage className="h-3.5 w-3.5" /> Download as PNG
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => doExport("current", "jpeg")} className="gap-2">
              <FileType className="h-3.5 w-3.5" /> Download as JPEG
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">
              All {design.screens.length} screens
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => doExport("all", "png")} className="gap-2">
              <FileImage className="h-3.5 w-3.5" /> ZIP of PNGs
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => doExport("all", "jpeg")} className="gap-2">
              <FileType className="h-3.5 w-3.5" /> ZIP of JPEGs
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* ── SUB-TOOLBAR (style controls) ── */}
      <div className="shrink-0 border-b border-border bg-card/40 backdrop-blur-sm flex items-center gap-5 px-5 py-2.5">
        {/* Background swatches */}
        <ToolbarGroup label="Background">
          <div className="flex items-center gap-1.5">
            {GRADIENTS.map((g) => (
              <button
                key={g.id}
                title={g.label}
                onClick={() => setDesign((d) => ({ ...d, bgType: "gradient", bgGradient: g.css }))}
                style={{ background: g.css }}
                className={`h-7 w-7 rounded-full transition-all hover:scale-110 ${
                  design.bgType === "gradient" && design.bgGradient === g.css
                    ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                    : ""
                }`}
              />
            ))}
            <label className="cursor-pointer" title="Custom color">
              <input
                type="color"
                value={design.bgSolid}
                onChange={(e) => setDesign((d) => ({ ...d, bgType: "solid", bgSolid: e.target.value }))}
                className="sr-only"
              />
              <div
                className={`h-7 w-7 rounded-full transition-all hover:scale-110 border-2 ${
                  design.bgType === "solid" ? "ring-2 ring-primary ring-offset-2 ring-offset-background border-transparent" : "border-border"
                }`}
                style={{
                  background:
                    design.bgType === "solid"
                      ? design.bgSolid
                      : "conic-gradient(from 0deg, #f43f5e, #f59e0b, #10b981, #06b6d4, #6366f1, #d946ef, #f43f5e)",
                }}
              />
            </label>
          </div>
        </ToolbarGroup>

        <Divider />

        {/* Device */}
        <ToolbarGroup label="Device">
          <div className="flex items-center gap-1">
            {ALL_DEVICES.map((id) => (
              <button
                key={id}
                onClick={() => setDesign((d) => ({ ...d, device: id }))}
                className={`px-2.5 h-7 rounded-md text-xs font-medium transition-all ${
                  design.device === id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {DEVICE_LABELS[id]}
              </button>
            ))}
          </div>
        </ToolbarGroup>

        <Divider />

        {/* Frame color */}
        <ToolbarGroup label="Frame">
          <div className="flex items-center gap-1.5">
            {ALL_COLORS.map((c) => (
              <button
                key={c}
                title={FRAME_COLOR_LABELS[c].label}
                onClick={() => setDesign((d) => ({ ...d, frameColor: c }))}
                className={`h-7 w-7 rounded-full transition-all hover:scale-110 ${
                  design.frameColor === c ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "border-2 border-border"
                }`}
                style={{ background: FRAME_COLOR_LABELS[c].bg }}
              />
            ))}
          </div>
        </ToolbarGroup>

        <div className="flex-1" />

        {/* Quick stats badge */}
        <div className="hidden md:flex items-center gap-3 text-[11px] text-muted-foreground tabular-nums">
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted">
            <Monitor className="h-3 w-3" /> {recommended}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted">
            {filledCount}/{design.screens.length} filled
          </span>
        </div>
      </div>

      {/* ── UPLOAD STRIP ── */}
      <div
        {...getUploadRootProps()}
        className={`shrink-0 border-b border-border cursor-pointer transition-all group ${
          isUploadDragActive
            ? "bg-primary/10 border-primary"
            : "bg-background hover:bg-primary/5"
        }`}
      >
        <input {...getUploadInputProps()} />
        <div className="flex items-center gap-3 px-5 py-3">
          <div
            className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
            style={{
              background: "color-mix(in oklch, var(--color-primary) 14%, transparent)",
              color: "var(--color-primary)",
            }}
          >
            <ImagePlus size={16} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground">
              Drop screenshots to fill every empty screen
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              Click to browse · auto-cropped to the {DEVICE_LABELS[design.device]} frame
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="px-2 py-1 rounded-md bg-muted/60 font-mono text-primary">{recommended}</span>
          </div>
        </div>
      </div>

      {/* ── GALLERY + EDIT PANEL ── */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Gallery */}
        <div
          className="flex-1 flex items-center gap-5 px-8 overflow-x-auto canvas-dots-fine"
          style={{
            background: "linear-gradient(180deg, transparent 0%, color-mix(in oklch, var(--color-background) 0%, transparent) 100%)",
          }}
        >
          {design.screens.map((s, i) => {
            const active = s.id === design.activeScreenId;
            const resolved = resolveDesign(design, s);
            return (
              <div key={s.id} className="group shrink-0 flex flex-col anim-in" style={{ minWidth: CARD_W }}>
                <div
                  onClick={() => setDesign((d) => ({ ...d, activeScreenId: s.id }))}
                  className="cursor-pointer transition-all duration-200"
                  style={{
                    width: CARD_W,
                    height: cardH,
                    borderRadius: 18,
                    overflow: "hidden",
                    outline: active
                      ? "3px solid var(--color-primary)"
                      : "1px solid color-mix(in oklch, var(--color-border) 80%, transparent)",
                    outlineOffset: active ? 4 : 0,
                    boxShadow: active
                      ? "var(--shadow-elegant), var(--shadow-card)"
                      : "var(--shadow-card)",
                    transform: active ? "translateY(-2px)" : undefined,
                  }}
                >
                  <div
                    style={{
                      width: size.w,
                      height: size.h,
                      transform: `scale(${cardScale})`,
                      transformOrigin: "top left",
                    }}
                  >
                    <Canvas
                      design={resolved}
                      scale={cardScale}
                      onDeviceMove={(x, y) =>
                        setDesign((d) => ({
                          ...d,
                          screens: d.screens.map((sc) =>
                            sc.id === s.id ? { ...sc, deviceX: x, deviceY: y } : sc,
                          ),
                        }))
                      }
                      onScreenshotUpload={(url) =>
                        setDesign((d) => ({
                          ...d,
                          screens: d.screens.map((sc) =>
                            sc.id === s.id
                              ? { ...sc, screenshot: url, imgX: 50, imgY: 50, imgScale: 1 }
                              : sc,
                          ),
                        }))
                      }
                      onScreenshotRemove={() =>
                        setDesign((d) => ({
                          ...d,
                          screens: d.screens.map((sc) =>
                            sc.id === s.id ? { ...sc, screenshot: null } : sc,
                          ),
                        }))
                      }
                      onImageAdjust={(x, y, sc) =>
                        setDesign((d) => ({
                          ...d,
                          screens: d.screens.map((scr) =>
                            scr.id === s.id ? { ...scr, imgX: x, imgY: y, imgScale: sc } : scr,
                          ),
                        }))
                      }
                      onImageClick={() => {
                        setDesign((d) => ({ ...d, activeScreenId: s.id }));
                        setShowImageEdit(true);
                        setShowPosition(false);
                      }}
                      onTextDblClick={(field, el) => {
                        setDesign((d) => ({ ...d, activeScreenId: s.id }));
                        const rect = el.getBoundingClientRect();
                        const value = field === "headline" ? s.headline : s.subheadline;
                        setTextOverlay({
                          field,
                          isCustom: false,
                          value,
                          x: rect.left,
                          y: rect.top,
                          w: rect.width,
                          fontSize: (field === "headline" ? design.headlineSize : design.subSize) * cardScale,
                          color: design.textColor,
                          bold: field === "headline",
                        });
                      }}
                      onCustomTextDblClick={(id, el) => {
                        setDesign((d) => ({ ...d, activeScreenId: s.id }));
                        const ct = s.customTexts.find((c) => c.id === id);
                        if (!ct) return;
                        const rect = el.getBoundingClientRect();
                        setSelectedCtId(id);
                        setTextOverlay({
                          field: id,
                          isCustom: true,
                          value: ct.content,
                          x: rect.left,
                          y: rect.top,
                          w: rect.width,
                          fontSize: ct.size * cardScale,
                          color: ct.color,
                          bold: ct.bold,
                        });
                      }}
                      onCustomTextMove={(id, x, y) =>
                        setDesign((d) => ({
                          ...d,
                          screens: d.screens.map((sc) =>
                            sc.id === s.id
                              ? {
                                  ...sc,
                                  customTexts: sc.customTexts.map((ct) =>
                                    ct.id === id ? { ...ct, x, y } : ct,
                                  ),
                                }
                              : sc,
                          ),
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2 px-1">
                  <span
                    className={`text-[11px] font-medium transition-colors ${
                      active ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    Screen {i + 1}
                    {!s.screenshot && (
                      <span className="ml-1.5 text-[9px] uppercase tracking-widest opacity-60">empty</span>
                    )}
                  </span>
                  {design.screens.length > 1 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); removeScreen(s.id); }}
                      className="opacity-0 group-hover:opacity-100 h-5 w-5 flex items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/20 hover:text-destructive transition-all"
                      title="Remove screen"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Add screen */}
          <button
            onClick={() => setShowFramePicker(true)}
            className="shrink-0 rounded-2xl border-2 border-dashed border-border hover:border-primary/60 hover:bg-primary/5 flex flex-col items-center justify-center gap-3 text-muted-foreground hover:text-primary transition-all duration-200"
            style={{ width: CARD_W, height: cardH, minWidth: CARD_W }}
          >
            <div className="h-11 w-11 rounded-full border-2 border-dashed border-current flex items-center justify-center">
              <Plus size={20} />
            </div>
            <span className="text-xs font-semibold">Add screen</span>
            <span className="text-[10px] opacity-70 -mt-2">Pick a frame</span>
          </button>
        </div>

        {/* ── EDIT PANEL ── */}
        <div className="shrink-0 border-t border-border bg-card">
          {/* Main row */}
          <div className="flex items-start gap-6 px-5 py-3">
            {/* Layout — grouped */}
            <div className="shrink-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                Layout
              </p>
              <div className="flex flex-col gap-2">
                {TEMPLATE_GROUPS.map((group) => (
                  <div key={group.label}>
                    <p className="text-[9px] font-medium text-muted-foreground/60 uppercase tracking-widest mb-1">
                      {group.label}
                    </p>
                    <div className="flex gap-1.5">
                      {group.ids.map((id) => {
                        const active = activeScreen.template === id;
                        return (
                          <button
                            key={id}
                            title={TEMPLATE_LABELS[id].label}
                            onClick={() => updateActive({ template: id, ...TEMPLATE_DEFAULTS[id] })}
                            className={`rounded-lg overflow-hidden transition-all hover:scale-105 ${
                              active
                                ? "ring-2 ring-primary scale-105"
                                : "ring-1 ring-border hover:ring-primary/50"
                            }`}
                          >
                            <div
                              style={{
                                width: 28,
                                aspectRatio: "9/16",
                                background: active
                                  ? "color-mix(in oklch, var(--color-primary) 14%, transparent)"
                                  : "var(--color-muted)",
                                position: "relative",
                              }}
                            >
                              <TemplateMini id={id} active={active} />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Divider vertical />

            {/* Text inputs */}
            <div className="flex-1 grid grid-cols-2 gap-3 min-w-0">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground block mb-1.5">
                  Headline
                </label>
                <Input
                  value={activeScreen.headline}
                  onChange={(e) => updateActive({ headline: e.target.value })}
                  placeholder="Your headline…"
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground block mb-1.5">
                  Sub-headline
                </label>
                <Input
                  value={activeScreen.subheadline}
                  onChange={(e) => updateActive({ subheadline: e.target.value })}
                  placeholder="Describe your feature…"
                  className="h-9 text-sm"
                />
              </div>
            </div>

            {/* Text color */}
            <div className="shrink-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                Text
              </p>
              <label className="cursor-pointer block" title="Text color">
                <input
                  type="color"
                  value={design.textColor}
                  onChange={(e) => setDesign((d) => ({ ...d, textColor: e.target.value }))}
                  className="sr-only"
                />
                <div
                  className="h-9 w-9 rounded-lg border-2 border-border transition-all hover:scale-105"
                  style={{ background: design.textColor }}
                />
              </label>
            </div>

            {/* Elements / text layers */}
            <div className="shrink-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                Layers
              </p>
              <div className="flex gap-1.5 items-center">
                {activeScreen.customTexts.map((ct) => (
                  <button
                    key={ct.id}
                    onClick={() => setSelectedCtId(ct.id === selectedCtId ? null : ct.id)}
                    title={ct.content}
                    className={`h-9 px-2.5 rounded-lg text-xs transition-all max-w-[80px] truncate ring-1 ${
                      ct.id === selectedCtId
                        ? "ring-primary bg-primary/10 text-primary"
                        : "ring-border text-muted-foreground hover:ring-primary/50"
                    }`}
                  >
                    {ct.content.substring(0, 7)}{ct.content.length > 7 ? "…" : ""}
                  </button>
                ))}
                <button
                  onClick={addCustomText}
                  title="Add text layer"
                  className="h-9 w-9 rounded-lg border-2 border-dashed border-border hover:border-primary/60 flex items-center justify-center text-muted-foreground hover:text-primary transition-all shrink-0"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Screen # + position toggle */}
            <div className="shrink-0 text-right">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                Screen
              </p>
              <p className="text-base font-bold text-foreground leading-none mb-1.5 tabular-nums">
                {activeIdx + 1}
                <span className="text-sm font-normal text-muted-foreground">/{design.screens.length}</span>
              </p>
              <button
                onClick={() => setShowPosition((v) => !v)}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors ml-auto"
              >
                {showPosition ? <ChevronDown size={11} /> : <ChevronUp size={11} />}
                Position
              </button>
            </div>
          </div>

          {/* Image adjust row */}
          {showImageEdit && activeScreen.screenshot && (
            <div className="flex items-center gap-6 px-5 py-3 border-t border-border anim-in">
              <div className="shrink-0 flex items-center gap-2">
                <div
                  className="h-7 w-7 rounded-md flex items-center justify-center"
                  style={{ background: "color-mix(in oklch, var(--color-primary) 14%, transparent)", color: "var(--color-primary)" }}
                >
                  <Move size={13} />
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Crop & zoom
                </p>
                <button
                  onClick={() => setShowImageEdit(false)}
                  className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors ml-1"
                  title="Close"
                >
                  <X size={10} />
                </button>
              </div>
              <div className="flex-1 grid grid-cols-3 gap-5">
                <SliderRow label="Pan L/R" value={Math.round(activeScreen.imgX)} min={0} max={100} unit="%" onChange={(v) => updateActive({ imgX: v })} />
                <SliderRow label="Pan U/D" value={Math.round(activeScreen.imgY)} min={0} max={100} unit="%" onChange={(v) => updateActive({ imgY: v })} />
                <SliderRow label="Zoom" value={Math.round(activeScreen.imgScale * 100)} min={50} max={300} unit="%" onChange={(v) => updateActive({ imgScale: v / 100 })} />
              </div>
              <button
                onClick={() => updateActive({ imgX: 50, imgY: 50, imgScale: 1 })}
                className="shrink-0 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Reset
              </button>
            </div>
          )}

          {/* Selected custom text controls */}
          {selectedCt && (
            <div className="flex items-center gap-4 px-5 py-3 border-t border-border anim-in">
              <div className="shrink-0 flex items-center gap-2">
                <div
                  className="h-7 w-7 rounded-md flex items-center justify-center"
                  style={{ background: "color-mix(in oklch, var(--color-primary) 14%, transparent)", color: "var(--color-primary)" }}
                >
                  <Type size={13} />
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Text layer
                </p>
                <button
                  onClick={() => setSelectedCtId(null)}
                  className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors ml-1"
                >
                  <X size={10} />
                </button>
              </div>
              <Input
                value={selectedCt.content}
                onChange={(e) => updateSelectedCt({ content: e.target.value })}
                className="h-8 text-sm w-44"
                placeholder="Text content…"
              />
              <div className="w-36">
                <SliderRow label="Font size" value={selectedCt.size} min={16} max={200} unit="px" onChange={(v) => updateSelectedCt({ size: v })} />
              </div>
              <button
                onClick={() => updateSelectedCt({ bold: !selectedCt.bold })}
                title="Bold"
                className={`h-8 w-8 rounded-lg ring-1 text-sm font-bold transition-all shrink-0 ${
                  selectedCt.bold
                    ? "ring-primary text-primary bg-primary/10"
                    : "ring-border text-muted-foreground hover:ring-primary/40"
                }`}
              >
                B
              </button>
              <label className="cursor-pointer shrink-0" title="Text color">
                <input
                  type="color"
                  value={selectedCt.color}
                  onChange={(e) => updateSelectedCt({ color: e.target.value })}
                  className="sr-only"
                />
                <div className="h-8 w-8 rounded-lg border-2 border-border transition-all hover:scale-105" style={{ background: selectedCt.color }} />
              </label>
              <div className="flex rounded-lg ring-1 ring-border overflow-hidden shrink-0">
                {(["left", "center", "right"] as const).map((a) => {
                  const Icon = a === "left" ? AlignLeft : a === "center" ? AlignCenter : AlignRight;
                  return (
                    <button
                      key={a}
                      onClick={() => updateSelectedCt({ align: a })}
                      title={`Align ${a}`}
                      className={`h-8 w-8 flex items-center justify-center transition-all ${
                        selectedCt.align === a
                          ? "bg-primary/15 text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon size={13} />
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => {
                  updateActive({ customTexts: activeScreen.customTexts.filter((ct) => ct.id !== selectedCtId) });
                  setSelectedCtId(null);
                }}
                title="Delete layer"
                className="shrink-0 h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/20 hover:text-destructive transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}

          {/* Position / spacing row */}
          {showPosition && (
            <div className="flex items-center gap-6 px-5 py-3 border-t border-border anim-in">
              <div className="shrink-0">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                  Device & type
                </p>
              </div>
              <div className="flex-1 grid grid-cols-3 gap-5">
                <SliderRow label="Horizontal" value={Math.round(activeScreen.deviceX)} min={0} max={100} unit="%" onChange={(v) => updateActive({ deviceX: v })} />
                <SliderRow label="Vertical" value={Math.round(activeScreen.deviceY)} min={0} max={100} unit="%" onChange={(v) => updateActive({ deviceY: v })} />
                <SliderRow label="Scale" value={Math.round(activeScreen.deviceScale * 100)} min={30} max={200} unit="%" onChange={(v) => updateActive({ deviceScale: v / 100 })} />
              </div>
              <div className="flex-1 grid grid-cols-2 gap-5">
                <SliderRow label="Headline size" value={design.headlineSize} min={32} max={140} unit="px" onChange={(v) => setDesign((d) => ({ ...d, headlineSize: v }))} />
                <SliderRow label="Sub size" value={design.subSize} min={16} max={64} unit="px" onChange={(v) => setDesign((d) => ({ ...d, subSize: v }))} />
              </div>
              <button
                onClick={() => updateActive({ ...TEMPLATE_DEFAULTS[activeScreen.template] })}
                className="shrink-0 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Reset
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── INLINE TEXT EDITOR OVERLAY ── */}
      {textOverlay && (
        <div
          className="fixed z-[300] anim-in"
          style={{
            left: Math.min(textOverlay.x, (typeof window !== "undefined" ? window.innerWidth : 1200) - 260),
            top: Math.max(60, textOverlay.y - 8),
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="glass border border-primary/60 rounded-xl shadow-2xl p-3 w-[260px]">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              {textOverlay.field === "headline"
                ? "Headline"
                : textOverlay.field === "subheadline"
                ? "Sub-headline"
                : "Custom text"}
            </p>
            <textarea
              ref={overlayRef}
              value={textOverlay.value}
              onChange={(e) => setTextOverlay((o) => (o ? { ...o, value: e.target.value } : null))}
              onBlur={commitTextOverlay}
              onKeyDown={(e) => {
                if (e.key === "Escape") { e.preventDefault(); setTextOverlay(null); }
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commitTextOverlay(); }
              }}
              rows={2}
              autoFocus
              className="w-full bg-background border border-border rounded-lg text-sm text-foreground px-3 py-2 focus:outline-none focus:border-primary/70 resize-none"
            />
            <p className="text-[10px] text-muted-foreground mt-1.5">↵ Save · Esc Cancel</p>
          </div>
        </div>
      )}

      {/* ── HIDDEN EXPORT CANVASES (full-res, off-screen) ── */}
      <div aria-hidden style={{ position: "fixed", left: -99999, top: 0, pointerEvents: "none" }}>
        {design.screens.map((s) => (
          <div key={s.id} style={{ width: size.w, height: size.h }}>
            <Canvas
              ref={(el) => {
                if (el) exportRefs.current.set(s.id, el);
                else exportRefs.current.delete(s.id);
              }}
              design={resolveDesign(design, s)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */
/* Helpers                                                                  */
/* ─────────────────────────────────────────────────────────────────────── */

function ToolbarGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] font-semibold text-muted-foreground/80 uppercase tracking-widest">
        {label}
      </span>
      {children}
    </div>
  );
}

function Divider({ vertical }: { vertical?: boolean } = {}) {
  return (
    <div
      className={vertical ? "w-px h-12 bg-border self-center" : "h-6 w-px bg-border"}
    />
  );
}

function SegmentedControl<T extends string>({
  options, value, onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 bg-muted/60 rounded-lg p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 h-8 rounded-md text-xs font-medium transition-all ${
            value === o.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ── Slider helper ────────────────────────────────────────────────── */

function SliderRow({
  label, value, min, max, unit = "", onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] text-muted-foreground">{label}</span>
        <div className="flex items-center gap-0.5">
          <input
            type="number"
            value={value}
            min={min}
            max={max}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (!isNaN(n)) onChange(Math.max(min, Math.min(max, n)));
            }}
            className="w-11 h-5 rounded text-center text-[10px] bg-background border border-border text-foreground tabular-nums focus:outline-none focus:border-primary/60"
          />
          {unit && <span className="text-[10px] text-muted-foreground">{unit}</span>}
        </div>
      </div>
      <Slider value={[value]} min={min} max={max} onValueChange={(v) => onChange(v[0])} />
    </div>
  );
}

/* ── Frame picker modal ───────────────────────────────────────────── */

function FramePickerModal({
  device, color, onDeviceChange, onColorChange, onCancel, onConfirm,
}: {
  device: DeviceId;
  color: FrameColor;
  onDeviceChange: (d: DeviceId) => void;
  onColorChange: (c: FrameColor) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") onConfirm();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, onConfirm]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center anim-in"
      onClick={onCancel}
    >
      <div
        className="glass rounded-2xl shadow-2xl border border-border w-[560px] p-6"
        onClick={(e) => e.stopPropagation()}
        style={{ background: "var(--color-card)" }}
      >
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-bold text-foreground text-lg">Add a screen</h2>
          <button
            onClick={onCancel}
            className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={14} />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mb-5">Pick the device frame for this screen — you can change it later.</p>

        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Frame</p>
        <div className="grid grid-cols-3 gap-2 mb-5">
          {ALL_DEVICES.map((id) => (
            <button
              key={id}
              onClick={() => onDeviceChange(id)}
              className={`rounded-xl p-3 transition-all ring-1 ${
                device === id
                  ? "ring-primary bg-primary/10 ring-2"
                  : "ring-border hover:ring-primary/50 bg-background"
              }`}
            >
              <FramePreviewSVG device={id} />
              <p className={`text-[11px] font-medium mt-2 text-center ${device === id ? "text-primary" : "text-muted-foreground"}`}>
                {DEVICE_LABELS[id]}
              </p>
            </button>
          ))}
        </div>

        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Color</p>
        <div className="flex items-center gap-2 mb-6">
          {ALL_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => onColorChange(c)}
              title={FRAME_COLOR_LABELS[c].label}
              className={`h-9 w-9 rounded-full transition-all hover:scale-110 ${
                color === c ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : "border-2 border-border"
              }`}
              style={{ background: FRAME_COLOR_LABELS[c].bg }}
            />
          ))}
          <span className="text-xs text-muted-foreground ml-2">{FRAME_COLOR_LABELS[color].label}</span>
        </div>

        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onCancel}>Cancel</Button>
          <Button
            className="flex-1 font-semibold text-white"
            style={{ background: "var(--gradient-primary)" }}
            onClick={onConfirm}
          >
            Add screen
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */
/* Template mini SVGs                                                       */
/* ─────────────────────────────────────────────────────────────────────── */

const TEMPLATE_SVGS: Record<TemplateId, React.ReactNode> = {
  classic: (
    <svg viewBox="0 0 54 96" fill="none" style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}>
      <rect x="10" y="8" width="34" height="6" rx="2" fill="currentColor" opacity="0.7" />
      <rect x="14" y="16" width="26" height="3" rx="1.5" fill="currentColor" opacity="0.35" />
      <rect x="12" y="26" width="30" height="56" rx="5" fill="currentColor" opacity="0.22" />
      <rect x="16" y="30" width="22" height="48" rx="3" fill="currentColor" opacity="0.38" />
    </svg>
  ),
  modern: (
    <svg viewBox="0 0 54 96" fill="none" style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}>
      <rect x="5" y="22" width="22" height="5" rx="2" fill="currentColor" opacity="0.7" />
      <rect x="5" y="30" width="17" height="3" rx="1.5" fill="currentColor" opacity="0.35" />
      <g transform="matrix(0.97,-0.14,0.06,0.98,28,12)">
        <rect width="18" height="68" rx="5" fill="currentColor" opacity="0.22" />
        <rect x="2" y="3" width="14" height="62" rx="3" fill="currentColor" opacity="0.38" />
      </g>
    </svg>
  ),
  minimal: (
    <svg viewBox="0 0 54 96" fill="none" style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}>
      <rect x="13" y="10" width="28" height="76" rx="5" fill="currentColor" opacity="0.22" />
      <rect x="17" y="14" width="20" height="68" rx="3" fill="currentColor" opacity="0.38" />
    </svg>
  ),
  showcase: (
    <svg viewBox="0 0 54 96" fill="none" style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}>
      <rect x="13" y="6" width="28" height="58" rx="5" fill="currentColor" opacity="0.22" />
      <rect x="17" y="10" width="20" height="50" rx="3" fill="currentColor" opacity="0.38" />
      <rect x="8" y="74" width="38" height="6" rx="2" fill="currentColor" opacity="0.7" />
      <rect x="12" y="83" width="30" height="3" rx="1.5" fill="currentColor" opacity="0.35" />
    </svg>
  ),
  "split-right": (
    <svg viewBox="0 0 54 96" fill="none" style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}>
      <rect x="4" y="14" width="22" height="48" rx="5" fill="currentColor" opacity="0.22" />
      <rect x="7" y="18" width="16" height="40" rx="3" fill="currentColor" opacity="0.38" />
      <rect x="30" y="34" width="20" height="5" rx="2" fill="currentColor" opacity="0.7" />
      <rect x="30" y="42" width="15" height="3" rx="1.5" fill="currentColor" opacity="0.35" />
    </svg>
  ),
  floating: (
    <svg viewBox="0 0 54 96" fill="none" style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}>
      <rect x="16" y="6" width="22" height="44" rx="5" fill="currentColor" opacity="0.22" />
      <rect x="19" y="10" width="16" height="36" rx="3" fill="currentColor" opacity="0.38" />
      <rect x="5" y="62" width="44" height="8" rx="2" fill="currentColor" opacity="0.7" />
      <rect x="9" y="73" width="36" height="4" rx="2" fill="currentColor" opacity="0.35" />
    </svg>
  ),
  "split-left": (
    <svg viewBox="0 0 54 96" fill="none" style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}>
      <rect x="4" y="34" width="20" height="5" rx="2" fill="currentColor" opacity="0.7" />
      <rect x="4" y="42" width="15" height="3" rx="1.5" fill="currentColor" opacity="0.35" />
      <rect x="28" y="14" width="22" height="48" rx="5" fill="currentColor" opacity="0.22" />
      <rect x="31" y="18" width="16" height="40" rx="3" fill="currentColor" opacity="0.38" />
    </svg>
  ),
  hero: (
    <svg viewBox="0 0 54 96" fill="none" style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}>
      <rect x="5" y="4" width="44" height="88" rx="5" fill="currentColor" opacity="0.18" />
      <rect x="9" y="8" width="36" height="80" rx="3" fill="currentColor" opacity="0.32" />
      <rect x="5" y="72" width="44" height="20" rx="0" fill="currentColor" opacity="0.45" />
      <rect x="9" y="76" width="36" height="5" rx="2" fill="currentColor" opacity="0.85" />
      <rect x="12" y="84" width="30" height="3" rx="1.5" fill="currentColor" opacity="0.5" />
    </svg>
  ),
  magazine: (
    <svg viewBox="0 0 54 96" fill="none" style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}>
      <rect x="4" y="7" width="46" height="7" rx="2" fill="currentColor" opacity="0.7" />
      <rect x="4" y="17" width="38" height="6" rx="2" fill="currentColor" opacity="0.55" />
      <rect x="22" y="30" width="28" height="52" rx="5" fill="currentColor" opacity="0.22" />
      <rect x="26" y="34" width="20" height="44" rx="3" fill="currentColor" opacity="0.38" />
      <rect x="4" y="84" width="15" height="3" rx="1.5" fill="currentColor" opacity="0.4" />
    </svg>
  ),
  spotlight: (
    <svg viewBox="0 0 54 96" fill="none" style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}>
      <circle cx="27" cy="55" r="24" fill="currentColor" opacity="0.10" />
      <circle cx="27" cy="55" r="16" fill="currentColor" opacity="0.08" />
      <rect x="10" y="7" width="34" height="5" rx="2" fill="currentColor" opacity="0.65" />
      <rect x="14" y="24" width="26" height="54" rx="5" fill="currentColor" opacity="0.22" />
      <rect x="17" y="27" width="20" height="48" rx="3" fill="currentColor" opacity="0.38" />
      <rect x="14" y="83" width="26" height="3" rx="1.5" fill="currentColor" opacity="0.38" />
    </svg>
  ),
  "feature-list": (
    <svg viewBox="0 0 54 96" fill="none" style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}>
      <rect x="4" y="26" width="8" height="2.5" rx="1.2" fill="currentColor" opacity="0.60" />
      <rect x="4" y="31" width="20" height="5" rx="2" fill="currentColor" opacity="0.70" />
      <rect x="4" y="39" width="16" height="3" rx="1.5" fill="currentColor" opacity="0.35" />
      <circle cx="6" cy="51" r="2" fill="currentColor" opacity="0.55" />
      <rect x="11" y="50" width="14" height="2" rx="1" fill="currentColor" opacity="0.18" />
      <circle cx="6" cy="59" r="2" fill="currentColor" opacity="0.55" />
      <rect x="11" y="58" width="14" height="2" rx="1" fill="currentColor" opacity="0.18" />
      <circle cx="6" cy="67" r="2" fill="currentColor" opacity="0.55" />
      <rect x="11" y="66" width="14" height="2" rx="1" fill="currentColor" opacity="0.18" />
      <rect x="30" y="12" width="21" height="72" rx="5" fill="currentColor" opacity="0.22" />
      <rect x="33" y="16" width="15" height="64" rx="3" fill="currentColor" opacity="0.38" />
    </svg>
  ),
  band: (
    <svg viewBox="0 0 54 96" fill="none" style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}>
      <rect x="0" y="0" width="54" height="36" rx="0" fill="currentColor" opacity="0.20" />
      <rect x="8" y="8" width="38" height="5" rx="2" fill="currentColor" opacity="0.65" />
      <rect x="14" y="16" width="26" height="3" rx="1.5" fill="currentColor" opacity="0.35" />
      <rect x="13" y="26" width="28" height="58" rx="5" fill="currentColor" opacity="0.22" />
      <rect x="17" y="30" width="20" height="50" rx="3" fill="currentColor" opacity="0.38" />
      <rect x="14" y="88" width="26" height="3" rx="1.5" fill="currentColor" opacity="0.38" />
    </svg>
  ),
  "dark-glow": (
    <svg viewBox="0 0 54 96" fill="none" style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}>
      <rect x="0" y="0" width="54" height="96" fill="currentColor" opacity="0.16" />
      <circle cx="27" cy="44" r="22" fill="currentColor" opacity="0.10" />
      <circle cx="27" cy="44" r="14" fill="currentColor" opacity="0.08" />
      <rect x="13" y="10" width="28" height="60" rx="5" fill="currentColor" opacity="0.26" />
      <rect x="17" y="14" width="20" height="52" rx="3" fill="currentColor" opacity="0.42" />
      <rect x="0" y="72" width="54" height="24" fill="currentColor" opacity="0.22" />
      <rect x="8" y="76" width="38" height="5" rx="2" fill="currentColor" opacity="0.70" />
      <rect x="14" y="84" width="26" height="3" rx="1.5" fill="currentColor" opacity="0.42" />
    </svg>
  ),
  "pill-badge": (
    <svg viewBox="0 0 54 96" fill="none" style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}>
      <rect x="10" y="6" width="34" height="11" rx="5.5" fill="currentColor" opacity="0.14" stroke="currentColor" strokeWidth="1" strokeOpacity="0.38" />
      <rect x="16" y="9" width="22" height="5" rx="2.5" fill="currentColor" opacity="0.52" />
      <rect x="13" y="24" width="28" height="58" rx="5" fill="currentColor" opacity="0.22" />
      <rect x="17" y="28" width="20" height="50" rx="3" fill="currentColor" opacity="0.38" />
      <rect x="8" y="86" width="38" height="6" rx="2" fill="currentColor" opacity="0.65" />
    </svg>
  ),
};

function TemplateMini({ id, active }: { id: TemplateId; active: boolean }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        padding: 4,
        color: active ? "var(--color-primary)" : "var(--color-muted-foreground)",
      }}
    >
      {TEMPLATE_SVGS[id]}
    </div>
  );
}

/* ── Frame preview SVGs ────────────────────────────────────────────── */

const FRAME_SVGS: Record<DeviceId, React.ReactNode> = {
  default: (
    <svg viewBox="0 0 40 82" fill="none" className="w-full h-full">
      <rect x="1" y="1" width="38" height="80" rx="9" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" />
      <rect x="4" y="4" width="32" height="74" rx="7" fill="currentColor" opacity="0.08" />
      <rect x="13" y="72" width="14" height="2.5" rx="1.25" fill="currentColor" opacity="0.4" />
    </svg>
  ),
  iphone15: (
    <svg viewBox="0 0 40 82" fill="none" className="w-full h-full">
      <rect x="1" y="1" width="38" height="80" rx="9" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" />
      <rect x="4" y="4" width="32" height="74" rx="7" fill="currentColor" opacity="0.08" />
      <rect x="12" y="8" width="16" height="5" rx="2.5" fill="currentColor" opacity="0.6" />
      <rect x="13" y="72" width="14" height="2.5" rx="1.25" fill="currentColor" opacity="0.4" />
    </svg>
  ),
  pixel8: (
    <svg viewBox="0 0 40 82" fill="none" className="w-full h-full">
      <rect x="1" y="1" width="38" height="80" rx="8" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" />
      <rect x="4" y="4" width="32" height="74" rx="6" fill="currentColor" opacity="0.08" />
      <circle cx="20" cy="11" r="3" fill="currentColor" opacity="0.6" />
    </svg>
  ),
  samsung: (
    <svg viewBox="0 0 40 82" fill="none" className="w-full h-full">
      <rect x="1" y="1" width="38" height="80" rx="7" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" />
      <rect x="3" y="3" width="34" height="76" rx="5.5" fill="currentColor" opacity="0.08" />
      <circle cx="20" cy="10" r="2" fill="currentColor" opacity="0.6" />
    </svg>
  ),
  ipad: (
    <svg viewBox="0 0 60 80" fill="none" className="w-full h-full">
      <rect x="1" y="1" width="58" height="78" rx="6" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" />
      <rect x="4" y="4" width="52" height="72" rx="4" fill="currentColor" opacity="0.08" />
      <circle cx="30" cy="9" r="2.5" fill="currentColor" opacity="0.6" />
    </svg>
  ),
  generic: (
    <svg viewBox="0 0 40 82" fill="none" className="w-full h-full">
      <rect x="1" y="1" width="38" height="80" rx="6" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" />
      <rect x="4" y="4" width="32" height="74" rx="4" fill="currentColor" opacity="0.08" />
    </svg>
  ),
};

function FramePreviewSVG({ device }: { device: DeviceId }) {
  const isIpad = device === "ipad";
  return (
    <div className="mx-auto text-foreground" style={{ width: isIpad ? 48 : 32, height: 60 }}>
      {FRAME_SVGS[device]}
    </div>
  );
}
