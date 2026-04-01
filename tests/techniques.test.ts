import { describe, it, expect } from 'vitest';
import { LogicBoard } from '../src/logic/logic-board.js';
import {
  nakedSingle, hiddenSingle, nakedPair, hiddenPair, nakedTriple,
  hiddenTriple, pointingPair, boxLineReduction, xWing, yWing,
  uniqueRectangle, swordfish, simpleColoring,
  findNext, solveLogic, applyResult, DifficultyLevel,
} from '../src/logic/techniques.js';
import { ROW, COL, BOX } from '../src/board.js';

const EASY = '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
const MEDIUM = '020000000000600003074080000000003002080040010600500000000010780500009000000000040';

describe('Naked Single', () => {
  it('finds cell with one candidate', () => {
    const b = new LogicBoard(new Uint8Array(81), new Uint16Array(81));
    b.candidates[0] = 1 << 5; // only {5}
    for (let i = 1; i < 81; i++) b.candidates[i] = (1 << 1) | (1 << 2) | (1 << 4);
    const r = nakedSingle(b);
    expect(r).not.toBeNull();
    expect(r!.technique).toBe('Naked Single');
    expect(r!.placements[0].digit).toBe(5);
    expect(r!.placements[0].cell.cell).toBe(0);
  });
});

describe('Hidden Single', () => {
  it('finds digit with one position in house', () => {
    const b = new LogicBoard(new Uint8Array(81), new Uint16Array(81));
    // Row 0: only cell 4 has candidate 7
    b.candidates[4] = (1 << 3) | (1 << 7);
    for (let i = 0; i < 9; i++) {
      if (i === 4) continue;
      b.candidates[i] = (1 << 1) | (1 << 2) | (1 << 3) | (1 << 5);
    }
    for (let i = 9; i < 81; i++) b.candidates[i] = (1 << 1) | (1 << 2) | (1 << 7);
    const r = hiddenSingle(b);
    expect(r).not.toBeNull();
    expect(r!.technique).toBe('Hidden Single');
    expect(r!.placements[0].digit).toBe(7);
  });
});

describe('Naked Pair', () => {
  it('eliminates from other cells in house', () => {
    const b = new LogicBoard(new Uint8Array(81), new Uint16Array(81));
    const pm = (1 << 3) | (1 << 7);
    b.candidates[0] = pm;
    b.candidates[1] = pm;
    b.candidates[2] = (1 << 3) | (1 << 5) | (1 << 7);
    b.candidates[3] = (1 << 5) | (1 << 8);
    for (let i = 4; i < 9; i++) { b.cells[i] = i + 1; }
    for (let i = 9; i < 81; i++) b.candidates[i] = (1 << 1) | (1 << 2) | (1 << 4);
    const r = nakedPair(b);
    expect(r).not.toBeNull();
    expect(r!.technique).toBe('Naked Pair');
    expect(r!.eliminations.length).toBeGreaterThan(0);
    expect(r!.eliminations.some(e => e.cell.cell === 2)).toBe(true);
  });
});

describe('Hidden Pair', () => {
  it('eliminates other candidates from pair cells', () => {
    const b = new LogicBoard(new Uint8Array(81), new Uint16Array(81));
    b.candidates[0] = (1 << 2) | (1 << 4) | (1 << 6) | (1 << 8);
    b.candidates[1] = (1 << 1) | (1 << 4) | (1 << 8) | (1 << 9);
    for (let i = 2; i < 9; i++) b.candidates[i] = (1 << 1) | (1 << 2) | (1 << 5) | (1 << 6);
    for (let i = 9; i < 81; i++) b.candidates[i] = (1 << 1) | (1 << 2) | (1 << 4) | (1 << 8);
    const r = hiddenPair(b);
    expect(r).not.toBeNull();
    expect(r!.technique).toBe('Hidden Pair');
    for (const e of r!.eliminations) {
      expect(e.digit).not.toBe(4);
      expect(e.digit).not.toBe(8);
    }
  });
});

describe('Pointing Pair', () => {
  it('eliminates from line outside box', () => {
    const b = new LogicBoard(new Uint8Array(81), new Uint16Array(81));
    b.candidates[0] = (1 << 5) | (1 << 6);
    b.candidates[1] = (1 << 5) | (1 << 9);
    b.candidates[2] = (1 << 6) | (1 << 9);
    for (const i of [9, 10, 11, 18, 19, 20]) b.candidates[i] = (1 << 1) | (1 << 2);
    b.candidates[3] = (1 << 5) | (1 << 7); // target
    b.candidates[4] = (1 << 5) | (1 << 8); // target
    for (const i of [5, 6, 7, 8]) b.candidates[i] = (1 << 7) | (1 << 8);
    for (let i = 9; i < 81; i++) {
      if (b.candidates[i] === 0) b.candidates[i] = (1 << 1) | (1 << 2) | (1 << 6);
    }
    const r = pointingPair(b);
    expect(r).not.toBeNull();
    expect(r!.technique).toBe('Pointing Pair');
    expect(r!.eliminations.every(e => e.digit === 5)).toBe(true);
  });
});

describe('Box/Line Reduction', () => {
  it('eliminates from box outside line', () => {
    const b = new LogicBoard(new Uint8Array(81), new Uint16Array(81));
    b.candidates[0] = (1 << 6) | (1 << 7);
    b.candidates[1] = (1 << 6) | (1 << 8);
    b.candidates[2] = (1 << 7) | (1 << 8);
    for (let i = 3; i < 9; i++) b.candidates[i] = (1 << 1) | (1 << 2) | (1 << 7);
    b.candidates[9] = (1 << 1) | (1 << 2);
    b.candidates[10] = (1 << 6) | (1 << 9); // target
    b.candidates[11] = (1 << 1) | (1 << 2);
    for (const i of [18, 19, 20]) b.candidates[i] = (1 << 1) | (1 << 2);
    for (let i = 21; i < 81; i++) {
      if (b.candidates[i] === 0) b.candidates[i] = (1 << 1) | (1 << 2) | (1 << 6);
    }
    const r = boxLineReduction(b);
    expect(r).not.toBeNull();
    expect(r!.technique).toBe('Box/Line Reduction');
  });
});

describe('X-Wing', () => {
  it('finds rectangle pattern', () => {
    const b = new LogicBoard(new Uint8Array(81), new Uint16Array(81));
    // Place 3 in rows 1,2,3,5,6,8
    for (const [idx] of [[9, 3], [19, 3], [30, 3], [49, 3], [60, 3], [80, 3]] as const) b.cells[idx] = 3;
    for (let i = 0; i < 81; i++) {
      if (b.cells[i] !== 0) { b.candidates[i] = 0; continue; }
      b.candidates[i] = (1 << 1) | (1 << 2) | (1 << 4);
    }
    b.candidates[2] = (1 << 3) | (1 << 5);
    b.candidates[5] = (1 << 3) | (1 << 7);
    b.candidates[38] = (1 << 3) | (1 << 6);
    b.candidates[41] = (1 << 3) | (1 << 9);
    b.candidates[65] = (1 << 3) | (1 << 4);
    b.candidates[68] = (1 << 3) | (1 << 8);
    const r = xWing(b);
    expect(r).not.toBeNull();
    expect(r!.technique).toBe('X-Wing');
    expect(r!.primaryCells.length).toBe(4);
  });
});

describe('Swordfish', () => {
  it('finds 3-line pattern', () => {
    const b = new LogicBoard(new Uint8Array(81), new Uint16Array(81));
    for (const idx of [11, 18, 39, 50, 69, 80]) b.cells[idx] = 2;
    for (let i = 0; i < 81; i++) {
      if (b.cells[i] !== 0) { b.candidates[i] = 0; continue; }
      b.candidates[i] = (1 << 1) | (1 << 3) | (1 << 4);
    }
    b.candidates[1] = (1 << 2) | (1 << 5);
    b.candidates[4] = (1 << 2) | (1 << 6);
    b.candidates[28] = (1 << 2) | (1 << 8);
    b.candidates[34] = (1 << 2) | (1 << 9);
    b.candidates[58] = (1 << 2) | (1 << 3);
    b.candidates[61] = (1 << 2) | (1 << 7);
    b.candidates[46] = (1 << 2) | (1 << 4);
    b.candidates[22] = (1 << 2) | (1 << 6);
    b.candidates[79] = (1 << 2) | (1 << 5);
    const r = swordfish(b);
    expect(r).not.toBeNull();
    expect(r!.technique).toBe('Swordfish');
  });
});

describe('Technique Chain', () => {
  it('findNext returns easiest technique', () => {
    const b = LogicBoard.fromPuzzle(EASY);
    const r = findNext(b);
    expect(r).not.toBeNull();
    expect(r!.difficulty).toBeLessThanOrEqual(DifficultyLevel.Easy);
  });

  it('solveLogic solves easy puzzle', () => {
    const b = LogicBoard.fromPuzzle(EASY);
    const { solved, steps } = solveLogic(b);
    expect(solved).toBe(true);
    expect(steps.length).toBeGreaterThan(0);
  });

  it('chain covers common techniques on medium puzzles', () => {
    const puzzles = [MEDIUM,
      '000260701680070090190004500820100040004602900050003028009300074040050036703018000',
      '000000052000000000030700000000400070208030000010000600340500100000068000000090004',
    ];
    const allTech = new Set<string>();
    for (const p of puzzles) {
      const { steps } = solveLogic(LogicBoard.fromPuzzle(p));
      for (const s of steps) allTech.add(s.technique);
    }
    expect(allTech.has('Naked Single')).toBe(true);
    expect(allTech.has('Hidden Single')).toBe(true);
    expect(allTech.has('Naked Pair')).toBe(true);
    expect(allTech.has('Pointing Pair')).toBe(true);
  });
});

describe('Naked Triple', () => {
  it('exists in chain', () => {
    // Verify it can be called
    const b = new LogicBoard(new Uint8Array(81), new Uint16Array(81));
    const r = nakedTriple(b);
    // null is fine — just checking it doesn't throw
    expect(r === null || r.technique === 'Naked Triple').toBe(true);
  });
});

describe('Hidden Triple', () => {
  it('exists in chain', () => {
    const b = new LogicBoard(new Uint8Array(81), new Uint16Array(81));
    const r = hiddenTriple(b);
    expect(r === null || r.technique === 'Hidden Triple').toBe(true);
  });
});

describe('Y-Wing', () => {
  it('exists in chain', () => {
    const b = new LogicBoard(new Uint8Array(81), new Uint16Array(81));
    const r = yWing(b);
    expect(r === null || r.technique === 'Y-Wing').toBe(true);
  });
});

describe('Unique Rectangle', () => {
  it('exists in chain', () => {
    const b = new LogicBoard(new Uint8Array(81), new Uint16Array(81));
    const r = uniqueRectangle(b);
    expect(r === null || r.technique === 'Unique Rectangle').toBe(true);
  });
});

describe('Simple Coloring', () => {
  it('exists in chain', () => {
    const b = new LogicBoard(new Uint8Array(81), new Uint16Array(81));
    const r = simpleColoring(b);
    expect(r === null || r.technique === 'Simple Coloring').toBe(true);
  });
});
