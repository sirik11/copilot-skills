---
name: run-tests
description: Runs the test suite with the project's flags and fixes failures without weakening assertions. Use when tests fail, when asked to run or fix tests, or before opening a pull request, even if the user only says the build is red.
---
1. Run `pnpm test --run`. Read the first failure before touching code.
2. Fix the code under test, not the assertion, unless the test is provably wrong.
3. Re-run the full suite. Report what failed, what you changed, and the final result.
