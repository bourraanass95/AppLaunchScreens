import { toJpeg, toPng } from "html-to-image";
import JSZip from "jszip";

export type ExportFormat = "png" | "jpeg";

export interface ExportItem {
  id: string;
  filename: string;
  node: HTMLElement;
}

export interface ExportOptions {
  width: number;
  height: number;
  format?: ExportFormat;
  pixelRatio?: number;
  /** JPEG quality 0–1 (ignored for PNG) */
  quality?: number;
  /** Called once per screen as `(done, total, filename)`. */
  onProgress?: (done: number, total: number, current: string) => void;
}

const DEFAULTS = {
  format: "png" as ExportFormat,
  pixelRatio: 2,
  quality: 0.95,
};

/** Wait for fonts + a paint tick so the canvas is ready before capture. */
async function waitForRender() {
  if (typeof document !== "undefined" && "fonts" in document) {
    try { await document.fonts.ready; } catch { /* noop */ }
  }
  await new Promise<void>((r) =>
    typeof requestAnimationFrame !== "undefined"
      ? requestAnimationFrame(() => requestAnimationFrame(() => r()))
      : setTimeout(r, 16),
  );
}

async function captureNode(
  node: HTMLElement,
  width: number,
  height: number,
  format: ExportFormat,
  pixelRatio: number,
  quality: number,
): Promise<string> {
  const opts = { width, height, pixelRatio, cacheBust: true } as const;
  if (format === "jpeg") {
    return toJpeg(node, { ...opts, quality, backgroundColor: "#000" });
  }
  return toPng(node, opts);
}

function dataUrlToBase64(dataUrl: string): string {
  return dataUrl.replace(/^data:[^;]+;base64,/, "");
}

function triggerDownload(filename: string, href: string) {
  const a = document.createElement("a");
  a.download = filename;
  a.href = href;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Export a single node as a download. */
export async function exportOne(item: ExportItem, options: ExportOptions): Promise<void> {
  const o = { ...DEFAULTS, ...options };
  await waitForRender();
  const dataUrl = await captureNode(item.node, o.width, o.height, o.format, o.pixelRatio, o.quality);
  options.onProgress?.(1, 1, item.filename);
  triggerDownload(`${item.filename}.${o.format === "jpeg" ? "jpg" : "png"}`, dataUrl);
}

/** Export many nodes as a ZIP. Captures serially to avoid main-thread starvation. */
export async function exportZip(
  items: ExportItem[],
  zipName: string,
  options: ExportOptions,
): Promise<void> {
  const o = { ...DEFAULTS, ...options };
  if (items.length === 0) return;

  await waitForRender();
  const zip = new JSZip();
  const ext = o.format === "jpeg" ? "jpg" : "png";

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const dataUrl = await captureNode(item.node, o.width, o.height, o.format, o.pixelRatio, o.quality);
    zip.file(`${item.filename}.${ext}`, dataUrlToBase64(dataUrl), { base64: true });
    options.onProgress?.(i + 1, items.length, item.filename);
    /* Yield so the UI can paint progress between heavy captures. */
    await new Promise((r) => setTimeout(r, 0));
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  triggerDownload(`${zipName}.zip`, url);
  /* Revoke after the click has been dispatched. */
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
