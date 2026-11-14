/*
 * PDF X-Axis Lock 1.0.7 — Zotero 10.0.x
 *
 * Toolbar injection intentionally preserves the working 1.0.4 implementation.
 * Locking is based on a wrapper around #viewer using the exact layout approach
 * validated in the user's Zotero 10.0.8 reader:
 *   overflow-x: clip; overflow-y: visible
 *   viewer transform: translateX(-anchorX)
 *   viewerContainer.scrollLeft = 0
 *
 * This removes the horizontal scroll range instead of correcting scrollLeft
 * after scroll events, avoiding the 1.0.4 snap-back/jitter behaviour.
 */

const ADDON_ID = "pdf-x-axis-lock@chatgpt.local";
const BUTTON_ID = "pdf-x-axis-lock-toolbar-button";
const CLIPPER_ID = "pdf-x-axis-lock-clipper";
const statesByReader = new WeakMap();
const activeStates = new Set();

function log(message) {
  try {
    Zotero.debug(`PDF X-Axis Lock 1.0.7: ${message}`);
  } catch (_) {}
}

function getPDFWindow(reader) {
  try {
    return reader?._primaryView?._iframeWindow
      || reader?._lastView?._iframeWindow
      || reader?._internalReader?._primaryView?._iframeWindow
      || null;
  } catch (e) {
    log(`getPDFWindow failed: ${e}`);
    return null;
  }
}

function getReaderParts(reader) {
  const win = getPDFWindow(reader);
  const doc = win?.document;
  if (!doc) return null;

  const container = doc.getElementById("viewerContainer")
    || doc.querySelector("#viewerContainer")
    || doc.querySelector(".pdfViewer")?.parentElement
    || null;
  const viewer = doc.getElementById("viewer");

  if (!container || !viewer) return null;
  return { win, doc, container, viewer };
}

function setButtonState(state) {
  const button = state.button;
  if (!button) return;

  button.textContent = state.locked ? "X 已锁定" : "锁定 X";
  button.title = state.locked
    ? "水平位置已冻结。点击解除；纵向滚动和 PDF 原生文字选择仍可使用。"
    : "冻结当前水平位置；纵向滚动和 PDF 原生文字选择仍可使用。";
  button.setAttribute("aria-pressed", state.locked ? "true" : "false");
  button.dataset.locked = state.locked ? "true" : "false";
  button.style.setProperty("min-width", "64px");
  button.style.setProperty("padding-inline", "8px");
  button.style.setProperty("white-space", "nowrap");
  button.style.setProperty("font-size", "12px");
  button.style.setProperty("opacity", "1");
}

function restoreViewerTransform(state) {
  const viewer = state.viewer;
  if (!viewer?.style) return;

  try {
    if (state.originalTransformValue) {
      viewer.style.setProperty(
        "transform",
        state.originalTransformValue,
        state.originalTransformPriority || ""
      );
    } else {
      viewer.style.removeProperty("transform");
    }
  } catch (e) {
    log(`restore transform warning: ${e}`);
  }
}

function unwrapViewer(state, restoreHorizontalPosition) {
  const container = state.container;
  const viewer = state.viewer;
  const clipper = state.clipper;

  try {
    // Restore only the transform property we changed. This deliberately keeps
    // other PDF.js inline changes (for example --scale-factor) intact.
    restoreViewerTransform(state);

    if (container && viewer && clipper && clipper.parentNode === container) {
      if (viewer.parentNode === clipper) {
        container.insertBefore(viewer, clipper);
      }
      clipper.remove();
    } else if (clipper?.parentNode) {
      // Defensive cleanup if PDF.js moved the viewer while the lock was on.
      if (viewer && viewer.parentNode === clipper && container) {
        container.appendChild(viewer);
      }
      clipper.remove();
    }

    if (restoreHorizontalPosition && container) {
      container.scrollLeft = Number.isFinite(state.anchorX) ? state.anchorX : 0;
    }
  } catch (e) {
    log(`unwrapViewer failed: ${e && e.stack ? e.stack : e}`);
  }
}

function disableLock(state) {
  if (!state) return;

  try {
    if (state.pdfDocument && state.onWheel) {
      state.pdfDocument.removeEventListener("wheel", state.onWheel, true);
    }
  } catch (e) {
    log(`wheel listener cleanup warning: ${e}`);
  }

  if (state.clipper || state.viewer) {
    unwrapViewer(state, true);
  }

  state.locked = false;
  state.container = null;
  state.pdfDocument = null;
  state.viewer = null;
  state.clipper = null;
  state.anchorX = 0;
  state.originalTransformValue = "";
  state.originalTransformPriority = "";
  state.onWheel = null;
  setButtonState(state);
}

function enableLock(state) {
  const parts = getReaderParts(state.reader);
  if (!parts) {
    const message = "尚未找到 PDF 页面或滚动容器 (#viewer / #viewerContainer)";
    log(`cannot lock: ${message}`);
    if (state.button) state.button.title = `${message}。请关闭并重新打开 PDF 后再试。`;
    return;
  }

  const { win, doc, container, viewer } = parts;
  if (viewer.parentElement !== container) {
    const message = "PDF 页面当前不在预期容器中，未应用锁定";
    log(`cannot lock: viewer parent is ${viewer.parentElement?.id || viewer.parentElement?.className || "unknown"}`);
    if (state.button) state.button.title = `${message}。请重新打开 PDF 后再试。`;
    return;
  }

  const existingClipper = doc.getElementById(CLIPPER_ID);
  if (existingClipper) {
    log("cannot lock: stale clipper already exists");
    if (state.button) state.button.title = "检测到残留锁定容器，请关闭并重新打开 PDF 后再试。";
    return;
  }

  const anchorX = container.scrollLeft;
  const originalTransformValue = viewer.style.getPropertyValue("transform");
  const originalTransformPriority = viewer.style.getPropertyPriority("transform");

  const clipper = doc.createElement("div");
  clipper.id = CLIPPER_ID;
  clipper.setAttribute("data-pdf-x-axis-lock", ADDON_ID);
  Object.assign(clipper.style, {
    display: "block",
    position: "relative",
    width: "100%",
    minWidth: "0",
    boxSizing: "border-box",
    overflowX: "clip",
    overflowY: "visible"
  });

  // Save state before mutating the PDF.js DOM so rollback can be performed
  // even if a layout verification fails halfway through.
  state.container = container;
  state.pdfDocument = doc;
  state.viewer = viewer;
  state.clipper = clipper;
  state.anchorX = anchorX;
  state.originalTransformValue = originalTransformValue;
  state.originalTransformPriority = originalTransformPriority;

  try {
    container.insertBefore(clipper, viewer);
    clipper.appendChild(viewer);

    // This is the tested operation: keep the current visual page offset while
    // moving the container's horizontal scroll position to zero.
    viewer.style.setProperty(
      "transform",
      `translateX(${-anchorX}px)`,
      "important"
    );
    container.scrollLeft = 0;

    // Force layout once, then verify that no horizontal scroll range remains.
    void container.offsetWidth;
    const horizontalRange = container.scrollWidth - container.clientWidth;
    if (Math.abs(container.scrollLeft) > 0.5 || horizontalRange > 1) {
      throw new Error(
        `horizontal clip verification failed (scrollLeft=${container.scrollLeft}, range=${horizontalRange})`
      );
    }

    state.onWheel = event => {
      if (!state.locked || !state.container) return;
      const target = event.target;
      if (target && !state.container.contains(target)) return;

      const horizontalGesture = event.shiftKey
        || (Math.abs(event.deltaX) > 0.01
          && Math.abs(event.deltaX) >= Math.abs(event.deltaY));
      if (horizontalGesture && event.cancelable) event.preventDefault();
    };

    doc.addEventListener("wheel", state.onWheel, {
      capture: true,
      passive: false
    });

    state.locked = true;
    setButtonState(state);
    log(`locked with clip wrapper at original X=${anchorX}; scrollWidth=${container.scrollWidth}; clientWidth=${container.clientWidth}`);
  } catch (e) {
    log(`lock failed; rolling back: ${e && e.stack ? e.stack : e}`);
    try {
      if (state.pdfDocument && state.onWheel) {
        state.pdfDocument.removeEventListener("wheel", state.onWheel, true);
      }
    } catch (_) {}
    state.locked = false;
    unwrapViewer(state, true);
    state.container = null;
    state.pdfDocument = null;
    state.viewer = null;
    state.clipper = null;
    state.anchorX = 0;
    state.originalTransformValue = "";
    state.originalTransformPriority = "";
    state.onWheel = null;
    setButtonState(state);
    if (state.button) {
      state.button.title = `锁定失败：${e.message || e}。已恢复原始页面布局。`;
    }
  }
}

function toggleLock(state) {
  if (state.locked) {
    disableLock(state);
    log("horizontal lock released; original layout restored");
  } else {
    enableLock(state);
  }
}

function createState(reader) {
  const state = {
    reader,
    button: null,
    container: null,
    pdfDocument: null,
    viewer: null,
    clipper: null,
    anchorX: 0,
    originalTransformValue: "",
    originalTransformPriority: "",
    locked: false,
    onWheel: null
  };
  statesByReader.set(reader, state);
  activeStates.add(state);

  // Clean up when the reader shell is closed.
  const shellWindow = reader?._iframeWindow,
  if (shellWindow && typeof shellWindow.addEventListener === "function") {
    shellWindow.addEventListener("unload", () => {
      disableLock(state);
      activeStates.delete(state);
      statesByReader.delete(reader);
    }, { once: true });
  }
  return state;
}

function onRenderToolbar(event) {
  try {
    const { reader, doc, append } = event || {};
    if (!reader || reader.type !== "pdf" || !doc || typeof append !== "function") return;

    let state = statesByReader.get(reader);
    if (!state) state = createState(reader);

    const existing = doc.getElementById(BUTTON_ID);
    if (existing) {
      state.button = existing;
      setButtonState(state);
      return;
    }

    const button = doc.createElement("button");
    button.id = BUTTON_ID;
    button.type = "button";
    // Preserve the working 1.0.4 toolbar injection and styling.
    button.classList.add("toolbar-button", "pdf-x-axis-lock-toolbar-button");
    button.setAttribute("tabindex", "-1");
    button.textContent = "锁定 X";
    button.style.setProperty("min-width", "64px");
    button.style.setProperty("padding-inline", "8px");
    button.style.setProperty("white-space", "nowrap");
    button.style.setProperty("font-size", "12px");
    button.style.setProperty("opacity", "1");

    state.button = button;
    setButtonState(state);

    button.addEventListener("click", clickEvent => {
      clickEvent.preventDefault();
      clickEvent.stopPropagation();
      toggleLock(state);
    });

    // This is the exact working 1.0.4 append pattern.
    append(button);
    log("toolbar button appended");
  } catch (e) {
    log(`renderToolbar failed: ${e && e.stack ? e.stack : e}`);
    try { Zotero.logError(e); } catch (_) {}
  }
}

function startup() {
  if (!Zotero.Reader || typeof Zotero.Reader.registerEventListener !== "function") {
    log("Zotero.Reader API unavailable");
    return;
  }
  Zotero.Reader.registerEventListener("renderToolbar", onRenderToolbar, ADDON_ID);
  log("started; renderToolbar listener registered");
}

function shutdown() {
  try {
    if (Zotero.Reader && typeof Zotero.Reader.unregisterEventListener === "function") {
      Zotero.Reader.unregisterEventListener("renderToolbar", onRenderToolbar);
    }
  } catch (_) {}
  for (const state of Array.from(activeStates)) {
    disableLock(state);
    activeStates.delete(state);
  }
  log("shutdown");
}

function install() { log("installed"); }
function uninstall() { log("uninstalled"); }