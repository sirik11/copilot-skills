# The Description Is the Skill

*GitHub Copilot now loads agent skills on demand, and it decides from one short field. Half the skills in GitHub's own community collection don't say when to use them.*

![Cover image reading "The description is the skill" beside a printed SKILL.md. The description line in its frontmatter is highlighted and circled in red with the note Copilot reads this first, and the instructions below it are faded with the note loaded only if picked.](../figures/cover-the-description-is-the-skill.png)

My last article argued that most of what we put in steering files shouldn't load on every task. Task-specific know-how, like how your team adds an API endpoint or debugs a failing workflow, belongs somewhere the agent reaches for only when it needs it. In GitHub Copilot, that place is now an agent skill.

[Agent skills](https://docs.github.com/en/copilot/concepts/agents/about-agent-skills) work across Copilot cloud agent, Copilot code review, the Copilot CLI, the GitHub Copilot app, and agent mode in VS Code and JetBrains IDEs. They follow an [open specification](https://agentskills.io/specification), so Copilot also reads skills from `.claude/skills` and `.agents/skills`, and the same folder works in other agents that support the format.

Skills are easy to write. Whether one ever runs comes down to a line most people write last.

## What is a skill, really?

A skill is a folder with a `SKILL.md` file in it: YAML frontmatter with a `name` and a `description`, then Markdown instructions. It can also carry scripts, reference documents, and templates. Project skills live in `.github/skills/`.

What sets skills apart from custom instructions is when they load. The [Agent Skills specification](https://agentskills.io/specification) defines three stages, and [VS Code's documentation](https://code.visualstudio.com/docs/copilot/customization/agent-skills) describes Copilot following them.

![Three stacked layers showing when each part of a skill loads. Always: the name and description of every installed skill, about 100 tokens each. When the skill is picked: the SKILL.md body, recommended under 5,000 tokens and 500 lines. When the instructions point to it: bundled scripts, references, and assets. A note marks the first layer as the only part paid for on every task.](../figures/fig1-what-loads-when.png)

1. **Always:** the name and description of every installed skill, about 100 tokens each.
2. **When the skill is picked:** the full `SKILL.md` body. The spec recommends keeping it under 5,000 tokens and 500 lines.
3. **When the instructions point to it:** bundled files. VS Code's docs are explicit that a file the instructions don't reference won't be loaded.

That's the property steering files lack. Twenty installed skills cost roughly 2,000 tokens until one of them is needed.

## Do skills actually make agents better?

On average, yes, with more caveats than the launch posts suggest.

[SkillsBench](https://arxiv.org/abs/2602.12670) ran 87 tasks across eight domains, with and without curated skills, on 18 model and harness combinations. Curated skills raised the average pass rate from 33.9% to 50.5%. The gain depended on the configuration, from 4.1 to 25.7 percentage points, and "focused Skills with at most three modules outperform larger or exhaustive bundles."

![Bar chart of average pass rate on 87 SkillsBench tasks across 18 model and harness configurations: 33.9 percent without skills and 50.5 percent with curated skills, a gain of 16.6 percentage points. A note says the gain ranged from 4.1 to 25.7 points depending on the configuration.](../figures/fig2-skillsbench.png)

The [paper's first version](https://arxiv.org/abs/2602.12670v1) reported two more findings worth knowing. The gain ranged from 4.5 points for software engineering tasks to 51.9 for healthcare. And skills the models wrote for themselves "provide no benefit on average." Asking Copilot to write its own skill and committing the result is not a shortcut.

Skills can also hurt. A [study of skill-induced failures](https://arxiv.org/abs/2608.11888) found 307 cases where a skill made an agent fail or run less efficiently. Those failures were "rarely caused by obviously irrelevant skills"; skills that looked relevant led the agent to implement the task wrong or leave parts out. The biggest cost problem was that skills "turn validation checklists and construction recipes into mandatory work."

A skill is not free help. It's code that runs inside the agent's reasoning, and it deserves the same care.

## Why does the description matter so much?

Because it's the only part Copilot sees when it decides. [GitHub's documentation](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills) says so directly: "Copilot will decide when to use your skills based on your prompt and the skill's description." The body, the scripts, and the examples load only after that decision. The specification's guide to [optimizing descriptions](https://agentskills.io/skill-creation/optimizing-descriptions) puts it more bluntly: the description "carries the entire burden of triggering."

A great skill with a vague description never runs. A broad description runs on prompts it shouldn't, which is how you get the failures above.

![Red-pen markup of a skill description. The original, Helps with tests, is struck through. The rewrite reads: Runs the test suite with the project's flags and fixes failures without weakening assertions. Use when tests fail, when asked to run or fix tests, or before opening a pull request, even if the user only says the build is red. Brackets label its three parts: what it does, when to use it, and the words a developer actually types.](../figures/fig3-before-after.png)

The specification gives the pattern: what the skill does, when to use it, and the keywords that identify the task. A study titled [From Anatomy to Smells](https://arxiv.org/abs/2607.01456) checked real skills against that pattern and found 32% of descriptions missing part of it.

I wrote a small linter for skills, described below, and ran it against the 444 skills in [github/awesome-copilot](https://github.com/github/awesome-copilot), GitHub's community collection. Half of them, 223, say what the skill does without saying when to use it. A typical one: "Website exploration for testing using Playwright MCP."

The rewrite in the figure does three things the original doesn't. It says what the skill does. It says when, in the words a developer would use. And it reaches for prompts where the connection isn't obvious, like "the build is red." The guide calls this being "pushy," and recommends writing the description as an instruction to the agent, starting with "Use this skill when."

Two smaller details can cost you a skill entirely. The `name` must be lowercase letters, numbers, and hyphens, and match the folder; VS Code's docs warn that invalid characters "cause the skill to silently fail to load." And two skills with near-identical descriptions compete for the same prompts, so the agent may load the wrong one.

## What belongs in the body?

Less than you think. The same study found that more than 99% of skills break at least one authoring best practice, and that those problems "rarely disappear as skills evolve." Three rules cover most of it.

**Keep it focused.** SkillsBench's best results came from skills with at most three modules. A skill that covers testing, deployment, and code style is three skills.

**Move detail into references.** Long material, like an error catalog or API tables, goes in `references/` and gets linked from the body, so it loads only when the task needs it.

**Add one check, not a ceremony.** Tell the agent how to confirm it's done. But heed the failure study: a long verification checklist becomes mandatory work on every task.

Here's a complete skill that follows all three:

```markdown
---
name: add-api-endpoint
description: Adds an HTTP endpoint to the API, including the route, request validation, error format, and a contract test. Use when asked to add, expose, or create an endpoint or route, even if the request only describes behavior, such as letting clients cancel an order.
---
1. Add the route under `api/routes/`. Validate the body against a schema in `api/schemas/`.
2. Return errors in the format in [references/error-format.md](references/error-format.md).
3. Add a contract test in `tests/contract/`. Run it and confirm it fails before the route exists.
```

## Skill or custom instruction?

GitHub's [recommendation](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills) is simple: custom instructions "for simple instructions relevant to almost every task," and skills "for more detailed instructions that Copilot should only access when relevant."

![Four index cards sorting where an instruction belongs. Relevant to almost every task: custom instructions. Detailed and needed only sometimes: a skill. Has side effects, like a deploy: a skill with disable-model-invocation set to true, so it runs only when you invoke it. Must never happen: a hook or CI check, such as branch protection or a required CI check.](../figures/fig4-where-it-goes.png)

Two cases need more care.

**Skills with side effects.** A deploy or release skill shouldn't run because the agent judged it relevant. In VS Code, `disable-model-invocation: true` keeps the skill in the `/` menu but stops Copilot from loading it on its own, so it runs only when you invoke it.

**Skills from someone else.** A skill can bundle scripts, and its `allowed-tools` field can pre-approve the shell. GitHub's docs warn that doing so "can allow attacker-controlled skills or prompt injections to execute arbitrary commands in your environment." That isn't hypothetical: a [security study of 98,380 skills](https://arxiv.org/abs/2602.06547) from two community registries confirmed 157 malicious ones. Read a skill before you install it; `gh skill preview` shows its contents without installing anything.

As with steering files, anything that must never happen belongs in a hook, a permission rule, or a CI check, not in instructions the model weighs.

## How do you know a skill triggers?

You test it. The optimization guide describes a trigger eval: write about 20 realistic prompts, half that should load the skill and half that shouldn't, run each a few times, and count how often the skill loads. The most useful negatives are near-misses, prompts that share words with your skill but need something else. "Fix the error message on the login page" mentions errors, but it shouldn't load your API endpoint skill.

Then run the real test: the same task with and without the skill, comparing the result and the cost. That's how SkillsBench measured its gains, and it's the only way to know a skill helps your team's work.

For the static checks, I wrote [skill_lint](https://github.com/sirik11/copilot-skills), a dependency-free linter for `SKILL.md` files. It flags invalid names, descriptions with no "when," near-duplicate descriptions, oversized bodies, missing bundled files, pre-approved shells, and deploy-style skills the agent can load on its own. It also reports how many tokens your skill descriptions add to every session.

![Terminal output of skill_lint on four example skills. Testing is flagged for an invalid name, no trigger, and a three-word description. Two API skills are flagged for missing triggers and for overlapping descriptions, and one for first-person voice. A deploy skill is flagged for a missing script, a pre-approved shell, and side effects without disable-model-invocation.](../figures/linter-output.png)

## The description is the skill

Skills solve the problem steering files created. Detailed, task-specific know-how no longer has to sit in the context of every task. But they move the whole decision into one field of a few sentences, written for an agent that has never seen your codebase.

Write that field first. Say what the skill does, when to use it, and the words your team types when they need it. Then test it like code.

*The linter, the example skills, and every figure in this piece are open source on GitHub: [sirik11/copilot-skills](https://github.com/sirik11/copilot-skills).*

## Sources

- [About agent skills](https://docs.github.com/en/copilot/concepts/agents/about-agent-skills) and [Adding agent skills for GitHub Copilot](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills), GitHub Docs
- [Agent Skills in VS Code](https://code.visualstudio.com/docs/copilot/customization/agent-skills), Visual Studio Code documentation
- [Agent Skills specification](https://agentskills.io/specification) and [Optimizing skill descriptions](https://agentskills.io/skill-creation/optimizing-descriptions), agentskills.io
- [SkillsBench: Benchmarking How Well Agent Skills Work Across Diverse Tasks](https://arxiv.org/abs/2602.12670), Li et al., February 2026
- [From Anatomy to Smells: An Empirical Study of SKILL.md in Agent Skills](https://arxiv.org/abs/2607.01456), Hong, Imani, and Ahmed, July 2026
- [Agent Skills Can Be Harmful: An Empirical Study of Skill-Induced Failures in LLM Agents](https://arxiv.org/abs/2608.11888), Dong et al., August 2026
- ["Do Not Mention This to the User": Detecting and Understanding Malicious Agent Skills in the Wild](https://arxiv.org/abs/2602.06547), Liu et al., February 2026
- [github/awesome-copilot](https://github.com/github/awesome-copilot), linted at commit 143a3d9, October 2, 2026
