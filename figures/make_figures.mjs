// Figures for "The Description Is the Skill", drawn as a library card catalog:
// the agent reads the catalog card (the description) and only then pulls the book (the skill).
//
//   cd figures && npm install && node make_figures.mjs
//
// Hand-drawn strokes come from rough.js and typewriter jitter from a seeded PRNG,
// so output is reproducible. Type: DM Serif Display, Source Serif 4, Courier Prime,
// Caveat (all OFL, in ./fonts). PNGs are rendered by headless Chrome at 2x.
import rough from "roughjs/bundled/rough.esm.js";
import { spawn } from "node:child_process";
import { existsSync, statSync, writeFileSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = dirname(fileURLToPath(import.meta.url));
const g = rough.generator();
let seed = 21;
let prng = 7;
const rnd = () => ((prng = (prng * 16807) % 2147483647) / 2147483647);

// palette: library green, kraft desk, manila cards, typewriter ink, violet stamp pad
const GREEN = "#1F3D33", KRAFT = "#E3D4B4", CARD = "#F6ECD3", EDGE = "#CDB98E", INK = "#2A2620";
const PENCIL = "#6E6553", RULE_RED = "#C0503A", RULE_BLUE = "#9DB8CC", VIOLET = "#5E3B86";
const SERIES = "#2F6B4F", BRASS = "#B08A3E", CREAM = "#F3E7C9";
const DISPLAY = "'DM Serif Display', Georgia, serif";
const SERIF = "'Source Serif 4', Georgia, serif";
const TYPE = "'Courier Prime', 'Courier New', monospace";
const HAND = "Caveat, 'Bradley Hand', cursive";
const TW = 0.6;                                             // Courier Prime advance width, em

const FONTS = `
@font-face{font-family:'DM Serif Display';src:url(fonts/DMSerifDisplay-Regular.ttf)}
@font-face{font-family:'DM Serif Display';font-style:italic;src:url(fonts/DMSerifDisplay-Italic.ttf)}
@font-face{font-family:'Source Serif 4';src:url(fonts/SourceSerif4-Variable.ttf);font-weight:200 900}
@font-face{font-family:'Source Serif 4';font-style:italic;src:url(fonts/SourceSerif4-Italic-Variable.ttf);font-weight:200 900}
@font-face{font-family:'Courier Prime';src:url(fonts/CourierPrime-Regular.ttf);font-weight:400}
@font-face{font-family:'Courier Prime';src:url(fonts/CourierPrime-Bold.ttf);font-weight:700}
@font-face{font-family:Caveat;src:url(fonts/Caveat-Variable.ttf);font-weight:400 700}`;

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function T(x, y, s, { size = 20, fill = INK, font = SERIF, weight = 400, anchor = "start",
  italic = false, ls = 0, rot = 0, opacity } = {}) {
  const tr = rot ? ` transform="rotate(${rot} ${x} ${y})"` : "";
  const op = opacity != null ? ` opacity="${opacity}"` : "";
  return `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" fill="${fill}" font-weight="${weight}"` +
    ` xml:space="preserve" text-anchor="${anchor}" font-style="${italic ? "italic" : "normal"}" letter-spacing="${ls}"${tr}${op}>${esc(s)}</text>`;
}

// typewriter: every character on its own baseline wobble and ink density
function typed(x, y, s, size = 20, { fill = INK, weight = 400 } = {}) {
  let out = "";
  [...s].forEach((c, i) => {
    if (c === " ") return;
    const dy = (rnd() - 0.5) * size * 0.06, op = 0.72 + rnd() * 0.28;
    out += `<text x="${(x + i * size * TW).toFixed(1)}" y="${(y + dy).toFixed(1)}" font-family="${TYPE}" font-size="${size}"` +
      ` font-weight="${weight}" fill="${fill}" opacity="${op.toFixed(2)}">${esc(c)}</text>`;
  });
  return out;
}

function draw(d, { opacity, dash } = {}) {
  return g.toPaths(d).map((p) =>
    `<path d="${p.d}" stroke="${p.stroke}" stroke-width="${p.strokeWidth}" fill="${p.fill || "none"}"` +
    ` stroke-linecap="round" stroke-linejoin="round"` +
    (opacity != null ? ` opacity="${opacity}"` : "") + (dash ? ` stroke-dasharray="${dash}"` : "") + `/>`).join("");
}
const o = (opts) => ({ seed: seed++, ...opts });
const line = (x1, y1, x2, y2, opts) => draw(g.line(x1, y1, x2, y2, o({ roughness: 1, ...opts })), opts);
const rect = (x, y, w, h, opts) => draw(g.rectangle(x, y, w, h, o({ roughness: 1, ...opts })), opts);
const ellipse = (cx, cy, w, h, opts) => draw(g.ellipse(cx, cy, w, h, o({ roughness: 1.3, ...opts })), opts);

function arrow(x1, y1, cx, cy, x2, y2, color = INK, w = 2.4) {
  const body = draw(g.curve([[x1, y1], [cx, cy], [x2, y2]], o({ stroke: color, strokeWidth: w, roughness: 1.1 })));
  const a = Math.atan2(y2 - cy, x2 - cx), L = 15;
  const head = [a + 2.6, a - 2.6].map((t) =>
    line(x2, y2, x2 + L * Math.cos(t), y2 + L * Math.sin(t), { stroke: color, strokeWidth: w, roughness: 0.8 })).join("");
  return body + head;
}

const DEFS = `
<filter id="grain" x="0" y="0" width="100%" height="100%">
  <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/>
  <feColorMatrix type="saturate" values="0"/>
  <feComponentTransfer><feFuncA type="linear" slope="0.09"/></feComponentTransfer>
</filter>
<filter id="fiber" x="0" y="0" width="100%" height="100%">
  <feTurbulence type="fractalNoise" baseFrequency="0.012 0.6" numOctaves="2" seed="3"/>
  <feColorMatrix type="saturate" values="0"/>
  <feComponentTransfer><feFuncA type="linear" slope="0.10"/></feComponentTransfer>
</filter>
<filter id="stamp" x="-10%" y="-20%" width="120%" height="140%">
  <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="2" seed="9" result="n"/>
  <feColorMatrix in="n" type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 -8 0 0 0 5.6" result="m"/>
  <feComposite in="SourceGraphic" in2="m" operator="in"/>
</filter>
<filter id="lift" x="-10%" y="-10%" width="125%" height="135%">
  <feDropShadow dx="4" dy="10" stdDeviation="10" flood-color="#21180C" flood-opacity="0.28"/>
</filter>`;

const page = (w, h, body, { bg = KRAFT, viewBox } = {}) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${viewBox || `0 0 ${w} ${h}`}">` +
  `<style>${FONTS}</style><defs>${DEFS}</defs>` +
  `<rect x="-50" y="-50" width="1700" height="1000" fill="${bg}"/>` +
  `<rect x="-50" y="-50" width="1700" height="1000" filter="url(#fiber)"/>${body}` +
  `<rect x="-50" y="-50" width="1700" height="1000" filter="url(#grain)"/></svg>`;

const header = (title, sub) =>
  T(80, 104, title, { size: 52, font: DISPLAY }) + T(82, 146, sub, { size: 21, italic: true, fill: PENCIL });
const SRC = (y, s) => T(80, y, s, { size: 14, italic: true, fill: PENCIL });

// a 3x5 catalog card: red rule under the heading row, blue ruled lines, punched hole
function card(x, y, w, h, { rot = 0, tab, lines = true, hole = true, fill = CARD } = {}) {
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${fill}" stroke="${EDGE}" stroke-width="1.2" filter="url(#lift)"/>`;
  if (tab) {
    s += `<rect x="${x + tab.x}" y="${y - 34}" width="${tab.w}" height="40" rx="5" fill="${fill}" stroke="${EDGE}" stroke-width="1.2"/>`;
    s += typed(x + tab.x + 14, y - 8, tab.text, 17, { weight: 700 });
  }
  if (lines) {
    s += line(x + 18, y + 58, x + w - 18, y + 58, { stroke: RULE_RED, strokeWidth: 1.6, roughness: 0.4 });
    for (let ly = y + 98; ly < y + h - 30; ly += 40) s += `<line x1="${x + 18}" y1="${ly}" x2="${x + w - 18}" y2="${ly}" stroke="${RULE_BLUE}" stroke-width="1" opacity="0.7"/>`;
  }
  if (hole) s += `<circle cx="${x + w / 2}" cy="${y + h - 22}" r="9" fill="${KRAFT}" stroke="${EDGE}" stroke-width="1"/>`;
  return { open: `<g transform="rotate(${rot} ${x + w / 2} ${y + h / 2})">` + s, close: "</g>" };
}

function stamp(cx, cy, text, rot, size = 30, color = VIOLET) {
  const w = text.length * (size * 0.68 + 3) + 48, h = size + 34;
  const box = rect(cx - w / 2, cy - h / 2, w, h, { stroke: color, strokeWidth: 3.6, roughness: 1.4 });
  return `<g transform="rotate(${rot} ${cx} ${cy})"><g filter="url(#stamp)" opacity="0.88">${box}` +
    T(cx, cy + size * 0.36, text, { size, font: TYPE, weight: 700, fill: color, anchor: "middle", ls: 3 }) + `</g></g>`;
}

function wrap(s, n) {
  const out = [""];
  for (const w of s.split(" ")) {
    if ((out[out.length - 1] + " " + w).trim().length > n) out.push(w);
    else out[out.length - 1] = (out[out.length - 1] + " " + w).trim();
  }
  return out;
}

// ---------------------------------------------------------------- cover
function coverBody() {
  let b = T(90, 118, "ON AGENT SKILLS", { size: 17, font: TYPE, weight: 700, fill: BRASS, ls: 6 });
  b += T(84, 262, "The description", { size: 98, font: DISPLAY, fill: CREAM });
  b += T(84, 372, "is the skill.", { size: 98, font: DISPLAY, fill: CREAM });
  b += T(90, 470, "Copilot reads the catalog card first.", { size: 29, italic: true, fill: "#C9BFA6" });
  b += T(90, 512, "The book stays on the shelf until the card matches.", { size: 29, italic: true, fill: "#C9BFA6" });
  b += T(90, 818, "GITHUB COPILOT · VS CODE · COPILOT CLI · AGENTSKILLS.IO", { size: 15, font: TYPE, weight: 700, fill: "#9C9277", ls: 2 });

  // two cards behind, one in front
  const back = [["deploy-staging", 1010, 210, 3.5], ["add-api-endpoint", 960, 250, -2.5]];
  for (const [t, x, y, r] of back) {
    const c = card(x, y, 520, 330, { rot: r, tab: { x: x === 1010 ? 280 : 120, w: 230, text: t } });
    b += c.open + c.close;
  }
  const x = 900, y = 330, w = 620, h = 400, fs = 19;
  const c = card(x, y, w, h, { rot: 1.2, tab: { x: 30, w: 170, text: "run-tests" } });
  let s = c.open;
  s += typed(x + 30, y + 44, "SKILL     run-tests", fs, { weight: 700 });
  const desc = wrap("Runs the test suite and fixes failures without weakening assertions. Use when tests fail, when asked to run or fix tests, or before opening a pull request.", 38);
  s += typed(x + 30, y + 90, "DESC.", fs, { weight: 700 });
  desc.forEach((l, i) => { s += typed(x + 30 + 10 * fs * TW, y + 90 + i * 40, l, fs); });
  s += typed(x + 30, y + 90 + desc.length * 40 + 10, "SHELF     .github/skills/run-tests/", fs);
  s += c.close;
  b += s;
  b += stamp(1340, 320, "READ FIRST", -8, 26);
  b += T(880, 830, "the agent never opens the book unless this card fits the request", { size: 32, font: HAND, weight: 700, fill: CREAM, rot: -1.5 });
  return b;
}
const cover = () => page(1600, 900, coverBody(), { bg: GREEN });
const social = () => page(1200, 630, coverBody(), { bg: GREEN, viewBox: "0 40 1600 840" });

// ---------------------------------------------------------------- figure 1
function fig1() {
  let b = header("What loads, and when", "A skill is a catalog card, a book, and an appendix. Only the card is read every time.");
  // 1: the card
  const c = card(70, 250, 400, 250, { rot: -2 });
  b += c.open + typed(94, 292, "SKILL  add-api-endpoint", 17, { weight: 700 }) +
    typed(94, 338, "DESC.  Adds an HTTP endpoint", 17) + typed(94, 378, "       ... Use when asked to", 17) +
    typed(94, 418, "       add or expose a route.", 17) + c.close;
  // 2: the book
  const bx = 600, by = 220, bw = 330, bh = 330;
  b += `<g transform="rotate(1.5 ${bx + bw / 2} ${by + bh / 2})">`;
  b += `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="6" fill="${SERIES}" filter="url(#lift)"/>`;
  b += `<rect x="${bx}" y="${by}" width="34" height="${bh}" rx="6" fill="#244F3B"/>`;
  b += rect(bx + 70, by + 60, bw - 110, 120, { stroke: BRASS, strokeWidth: 2.4, roughness: 0.9 });
  b += T(bx + 70 + (bw - 110) / 2, by + 112, "SKILL.md", { size: 34, font: DISPLAY, fill: CREAM, anchor: "middle" });
  b += T(bx + 70 + (bw - 110) / 2, by + 152, "add-api-endpoint", { size: 17, font: TYPE, fill: "#D9CBA5", anchor: "middle" });
  b += T(bx + bw / 2 + 17, by + 250, "1. add the route", { size: 18, font: TYPE, fill: "#D9CBA5", anchor: "middle" });
  b += T(bx + bw / 2 + 17, by + 278, "2. errors: references/", { size: 18, font: TYPE, fill: "#D9CBA5", anchor: "middle" });
  b += `</g>`;
  // 3: the appendix folder
  const fx = 1080, fy = 260;
  b += `<g transform="rotate(-1.5 ${fx + 210} ${fy + 140})">`;
  b += `<rect x="${fx + 24}" y="${fy - 30}" width="360" height="250" fill="#FBF6EA" stroke="${EDGE}" filter="url(#lift)"/>`;
  b += `<rect x="${fx + 40}" y="${fy - 50}" width="360" height="250" fill="#FBF6EA" stroke="${EDGE}"/>`;
  b += typed(fx + 60, fy - 14, "error-format.md", 16);
  b += `<path d="M${fx} ${fy + 20} h120 l20 -24 h280 v290 h-420 z" fill="#D7B978" stroke="#B4955A" stroke-width="1.4" filter="url(#lift)"/>`;
  b += typed(fx + 160, fy + 12, "appendix", 17, { weight: 700 });
  b += typed(fx + 30, fy + 120, "scripts/", 18) + typed(fx + 30, fy + 160, "references/", 18) + typed(fx + 30, fy + 200, "assets/", 18);
  b += `</g>`;
  // labels
  const lab = [[90, "1  ALWAYS", "the card: name + description,", "~100 tokens per skill"],
    [610, "2  WHEN PICKED", "the book: the SKILL.md body,", "under 5,000 tokens"],
    [1090, "3  WHEN THE BOOK POINTS TO IT", "the appendix: scripts,", "references, assets"]];
  for (const [x, h1, l1, l2] of lab) {
    b += T(x, 620, h1, { size: 17, font: TYPE, weight: 700, fill: x === 90 ? RULE_RED : INK, ls: 1 });
    b += T(x, 654, l1, { size: 20, fill: PENCIL, italic: true });
    b += T(x, 682, l2, { size: 20, fill: PENCIL, italic: true });
  }
  b += arrow(470, 360, 530, 330, 590, 360, PENCIL, 2.2);
  b += T(470, 318, "card matches", { size: 24, font: HAND, weight: 700, fill: PENCIL, rot: -4 });
  b += arrow(945, 380, 1005, 350, 1065, 380, PENCIL, 2.2);
  b += T(946, 338, "book says “see”", { size: 24, font: HAND, weight: 700, fill: PENCIL, rot: -4 });
  b += T(80, 790, "twenty cards in the catalog: about 2,000 tokens. the books stay on the shelf.", { size: 34, font: HAND, weight: 700, rot: -0.8 });
  b += SRC(866, "Stages and sizes from the Agent Skills specification (agentskills.io); VS Code documents Copilot loading skills the same way.");
  return page(1600, 900, b);
}

// ---------------------------------------------------------------- figure 2 (chart)
function fig2() {
  let b = header("Curated skills help, on average", "Average pass rate on 87 SkillsBench tasks across 18 model and harness configurations");
  // ledger sheet
  const lx = 70, ly = 190, lw = 1460, lh = 480;
  b += `<rect x="${lx}" y="${ly}" width="${lw}" height="${lh}" fill="#F7F1DE" stroke="${EDGE}" filter="url(#lift)"/>`;
  for (let y = ly + 40; y < ly + lh; y += 40) b += `<line x1="${lx}" y1="${y}" x2="${lx + lw}" y2="${y}" stroke="#A9C7B4" stroke-width="1"/>`;
  b += `<line x1="${lx + 300}" y1="${ly}" x2="${lx + 300}" y2="${ly + lh}" stroke="${RULE_RED}" stroke-width="1.6"/>`;
  b += `<line x1="${lx + 306}" y1="${ly}" x2="${lx + 306}" y2="${ly + lh}" stroke="${RULE_RED}" stroke-width="1.6"/>`;
  const x0 = lx + 306, span = 1000;
  const rows = [["No skills", 33.9, "#8C826C", "cross-hatch", 320], ["Curated skills", 50.5, SERIES, "hachure", 440]];
  for (const [label, v, c, fs, y] of rows) {
    const w = span * v / 100;
    b += typed(lx + 30, y + 46, label, 24, { weight: 700 });
    b += rect(x0, y, w, 80, { fill: c, fillStyle: fs, hachureAngle: -41, hachureGap: 8, fillWeight: 2.2, stroke: c, strokeWidth: 2, roughness: 1.2 });
    b += T(x0 + w + 20, y + 54, `${v}%`, { size: 40, font: DISPLAY });
  }
  for (const p of [0, 25, 50, 75, 100]) {
    const gx = x0 + span * p / 100;
    b += typed(gx + 6, ly + lh - 24, `${p}%`, 17, { fill: PENCIL });
    b += `<line x1="${gx}" y1="${ly + lh - 60}" x2="${gx}" y2="${ly + lh - 44}" stroke="${PENCIL}" stroke-width="1.6"/>`;
  }
  const g0 = x0 + span * 0.339, g1 = x0 + span * 0.505;
  b += line(g0, 286, g0, 316, { stroke: VIOLET, strokeWidth: 2, roughness: 1, dash: "6 6" });
  b += line(g0, 286, g1, 284, { stroke: VIOLET, strokeWidth: 2.6, roughness: 1.2 });
  b += line(g1, 284, g1, 436, { stroke: VIOLET, strokeWidth: 2, roughness: 1, dash: "6 6" });
  b += stamp((g0 + g1) / 2, 238, "+16.6 PTS", -4, 24);
  b += T(1020, 350, "the gain ranged from +4.1 to +25.7", { size: 32, font: HAND, weight: 700, fill: VIOLET, rot: -2 });
  b += T(1020, 386, "points, by model and harness", { size: 32, font: HAND, weight: 700, fill: VIOLET, rot: -2 });
  b += T(800, 760, "a skill is code that runs inside the agent. measure it like code.", { size: 38, font: HAND, weight: 700, anchor: "middle", rot: -0.8 });
  b += SRC(866, "Source: Li et al., SkillsBench: Benchmarking How Well Agent Skills Work Across Diverse Tasks, arXiv 2602.12670.");
  return page(1600, 900, b);
}

// ---------------------------------------------------------------- figure 3
function fig3() {
  let b = header("Rewrite the card, not the book", "The description has to say what the skill does, when to use it, and the words people type.");
  // old card
  let c = card(70, 220, 520, 330, { rot: -3, tab: { x: 24, w: 140, text: "Testing" } });
  b += c.open + typed(96, 266, "SKILL  Testing", 20, { weight: 700 }) + typed(96, 318, "DESC.  Helps with tests.", 20) + c.close;
  b += stamp(330, 450, "TOO VAGUE", -12, 32, RULE_RED);
  b += T(96, 610, "which tests? when? what would", { size: 28, font: HAND, weight: 700, fill: RULE_RED, rot: -2 });
  b += T(96, 644, "someone type to need this?", { size: 28, font: HAND, weight: 700, fill: RULE_RED, rot: -2 });
  // new card
  const x = 660, y = 200, w = 870, h = 560, fs = 21;
  c = card(x, y, w, h, { rot: 1, tab: { x: 30, w: 160, text: "run-tests" } });
  let s = c.open + typed(x + 40, y + 46, "SKILL  run-tests", fs, { weight: 700 });
  const lines = [
    ["DESC.  Runs the test suite with the project's", "what"],
    ["       flags and fixes failures without", "what"],
    ["       weakening assertions. Use when tests", "when"],
    ["       fail, when asked to run or fix tests, or", "when"],
    ["       before opening a pull request, even if", "when"],
    ["       the user only says the build is red.", "words"],
  ];
  const ys = {};
  lines.forEach(([l, k], i) => {
    const ly = y + 94 + i * 40;
    s += typed(x + 40, ly, l, fs);
    (ys[k] = ys[k] || []).push(ly);
  });
  const bx = x + 40 + 6 * fs * TW;
  const bracket = (y0, y1, color) => line(bx, y0 - 18, bx, y1 + 8, { stroke: color, strokeWidth: 3, roughness: 1.2 }) +
    line(bx, y0 - 18, bx + 10, y0 - 19, { stroke: color, strokeWidth: 3, roughness: 0.6 }) + line(bx, y1 + 8, bx + 10, y1 + 9, { stroke: color, strokeWidth: 3, roughness: 0.6 });
  s += bracket(ys.what[0], ys.what[1], SERIES);
  s += bracket(ys.when[0], ys.when[2], VIOLET);
  const ph = "the build is red";
  const px = x + 40 + lines[5][0].indexOf(ph) * fs * TW;
  s += ellipse(px + ph.length * fs * TW / 2, ys.words[0] - 7, ph.length * fs * TW + 36, 48, { stroke: RULE_RED, strokeWidth: 2.8 });
  s += T(x + 40, y + 400, "what it does", { size: 30, font: HAND, weight: 700, fill: SERIES, rot: -2 });
  s += T(x + 270, y + 400, "when to use it", { size: 30, font: HAND, weight: 700, fill: VIOLET, rot: -2 });
  s += T(x + 520, y + 400, "the words people type", { size: 30, font: HAND, weight: 700, fill: RULE_RED, rot: -2 });
  s += c.close;
  b += s;
  b += stamp(x + 690, y + 480, "CATALOGED", 6, 28, SERIES);
  b += SRC(866, "Pattern from the Agent Skills specification and its guide to optimizing descriptions (agentskills.io).");
  return page(1600, 900, b);
}

// ---------------------------------------------------------------- figure 4
function fig4() {
  let b = header("Which drawer does it go in?", "Sort an instruction by how often it applies, and by what happens if it’s ignored.");
  const cab = { x: 250, y: 190, w: 1100, h: 600 };
  b += `<rect x="${cab.x}" y="${cab.y}" width="${cab.w}" height="${cab.h}" rx="10" fill="#6B4A2E" filter="url(#lift)"/>`;
  b += `<rect x="${cab.x}" y="${cab.y}" width="${cab.w}" height="${cab.h}" rx="10" filter="url(#fiber)" opacity="0.8"/>`;
  const drawers = [
    ["relevant to almost every task", "CUSTOM", "INSTRUCTIONS", ".github/copilot-instructions.md", false],
    ["detailed, needed only sometimes", "SKILLS", "", ".github/skills/<name>/", false],
    ["has side effects, like a deploy", "SKILLS YOU", "INVOKE", "disable-model-invocation: true", false],
    ["must never happen", "HOOKS &", "CI CHECKS", "branch protection, required checks", true],
  ];
  drawers.forEach(([q, a1, a2, ex, locked], i) => {
    const dx = cab.x + 30 + (i % 2) * 530, dy = cab.y + 30 + Math.floor(i / 2) * 285, dw = 510, dh = 255;
    b += `<rect x="${dx}" y="${dy}" width="${dw}" height="${dh}" rx="6" fill="#8A6440" stroke="#4E341F" stroke-width="2"/>`;
    b += `<rect x="${dx}" y="${dy}" width="${dw}" height="${dh}" rx="6" filter="url(#fiber)"/>`;
    const hx = dx + 95, hy = dy + 30, hw = 320, hh = 120;
    b += `<rect x="${hx - 8}" y="${hy - 8}" width="${hw + 16}" height="${hh + 16}" rx="4" fill="${BRASS}" stroke="#7E6227" stroke-width="2"/>`;
    b += `<rect x="${hx}" y="${hy}" width="${hw}" height="${hh}" fill="${CARD}"/>`;
    b += T(hx + hw / 2, hy + 30, q, { size: 19, italic: true, fill: PENCIL, anchor: "middle" });
    const big = a2 ? [a1, a2] : [a1];
    big.forEach((l, k) => { b += T(hx + hw / 2, hy + (a2 ? 70 : 86) + k * 34, l, { size: 28, font: TYPE, weight: 700, anchor: "middle", fill: locked ? RULE_RED : INK }); });
    b += `<path d="M${dx + dw / 2 - 70} ${dy + 205} q70 -34 140 0" fill="none" stroke="${BRASS}" stroke-width="9" stroke-linecap="round"/>`;
    b += T(dx + dw / 2, dy + 242, ex, { size: 16, font: TYPE, fill: "#EADBB8", anchor: "middle" });
    if (locked) {
      b += `<circle cx="${dx + dw - 46}" cy="${dy + 196}" r="17" fill="${BRASS}" stroke="#7E6227" stroke-width="2"/>`;
      b += `<rect x="${dx + dw - 49}" y="${dy + 192}" width="6" height="14" fill="#3B2A16"/><circle cx="${dx + dw - 46}" cy="${dy + 191}" r="4" fill="#3B2A16"/>`;
    }
  });
  b += T(1370, 750, "the only", { size: 30, font: HAND, weight: 700, fill: RULE_RED, rot: -4 });
  b += T(1370, 784, "locked drawer", { size: 30, font: HAND, weight: 700, fill: RULE_RED, rot: -4 });
  b += arrow(1366, 760, 1352, 730, 1330, 714, RULE_RED);
  b += T(80, 850, "instructions and skills are suggestions the model weighs. a hook or a CI check is a guarantee.", { size: 30, font: HAND, weight: 700, rot: -0.6 });
  b += SRC(886, "GitHub Docs: custom instructions for almost every task, skills when relevant. VS Code: disable-model-invocation.");
  return page(1600, 900, b);
}

// ---------------------------------------------------------------- dot-matrix printout (README)
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
const ERRS = new Set(["name", "refs"]);
function terminal() {
  const px = 60, pw = 1480, top = 30, ph = 720, row = 34, y0 = top + 74;
  let b = `<rect x="${px}" y="${top}" width="${pw}" height="${ph}" fill="#FBF8EE" filter="url(#lift)"/>`;
  for (let y = y0 - 24; y < top + ph - row; y += 2 * row) b += `<rect x="${px + 52}" y="${y}" width="${pw - 104}" height="${row}" fill="#DCEBDD"/>`;
  for (let y = top + 24; y < top + ph; y += 34) {
    b += `<circle cx="${px + 24}" cy="${y}" r="7" fill="${KRAFT}"/><circle cx="${px + pw - 24}" cy="${y}" r="7" fill="${KRAFT}"/>`;
  }
  b += `<line x1="${px + 46}" y1="${top}" x2="${px + 46}" y2="${top + ph}" stroke="#C9C3B0" stroke-dasharray="3 5"/>`;
  b += `<line x1="${px + pw - 46}" y1="${top}" x2="${px + pw - 46}" y2="${top + ph}" stroke="#C9C3B0" stroke-dasharray="3 5"/>`;
  let y = y0; const fs = 18, ch = fs * TW, x = px + 74;
  for (const [k, msg] of RUN) {
    if (k === "prompt" || k === "file") b += typed(x, y, msg, fs, { weight: 700 });
    else if (k === "summary") b += typed(x, y, msg, fs);
    else if (k) {
      b += typed(x + 2 * ch, y, k, fs, { weight: 700 });
      b += typed(x + 14 * ch, y, msg, fs);
      if (ERRS.has(k)) b += line(x + 14 * ch, y + 7, x + (14 + msg.length) * ch, y + 5, { stroke: RULE_RED, strokeWidth: 2.4, roughness: 1.4 });
    }
    y += row;
  }
  b += T(px + pw - 330, top + 120, "these two fail the run", { size: 28, font: HAND, weight: 700, fill: RULE_RED, rot: -3 });
  return page(1600, 780, b);
}

// ---------------------------------------------------------------- render
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PROFILE = join(process.env.TMPDIR || "/tmp", "skills-figures-chrome");

function render(name, svg, w, h) {
  writeFileSync(join(DIR, `${name}.svg`), svg);
  const html = join(DIR, `.render-${name}.html`), png = join(DIR, `${name}.png`);
  writeFileSync(html, `<!doctype html><html><head><style>html,body{margin:0;background:${KRAFT}}svg{display:block}</style></head><body>${svg}</body></html>`);
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
  ["linter-output", terminal, 1600, 780],
];
const only = process.argv.slice(2);
for (const [name, fn, w, h] of JOBS) {
  if (only.length && !only.some((s) => name.includes(s))) continue;
  prng = 7;
  const bytes = await render(name, fn(), w, h);
  console.log(`${name}.png  ${(bytes / 1024).toFixed(0)} KB`);
}
