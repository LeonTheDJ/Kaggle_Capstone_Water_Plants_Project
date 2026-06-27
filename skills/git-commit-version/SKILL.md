---
name: git-commit-version
description: Naming conventions and safety checks for commits. Ensures commits are clean of secrets, use relative paths, and follow the specified format (with "!" for breaking changes).
---

# Git Commit Version Skill

This skill defines the workflow, formatting, and safety checks required before committing code in this repository.

---

## 1. Commit Naming Convention

All commit messages must follow the project's naming conventions:

- **Normal Commits**: Follow the format `<type>: <description>`
  - Examples:
    - `docs: add safety-check skill`
    - `backend: fix database connection pool`
- **Breaking Changes / Special Commits**: Must start with the exclamation mark `!` as the very first character.
  - Examples:
    - `! Add ADK playground agent with local Gemini API fallback`
    - `! docs: change api endpoints documentation`

---

## 2. Pre-Commit Safety Check

Before any commit is created, a safety check must be performed. If any safety check fails, **do not commit** and display a prominent warning to the user.

The safety check consists of:
1. **No Absolute Paths**: No file containing staged changes should contain absolute local paths (e.g., `C:\Users\<username>\...` or `C:/Users/<username>/...`). All paths must be relative to the workspace.
2. **No Hardcoded Secrets**: Ensure no active secrets (like `GEMINI_API_KEY="AQ..."` or other credential tokens) are included in the source files. They must reside in `.env` (which is git-ignored) or be provided dynamically.
3. **Ignored `.env`**: Confirm `.env` is not tracked by Git.

---

## 3. Automation Script

To run these checks programmatically before committing, use the helper script [safe_commit.py](scripts/safe_commit.py) in the `scripts/` directory:

```bash
python skills/git-commit-version/scripts/safe_commit.py "commit message" [--breaking]
```

- If `--breaking` is passed, the script ensures the commit message starts with `!`.
- If the safety checks fail, the commit is aborted and a warning is printed.
