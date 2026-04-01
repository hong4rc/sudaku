# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build          # tsc → dist/
npm run test           # vitest run
npm run test:watch     # vitest (watch mode)
npm run test:coverage  # vitest run --coverage
npm run lint           # eslint src/
npm run lint:fix       # eslint src/ --fix
node example.mjs       # full feature showcase
```

Run a single test file: `npx vitest run tests/board.test.ts`
Run a single test: `npx vitest run -t "solves hard puzzle"`

ESLint uses Airbnb-base style adapted for TypeScript. `no-bitwise` and `no-plusplus` are off (perf-critical bitmask code). All imports require `.js` extensions (`NodeNext` module resolution).

## Architecture

Pure TypeScript Sudoku library. Zero runtime dependencies, ~22KB gzipped.

### Two Board Representations

- **`board.ts` → `Board`**: Used by the **solver**. `place()` auto-propagates naked singles recursively for speed. Uses `Uint8Array(81)` + `Uint16Array(81)` candidate bitmasks + `Uint16Array(9)` row/col/box used masks.
- **`logic/logic-board.ts` → `LogicBoard`**: Used by **hints and difficulty grading**. `place()` does basic peer candidate removal only — no auto-propagation. Each deduction must be attributed to a specific technique.

### Solver (`solver/`)

Hybrid strategy: constraint propagation first, then:
- **< 20 empties** → `bitmask.ts`: MRV backtracking
- **>= 20 empties** → `dlx.ts`: Dancing Links (Algorithm X), flat `Uint16Array` nodes

### Logic Techniques (`logic/techniques.ts`)

All 13 techniques in one file. Chain of Responsibility — easiest to hardest: NakedSingle → HiddenSingle → NakedPair → HiddenPair → NakedTriple → HiddenTriple → PointingPair → BoxLineReduction → XWing → YWing → UniqueRectangle → Swordfish → SimpleColoring.

Each function takes `LogicBoard`, returns `TechniqueResult | null` without mutation.

### Key Conventions

- Candidates: **9-bit bitmasks** (bits 1–9). Digit `d` → `1 << d`. All = `0x3FE`.
- Cell index 0–80: `row = index / 9 | 0`, `col = index % 9`.
- Pre-computed lookups: `ROW[]`, `COL[]`, `BOX[]`, `PEERS[]`, `HOUSE_INDICES[]` in `board.ts`.
- `Sudaku` class in `sudaku.ts` is the public facade wrapping all features.

### Other Modules

- `generator.ts`: Fill diagonal boxes → solve → symmetric clue removal with uniqueness check.
- `game.ts`: `SudokuGame` — undo/redo, pencil marks, move validation, conflict detection.
- `analysis.ts`: Symmetry detection, clue distribution, technique breakdown, rating.
- `serialization.ts`: SDK/OpenSudoku formats, pretty-print, JSON game state.
