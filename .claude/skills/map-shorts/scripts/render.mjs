#!/usr/bin/env node
// map-shorts render: opens clip/world/world.html in headless Chrome and screenshots window.render3d(t) for every frame.
// Usage: node render.mjs <clip_dir> [--fps 30] [--out <dir>] [--times 0.5,3,12] [--from N --to M] [--chrome <path>] [--swiftshader]
//   needs:  npm install (playwright-core, pinned) and `npx playwright-core install chromium`, or pass --chrome <path>
//   --times writes stills (t<sec>.jpg) for checking a shot before the full render.
import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync, writeFileSync, statSync } from "node:fs";
import { join, resolve, extname, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url)), TPL = resolve(here, "../template");
const argv = process.argv.slice(2), clip = resolve(argv[0] || "."), opt = (k, d) => { const i = argv.indexOf(k); return i < 0 ? d : argv[i + 1]; };
const fps = Number(opt("--fps", 30)), out = resolve(opt("--out", join(clip, "build/frames")));
const meta = JSON.parse(readFileSync(join(clip, "build/meta.json"), "utf8")), secs = meta.total;
const times = opt("--times", ""), from = Number(opt("--from", 0));
let pw;
for (const base of [import.meta.url, join(process.cwd(), "x.js")]) { try { pw = createRequire(base)("playwright-core"); break; } catch {} }
if (!pw) { console.error("playwright-core not found: run `npm i playwright-core` in this folder (or next to the skill)."); process.exit(1); }

const MIME = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".jpg": "image/jpeg", ".png": "image/png", ".ttf": "font/ttf" };
const world = join(clip, "world");
const server = createServer((req, res) => {          // clip files first, template files (three.js, textures, fonts) as the fallback
  const p = decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, "") || "world.html";
  const inside = (root, f) => f === root || f.startsWith(root + sep);   // never serve anything outside the clip or template folder
  const f = [world, TPL].map(r => [r, resolve(r, p)]).find(([r, x]) => inside(r, x) && existsSync(x) && statSync(x).isFile())?.[1];
  if (!f) { res.writeHead(404).end(); return; }
  res.writeHead(200, { "Content-Type": MIME[extname(f)] || "application/octet-stream" }).end(readFileSync(f));
}).listen(0, "127.0.0.1");
await new Promise(r => server.once("listening", r));
const url = `http://127.0.0.1:${server.address().port}/world.html`;

const args = ["--ignore-gpu-blocklist", "--enable-gpu", "--use-angle=" + (argv.includes("--swiftshader") ? "swiftshader" : "default"), "--enable-unsafe-swiftshader"];
const browser = await pw.chromium.launch({ headless: true, executablePath: opt("--chrome", undefined), args });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on("pageerror", e => process.stderr.write(`[page error] ${e}\n`));
await page.goto(url); await page.evaluate(() => document.fonts.ready); await page.evaluate(() => window.ready);
const gpu = await page.evaluate(() => { const g = document.createElement("canvas").getContext("webgl2"), e = g && g.getExtension("WEBGL_debug_renderer_info"); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : "no webgl2"; });
process.stderr.write(`renderer: ${gpu}\n`);
mkdirSync(out, { recursive: true });
if (times) {
  for (const t of times.split(",").map(Number)) { await page.evaluate(t => window.render3d(t), t); writeFileSync(join(out, `t${t}.jpg`), await page.screenshot({ type: "jpeg", quality: 88 })); }
} else {
  const n = Math.round(fps * secs), to = Math.min(n, Number(opt("--to", n))), t0 = Date.now();
  for (let i = from; i < to; i++) {
    await page.evaluate(([t, T]) => window.render3d(t, T), [i / fps, secs]);
    writeFileSync(join(out, `${String(i).padStart(4, "0")}.jpg`), await page.screenshot({ type: "jpeg", quality: 92 }));
    if (i % 60 === 0) process.stderr.write(`  ${i}/${n}  ${((i - from + 1) / ((Date.now() - t0) / 1000)).toFixed(2)} fps\n`);
  }
}
await browser.close(); server.close();
process.stderr.write(`${times ? "stills" : "frames"} -> ${out}\n`);
