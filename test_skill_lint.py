"""Self-check for skill_lint.py. Run: python3 test_skill_lint.py"""
import tempfile
from pathlib import Path

import skill_lint as sl

HERE = Path(__file__).parent


def kinds(path):
    return {k for k, _ in sl.lint(path)[0]}


def write(root, name, text):
    p = root / ".github/skills" / name / "SKILL.md"
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text)
    return p


before = HERE / "examples/before/.github/skills"
assert kinds(before / "Testing/SKILL.md") == {"name", "trigger", "vague"}
assert kinds(before / "api-helper/SKILL.md") == {"trigger", "voice"}
assert kinds(before / "deploy-staging/SKILL.md") == {"refs", "tools", "on-demand"}
assert sl.main(["", str(HERE / "examples/before")]) == 1                # invalid name, missing file

after = HERE / "examples/after/.github/skills"
for skill in ("run-tests", "add-api-endpoint", "deploy-staging"):
    assert kinds(after / skill / "SKILL.md") == set(), skill
assert sl.main(["", str(HERE / "examples/after")]) == 0
assert sl.main(["", str(HERE / ".github")]) == 0                        # this repo's own skill

with tempfile.TemporaryDirectory() as d:
    root = Path(d)
    # folded description, quoted values, and a name that disagrees with its folder
    p = write(root, "pdf-tools", '---\nname: "pdf-processing"\ndescription: >\n  Extracts text and tables from PDF files and fills forms.\n'
              '  Use when working with PDFs, forms, or document extraction.\n---\nbody\n')
    assert kinds(p) == {"name"}
    meta, _ = sl.parse(p.read_text())
    assert meta["description"].startswith("Extracts text") and meta["description"].endswith("extraction.")
    # spec limits: 64-character name, 1,024-character description, no consecutive hyphens
    assert "name" in kinds(write(root, "a--b", "---\nname: a--b\ndescription: x\n---\n"))
    assert "description" in kinds(write(root, "long", "---\nname: long\ndescription: " + "word " * 300 + "\n---\n"))
    assert "description" in kinds(write(root, "none", "---\nname: none\n---\nbody\n"))
    # first person at the start of a sentence; quoted user phrasing like "my data" is fine
    assert "voice" in kinds(write(root, "mine", "---\nname: mine\ndescription: I format changelog entries. Use when the "
                                  "changelog needs a new entry for a release or a merged pull request.\n---\n"))
    # side effects are fine once the skill is on-demand only
    assert "on-demand" not in kinds(write(root, "release", "---\nname: release\ndescription: Publishes a release. Use when asked "
                                          "to cut, tag, or publish a new version of the package.\ndisable-model-invocation: true\n---\n"))

    # a credential fails the run; a documented placeholder does not
    assert "secret" in kinds(write(root, "creds", "---\nname: creds\ndescription: x\n---\napi_key = 'sk3cr3tV4lu3abc123'\n"))
    assert "secret" not in kinds(write(root, "docs", "---\nname: docs\ndescription: x\n---\nexport PHOENIX_API_KEY=your-api-key\n"
                                       'pc = Pinecone(api_key="PINECONE_API_KEY")\n'))

print("all checks pass")
