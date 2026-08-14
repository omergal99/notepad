/**
 * Shared rules for dragging a window inside its container.
 * The window position is stored relative to the windows container,
 * so the container bounds are the real source of truth.
 */

export function getWindowDragBounds({
    x,
    y,
    width,
    height,
    titleBarHeight = 40,
    containerEl = null,
    viewport = null
}) {
    const view = viewport || { width: typeof window !== 'undefined' ? window.innerWidth : 1200, height: typeof window !== 'undefined' ? window.innerHeight : 800 };
    const container = containerEl || (typeof document !== 'undefined' ? document.querySelector('#windows-container') : null);
    const containerWidth = container ? (container.clientWidth || container.getBoundingClientRect().width || view.width) : view.width;
    const containerHeight = container ? (container.clientHeight || container.getBoundingClientRect().height || view.height) : view.height;

    const minX = -(width / 2);
    const maxX = Math.max(minX, containerWidth - (width / 2));
    const minY = 0;
    const maxY = Math.max(minY, containerHeight - titleBarHeight);

    return {
        minX,
        maxX,
        minY,
        maxY,
        x: Math.min(Math.max(Number(x) || 0, minX), maxX),
        y: Math.min(Math.max(Number(y) || 0, minY), maxY)
    };
}

export function clampWindowPosition(position) {
    return getWindowDragBounds(position);
}
