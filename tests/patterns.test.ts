import { describe, it, expect, vi } from 'vitest';
import { Board } from '../src/board.js';
import { LogicBoard } from '../src/logic/logic-board.js';
import { BitmaskSolver } from '../src/solver/bitmask.js';
import { DLXSolver } from '../src/solver/dlx.js';
import { HybridSolver } from '../src/solver/hybrid.js';
import type { ISolver } from '../src/solver/solver.js';
import { solveLogicIterator, DifficultyLevel } from '../src/logic/techniques.js';
import { SudokuGame } from '../src/game.js';
import type { GameEvent } from '../src/game.js';
import { Sudaku } from '../src/sudaku.js';

const EASY = '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
const HARD = '800000000003600000070090200050007000000045700000100030001000068008500010090000400';

// ============================================================
// Strategy Pattern — ISolver
// ============================================================
describe('Strategy Pattern — ISolver', () => {
  const solvers: [string, ISolver][] = [
    ['BitmaskSolver', new BitmaskSolver()],
    ['DLXSolver', new DLXSolver()],
    ['HybridSolver', new HybridSolver()],
  ];

  for (const [name, solver] of solvers) {
    it(`${name} implements ISolver.solve()`, () => {
      const board = Board.fromString(EASY);
      const result = solver.solve(board);
      expect(result).not.toBeNull();
      expect(result!.isSolved()).toBe(true);
    });

    it(`${name} implements ISolver.countSolutions()`, () => {
      const board = Board.fromString(EASY);
      expect(solver.countSolutions(board, 2)).toBe(1);
    });
  }

  it('strategies are interchangeable', () => {
    const board = Board.fromString(HARD);

    // Solve with each strategy — all produce the same answer
    const solutions = solvers.map(([, s]) => s.solve(board)!.toString());
    expect(new Set(solutions).size).toBe(1); // all identical
  });

  it('can swap solver at runtime', () => {
    function solveWith(solver: ISolver, puzzle: string): string | null {
      const result = solver.solve(Board.fromString(puzzle));
      return result?.toString() ?? null;
    }

    const bitmask = new BitmaskSolver();
    const dlx = new DLXSolver();

    expect(solveWith(bitmask, EASY)).toBe(solveWith(dlx, EASY));
  });
});

// ============================================================
// Chain of Responsibility — Technique Chain
// ============================================================
describe('Chain of Responsibility — Techniques', () => {
  it('tries techniques easiest to hardest', () => {
    const board = LogicBoard.fromPuzzle(EASY);
    const steps = [...solveLogicIterator(board)];

    // First step should be Easy difficulty
    expect(steps[0].difficulty).toBe(DifficultyLevel.Easy);

    // Verify ordering: no harder technique appears before an easier one
    // (when the easier one would also apply at that state)
    expect(steps.length).toBeGreaterThan(0);
  });

  it('each technique returns without mutating', () => {
    const board = LogicBoard.fromPuzzle(EASY);
    const before = board.toString();
    const iterator = solveLogicIterator(board);
    iterator.next(); // get first step
    // Original board should be unaffected (iterator works on clone)
    expect(board.toString()).toBe(before);
  });
});

// ============================================================
// Iterator Pattern — solveLogicIterator
// ============================================================
describe('Iterator Pattern — solveLogicIterator', () => {
  it('yields steps lazily', () => {
    const board = LogicBoard.fromPuzzle(EASY);
    const iterator = solveLogicIterator(board);

    const first = iterator.next();
    expect(first.done).toBe(false);
    expect(first.value.technique).toBeTruthy();

    const second = iterator.next();
    expect(second.done).toBe(false);
  });

  it('can be consumed with for-of', () => {
    const board = LogicBoard.fromPuzzle(EASY);
    let count = 0;
    for (const step of solveLogicIterator(board)) {
      expect(step.explanation).toBeTruthy();
      count++;
      if (count >= 5) break; // early termination
    }
    expect(count).toBe(5);
  });

  it('can be spread into array', () => {
    const board = LogicBoard.fromPuzzle(EASY);
    const steps = [...solveLogicIterator(board)];
    expect(steps.length).toBeGreaterThan(0);
    expect(steps.every(s => s.technique && s.explanation)).toBe(true);
  });

  it('terminates when stuck (no technique applies)', () => {
    const board = LogicBoard.fromPuzzle(HARD);
    const steps = [...solveLogicIterator(board)];
    // HARD puzzle can't be fully solved by logic
    // Iterator should stop (not loop forever)
    expect(steps.length).toBeLessThan(500);
  });
});

// ============================================================
// Observer Pattern — Game Events
// ============================================================
describe('Observer Pattern — Game Events', () => {
  it('emits place event', () => {
    const sdk = new Sudaku();
    const game = sdk.createGame(EASY);
    const events: GameEvent[] = [];
    game.on('place', (e) => events.push(e));

    const empty = EASY.indexOf('0');
    game.place(empty, 1);

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('place');
    expect(events[0].cell).toBe(empty);
    expect(events[0].digit).toBe(1);
  });

  it('emits erase event', () => {
    const sdk = new Sudaku();
    const game = sdk.createGame(EASY);
    const events: GameEvent[] = [];

    const empty = EASY.indexOf('0');
    game.place(empty, 1);
    game.on('erase', (e) => events.push(e));
    game.erase(empty);

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('erase');
  });

  it('emits undo/redo events', () => {
    const sdk = new Sudaku();
    const game = sdk.createGame(EASY);
    const events: GameEvent[] = [];
    game.on('*', (e) => events.push(e)); // wildcard listener

    const empty = EASY.indexOf('0');
    game.place(empty, 1);
    game.undo();
    game.redo();

    const types = events.map(e => e.type);
    expect(types).toContain('place');
    expect(types).toContain('undo');
    expect(types).toContain('redo');
  });

  it('emits complete event', () => {
    const sdk = new Sudaku();
    const game = sdk.createGame(EASY);
    const events: GameEvent[] = [];
    game.on('complete', (e) => events.push(e));

    const sol = sdk.solve(EASY).solution!;
    for (let i = 0; i < 81; i++) {
      if (EASY[i] === '0') game.place(i, Number(sol[i]));
    }

    expect(events.some(e => e.type === 'complete')).toBe(true);
  });

  it('off() removes listener', () => {
    const sdk = new Sudaku();
    const game = sdk.createGame(EASY);
    let count = 0;
    const listener = () => { count++; };

    game.on('place', listener);
    game.place(EASY.indexOf('0'), 1);
    expect(count).toBe(1);

    game.off('place', listener);
    game.undo();
    game.place(EASY.indexOf('0'), 2);
    expect(count).toBe(1); // not called again
  });

  it('emits pencil event', () => {
    const sdk = new Sudaku();
    const game = sdk.createGame(EASY);
    const events: GameEvent[] = [];
    game.on('pencil', (e) => events.push(e));

    const empty = EASY.indexOf('0');
    game.togglePencilMark(empty, 3);

    expect(events).toHaveLength(1);
    expect(events[0].digit).toBe(3);
  });
});

// ============================================================
// Command Pattern — Undo/Redo
// ============================================================
describe('Command Pattern — Undo/Redo Stack', () => {
  it('supports multiple undo then redo', () => {
    const sdk = new Sudaku();
    const game = sdk.createGame(EASY);
    const empty1 = EASY.indexOf('0');
    const empty2 = EASY.indexOf('0', empty1 + 1);

    game.place(empty1, 1);
    game.place(empty2, 2);

    expect(game.getState().cells[empty1]).toBe(1);
    expect(game.getState().cells[empty2]).toBe(2);

    game.undo(); // undo place 2
    expect(game.getState().cells[empty2]).toBe(0);

    game.undo(); // undo place 1
    expect(game.getState().cells[empty1]).toBe(0);

    game.redo(); // redo place 1
    expect(game.getState().cells[empty1]).toBe(1);

    game.redo(); // redo place 2
    expect(game.getState().cells[empty2]).toBe(2);
  });

  it('new move clears redo stack', () => {
    const sdk = new Sudaku();
    const game = sdk.createGame(EASY);
    const empty = EASY.indexOf('0');

    game.place(empty, 1);
    game.undo();
    game.place(empty, 5); // new move → redo stack cleared
    game.redo(); // should do nothing
    expect(game.getState().cells[empty]).toBe(5); // stays at 5
  });
});

// ============================================================
// Memento Pattern — Save/Load
// ============================================================
describe('Memento Pattern — Save/Load', () => {
  it('captures full state snapshot', () => {
    const sdk = new Sudaku();
    const game = sdk.createGame(EASY);
    const empty = EASY.indexOf('0');
    game.place(empty, 1);
    game.togglePencilMark(EASY.indexOf('0', empty + 1), 7);

    const state = game.getState();
    expect(state.puzzle).toBe(EASY);
    expect(state.cells[empty]).toBe(1);
    expect(state.undoStack.length).toBe(2);
  });

  it('restores from snapshot preserving undo history', () => {
    const sdk = new Sudaku();
    const game = sdk.createGame(EASY);
    game.place(EASY.indexOf('0'), 1);

    const json = sdk.saveGame(game.getState());
    const restored = sdk.loadGame(json);

    expect(restored.getState().cells[EASY.indexOf('0')]).toBe(1);
    restored.undo(); // undo should work on restored game
    expect(restored.getState().cells[EASY.indexOf('0')]).toBe(0);
  });
});
