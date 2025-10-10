// This comment is entirely for the
// amusement of the person who wrote
// it and should be ignored by anyone
// else. However, THE COMMENTS BELOW
// SHOULD BE READ BY ANYONE LOOKING
// AT THE CODE, PARTICULARLY IF IT IS
// TO BE MODIFIED!

// Animation of merge sort for lists (represented using array), top down.
// XXX PROTOTYPE for pointer version. Adapted from code for mergesort for
// arrays (may include some quicksort remnants also).
// XXX Needs major clean up of code to remove junk, refactor, etc before
// being used for anything else
// XXX Not all steps are animated
// XXX should be consistent with mergesort for arrays wrt colours
// At line if head(L) <= head(R) we can use apple highlight for head of
// both lists, like ap1, ap2 in mergesort
// etc (current work...)

import { msort_lista_td } from '../explanations';
import { colors } from '../../components/DataStructures/colors';

// Animation should be consistent with array versions
const apColor   = colors.apple;
const runAColor = colors.peach;
const runBColor = colors.sky;
const sortColor = colors.leaf;
const doneColor = colors.stone;

const run = run_msort();

export default {
  explanation: msort_lista_td,
  initVisualisers,
  run
};

// import 2D tracer to generate array in the middle panel
import Array2DTracer    from '../../components/DataStructures/Array/Array2DTracer';
// import LinkedList data Structure to represent animation
import LinkedListTracer from '../../components/DataStructures/LinkedList/LinkedListTracer';

import { areExpanded } from './collapseChunkPlugin';

function isMergeCopyExpanded() {
  return areExpanded(['MergeCopy']);
}
function isMergeExpanded() {
  return areExpanded(['MergeCopy', 'Merge']); // MergeCopy contains Merge
}
function isRecursionExpanded() {
  return areExpanded(['MergesortL']) || areExpanded(['MergesortR']);
}

const STACK_FRAME_COLOR = {
  No_color: 0,
  In_progress_stackFrame: 1,
  Current_stackFrame: 2,
  Finished_stackFrame: 3,
  I_color: 4,
  J_color: 5,
  P_color: 6,
};

let Indices, Heads, Tails, simple_stack;

export function update_vis_with_stack_frame(a, stack_frame, stateVal) {
  let left, right, depth;
  [left, right, depth] = stack_frame;
  for (let i = left; i <= right; i += 1) a[depth][i] = { base: stateVal, extra: [] };
  let mid = Math.floor((left + right) / 2);
  a[depth][mid] = { base: STACK_FRAME_COLOR.Current_stackFrame, extra: [] };
  return a;
}

const highlight    = (vis, index, color) => { vis.array.selectColor(index, color); };
const highlightB   = (vis, index, color) => { vis.arrayB.selectColor(index, color); };
const unhighlight  = (vis, index)        => { vis.array.deselect(index); };
const unhighlightB = (vis, index)        => { vis.arrayB.deselect(index); };

export function initVisualisers() {
  return {
    array: {
      instance: new Array2DTracer('array', null, 'Array representation of linked list'),
      order: 0,
    },
    list: {
      instance: new LinkedListTracer('list', null, 'Pointer representation of linked list'),
      order: 1,
    },
  };
}

export function run_msort() {
  return function run(chunker, { nodes }) {

    const entire_num_array = nodes;
    let A = nodes;
    let B = [...entire_num_array].fill(undefined);

    // -------------------------------- LinkedList-only helpers（只作用于链表视图） --------------------------------
    function ll_updateConnections(vis, tails) { // new add code
      if (vis.list && typeof vis.list.updateConnections === 'function') {
        vis.list.updateConnections(tails);
      }
    }
    function ll_preselectRangeFromL(vis, lists, headIndex, len) { // new add code
      if (!(vis.list && typeof vis.list.selectByIndex === 'function')) return;
      const tails = lists[2];
      let i = headIndex, cnt = 0;
      while (i !== 'Null' && cnt < len) {
        vis.list.selectByIndex(i, 1); // selected1 → SCSS 配置为 #ffb000 填充
        i = tails[i];
        cnt++;
      }
    }
    function ll_colorWholeChainFrom(vis, lists, headIndex, channel) { // new add code
      if (!(vis.list && typeof vis.list.selectByIndex === 'function')) return;
      const tails = lists[2];
      for (let i = headIndex; i !== 'Null'; i = tails[i]) {
        vis.list.selectByIndex(i, channel); // 1:#ffb000  2:#2f8cff（SCSS 中 selected2 设为蓝色填充）
      }
    }
    function ll_hideChainFrom(vis, headIndex) { // new add code
      if (!vis.list) return;
      const key = vis.list.indexToKey && vis.list.indexToKey.get
        ? vis.list.indexToKey.get(headIndex)
        : null;
      if (key && typeof vis.list.hideFromNode === 'function') vis.list.hideFromNode(key);
    }
    function ll_showAll(vis) { // new add code
      if (vis.list && typeof vis.list.showAll === 'function') vis.list.showAll();
    }
    function buildListValuesFromHead(headIndex, tailsArr, headsArr) { // new add code
      const out = [];
      for (let i = headIndex; i !== 'Null'; i = tailsArr[i]) out.push(headsArr[i]);
      return out;
    }
    function renderLeftOnly(vis, Lindex, tailsArr, headsArr, label) { // new add code
      const arr = (Lindex === 'Null') ? [] : buildListValuesFromHead(Lindex, tailsArr, headsArr);
      if (vis.list && typeof vis.list.set === 'function') vis.list.set(arr, label);
    }
    function renderTwoSingletons(vis, Lindex, Rindex, headsArr, label) { // new add code
      const arr = [];
      if (Lindex !== 'Null') arr.push(headsArr[Lindex]);
      if (Rindex !== 'Null') arr.push(headsArr[Rindex]);
      if (vis.list && typeof vis.list.set === 'function') vis.list.set(arr, label);
    }
    function ll_renderFromHead(vis, lists, headIndex, label = 'merged') { // new add code
      // 按当前 Tails 从 headIndex 走到 Null，得到值序列，然后用 set() 触发布局刷新
      if (!(vis.list && typeof vis.list.set === 'function')) return;
      const values = buildListValuesFromHead(headIndex, lists[2], lists[1]);
      vis.list.set(values, label);
    }
    // ---------------------------------------------------------------------------------------------------------------

    function renderInMerge(vis, a, b, cur_left, cur_ap1, cur_ap2, cur_bp, cur_max1, cur_max2) { 
      if (isMergeExpanded()) {
        vis.array.set(a, 'msort_lista_td');
        assignVarToA(vis, 'ap1', cur_ap1);
        assignVarToA(vis, 'max1', cur_max1);
        highlight(vis, cur_ap1, true);
        if (cur_ap2 < a.length) {
          assignVarToA(vis, 'ap2', cur_ap2);
          highlight(vis, cur_ap2, true);
        } else {
          assignVarToA(vis, 'ap2', undefined);
        }
        assignVarToA(vis, 'max2', cur_max2);
        vis.arrayB.set(b, 'msort_lista_td');
        assignVarToB(vis, 'bp', cur_bp);
        for (let i = cur_left; i < cur_bp; i++) highlightB(vis, i, false);
      }
    }

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

    const set_simple_stack = (vis_array, c_stk) => {
      if (isRecursionExpanded()) vis_array.setList(c_stk);
    }

    function MergeSort(L, len, depth) {

      simple_stack.unshift('([' + Heads[L] + '..],' + len + ')');

      chunker.add('Main', (vis, Lists, cur_L, cur_len, cur_depth, c_stk) => {
        vis.array.set(Lists, 'msort_lista_td');

        // 初次：链表视图展示整条链（不影响 table）
        if (vis.list && typeof vis.list.set === 'function') { // new add code
          vis.list.set(entire_num_array, 'mergeSort list init'); // new add code
        }

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
        // —— 分割前：预选整段（amber #ffb000），并入已有 “Mid” 书签 —— 
        chunker.add('Mid', (vis, Lists, cur_L, cur_Mid, c_stk, cur_len) => { // new add code
          ll_updateConnections(vis, Lists[2]);                // new add code
          ll_preselectRangeFromL(vis, Lists, cur_L, cur_len); // new add code
          vis.array.assignVariable('Mid', 2, cur_Mid);
        }, [[Indices, Heads, Tails], L, Mid, simple_stack, len], depth); // new add code: 传 len

        for (let i = 1; i < midNum; i++) {
          Mid = Tails[Mid];
        }

        // split L into lists L and R at (after) mid point
        let R = Tails[Mid];
        Tails[Mid] = 'Null';

        // —— 分割后：左 amber(#ffb000) 右 blue(#2f8cff)，len!=2 时隐藏右边 —— 
        chunker.add('tail(Mid)<-Null', (vis, Lists, cur_L, cur_Mid, cur_R, c_stk, cur_len) => { // new add code
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

          // 链表视图同步 + 著色 + 隐藏
          ll_updateConnections(vis, Lists[2]);             // new add code
          ll_colorWholeChainFrom(vis, Lists, cur_L, 1);    // new add code（左：#ffb000）
          if (cur_R !== 'Null') {
            ll_colorWholeChainFrom(vis, Lists, cur_R, 2);  // new add code（右：#2f8cff）
          }
          if (cur_len !== 2 && cur_R !== 'Null') {
            ll_hideChainFrom(vis, cur_R);                  // new add code
          } else {
            // renderTwoSingletons(vis, cur_L, cur_R, Lists[1], 'two single nodes'); // 可选视觉
          }
        }, [[Indices, Heads, Tails], L, Mid, R, simple_stack, len], depth); // new add code: 传 len

        // ===== 递归左半 =====
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
          vis.array.select(1, cur_R, 1, cur_R, runBColor);
          vis.array.select(2, cur_R, 2, cur_R, runBColor);
        }, [[Indices, Heads, Tails], L, R, Mid, simple_stack], depth);

        // ===== 递归右半 =====
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
          }, [[Indices, Heads, Tails], L, R, M, E, simple_stack], depth);

          chunker.add('findSmaller', (vis, Lists, cur_L, cur_R) => {
            vis.array.deselect(1, cur_L);
            vis.array.select(1, cur_L, 1, cur_L, apColor);
            vis.array.deselect(1, cur_R);
            vis.array.select(1, cur_R, 1, cur_R, apColor);
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
            }, [[Indices, Heads, Tails], L, R, M, E, simple_stack], depth);
          }
        }

        // ===== 追加剩余并完成一段合并（这里做“重排”） =====
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

            // —— 同步指针 + 取消隐藏 + 触发链表“按当前指针顺序”重排 —— // new add code
            ll_updateConnections(vis, Lists[2]);           // new add code
            ll_showAll(vis);                               // new add code
            ll_renderFromHead(vis, Lists, cur_M, 'merged'); // new add code  <-- 关键：让可视节点按 Tails 顺序重新布局

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

            // —— 同步指针 + 取消隐藏 + 触发链表重排 —— // new add code
            ll_updateConnections(vis, Lists[2]);           // new add code
            ll_showAll(vis);                               // new add code
            ll_renderFromHead(vis, Lists, cur_M, 'merged'); // new add code  <-- 关键

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
        }, [[Indices, Heads, Tails], L, M, simple_stack], depth);

        L = M; // return head of merged list
      } else {
        chunker.add('returnL', (vis, a, cur_L) => {
          vis.array.select(1, cur_L, 1, cur_L, '1');
          vis.array.select(2, cur_L, 2, cur_L, '1');
        }, [A, L], depth);
      }

      simple_stack.shift();
      return L;
    }

    // -------------------------------- Perform actual mergesort --------------------------------
    Indices = ['i'];
    Heads   = ['i.head (data)'];
    Tails   = ['i.tail (next)'];
    simple_stack = [];

    for (let i = 1; i < entire_num_array.length; i++) {
      Indices.push(i);
      Heads.push(entire_num_array[i - 1]);
      Tails.push(i + 1);
    }
    Tails[entire_num_array.length - 1] = 'Null';

    const msresult = MergeSort(1, entire_num_array.length - 1, 0);

    // 最后一帧：array 着色 + 链表按最终指针顺序重排（确保完全有序从左到右）
    let lastLine = (entire_num_array.length > 1 ? 'returnM' : 'returnL');
    chunker.add(lastLine, (vis, Lists, finalHead) => {            // new add code
      for (let i = 1; i < entire_num_array.length; i++) {
        vis.array.select(1, i, 1, i, doneColor);
        vis.array.select(2, i, 2, i, doneColor);
      }
      ll_updateConnections(vis, Lists[2]);                        // new add code
      ll_showAll(vis);                                            // new add code
      ll_renderFromHead(vis, Lists, finalHead, 'final');          // new add code  <-- 关键：最终重排
    }, [[Indices, Heads, Tails], msresult], 1);                   // new add code: 把 Lists 和最终头结点一起传入

    return msresult;
  }
}
