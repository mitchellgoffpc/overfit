# Project

Underfit is an open-source model reporting dashboard for tracking experiments, metrics, and artifacts. It serves a similar role to Weights & Biases or Tensorboard, with a focus on transparent, self-hostable reporting. This repo contains the project frontend, written in react + typescript.

# Contributing

## How to contribute

- Keep code clean and concise. Do not add comments unless the logic is non-obvious.
- Avoid splitting statements across multiple lines without a readability benefit. If it fits under 160 characters, keep it on one line.
- Prefer minimal, clear abstractions over clever ones.
- Nested `if/else` blocks are ugly, but a single chain of `if/else if/else` blocks is better than multiple `if` blocks with early returns.
- Avoid short docstrings. Use docstrings only when detailed multi-line documentation is required.
- Tests are located in a top-level `tests` folder next to the `src` folder in each subproject.
- Optimize for code that is immediately understandable, even if it does less defensive checking.
- If a variable or function is only used once, inline it.

## Directory structure

- Minimize defensive bloat. Assume successful API responses include all the expected fields unless there is a clear reason not to.
- API logic must live in `src/stores/`. Never call `fetch`/`request`/`post` directly from pages or components.
- Stores are pure state declarations — only data, no methods. All action functions (fetches, mutations, helpers) are top-level exports in the same store file, using `useStore.setState()` / `useStore.getState()` to access state.
- Store files are ordered: interface, store definition, helper functions, action functions.

## Committing changes

- Always run the linter, type checker, and tests before committing.
- Run the linter with `npm run lint`, the typechecker with `npm run typecheck`, and the tests with `npm test`.
- Use single-line commit messages in plain English.
- Do not use conventional commit prefixes or add signatures (e.g. Co-Authored By)
- Run `git add` and `git commit` sequentially (or in one chained command), not in parallel, to avoid `.git/index.lock` conflicts.
