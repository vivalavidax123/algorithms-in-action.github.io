import React from 'react';
import { motion } from 'framer-motion';
import GraphRenderer from '../../Graph/GraphRenderer';
import styles from './LinkedListRenderer.module.scss';

/**
 * LinkedListRenderer (Graph-based, Pointer-sized, no layout projection)
 * - 继承 GraphRenderer 使用 SVG + viewBox
 * - 只保留画布平移/缩放；禁止节点拾取/拖动
 * - 去掉 Framer Motion 的 layout 投影，避免点击后节点重叠
 */
class LinkedListRenderer extends GraphRenderer {
  constructor(props) {
    super(props);
    this.axes = false;
    // 避免使用 ?? 语法
    this.zoom = (this.zoom != null) ? this.zoom : 1;
    this.elementRef = React.createRef();
    this.togglePan(true);
    this.toggleZoom(true);

    // 兜底 dimensions，避免解构 undefined
    if (!this.dimensions) {
      this.dimensions = {
        baseWidth: 1200,
        baseHeight: 600,
        nodeRadius: 18,
        arrowGap: 6,
        nodeWeightGap: 8,
        edgeWeightGap: 8,
      };
    }

    // ===== 原先的类字段改为实例属性（构造器里计算一次） =====
    this.scale = 2; // 需要整体放大/缩小改这个值：如 1.0 / 1.2 / 1.5 / 2
    this.NODE_W = 56 * this.scale;   // 胶囊宽
    this.NODE_H = 22 * this.scale;   // 胶囊高
    this.CAP_W = 14 * this.scale;    // 右 cap 宽
    this.DOT_SIZE = 5 * this.scale;  // cap 小点直径
    this.H_GAP = 40 * this.scale;    // 箭头曲直判定阈值

    // 统一定位偏移
    this.LEFT_PAD = 6;
    this.LEFT_OFFSET = this.NODE_W + this.LEFT_PAD;
    this.TOP_OFFSET = this.NODE_H / 2;

    this.DOT_RIGHT = (this.CAP_W - this.DOT_SIZE) / 2;
    this.SAFE_GAP = 6;
  }

  /** 仅使用基础画布平移（不启用 Graph 的节点拖动链路） */
  handleMouseDown(e) {
    const Renderer = require('../../common/Renderer').default || require('../../common/Renderer');
    Renderer.prototype.handleMouseDown.call(this, e);
  }
  handleMouseMove(e) {
    const Renderer = require('../../common/Renderer').default || require('../../common/Renderer');
    Renderer.prototype.handleMouseMove.call(this, e);
  }
  // —— 关键：彻底关闭节点拾取 / 拖动 —— //
  pickNode() { return null; }
  onNodeDown() {}
  onNodeDrag() {}
  onNodeUp() {}

  // ===== 原先的箭头函数类属性改为标准方法 =====
  dotCenterX(n) {
    return (n.pos.x - this.LEFT_OFFSET) + (this.NODE_W - this.CAP_W + this.CAP_W / 2 - this.DOT_RIGHT);
  }
  dotCenterY(n) {
    return n.pos.y;
  }
  targetX(to) {
    return (to.pos.x - this.LEFT_OFFSET) + this.SAFE_GAP;
  }
  targetY(to) {
    return to.pos.y;
  }

  // 计算可见节点包围盒（含 tag）
  _getNodesBounds(list, tagBlockH /* = 24 */) {
    const tagH = (typeof tagBlockH === 'number') ? tagBlockH : 24;
    const visible = list.filter(n => !n.hidden);
    if (!visible.length) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    visible.forEach(n => {
      const left   = n.pos.x - this.LEFT_OFFSET;
      const top    = n.pos.y - this.TOP_OFFSET;
      const right  = left + this.NODE_W;
      const bottom = top + this.NODE_H + 6 + tagH;
      if (left   < minX) minX = left;
      if (top    < minY) minY = top;
      if (right  > maxX) maxX = right;
      if (bottom > maxY) maxY = bottom;
    });
    return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
  }

  // 自动把节点组居中到安全盒
  _getAutoOffset(bounds, safeBox, containerWidth) {
    const sb = safeBox || {};
    const sx = Number.isFinite(sb.x) ? sb.x : 0;
    const sy = Number.isFinite(sb.y) ? sb.y : 0;
    const sw = Number.isFinite(sb.width) ? sb.width : containerWidth;
    const sh = Number.isFinite(sb.height) ? sb.height : 240;

    const groupCx = bounds.minX + bounds.width / 2;
    const groupCy = bounds.minY + bounds.height / 2;
    const safeCx = sx + sw / 2;
    const safeCy = sy + sh / 2;

    let offX = safeCx - groupCx;
    let offY = safeCy - groupCy;

    const after = {
      minX: bounds.minX + offX,
      maxX: bounds.maxX + offX,
      minY: bounds.minY + offY,
      maxY: bounds.maxY + offY,
    };
    if (after.minX < sx) offX += (sx - after.minX);
    if (after.maxX > sx + sw) offX -= (after.maxX - (sx + sw));
    if (after.minY < sy) offY += (sy - after.minY);
    if (after.maxY > sy + sh) offY -= (after.maxY - (sy + sh));

    return { offX, offY };
  }

  // 颜色映射
  _variantClass(n) {
    switch (n.fillVariant) {
      case 'orange':  return styles.variantOrange;
      case 'blue':    return styles.variantBlue;
      case 'green':   return styles.variantGreen;
      case 'red':     return styles.variantRed;
      case 'grayAlt': return styles.variantGrayAlt;
      case 'gray':
      default:        return styles.variantGray;
    }
  }

  renderData() {
    const data = this.props.data || {};
    const nodesMap = data.nodes || new Map();
    const list = [...nodesMap.values()];
    const layout = data.layout || {};
    const dims = data.dimensions || this.dimensions;
    const baseWidth = (dims && typeof dims.baseWidth === 'number') ? dims.baseWidth : this.dimensions.baseWidth;
    const baseHeight = (dims && typeof dims.baseHeight === 'number') ? dims.baseHeight : this.dimensions.baseHeight;

    const tagBlockH = (layout && typeof layout.tagBlockH === 'number') ? layout.tagBlockH : 24;
    const safeBox   = (layout && layout.safeBox) ? layout.safeBox : { x: 0, y: 24, width: 900, height: 260 };
    const bounds    = this._getNodesBounds(list, tagBlockH);

    const viewBox = [
      (this.centerX - baseWidth / 2) / this.zoom,
      (this.centerY - baseHeight / 2) / this.zoom,
      baseWidth  / this.zoom,
      baseHeight / this.zoom,
    ];
    const autoOffset = this._getAutoOffset(bounds, safeBox, baseWidth);
    const offX = autoOffset.offX;
    const offY = autoOffset.offY;

    const needsCurve = (fromNode, toNode) => {
      const dx = Math.abs(toNode.pos.x - fromNode.pos.x);
      const dy = Math.abs(toNode.pos.y - fromNode.pos.y);
      return dx > this.H_GAP * 1.5 || dy > 10;
    };
    const getCurvedPath = (x1, y1, x2, y2) => `M ${x1},${y1} L ${x2},${y2}`;

    return (
      <svg
        className={`${styles.svgRoot} ${styles.pointerTheme}`}
        viewBox={viewBox}
        ref={this.elementRef}
      >
        <g transform={`translate(${offX}, ${offY})`}>
          {/* ===== Edges ===== */}
          <defs>
            <marker
              id="ll-arrow"
              viewBox="0 0 5 8"
              markerUnits="userSpaceOnUse"
              markerWidth="6"
              markerHeight="8"
              refX="5"
              refY="4"
              orient="auto"
            >
              <path d="M0,0 L5,4 L0,8 Z" fill="#ff3b3b" />
            </marker>
          </defs>

          <g className={styles.edges}>
            {list.map(n => {
              if (!n.nextKey || n.hidden) return null;
              const to = nodesMap.get(n.nextKey);
              if (!to || to.hidden) return null;

              const x1 = this.dotCenterX(n);
              const y1 = this.dotCenterY(n);
              const BODY_GAP = 25;
              const x2 = this.targetX(to) - BODY_GAP;
              const y2 = this.targetY(to);

              const useCurve = needsCurve(n, to);
              return useCurve ? (
                <path
                  key={`e-${n.key}-${to.key}`}
                  d={getCurvedPath(x1, y1, x2, y2)}
                  fill="none"
                  markerEnd="url(#ll-arrow)"
                  className={styles.edge}
                />
              ) : (
                <line
                  key={`e-${n.key}-${to.key}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  markerEnd="url(#ll-arrow)"
                  className={styles.edge}
                  strokeLinecap="butt"
                />
              );
            })}
          </g>

          {/* ===== Nodes ===== */}
          {list.map(n => {
            const pillLeft = n.pos.x - this.LEFT_OFFSET;
            const pillTop  = n.pos.y - this.TOP_OFFSET;

            const nodeClasses = [
              styles.node,
              this._variantClass(n),
              n.faded && styles.faded,
              n.hidden && styles.hidden,
              n.sorted && styles.sorted,
              n.patched && styles.patched,
              n.selected && styles.selected,
              n.selected1 && styles.selected1,
              n.selected2 && styles.selected2,
              n.selected3 && styles.selected3,
              n.selected4 && styles.selected4,
              n.selected5 && styles.selected5,
            ].filter(Boolean).join(' ');

            return (
              <motion.g
                key={n.key}
                // 不使用 layout / layoutId，避免 SVG 布局投影
                initial={false}
                transition={{ duration: 0.25 }}
                className={nodeClasses}
                transform={`translate(${pillLeft}, ${pillTop})`}
              >
                {/* 胶囊主体 */}
                <g className={styles.pill}>
                  <rect
                    x="0" y="0"
                    width={this.NODE_W} height={this.NODE_H}
                    rx={this.NODE_H/2} ry={this.NODE_H/2}
                    className={styles.pillBody}
                  />
                  <rect
                    x={this.NODE_W - this.CAP_W} y="0"
                    width={this.CAP_W} height={this.NODE_H}
                    rx={this.NODE_H/2} ry={this.NODE_H/2}
                    className={styles.pillCap}
                  />
                  <circle
                    cx={this.NODE_W - this.CAP_W + this.CAP_W/2 - this.DOT_RIGHT}
                    cy={this.NODE_H/2}
                    r={this.DOT_SIZE/2}
                    className={styles.dot}
                  />
                  <text
                    x={this.NODE_W/2 - this.CAP_W/2}
                    y={this.NODE_H/2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className={styles.value}
                  >
                    {n.value}
                  </text>
                </g>

                {/* 变量徽标（堆叠 tag） */}
                <g transform={`translate(0, ${this.NODE_H + 6})`} className={styles.vars}>
                  {n.variables.map(v => (
                    <g key={v} className={styles.varBadge}>
                      <rect
                        x="0" y="-14" rx="7" ry="7"
                        width={Math.max(24, 8 * String(v).length)}
                        height="18"
                        className={styles.badgeRect}
                      />
                      <text x="6" y="0" className={styles.badgeText}>{v}</text>
                    </g>
                  ))}
                </g>
              </motion.g>
            );
          })}
        </g>
      </svg>
    );
  }
}

export default LinkedListRenderer;
