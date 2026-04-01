import { LogicBoard } from './logic/logic-board.js';
import { Board, PEERS, maskDigits } from './board.js';
import * as hybrid from './solver/hybrid.js';

/**
 * Game State Management — Command + Observer + Memento patterns.
 *
 * Command: Move objects stored in undo/redo stacks.
 * Observer: Event listeners notified on state changes.
 * Memento: GameState snapshots for save/load.
 */

// ---- Observer Pattern ----

export type GameEventType = 'place' | 'erase' | 'pencil' | 'undo' | 'redo' | 'complete' | 'error';

export interface GameEvent {
  type: GameEventType;
  cell?: number;
  digit?: number;
}

export type GameListener = (event: GameEvent) => void;

// ---- Command Pattern ----

export interface Move {
  type: 'place' | 'erase' | 'pencil';
  cell: number;
  digit: number;
  /** State before this move (for undo) */
  prevValue: number;
  prevPencilMarks: number[];
}

export interface GameState {
  /** Original puzzle (immutable) */
  puzzle: string;
  /** Solution (computed once) */
  solution: string;
  /** Current cell values (0 = empty) */
  cells: number[];
  /** Pencil marks per cell (user-managed candidates) */
  pencilMarks: number[][];
  /** Undo stack */
  undoStack: Move[];
  /** Redo stack */
  redoStack: Move[];
  /** Start time (ms) */
  startTime: number;
  /** Whether the game is complete */
  completed: boolean;
}

export class SudokuGame {
  private state: GameState;
  private listeners: Map<GameEventType | '*', GameListener[]> = new Map();

  /** Observer Pattern — subscribe to game events. */
  on(event: GameEventType | '*', listener: GameListener): void {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event)!.push(listener);
  }

  /** Remove a listener. */
  off(event: GameEventType | '*', listener: GameListener): void {
    const list = this.listeners.get(event);
    if (!list) return;
    const idx = list.indexOf(listener);
    if (idx !== -1) list.splice(idx, 1);
  }

  private static readonly EMPTY: GameListener[] = [];

  private emit(event: GameEvent): void {
    for (const listener of this.listeners.get(event.type) ?? SudokuGame.EMPTY) listener(event);
    for (const listener of this.listeners.get('*') ?? SudokuGame.EMPTY) listener(event);
  }

  constructor(puzzle: string) {
    const board = Board.fromString(puzzle);
    const solved = hybrid.solve(board);
    if (!solved) throw new Error('Puzzle is not solvable');

    const logicBoard = LogicBoard.fromPuzzle(puzzle);
    const pencilMarks: number[][] = [];
    for (let i = 0; i < 81; i++) {
      pencilMarks.push(logicBoard.cells[i] !== 0 ? [] : maskDigits(logicBoard.candidates[i]));
    }

    this.state = {
      puzzle,
      solution: solved.toString(),
      cells: Array.from(board.cells),
      pencilMarks,
      undoStack: [],
      redoStack: [],
      startTime: Date.now(),
      completed: false,
    };
  }

  /** Place a digit in a cell. Returns true if the move was valid. */
  place(cell: number, digit: number): boolean {
    if (this.isGiven(cell)) return false;
    if (digit < 1 || digit > 9) return false;

    const prev = this.state.cells[cell];
    const prevPencil = [...this.state.pencilMarks[cell]];

    this.state.undoStack.push({ type: 'place', cell, digit, prevValue: prev, prevPencilMarks: prevPencil });
    this.state.redoStack = [];

    this.state.cells[cell] = digit;
    this.state.pencilMarks[cell] = [];

    // Auto-remove pencil marks from peers
    for (const peer of PEERS[cell]) {
      const marks = this.state.pencilMarks[peer];
      const idx = marks.indexOf(digit);
      if (idx !== -1) marks.splice(idx, 1);
    }

    this.checkCompletion();
    this.emit({ type: 'place', cell, digit });
    return true;
  }

  /** Erase a cell. */
  erase(cell: number): boolean {
    if (this.isGiven(cell)) return false;
    if (this.state.cells[cell] === 0) return false;

    const prev = this.state.cells[cell];
    this.state.undoStack.push({ type: 'erase', cell, digit: 0, prevValue: prev, prevPencilMarks: [] });
    this.state.redoStack = [];
    this.state.cells[cell] = 0;
    this.emit({ type: 'erase', cell });
    return true;
  }

  /** Toggle a pencil mark. */
  togglePencilMark(cell: number, digit: number): boolean {
    if (this.isGiven(cell) || this.state.cells[cell] !== 0) return false;

    const marks = this.state.pencilMarks[cell];
    const prevPencil = [...marks];
    this.state.undoStack.push({ type: 'pencil', cell, digit, prevValue: 0, prevPencilMarks: prevPencil });
    this.state.redoStack = [];

    const idx = marks.indexOf(digit);
    if (idx !== -1) marks.splice(idx, 1);
    else { marks.push(digit); marks.sort(); }
    this.emit({ type: 'pencil', cell, digit });
    return true;
  }

  /** Undo last move. */
  undo(): boolean {
    const move = this.state.undoStack.pop();
    if (!move) return false;

    this.state.redoStack.push(move);
    this.state.cells[move.cell] = move.prevValue;
    this.state.pencilMarks[move.cell] = [...move.prevPencilMarks];
    this.state.completed = false;
    this.emit({ type: 'undo', cell: move.cell });
    return true;
  }

  /** Redo last undone move. */
  redo(): boolean {
    const move = this.state.redoStack.pop();
    if (!move) return false;

    this.state.undoStack.push(move);
    if (move.type === 'place') {
      this.state.cells[move.cell] = move.digit;
      this.state.pencilMarks[move.cell] = [];
    } else if (move.type === 'erase') {
      this.state.cells[move.cell] = 0;
    } else {
      const marks = this.state.pencilMarks[move.cell];
      const idx = marks.indexOf(move.digit);
      if (idx !== -1) marks.splice(idx, 1);
      else { marks.push(move.digit); marks.sort(); }
    }
    this.checkCompletion();
    this.emit({ type: 'redo', cell: move.cell });
    return true;
  }

  /** Check if a cell value is correct (matches solution). */
  isCorrect(cell: number): boolean {
    if (this.state.cells[cell] === 0) return false;
    return this.state.cells[cell] === Number(this.state.solution[cell]);
  }

  /** Check if a move would be correct before placing. */
  wouldBeCorrect(cell: number, digit: number): boolean {
    return digit === Number(this.state.solution[cell]);
  }

  /** Get all errors (cells with wrong values). */
  getErrors(): number[] {
    const errors: number[] = [];
    for (let i = 0; i < 81; i++) {
      if (this.state.cells[i] !== 0 && !this.isGiven(i) && !this.isCorrect(i)) {
        errors.push(i);
      }
    }
    return errors;
  }

  /** Get conflicts (cells that violate Sudoku rules, regardless of solution). */
  getConflicts(): number[] {
    const conflicts = new Set<number>();
    for (let i = 0; i < 81; i++) {
      if (this.state.cells[i] === 0) continue;
      for (const peer of PEERS[i]) {
        if (this.state.cells[peer] === this.state.cells[i]) {
          conflicts.add(i);
          conflicts.add(peer);
        }
      }
    }
    return [...conflicts];
  }

  /** Is this cell a given (from the original puzzle)? */
  isGiven(cell: number): boolean {
    const ch = this.state.puzzle[cell];
    return ch !== '0' && ch !== '.';
  }

  /** Get elapsed time in seconds. */
  getElapsedTime(): number {
    return ((Date.now() - this.state.startTime) / 1000) | 0;
  }

  /** Get progress (0-1). */
  getProgress(): number {
    let filled = 0;
    for (let i = 0; i < 81; i++) if (this.state.cells[i] !== 0) filled++;
    return filled / 81;
  }

  /** Get the full game state (for save/load). */
  getState(): Readonly<GameState> {
    return this.state;
  }

  /** Load a saved game state. */
  static fromState(state: GameState): SudokuGame {
    const game = Object.create(SudokuGame.prototype);
    game.listeners = new Map();
    game.state = {
      ...state,
      cells: [...state.cells],
      pencilMarks: state.pencilMarks.map(m => [...m]),
      undoStack: state.undoStack.map(m => ({ ...m, prevPencilMarks: [...m.prevPencilMarks] })),
      redoStack: state.redoStack.map(m => ({ ...m, prevPencilMarks: [...m.prevPencilMarks] })),
    };
    return game;
  }

  private checkCompletion(): void {
    for (let i = 0; i < 81; i++) {
      if (this.state.cells[i] === 0 || this.state.cells[i] !== Number(this.state.solution[i])) return;
    }
    this.state.completed = true;
    this.emit({ type: 'complete' });
  }
}
