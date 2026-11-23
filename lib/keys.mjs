// 键盘事件归一化与两个纯状态机（文本框、选择列表）。
// 单独放这里是为了能在没有 TTY 的环境里直接测：渲染层只负责画，按键逻辑不依赖终端。

export function normalizeKey(str, key) {
  if (!key) return null;
  if (key.ctrl && key.name === "c") return "cancel";
  switch (key.name) {
    case "return":
    case "enter":
      return "enter";
    case "escape":
      return "cancel";
    case "backspace":
      return "backspace";
    case "delete":
      return "delete";
    case "up":
      return "up";
    case "down":
      return "down";
    default:
      break;
  }
  if (key.ctrl && key.name === "u") return "clear";
  // 可打印字符（中文输入法提交的文本也走 keypress 的 str）
  if (
    typeof str === "string" &&
    str.length >= 1 &&
    !key.ctrl &&
    !key.meta &&
    !/[\u0000-\u001f\u007f]/.test(str)
  ) {
    return `text:${str}`;
  }
  return null;
}

export function editText(value, event, limit = 120) {
  if (event.startsWith("text:")) {
    const chunk = event.slice(5);
    if (value.length + chunk.length > limit) return value;
    return value + chunk;
  }
  switch (event) {
    case "backspace":
    case "delete":
      return value.slice(0, -1);
    case "clear":
      return "";
    default:
      return value;
  }
}

export function moveSelect(index, count, event) {
  if (count === 0) return { index: 0, done: false };
  switch (event) {
    case "up":
      return { index: (index - 1 + count) % count, done: false };
    case "down":
    case "tab":
      return { index: (index + 1) % count, done: false };
    case "enter":
      return { index, done: true };
    default:
      break;
  }
  if (event.length === 6 && event.startsWith("text:") && /^[0-9]$/.test(event[5])) {
    const target = Number(event[5]) - 1;
    if (target >= 0 && target < count) return { index: target, done: false };
  }
  return { index, done: false };
}
