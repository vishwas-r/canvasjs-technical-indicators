# Contributing

A new indicator is one file in `src/indicators/`, named after the indicator in full (`commodity-channel-index.js`). Copy a similar file as a starting point.

1. Register it with `TechnicalIndicators.register({ ... })` (see "Write your own indicator" in the README). Put shared maths in `TechnicalIndicators.calculations` instead of repeating it.
2. Add checks to `test/run-tests.js`, ideally against values you calculated independently.
3. Run `npm test`, then `npm run build` (needs `npm install`) so `dist/` includes it, and run `npm test` again.
4. Add a row to the indicator table in the README and a line to `CHANGELOG.md`.

## Code style

- Plain ES5 that works in old browsers: no `let`/`const`, arrow functions, template literals, spread, destructuring, default parameters, or methods like `includes`, `Object.assign`, `forEach`, `map`, `indexOf`.
- Descriptive names, no abbreviations; `i`, `j` and `k` only as loop counters.
- No `if (variable)`: `0` and `false` are valid values. Use `isNullOrUndefined(value)` (exposed as `TechnicalIndicators.isNullOrUndefined`) and explicit comparisons.
- Reuse the helpers that exist before writing new ones, and match the indentation and brace style of the file you are editing.
