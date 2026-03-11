# Project

Underfit is an open-source model reporting dashboard for tracking experiments, metrics, and artifacts. It serves a similar role to Weights & Biases, with a focus on transparent, self-hostable reporting.

# Contributing

## How to contribute

- Keep code clean and concise. Do not add comments unless the logic is non-obvious.
- Avoid splitting statements across multiple lines without a readability benefit. If it fits under 160 characters, keep it on one line.
- Prefer minimal, clear abstractions over clever ones.
- Red diffs are better than green diffs.
- When practical, prefer `if/else if/else` blocks to multiple `if` blocks with early returns.
- Avoid short docstrings. Use docstrings only when detailed multi-line documentation is required.
- Tests are located in a top-level `tests` folder next to the `src` folder in each subproject.
- Optimize for code that is immediately understandable, even if it does less defensive checking.

## Frontend structure

- All API call logic in the frontend should live in the frontend/src/stores/, either as a function within the store, or as a top-level helper functions for things that don't need acceess to the store.
- Minimize defensive bloat. Assume successful API responses include all the expected fields unless there is a clear reason not to.

## Backend structure

- All validation logic is performed by the route handlers in backend/src/routes/.
- Anything that touches the database should live in backend/src/repositories.

## Committing changes

- Always run the linter and tests before committing.
- Run tests with `npm test`.
- Run the linter with `npm run lint`.
- Use single-line commit messages in plain English.
- Do not use conventional commit prefixes or add signatures (e.g. Co-Authored By)
