import { forwardRef, useRef } from "react";
import { DeviceFrame } from "./DeviceFrame";
import { SIZES, type CustomText, type ResolvedDesign } from "@/lib/screenshot-types";

interface Props {
  design: ResolvedDesign;
  scale?: number;
  onDeviceMove?: (xPct: number, yPct: number) => void;
  onImageMove?: (x: number, y: number) => void;
  onScreenshotUpload?: (dataUrl: string) => void;
  onScreenshotRemove?: () => void;
  onImageAdjust?: (x: number, y: number, scale: number) => void;
  onImageClick?: () => void;
  onTextDblClick?: (field: "headline" | "subheadline", el: HTMLElement) => void;
  onCustomTextDblClick?: (id: string, el: HTMLElement) => void;
  onCustomTextMove?: (id: string, x: number, y: number) => void;
}

export const Canvas = forwardRef<HTMLDivElement, Props>(
  ({
    design, scale = 1,
    onDeviceMove, onScreenshotUpload, onScreenshotRemove,
    onImageAdjust, onImageClick,
    onTextDblClick, onCustomTextDblClick, onCustomTextMove,
  }, ref) => {
    const size = SIZES[design.size];
    const background = design.bgType === "gradient" ? design.bgGradient : design.bgSolid;
    const textStyle = { color: design.textColor, fontWeight: design.headlineWeight };

    // ── Device drag ───────────────────────────────────────────────
    const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);

    const onPointerDown = (e: React.PointerEvent) => {
      if (!onDeviceMove) return;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = { startX: e.clientX, startY: e.clientY, baseX: design.deviceX, baseY: design.deviceY };
    };
    const onPointerMove = (e: React.PointerEvent) => {
      if (!dragRef.current) return;
      const dx = (e.clientX - dragRef.current.startX) / scale;
      const dy = (e.clientY - dragRef.current.startY) / scale;
      const xPct = dragRef.current.baseX + (dx / size.w) * 100;
      const yPct = dragRef.current.baseY + (dy / size.h) * 100;
      onDeviceMove?.(Math.max(0, Math.min(100, xPct)), Math.max(0, Math.min(100, yPct)));
    };
    const onPointerUp = () => { dragRef.current = null; };

    // ── Custom text drag ──────────────────────────────────────────
    const ctDrag = useRef<{ id: string; sx: number; sy: number; bx: number; by: number } | null>(null);

    const onCtDown = (e: React.PointerEvent, ct: CustomText) => {
      if (!onCustomTextMove) return;
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      ctDrag.current = { id: ct.id, sx: e.clientX, sy: e.clientY, bx: ct.x, by: ct.y };
    };
    const onCtMove = (e: React.PointerEvent) => {
      if (!ctDrag.current || !onCustomTextMove) return;
      const dx = (e.clientX - ctDrag.current.sx) / scale;
      const dy = (e.clientY - ctDrag.current.sy) / scale;
      onCustomTextMove(
        ctDrag.current.id,
        Math.max(2, Math.min(98, ctDrag.current.bx + (dx / size.w) * 100)),
        Math.max(2, Math.min(98, ctDrag.current.by + (dy / size.h) * 100)),
      );
    };
    const onCtUp = () => { ctDrag.current = null; };

    // ── Layout helpers ────────────────────────────────────────────
    const baseDeviceWidth =
      design.template === "minimal"      ? 0.70 :
      design.template === "modern"       ? 0.50 :
      design.template === "split-right"  ? 0.42 :
      design.template === "split-left"   ? 0.42 :
      design.template === "floating"     ? 0.50 :
      design.template === "showcase"     ? 0.60 :
      design.template === "hero"         ? 0.72 :
      design.template === "magazine"     ? 0.48 :
      design.template === "spotlight"    ? 0.62 :
      design.template === "feature-list" ? 0.40 :
      design.template === "band"         ? 0.55 :
      design.template === "dark-glow"    ? 0.58 :
      design.template === "pill-badge"   ? 0.62 : 0.65;

    const deviceWidthPx = size.w * baseDeviceWidth * design.deviceScale;
    const tilt = design.template === "modern";

    const deviceNode = (
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          position: "absolute",
          left: `${design.deviceX}%`,
          top:  `${design.deviceY}%`,
          width: deviceWidthPx,
          transform: `translate(-50%,-50%)${tilt ? " perspective(2000px) rotateY(-18deg) rotateX(6deg)" : ""}`,
          transformStyle: "preserve-3d",
          cursor: onDeviceMove ? "grab" : "default",
          touchAction: "none",
        }}
      >
        <DeviceFrame
          device={design.device}
          color={design.frameColor}
          screenshot={design.screenshot}
          imgX={design.imgX}
          imgY={design.imgY}
          imgScale={design.imgScale}
          onUpload={onScreenshotUpload}
          onRemove={onScreenshotRemove}
          onImageAdjust={onImageAdjust}
          onImageClick={onImageClick}
        />
      </div>
    );

    const headlineEl = (
      <h1
        style={{ ...textStyle, fontSize: design.headlineSize, lineHeight: 1.05, margin: 0, cursor: onTextDblClick ? "text" : "default" }}
        onDoubleClick={(e) => { e.stopPropagation(); onTextDblClick?.("headline", e.currentTarget); }}
      >
        {design.headline}
      </h1>
    );
    const subEl = (
      <p
        style={{ color: design.textColor, opacity: 0.82, fontSize: design.subSize, marginTop: 24, lineHeight: 1.35, cursor: onTextDblClick ? "text" : "default" }}
        onDoubleClick={(e) => { e.stopPropagation(); onTextDblClick?.("subheadline", e.currentTarget); }}
      >
        {design.subheadline}
      </p>
    );

    const customTexts = design.customTexts ?? [];

    return (
      <div
        ref={ref}
        style={{
          width: size.w,
          height: size.h,
          background,
          position: "relative",
          overflow: "hidden",
          fontFamily: 'ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif',
        }}
      >
        {design.template === "classic" && (
          <>
            <div style={{ position: "absolute", top: "6%", left: "8%", right: "8%", textAlign: "center" }}>
              {headlineEl}
              <div style={{ maxWidth: "85%", margin: "0 auto" }}>{subEl}</div>
            </div>
            {deviceNode}
          </>
        )}

        {design.template === "modern" && (
          <>
            <div style={{ position: "absolute", top: "10%", left: "6%", width: "44%" }}>
              {headlineEl}{subEl}
            </div>
            {deviceNode}
          </>
        )}

        {design.template === "minimal" && deviceNode}

        {design.template === "showcase" && (
          <>
            {deviceNode}
            <div style={{ position: "absolute", bottom: "6%", left: "8%", right: "8%", textAlign: "center" }}>
              {headlineEl}
              <div style={{ maxWidth: "85%", margin: "0 auto" }}>{subEl}</div>
            </div>
          </>
        )}

        {design.template === "split-right" && (
          <>
            {deviceNode}
            <div style={{ position: "absolute", top: "50%", right: "6%", width: "42%", transform: "translateY(-50%)" }}>
              {headlineEl}{subEl}
            </div>
          </>
        )}

        {design.template === "floating" && (
          <>
            {deviceNode}
            <div style={{ position: "absolute", bottom: "10%", left: "8%", right: "8%", textAlign: "center" }}>
              <h1
                style={{ ...textStyle, fontSize: Math.round(design.headlineSize * 1.25), lineHeight: 1, margin: 0, letterSpacing: "-0.02em", cursor: onTextDblClick ? "text" : "default" }}
                onDoubleClick={(e) => { e.stopPropagation(); onTextDblClick?.("headline", e.currentTarget); }}
              >
                {design.headline}
              </h1>
              <div style={{ maxWidth: "80%", margin: "0 auto" }}>{subEl}</div>
            </div>
          </>
        )}

        {design.template === "split-left" && (
          <>
            <div style={{ position: "absolute", top: "50%", left: "6%", width: "42%", transform: "translateY(-50%)" }}>
              {headlineEl}{subEl}
            </div>
            {deviceNode}
          </>
        )}

        {design.template === "hero" && (
          <>
            {deviceNode}
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              paddingBottom: "8%", paddingLeft: "8%", paddingRight: "8%", paddingTop: "18%",
              background: "linear-gradient(to top, rgba(0,0,0,0.80) 0%, transparent 100%)",
              textAlign: "center",
              zIndex: 2,
            }}>
              {headlineEl}
              <div style={{ maxWidth: "85%", margin: "0 auto" }}>{subEl}</div>
            </div>
          </>
        )}

        {design.template === "magazine" && (
          <>
            <div style={{ position: "absolute", top: "5%", left: "6%", right: "6%", textAlign: "left" }}>
              <h1
                style={{ ...textStyle, fontSize: Math.round(design.headlineSize * 1.15), lineHeight: 0.92, margin: 0, letterSpacing: "-0.04em", textTransform: "uppercase", cursor: onTextDblClick ? "text" : "default" }}
                onDoubleClick={(e) => { e.stopPropagation(); onTextDblClick?.("headline", e.currentTarget); }}
              >
                {design.headline}
              </h1>
            </div>
            {deviceNode}
            <div style={{ position: "absolute", bottom: "5%", left: "6%", width: "50%", textAlign: "left" }}>
              <p
                style={{ color: design.textColor, opacity: 0.82, fontSize: design.subSize, lineHeight: 1.35, cursor: onTextDblClick ? "text" : "default" }}
                onDoubleClick={(e) => { e.stopPropagation(); onTextDblClick?.("subheadline", e.currentTarget); }}
              >
                {design.subheadline}
              </p>
            </div>
          </>
        )}

        {/* ── Store style 2: Spotlight ── */}
        {design.template === "spotlight" && (
          <>
            {/* Radial glow behind device */}
            <div style={{
              position: "absolute",
              left: `${design.deviceX}%`, top: `${design.deviceY}%`,
              transform: "translate(-50%,-50%)",
              width: "95%", aspectRatio: "1/1", borderRadius: "50%",
              background: "radial-gradient(ellipse, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.08) 38%, transparent 68%)",
              pointerEvents: "none",
            }} />
            <div style={{ position: "absolute", top: "5%", left: "8%", right: "8%", textAlign: "center" }}>
              {headlineEl}
            </div>
            {deviceNode}
            <div style={{ position: "absolute", bottom: "5%", left: "10%", right: "10%", textAlign: "center" }}>
              <p style={{ color: design.textColor, opacity: 0.78, fontSize: design.subSize, lineHeight: 1.35, margin: 0, cursor: onTextDblClick ? "text" : "default" }}
                onDoubleClick={(e) => { e.stopPropagation(); onTextDblClick?.("subheadline", e.currentTarget); }}>
                {design.subheadline}
              </p>
            </div>
          </>
        )}

        {/* ── Store style 3: Feature list ── */}
        {design.template === "feature-list" && (
          <>
            {deviceNode}
            <div style={{ position: "absolute", top: "50%", left: "6%", width: "44%", transform: "translateY(-50%)" }}>
              {/* Accent bar */}
              <div style={{ width: 48, height: 5, background: design.textColor, opacity: 0.55, borderRadius: 3, marginBottom: 28 }} />
              {headlineEl}
              <p style={{ color: design.textColor, opacity: 0.75, fontSize: design.subSize, marginTop: 20, lineHeight: 1.4, cursor: onTextDblClick ? "text" : "default" }}
                onDoubleClick={(e) => { e.stopPropagation(); onTextDblClick?.("subheadline", e.currentTarget); }}>
                {design.subheadline}
              </p>
              {/* Decorative feature rows */}
              <div style={{ marginTop: 44, display: "flex", flexDirection: "column", gap: 24 }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: design.textColor, opacity: 0.60, flexShrink: 0 }} />
                    <div style={{ height: 4, background: design.textColor, opacity: 0.18, borderRadius: 2, flex: 1 }} />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── Store style 4: Band ── */}
        {design.template === "band" && (
          <>
            {/* Dark band at top */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "40%", background: "rgba(0,0,0,0.30)" }} />
            <div style={{ position: "absolute", top: "5%", left: "8%", right: "8%", textAlign: "center", zIndex: 1 }}>
              {headlineEl}
            </div>
            {deviceNode}
            <div style={{ position: "absolute", bottom: "5%", left: "10%", right: "10%", textAlign: "center", zIndex: 1 }}>
              <p style={{ color: design.textColor, opacity: 0.78, fontSize: design.subSize, lineHeight: 1.35, margin: 0, cursor: onTextDblClick ? "text" : "default" }}
                onDoubleClick={(e) => { e.stopPropagation(); onTextDblClick?.("subheadline", e.currentTarget); }}>
                {design.subheadline}
              </p>
            </div>
          </>
        )}

        {/* ── Store style 5: Dark glow ── */}
        {design.template === "dark-glow" && (
          <>
            {/* Dark overlay over background */}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(170deg,rgba(0,0,0,0.52) 0%,rgba(0,0,0,0.70) 100%)" }} />
            {/* Radial glow centred on device */}
            <div style={{
              position: "absolute",
              left: `${design.deviceX}%`, top: `${design.deviceY}%`,
              transform: "translate(-50%,-50%)",
              width: deviceWidthPx * 1.22, height: deviceWidthPx * 1.22,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 58%)",
              pointerEvents: "none",
            }} />
            {deviceNode}
            {/* Gradient scrim + text at bottom */}
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              paddingTop: "18%", paddingBottom: "7%", paddingLeft: "8%", paddingRight: "8%",
              background: "linear-gradient(to top, rgba(0,0,0,0.78) 0%, transparent 100%)",
              textAlign: "center", zIndex: 2,
            }}>
              {headlineEl}
              <p style={{ color: design.textColor, opacity: 0.78, fontSize: design.subSize, marginTop: 20, lineHeight: 1.35, cursor: onTextDblClick ? "text" : "default" }}
                onDoubleClick={(e) => { e.stopPropagation(); onTextDblClick?.("subheadline", e.currentTarget); }}>
                {design.subheadline}
              </p>
            </div>
          </>
        )}

        {/* ── Store style 6: Pill badge ── */}
        {design.template === "pill-badge" && (
          <>
            {deviceNode}
            {/* Frosted-glass pill at top */}
            <div style={{
              position: "absolute", top: "6%", left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(255,255,255,0.16)",
              border: "1.5px solid rgba(255,255,255,0.38)",
              borderRadius: 999,
              padding: "20px 60px",
              textAlign: "center",
              zIndex: 2,
              maxWidth: "80%",
            }}>
              <p style={{ color: design.textColor, fontSize: design.subSize * 0.85, fontWeight: 600, margin: 0, cursor: onTextDblClick ? "text" : "default" }}
                onDoubleClick={(e) => { e.stopPropagation(); onTextDblClick?.("subheadline", e.currentTarget); }}>
                {design.subheadline}
              </p>
            </div>
            {/* Big headline at bottom */}
            <div style={{ position: "absolute", bottom: "6%", left: "8%", right: "8%", textAlign: "center", zIndex: 2 }}>
              {headlineEl}
            </div>
          </>
        )}

        {/* Custom text layers — rendered on top */}
        {customTexts.map((ct) => (
          <div
            key={ct.id}
            onPointerDown={(e) => onCtDown(e, ct)}
            onPointerMove={onCtMove}
            onPointerUp={onCtUp}
            onPointerCancel={onCtUp}
            onDoubleClick={(e) => { e.stopPropagation(); onCustomTextDblClick?.(ct.id, e.currentTarget); }}
            style={{
              position: "absolute",
              left: `${ct.x}%`,
              top: `${ct.y}%`,
              transform: "translate(-50%, -50%)",
              color: ct.color,
              fontSize: ct.size,
              fontWeight: ct.bold ? 700 : 400,
              textAlign: ct.align,
              cursor: onCustomTextMove ? "move" : "default",
              userSelect: "none",
              whiteSpace: "pre-wrap",
              maxWidth: "85%",
              touchAction: "none",
              zIndex: 5,
            }}
          >
            {ct.content}
          </div>
        ))}
      </div>
    );
  }
);

Canvas.displayName = "Canvas";
