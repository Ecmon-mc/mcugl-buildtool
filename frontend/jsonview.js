// 把内核返回的 JSON 展开成 Minecraft 聊天里的彩色缩进树。
//
// 只负责“好看”：对象按字段换行、数组按项换行、基本类型各自上色，
// 超长数组 / 超深结构 / 超多行会被折叠成一行提示，避免把日志刷屏。
//
// 输出的每一条都是 ui.append() 认识的 segment 数组：
//   [["  ", ""], ["data: ", "aqua"], ["{… 6 字段}", "#555555"]]

const NBSP = "\u00A0"; // 缩进用不换行空格，聊天行的 white-space 折叠不会吃掉它

const C = {
  key: "aqua",
  string: "green",
  number: "gold",
  boolean: "light_purple",
  nil: "gray",
  punct: "dark_gray",
  meta: "dark_gray",
  accent: "yellow",
};

const DEFAULT_MAX_LINES = 180;
const DEFAULT_MAX_ITEMS = 24;
const DEFAULT_MAX_DEPTH = 7;
const STRING_LIMIT = 160;
const INLINE_LIMIT = 96;

function pad(depth) {
  return NBSP.repeat(Math.max(0, depth) * 2);
}

function kindOf(value) {
  if (Array.isArray(value)) return "array";
  if (value === null) return "primitive"; // null 交给 repr 处理，别当对象去取 keys
  if (typeof value === "object") return "object";
  return "primitive";
}

/** 基本类型 → 带颜色的文本片段。字符串保留引号，方便和数据里的数字区分。 */
function repr(value) {
  if (value === null) return ["null", C.nil];
  if (typeof value === "string") {
    const clipped = value.length > STRING_LIMIT ? `${value.slice(0, STRING_LIMIT)}…` : value;
    return [JSON.stringify(clipped), C.string];
  }
  if (typeof value === "number") {
    return [Number.isFinite(value) ? String(value) : JSON.stringify(value), C.number];
  }
  if (typeof value === "boolean") return [String(value), C.boolean];
  return [String(value), C.nil];
}

function typeLabel(value) {
  const kind = kindOf(value);
  if (kind === "array") return `[${value.length} 项]`;
  if (kind === "object") return `{… ${Object.keys(value).length} 字段}`;
  return repr(value)[0];
}

/** 数组里的基本类型且够短时，压成一行 [1, "a", true]。 */
function inlineArray(value) {
  let text = "";
  for (const item of value) if (kindOf(item) !== "primitive") return null;
  try {
    text = JSON.stringify(value);
  } catch {
    return null;
  }
  if (!text || text.length > INLINE_LIMIT) return null;
  return value.length;
}

/**
 * @param {unknown} value 任意 JSON 值
 * @param {{maxLines?: number, maxItems?: number, maxDepth?: number}} options
 * @returns {Array<Array<[string, string]>>} 每一行一组 segment
 */
export function jsonLines(value, options = {}) {
  const maxLines = options.maxLines ?? DEFAULT_MAX_LINES;
  const maxItems = options.maxItems ?? DEFAULT_MAX_ITEMS;
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;

  const lines = [];
  let omitted = 0;

  const push = (segments) => {
    if (lines.length < maxLines) lines.push(segments);
    else omitted += 1;
  };

  const pushLine = (depth, segments, bullet = false) => {
    const head = [[pad(depth), ""]];
    if (bullet) head.push(["- ", C.punct]);
    push([...head, ...segments]);
  };

  const walk = (node, depth, prefix, skipHeader = false) => {
    const kind = kindOf(node);
    const head = [...prefix];

    if (depth >= maxDepth && kind !== "primitive") {
      pushLine(depth, [...head, [`${typeLabel(node)} 太深，已折叠`, C.meta]]);
      return;
    }

    if (kind === "primitive") {
      pushLine(depth, [...head, repr(node)]);
      return;
    }

    if (kind === "array") {
      if (!node.length) {
        pushLine(depth, [...head, ["[]", C.punct]]);
        return;
      }
      if (inlineArray(node) !== null) {
        const parts = [...head, ["[", C.punct]];
        node.forEach((item, index) => {
          if (index) parts.push([", ", C.punct]);
          parts.push(repr(item));
        });
        parts.push(["]", C.punct]);
        pushLine(depth, parts);
        return;
      }

      if (!skipHeader) pushLine(depth, [...head, [`[${node.length} 项]`, C.meta]]);
      const shown = Math.min(node.length, maxItems);
      for (let i = 0; i < shown; i += 1) {
        const item = node[i];
        if (kindOf(item) === "primitive") pushLine(depth + 1, [repr(item)], true);
        else walk(item, depth + 1, [["- ", C.punct]]);
      }
      if (node.length > shown) {
        pushLine(depth + 1, [[`… 还有 ${node.length - shown} 项`, C.meta]], true);
      }
      return;
    }

    // 对象
    const keys = Object.keys(node);
    if (!keys.length) {
      pushLine(depth, [...head, ["{}", C.punct]]);
      return;
    }

    if (!skipHeader) pushLine(depth, [...head, [`{… ${keys.length} 字段}`, C.meta]]);
    const shown = Math.min(keys.length, maxItems);
    for (let i = 0; i < shown; i += 1) {
      const key = keys[i];
      walk(node[key], depth + 1, [[`${key}: `, C.key]]);
    }
    if (keys.length > shown) {
      pushLine(depth + 1, [[`… 还有 ${keys.length - shown} 字段`, C.meta]], true);
    }
  };

  const kind = kindOf(value);
  const title =
    kind === "array" ? `数组 · ${value.length} 项` : kind === "object" ? `对象 · ${Object.keys(value).length} 字段` : null;

  if (title) {
    push([["JSON", C.accent], ["  ", ""], [title, C.meta]]);
    walk(value, 0, [], true);
  } else {
    push([repr(value)]);
  }

  if (omitted) {
    push([["… 已省略 ", C.meta], [String(omitted), C.meta], [" 行（调整窗口或减少数据后再看）", C.meta]]);
  }
  return lines;
}

/** 纯文本版本（自测、复制用）。 */
export function jsonText(value, options = {}) {
  return jsonLines(value, options)
    .map((segments) => segments.map(([text]) => text).join(""))
    .join("\n");
}
