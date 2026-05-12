import { useRef } from "react";
import { Upload, RefreshCw, Trash2, Move } from "lucide-react";
import type { DeviceId, FrameColor } from "@/lib/screenshot-types";

interface Props {
  device: DeviceId;
  color: FrameColor;
  screenshot: string | null;
  onUpload?: (dataUrl: string) => void;
  onRemove?: () => void;
  className?: string;
  imgX?: number;
  imgY?: number;
  imgScale?: number;
  onImageAdjust?: (x: number, y: number, scale: number) => void;
  onImageClick?: () => void;
}

function readFile(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = (e) => res(e.target?.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

// ── Device configs ────────────────────────────────────────────────

interface DeviceCfg {
  outerRadius: number;
  innerRadius: number;
  padding: number;
  camera: "dynamic-island" | "punch-hole" | "punch-small" | "none";
  defaultAspect: number;
}

const DEVICE_CFG: Record<DeviceId, DeviceCfg> = {
  default:  { outerRadius: 54, innerRadius: 44, padding: 13, camera: "none",           defaultAspect: 9 / 19.5 },
  iphone15: { outerRadius: 54, innerRadius: 44, padding: 13, camera: "dynamic-island", defaultAspect: 9 / 19.5 },
  pixel8:   { outerRadius: 48, innerRadius: 38, padding: 14, camera: "punch-hole",     defaultAspect: 9 / 19.5 },
  samsung:  { outerRadius: 36, innerRadius: 28, padding: 10, camera: "punch-small",    defaultAspect: 9 / 19.5 },
  ipad:     { outerRadius: 20, innerRadius: 14, padding: 14, camera: "punch-small",    defaultAspect: 3 / 4 },
  generic:  { outerRadius: 28, innerRadius: 20, padding: 11, camera: "none",           defaultAspect: 9 / 19.5 },
};

// ── Bezel color styles ────────────────────────────────────────────

interface BezelStyle {
  bg: string;
  border: string;
  shadow: string;
  islandBg: string;
  screenInner: string;
}

const BEZEL_STYLE: Record<FrameColor, BezelStyle> = {
  black: {
    bg: "linear-gradient(170deg,#282828 0%,#111 55%,#0a0a0a 100%)",
    border: "rgba(255,255,255,0.10)",
    shadow: "0 0 0 1.5px rgba(255,255,255,0.07), 0 40px 100px -20px rgba(0,0,0,0.9), 0 10px 30px -5px rgba(0,0,0,0.5)",
    islandBg: "#000",
    screenInner: "inset 0 0 0 1px rgba(255,255,255,0.04)",
  },
  white: {
    bg: "linear-gradient(170deg,#fafafa 0%,#e8e8e8 60%,#dcdcdc 100%)",
    border: "rgba(0,0,0,0.18)",
    shadow: "0 0 0 1.5px rgba(0,0,0,0.10), 0 40px 100px -20px rgba(0,0,0,0.45), 0 10px 30px -5px rgba(0,0,0,0.2)",
    islandBg: "#0a0a0a",
    screenInner: "inset 0 0 0 1px rgba(0,0,0,0.06)",
  },
  titanium: {
    bg: "linear-gradient(170deg,#c8c8c8 0%,#7e7e7e 50%,#acacac 100%)",
    border: "rgba(255,255,255,0.22)",
    shadow: "0 0 0 1.5px rgba(255,255,255,0.14), 0 40px 100px -20px rgba(0,0,0,0.75), 0 10px 30px -5px rgba(0,0,0,0.4)",
    islandBg: "#000",
    screenInner: "inset 0 0 0 1px rgba(255,255,255,0.05)",
  },
  gold: {
    bg: "linear-gradient(170deg,#f5da90 0%,#b87820 50%,#e4c460 100%)",
    border: "rgba(255,240,150,0.35)",
    shadow: "0 0 0 1.5px rgba(220,170,60,0.25), 0 40px 100px -20px rgba(0,0,0,0.7), 0 10px 30px -5px rgba(0,0,0,0.35)",
    islandBg: "#000",
    screenInner: "inset 0 0 0 1px rgba(255,255,255,0.06)",
  },
};

// ── Component ─────────────────────────────────────────────────────

export function DeviceFrame({
  device, color, screenshot, onUpload, onRemove, className,
  imgX = 50, imgY = 50, imgScale = 1,
  onImageAdjust, onImageClick,
}: Props) {
  const cfg = DEVICE_CFG[device];
  const sty = BEZEL_STYLE[color];
  const aspect = cfg.defaultAspect;

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpload) return;
    onUpload(await readFile(file));
    e.target.value = "";
  };

  // ── Drag-to-reposition ────────────────────────────────────────
  const dragState = useRef<{
    sx: number; sy: number; bx: number; by: number;
    cw: number; ch: number; moved: boolean;
  } | null>(null);

  const onImgPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!onImageAdjust) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    dragState.current = {
      sx: e.clientX, sy: e.clientY,
      bx: imgX, by: imgY,
      cw: rect.width, ch: rect.height,
      moved: false,
    };
  };

  const onImgPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current || !onImageAdjust) return;
    const dx = e.clientX - dragState.current.sx;
    const dy = e.clientY - dragState.current.sy;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragState.current.moved = true;
    // Invert: drag right → show left side → X decreases
    const newX = Math.max(0, Math.min(100, dragState.current.bx - (dx / dragState.current.cw) * 100));
    const newY = Math.max(0, Math.min(100, dragState.current.by - (dy / dragState.current.ch) * 100));
    onImageAdjust(newX, newY, imgScale);
  };

  const onImgPointerUp = () => {
    if (!dragState.current) return;
    if (!dragState.current.moved) onImageClick?.();
    dragState.current = null;
  };

  const onImgWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!onImageAdjust) return;
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    onImageAdjust(imgX, imgY, Math.max(0.5, Math.min(3, imgScale + delta)));
  };

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: aspect,
        background: sty.bg,
        borderRadius: cfg.outerRadius,
        padding: cfg.padding,
        boxShadow: `0 0 0 1.5px ${sty.border}, ${sty.shadow}`,
      }}
    >
      {/* Screen area */}
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#000",
          borderRadius: cfg.innerRadius,
          overflow: "hidden",
          position: "relative",
          boxShadow: sty.screenInner,
        }}
      >
        {/* Dynamic Island */}
        {cfg.camera === "dynamic-island" && (
          <div
            style={{
              position: "absolute",
              top: "3.8%",
              left: "50%",
              transform: "translateX(-50%)",
              width: "32%",
              aspectRatio: "3.2 / 1",
              background: sty.islandBg,
              borderRadius: 999,
              zIndex: 3,
              pointerEvents: "none",
              boxShadow: "0 0 0 2px rgba(255,255,255,0.03)",
            }}
          />
        )}

        {/* Punch-hole camera */}
        {(cfg.camera === "punch-hole" || cfg.camera === "punch-small") && (
          <div
            style={{
              position: "absolute",
              top: cfg.camera === "punch-hole" ? "2.8%" : "2.2%",
              left: "50%",
              transform: "translateX(-50%)",
              width: cfg.camera === "punch-hole" ? "7%" : "4.5%",
              aspectRatio: "1",
              background: sty.islandBg,
              borderRadius: "50%",
              zIndex: 3,
              pointerEvents: "none",
              boxShadow: "0 0 0 1.5px rgba(255,255,255,0.05)",
            }}
          />
        )}

        {/* Screenshot or empty state */}
        {screenshot ? (
          <div
            className="group/img relative w-full h-full"
            onPointerDown={onImgPointerDown}
            onPointerMove={onImgPointerMove}
            onPointerUp={onImgPointerUp}
            onPointerCancel={onImgPointerUp}
            onWheel={onImgWheel}
            style={{
              cursor: onImageAdjust ? "grab" : "default",
              touchAction: "none",
            }}
          >
            <img
              src={screenshot}
              alt="App screenshot"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: `${imgX}% ${imgY}%`,
                transform: imgScale !== 1 ? `scale(${imgScale})` : undefined,
                transformOrigin: `${imgX}% ${imgY}%`,
                display: "block",
                userSelect: "none",
                pointerEvents: "none",
              }}
              crossOrigin="anonymous"
              draggable={false}
            />
            {(onUpload || onRemove || onImageAdjust) && (
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 flex items-center justify-center gap-2 transition-opacity pointer-events-none group-hover/img:pointer-events-auto">
                {onImageAdjust && (
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); onImageClick?.(); }}
                    className="cursor-pointer rounded-full bg-white/10 hover:bg-primary/60 px-3 py-1.5 text-white flex items-center gap-1.5 transition-all border border-white/20"
                    style={{ fontSize: 11 }}
                  >
                    <Move size={11} />
                    Adjust
                  </button>
                )}
                {onUpload && (
                  <label
                    onClick={(e) => e.stopPropagation()}
                    className="cursor-pointer rounded-full bg-white/10 hover:bg-white/20 px-3 py-1.5 text-white flex items-center gap-1.5 transition-all border border-white/20"
                    style={{ fontSize: 11 }}
                  >
                    <input type="file" accept="image/*" className="sr-only" onChange={handleFile} />
                    <RefreshCw size={11} />
                    Replace
                  </label>
                )}
                {onRemove && (
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); onRemove(); }}
                    className="cursor-pointer rounded-full bg-white/10 hover:bg-destructive px-3 py-1.5 text-white flex items-center gap-1.5 transition-all border border-white/20"
                    style={{ fontSize: 11 }}
                  >
                    <Trash2 size={11} />
                    Remove
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              background: "linear-gradient(160deg,#0f172a 0%,#1e293b 100%)",
            }}
          >
            {onUpload ? (
              <label
                onClick={(e) => e.stopPropagation()}
                className="absolute inset-0 flex flex-col items-center justify-center gap-3 cursor-pointer group/upload"
                style={{ padding: 20 }}
              >
                <input type="file" accept="image/*" className="sr-only" onChange={handleFile} />
                <div
                  className="flex items-center justify-center rounded-full transition-all group-hover/upload:scale-105"
                  style={{
                    width: 44,
                    height: 44,
                    background: "oklch(0.7 0.18 285 / 0.15)",
                    border: "1.5px dashed oklch(0.7 0.18 285 / 0.6)",
                  }}
                >
                  <Upload size={18} style={{ color: "oklch(0.7 0.18 285)" }} />
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600 }}>Add screenshot</div>
                  <div style={{ color: "#475569", fontSize: 10, marginTop: 3 }}>Click to browse</div>
                </div>
              </label>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(148,163,184,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Upload size={14} style={{ color: "#475569" }} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Home indicator (iPhone-style devices) */}
      {(device === "default" || device === "iphone15" || device === "generic") && screenshot && (
        <div
          style={{
            position: "absolute",
            bottom: "2.5%",
            left: "50%",
            transform: "translateX(-50%)",
            width: "28%",
            height: 4,
            background: "rgba(255,255,255,0.5)",
            borderRadius: 999,
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}
