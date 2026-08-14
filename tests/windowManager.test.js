/**
 * WINDOW MANAGER TESTS
 * Validates lifecycle, z-index stacking, minimization, bounds, and snapping.
 */

const viewport = { width: 1200, height: 800 };

global.window = global.window || { innerWidth: viewport.width, innerHeight: viewport.height };

describe('WindowManager', () => {
  test('should create a window with valid default bounds and active focus', async () => {
    const storage = {
      saveWindowState: async (state) => state,
      deleteWindowState: async () => true,
      getAllWindowStates: async () => []
    };

    const { WindowManager } = await import('../js/modules/WindowManager.js');
    const manager = new WindowManager(storage);
    const windowId = await manager.createWindow({ title: 'Alpha' });
    const windowState = manager.getWindow(windowId);

    assert.ok(windowId, 'Expected a generated window ID');
    assert.ok(windowState.title === 'Alpha', 'Expected custom title');
    assert.ok(windowState.width >= 400, 'Expected minimum width');
    assert.ok(windowState.height >= 200, 'Expected minimum height');
    assert.ok(windowState.x >= 0 && windowState.x <= viewport.width - windowState.width, 'Expected x in bounds');
    assert.ok(windowState.y >= 0 && windowState.y <= viewport.height - windowState.height, 'Expected y in bounds');
    assert.strictEqual(manager.activeWindowId, windowId, 'Expected new window to be active');
    assert.ok(manager.zIndexStack.includes(windowId), 'Expected window to be in z-index stack');
  });

  test('should maintain z-index ordering when a window is brought to the front', async () => {
    const storage = {
      saveWindowState: async (state) => state,
      deleteWindowState: async () => true,
      getAllWindowStates: async () => []
    };

    const { WindowManager } = await import('../js/modules/WindowManager.js');
    const manager = new WindowManager(storage);
    const firstId = await manager.createWindow({ title: 'One' });
    const secondId = await manager.createWindow({ title: 'Two' });

    manager.bringToTop(firstId);

    const first = manager.getWindow(firstId);
    const second = manager.getWindow(secondId);

    assert.ok(first.zIndex > second.zIndex, 'Expected first window to move in front of the second');
    assert.strictEqual(manager.activeWindowId, firstId, 'Expected focused window to become active');
  });

  test('should minimize and restore a window correctly', async () => {
    const storage = {
      saveWindowState: async (state) => state,
      deleteWindowState: async () => true,
      getAllWindowStates: async () => []
    };

    const { WindowManager } = await import('../js/modules/WindowManager.js');
    const manager = new WindowManager(storage);
    const windowId = await manager.createWindow({ title: 'Minimize me' });

    await manager.minimizeWindow(windowId);
    assert.ok(manager.getWindow(windowId).isMinimized, 'Expected window to be minimized');
    assert.ok(manager.getMinimizedWindows().includes(windowId), 'Expected minimized window to appear in dock list');

    await manager.restoreWindow(windowId);
    assert.notOk(manager.getWindow(windowId).isMinimized, 'Expected window to be restored');
  });

  test('should clamp position and size within viewport bounds', async () => {
    const storage = {
      saveWindowState: async (state) => state,
      deleteWindowState: async () => true,
      getAllWindowStates: async () => []
    };

    const { WindowManager } = await import('../js/modules/WindowManager.js');
    const manager = new WindowManager(storage);
    const windowId = await manager.createWindow({
      title: 'Bounded',
      x: -500,
      y: -120,
      width: 4000,
      height: 3000
    });
    const windowState = manager.getWindow(windowId);

    assert.ok(windowState.width <= viewport.width, 'Expected width not to exceed viewport width');
    assert.ok(windowState.height <= viewport.height, 'Expected height not to exceed viewport height');
    assert.ok(windowState.x >= -windowState.width / 2, 'Expected x to remain at least half a window left of the viewport');
    assert.ok(windowState.y >= -windowState.height / 2, 'Expected y to remain at least half a window above the viewport');
    assert.ok(windowState.x <= viewport.width - windowState.width / 2, 'Expected x to remain within half-window of the right edge');
    assert.ok(windowState.y <= viewport.height - windowState.height / 2, 'Expected y to remain within half-window of the bottom edge');
  });

  test('should snap a window to the left half of the viewport', async () => {
    const storage = {
      saveWindowState: async (state) => state,
      deleteWindowState: async () => true,
      getAllWindowStates: async () => []
    };

    const { WindowManager } = await import('../js/modules/WindowManager.js');
    const manager = new WindowManager(storage);
    const windowId = await manager.createWindow({ title: 'Left snap' });

    await manager.snapWindow(windowId, 'left');
    const windowState = manager.getWindow(windowId);

    assert.ok(windowState.x === 0, 'Expected left snap to align at the left edge');
    assert.ok(windowState.width === viewport.width / 2, 'Expected left snap width to be half the viewport');
  });

  test('should snap a window to the top-right quadrant', async () => {
    const storage = {
      saveWindowState: async (state) => state,
      deleteWindowState: async () => true,
      getAllWindowStates: async () => []
    };

    const { WindowManager } = await import('../js/modules/WindowManager.js');
    const manager = new WindowManager(storage);
    const windowId = await manager.createWindow({ title: 'Top right' });

    await manager.snapWindow(windowId, 'topRight');
    const windowState = manager.getWindow(windowId);

    assert.ok(windowState.x === viewport.width / 2, 'Expected top-right snap to align to the right half');
    assert.ok(windowState.y === 0, 'Expected top-right snap to align at the top edge');
    assert.ok(windowState.width === viewport.width / 2, 'Expected quadrant width to be half the viewport');
    assert.ok(windowState.height === viewport.height / 2, 'Expected quadrant height to be half the viewport');
  });

  test('should persist window state to storage', async () => {
    const savedStates = [];
    const storage = {
      saveWindowState: async (state) => {
        savedStates.push({ ...state });
        return state.id;
      },
      deleteWindowState: async () => true,
      getAllWindowStates: async () => savedStates
    };

    const { WindowManager } = await import('../js/modules/WindowManager.js');
    const manager = new WindowManager(storage);
    const windowId = await manager.createWindow({ title: 'Persist me' });

    assert.ok(savedStates.length >= 1, 'Expected state to be saved');
    assert.ok(savedStates.some(state => state.id === windowId), 'Expected saved state to include created window');
  });
});
