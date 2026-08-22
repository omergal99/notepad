/**
 * Shared rules for dragging a window inside its container.
 * The window position is stored relative to the windows container,
 * so the container bounds are the real source of truth.
 *
 * Top: windows may be dragged OVER the global top menu — the upper
 * limit is the browser screen itself (window top edge can reach y=0
 * of the viewport).
 * Bottom: windows stay inside the container, which ends above the
 * bottom dock, so the dock always remains visible for navigation.
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
    const containerRect = container && typeof container.getBoundingClientRect === 'function' ? container.getBoundingClientRect() : null;
    const containerWidth = containerRect ? containerRect.width : (container ? (container.clientWidth || view.width) : view.width);
    const containerHeight = containerRect ? containerRect.height : (container ? (container.clientHeight || view.height) : view.height);
    // Distance between the browser screen top and the windows container top.
    const containerTop = containerRect ? Math.max(0, containerRect.top) : 0;

    const minX = -(width / 2);
    const maxX = Math.max(minX, containerWidth - (width / 2));
    // Negative min Y lets a window slide up over the top menu until its
    // title bar reaches the very top of the browser screen.
    const minY = -containerTop;
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
