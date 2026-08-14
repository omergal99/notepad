export const DEFAULT_EDITOR_FONT_SIZE = 14;
export const MIN_ZOOM_PERCENT = 25;
export const MAX_ZOOM_PERCENT = 500;

export function clampZoomPercent(percent) {
    const parsed = Number(percent);
    if (!Number.isFinite(parsed)) return 100;
    return Math.min(Math.max(parsed, MIN_ZOOM_PERCENT), MAX_ZOOM_PERCENT);
}

export function getZoomPercent(fontSize, baseSize = DEFAULT_EDITOR_FONT_SIZE) {
    const value = Number(fontSize);
    if (!Number.isFinite(value) || value <= 0) return 100;
    return Math.round((value / baseSize) * 100);
}

export function getFontSizeFromPercent(percent, baseSize = DEFAULT_EDITOR_FONT_SIZE) {
    const zoomPercent = clampZoomPercent(percent);
    return Number((baseSize * (zoomPercent / 100)).toFixed(2));
}

export function getRelativeZoomPercent(currentPercent, deltaPercent = 10) {
    return clampZoomPercent((Number(currentPercent) || 100) + Number(deltaPercent || 0));
}
