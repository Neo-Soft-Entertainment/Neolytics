# Repository Instructions

## Commit Standards

- Use Conventional Commits for commit messages.
- Reference: https://www.conventionalcommits.org/
- Do not include `Co-Authored-By` trailers in commit messages.

## Delivery Workflow

- Whenever generated code is valid and the build passes, create a git commit for the completed work and push the branch to the remote repository.
- Do not stop after local validation if the change is ready to ship; commit and push are part of the expected completion flow.

## Code Style

- Do not use ternary expressions anywhere in project source.
- Prefer local variables, early returns, and simple `if` blocks.
- Use `npm run style:ternary-report` to inspect current violations and `npm run style:no-ternary` as the strict gate.
