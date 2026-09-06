# 2026-09-06 DOC-8: safe docs organization

## Task

User requested additional documentation organization after DOC-7. Scope selected by user: safe all — no file moves/deletes, organize indexes, reading order, planning/arch/research navigation, and duplicated guidance.

## Scope

- Add a planning index without moving existing plan files.
- Clarify the boundary between `task-list.md`, `planning/`, `arch/`, `research/`, and raw inputs.
- Update root and docs-level indexes to point to planning/research entry points.
- Keep source-of-truth meaning unchanged.

## Files changed

- `README.md`
- `docs/README.md`
- `docs/planning/README.md`
- `docs/planning/HANDOFF.md`
- `docs/arch/README.md`
- `docs/research/README.md`
- `docs/task-list.md`
- `.agent/logs/2026-09-06_docs-safe-organization.md`

## Validation

- Current markdown relative link check (excluding `.archive/`): `checked 77 current md files, 285 relative links`, `broken 0`.
- Navigation consistency check: OK for `docs/planning/README.md`, `docs/README.md`, root `README.md`, `docs/arch/README.md`, `docs/research/README.md`, and `docs/task-list.md` DOC-8 entry.
- `git diff --check`: pass.
- Full repository markdown scan was also run for awareness and found only pre-existing `.archive/` relative links plus a literal placeholder link in `AGENTS.md`; these were not changed because the task scope excludes archived/history files and AGENTS is a rule source.

## Notes

- No files were moved, renamed, deleted, or archived.
- No implementation files were changed.
- Four code validations were skipped because this is docs-only; relative link and consistency checks are required instead.
