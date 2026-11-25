// 从 Minecraft 的字体资源（assets/minecraft/font + textures/font）生成一个
// 真正的 TrueType 字体：每个字形像素变成一个方形轮廓，advance 按 MC 的规则
// （像素宽度 + 1 像素间隔）写进 hmtx。这样浏览器排版时用的是 MC 自己的字形和
// 度量，而不是任何近似字体。
//
// 用法：node scripts/make-mc-font.mjs
// 输入：frontend/fonts/mc/{include/default.json, include/space.json, *.png}
// 输出：frontend/fonts/mc_vanilla.ttf
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const FONT_DIR = path.resolve("scripts/mc-font");
const OUT = path.resolve("frontend/fonts/mc_vanilla.ttf");

// unitsPerEm 必须落在 OpenType 规定的 [16, 16384]；这里一个 Minecraft 字体像素 = 16 单位，
// 8 像素高的字身正好是 128 单位。浏览器把 16px 的字排成 2 倍，正好每个像素 2×2。
const PX = 16;
const UPEM = 8 * PX;
const ASCENT = 7 * PX;
const DESCENT = 1 * PX;

// ---------------------------------------------------------------- PNG（1/2/4/8 位调色板）

function readPng(file) {
  const buf = fs.readFileSync(file);
  if (buf.readUInt32BE(0) !== 0x89504e47 || buf.readUInt32BE(4) !== 0x0d0a1a0a) {
    throw new Error(`${file}: 不是 PNG`);
  }
  let off = 8;
  let width = 0;
  let height = 0;
  let depth = 0;
  let colorType = 0;
  let palette = [];
  let trns = [];
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString("ascii", off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      depth = data[8];
      colorType = data[9];
      if (data[12] !== 0) throw new Error(`${file}: 不支持隔行扫描`);
    } else if (type === "PLTE") {
      palette = [];
      for (let i = 0; i < data.length; i += 3) palette.push([data[i], data[i + 1], data[i + 2]]);
    } else if (type === "tRNS") {
      trns = [...data];
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
    off += 12 + len;
  }
  if (colorType !== 3) throw new Error(`${file}: 只支持调色板 PNG（实际 ${colorType}）`);
  const bpp = 1;
  const rowBytes = Math.ceil((width * depth) / 8);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const rows = [];
  let prev = Buffer.alloc(rowBytes);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (rowBytes + 1)];
    const line = Buffer.from(raw.subarray(y * (rowBytes + 1) + 1, (y + 1) * (rowBytes + 1)));
    for (let i = 0; i < rowBytes; i++) {
      const left = i >= bpp ? line[i - bpp] : 0;
      const up = prev[i];
      const ul = i >= bpp ? prev[i - bpp] : 0;
      switch (filter) {
        case 0: break;
        case 1: line[i] = (line[i] + left) & 0xff; break;
        case 2: line[i] = (line[i] + up) & 0xff; break;
        case 3: line[i] = (line[i] + ((left + up) >> 1)) & 0xff; break;
        case 4: {
          const p = left + up - ul;
          const pa = Math.abs(p - left);
          const pb = Math.abs(p - up);
          const pc = Math.abs(p - ul);
          const pred = pa <= pb && pa <= pc ? left : pb <= pc ? up : ul;
          line[i] = (line[i] + pred) & 0xff;
          break;
        }
        default: throw new Error(`${file}: 未知过滤器 ${filter}`);
      }
    }
    rows.push(line);
    prev = line;
  }
  const mask = (1 << depth) - 1;
  const get = (x, y) => {
    const byte = rows[y][(x * depth) >> 3];
    const shift = 8 - depth - (((x * depth) & 7) >> 0);
    const idx = (byte >> shift) & mask;
    const entry = palette[idx] || [255, 255, 255];
    const alpha = trns.length ? (trns[idx] ?? 255) : 255;
    return { r: entry[0], g: entry[1], b: entry[2], a: alpha };
  };
  return { width, height, get };
}

// ---------------------------------------------------------------- 读取 MC 字体定义

function codePointsOf(value) {
  const out = [];
  for (const ch of value) out.push(ch.codePointAt(0));
  return out;
}

const defaultJson = JSON.parse(fs.readFileSync(path.join(FONT_DIR, "default.json"), "utf8"));
const includeDefault = JSON.parse(fs.readFileSync(path.join(FONT_DIR, "include", "default.json"), "utf8"));
const includeSpace = JSON.parse(fs.readFileSync(path.join(FONT_DIR, "include", "space.json"), "utf8"));

const providers = [];
for (const p of defaultJson.providers) {
  if (p.type === "reference" && p.id === "minecraft:include/default") providers.push(...includeDefault.providers);
  else if (p.type === "reference" && p.id === "minecraft:include/space") providers.push(...includeSpace.providers);
  else if (p.type === "space") providers.push(p);
  // include/unifont 在这个 assets 里是空的（unihex 的 zip 没被导出），
  // 中文字形继续交给 fonts/unifont.woff2 兜底。
}

// 每个字形：{ cp, gw, gh, ascent, pixels: [[x,y]...], advance }
const glyphByCp = new Map();

for (const p of providers) {
  if (p.type === "space") {
    for (const [ch, adv] of Object.entries(p.advances || {})) {
      const cp = ch.codePointAt(0);
      if (!glyphByCp.has(cp)) glyphByCp.set(cp, { cp, gw: 0, gh: 0, ascent: 0, pixels: [], advance: adv });
    }
    continue;
  }
  if (p.type !== "bitmap") continue;
  const file = path.join(FONT_DIR, p.file.replace(/^minecraft:font\//, ""));
  const img = readPng(file);
  const cellW = Math.floor(img.width / 16);
  const rows = p.chars || [];
  const cellH = Math.floor(img.height / rows.length) || p.height || 8;
  const ascent = p.ascent ?? p.height ?? 8;
  rows.forEach((row, rowIndex) => {
    const cps = codePointsOf(row);
    cps.forEach((cp, colIndex) => {
      if (cp === 0 || glyphByCp.has(cp)) return;
      const sx = colIndex * cellW;
      const sy = rowIndex * cellH;
      const pixels = [];
      let right = -1;
      for (let x = 0; x < cellW; x++) {
        for (let y = 0; y < cellH; y++) {
          if (img.get(sx + x, sy + y).a > 0) {
            pixels.push([x, y]);
            if (x > right) right = x;
          }
        }
      }
      const gw = right + 1;
      glyphByCp.set(cp, {
        cp,
        gw,
        gh: cellH,
        ascent,
        // MC 的规则：字形宽度 + 1 像素的字距
        advance: gw > 0 ? gw + 1 : 0,
        pixels: pixels.filter(([x]) => x <= right),
      });
    });
  });
}

// ---------------------------------------------------------------- 组装 TrueType

const cps = [...glyphByCp.keys()].filter((cp) => cp > 0 && cp <= 0xffff).sort((a, b) => a - b);
const glyphs = [{ cp: -1, advance: 1, pixels: [], ascent: ASCENT / PX }];
const cpToGid = new Map();
for (const cp of cps) {
  cpToGid.set(cp, glyphs.length);
  glyphs.push(glyphByCp.get(cp));
}

function be16(v) {
  const b = Buffer.alloc(2);
  b.writeInt16BE(v);
  return b;
}
function be16u(v) {
  const b = Buffer.alloc(2);
  b.writeUInt16BE(v & 0xffff);
  return b;
}
function be32u(v) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(v >>> 0);
  return b;
}
function be32(v) {
  const b = Buffer.alloc(4);
  b.writeInt32BE(v);
  return b;
}

// 每个字形：把像素行合并成横向长条，每条一个方形轮廓。
function buildGlyph(g) {
  const rects = [];
  const byRow = new Map();
  for (const [x, y] of g.pixels) {
    if (!byRow.has(y)) byRow.set(y, []);
    byRow.get(y).push(x);
  }
  for (const [y, xs] of [...byRow.entries()].sort((a, b) => a[0] - b[0])) {
    xs.sort((a, b) => a - b);
    let start = xs[0];
    let prev = xs[0];
    for (let i = 1; i <= xs.length; i++) {
      const x = xs[i];
      if (x !== prev + 1) {
        rects.push([start, prev + 1, y]);
        start = x;
      }
      prev = x;
    }
  }
  if (!rects.length) return { data: Buffer.alloc(0), contours: 0, points: 0, bbox: [0, 0, 0, 0] };
  const rectPixels = rects.map(([x0, x1, y]) => {
    const top = g.ascent - y; // 基线以上的像素行
    return { x0: x0 * PX, x1: x1 * PX, y0: (top - 1) * PX, y1: top * PX };
  });
  const xs = rectPixels.flatMap((r) => [r.x0, r.x1]);
  const ys = rectPixels.flatMap((r) => [r.y0, r.y1]);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);

  const contours = rectPixels.map((r) => [
    [r.x0, r.y0],
    [r.x1, r.y0],
    [r.x1, r.y1],
    [r.x0, r.y1],
  ]);
  const points = contours.flat();
  const parts = [];
  parts.push(be16(contours.length), be16(xMin), be16(yMin), be16(xMax), be16(yMax));
  let end = -1;
  const ends = contours.map((c) => (end += c.length));
  for (const e of ends) parts.push(Buffer.from(be16(e)));
  parts.push(be16(0)); // 无指令
  // flags：全部 on-curve，x/y 用 int16 增量
  const flags = Buffer.alloc(points.length, 0x01);
  parts.push(flags);
  let px = 0;
  for (const [x] of points) {
    parts.push(be16(x - px));
    px = x;
  }
  let py = 0;
  for (const [, y] of points) {
    parts.push(be16(y - py));
    py = y;
  }
  return { data: Buffer.concat(parts), contours: contours.length, points: points.length, bbox: [xMin, yMin, xMax, yMax] };
}

const built = glyphs.map(buildGlyph);

// loca / glyf（glyf 每条按 4 字节对齐）
const glyfParts = [];
const loca = [0];
for (const b of built) {
  const pad = (4 - (b.data.length % 4)) % 4;
  const chunk = Buffer.concat([b.data, Buffer.alloc(pad)]);
  glyfParts.push(chunk);
  loca.push(loca[loca.length - 1] + chunk.length);
}
const glyf = Buffer.concat(glyfParts);
const locaBuf = Buffer.concat(loca.map((v) => be32(v)));

// hhea / hmtx
const advanceMax = Math.max(...glyphs.map((g) => g.advance)) * PX;
const hmtx = Buffer.concat(glyphs.map((g) => Buffer.concat([be16(g.advance * PX), be16(0)])));
const hhea = Buffer.concat([
  be32(0x00010000),
  be16(ASCENT),
  be16(-DESCENT),
  be16(0),
  be16(advanceMax),
  be16(0), be16(0), be16(0), // minLeftSideBearing, minRightSideBearing, xMaxExtent
  be16(1), be16(0), be16(0), // caretSlopeRise/Run/Offset
  Buffer.alloc(8, 0), // reserved
  be16(0), // metricDataFormat
  be16(glyphs.length),
]);
const maxp = Buffer.concat([
  be32(0x00010000),
  be16(glyphs.length),
  be16(Math.max(0, ...built.map((b) => b.points))),
  be16(Math.max(0, ...built.map((b) => b.contours))),
  be16(0), be16(0), be16(2), be16(0), be16(0), be16(0), be16(0), be16(0), be16(0), be16(0), be16(0),
]);

// cmap format 4
const segments = [];
for (let i = 0; i < cps.length; i++) {
  const start = cps[i];
  let end = start;
  while (i + 1 < cps.length && cps[i + 1] === end + 1 && cpToGid.get(cps[i + 1]) === cpToGid.get(end) + 1) {
    end = cps[i + 1];
    i++;
  }
  segments.push({ start, end, delta: cpToGid.get(start) - start });
}
const segCount = segments.length + 1; // 末尾 0xFFFF
const endCodes = Buffer.concat([...segments.map((s) => be16u(s.end)), be16u(0xffff)]);
const startCodes = Buffer.concat([...segments.map((s) => be16u(s.start)), be16u(0xffff)]);
const idDeltas = Buffer.concat([...segments.map((s) => be16u(s.delta)), be16u(1)]);
const idRangeOffsets = Buffer.alloc(segCount * 2, 0);
const searchRange = 2 * 2 ** Math.floor(Math.log2(segCount));
const cmapEntrySelector = Math.floor(Math.log2(segCount));
const rangeShift = 2 * segCount - searchRange;
const subtable = Buffer.concat([
  be16(4), be16(16 + segCount * 8), be16(0),
  be16(segCount * 2), be16(searchRange), be16(cmapEntrySelector), be16(rangeShift),
  endCodes, be16(0), startCodes, idDeltas, idRangeOffsets,
]);
const cmap = Buffer.concat([
  be16(0), be16(1),
  be16(3), be16(1), be32(12), // Windows Unicode BMP
  subtable,
]);

// name（family / subfamily / full / ps）
const family = "MCUGL Vanilla";
const nameStrings = [family, "Regular", `${family} Regular`, "MCUGL-Vanilla"];
const nameIds = [1, 2, 4, 6];
let stringOffset = 6 + nameStrings.length * 12;
const nameRecords = [];
const stringParts = [];
for (let i = 0; i < nameStrings.length; i++) {
  const bytes = Buffer.from(nameStrings[i], "utf16le");
  nameRecords.push(
    Buffer.concat([
      be16(3), be16(1), be16(0x0409), be16(nameIds[i]),
      be16(bytes.length), be16(stringOffset),
    ]),
  );
  stringParts.push(bytes);
  stringOffset += bytes.length;
}
const nameTable = Buffer.concat([
  be16(0), be16(nameRecords.length), be16(6 + nameRecords.length * 12),
  ...nameRecords, ...stringParts,
]);

// OS/2 version 4（长度必须正好 96 字节，顺序按 OpenType 规定）
const os2 = Buffer.concat([
  be16(4), // version
  be16(700), // xAvgCharWidth
  be16(400), // usWeightClass
  be16(5), // usWidthClass
  be16(0), // fsType
  be16(650), be16(600), be16(0), be16(0), // subscript x/y size & offset
  be16(650), be16(600), be16(0), be16(0), // superscript x/y size & offset
  be16(50), be16(250), // strikeout size & position
  be16(0), // sFamilyClass
  Buffer.alloc(10, 0), // panose
  be32(0), be32(0), be32(0), be32(0), // unicode ranges
  Buffer.from("NONE"), // achVendID
  be16(0x0040), // fsSelection = REGULAR
  be16(0x20), be16u(Math.min(0xffff, Math.max(...cps))), // first / last char
  be16(ASCENT), be16(-DESCENT), be16(0), // typo ascender / descender / line gap
  be16(ASCENT), be16(DESCENT), // win ascent / descent
  be32(0), be32(0), // code page ranges
  be16(0), be16(Math.max(0, Math.min(ASCENT, Math.max(...built.map((b) => b.bbox[3] ?? 0))))), // xHeight / capHeight
  be16(0), be16(0x20), be16(4), // default char, break char, max context
]);
const post = Buffer.concat([be32(0x00030000), be32(0), be16(-(DESCENT)), be16(0), be32(0), be32(0), be32(0), be32(0), be32(0)]);

const bboxAll = built.reduce(
  (acc, b) => [
    Math.min(acc[0], b.bbox[0]), Math.min(acc[1], b.bbox[1]),
    Math.max(acc[2], b.bbox[2]), Math.max(acc[3], b.bbox[3]),
  ],
  [0, -DESCENT, 0, ASCENT],
);
// head
const head = Buffer.concat([
  be32(0x00010000), be32(0x00010000), be32(0), be32(0x5f0f3cf5),
  be16(0x0003), be16(UPEM),
  Buffer.alloc(16, 0), // created/modified
  be16(bboxAll[0]), be16(bboxAll[1]), be16(bboxAll[2]), be16(bboxAll[3]),
  be16(0), be16(8), be16(2), be16(1), be16(0),
]);

// 表目录（checksum 稍后回填）
const tables = { cmap, glyf, head, hhea, hmtx, loca: locaBuf, maxp, name: nameTable, "OS/2": os2, post };
const order = Object.keys(tables).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
let headerSize = 12 + order.length * 16;
let offset = headerSize;
const dir = [];
const chunks = [];
for (const tag of order) {
  const data = tables[tag];
  const pad = (4 - (data.length % 4)) % 4;
  const chunk = Buffer.concat([data, Buffer.alloc(pad)]);
  const sum = chunk.reduce((acc, b, i) => (i % 4 === 3 ? (acc + chunk.readUInt32BE(i - 3)) >>> 0 : acc), 0) >>> 0;
  dir.push({ tag, data, offset, length: data.length, sum });
  chunks.push(chunk);
  offset += chunk.length;
}
const total = offset;
const numTables = order.length;
const entrySelector = Math.floor(Math.log2(numTables));
const dirSearchRange = 16 * 2 ** entrySelector;
let header = Buffer.concat([
  be32(0x00010000), be16(numTables), be16(dirSearchRange), be16(entrySelector), be16(16 * numTables - dirSearchRange),
  ...dir.map((d) => Buffer.concat([Buffer.from(d.tag.padEnd(4, " "), "ascii"), be32u(d.sum), be32(d.offset), be32(d.length)])),
]);
let font = Buffer.concat([header, ...chunks]);
// head.checkSumAdjustment
const sumAll = (() => {
  let s = 0;
  const padded = Buffer.concat([font, Buffer.alloc((4 - (font.length % 4)) % 4)]);
  for (let i = 0; i < padded.length; i += 4) s = (s + padded.readUInt32BE(i)) >>> 0;
  return s;
})();
const adjust = (0xb1b0afba - sumAll) >>> 0;
const headOffset = dir.find((d) => d.tag === "head").offset;
font.writeUInt32BE(adjust, headOffset + 8);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, font);
console.log(`字形 ${glyphs.length} 个，字体 ${(font.length / 1024).toFixed(1)} KiB → ${OUT}`);
