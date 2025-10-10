// This comment is entirely for the ...
import { msort_lista_td } from '../explanations';
import { colors } from '../../components/DataStructures/colors';

const apColor   = colors.apple;
const runAColor = colors.peach;
const runBColor = colors.sky;
const sortColor = colors.leaf;
const doneColor = colors.stone;

const run = run_msort();

export default { explanation: msort_lista_td, initVisualisers, run };

import Array2DTracer    from '../../components/DataStructures/Array/Array2DTracer';
import LinkedListTracer from '../../components/DataStructures/LinkedList/LinkedListTracer';
import { areExpanded }  from './collapseChunkPlugin';

function isMergeCopyExpanded() { return areExpanded(['MergeCopy']); }
function isMergeExpanded()     { return areExpanded(['MergeCopy', 'Merge']); }
function isRecursionExpanded() { return areExpanded(['MergesortL']) || areExpanded(['MergesortR']); }

const STACK_FRAME_COLOR = { No_color:0, In_progress_stackFrame:1, Current_stackFrame:2, Finished_stackFrame:3, I_color:4, J_color:5, P_color:6 };

let Indices, Heads, Tails, simple_stack;

export function update_vis_with_stack_frame(a, stack_frame, stateVal) {
  let left, right, depth;
  [left, right, depth] = stack_frame;
  for (let i = left; i <= right; i += 1) a[depth][i] = { base: stateVal, extra: [] };
  let mid = Math.floor((left + right) / 2);
  a[depth][mid] = { base: STACK_FRAME_COLOR.Current_stackFrame, extra: [] };
  return a;
}

const highlight  = (vis, index, color) => { vis.array.selectColor(index, color); };
const highlightB = (vis, index, color) => { vis.arrayB.selectColor(index, color); };
const unhighlight  = (vis, index)      => { vis.array.deselect(index); };
const unhighlightB = (vis, index)      => { vis.arrayB.deselect(index); };

// ====================== visualisers ======================
export function initVisualisers() {
  return {
    array: { instance: new Array2DTracer('array', null, 'Array representation of linked list'), order: 0 },
    list:  { instance: new LinkedListTracer('list', null, 'Pointer representation of linked list'), order: 1 },
  };
}

// ====================== helpers ======================
function assignMaybeNullVar(vis, variable_name, index) {
  if (index === 'Null') {
    vis.array.assignVariable(variable_name, 2, undefined);
    vis.array.assignVariable(variable_name + '=Null', 2, 0);
  } else {
    vis.array.assignVariable(variable_name, 2, index);
  }
}
function assignVarToA(vis, variable_name, index) {
  if (index === undefined) vis.array.removeVariable(variable_name);
  else vis.array.assignVariable(variable_name, index);
}
function assignVarToB(vis, variable_name, index) {
  if (index === undefined) vis.arrayB.removeVariable(variable_name);
  else vis.arrayB.assignVariable(variable_name, index);
}

// ---------- LinkedList-only helpers（不影响 table） ----------
function ll_updateConnections(vis, tails) {
  if (vis.list && typeof vis.list.updateConnections === 'function') vis.list.updateConnections(tails);
}
function ll_colorWholeChainFrom(vis, Lists, headIndex, channel) {
  if (!(vis.list && typeof vis.list.selectByIndex === 'function')) return;
  const tails = Lists[2];
  for (let i = headIndex; i !== 'Null'; i = tails[i]) vis.list.selectByIndex(i, channel);
}
function buildListValuesFromHead(headIndex, tailsArr, headsArr) {
  const out = [];
  for (let i = headIndex; i !== 'Null'; i = tailsArr[i]) out.push(headsArr[i]);
  return out;
}
function renderLeftOnly(vis, Lindex, tailsArr, headsArr, label) {
  const arr = (Lindex === 'Null') ? [] : buildListValuesFromHead(Lindex, tailsArr, headsArr);
  if (vis.list && typeof vis.list.set === 'function') vis.list.set(arr, label);
}
function renderTwoSingletons(vis, Lindex, Rindex, headsArr, label) {
  const arr = [];
  if (Lindex !== 'Null') arr.push(headsArr[Lindex]);
  if (Rindex !== 'Null') arr.push(headsArr[Rindex]);
  if (vis.list && typeof vis.list.set === 'function') vis.list.set(arr, label);
}
function ll_hideChainFrom(vis, headIndex) {
  if (!vis.list) return;
  const key = vis.list.indexToKey && vis.list.indexToKey.get ? vis.list.indexToKey.get(headIndex) : null;
  if (key && typeof vis.list.hideFromNode === 'function') vis.list.hideFromNode(key);
}
function ll_showAll(vis) { if (vis.list && typeof vis.list.showAll === 'function') vis.list.showAll(); }
function ll_renderFromHead(vis, lists, headIndex, label = 'merged') {
  if (!(vis.list && typeof vis.list.set === 'function')) return;
  const values = buildListValuesFromHead(headIndex, lists[2], lists[1]);
  vis.list.set(values, label);
}

// ====================== run ======================
export function run_msort() {
  return function run(chunker, { nodes }) {
    const entire_num_array = nodes;
    let A = nodes;
    let B = [...entire_num_array].fill(undefined);

    const set_simple_stack = (vis_array, c_stk) => { if (isRecursionExpanded()) vis_array.setList(c_stk); };

    function MergeSort(L, len, depth) {
      simple_stack.unshift('([' + Heads[L] + '..],' + len + ')');

      chunker.add('Main', (vis, Lists, cur_L, cur_len, cur_depth, c_stk) => {
        vis.array.set(Lists, 'msort_lista_td');
        if (vis.list && typeof vis.list.set === 'function') vis.list.set(entire_num_array, 'mergeSort list init');
        vis.array.assignVariable('L', 2, cur_L);
        let T = Lists[2];
        for (let i = cur_L; i !== 'Null'; i = T[i]) {
          vis.array.select(1, i, 1, i, runAColor);
          vis.array.select(2, i, 2, i, runAColor);
        }
        set_simple_stack(vis.array, c_stk);
      }, [[Indices, Heads, Tails], L, len, depth, simple_stack], depth);

      chunker.add('len>1', () => {}, [[Indices, Heads, Tails]], depth);

      if (len > 1) {
        let midNum = Math.floor(len / 2);

        let Mid = L;
        chunker.add('Mid', (vis, Lists, cur_L, cur_Mid, c_stk, cur_len) => {
          ll_updateConnections(vis, Lists[2]);
          // 这里不强制着色，只记录 Mid
          vis.array.assignVariable('Mid', 2, cur_Mid);
        }, [[Indices, Heads, Tails], L, Mid, simple_stack, len], depth);

        for (let i = 1; i < midNum; i++) Mid = Tails[Mid];

        let R = Tails[Mid];
        Tails[Mid] = 'Null';

        chunker.add('tail(Mid)<-Null', (vis, Lists, cur_L, cur_Mid, cur_R, c_stk, cur_len) => {
          vis.array.set(Lists, 'msort_lista_td');
          set_simple_stack(vis.array, c_stk);
          vis.array.assignVariable('L', 2, cur_L);
          vis.array.assignVariable('Mid', 2, cur_Mid);
          vis.array.assignVariable('R', 2, cur_R);

          let T = Lists[2];
          for (let i = cur_L; i !== 'Null'; i = T[i]) {
            vis.array.select(1, i, 1, i, runAColor);
            vis.array.select(2, i, 2, i, runAColor);
          }
          T = Lists[2];
          for (let i = cur_R; i !== 'Null'; i = T[i]) {
            vis.array.select(1, i, 1, i, runBColor);
            vis.array.select(2, i, 2, i, runBColor);
          }

          ll_updateConnections(vis, Lists[2]);
          ll_colorWholeChainFrom(vis, Lists, cur_L, 1);      // amber 左半
          if (cur_R !== 'Null') ll_colorWholeChainFrom(vis, Lists, cur_R, 2); // blue 右半
          if (cur_len !== 2 && cur_R !== 'Null') ll_hideChainFrom(vis, cur_R);
          else renderTwoSingletons(vis, cur_L, cur_R, Lists[1], 'two singles');
        }, [[Indices, Heads, Tails], L, Mid, R, simple_stack, len], depth);

        // 递归 L
        chunker.add('preSortL', (vis, Lists, cur_L, cur_Mid, cur_R, c_stk) => {
          vis.array.set(Lists, 'msort_lista_td');
          set_simple_stack(vis.array, c_stk);
          vis.array.assignVariable('L', 2, cur_L);
          vis.array.select(1, cur_L, 1, cur_L, runAColor);
          vis.array.select(2, cur_L, 2, cur_L, runAColor);
        }, [[Indices, Heads, Tails], L, Mid, R, simple_stack], depth);

        L = MergeSort(L, midNum, depth + 1);

        chunker.add('sortL', (vis, Lists, cur_L, cur_R, cur_Mid, c_stk) => {
          vis.array.set(Lists, 'msort_lista_td');
          set_simple_stack(vis.array, c_stk);
          vis.array.assignVariable('L', 2, cur_L);
          vis.array.assignVariable('R', 2, cur_R);
          let T = Lists[2];
          for (let i = cur_L; i !== 'Null'; i = T[i]) {
            vis.array.select(1, i, 1, i, runAColor);
            vis.array.select(2, i, 2, i, runAColor);
          }
          T = Lists[2];
          for (let i = cur_R; i !== 'Null'; i = T[i]) {
            vis.array.select(1, i, 1, i, runBColor);
            vis.array.select(2, i, 2, i, runBColor);
          }
        }, [[Indices, Heads, Tails], L, R, Mid, simple_stack], depth);

        // 递归 R
        chunker.add('preSortR', (vis, Lists, cur_L, cur_Mid, cur_R, c_stk) => {
          vis.array.set(Lists, 'msort_lista_td');
          set_simple_stack(vis.array, c_stk);
          vis.array.assignVariable('R', 2, cur_R);
          vis.array.select(1, cur_R, 1, cur_R, runBColor);
          vis.array.select(2, cur_R, 2, cur_R, runBColor);
        }, [[Indices, Heads, Tails], L, Mid, R, simple_stack], depth);

        R = MergeSort(R, len - midNum, depth + 1);

        chunker.add('sortR', (vis, Lists, cur_L, cur_R, c_stk) => {
          vis.array.set(Lists, 'msort_lista_td');
          set_simple_stack(vis.array, c_stk);
          vis.array.assignVariable('L', 2, cur_L);
          vis.array.assignVariable('R', 2, cur_R);
          let T = Lists[2];
          for (let i = cur_L; i !== 'Null'; i = T[i]) {
            vis.array.select(1, i, 1, i, runAColor);
            vis.array.select(2, i, 2, i, runAColor);
          }
          T = Lists[2];
          for (let i = cur_R; i !== 'Null'; i = T[i]) {
            vis.array.select(1, i, 1, i, runBColor);
            vis.array.select(2, i, 2, i, runBColor);
          }
        }, [[Indices, Heads, Tails], L, R, simple_stack], depth);

        // ===== 合并 =====
        let M;
        chunker.add('compareHeads', (vis, Lists, cur_L, cur_R) => {
          vis.array.deselect(1, cur_L);
          vis.array.select(1, cur_L, 1, cur_L, apColor);
          vis.array.deselect(1, cur_R);
          vis.array.select(1, cur_R, 1, cur_R, apColor);

          // ★ 比较阶段：把两个“候选头”标红（selected3 -> #ff4a4a）
          ll_updateConnections(vis, Lists[2]);
          if (cur_L !== 'Null' && vis.list?.selectByIndex) vis.list.selectByIndex(cur_L, 3);
          if (cur_R !== 'Null' && vis.list?.selectByIndex) vis.list.selectByIndex(cur_R, 3);
        }, [[Indices, Heads, Tails], L, R, simple_stack], depth);

        if (Heads[L] <= Heads[R]) { M = L; L = Tails[L]; }
        else { M = R; R = Tails[R]; }

        let E = M;
        chunker.add('E', (vis, Lists, cur_L, cur_R, cur_M, cur_E, c_stk) => {
          vis.array.set(Lists, 'msort_lista_td');
          set_simple_stack(vis.array, c_stk);
          assignMaybeNullVar(vis, 'L', cur_L);
          assignMaybeNullVar(vis, 'R', cur_R);
          vis.array.assignVariable('M', 2, cur_M);
          vis.array.assignVariable('E', 2, cur_E);

          let T = Lists[2];
          for (let i = cur_L; i !== 'Null'; i = T[i]) {
            vis.array.select(1, i, 1, i, runAColor);
            vis.array.select(2, i, 2, i, runAColor);
          }
          for (let i = cur_R; i !== 'Null'; i = T[i]) {
            vis.array.select(1, i, 1, i, runBColor);
            vis.array.select(2, i, 2, i, runBColor);
          }
          vis.array.select(1, cur_M, 1, cur_M, sortColor);
          vis.array.select(2, cur_M, 2, cur_M, sortColor);

          // ★ 已并入段（从 M 到 E）标绿（selected4 -> #69c587）
          ll_updateConnections(vis, Lists[2]);
          ll_colorWholeChainFrom(vis, Lists, cur_M, 4);
        }, [[Indices, Heads, Tails], L, R, M, E, simple_stack], depth);

        while (L !== 'Null' && R !== 'Null') {
          chunker.add('whileNotNull', (vis, Lists, cur_L, cur_R, cur_M, cur_E, c_stk) => {
            vis.array.set(Lists, 'msort_lista_td');
            set_simple_stack(vis.array, c_stk);
            assignMaybeNullVar(vis, 'L', cur_L);
            assignMaybeNullVar(vis, 'R', cur_R);
            vis.array.assignVariable('M', 2, cur_M);
            assignMaybeNullVar(vis, 'E', cur_E);

            let T = Lists[2];
            for (let i = cur_L; i !== 'Null'; i = T[i]) {
              vis.array.select(1, i, 1, i, runAColor);
              vis.array.select(2, i, 2, i, runAColor);
            }
            for (let i = cur_R; i !== 'Null'; i = T[i]) {
              vis.array.select(1, i, 1, i, runBColor);
              vis.array.select(2, i, 2, i, runBColor);
            }
            for (let i = cur_M; i !== cur_E; i = T[i]) {
              vis.array.select(1, i, 1, i, sortColor);
              vis.array.select(2, i, 2, i, sortColor);
            }
            if (cur_E !== 'Null') {
              vis.array.select(1, cur_E, 1, cur_E, sortColor);
              vis.array.select(2, cur_E, 2, cur_E, sortColor);
            }

            // ★ 当前比较的两个节点保持红色
            ll_updateConnections(vis, Lists[2]);
            if (cur_L !== 'Null' && vis.list?.selectByIndex) vis.list.selectByIndex(cur_L, 3);
            if (cur_R !== 'Null' && vis.list?.selectByIndex) vis.list.selectByIndex(cur_R, 3);
            // ★ 已并入段保持绿色
            ll_colorWholeChainFrom(vis, Lists, cur_M, 4);
          }, [[Indices, Heads, Tails], L, R, M, E, simple_stack], depth);

          chunker.add('findSmaller', (vis, Lists, cur_L, cur_R) => {
            vis.array.deselect(1, cur_L);
            vis.array.select(1, cur_L, 1, cur_L, apColor);
            vis.array.deselect(1, cur_R);
            vis.array.select(1, cur_R, 1, cur_R, apColor);

            // ★ 这一比较的两个节点标红
            ll_updateConnections(vis, Lists[2]);
            if (cur_L !== 'Null' && vis.list?.selectByIndex) vis.list.selectByIndex(cur_L, 3);
            if (cur_R !== 'Null' && vis.list?.selectByIndex) vis.list.selectByIndex(cur_R, 3);
          }, [[Indices, Heads, Tails], L, R, simple_stack], depth);

          if (Heads[L] <= Heads[R]) {
            Tails[E] = L; E = L; L = Tails[L];
            chunker.add('popL', (vis, Lists, cur_L, cur_R, cur_M, cur_E, c_stk) => {
              vis.array.set(Lists, 'msort_lista_td');
              set_simple_stack(vis.array, c_stk);
              assignMaybeNullVar(vis, 'L', cur_L);
              assignMaybeNullVar(vis, 'R', cur_R);
              vis.array.assignVariable('M', 2, cur_M);
              assignMaybeNullVar(vis, 'E', cur_E);

              let T = Lists[2];
              for (let i = cur_L; i !== 'Null'; i = T[i]) {
                vis.array.select(1, i, 1, i, runAColor);
                vis.array.select(2, i, 2, i, runAColor);
              }
              for (let i = cur_R; i !== 'Null'; i = T[i]) {
                vis.array.select(1, i, 1, i, runBColor);
                vis.array.select(2, i, 2, i, runBColor);
              }
              for (let i = cur_M; i !== cur_E; i = T[i]) {
                vis.array.select(1, i, 1, i, sortColor);
                vis.array.select(2, i, 2, i, sortColor);
              }
              if (cur_E !== 'Null') {
                vis.array.select(1, cur_E, 1, cur_E, sortColor);
                vis.array.select(2, cur_E, 2, cur_E, sortColor);
              }

              // ★ 已并入段上色为绿色
              ll_updateConnections(vis, Lists[2]);
              ll_colorWholeChainFrom(vis, Lists, cur_M, 4);
            }, [[Indices, Heads, Tails], L, R, M, E, simple_stack], depth);
          } else {
            Tails[E] = R; E = R; R = Tails[R];
            chunker.add('popR', (vis, Lists, cur_L, cur_R, cur_M, cur_E, c_stk) => {
              vis.array.set(Lists, 'msort_lista_td');
              set_simple_stack(vis.array, c_stk);
              assignMaybeNullVar(vis, 'L', cur_L);
              assignMaybeNullVar(vis, 'R', cur_R);
              vis.array.assignVariable('M', 2, cur_M);
              assignMaybeNullVar(vis, 'E', cur_E);

              let T = Lists[2];
              for (let i = cur_L; i !== 'Null'; i = T[i]) {
                vis.array.select(1, i, 1, i, runAColor);
                vis.array.select(2, i, 2, i, runAColor);
              }
              for (let i = cur_R; i !== 'Null'; i = T[i]) {
                vis.array.select(1, i, 1, i, runBColor);
                vis.array.select(2, i, 2, i, runBColor);
              }
              for (let i = cur_M; i !== cur_E; i = T[i]) {
                vis.array.select(1, i, 1, i, sortColor);
                vis.array.select(2, i, 2, i, sortColor);
              }
              if (cur_E !== 'Null') {
                vis.array.select(1, cur_E, 1, cur_E, sortColor);
                vis.array.select(2, cur_E, 2, cur_E, sortColor);
              }

              // ★ 已并入段上色为绿色
              ll_updateConnections(vis, Lists[2]);
              ll_colorWholeChainFrom(vis, Lists, cur_M, 4);
            }, [[Indices, Heads, Tails], L, R, M, E, simple_stack], depth);
          }
        }

        // ===== 追加剩余并完成本段合并：重排 + 全绿 =====
        if (L === 'Null') {
          Tails[E] = R;
          chunker.add('appendR', (vis, Lists, cur_L, cur_R, cur_M, cur_E, c_stk) => {
            vis.array.set(Lists, 'msort_lista_td');
            set_simple_stack(vis.array, c_stk);
            vis.array.assignVariable('M', 2, cur_M);
            let T = Lists[2];
            for (let i = cur_M; i !== 'Null'; i = T[i]) {
              vis.array.select(1, i, 1, i, sortColor);
              vis.array.select(2, i, 2, i, sortColor);
            }
            ll_updateConnections(vis, Lists[2]);
            ll_showAll(vis);
            ll_renderFromHead(vis, Lists, cur_M, 'merged'); // 按 Tails 顺序刷新位置
            ll_colorWholeChainFrom(vis, Lists, cur_M, 4);   // 全绿
          }, [[Indices, Heads, Tails], L, R, M, E, simple_stack], depth);
        } else {
          Tails[E] = L;
          chunker.add('appendL', (vis, Lists, cur_L, cur_R, cur_M, cur_E, c_stk) => {
            vis.array.set(Lists, 'msort_lista_td');
            set_simple_stack(vis.array, c_stk);
            vis.array.assignVariable('M', 2, cur_M);
            let T = Lists[2];
            for (let i = cur_M; i !== 'Null'; i = T[i]) {
              vis.array.select(1, i, 1, i, sortColor);
              vis.array.select(2, i, 2, i, sortColor);
            }
            ll_updateConnections(vis, Lists[2]);
            ll_showAll(vis);
            ll_renderFromHead(vis, Lists, cur_M, 'merged');
            ll_colorWholeChainFrom(vis, Lists, cur_M, 4);   // 全绿
          }, [[Indices, Heads, Tails], L, R, M, E, simple_stack], depth);
        }

        chunker.add('returnM', (vis, Lists, cur_L, cur_M, c_stk) => {
          vis.array.set(Lists, 'msort_lista_td');
          set_simple_stack(vis.array, c_stk);
          vis.array.assignVariable('L', 2, undefined);
          vis.array.assignVariable('R', 2, undefined);
          vis.array.assignVariable('E', 2, undefined);
          vis.array.assignVariable('M', 2, cur_M);
          let T = Lists[2];
          for (let i = cur_M; i !== 'Null'; i = T[i]) {
            vis.array.select(1, i, 1, i, sortColor);
            vis.array.select(2, i, 2, i, sortColor);
          }
          ll_updateConnections(vis, Lists[2]);
          ll_colorWholeChainFrom(vis, Lists, cur_M, 4); // 保持绿色
        }, [[Indices, Heads, Tails], L, M, simple_stack], depth);

        L = M;
      } else {
        chunker.add('returnL', (vis, a, cur_L) => {
          vis.array.select(1, cur_L, 1, cur_L, '1');
          vis.array.select(2, cur_L, 2, cur_L, '1');
        }, [A, L], depth);
      }

      simple_stack.shift();
      return L;
    }

    // ===== 实际调用 mergesort =====
    Indices = ['i'];
    Heads   = ['i.head (data)'];
    Tails   = ['i.tail (next)'];
    simple_stack = [];

    for (let i = 1; i < entire_num_array.length + 1; i++) {
      Indices.push(i);
      Heads.push(entire_num_array[i - 1]);
      Tails.push(i + 1);
    }
    Tails[entire_num_array.length] = 'Null';

    const msresult = MergeSort(1, entire_num_array.length, 0);

    // 终帧：表格 doneColor，高亮，链表全量重排并全绿
    const lastLine = (entire_num_array.length > 1 ? 'returnM' : 'returnL');
    chunker.add(lastLine, (vis, Lists, finalHead) => {
      for (let i = 1; i < entire_num_array.length; i++) {
        vis.array.select(1, i, 1, i, doneColor);
        vis.array.select(2, i, 2, i, doneColor);
      }
      ll_updateConnections(vis, Lists[2]);
      ll_showAll(vis);
      ll_renderFromHead(vis, Lists, finalHead, 'final');
      ll_colorWholeChainFrom(vis, Lists, finalHead, 4); // 全绿 #69c587
    }, [[Indices, Heads, Tails], msresult], 1);

    return msresult;
  };
}
