import { describe, it, expect } from 'vitest';
import { Board } from '../src/board.js';
import * as bitmask from '../src/solver/bitmask.js';
import * as dlx from '../src/solver/dlx.js';
import * as hybrid from '../src/solver/hybrid.js';

const EASY = '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
const HARD = '800000000003600000070090200050007000000045700000100030001000068008500010090000400';
const EVIL = '000000010400000000020000000000050407008000300001090000300400200050100000000806000';

describe('Bitmask solver', () => {
  it('solves easy puzzle', () => {
    const b = Board.fromString(EASY);
    const s = bitmask.solve(b);
    expect(s).not.toBeNull();
    expect(s!.isSolved()).toBe(true);
  });

  it('solves hard puzzle', () => {
    const s = bitmask.solve(Board.fromString(HARD));
    expect(s).not.toBeNull();
    expect(s!.isSolved()).toBe(true);
  });

  it('counts solutions', () => {
    expect(bitmask.countSolutionsBoard(Board.fromString(EASY), 2)).toBe(1);
  });
});

describe('DLX solver', () => {
  it('solves easy puzzle', () => {
    const s = dlx.solve(Board.fromString(EASY));
    expect(s).not.toBeNull();
    expect(s!.isSolved()).toBe(true);
  });

  it('solves hard puzzle', () => {
    const s = dlx.solve(Board.fromString(HARD));
    expect(s).not.toBeNull();
    expect(s!.isSolved()).toBe(true);
  });

  it('counts solutions (unique)', () => {
    expect(dlx.countSolutions(Board.fromString(EASY), 2)).toBe(1);
  });

  it('counts solutions (empty board has many)', () => {
    const empty = '0'.repeat(81);
    expect(dlx.countSolutions(Board.fromString(empty), 3)).toBe(3);
  });
});

describe('Hybrid solver', () => {
  it('solves easy', () => {
    const s = hybrid.solve(Board.fromString(EASY));
    expect(s!.isSolved()).toBe(true);
  });

  it('solves hard', () => {
    const s = hybrid.solve(Board.fromString(HARD));
    expect(s!.isSolved()).toBe(true);
  });

  it('solves evil (17-clue)', () => {
    const s = hybrid.solve(Board.fromString(EVIL));
    expect(s!.isSolved()).toBe(true);
  });

  it('hasUniqueSolution', () => {
    expect(hybrid.hasUniqueSolution(Board.fromString(EASY))).toBe(true);
  });

  it('countSolutions', () => {
    expect(hybrid.countSolutions(Board.fromString(EASY), 2)).toBe(1);
  });
});
