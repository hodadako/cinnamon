# Semantic Commit Message

Use semantic commit messages for repository changes.

## Format

```text
<type>(<scope>): <summary>
```

`scope` is optional.

## Types

- `feat`: user-facing feature or new capability
- `fix`: bug fix
- `docs`: documentation-only change
- `refactor`: code change that does not alter behavior
- `test`: tests or test infrastructure
- `chore`: maintenance, tooling, dependency, or repo housekeeping
- `ci`: CI/CD configuration
- `build`: build system or packaging
- `perf`: performance improvement
- `revert`: revert a previous change

## Examples

```text
docs: add MVP implementation spec
feat(slack): add repo subscription command
fix(github): verify webhook signatures
chore: add agent instructions
```

## Rules

1. Use lowercase type names.
2. Keep the summary imperative and concise.
3. Do not end the summary with a period.
4. Prefer a scope when it clarifies the affected area.
5. Use `docs` for PRD, spec, and instruction-only changes.
