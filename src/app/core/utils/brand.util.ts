import { jsPDF } from 'jspdf';

/** Preloaded brand logo (data URL + intrinsic dimensions) for jsPDF embedding. */
export interface BrandLogo {
  dataUrl: string;
  width: number;
  height: number;
}

const LOGO_SRC = 'logo.png';

let cachedLogo: BrandLogo | null = null;
let loadPromise: Promise<BrandLogo | null> | null = null;

/**
 * Load the brand logo once and cache it as a data URL. jsPDF's addImage is
 * synchronous, so we preload at app startup and read the cache when building
 * PDFs. Safe to call repeatedly.
 */
export function loadBrandLogo(): Promise<BrandLogo | null> {
  if (cachedLogo) return Promise.resolve(cachedLogo);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<BrandLogo | null>((resolve) => {
    if (typeof document === 'undefined') {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx || !canvas.width || !canvas.height) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        cachedLogo = {
          dataUrl: canvas.toDataURL('image/png'),
          width: canvas.width,
          height: canvas.height,
        };
        resolve(cachedLogo);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = LOGO_SRC;
  });

  return loadPromise;
}

/** Synchronous access to the preloaded logo (null until loaded). */
export function getBrandLogo(): BrandLogo | null {
  return cachedLogo;
}

/**
 * Draw the brand logo on a white card inside the (usually navy) header band.
 * The logo artwork is navy on transparency, so a white backing keeps it legible.
 * No-op until the logo has been preloaded.
 */
export function drawPdfHeaderLogo(
  doc: jsPDF,
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number,
): void {
  const logo = cachedLogo;
  if (!logo) return;
  const ratio = logo.width / logo.height;
  let w = maxWidth;
  let h = w / ratio;
  if (h > maxHeight) {
    h = maxHeight;
    w = h * ratio;
  }
  const pad = 1.5;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x - pad, y - pad, w + pad * 2, h + pad * 2, 1.5, 1.5, 'F');
  doc.addImage(logo.dataUrl, 'PNG', x, y, w, h);
}

/**
 * Stamp a centered, faint logo watermark across every page of the document.
 * Call once just before saving. No-op until the logo has been preloaded.
 */
export function drawPdfWatermark(doc: jsPDF, opacity = 0.06, widthRatio = 0.6): void {
  const logo = cachedLogo;
  if (!logo) return;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const ratio = logo.width / logo.height;
  const w = pageWidth * widthRatio;
  const h = w / ratio;
  const x = (pageWidth - w) / 2;
  const y = (pageHeight - h) / 2;

  const pageCount = doc.getNumberOfPages();
  const GStateCtor = (doc as unknown as { GState?: new (o: { opacity: number }) => unknown }).GState;

  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    let usedGState = false;
    if (GStateCtor) {
      doc.saveGraphicsState();
      (doc as unknown as { setGState: (g: unknown) => void }).setGState(
        new GStateCtor({ opacity }),
      );
      usedGState = true;
    }
    doc.addImage(logo.dataUrl, 'PNG', x, y, w, h);
    if (usedGState) {
      doc.restoreGraphicsState();
    }
  }
}
