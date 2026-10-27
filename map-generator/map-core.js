(function initMapGeneratorCore(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MapGeneratorCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createMapGeneratorCore() {
  "use strict";

  const GENERATOR_VERSION = 1;
  const WIDTH = 1000;
  const HEIGHT = 1400;
  const TARGET = Object.freeze({ x: 500, y: 650 });

  const DEFAULTS = Object.freeze({
    placeName: "星河剧场",
    city: "临川市",
    district: "南城区",
    mainRoad: "青梧路",
    streetNumber: "88号",
    address: "临川市南城区青梧路88号",
    preset: "commercial",
    palette: "classic",
    seed: "20261028",
    density: 68,
    regularity: 72,
    river: false,
    subway: true,
    subwayLine: "6",
    stationName: "青梧路站",
  });

  const PRESETS = Object.freeze({
    downtown: { roads: 7, buildings: 1.25, green: 0.08, largeBlocks: 0.15 },
    residential: { roads: 6, buildings: 0.95, green: 0.22, largeBlocks: 0.25 },
    commercial: { roads: 6, buildings: 1.12, green: 0.13, largeBlocks: 0.32 },
    park: { roads: 4, buildings: 0.55, green: 0.55, largeBlocks: 0.45 },
    campus: { roads: 5, buildings: 0.72, green: 0.38, largeBlocks: 0.56 },
    suburban: { roads: 4, buildings: 0.55, green: 0.42, largeBlocks: 0.52 },
    riverside: { roads: 5, buildings: 0.78, green: 0.38, largeBlocks: 0.42, forceRiver: true },
    industrial: { roads: 5, buildings: 0.7, green: 0.12, largeBlocks: 0.72 },
  });

  const PALETTES = Object.freeze({
    classic: {
      background: "#edf0e9",
      block: "#e9ece5",
      blockAlt: "#e4e9df",
      commercial: "#f4efe5",
      park: "#dfeadd",
      parkDeep: "#d3e5d1",
      building: "#f6f1e8",
      buildingAlt: "#eee6da",
      buildingStroke: "#dddcd4",
      target: "#eadbcf",
      targetInner: "#f8f2e9",
      targetStroke: "#d5c3b5",
      roadEdge: "#d9dedb",
      road: "#ffffff",
      waterEdge: "#cae5e8",
      water: "#91d0dc",
      waterText: "#478e9b",
      text: "#707778",
      strongText: "#87624c",
      subway: "#a777ba",
    },
    warm: {
      background: "#f0ede6",
      block: "#ebe6dc",
      blockAlt: "#e6e1d6",
      commercial: "#f3e8d9",
      park: "#e1e7d8",
      parkDeep: "#d6e1cb",
      building: "#f6eee3",
      buildingAlt: "#eadfd1",
      buildingStroke: "#ddd2c5",
      target: "#e7cfc0",
      targetInner: "#faf0e6",
      targetStroke: "#d1b7a7",
      roadEdge: "#ddd7cf",
      road: "#fffdf9",
      waterEdge: "#cddfe0",
      water: "#9bc9ce",
      waterText: "#578c91",
      text: "#756f69",
      strongText: "#8d5e49",
      subway: "#b47a9d",
    },
    fresh: {
      background: "#eaf0ed",
      block: "#e3ebe6",
      blockAlt: "#dfe9e3",
      commercial: "#f1eee4",
      park: "#d8ebd9",
      parkDeep: "#cae2cc",
      building: "#f5f2e9",
      buildingAlt: "#e9e6dc",
      buildingStroke: "#d7ddd7",
      target: "#e6d7ca",
      targetInner: "#f8f4ec",
      targetStroke: "#cfbeb0",
      roadEdge: "#d2dcda",
      road: "#ffffff",
      waterEdge: "#bcdfe4",
      water: "#7fc9d7",
      waterText: "#3b8795",
      text: "#667471",
      strongText: "#7f654f",
      subway: "#8c78ba",
    },
  });

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function numberOr(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function cleanText(value, fallback) {
    const text = String(value == null ? "" : value).replace(/\s+/gu, " ").trim();
    return text || fallback;
  }

  function normalizeSettings(input) {
    const source = input || {};
    const normalized = {
      placeName: cleanText(source.placeName, DEFAULTS.placeName),
      city: cleanText(source.city, DEFAULTS.city),
      district: cleanText(source.district, DEFAULTS.district),
      mainRoad: cleanText(source.mainRoad, DEFAULTS.mainRoad),
      streetNumber: cleanText(source.streetNumber, DEFAULTS.streetNumber),
      address: cleanText(source.address, ""),
      preset: Object.prototype.hasOwnProperty.call(PRESETS, source.preset)
        ? source.preset
        : DEFAULTS.preset,
      palette: Object.prototype.hasOwnProperty.call(PALETTES, source.palette)
        ? source.palette
        : DEFAULTS.palette,
      seed: cleanText(source.seed, DEFAULTS.seed),
      density: Math.round(clamp(numberOr(source.density, DEFAULTS.density), 0, 100)),
      regularity: Math.round(clamp(numberOr(source.regularity, DEFAULTS.regularity), 0, 100)),
      river: Boolean(source.river),
      subway: Boolean(source.subway),
      subwayLine: cleanText(source.subwayLine, DEFAULTS.subwayLine),
      stationName: cleanText(source.stationName, ""),
    };
    if (!normalized.address) {
      normalized.address = `${normalized.city}${normalized.district}${normalized.mainRoad}${normalized.streetNumber}`;
    }
    if (normalized.subway && !normalized.stationName) {
      normalized.stationName = `${normalized.mainRoad}站`;
    }
    if (PRESETS[normalized.preset].forceRiver) normalized.river = true;
    return normalized;
  }

  function canonicalSettings(settings) {
    const s = normalizeSettings(settings);
    return JSON.stringify({
      placeName: s.placeName,
      city: s.city,
      district: s.district,
      mainRoad: s.mainRoad,
      streetNumber: s.streetNumber,
      address: s.address,
      preset: s.preset,
      palette: s.palette,
      seed: s.seed,
      density: s.density,
      regularity: s.regularity,
      river: s.river,
      subway: s.subway,
      subwayLine: s.subwayLine,
      stationName: s.stationName,
    });
  }

  function hashString(value) {
    let hash = 0x811c9dc5;
    const text = String(value);
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
  }

  function createRandom(seed) {
    let state = seed >>> 0;
    return function random() {
      state += 0x6d2b79f5;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  function round(value, digits) {
    const scale = 10 ** (digits == null ? 1 : digits);
    return Math.round(value * scale) / scale;
  }

  function between(random, min, max) {
    return min + (max - min) * random();
  }

  function integer(random, min, max) {
    return Math.floor(between(random, min, max + 1));
  }

  function pick(random, values) {
    return values[Math.min(values.length - 1, Math.floor(random() * values.length))];
  }

  function xmlEscape(value) {
    return String(value)
      .replace(/&/gu, "&amp;")
      .replace(/</gu, "&lt;")
      .replace(/>/gu, "&gt;")
      .replace(/"/gu, "&quot;")
      .replace(/'/gu, "&apos;");
  }

  function xmlUnescape(value) {
    return String(value)
      .replace(/&quot;/gu, '"')
      .replace(/&apos;/gu, "'")
      .replace(/&gt;/gu, ">")
      .replace(/&lt;/gu, "<")
      .replace(/&amp;/gu, "&");
  }

  function roadPath(orientation, position, random, irregularity) {
    const sway = 12 + irregularity * 54;
    if (orientation === "horizontal") {
      const y1 = position + between(random, -sway, sway);
      const y2 = position + between(random, -sway, sway);
      const y3 = position + between(random, -sway, sway);
      return `M-80 ${round(position)} C220 ${round(y1)} 720 ${round(y2)} 1080 ${round(y3)}`;
    }
    const x1 = position + between(random, -sway, sway);
    const x2 = position + between(random, -sway, sway);
    const x3 = position + between(random, -sway, sway);
    return `M${round(position)} -80 C${round(x1)} 330 ${round(x2)} 990 ${round(x3)} 1480`;
  }

  function makeAxisPositions(count, min, max, random, regularity) {
    const positions = [];
    const step = (max - min) / (count + 1);
    const jitter = step * (0.1 + (1 - regularity) * 0.34);
    for (let index = 1; index <= count; index += 1) {
      positions.push(round(min + step * index + between(random, -jitter, jitter), 0));
    }
    return positions.sort((a, b) => a - b);
  }

  function mergeAxis(positions, forced, minGap) {
    const combined = [...positions, forced].sort((a, b) => a - b);
    const output = [];
    for (const value of combined) {
      if (!output.length || Math.abs(value - output[output.length - 1]) >= minGap || value === forced) {
        output.push(value);
      } else if (output[output.length - 1] !== forced) {
        output[output.length - 1] = round((output[output.length - 1] + value) / 2, 0);
      }
    }
    return output.sort((a, b) => a - b);
  }

  function polygonBlock(x1, y1, x2, y2, random, irregularity) {
    const inset = 20 + irregularity * 10;
    const jitter = 4 + irregularity * 15;
    const left = x1 + inset + between(random, -jitter, jitter);
    const top = y1 + inset + between(random, -jitter, jitter);
    const right = x2 - inset + between(random, -jitter, jitter);
    const bottom = y2 - inset + between(random, -jitter, jitter);
    if (right - left < 36 || bottom - top < 36) return null;
    return {
      left,
      top,
      right,
      bottom,
      d: `M${round(left)} ${round(top)} L${round(right)} ${round(top + between(random, -jitter, jitter))} L${round(right + between(random, -jitter, jitter))} ${round(bottom)} L${round(left + between(random, -jitter, jitter))} ${round(bottom + between(random, -jitter, jitter))} Z`,
    };
  }

  function intersectsTarget(block, padding) {
    const gap = padding == null ? 190 : padding;
    return block.left < TARGET.x + gap && block.right > TARGET.x - gap &&
      block.top < TARGET.y + gap && block.bottom > TARGET.y - gap;
  }

  function wrapLabel(text, maxUnits) {
    const characters = Array.from(text);
    const max = Math.max(5, maxUnits || 12);
    if (characters.length <= max) return [text];
    const firstLength = Math.min(max, Math.ceil(characters.length / 2));
    return [characters.slice(0, firstLength).join(""), characters.slice(firstLength).join("")];
  }

  function targetLabelSvg(settings) {
    const lines = wrapLabel(settings.placeName, 13).slice(0, 2);
    const fontSize = lines.join("").length > 20 ? 20 : lines.length > 1 ? 22 : 26;
    const startY = TARGET.y - (lines.length - 1) * 15 + 8;
    const spans = lines.map((line, index) =>
      `<tspan x="${TARGET.x}" y="${round(startY + index * 31, 0)}">${xmlEscape(line)}</tspan>`).join("");
    return `<text text-anchor="middle" fill="currentColor" font-size="${fontSize}" font-weight="700">${spans}</text>`;
  }

  function generateMapSvg(input) {
    const settings = normalizeSettings(input);
    const preset = PRESETS[settings.preset];
    const palette = PALETTES[settings.palette];
    const canonical = canonicalSettings(settings);
    const seedHash = hashString(`map-generator-v${GENERATOR_VERSION}|${canonical}`);
    const random = createRandom(seedHash);
    const regularity = settings.regularity / 100;
    const irregularity = 1 - regularity;
    const density = settings.density / 100;
    const baseRoads = clamp(Math.round(preset.roads - 2 + density * 4), 3, 9);
    const verticalCount = clamp(Math.round(baseRoads / 2 + between(random, -1, 1)), 2, 6);
    const horizontalCount = clamp(baseRoads - verticalCount, 2, 6);
    const mainHorizontal = random() >= 0.46;
    const mainPosition = mainHorizontal
      ? round(TARGET.y + between(random, 120, 165), 0)
      : round(TARGET.x + between(random, 145, 195), 0);
    let verticals = makeAxisPositions(verticalCount, 75, WIDTH - 75, random, regularity);
    let horizontals = makeAxisPositions(horizontalCount, 80, HEIGHT - 80, random, regularity);
    if (mainHorizontal) horizontals = mergeAxis(horizontals, mainPosition, 82);
    else verticals = mergeAxis(verticals, mainPosition, 82);

    const riverEnabled = settings.river || Boolean(preset.forceRiver);
    let riverSvg = "";
    if (riverEnabled) {
      const riverHorizontal = random() > 0.42;
      if (riverHorizontal) {
        const baseY = random() > 0.5 ? between(random, 1030, 1190) : between(random, 160, 280);
        const riverD = `M-100 ${round(baseY)} C220 ${round(baseY + between(random, -90, 90))} 690 ${round(baseY + between(random, -100, 100))} 1100 ${round(baseY + between(random, -65, 65))}`;
        riverSvg = `<g fill="none" stroke-linecap="round"><path d="${riverD}" stroke="${palette.parkDeep}" stroke-width="154"/><path d="${riverD}" stroke="${palette.waterEdge}" stroke-width="112"/><path d="${riverD}" stroke="${palette.water}" stroke-width="96"/></g>`;
      } else {
        const baseX = random() > 0.5 ? between(random, 805, 900) : between(random, 100, 195);
        const riverD = `M${round(baseX)} -100 C${round(baseX + between(random, -80, 80))} 370 ${round(baseX + between(random, -100, 100))} 970 ${round(baseX + between(random, -70, 70))} 1500`;
        riverSvg = `<g fill="none" stroke-linecap="round"><path d="${riverD}" stroke="${palette.parkDeep}" stroke-width="154"/><path d="${riverD}" stroke="${palette.waterEdge}" stroke-width="112"/><path d="${riverD}" stroke="${palette.water}" stroke-width="96"/></g>`;
      }
    }

    const xBounds = [0, ...verticals, WIDTH];
    const yBounds = [0, ...horizontals, HEIGHT];
    const blockParts = [];
    const buildingParts = [];
    for (let xi = 0; xi < xBounds.length - 1; xi += 1) {
      for (let yi = 0; yi < yBounds.length - 1; yi += 1) {
        const block = polygonBlock(xBounds[xi], yBounds[yi], xBounds[xi + 1], yBounds[yi + 1], random, irregularity);
        if (!block) continue;
        const blockWidth = block.right - block.left;
        const blockHeight = block.bottom - block.top;
        const targetArea = intersectsTarget(block, 175);
        const greenChance = preset.green + (riverEnabled ? 0.05 : 0);
        const isGreen = !targetArea && random() < greenChance;
        const isCommercial = !isGreen && random() < 0.18 + preset.largeBlocks * 0.22;
        const fill = isGreen
          ? (random() > 0.45 ? palette.park : palette.parkDeep)
          : isCommercial ? palette.commercial : (random() > 0.5 ? palette.block : palette.blockAlt);
        blockParts.push(`<path d="${block.d}" fill="${fill}"/>`);
        if (targetArea || isGreen || blockWidth < 95 || blockHeight < 95) continue;

        const areaFactor = (blockWidth * blockHeight) / 70000;
        const desired = clamp(Math.round(areaFactor * preset.buildings * (0.45 + density)), 1, 4);
        const columns = desired > 2 && blockWidth > 190 ? 2 : 1;
        const rows = Math.ceil(desired / columns);
        const gap = 14;
        const cellWidth = (blockWidth - 28 - gap * (columns - 1)) / columns;
        const cellHeight = (blockHeight - 28 - gap * (rows - 1)) / rows;
        for (let index = 0; index < desired; index += 1) {
          const column = index % columns;
          const row = Math.floor(index / columns);
          const width = Math.max(34, cellWidth * between(random, 0.58, 0.91));
          const height = Math.max(30, cellHeight * between(random, 0.55, 0.88));
          const x = block.left + 14 + column * (cellWidth + gap) + (cellWidth - width) / 2;
          const y = block.top + 14 + row * (cellHeight + gap) + (cellHeight - height) / 2;
          const rotation = round(between(random, -2.4, 2.4) * irregularity, 1);
          const buildingFill = random() > 0.48 ? palette.building : palette.buildingAlt;
          buildingParts.push(`<rect x="${round(x)}" y="${round(y)}" width="${round(width)}" height="${round(height)}" rx="${round(between(random, 2, 8), 0)}" fill="${buildingFill}" stroke="${palette.buildingStroke}" stroke-width="2" transform="rotate(${rotation} ${round(x + width / 2)} ${round(y + height / 2)})"/>`);
        }
      }
    }

    const roads = [];
    for (let index = 0; index < verticals.length; index += 1) {
      const position = verticals[index];
      const main = !mainHorizontal && position === mainPosition;
      const wide = main ? 58 : index % 2 === 0 ? 34 : 24;
      roads.push({ d: roadPath("vertical", position, random, irregularity), edge: wide + 8, inner: wide, main });
    }
    for (let index = 0; index < horizontals.length; index += 1) {
      const position = horizontals[index];
      const main = mainHorizontal && position === mainPosition;
      const wide = main ? 58 : index % 2 === 0 ? 35 : 24;
      roads.push({ d: roadPath("horizontal", position, random, irregularity), edge: wide + 8, inner: wide, main });
    }
    const roadEdges = roads.map((road) => `<path d="${road.d}" stroke="${palette.roadEdge}" stroke-width="${road.edge}"/>`).join("");
    const roadCenters = roads.map((road) => `<path d="${road.d}" stroke="${palette.road}" stroke-width="${road.inner}"/>`).join("");

    const targetWidth = settings.preset === "industrial" ? 330 : settings.preset === "campus" ? 310 : 286;
    const targetHeight = settings.preset === "industrial" ? 176 : 164;
    const targetX = TARGET.x - targetWidth / 2;
    const targetY = TARGET.y - targetHeight / 2;
    const targetSvg = [
      `<g data-map-target="true" color="${palette.strongText}">`,
      `<rect x="${round(targetX - 13)}" y="${round(targetY - 13)}" width="${round(targetWidth + 26)}" height="${round(targetHeight + 26)}" rx="10" fill="${palette.target}" stroke="${palette.targetStroke}" stroke-width="6"/>`,
      `<rect x="${round(targetX)}" y="${round(targetY)}" width="${round(targetWidth)}" height="${round(targetHeight)}" rx="7" fill="${palette.targetInner}"/>`,
      `<path d="M${round(targetX + targetWidth * 0.18)} ${round(targetY + targetHeight * 0.24)} H${round(targetX + targetWidth * 0.82)} M${round(targetX + targetWidth * 0.18)} ${round(targetY + targetHeight * 0.76)} H${round(targetX + targetWidth * 0.82)}" fill="none" stroke="${palette.targetStroke}" stroke-width="5" stroke-linecap="round" opacity=".72"/>`,
      targetLabelSvg(settings),
      "</g>",
    ].join("");

    const roadLabel = mainHorizontal
      ? `<text x="${round(TARGET.x + 265)}" y="${round(mainPosition - 23)}" fill="${palette.text}" font-size="25" text-anchor="middle">${xmlEscape(settings.mainRoad)}</text>`
      : `<text x="${round(mainPosition - 23)}" y="${round(TARGET.y - 255)}" fill="${palette.text}" font-size="25" text-anchor="middle" transform="rotate(-90 ${round(mainPosition - 23)} ${round(TARGET.y - 255)})">${xmlEscape(settings.mainRoad)}</text>`;

    let subwaySvg = "";
    if (settings.subway) {
      if (mainHorizontal) {
        const stationX = random() > 0.5 ? 185 : 815;
        subwaySvg = `<g transform="translate(${stationX} ${round(mainPosition)})"><circle r="25" fill="${palette.subway}" stroke="#fff" stroke-width="5"/><text y="9" fill="#fff" font-size="25" font-weight="700" text-anchor="middle">${xmlEscape(settings.subwayLine)}</text><text x="${stationX > 500 ? -42 : 42}" y="8" fill="${palette.text}" font-size="22" text-anchor="${stationX > 500 ? "end" : "start"}">${xmlEscape(settings.stationName)}</text></g>`;
      } else {
        const stationY = random() > 0.5 ? 260 : 1080;
        subwaySvg = `<g transform="translate(${round(mainPosition)} ${stationY})"><circle r="25" fill="${palette.subway}" stroke="#fff" stroke-width="5"/><text y="9" fill="#fff" font-size="25" font-weight="700" text-anchor="middle">${xmlEscape(settings.subwayLine)}</text><text x="42" y="8" fill="${palette.text}" font-size="22">${xmlEscape(settings.stationName)}</text></g>`;
      }
    }

    const metadata = {
      generatorVersion: GENERATOR_VERSION,
      canvas: { width: WIDTH, height: HEIGHT },
      target: TARGET,
      settings,
    };
    const metadataJson = JSON.stringify(metadata);
    const mapId = seedHash.toString(16).padStart(8, "0");
    return [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-labelledby="map-title-${mapId}" data-map-generator-version="${GENERATOR_VERSION}" data-map-seed="${xmlEscape(settings.seed)}">`,
      `<title id="map-title-${mapId}">${xmlEscape(settings.placeName)}示意地图</title>`,
      `<metadata id="map-generator-data">${xmlEscape(metadataJson)}</metadata>`,
      `<rect width="${WIDTH}" height="${HEIGHT}" fill="${palette.background}"/>`,
      `<g aria-hidden="true">${blockParts.join("")}</g>`,
      riverSvg,
      `<g fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${roadEdges}${roadCenters}</g>`,
      `<g aria-hidden="true">${buildingParts.join("")}</g>`,
      targetSvg,
      `<g font-family="PingFang SC, Microsoft YaHei, Noto Sans CJK SC, sans-serif">${roadLabel}${subwaySvg}</g>`,
      `</svg>`,
    ].filter(Boolean).join("\n");
  }

  function extractMetadata(svgText) {
    const source = String(svgText || "");
    const match = source.match(/<metadata\b[^>]*\bid=["']map-generator-data["'][^>]*>([\s\S]*?)<\/metadata>/iu);
    if (!match) throw new Error("SVG 中没有找到 map-generator metadata。");
    const parsed = JSON.parse(xmlUnescape(match[1].trim()));
    if (!parsed || parsed.generatorVersion !== GENERATOR_VERSION || !parsed.settings) {
      throw new Error(`当前工具无法读取版本 ${parsed && parsed.generatorVersion ? parsed.generatorVersion : "未知"} 的地图。`);
    }
    return parsed;
  }

  function candidateSeeds(baseSeed, count) {
    const seed = cleanText(baseSeed, DEFAULTS.seed);
    const total = Math.max(1, Math.floor(numberOr(count, 1)));
    return Array.from({ length: total }, (_, index) => index === 0 ? seed : `${seed}-${index + 1}`);
  }

  return Object.freeze({
    GENERATOR_VERSION,
    WIDTH,
    HEIGHT,
    TARGET,
    DEFAULTS,
    PRESETS,
    PALETTES,
    normalizeSettings,
    canonicalSettings,
    generateMapSvg,
    extractMetadata,
    candidateSeeds,
    hashString,
  });
});
