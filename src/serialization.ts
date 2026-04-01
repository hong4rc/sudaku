import type { GameState } from './game.js';

/**
 * Serialization — Import/export various Sudoku formats.
 */

// ---- SDK Format (standard 81-char) ----

/** Convert to SDK format: '.' for empty */
export function toSDK(puzzle: string): string {
  let sdk = '';
  for (let i = 0; i < 81; i++) {
    const ch = puzzle[i];
    sdk += (ch === '0') ? '.' : ch;
  }
  return sdk;
}

/** Parse from SDK format ('.' or '0' for empty) */
export function fromSDK(sdk: string): string {
  let puzzle = '';
  for (const ch of sdk) {
    if (ch >= '1' && ch <= '9') puzzle += ch;
    else if (ch === '.' || ch === '0') puzzle += '0';
  }
  return puzzle;
}

// ---- OpenSudoku Format ----
// Format: "cell1|cell2|...|cell81" where each cell is "value" or "0|note1,note2,..."

export function toOpenSudoku(puzzle: string, pencilMarks?: number[][]): string {
  const parts: string[] = [];
  for (let i = 0; i < 81; i++) {
    const v = puzzle[i] === '.' ? '0' : puzzle[i];
    if (v !== '0') {
      parts.push(v);
    } else if (pencilMarks && pencilMarks[i].length > 0) {
      parts.push(`0|${pencilMarks[i].join(',')}`);
    } else {
      parts.push('0');
    }
  }
  return parts.join('|');
}

export function fromOpenSudoku(data: string): { puzzle: string; pencilMarks: number[][] } {
  const parts = data.split('|');
  let puzzle = '';
  const pencilMarks: number[][] = [];

  let i = 0;
  while (i < parts.length && puzzle.length < 81) {
    const v = parts[i];
    if (v >= '1' && v <= '9') {
      puzzle += v;
      pencilMarks.push([]);
      i++;
    } else if (v === '0') {
      // Check if next part is a note list (contains comma or is a single digit after 0)
      if (i + 1 < parts.length && parts[i + 1].includes(',')) {
        puzzle += '0';
        pencilMarks.push(parts[i + 1].split(',').map(Number).filter(n => n >= 1 && n <= 9));
        i += 2;
      } else {
        puzzle += '0';
        pencilMarks.push([]);
        i++;
      }
    } else {
      i++;
    }
  }

  return { puzzle, pencilMarks };
}

// ---- Pretty Print ----

export function prettyPrint(puzzle: string): string {
  const lines: string[] = [];
  for (let r = 0; r < 9; r++) {
    if (r === 3 || r === 6) lines.push('------+-------+------');
    let line = '';
    for (let c = 0; c < 9; c++) {
      if (c === 3 || c === 6) line += '| ';
      const ch = puzzle[r * 9 + c];
      line += (ch === '0' ? '.' : ch) + ' ';
    }
    lines.push(line.trimEnd());
  }
  return lines.join('\n');
}

/** Compact one-line format with separators */
export function prettyOneLine(puzzle: string): string {
  let s = '';
  for (let i = 0; i < 81; i++) {
    if (i > 0 && i % 9 === 0) s += '/';
    const ch = puzzle[i];
    s += ch === '0' ? '.' : ch;
  }
  return s;
}

// ---- JSON Game State ----

export function gameStateToJSON(state: GameState): string {
  return JSON.stringify({
    puzzle: state.puzzle,
    solution: state.solution,
    cells: state.cells,
    pencilMarks: state.pencilMarks,
    startTime: state.startTime,
    completed: state.completed,
    undoStack: state.undoStack,
    redoStack: state.redoStack,
  });
}

export function gameStateFromJSON(json: string): GameState {
  const data = JSON.parse(json);
  return {
    puzzle: data.puzzle,
    solution: data.solution,
    cells: data.cells,
    pencilMarks: data.pencilMarks,
    startTime: data.startTime,
    completed: data.completed,
    undoStack: data.undoStack ?? [],
    redoStack: data.redoStack ?? [],
  };
}
