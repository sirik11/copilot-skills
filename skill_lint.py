"""
skill_lint: audit the agent skills (SKILL.md) in a repository.

Every check maps to a finding in "The Description Is the Skill":
  name         invalid name: VS Code silently skips the skill (exits non-zero)
  description  missing, or over the 1,024-character limit (exits non-zero)
  trigger      says what the skill does but not when to use it
               (the Confusing Skill Description smell, 32% of skills, arXiv 2607.01456)
  vague        too short for the agent to tell it apart from a near-miss
  voice        first person; descriptions are read by the agent, not spoken by it
  overlap      two skills whose descriptions compete for the same prompts
  size         body over the spec's 500-line / ~5,000-token guidance
  refs         points at a bundled file that does not exist (exits non-zero)
  tools        pre-approves shell or bash (GitHub's docs warn against it)
  on-demand    named for a side effect (deploy, release, ...) but the agent may load it on its own
  secret       something that looks like a credential (exits non-zero)

Heuristics, not proofs. Whether a description triggers is a question for a
trigger eval: run realistic prompts and count how often the skill loads.

Usage:  python3 skill_lint.py [repo_path]
"""
import re
import sys
from itertools import combinations
from pathlib import Path

SKIP = {".git", "node_modules", ".venv", "venv", "dist", "build", "__pycache__"}

NAME = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
WHEN = re.compile(r"\b(use (this |it )?(skill )?(when|for|whenever|if|any ?time)|(trigger|invoke|load) (it |this )?when"
                  r"|when (the user|asked|you|working|a |an |the |it |\w+ing\b)|whenever|if the user"
                  r"|for (tasks|requests|questions) (that|about|involving))", re.I)
FIRST_PERSON = re.compile(r"(^|[.!?]\s+)(I|I'm|I'll)\b|\bhelp me\b")
# judged on the name only: descriptions mention "migration" or "release notes" in passing
SIDE_EFFECT = re.compile(r"(^|-)(deploy|release|publish|migrate|rollback|delete|drop|send|merge)(-|$)")
SHELL = re.compile(r"\b(shell|bash)\b", re.I)
# concrete bundled files only: a path with an extension and no wildcard or placeholder
REF = re.compile(r"\]\(((?:\./)?(?:scripts|references|assets)/[\w./-]+\.\w+)\)|`((?:\./)?(?:scripts|references|assets)/[\w./-]+\.\w+)`")
STOP = set("a an and the to of for in on with when use this skill or is are be it that as by from at your you".split())
SECRETS = [re.compile(p) for p in (
    r"AKIA[0-9A-Z]{16}",                                        # AWS access key id
    r"-----BEGIN [A-Z ]*PRIVATE KEY-----",
    r"(?i)\b(password|passwd|secret|api[_-]?key|token)\s*[:=]\s*['\"]?(?!your|<|\$)(?![A-Z_]+\b)[A-Za-z0-9_\-/+]{12,}",
    r"gh[pousr]_[A-Za-z0-9]{36}",                               # GitHub token
)]
PLACEHOLDER = re.compile(r"(?i)your[_-]|[_-]here\b|example|changeme|xxxx")
ERRORS = {"name", "description", "refs", "secret"}


def find(root):
    return sorted(p for p in root.rglob("SKILL.md") if not SKIP & set(p.relative_to(root).parts))


def parse(text):
    """Frontmatter as a flat dict (handles quoted, folded > and literal | values) plus the body."""
    m = re.match(r"^---\n(.*?)\n---\n?(.*)$", text, re.S)
    if not m:
        return {}, text
    meta, key = {}, None
    for line in m.group(1).splitlines():
        kv = re.match(r"^([A-Za-z][\w-]*):\s*(.*)$", line)
        if kv:
            key, val = kv.group(1), kv.group(2).strip()
            meta[key] = "" if val in (">", "|", ">-", "|-") else val.strip("'\"")
        elif key and line.startswith((" ", "\t")):
            meta[key] = (meta[key] + " " + line.strip()).strip()
    return meta, m.group(2)


def words(s):
    return {w for w in re.findall(r"[a-z][a-z0-9-]+", s.lower()) if w not in STOP}


def lint(path):
    text = path.read_text(errors="replace")
    meta, body = parse(text)
    name, desc = meta.get("name", ""), meta.get("description", "")
    out = []

    if not NAME.match(name) or len(name) > 64:
        out.append(("name", f"'{name}' is not 1-64 lowercase letters, digits and single hyphens; VS Code skips it silently"))
    elif name != path.parent.name:
        out.append(("name", f"'{name}' does not match its directory '{path.parent.name}'"))
    if not desc:
        out.append(("description", "missing; the agent decides whether to load a skill from this field alone"))
    elif len(desc) > 1024:
        out.append(("description", f"{len(desc):,} characters, over the 1,024 limit"))
    else:
        if not WHEN.search(desc):
            out.append(("trigger", "says what it does, not when to use it; add 'Use when ...'"))
        if len(desc.split()) < 12:
            out.append(("vague", f"{len(desc.split())} words; too short to tell this skill apart from a near-miss"))
        if FIRST_PERSON.search(desc):
            out.append(("voice", "first person; write it about the skill: 'Adds ... Use when ...'"))

    lines = body.splitlines()
    if len(lines) > 500 or len(body) // 4 > 5000:
        out.append(("size", f"{len(lines)} lines, ~{len(body) // 4:,} tokens; move detail into references/"))
    for i, l in enumerate(lines):
        for ref in filter(None, sum(REF.findall(l), ())):
            if not (path.parent / ref).exists():
                out.append(("refs", f"body line {i + 1}: {ref} is not in the skill directory"))
    if SHELL.search(meta.get("allowed-tools", "")):
        out.append(("tools", "pre-approves shell/bash: any script or injected prompt runs without asking"))
    if SIDE_EFFECT.search(name) and meta.get("disable-model-invocation", "").lower() != "true":
        out.append(("on-demand", "has side effects; set disable-model-invocation: true so it runs only when invoked (VS Code)"))
    for i, l in enumerate(text.splitlines()):
        if any(s.search(l) for s in SECRETS) and not PLACEHOLDER.search(l):
            out.append(("secret", f"line {i + 1}: looks like a credential; remove it and rotate it"))
    return out, name, desc, (len(name) + len(desc)) // 4, len(body) // 4


def main(argv):
    root = Path(argv[1] if len(argv) > 1 else ".").resolve()
    files = find(root)
    if not files:
        print(f"No SKILL.md files found under {root}")
        return 0
    results = {f: lint(f) for f in files}
    # ponytail: pairwise word overlap is O(n^2); fine for a repo's worth of skills
    for a, b in combinations(files, 2):
        wa, wb = words(results[a][2]), words(results[b][2])
        if wa and wb and len(wa & wb) / len(wa | wb) >= 0.5:
            for x, y in ((a, b), (b, a)):
                results[x][0].append(("overlap", f"description overlaps '{results[y][1]}'; they will compete for the same prompts"))
    always, errors = 0, 0
    for f, (findings, _, _, meta_tokens, body_tokens) in results.items():
        always += meta_tokens
        print(f"\n{f.relative_to(root)}  (~{meta_tokens} tokens always, ~{body_tokens:,} when loaded)")
        for kind, msg in findings or [("ok", "nothing flagged")]:
            print(f"  {kind:<11} {msg}")
        errors += sum(k in ERRORS for k, _ in findings)
    print(f"\n{len(files)} skill(s); ~{always:,} tokens of names and descriptions load in every session (chars / 4 estimate).")
    print("Test triggering: run realistic prompts, including near-misses, and count how often each skill loads.")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
