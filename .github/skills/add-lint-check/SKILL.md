---
name: add-lint-check
description: Adds or changes a check in skill_lint.py, with a regression test and a row in the README's checks table. Use when asked to add, tune, or remove a lint rule or heuristic, even if the request only describes a false positive or a skill the linter missed.
---
# Add or change a lint check

1. Find the source. Every check maps to a documented limit or a published finding.
   Put the source in the module docstring next to the check's name.
2. Write the failing case first: add a fixture to `test_skill_lint.py` that the
   current linter gets wrong. Prefer a real public SKILL.md over an invented one.
3. Change the check in `skill_lint.py`. Keep patterns line-local and standard-library only.
4. Run `python3 test_skill_lint.py` and `python3 skill_lint.py .github`. Both must pass.
5. Update the checks table in `README.md` so the docs match the behavior.

Done means all four places agree: docstring, test, code, README.
Do not skip step 2 because the change looks small; false positives are how a linter loses trust.
