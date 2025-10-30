// Fixed LinkedListTracer.js with connection update support + flow-to-baseline & wrap
import { cloneDeepWith } from 'lodash'

import Tracer from '../common/Tracer.jsx';
import ListNode from "./ListNode";

/**
 * LinkedListTracer
 * - Maintains a linked list model (nodes map + head/tail/next pointers).
 * - Exposes helper methods to mutate state (select, patch, fade, hide, etc.).
 * - Calls super.set() after any mutation to trigger a re-render.
 * - Renders via LinkedListRenderer (Graph-based).
 */
class LinkedListTracer extends Tracer {
  // Provide the renderer class used by this tracer
  getRendererClass() {
    // Lazy-load to break circular dependency with GraphRenderer/Renderer chain
    // Webpack 会把 .default 作为 ESM default export 暴露
    const mod = require('./LinkedListRenderer');
    return mod.default || mod;
  } 

  // Initialize runtime state and default layout
  init() {
    super.init();
    this.nodes = new Map();                  // key => ListNode
    this.headKey = null;                     // key of head node
    this.tailKey = null;                     // key of tail node
    this.motionOn = true;                    // toggle motion animations
    
    // Layout parameters (Pointer-like baseline & spacing)
    this.layout = {
      direction: 'horizontal',
      gap: 64,                               // 节点间固定间距（与渲染器保持一致）
      start: { x: 120, y: 96 },              // 初始起点（留出安全边距）
      nodeW: 112,                            // 节点可视宽（56 * 2，对应 scale=2）
      baselineY: 96,                         // 基线 Y
      rowWidth: 920,                         // 自动换行时的一行可用宽度
      rowGap: 56,                            // 行距
    };

    this.algo = undefined;
    this.listOfNumbers = '';
    this.indexToKey = new Map();             // Map(1-based index => node key)
  }

  /**
   * Build the list from an array of values.
   * Also fills indexToKey for 1-based indexing.
   */
  set(list = [], algo) {
    this.algo = algo;
    this.nodes.clear();
    this.indexToKey.clear();
    let prevKey = null;

    list.forEach((v, i) => {
      const k = `n${i}_${Date.now()}`;       // unique-ish key
      const node = new ListNode(v, k);

      // 按 Pointer 风格从起点开始横向排布，不再额外 +200 偏移
      node.pos.x = this.layout.start.x + i * this.layout.gap;
      node.pos.y = this.layout.start.y;

      if (prevKey) {
        this.nodes.get(prevKey).nextKey = k; // link previous to this
      }
      this.nodes.set(k, node);
      this.indexToKey.set(i + 1, k);         // 1-based index mapping
      prevKey = k;
    });
    this.headKey = list.length ? [...this.nodes.keys()][0] : null;
    this.tailKey = list.length ? [...this.nodes.keys()][list.length - 1] : null;

    super.set();                              // trigger render
  }

  /**
   * Update next pointers using a "tailsArray":
   * - tailsArray[index] gives the 1-based index of the next node
   * - 'Null' or null means no next
   */
  updateConnections(tailsArray) {
    for (const [index, key] of this.indexToKey.entries()) {
      const node = this.nodes.get(key);
      if (node) {
        const nextIndex = tailsArray[index];
        if (nextIndex === 'Null' || nextIndex === null) {
          node.nextKey = null;
        } else {
          const nextKey = this.indexToKey.get(nextIndex);
          node.nextKey = nextKey || null;
        }
      }
    }
    super.set();
  }

  /** Update a node's value by its 1-based index. */
  updateValueByIndex(index, value) {
    const key = this.indexToKey.get(index);
    if (key) {
      const node = this.nodes.get(key);
      if (node) {
        node.value = value;
        super.set();
      }
    }
  }

  // === fillVariant 系列（保持不变） ===
  setFillVariantByIndex(index, variant = 'gray') {
    const key = this.indexToKey.get(index);
    if (!key) return;
    const n = this.nodes.get(key);
    if (!n) return;
    n.fillVariant = variant;
    super.set();
  }

  setFillVariantByKey(key, variant = 'gray') {
    const n = this.nodes.get(key);
    if (!n) return;
    n.fillVariant = variant;
    super.set();
  }

  clearAllFillVariants() {
    for (const n of this.nodes.values()) n.fillVariant = 'gray';
    super.set();
  }

  colorChainByVariant(startIndex, variant, tailsArray) {
    if (startIndex === 'Null' || startIndex == null) return;
    for (let i = startIndex; i !== 'Null'; i = tailsArray[i]) {
      const k = this.indexToKey.get(i);
      if (!k) break;
      const n = this.nodes.get(k);
      if (!n) break;
      n.fillVariant = variant;
    }
    super.set();
  }

  assignVariableByIndex(varName, index) {
    for (const node of this.nodes.values()) {
      node.variables = node.variables.filter(x => x !== varName);
    }
    if (index && index !== 'Null') {
      const key = this.indexToKey.get(index);
      if (key) {
        this.nodes.get(key)?.variables.push(varName);
      }
    }
    super.set();
  }

  /** Selection helpers using 1-based indices. */
  selectByIndex(index, color = '0') {
    const key = this.indexToKey.get(index);
    if (key) this.selectByKey(key, color);
  }
  deselectByIndex(index) {
    const key = this.indexToKey.get(index);
    if (key) this.deselectByKey(key);
  }

  // ---- Selection helpers by key ----
  selectByKey(k, c = '0') { this._mark(k, c, true); }
  deselectByKey(k) { this._clearSelect(k); }

  // Patch helpers
  patchByKey(k, v = this.nodes.get(k)?.value) {
    const n = this.nodes.get(k);
    if (!n) return;
    n.value = v;
    n.patched++;
    super.set();
  }
  depatchByKey(k, v = this.nodes.get(k)?.value) {
    const n = this.nodes.get(k);
    if (!n) return;
    n.patched = Math.max(0, n.patched - 1);
    n.value = v;
    super.set();
  }

  // Visual emphasis helpers
  fadeOutByKey(k) {
    const n = this.nodes.get(k);
    if (n) { n.faded = true; super.set(); }
  }
  fadeInByKey(k) {
    const n = this.nodes.get(k);
    if (n) { n.faded = false; super.set(); }
  }

  // Mark a node as sorted (final)
  sortedByKey(k) {
    const n = this.nodes.get(k);
    if (n) { n.sorted = true; super.set(); }
  }

  // Visibility toggles
  hideByKey(k) {
    const n = this.nodes.get(k);
    if (n) { n.hidden = true; super.set(); }
  }
  showByKey(k) {
    const n = this.nodes.get(k);
    if (n) { n.hidden = false; super.set(); }
  }

  /** Hide a chain starting at startKey. */
  hideFromNode(startKey) {
    let current = startKey;
    while (current !== null && current !== 'Null') {
      const node = this.nodes.get(current);
      if (!node) break;
      node.hidden = true;
      current = node.nextKey;
    }
    super.set();
  }

  /** Show a chain starting at startKey. */
  showFromNode(startKey) {
    let current = startKey;
    while (current !== null && current !== 'Null') {
      const node = this.nodes.get(current);
      if (!node) break;
      node.hidden = false;
      current = node.nextKey;
    }
    super.set();
  }

  // Batch visibility
  hideRange(keys) {
    keys.forEach(k => { const n = this.nodes.get(k); if (n) n.hidden = true; });
    super.set();
  }
  showRange(keys) {
    keys.forEach(k => { const n = this.nodes.get(k); if (n) n.hidden = false; });
    super.set();
  }
  hideExcept(keepKeys) {
    for (const [key, node] of this.nodes.entries()) node.hidden = !keepKeys.includes(key);
    super.set();
  }
  showAll() {
    for (const node of this.nodes.values()) { node.hidden = false; node.faded = false; }
    super.set();
  }

  // Batch emphasis toggles
  fadeRange(keys) {
    keys.forEach(k => { const n = this.nodes.get(k); if (n) n.faded = true; });
    super.set();
  }
  unfadeRange(keys) {
    keys.forEach(k => { const n = this.nodes.get(k); if (n) n.faded = false; });
    super.set();
  }

  /** Unique variable label at a given key. */
  assignVariableAtKey(v, k) {
    for (const node of this.nodes.values()) {
      node.variables = node.variables.filter(x => x !== v);
    }
    if (k) this.nodes.get(k)?.variables.push(v);
    super.set();
  }

  /** Remove all variable labels. */
  clearVariables() {
    for (const n of this.nodes.values()) n.variables = [];
    super.set();
  }

  /** Insert a node after a given key. */
  insertAfter(afterKey, value, newKey = `n_${Date.now()}`) {
    const newNode = new ListNode(value, newKey);
    const after = this.nodes.get(afterKey);
    newNode.pos.x = (after?.pos.x ?? this.layout.start.x) + this.layout.gap;
    newNode.pos.y = (after?.pos.y ?? this.layout.start.y);
    newNode.nextKey = after?.nextKey ?? null;
    if (after) after.nextKey = newKey;
    if (this.tailKey === afterKey) this.tailKey = newKey;
    this.nodes.set(newKey, newNode);
    super.set();
  }

  /** Delete the node immediately after prevKey. */
  deleteAfter(prevKey) {
    const prev = this.nodes.get(prevKey);
    if (!prev || !prev.nextKey) return;
    const delKey = prev.nextKey;
    const delNode = this.nodes.get(delKey);
    prev.nextKey = delNode?.nextKey ?? null;
    if (this.tailKey === delKey) this.tailKey = prevKey;
    this.nodes.delete(delKey);
    super.set();
  }

  /** Set a new head (by key). */
  rehead(newHeadKey) {
    this.headKey = newHeadKey ?? null;
    super.set();
  }

  /** Move a node to absolute (x, y). */
  moveNodeTo(k, x, y) {
    const n = this.nodes.get(k);
    if (!n) return;
    n.pos = { x, y };
    super.set();
  }

  // Toggle motion
  setMotion(b = true) { this.motionOn = b; }

  // Merge layout props
  setLayout(layout) {
    this.layout = { ...this.layout, ...layout };
    super.set();
  }

  // Save a human-readable snapshot
  setList(arr) { this.listOfNumbers = arr ? arr.join(', ') : undefined; }

  /**
   * Normalize visible nodes back to baseline with wrapping.
   */
  normalizeToBaselineAndWrap(opts = {}) {
    const {
      baselineY = (this.layout.baselineY ?? this.layout.start.y),
      rowWidth = this.layout.rowWidth,
      gap = this.layout.gap,
      rowGap = this.layout.rowGap,
      keepOrder = true,
      startX = this.layout.start.x,
      nodeW = this.layout.nodeW,
    } = opts;

    const arr = [...this.nodes.values()].filter(n => !n.hidden);
    if (arr.length === 0) { super.set(); return; }

    const ordered = keepOrder ? arr.sort((a, b) => a.pos.x - b.pos.x) : arr;

    let x = startX;
    let y = baselineY;
    const maxRowRight = startX + Math.max(rowWidth, nodeW);

    ordered.forEach((n, idx) => {
      if (idx > 0 && (x + nodeW) > maxRowRight) { x = startX; y += rowGap; }
      n.pos = { x, y };
      x += gap;
    });

    super.set();
  }

  _mark(k, c, on) {
    const n = this.nodes.get(k);
    if (!n) return;
    const color = Number(c);
    if (on) {
      if (color === 0) n.selected++;
      else if (color >= 1 && color <= 5) n[`selected${color}`] = true;
      else n.selected = 1;
    } else {
      n.selected = 0;
      for (let i = 1; i <= 5; i++) n[`selected${i}`] = false;
    }
    super.set();
  }

  _clearSelect(k) {
    const n = this.nodes.get(k);
    if (!n) return;
    n.selected = 0;
    for (let i = 1; i <= 5; i++) n[`selected${i}`] = false;
    n.sorted = false;
    super.set();
  }

  // --------------------------- Linked List APIs (保持不变) ---------------------------
  resetColors() { this.clearAllFillVariants(); }

  colorChain(startIndex, variant = 'gray', tailsArray = []) {
    if (!startIndex || startIndex === 'Null') return;
    this.colorChainByVariant(startIndex, variant, tailsArray);
  }

  colorMerged(M, E, tailsArray = []) {
    if (!M || M === 'Null') return;
    const T = tailsArray;
    for (let i = M; i !== 'Null'; i = T[i]) {
      this.setFillVariantByIndex(i, 'green');
      if (i === E) break;
    }
  }

  highlightHeads(Lidx, Ridx) {
    if (Lidx && Lidx !== 'Null') this.setFillVariantByIndex(Lidx, 'red');
    if (Ridx && Ridx !== 'Null') this.setFillVariantByIndex(Ridx, 'red');
  }

  hideAll() {
    for (const key of this.nodes.keys()) this.hideByKey(key);
  }

  hideChain(startIndex, tailsArray = []) {
    if (!startIndex || startIndex === 'Null') return;
    const T = tailsArray;
    for (let i = startIndex; i !== 'Null'; i = T[i]) {
      const key = this.indexToKey.get(i);
      if (key) this.hideByKey(key);
    }
  }

  showChain(startIndex, tailsArray = []) {
    if (!startIndex || startIndex === 'Null') return;
    const T = tailsArray;
    for (let i = startIndex; i !== 'Null'; i = T[i]) {
      const key = this.indexToKey.get(i);
      if (key) this.showByKey(key);
    }
  }

  moveChainBelow(leftStart, rightStart, tailsArray = [], verticalGap = 60) {
    if (!rightStart || rightStart === 'Null') return;
    const T = tailsArray;
    const leftKey = this.indexToKey.get(leftStart);
    const firstLeft = this.nodes.get(leftKey);
    const startX = firstLeft ? firstLeft.pos.x : 0;
    const startY = firstLeft ? firstLeft.pos.y + verticalGap : verticalGap;
    let xOffset = 0;

    for (let i = rightStart; i !== 'Null'; i = T[i]) {
      const key = this.indexToKey.get(i);
      if (key) {
        this.moveNodeTo(key, startX + xOffset, startY);
        xOffset += this.layout.gap;
      }
    }
  }

  repositionMergedChain(startIndex, tailsArray = [], gap = 65) {
    if (!startIndex || startIndex === 'Null') return;
    const T = tailsArray;
    const merged = [];
    for (let i = startIndex; i !== 'Null'; i = T[i]) {
      const key = this.indexToKey.get(i);
      if (key) merged.push({ key, node: this.nodes.get(key) });
    }
    if (!merged.length) return;

    const leftmostX = Math.min(...merged.map(n => n.node.pos.x));
    const avgY = merged.reduce((s, n) => s + n.node.pos.y, 0) / merged.length;

    merged.forEach((item, idx) => {
      this.moveNodeTo(item.key, leftmostX + idx * gap, avgY);
    });
  }
}

export default LinkedListTracer;
