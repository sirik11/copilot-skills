// Figures for "The Description Is the Skill": an editor's markup of a SKILL.md.
//
//   cd figures && npm install && node make_figures.mjs
//
// Hand-drawn strokes come from rough.js (fixed seeds, so output is reproducible).
// Type: Libre Baskerville, IBM Plex Mono, Kalam (all OFL, in ./fonts).
// PNGs are rendered by headless Chrome at 2x so the web fonts are guaranteed.
import rough from "roughjs/bundled/rough.esm.js";
import { spawn } from "node:child_process";
import { existsSync, statSync, writeFileSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = dirname(fileURLToPath(import.meta.url));
const g = rough.generator();
let seed = 11;

// palette: paper, ink, and the three pens an editor actually uses
const PAPER = "#F4EFE4", SHEET = "#FBF8F1", INK = "#1D1D1B", PENCIL = "#6F6A60", FAINT = "#C9C1B1";
const RED = "#C8352B", BLUE = "#2E6BA6", HI = "#F2D64B";   // RED/BLUE pass the CVD + chroma validator on PAPER
const SERIF = "'Libre Baskerville', Georgia, serif";
const MONO = "'IBM Plex Mono', Menlo, monospace";
const HAND = "Kalam, 'Bradley Hand', cursive";
const MONO_W = 0.6;                                        // IBM Plex Mono advance width, em

const FONTS = `
@font-face{font-family:'Libre Baskerville';src:url(fonts/LibreBaskerville-Variable.ttf);font-weight:400 700}
@font-face{font-family:'Libre Baskerville';font-style:italic;src:url(fonts/LibreBaskerville-Italic-Variable.ttf);font-weight:400 700}
@font-face{font-family:'IBM Plex Mono';src:url(fonts/IBMPlexMono-Regular.ttf);font-weight:400}
@font-face{font-family:'IBM Plex Mono';src:url(fonts/IBMPlexMono-Bold.ttf);font-weight:700}
@font-face{font-family:Kalam;src:url(fonts/Kalam-Regular.ttf);font-weight:400}
@font-face{font-family:Kalam;src:url(fonts/Kalam-Bold.ttf);font-weight:700}`;

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function T(x, y, s, { size = 20, fill = INK, font = SERIF, weight = 400, anchor = "start",
  italic = false, ls = 0, rot = 0, opacity } = {}) {
  const tr = rot ? ` transform="rotate(${rot} ${x} ${y})"` : "";
  const op = opacity != null ? ` opacity="${opacity}"` : "";
  return `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" fill="${fill}" font-weight="${weight}"` +
    ` xml:space="preserve" text-anchor="${anchor}" font-style="${italic ? "italic" : "normal"}" letter-spacing="${ls}"${tr}${op}>${esc(s)}</text>`;
}

// render a rough.js drawable to SVG paths
function draw(d, { opacity, dash, blend } = {}) {
  return g.toPaths(d).map((p) =>
    `<path d="${p.d}" stroke="${p.stroke}" stroke-width="${p.strokeWidth}" fill="${p.fill || "none"}"` +
    ` stroke-linecap="round" stroke-linejoin="round"` +
    (opacity != null ? ` opacity="${opacity}"` : "") + (dash ? ` stroke-dasharray="${dash}"` : "") +
    (blend ? ` style="mix-blend-mode:${blend}"` : "") + `/>`).join("");
}
const o = (opts) => ({ seed: seed++, ...opts });
const line = (x1, y1, x2, y2, opts) => draw(g.line(x1, y1, x2, y2, o({ roughness: 1, ...opts })), opts);
const rect = (x, y, w, h, opts) => draw(g.rectangle(x, y, w, h, o({ roughness: 1, ...opts })), opts);
const ellipse = (cx, cy, w, h, opts) => draw(g.ellipse(cx, cy, w, h, o({ roughness: 1.3, ...opts })), opts);

// pen strike-through across monospace text
const strike = (x, y, chars, size, color = RED) =>
  line(x - 6, y - size * 0.32, x + chars * size * MONO_W + 6, y - size * 0.36,
    { stroke: color, strokeWidth: 2.6, roughness: 1.6, bowing: 1.5 });

// highlighter swipe behind monospace text
const highlight = (x, y, chars, size) =>
  rect(x - 8, y - size * 0.95, chars * size * MONO_W + 16, size * 1.3,
    { fill: HI, fillStyle: "solid", stroke: "none", roughness: 2.4, opacity: 0.7, blend: "multiply" });

// hand-drawn arrow: a curve through a control point, with a two-stroke head
function arrow(x1, y1, cx, cy, x2, y2, color = INK, w = 2.4) {
  const body = draw(g.curve([[x1, y1], [cx, cy], [x2, y2]], o({ stroke: color, strokeWidth: w, roughness: 1.1 })));
  const a = Math.atan2(y2 - cy, x2 - cx), L = 15;
  const head = [a + 2.6, a - 2.6].map((t) =>
    line(x2, y2, x2 + L * Math.cos(t), y2 + L * Math.sin(t), { stroke: color, strokeWidth: w, roughness: 0.8 })).join("");
  return body + head;
}

const DEFS = `
<filter id="grain" x="0" y="0" width="100%" height="100%">
  <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/>
  <feColorMatrix type="saturate" values="0"/>
  <feComponentTransfer><feFuncA type="linear" slope="0.07"/></feComponentTransfer>
</filter>
<filter id="stamp" x="-10%" y="-20%" width="120%" height="140%">
  <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="2" seed="4" result="n"/>
  <feColorMatrix in="n" type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 -9 0 0 0 6.2" result="m"/>
  <feComposite in="SourceGraphic" in2="m" operator="in"/>
</filter>
<filter id="lift" x="-10%" y="-10%" width="125%" height="130%">
  <feDropShadow dx="5" dy="9" stdDeviation="11" flood-color="#3B3023" flood-opacity="0.22"/>
</filter>`;

const page = (w, h, body, viewBox) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${viewBox || `0 0 ${w} ${h}`}">` +
  `<style>${FONTS}</style><defs>${DEFS}</defs>` +
  `<rect x="-50" y="-50" width="1700" height="1000" fill="${PAPER}"/>${body}` +
  `<rect x="-50" y="-50" width="1700" height="1000" filter="url(#grain)"/></svg>`;

const header = (title, sub) =>
  T(80, 96, title, { size: 42, weight: 700 }) + T(80, 138, sub, { size: 20, italic: true, fill: PENCIL });

function stamp(cx, cy, text, color, rot, size = 34, fillHi = false) {
  const w = text.length * (size * 0.8 + 4) + 56, h = size + 40, x = cx - w / 2, y = cy - h / 2;
  const hi = fillHi ? rect(x, y, w, h, { fill: HI, fillStyle: "solid", stroke: "none", roughness: 2, opacity: 0.8 }) : "";
  const box = rect(x, y, w, h, { stroke: color, strokeWidth: 3.4, roughness: 1.2 }) +
    rect(x + 7, y + 7, w - 14, h - 14, { stroke: color, strokeWidth: 1.6, roughness: 1.2 });
  return `<g transform="rotate(${rot} ${cx} ${cy})">${hi}<g filter="url(#stamp)">${box}` +
    T(cx, cy + size * 0.36, text, { size, weight: 700, fill: color, anchor: "middle", ls: 4 }) + `</g></g>`;
}


// mono text wrapped to a character budget
function wrap(s, n) {
  const out = [""];
  for (const w of s.split(" ")) {
    if ((out[out.length - 1] + " " + w).trim().length > n) out.push(w);
    else out[out.length - 1] = (out[out.length - 1] + " " + w).trim();
  }
  return out;
}
const SRC = (y, s) => T(80, y, s, { size: 14, italic: true, fill: PENCIL });

// ---------------------------------------------------------------- cover
function coverBody() {
  let b = T(90, 112, "ON AGENT SKILLS", { size: 16, weight: 700, fill: RED, ls: 5 });
  b += T(86, 250, "The", { size: 96, weight: 700 });
  b += T(86, 360, "description", { size: 96, weight: 700 });
  b += T(86, 470, "is the skill.", { size: 96, weight: 700 });
  b += line(92, 380, 676, 372, { stroke: RED, strokeWidth: 5, roughness: 1.8, bowing: 3 });
  b += T(90, 548, "Copilot decides whether to load a skill", { size: 27, italic: true, fill: PENCIL });
  b += T(90, 590, "from one short field.", { size: 27, italic: true, fill: PENCIL });
  b += T(90, 818, "GITHUB COPILOT  ·  VS CODE  ·  COPILOT CLI  ·  AGENTSKILLS.IO",
    { size: 14, weight: 700, fill: PENCIL, ls: 3 });

  const sx = 860, sy = 92, sw = 640, sh = 716, fs = 18, lh = 32, tx = sx + 44;
  let s = `<rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" fill="${SHEET}" filter="url(#lift)"/>`;
  s += T(tx, sy + 50, ".github/skills/run-tests/SKILL.md", { size: 15, font: MONO, fill: PENCIL });
  s += line(tx, sy + 66, sx + sw - 44, sy + 66, { stroke: FAINT, strokeWidth: 1.4, roughness: 0.6 });
  let y = sy + 112;
  s += T(tx, y, "---", { size: fs, font: MONO }); y += lh;
  s += T(tx, y, "name: run-tests", { size: fs, font: MONO }); y += lh;
  const desc = wrap("description: Runs the test suite and fixes failures without weakening assertions. "
    + "Use when tests fail, when asked to run or fix tests, or before opening a pull request.", 46);
  const d0 = y;
  desc.forEach((l, i) => { s += highlight(tx, y, l.length, fs); s += T(tx, y, l, { size: fs, font: MONO, weight: 700 }); y += lh; });
  const d1 = y - lh;
  s += T(tx, y, "---", { size: fs, font: MONO }); y += lh + 10;
  const body = ["# Run the tests", "1. Run `pnpm test --run`. Read the first", "   failure before touching code.",
    "2. Fix the code under test, not the", "   assertion, unless the test is wrong.", "3. Re-run the full suite and report",
    "   what failed and what you changed."];
  const b0 = y;
  for (const l of body) { s += T(tx, y, l, { size: fs, font: MONO, fill: "#B3AC9F" }); y += lh; }
  // red bracket on the description, pencil bracket on the body
  const bx = tx - 22;
  s += line(bx, d0 - fs - 2, bx, d1 + 10, { stroke: RED, strokeWidth: 3.2, roughness: 1.2 });
  s += line(bx, d0 - fs - 2, bx + 12, d0 - fs - 4, { stroke: RED, strokeWidth: 3.2, roughness: 0.8 });
  s += line(bx, d1 + 10, bx + 12, d1 + 11, { stroke: RED, strokeWidth: 3.2, roughness: 0.8 });
  s += line(bx, b0 - fs, bx, y - lh + 8, { stroke: PENCIL, strokeWidth: 2.2, roughness: 1.4, dash: "7 7" });
  s += T(sx + 300, sy + 150, "Copilot reads this first", { size: 30, font: HAND, weight: 700, fill: RED, rot: -4 });
  s += T(sx + 330, y + 26, "loaded only if picked", { size: 28, font: HAND, weight: 700, fill: PENCIL, rot: -3 });
  s += arrow(sx + 320, y + 16, sx + 290, y + 6, sx + 300, y - 26, PENCIL, 2.2);
  return b + `<g transform="rotate(2.2 ${sx + sw / 2} ${sy + sh / 2})">${s}</g>`;
}
const cover = () => page(1600, 900, coverBody());
const social = () => page(1200, 630, coverBody(), "0 30 1600 840");

// ---------------------------------------------------------------- figure 1
function fig1() {
  let b = header("What loads, and when", "A skill arrives in three stages. Only the first is paid for on every task.");
  const layers = [
    ["ALWAYS", "every installed skill, every session", 190, 96,
      ["name: add-api-endpoint", "description: Adds an HTTP endpoint ... Use when ..."], "~100 tokens per skill"],
    ["WHEN THE SKILL IS PICKED", "after the description wins", 316, 196,
      ["SKILL.md body", "1. Add the route under api/routes/ ...", "2. Return errors in the format in references/ ...",
        "3. Add a contract test ..."], "under 5,000 tokens, 500 lines"],
    ["WHEN THE BODY POINTS TO IT", "never loaded otherwise", 542, 150,
      ["references/error-format.md", "scripts/check_contract.sh", "assets/openapi-template.yaml"], "only what the body names"],
  ];
  layers.forEach(([head, sub, top, h, lines, cost], i) => {
    b += ellipse(112, top + 30, 52, 52, { stroke: INK, strokeWidth: 2.4, roughness: 1.4 });
    b += T(112, top + 41, String(i + 1), { size: 30, font: HAND, weight: 700, anchor: "middle" });
    b += T(162, top + 26, head, { size: 15, weight: 700, ls: 2.6, fill: i === 0 ? RED : INK });
    b += T(162, top + 52, sub, { size: 16, italic: true, fill: PENCIL });
    b += rect(560, top, 640, h, { stroke: INK, strokeWidth: 2, roughness: 1.1,
      fill: i === 0 ? HI : "none", fillStyle: "solid" });
    lines.forEach((l, k) => { b += T(588, top + 36 + k * 34, l, { size: 17, font: MONO, weight: k === 0 ? 700 : 400, fill: k === 0 ? INK : "#4A463F" }); });
    b += T(1230, top + 36, cost, { size: 24, font: HAND, weight: 700, fill: i === 0 ? RED : PENCIL, rot: -2 });
  });
  b += T(1230, 258, "paid on every task", { size: 24, font: HAND, weight: 700, fill: RED, rot: -2 });
  b += T(80, 760, "twenty skills cost about 2,000 tokens until one of them is needed.", { size: 32, font: HAND, weight: 700, rot: -0.8 });
  b += line(350, 778, 622, 773, { stroke: RED, strokeWidth: 3.2, roughness: 1.6, bowing: 2 });
  b += SRC(868, "Stages and sizes from the Agent Skills specification (agentskills.io); VS Code documents Copilot loading skills the same way.");
  return page(1600, 900, b);
}

// ---------------------------------------------------------------- figure 2 (chart)
function fig2() {
  let b = header("Curated skills help, on average", "Average pass rate on 87 SkillsBench tasks across 18 model and harness configurations");
  const x0 = 360, span = 1000;
  const rows = [["No skills", 33.9, PENCIL, 300], ["Curated skills", 50.5, BLUE, 420]];
  for (const [label, v, c, y] of rows) {
    const w = span * v / 100;
    b += T(340, y + 44, label, { size: 24, anchor: "end" });
    b += rect(x0, y, w, 70, { fill: c, fillStyle: "hachure", hachureAngle: -41, hachureGap: 7, fillWeight: 2,
      stroke: c, strokeWidth: 1.8, roughness: 1.1 });
    b += T(x0 + w + 18, y + 46, `${v}%`, { size: 28, weight: 700 });
  }
  b += line(x0, 270, x0, 520, { stroke: INK, strokeWidth: 2.2, roughness: 0.7 });
  for (const p of [0, 25, 50, 75, 100]) {
    const gx = x0 + span * p / 100;
    b += line(gx, 522, gx, 534, { stroke: INK, strokeWidth: 1.6, roughness: 0.5 });
    b += T(gx, 558, `${p}%`, { size: 15, italic: true, fill: PENCIL, anchor: "middle" });
  }
  // the gap, bracketed in pencil
  const g0 = x0 + span * 0.339, g1 = x0 + span * 0.505;
  b += line(g0, 250, g0, 290, { stroke: INK, strokeWidth: 1.8, roughness: 1, dash: "6 6" });
  b += line(g0, 250, g1, 248, { stroke: INK, strokeWidth: 2.2, roughness: 1.2 });
  b += line(g1, 248, g1, 410, { stroke: INK, strokeWidth: 1.8, roughness: 1, dash: "6 6" });
  b += T((g0 + g1) / 2, 234, "+16.6 points", { size: 28, font: HAND, weight: 700, anchor: "middle", rot: -2 });
  b += T(960, 340, "the gain ranged from +4.1 to +25.7", { size: 26, font: HAND, weight: 700, rot: -1.5 });
  b += T(960, 374, "points, depending on the model and harness", { size: 26, font: HAND, weight: 700, rot: -1.5 });
  b += T(800, 690, "a skill is code that runs inside the agent. measure it like code.",
    { size: 34, font: HAND, weight: 700, anchor: "middle", rot: -1 });
  b += line(1040, 708, 1290, 702, { stroke: RED, strokeWidth: 3.4, roughness: 1.8, bowing: 2 });
  b += SRC(868, "Source: Li et al., SkillsBench: Benchmarking How Well Agent Skills Work Across Diverse Tasks, arXiv 2602.12670.");
  return page(1600, 900, b);
}

// ---------------------------------------------------------------- figure 3
function fig3() {
  let b = header("Rewrite the description first", "What it does, when to use it, and the words people actually type.");
  const fs = 24, tx = 120;
  b += T(80, 220, "BEFORE", { size: 15, weight: 700, ls: 3, fill: PENCIL });
  const old = "description: Helps with tests.";
  b += T(tx, 270, old, { size: fs, font: MONO });
  b += strike(tx + 13 * fs * MONO_W, 270, old.length - 13, fs);
  b += T(tx + old.length * fs * MONO_W + 40, 266, "when? which tests? what words?", { size: 28, font: HAND, weight: 700, fill: RED, rot: -2 });

  b += T(80, 360, "AFTER", { size: 15, weight: 700, ls: 3, fill: PENCIL });
  const lines = [
    ["description: Runs the test suite with the project's flags", "what"],
    ["  and fixes failures without weakening assertions.", "what"],
    ["  Use when tests fail, when asked to run or fix tests,", "when"],
    ["  or before opening a pull request, even if the user", "when"],
    ["  only says the build is red.", "words"],
  ];
  let y = 410;
  const spans = {};
  for (const [l, k] of lines) {
    if (k === "when") b += highlight(tx + 2 * fs * MONO_W, y, l.length - 2, fs);
    b += T(tx, y, l, { size: fs, font: MONO, weight: 400 });
    (spans[k] = spans[k] || []).push(y);
    y += 46;
  }
  // "what": blue pencil underline; "words": red circle around the user's phrase
  lines.filter(([, k]) => k === "what").forEach(([l], i) => {
    const a = i ? l.search(/\S/) : 13, yy = spans.what[i];
    b += line(tx + a * fs * MONO_W, yy + 9, tx + l.length * fs * MONO_W, yy + 7, { stroke: BLUE, strokeWidth: 2.6, roughness: 1.4 });
  });
  const ry = spans.words[0], phrase = "the build is red";
  const px = tx + (lines[4][0].indexOf(phrase)) * fs * MONO_W;
  b += ellipse(px + phrase.length * fs * MONO_W / 2, ry - 8, phrase.length * fs * MONO_W + 40, 54, { stroke: RED, strokeWidth: 2.8 });
  // margin labels
  const lx = 1180;
  b += T(lx, spans.what[0] + 14, "what it does", { size: 30, font: HAND, weight: 700, fill: BLUE, rot: -2 });
  b += T(lx, spans.when[0] + 30, "when to use it", { size: 30, font: HAND, weight: 700, rot: -2 });
  b += T(lx, ry + 4, "the words a dev", { size: 30, font: HAND, weight: 700, fill: RED, rot: -2 });
  b += T(lx, ry + 38, "actually types", { size: 30, font: HAND, weight: 700, fill: RED, rot: -2 });
  b += arrow(lx - 14, ry + 10, lx - 300, ry + 40, px + phrase.length * fs * MONO_W + 30, ry + 2, RED);
  b += T(80, 760, "a vague description never runs. a broad one runs when it shouldn’t.",
    { size: 32, font: HAND, weight: 700, rot: -0.8 });
  b += SRC(868, "Pattern from the Agent Skills specification and its guide to optimizing descriptions (agentskills.io).");
  return page(1600, 900, b);
}

// ---------------------------------------------------------------- figure 4
function fig4() {
  let b = header("Where does an instruction go?", "Sort by how often it applies, and by what happens if it’s ignored.");
  const cards = [
    ["Relevant to almost", "every task?", "custom instructions", ".github/copilot-", "instructions.md", INK, -2.2],
    ["Detailed, and needed", "only sometimes?", "a skill", ".github/skills/", "add-api-endpoint/", BLUE, 1.6],
    ["Has side effects,", "like a deploy?", "a skill you invoke", "disable-model-", "invocation: true", INK, -1.4],
    ["Must never", "happen?", "a hook or CI check", "branch protection,", "a required CI check", RED, 2.4],
  ];
  cards.forEach(([q1, q2, ans, e1, e2, c, rot], i) => {
    const x = 80 + i * 368, y = 210, w = 330, h = 470;
    let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${SHEET}" filter="url(#lift)"/>`;
    s += `<rect x="${x + 22}" y="${y - 30}" width="120" height="34" fill="${SHEET}"/>`;
    s += T(x + 82, y - 6, String(i + 1), { size: 24, font: HAND, weight: 700, anchor: "middle", fill: PENCIL });
    s += line(x + 24, y + 116, x + w - 24, y + 116, { stroke: RED, strokeWidth: 1.4, roughness: 0.8, opacity: 0.6 });
    s += T(x + 28, y + 44, q1, { size: 22, weight: 700 });
    s += T(x + 28, y + 94, q2, { size: 22, weight: 700 });
    s += arrow(x + 60, y + 130, x + 50, y + 180, x + 70, y + 222, PENCIL, 2.2);
    const aw = wrap(ans, 12);
    aw.forEach((l, k) => { s += T(x + 28, y + 280 + k * 46, l, { size: 40, font: HAND, weight: 700, fill: c }); });
    s += T(x + 28, y + 400, e1, { size: 17, font: MONO, fill: PENCIL });
    s += T(x + 28, y + 428, e2, { size: 17, font: MONO, fill: PENCIL });
    b += `<g transform="rotate(${rot} ${x + w / 2} ${y + h / 2})">${s}</g>`;
  });
  b += T(800, 790, "instructions and skills are suggestions. only the last card is a guarantee.",
    { size: 32, font: HAND, weight: 700, anchor: "middle", rot: -0.8 });
  b += SRC(868, "GitHub Docs: custom instructions for almost every task, skills when relevant. VS Code: disable-model-invocation.");
  return page(1600, 900, b);
}

// ---------------------------------------------------------------- terminal card (README)
const RUN = [
  ["prompt", "$ python3 skill_lint.py examples/before"], ["", ""],
  ["file", ".github/skills/Testing/SKILL.md  (~6 tokens always, ~8 when loaded)"],
  ["name", "'Testing' is not 1-64 lowercase letters, digits and single hyphens; VS Code skips it silently"],
  ["trigger", "says what it does, not when to use it; add 'Use when ...'"],
  ["vague", "3 words; too short to tell this skill apart from a near-miss"], ["", ""],
  ["file", ".github/skills/api-helper/SKILL.md  (~28 tokens always, ~13 when loaded)"],
  ["trigger", "says what it does, not when to use it; add 'Use when ...'"],
  ["voice", "first person; write it about the skill: 'Adds ... Use when ...'"],
  ["overlap", "description overlaps 'api-endpoints'; they will compete for the same prompts"], ["", ""],
  ["file", ".github/skills/deploy-staging/SKILL.md  (~32 tokens always, ~18 when loaded)"],
  ["refs", "body line 1: scripts/deploy.sh is not in the skill directory"],
  ["tools", "pre-approves shell/bash: any script or injected prompt runs without asking"],
  ["on-demand", "has side effects; set disable-model-invocation: true so it runs only when invoked (VS Code)"], ["", ""],
  ["summary", "4 skill(s); ~91 tokens of names and descriptions load in every session (chars / 4 estimate)."],
];
const KIND = { name: "#EE8B74", refs: "#EE8B74", trigger: "#F2D64B", vague: "#F2D64B", voice: "#8DBFEA",
  overlap: "#8DBFEA", tools: "#F2D64B", "on-demand": "#F2D64B", ok: "#8DBFEA" };
function terminal() {
  let b = `<rect x="40" y="40" width="1520" height="640" rx="14" fill="#1E1C19" filter="url(#lift)"/>` +
    `<rect x="40" y="40" width="1520" height="52" rx="14" fill="#2A2723"/><rect x="40" y="76" width="1520" height="16" fill="#2A2723"/>`;
  ["#C8352B", "#E0A43A", "#6FA86A"].forEach((c, k) => { b += `<circle cx="${74 + k * 24}" cy="66" r="7" fill="${c}"/>`; });
  b += T(800, 72, "skill_lint", { size: 16, font: MONO, fill: "#8A8478", anchor: "middle" });
  let y = 140; const fs = 19, ch = fs * MONO_W;
  for (const [k, msg] of RUN) {
    if (k === "prompt") b += T(84, y, msg, { size: fs, font: MONO, weight: 700, fill: "#F2D64B" });
    else if (k === "file") b += T(84, y, msg, { size: fs, font: MONO, weight: 700, fill: "#F1ECE2" });
    else if (k === "summary") b += T(84, y, msg, { size: fs, font: MONO, fill: "#BDB6A8" });
    else if (k) {
      b += T(84 + 2 * ch, y, k, { size: fs, font: MONO, weight: 700, fill: KIND[k] });
      b += T(84 + 14 * ch, y, msg, { size: fs, font: MONO, fill: "#D9D3C7" });
    }
    y += k ? 34 : 18;
  }
  return page(1600, 720, b);
}

// ---------------------------------------------------------------- render
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PROFILE = join(process.env.TMPDIR || "/tmp", "skills-figures-chrome");

function render(name, svg, w, h) {
  writeFileSync(join(DIR, `${name}.svg`), svg);
  const html = join(DIR, `.render-${name}.html`), png = join(DIR, `${name}.png`);
  writeFileSync(html, `<!doctype html><html><head><style>html,body{margin:0;background:${PAPER}}svg{display:block}</style></head><body>${svg}</body></html>`);
  if (existsSync(png)) unlinkSync(png);
  const p = spawn(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--allow-file-access-from-files",
    `--user-data-dir=${PROFILE}`, `--window-size=${w},${h}`, "--force-device-scale-factor=2",
    "--virtual-time-budget=4000", `--screenshot=${png}`, `file://${html}`], { stdio: "ignore" });
  return new Promise((resolve, reject) => {
    const t0 = Date.now(); let last = -1;
    const tick = setInterval(() => {
      const size = existsSync(png) ? statSync(png).size : -1;
      if (size > 0 && size === last) { clearInterval(tick); p.kill(); unlinkSync(html); resolve(size); }
      else if (Date.now() - t0 > 30000) { clearInterval(tick); p.kill(); reject(new Error(`timeout: ${name}`)); }
      last = size;
    }, 700);
  });
}

const JOBS = [
  ["cover-the-description-is-the-skill", cover, 1600, 900], ["cover-social-1200x630", social, 1200, 630],
  ["fig1-what-loads-when", fig1, 1600, 900], ["fig2-skillsbench", fig2, 1600, 900],
  ["fig3-before-after", fig3, 1600, 900], ["fig4-where-it-goes", fig4, 1600, 900],
  ["linter-output", terminal, 1600, 720],
];
const only = process.argv.slice(2);
for (const [name, fn, w, h] of JOBS) {
  if (only.length && !only.some((s) => name.includes(s))) continue;
  const bytes = await render(name, fn(), w, h);
  console.log(`${name}.png  ${(bytes / 1024).toFixed(0)} KB`);
}
