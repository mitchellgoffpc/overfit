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
- Keep flows simple and consistent: store actions should return straightforward `{ ok, error }` results (never throw), and pages should be thin.
- Minimize defensive bloat. Assume successful responses include expected fields unless there is a clear reason not to.
- Tests are located in a top-level `tests` folder next to the `src` folder in each subproject.

## Committing changes

- Always run the linter and tests before committing.
- Run tests with `npm test`.
- Run the linter with `npm run lint`.
- Use single-line commit messages in plain English.
- Do not use conventional commit prefixes or add signatures (e.g. Co-Authored By)
