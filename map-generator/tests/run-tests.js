"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const core = require("../map-core.js");

const base = {
  placeName: "星河剧场",
  city: "临川市",
  district: "南城区",
  mainRoad: "青梧路",
  streetNumber: "88号",
  address: "临川市南城区青梧路88号",
  preset: "commercial",
  palette: "classic",
  seed: "fixed-seed",
  density: 68,
  regularity: 72,
  river: true,
  subway: true,
  subwayLine: "6",
  stationName: "青梧路站",
};

const first = core.generateMapSvg(base);
const second = core.generateMapSvg({ ...base });
assert.equal(first, second, "同样的输入和种子必须得到逐字相同的 SVG");

const normalizedWhitespace = core.generateMapSvg({
  ...base,
  placeName: "  星河剧场  ",
  address: "临川市南城区青梧路88号   ",
});
assert.equal(first, normalizedWhitespace, "首尾空格不应改变地图");

const differentSeed = core.generateMapSvg({ ...base, seed: "another-seed" });
assert.notEqual(first, differentSeed, "不同种子应生成不同 SVG");

assert.match(first, /viewBox="0 0 1000 1400"/u);
assert.match(first, /data-map-target="true"/u);
assert.match(first, /<metadata id="map-generator-data">/u);
assert.doesNotMatch(first, /NaN|undefined|Math\.random/iu);

const metadata = core.extractMetadata(first);
assert.equal(metadata.generatorVersion, 1);
assert.deepEqual(metadata.canvas, { width: 1000, height: 1400 });
assert.deepEqual(metadata.target, { x: 500, y: 650 });
assert.equal(metadata.settings.seed, "fixed-seed");
assert.equal(metadata.settings.address, "临川市南城区青梧路88号");
assert.equal(metadata.settings.placeName, "星河剧场");

const seeds = core.candidateSeeds("fixed-seed", 9);
assert.equal(seeds.length, 9);
assert.equal(seeds[0], "fixed-seed");
assert.equal(new Set(seeds).size, 9);

for (const preset of Object.keys(core.PRESETS)) {
  const svg = core.generateMapSvg({ ...base, preset, seed: `preset-${preset}` });
  assert.match(svg, /<svg\b/u, `${preset} 应生成有效 SVG`);
  assert.doesNotMatch(svg, /NaN|undefined/iu, `${preset} 不应产生无效数值`);
  const data = core.extractMetadata(svg);
  assert.equal(data.settings.preset, preset);
  if (preset === "riverside") assert.equal(data.settings.river, true);
}

assert.throws(() => core.extractMetadata("<svg></svg>"), /metadata/u);

const toolRoot = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(toolRoot, "index.html"), "utf8");
const uiScript = fs.readFileSync(path.join(toolRoot, "generator.js"), "utf8");
const referencedIds = [...uiScript.matchAll(/querySelector\("#([^"\s]+)"\)/gu)].map((match) => match[1]);
for (const id of new Set(referencedIds)) {
  assert.match(html, new RegExp(`id=["']${id}["']`, "u"), `index.html 应包含 #${id}`);
}
assert.match(html, /<script src="\.\/map-core\.js" defer><\/script>/u);
assert.match(html, /<script src="\.\/generator\.js" defer><\/script>/u);
assert.match(html, /<link rel="stylesheet" href="\.\/styles\.css" \/>/u);

console.log("map-generator tests: all checks passed");
