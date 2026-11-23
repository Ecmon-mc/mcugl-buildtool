// 终端 UI：与 @clack/prompts 同类的交互体验，但零依赖。
//
// 只做三件事：raw 模式按键读取、未提交行的重绘、提交后的一行回执。
// 渲染函数都接受注入的 stdin/stdout，方便在没有 TTY 的测试里驱动。
import { emitKeypressEvents } from "node:readline";
import { editText, moveSelect, normalizeKey } from "./keys.mjs";
import { t } from "./i18n.mjs";

const ESC = "\x1b[";
const colorsEnabled = () => process.env.NO_COLOR === undefined;
const paint = (code, text) => (colorsEnabled() ? `${ESC}${code}m${text}${ESC}0m` : `${text}`);

export const style = {
  cyan: (text) => paint(36, text),
  green: (text) => paint(32, text),
  red: (text) => paint(31, text),
  dim: (text) => paint(2, text),
  bold: (text) => paint(1, text),
};

export class CancelledError extends Error {
  constructor(message = t("cancelled"), code = 130) {
    super(message);
    this.name = "CancelledError";
    this.code = code;
  }
}

export function interactive(streams = {}) {
  const { stdin = process.stdin, stdout = process.stdout } = streams;
  return Boolean(stdin.isTTY && stdout.isTTY) && !process.env.CI;
}

export function createSession({
  stdin = process.stdin,
  stdout = process.stdout,
  injectKeys = false,
} = {}) {
  void stdout;
  if (!injectKeys) emitKeypressEvents(stdin);
  const wasRaw = Boolean(stdin.isRaw);
  stdin.setRawMode?.(true);
  stdin.resume?.();

  const queue = [];
  const waiters = [];
  const deliver = (event) => {
    const waiter = waiters.shift();
    if (waiter) waiter(event);
    else queue.push(event);
  };
  const onKey = (str, key) => {
    const event = normalizeKey(str, key);
    if (event) deliver(event);
  };
  stdin.on("keypress", onKey);

  return {
    next() {
      return new Promise((resolve) => {
        const event = queue.shift();
        if (event) resolve(event);
        else waiters.push(resolve);
      });
    },
    close() {
      stdin.off("keypress", onKey);
      stdin.setRawMode?.(wasRaw);
      stdin.pause?.();
    },
  };
}

function commitBlock(stdout, height, text) {
  stdout.write(`${ESC}${height}A`);
  for (let i = 0; i < height; i += 1) stdout.write(`\r${ESC}2K\n`);
  stdout.write(`${ESC}${height}A`);
  stdout.write(`${text}\n`);
}

export function printIntro({
  stdout = process.stdout,
  version = "",
  title = t("introTitle"),
  subtitle = "",
} = {}) {
  const write = (line) => stdout.write(`${line}\n`);
  write("");
  write(`${style.dim("┌")}  ${style.bold(title)}${version ? style.dim(` v${version}`) : ""}`);
  if (subtitle) write(`${style.dim("│")}  ${style.dim(subtitle)}`);
  write(`${style.dim("└")}`);
  write("");
}

export function printDone(message, { stdout = process.stdout } = {}) {
  stdout.write(`\n${style.green("✔")} ${message}\n`);
}

export async function promptText({
  message,
  initial = "",
  placeholder = "",
  hint = "",
  validate,
  stdin = process.stdin,
  stdout = process.stdout,
  injectKeys = false,
}) {
  const session = createSession({ stdin, stdout, injectKeys });
  const height = 2;
  let value = initial;
  let error = "";
  let first = true;

  const render = () => {
    const text = value || style.dim(placeholder || "");
    const head = `${style.cyan("?")} ${message} ${style.dim("›")} ${text}`;
    const sub = error
      ? `  ${style.red(error)}`
      : hint
        ? `  ${style.dim(hint)}`
        : "";
    if (!first) stdout.write(`${ESC}${height}A`);
    stdout.write(`\r${ESC}2K${head}\n`);
    stdout.write(`\r${ESC}2K${sub}\n`);
    first = false;
  };

  render();
  try {
    for (;;) {
      const event = await session.next();
      if (event === "cancel") throw new CancelledError();
      if (event === "enter") {
        const problem = validate ? validate(value) : null;
        if (problem) {
          error = problem;
          render();
          continue;
        }
        break;
      }
      value = editText(value, event);
      error = "";
      render();
    }
  } finally {
    session.close();
  }

  const shown = value || style.dim(t("empty"));
  commitBlock(stdout, height, `${style.green("✔")} ${t("committed", { message, value: shown })}`);
  return value;
}

export async function promptSelect({
  message,
  options,
  initial = 0,
  stdin = process.stdin,
  stdout = process.stdout,
  injectKeys = false,
}) {
  const session = createSession({ stdin, stdout, injectKeys });
  const height = options.length + 1;
  let index = Math.min(Math.max(initial, 0), options.length - 1);
  let first = true;

  const render = () => {
    const lines = options.map((option, i) => {
      const active = i === index;
      const mark = active ? style.cyan("❯") : " ";
      const label = active ? style.cyan(option.label) : option.label;
      const description = option.description ? `  ${style.dim(option.description)}` : "";
      return `${mark} ${label}${description}`;
    });
    lines.push(`  ${style.dim(t("selectHint"))}`);
    if (!first) stdout.write(`${ESC}${height}A`);
    for (const line of lines) stdout.write(`\r${ESC}2K${line}\n`);
    first = false;
  };

  render();
  try {
    for (;;) {
      const event = await session.next();
      if (event === "cancel") throw new CancelledError();
      const moved = moveSelect(index, options.length, event);
      index = moved.index;
      if (moved.done) break;
      render();
    }
  } finally {
    session.close();
  }

  const chosen = options[index];
  commitBlock(stdout, height, `${style.green("✔")} ${t("committed", { message, value: chosen.label })}`);
  return chosen.value;
}

export async function promptConfirm({
  message,
  initial = true,
  stdin = process.stdin,
  stdout = process.stdout,
  injectKeys = false,
}) {
  return promptSelect({
    message,
    options: [
      { value: true, label: t("yes") },
      { value: false, label: t("no") },
    ],
    initial: initial ? 0 : 1,
    stdin,
    stdout,
    injectKeys,
  });
}
