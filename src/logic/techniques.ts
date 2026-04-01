import type { LogicBoard } from './logic-board.js';
import { ROW, COL, BOX, popcount, maskDigits, formatCandidates } from '../board.js';

// ---- Types ----

export enum DifficultyLevel { Easy = 1, Medium = 2, Hard = 3, Expert = 4, Evil = 5 }

export interface CellRef { cell: number; row: number; col: number; }
export interface Elimination { cell: CellRef; digit: number; }
export interface Placement { cell: CellRef; digit: number; }

export interface TechniqueResult {
  technique: string;
  difficulty: DifficultyLevel;
  eliminations: Elimination[];
  placements: Placement[];
  primaryCells: CellRef[];
  secondaryCells: CellRef[];
  explanation: string;
}

function cellRef(i: number): CellRef { return { cell: i, row: ROW[i], col: COL[i] }; }

// ---- House helpers ----

function rowCells(r: number): number[] { const a = []; for (let c = 0; c < 9; c++) a.push(r * 9 + c); return a; }
function colCells(c: number): number[] { const a = []; for (let r = 0; r < 9; r++) a.push(r * 9 + c); return a; }
function boxCells(b: number): number[] {
  const a = [], sr = ((b / 3) | 0) * 3, sc = (b % 3) * 3;
  for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++) a.push((sr + dr) * 9 + sc + dc);
  return a;
}

const HOUSES: { type: string; index: number; cells: number[] }[] = [];
for (let i = 0; i < 9; i++) {
  HOUSES.push({ type: 'Row', index: i, cells: rowCells(i) });
  HOUSES.push({ type: 'Column', index: i, cells: colCells(i) });
  HOUSES.push({ type: 'Box', index: i, cells: boxCells(i) });
}

// ---- 1. Naked Single ----
export function nakedSingle(b: LogicBoard): TechniqueResult | null {
  for (let i = 0; i < 81; i++) {
    if (b.cells[i] !== 0) continue;
    const m = b.candidates[i];
    if (m !== 0 && (m & (m - 1)) === 0) {
      let d = 0, n = m; while ((n & 1) === 0) { n >>= 1; d++; }
      const c = cellRef(i);
      return { technique: 'Naked Single', difficulty: DifficultyLevel.Easy, eliminations: [], placements: [{ cell: c, digit: d }], primaryCells: [c], secondaryCells: [], explanation: `R${c.row + 1}C${c.col + 1} has only one candidate: ${d}` };
    }
  }
  return null;
}

// ---- 2. Hidden Single ----
export function hiddenSingle(b: LogicBoard): TechniqueResult | null {
  for (const house of HOUSES) {
    for (let d = 1; d <= 9; d++) {
      const bit = 1 << d;
      let count = 0, lastIdx = 0;
      for (const idx of house.cells) {
        if (b.cells[idx] === d) { count = 10; break; }
        if (b.candidates[idx] & bit) { count++; lastIdx = idx; }
      }
      if (count === 1) {
        const c = cellRef(lastIdx);
        return { technique: 'Hidden Single', difficulty: DifficultyLevel.Easy, eliminations: [], placements: [{ cell: c, digit: d }], primaryCells: [c], secondaryCells: house.cells.filter(i => i !== lastIdx && b.cells[i] === 0).map(cellRef), explanation: `${d} can only go in R${c.row + 1}C${c.col + 1} within ${house.type} ${house.index + 1}` };
      }
    }
  }
  return null;
}

// ---- 3. Naked Pair ----
export function nakedPair(b: LogicBoard): TechniqueResult | null {
  for (const house of HOUSES) {
    const pairs: { idx: number; mask: number }[] = [];
    for (const idx of house.cells) {
      if (b.cells[idx] !== 0) continue;
      if (popcount(b.candidates[idx]) === 2) pairs.push({ idx, mask: b.candidates[idx] });
    }
    for (let i = 0; i < pairs.length; i++) {
      for (let j = i + 1; j < pairs.length; j++) {
        if (pairs[i].mask !== pairs[j].mask) continue;
        const pm = pairs[i].mask;
        const elims: Elimination[] = [];
        for (const idx of house.cells) {
          if (idx === pairs[i].idx || idx === pairs[j].idx || b.cells[idx] !== 0) continue;
          const overlap = b.candidates[idx] & pm;
          if (overlap) for (const d of maskDigits(overlap)) elims.push({ cell: cellRef(idx), digit: d });
        }
        if (elims.length === 0) continue;
        const digits = maskDigits(pm);
        return { technique: 'Naked Pair', difficulty: DifficultyLevel.Medium, eliminations: elims, placements: [], primaryCells: [cellRef(pairs[i].idx), cellRef(pairs[j].idx)], secondaryCells: elims.map(e => e.cell), explanation: `Naked Pair ${formatCandidates(pm)} in R${ROW[pairs[i].idx] + 1}C${COL[pairs[i].idx] + 1} and R${ROW[pairs[j].idx] + 1}C${COL[pairs[j].idx] + 1} -> remove ${digits.join(',')} from ${house.type} ${house.index + 1}` };
      }
    }
  }
  return null;
}

// ---- 4. Hidden Pair ----
export function hiddenPair(b: LogicBoard): TechniqueResult | null {
  for (const house of HOUSES) {
    const dPos: number[][] = Array.from({ length: 10 }, () => []);
    for (const idx of house.cells) {
      if (b.cells[idx] !== 0) continue;
      for (let d = 1; d <= 9; d++) if (b.candidates[idx] & (1 << d)) dPos[d].push(idx);
    }
    for (let d1 = 1; d1 <= 9; d1++) {
      if (dPos[d1].length !== 2) continue;
      for (let d2 = d1 + 1; d2 <= 9; d2++) {
        if (dPos[d2].length !== 2) continue;
        if (dPos[d1][0] !== dPos[d2][0] || dPos[d1][1] !== dPos[d2][1]) continue;
        const pm = (1 << d1) | (1 << d2);
        const elims: Elimination[] = [];
        for (const idx of [dPos[d1][0], dPos[d1][1]]) {
          const rem = b.candidates[idx] & ~pm;
          if (rem) for (const d of maskDigits(rem)) elims.push({ cell: cellRef(idx), digit: d });
        }
        if (elims.length === 0) continue;
        return { technique: 'Hidden Pair', difficulty: DifficultyLevel.Medium, eliminations: elims, placements: [], primaryCells: [cellRef(dPos[d1][0]), cellRef(dPos[d1][1])], secondaryCells: [], explanation: `Hidden Pair ${formatCandidates(pm)} in R${ROW[dPos[d1][0]] + 1}C${COL[dPos[d1][0]] + 1} and R${ROW[dPos[d1][1]] + 1}C${COL[dPos[d1][1]] + 1} in ${house.type} ${house.index + 1}` };
      }
    }
  }
  return null;
}

// ---- 5. Pointing Pair ----
export function pointingPair(b: LogicBoard): TechniqueResult | null {
  for (let bx = 0; bx < 9; bx++) {
    const cells = boxCells(bx);
    for (let d = 1; d <= 9; d++) {
      const bit = 1 << d;
      const pos: number[] = [];
      for (const idx of cells) {
        if (b.cells[idx] === 0 && (b.candidates[idx] & bit)) pos.push(idx);
      }
      if (pos.length < 2 || pos.length > 3) continue;

      // Same row?
      const r = ROW[pos[0]];
      if (pos.every(i => ROW[i] === r)) {
        const elims: Elimination[] = [];
        for (let c = 0; c < 9; c++) {
          const idx = r * 9 + c;
          if (BOX[idx] === bx || b.cells[idx] !== 0) continue;
          if (b.candidates[idx] & bit) elims.push({ cell: cellRef(idx), digit: d });
        }
        if (elims.length > 0)
          {return { technique: 'Pointing Pair', difficulty: DifficultyLevel.Hard, eliminations: elims, placements: [], primaryCells: pos.map(cellRef), secondaryCells: elims.map(e => e.cell), explanation: `${d} in Box ${bx + 1} confined to Row ${r + 1} -> remove from Row ${r + 1} outside Box ${bx + 1}` };}
      }

      // Same col?
      const c = COL[pos[0]];
      if (pos.every(i => COL[i] === c)) {
        const elims: Elimination[] = [];
        for (let r2 = 0; r2 < 9; r2++) {
          const idx = r2 * 9 + c;
          if (BOX[idx] === bx || b.cells[idx] !== 0) continue;
          if (b.candidates[idx] & bit) elims.push({ cell: cellRef(idx), digit: d });
        }
        if (elims.length > 0)
          {return { technique: 'Pointing Pair', difficulty: DifficultyLevel.Hard, eliminations: elims, placements: [], primaryCells: pos.map(cellRef), secondaryCells: elims.map(e => e.cell), explanation: `${d} in Box ${bx + 1} confined to Col ${c + 1} -> remove from Col ${c + 1} outside Box ${bx + 1}` };}
      }
    }
  }
  return null;
}

// ---- 6. Box/Line Reduction ----
export function boxLineReduction(b: LogicBoard): TechniqueResult | null {
  const lines = [...Array(9).keys()].flatMap(i => [
    { type: 'Row' as const, index: i, cells: rowCells(i) },
    { type: 'Column' as const, index: i, cells: colCells(i) },
  ]);
  for (const line of lines) {
    for (let d = 1; d <= 9; d++) {
      const bit = 1 << d;
      const pos: number[] = [];
      for (const idx of line.cells) {
        if (b.cells[idx] === 0 && (b.candidates[idx] & bit)) pos.push(idx);
      }
      if (pos.length < 2 || pos.length > 3) continue;
      const bx = BOX[pos[0]];
      if (!pos.every(i => BOX[i] === bx)) continue;

      const bc = boxCells(bx);
      const elims: Elimination[] = [];
      for (const idx of bc) {
        if (pos.includes(idx) || b.cells[idx] !== 0) continue;
        if (b.candidates[idx] & bit) elims.push({ cell: cellRef(idx), digit: d });
      }
      if (elims.length > 0)
        {return { technique: 'Box/Line Reduction', difficulty: DifficultyLevel.Hard, eliminations: elims, placements: [], primaryCells: pos.map(cellRef), secondaryCells: elims.map(e => e.cell), explanation: `${d} in ${line.type} ${line.index + 1} confined to Box ${bx + 1} -> remove from Box ${bx + 1} outside ${line.type} ${line.index + 1}` };}
    }
  }
  return null;
}

// ---- 7. X-Wing ----
export function xWing(b: LogicBoard): TechniqueResult | null {
  for (const rowBased of [true, false]) {
    const baseLabel = rowBased ? 'Row' : 'Column';
    const crossLabel = rowBased ? 'Column' : 'Row';
    for (let d = 1; d <= 9; d++) {
      const bit = 1 << d;
      const linePosMap: [number, number[]][] = [];
      for (let li = 0; li < 9; li++) {
        const positions: number[] = [];
        for (let j = 0; j < 9; j++) {
          const idx = rowBased ? li * 9 + j : j * 9 + li;
          if (b.cells[idx] === 0 && (b.candidates[idx] & bit)) positions.push(rowBased ? j : j);
        }
        if (positions.length === 2) linePosMap.push([li, positions]);
      }
      for (let i = 0; i < linePosMap.length; i++) {
        for (let j = i + 1; j < linePosMap.length; j++) {
          const [l1, p1] = linePosMap[i];
          const [l2, p2] = linePosMap[j];
          if (p1[0] !== p2[0] || p1[1] !== p2[1]) continue;
          const [c1, c2] = p1;
          const elims: Elimination[] = [];
          for (const ci of [c1, c2]) {
            for (let k = 0; k < 9; k++) {
              if (k === l1 || k === l2) continue;
              const idx = rowBased ? k * 9 + ci : ci * 9 + k;
              if (b.cells[idx] === 0 && (b.candidates[idx] & bit)) elims.push({ cell: cellRef(idx), digit: d });
            }
          }
          if (elims.length === 0) continue;
          const corners = rowBased
            ? [l1 * 9 + c1, l1 * 9 + c2, l2 * 9 + c1, l2 * 9 + c2]
            : [c1 * 9 + l1, c1 * 9 + l2, c2 * 9 + l1, c2 * 9 + l2];
          return { technique: 'X-Wing', difficulty: DifficultyLevel.Expert, eliminations: elims, placements: [], primaryCells: corners.map(cellRef), secondaryCells: elims.map(e => e.cell), explanation: `X-Wing on ${d}: ${baseLabel}s ${l1 + 1},${l2 + 1} x ${crossLabel}s ${c1 + 1},${c2 + 1}` };
        }
      }
    }
  }
  return null;
}

// ---- 8. Swordfish ----
export function swordfish(b: LogicBoard): TechniqueResult | null {
  for (const rowBased of [true, false]) {
    const baseLabel = rowBased ? 'Row' : 'Column';
    const crossLabel = rowBased ? 'Column' : 'Row';
    for (let d = 1; d <= 9; d++) {
      const bit = 1 << d;
      const linePos: { line: number; pos: number[] }[] = [];
      for (let li = 0; li < 9; li++) {
        const pos: number[] = [];
        for (let j = 0; j < 9; j++) {
          const idx = rowBased ? li * 9 + j : j * 9 + li;
          if (b.cells[idx] === 0 && (b.candidates[idx] & bit)) pos.push(j);
        }
        if (pos.length >= 2 && pos.length <= 3) linePos.push({ line: li, pos });
      }
      if (linePos.length < 3) continue;
      for (let i = 0; i < linePos.length; i++)
        {for (let j = i + 1; j < linePos.length; j++)
          {for (let k = j + 1; k < linePos.length; k++) {
            const cross = new Set([...linePos[i].pos, ...linePos[j].pos, ...linePos[k].pos]);
            if (cross.size !== 3) continue;
            const crossArr = [...cross].sort((a, b) => a - b);
            const bases = [linePos[i].line, linePos[j].line, linePos[k].line];
            const baseSet = new Set(bases);
            const elims: Elimination[] = [];
            for (const ci of crossArr) {
              for (let m = 0; m < 9; m++) {
                if (baseSet.has(m)) continue;
                const idx = rowBased ? m * 9 + ci : ci * 9 + m;
                if (b.cells[idx] === 0 && (b.candidates[idx] & bit)) elims.push({ cell: cellRef(idx), digit: d });
              }
            }
            if (elims.length === 0) continue;
            const primary: CellRef[] = [];
            for (const bl of bases) {for (const ci of crossArr) {
              const idx = rowBased ? bl * 9 + ci : ci * 9 + bl;
              if (b.candidates[idx] & bit) primary.push(cellRef(idx));
            }}
            return { technique: 'Swordfish', difficulty: DifficultyLevel.Evil, eliminations: elims, placements: [], primaryCells: primary, secondaryCells: elims.map(e => e.cell), explanation: `Swordfish on ${d}: ${baseLabel}s ${bases.map(l => l + 1).join(',')} x ${crossLabel}s ${crossArr.map(c => c + 1).join(',')}` };
          }}}
    }
  }
  return null;
}

// ---- 9. Naked Triple ----
export function nakedTriple(b: LogicBoard): TechniqueResult | null {
  for (const house of HOUSES) {
    const emptyCells: { idx: number; mask: number }[] = [];
    for (const idx of house.cells) {
      if (b.cells[idx] !== 0) continue;
      const c = popcount(b.candidates[idx]);
      if (c >= 2 && c <= 3) emptyCells.push({ idx, mask: b.candidates[idx] });
    }
    for (let i = 0; i < emptyCells.length; i++)
      {for (let j = i + 1; j < emptyCells.length; j++)
        {for (let k = j + 1; k < emptyCells.length; k++) {
          const union = emptyCells[i].mask | emptyCells[j].mask | emptyCells[k].mask;
          if (popcount(union) !== 3) continue;
          const tripleIdx = [emptyCells[i].idx, emptyCells[j].idx, emptyCells[k].idx];
          const tripleSet = new Set(tripleIdx);
          const elims: Elimination[] = [];
          for (const idx of house.cells) {
            if (tripleSet.has(idx) || b.cells[idx] !== 0) continue;
            const overlap = b.candidates[idx] & union;
            if (overlap) for (const d of maskDigits(overlap)) elims.push({ cell: cellRef(idx), digit: d });
          }
          if (elims.length === 0) continue;
          return { technique: 'Naked Triple', difficulty: DifficultyLevel.Medium, eliminations: elims, placements: [], primaryCells: tripleIdx.map(cellRef), secondaryCells: elims.map(e => e.cell), explanation: `Naked Triple ${formatCandidates(union)} in ${house.type} ${house.index + 1}` };
        }}}
  }
  return null;
}

// ---- 10. Hidden Triple ----
export function hiddenTriple(b: LogicBoard): TechniqueResult | null {
  for (const house of HOUSES) {
    const dPos: number[][] = Array.from({ length: 10 }, () => []);
    for (const idx of house.cells) {
      if (b.cells[idx] !== 0) continue;
      for (let d = 1; d <= 9; d++) if (b.candidates[idx] & (1 << d)) dPos[d].push(idx);
    }
    for (let d1 = 1; d1 <= 9; d1++) {
      if (dPos[d1].length < 2 || dPos[d1].length > 3) continue;
      for (let d2 = d1 + 1; d2 <= 9; d2++) {
        if (dPos[d2].length < 2 || dPos[d2].length > 3) continue;
        for (let d3 = d2 + 1; d3 <= 9; d3++) {
          if (dPos[d3].length < 2 || dPos[d3].length > 3) continue;
          const allCells = new Set([...dPos[d1], ...dPos[d2], ...dPos[d3]]);
          if (allCells.size !== 3) continue;
          const tripleMask = (1 << d1) | (1 << d2) | (1 << d3);
          const elims: Elimination[] = [];
          for (const idx of allCells) {
            const rem = b.candidates[idx] & ~tripleMask;
            if (rem) for (const d of maskDigits(rem)) elims.push({ cell: cellRef(idx), digit: d });
          }
          if (elims.length === 0) continue;
          return { technique: 'Hidden Triple', difficulty: DifficultyLevel.Hard, eliminations: elims, placements: [], primaryCells: [...allCells].map(cellRef), secondaryCells: [], explanation: `Hidden Triple ${formatCandidates(tripleMask)} in ${house.type} ${house.index + 1}` };
        }
      }
    }
  }
  return null;
}

// ---- 11. Y-Wing ----
export function yWing(b: LogicBoard): TechniqueResult | null {
  // Pivot has {A,B}, Wing1 has {A,C}, Wing2 has {B,C}
  // Pivot sees Wing1 and Wing2. Eliminate C from cells that see both wings.
  for (let pivot = 0; pivot < 81; pivot++) {
    if (b.cells[pivot] !== 0 || popcount(b.candidates[pivot]) !== 2) continue;
    const pivotMask = b.candidates[pivot];
    const pivotDigits = maskDigits(pivotMask);
    const A = pivotDigits[0], B = pivotDigits[1];

    // Find wings among pivot's peers
    const pivotPeers = getPeers(pivot);
    const wing1Candidates: number[] = []; // cells with {A, C}
    const wing2Candidates: number[] = []; // cells with {B, C}

    for (const p of pivotPeers) {
      if (b.cells[p] !== 0 || popcount(b.candidates[p]) !== 2) continue;
      const m = b.candidates[p];
      if ((m & (1 << A)) && !(m & (1 << B))) wing1Candidates.push(p);
      if ((m & (1 << B)) && !(m & (1 << A))) wing2Candidates.push(p);
    }

    for (const w1 of wing1Candidates) {
      const C1 = maskDigits(b.candidates[w1] & ~(1 << A))[0];
      for (const w2 of wing2Candidates) {
        const C2 = maskDigits(b.candidates[w2] & ~(1 << B))[0];
        if (C1 !== C2) continue;
        const C = C1;
        // w1 and w2 must NOT be peers (otherwise it's a naked pair)
        if (getPeers(w1).includes(w2)) continue;
        // Eliminate C from cells that see both w1 and w2
        const w1Peers = new Set(getPeers(w1));
        const w2Peers = new Set(getPeers(w2));
        const elims: Elimination[] = [];
        for (const idx of w1Peers) {
          if (!w2Peers.has(idx)) continue;
          if (idx === pivot || idx === w1 || idx === w2) continue;
          if (b.cells[idx] !== 0) continue;
          if (b.candidates[idx] & (1 << C)) elims.push({ cell: cellRef(idx), digit: C });
        }
        if (elims.length === 0) continue;
        return { technique: 'Y-Wing', difficulty: DifficultyLevel.Expert, eliminations: elims, placements: [], primaryCells: [cellRef(pivot), cellRef(w1), cellRef(w2)], secondaryCells: elims.map(e => e.cell), explanation: `Y-Wing: pivot R${ROW[pivot] + 1}C${COL[pivot] + 1} {${A},${B}}, wings {${A},${C}} and {${B},${C}} -> remove ${C}` };
      }
    }
  }
  return null;
}

// ---- 12. Unique Rectangle (Type 1) ----
export function uniqueRectangle(b: LogicBoard): TechniqueResult | null {
  // 4 cells forming a rectangle across 2 rows, 2 cols, 2 boxes
  // 3 corners have only {A,B}, 4th corner has {A,B,...}
  // If 4th corner were also {A,B}, puzzle would have 2 solutions (deadly pattern)
  // So eliminate A and B from the 4th corner
  for (let r1 = 0; r1 < 9; r1++)
    {for (let r2 = r1 + 1; r2 < 9; r2++)
      {for (let c1 = 0; c1 < 9; c1++)
        {for (let c2 = c1 + 1; c2 < 9; c2++) {
          const corners = [r1 * 9 + c1, r1 * 9 + c2, r2 * 9 + c1, r2 * 9 + c2];
          // Must span exactly 2 boxes
          const boxes = new Set(corners.map(i => BOX[i]));
          if (boxes.size !== 2) continue;
          // All must be empty
          if (corners.some(i => b.cells[i] !== 0)) continue;

          // Find which corners have exactly 2 candidates (the pair)
          const bivalue: number[] = [];
          const extra: number[] = [];
          for (const i of corners) {
            if (popcount(b.candidates[i]) === 2) bivalue.push(i);
            else if (popcount(b.candidates[i]) > 2) extra.push(i);
          }
          // Type 1: exactly 3 bivalue corners with same pair, 1 extra
          if (bivalue.length !== 3 || extra.length !== 1) continue;
          const pairMask = b.candidates[bivalue[0]];
          if (b.candidates[bivalue[1]] !== pairMask || b.candidates[bivalue[2]] !== pairMask) continue;
          // Extra corner must contain the pair digits
          const extraIdx = extra[0];
          if ((b.candidates[extraIdx] & pairMask) !== pairMask) continue;
          // Eliminate pair digits from extra corner
          const elims: Elimination[] = [];
          for (const d of maskDigits(pairMask)) elims.push({ cell: cellRef(extraIdx), digit: d });
          if (elims.length === 0) continue;
          const digits = maskDigits(pairMask);
          return { technique: 'Unique Rectangle', difficulty: DifficultyLevel.Expert, eliminations: elims, placements: [], primaryCells: bivalue.map(cellRef), secondaryCells: [cellRef(extraIdx)], explanation: `Unique Rectangle {${digits.join(',')}} at R${r1 + 1}C${c1 + 1}-R${r2 + 1}C${c2 + 1} -> remove ${digits.join(',')} from R${ROW[extraIdx] + 1}C${COL[extraIdx] + 1}` };
        }}}}
  return null;
}

// ---- 13. Simple Coloring ----
export function simpleColoring(b: LogicBoard): TechniqueResult | null {
  // For a digit, build conjugate pair chains (cells in a house where digit appears exactly twice)
  // Color them alternating. If two same-color cells see each other -> that color is false.
  for (let d = 1; d <= 9; d++) {
    const bit = 1 << d;
    // Build conjugate pairs
    const conjugates: Map<number, number[]> = new Map();
    for (const house of HOUSES) {
      const pos: number[] = [];
      for (const idx of house.cells) {
        if (b.cells[idx] === 0 && (b.candidates[idx] & bit)) pos.push(idx);
      }
      if (pos.length === 2) {
        if (!conjugates.has(pos[0])) conjugates.set(pos[0], []);
        if (!conjugates.has(pos[1])) conjugates.set(pos[1], []);
        conjugates.get(pos[0])!.push(pos[1]);
        conjugates.get(pos[1])!.push(pos[0]);
      }
    }

    // BFS to color chains
    const color = new Map<number, number>(); // cell -> 0 or 1
    for (const start of conjugates.keys()) {
      if (color.has(start)) continue;
      const queue = [start];
      color.set(start, 0);
      while (queue.length > 0) {
        const cell = queue.shift()!;
        const c = color.get(cell)!;
        for (const neighbor of (conjugates.get(cell) ?? [])) {
          if (color.has(neighbor)) continue;
          color.set(neighbor, 1 - c);
          queue.push(neighbor);
        }
      }
    }

    // Rule 1: If two same-color cells see each other, that color is eliminated
    const colors: [number[], number[]] = [[], []];
    for (const [cell, c] of color) colors[c].push(cell);

    for (const colorGroup of [0, 1] as const) {
      const group = colors[colorGroup];
      let contradiction = false;
      for (let i = 0; i < group.length && !contradiction; i++)
        {for (let j = i + 1; j < group.length && !contradiction; j++)
          {if (arePeers(group[i], group[j])) contradiction = true;}}

      if (contradiction) {
        const elims: Elimination[] = group
          .filter(idx => b.candidates[idx] & bit)
          .map(idx => ({ cell: cellRef(idx), digit: d }));
        if (elims.length > 0) {
          const otherGroup = colors[1 - colorGroup];
          return { technique: 'Simple Coloring', difficulty: DifficultyLevel.Evil, eliminations: elims, placements: [], primaryCells: otherGroup.map(cellRef), secondaryCells: elims.map(e => e.cell), explanation: `Simple Coloring on ${d}: color contradiction -> remove ${d} from ${elims.length} cells` };
        }
      }
    }

    // Rule 2: cells that see both colors can eliminate the digit
    if (colors[0].length > 0 && colors[1].length > 0) {
      const elims: Elimination[] = [];
      for (let idx = 0; idx < 81; idx++) {
        if (b.cells[idx] !== 0 || !(b.candidates[idx] & bit)) continue;
        if (color.has(idx)) continue;
        const seesColor0 = colors[0].some(c => arePeers(idx, c));
        const seesColor1 = colors[1].some(c => arePeers(idx, c));
        if (seesColor0 && seesColor1) elims.push({ cell: cellRef(idx), digit: d });
      }
      if (elims.length > 0) {
        return { technique: 'Simple Coloring', difficulty: DifficultyLevel.Evil, eliminations: elims, placements: [], primaryCells: [...colors[0], ...colors[1]].map(cellRef), secondaryCells: elims.map(e => e.cell), explanation: `Simple Coloring on ${d}: cells seeing both colors -> remove ${d} from ${elims.length} cells` };
      }
    }
  }
  return null;
}

// ---- Peer helpers for advanced techniques ----
import { PEERS } from '../board.js';

function getPeers(index: number): number[] {
  return PEERS[index] as number[];
}

function arePeers(a: number, b: number): boolean {
  return ROW[a] === ROW[b] || COL[a] === COL[b] || BOX[a] === BOX[b];
}

// ---- Technique Chain ----

type TechniqueFn = (b: LogicBoard) => TechniqueResult | null;

const CHAIN: TechniqueFn[] = [
  nakedSingle, hiddenSingle,                   // Easy
  nakedPair, hiddenPair, nakedTriple,           // Medium
  hiddenTriple, pointingPair, boxLineReduction, // Hard
  xWing, yWing, uniqueRectangle,               // Expert
  swordfish, simpleColoring,                    // Evil
];

export function findNext(b: LogicBoard): TechniqueResult | null {
  for (const fn of CHAIN) {
    const r = fn(b);
    if (r) return r;
  }
  return null;
}

export function applyResult(b: LogicBoard, r: TechniqueResult): void {
  for (const p of r.placements) b.place(p.cell.cell, p.digit);
  for (const e of r.eliminations) b.eliminate(e.cell.cell, e.digit);
}

export function solveLogic(board: LogicBoard): { solved: boolean; steps: TechniqueResult[] } {
  const steps = [...solveLogicIterator(board)];
  const b = board.clone();
  for (const step of steps) applyResult(b, step);
  return { solved: b.isSolved(), steps };
}

/**
 * Iterator Pattern — yields each logic step lazily.
 *
 * Useful for:
 *   - Animation (render each step)
 *   - Early termination (stop after finding specific technique)
 *   - Streaming UI updates
 *
 * Usage:
 *   for (const step of solveLogicIterator(board)) {
 *     console.log(step.technique, step.explanation);
 *   }
 */
export function* solveLogicIterator(board: LogicBoard): Generator<TechniqueResult> {
  const b = board.clone();
  let steps = 0;
  while (!b.isSolved() && steps < 500) {
    const r = findNext(b);
    if (!r) break;
    applyResult(b, r);
    steps++;
    yield r;
  }
}
