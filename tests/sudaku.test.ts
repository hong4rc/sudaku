import { describe, it, expect } from 'vitest';
import { Sudaku } from '../src/sudaku.js';
import { SudokuGame } from '../src/game.js';
import { toSDK, fromSDK, toOpenSudoku, fromOpenSudoku, prettyPrint, prettyOneLine, gameStateToJSON, gameStateFromJSON } from '../src/serialization.js';
import { analyze, rate } from '../src/analysis.js';

const sdk = new Sudaku();
const EASY = '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
const HARD = '800000000003600000070090200050007000000045700000100030001000068008500010090000400';

// ---- Solver ----
describe('Sudaku.solve', () => {
  it('solves valid puzzle', () => {
    const r = sdk.solve(EASY);
    expect(r.solved).toBe(true);
    expect(r.solution).toHaveLength(81);
    expect(r.solution).not.toContain('0');
  });

  it('returns false for invalid', () => {
    const r = sdk.solve('invalid');
    expect(r.solved).toBe(false);
  });

  it('solveWithTimeout returns result', () => {
    const r = sdk.solveWithTimeout(HARD, 5000);
    expect(r?.solved).toBe(true);
  });

  it('countSolutions returns 1 for unique', () => {
    expect(sdk.countSolutions(EASY)).toBe(1);
  });

  it('hasUniqueSolution', () => {
    expect(sdk.hasUniqueSolution(EASY)).toBe(true);
  });

  it('solveBatch solves multiple', () => {
    const results = sdk.solveBatch([EASY, HARD]);
    expect(results).toHaveLength(2);
    expect(results.every(r => r.solved)).toBe(true);
  });
});

// ---- Logic ----
describe('Sudaku.solveLogic', () => {
  it('solves easy puzzle by logic', () => {
    const r = sdk.solveLogic(EASY);
    expect(r.solved).toBe(true);
    expect(r.totalSteps).toBeGreaterThan(0);
    expect(r.steps.length).toBe(r.totalSteps);
  });
});

// ---- Hints ----
describe('Sudaku.hint', () => {
  it('returns a hint', () => {
    const r = sdk.hint(EASY);
    expect(r.found).toBe(true);
    expect(r.hint).not.toBeNull();
    expect(r.hint!.technique).toBeTruthy();
    expect(r.hint!.explanation).toBeTruthy();
  });

  it('allHints returns multiple', () => {
    const r = sdk.allHints(EASY);
    expect(r.length).toBeGreaterThan(0);
  });

  it('progressiveHint has 3 levels', () => {
    const r = sdk.progressiveHint(EASY);
    expect(r.found).toBe(true);
    expect(r.level1).toBeTruthy();
    expect(r.level2).toBeTruthy();
    expect(r.level3).not.toBeNull();
  });
});

// ---- Difficulty ----
describe('Sudaku.difficulty', () => {
  it('classifies easy puzzle', () => {
    const d = sdk.difficulty(EASY);
    expect(d.label).toBe('Easy');
    expect(d.score).toBeLessThan(20);
    expect(d.solvableByLogic).toBe(true);
    expect(d.techniquesUsed.length).toBeGreaterThan(0);
  });
});

// ---- Validate ----
describe('Sudaku.validate', () => {
  it('validates correct puzzle', () => {
    const v = sdk.validate(EASY);
    expect(v.valid).toBe(true);
    expect(v.solvable).toBe(true);
    expect(v.unique).toBe(true);
    expect(v.clueCount).toBe(30);
  });

  it('detects duplicates', () => {
    const bad = '550070000600195000098000060800060003400803001700020006060000280000419005000080079';
    const v = sdk.validate(bad);
    expect(v.valid).toBe(false);
    expect(v.errors.some(e => e.type === 'duplicate_row')).toBe(true);
  });
});

// ---- Generator ----
describe('Sudaku.generate', () => {
  it('generates valid unique puzzle', () => {
    const g = sdk.generate({ minClues: 25, symmetric: true });
    expect(g.puzzle).toHaveLength(81);
    expect(g.solution).toHaveLength(81);
    expect(sdk.hasUniqueSolution(g.puzzle)).toBe(true);
  });

  it('generateBatch produces multiple', () => {
    const b = sdk.generateBatch(3);
    expect(b).toHaveLength(3);
    for (const g of b) {
      expect(g.puzzle).toHaveLength(81);
    }
  });
});

// ---- Candidates ----
describe('Sudaku.candidates', () => {
  it('returns 81 masks', () => {
    const c = sdk.candidates(EASY);
    expect(c).toHaveLength(81);
    expect(c[0]).toBe(0); // filled cell
  });

  it('candidateDigits returns arrays', () => {
    const d = sdk.candidateDigits(EASY);
    expect(d).toHaveLength(81);
    expect(d[0]).toEqual([]); // filled cell
    expect(d[2].length).toBeGreaterThan(0); // empty cell
  });
});

// ---- Game State ----
describe('Game State', () => {
  it('creates game and places digit', () => {
    const game = sdk.createGame(EASY);
    const first = EASY.indexOf('0');
    const sol = sdk.solve(EASY).solution!;
    game.place(first, Number(sol[first]));
    expect(game.isCorrect(first)).toBe(true);
  });

  it('undo/redo works', () => {
    const game = sdk.createGame(EASY);
    const first = EASY.indexOf('0');
    game.place(first, 1);
    expect(game.getState().cells[first]).toBe(1);
    game.undo();
    expect(game.getState().cells[first]).toBe(0);
    game.redo();
    expect(game.getState().cells[first]).toBe(1);
  });

  it('pencil marks toggle', () => {
    const game = sdk.createGame(EASY);
    const first = EASY.indexOf('0');
    game.togglePencilMark(first, 3);
    expect(game.getState().pencilMarks[first]).toContain(3);
    game.togglePencilMark(first, 3);
    expect(game.getState().pencilMarks[first]).not.toContain(3);
  });

  it('detects errors', () => {
    const game = sdk.createGame(EASY);
    const first = EASY.indexOf('0');
    const sol = sdk.solve(EASY).solution!;
    const wrong = Number(sol[first]) === 1 ? 2 : 1;
    game.place(first, wrong);
    expect(game.getErrors()).toContain(first);
  });

  it('detects conflicts', () => {
    const game = sdk.createGame(EASY);
    // Place same digit as an existing given in same row
    const first = EASY.indexOf('0');
    const r = Math.floor(first / 9);
    let givenDigit = 0;
    for (let c = 0; c < 9; c++) {
      const v = Number(EASY[r * 9 + c]);
      if (v !== 0) { givenDigit = v; break; }
    }
    game.place(first, givenDigit);
    expect(game.getConflicts().length).toBeGreaterThan(0);
  });

  it('save/load roundtrips', () => {
    const game = sdk.createGame(EASY);
    game.place(EASY.indexOf('0'), 1);
    const json = sdk.saveGame(game.getState());
    const loaded = sdk.loadGame(json);
    expect(loaded.getState().puzzle).toBe(EASY);
    expect(loaded.getState().cells[EASY.indexOf('0')]).toBe(1);
  });
});

// ---- Serialization ----
describe('Serialization', () => {
  it('SDK roundtrip', () => {
    const s = toSDK(EASY);
    expect(s).toHaveLength(81);
    expect(s).toContain('.');
    expect(fromSDK(s)).toBe(EASY);
  });

  it('prettyPrint formats correctly', () => {
    const p = prettyPrint(EASY);
    expect(p).toContain('------+-------+------');
    expect(p.split('\n')).toHaveLength(11);
  });

  it('prettyOneLine has slashes', () => {
    const p = prettyOneLine(EASY);
    expect(p.split('/').length).toBe(9);
  });

  it('OpenSudoku roundtrip', () => {
    const os = toOpenSudoku(EASY);
    const { puzzle } = fromOpenSudoku(os);
    expect(puzzle).toHaveLength(81);
  });

  it('gameState JSON roundtrip', () => {
    const game = sdk.createGame(EASY);
    const json = gameStateToJSON(game.getState());
    const state = gameStateFromJSON(json);
    expect(state.puzzle).toBe(EASY);
  });
});

// ---- Analysis ----
describe('Analysis', () => {
  it('analyzes puzzle fully', () => {
    const a = analyze(EASY);
    expect(a.clueCount).toBe(30);
    expect(a.emptyCells).toBe(51);
    expect(a.valid).toBe(true);
    expect(a.solutionCount).toBe(1);
    expect(a.symmetry).toBe('rotational-180');
    expect(a.techniques.length).toBeGreaterThan(0);
    expect(a.difficulty.label).toBeTruthy();
    expect(a.clueDistribution.rows).toHaveLength(9);
  });

  it('rates puzzle', () => {
    const r = rate(EASY);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.rating).toBeTruthy();
    expect(r.benchmark).toBeTruthy();
  });
});
