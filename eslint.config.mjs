import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    rules: {
      // ---- Airbnb-base spirit ----

      // Best practices
      'no-var': 'error',
      'prefer-const': 'error',
      'no-param-reassign': ['error', { props: false }],
      'no-return-assign': 'error',
      'no-else-return': 'error',
      'no-useless-return': 'error',
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'multi-line'],
      'no-multi-assign': 'error',
      'no-nested-ternary': 'error',
      'no-unneeded-ternary': 'error',
      'no-plusplus': 'off', // used extensively in perf-critical counting loops
      'radix': 'error',

      // Style
      'camelcase': ['error', { properties: 'never' }],
      'no-underscore-dangle': 'off', // allow _private
      'no-trailing-spaces': 'error',
      'no-multiple-empty-lines': ['error', { max: 1 }],
      'comma-dangle': ['error', 'always-multiline'],
      'semi': ['error', 'always'],
      'quotes': ['error', 'single', { avoidEscape: true }],
      'object-curly-spacing': ['error', 'always'],

      // TypeScript-specific
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],

      // Relaxed for performance-critical code (bitwise ops, short loops)
      'no-bitwise': 'off', // bitmask candidates are core to the library
      'no-continue': 'off', // used heavily in solver loops
      'no-labels': 'off',
      'no-restricted-syntax': 'off',
      'max-classes-per-file': 'off',
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', '*.mjs', '*.html'],
  },
);
