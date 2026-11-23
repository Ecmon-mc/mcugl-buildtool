// 不依赖 TTY 的 UI 测试：用 injectKeys + 假 stdin 驱动按键，检查状态机和回执。
import { EventEmitter } from "node:events";
import assert from "node:assert/strict";
import test from "node:test";
import { editText, moveSelect, normalizeKey } from "../lib/keys.mjs";
import { promptConfirm, promptSelect, promptText } from "../lib/ui.mjs";

class FakeStdin extends EventEmitter {
  constructor() {
    super();
    this.isTTY = true;
    this.isRaw = false;
  }
  setRawMode(value) {
    this.isRaw = Boolean(value);
    return this;
  }
  resume() {}
  pause() {}
}

class FakeStdout {
  constructor() {
    this.isTTY = true;
    this.chunks = [];
  }
  write(chunk) {
    this.chunks.push(String(chunk));
    return true;
  }
  get text() {
    return this.chunks.join("");
  }
}

function makeStreams() {
  const stdin = new FakeStdin();
  const stdout = new FakeStdout();
  return { stdin, stdout };
}

test("按键归一化覆盖控制键与可打印字符", () => {
  assert.equal(normalizeKey("\u0003", { name: "c", ctrl: true }), "cancel");
  assert.equal(normalizeKey("\r", { name: "return" }), "enter");
  assert.equal(normalizeKey("\u001b", { name: "escape" }), "cancel");
  assert.equal(normalizeKey("\u007f", { name: "backspace" }), "backspace");
  assert.equal(normalizeKey("\u0015", { name: "u", ctrl: true }), "clear");
  assert.equal(normalizeKey("a", { name: "a" }), "text:a");
  assert.equal(normalizeKey("你", { name: undefined }), "text:你");
  assert.equal(normalizeKey("\t", { name: "tab" }), null);
});

test("文本状态机追加、删除、清空与上限", () => {
  assert.equal(editText("ab", "text:c"), "abc");
  assert.equal(editText("abc", "backspace"), "ab");
  assert.equal(editText("abc", "clear"), "");
  assert.equal(editText("abc", "text:我"), "abc我");
  assert.equal(editText("abc", "text:def", 4), "abc");
});

test("选择状态机环绕与数字跳选", () => {
  assert.deepEqual(moveSelect(0, 3, "up"), { index: 2, done: false });
  assert.deepEqual(moveSelect(2, 3, "down"), { index: 0, done: false });
  assert.deepEqual(moveSelect(0, 3, "tab"), { index: 1, done: false });
  assert.deepEqual(moveSelect(1, 3, "enter"), { index: 1, done: true });
  assert.deepEqual(moveSelect(0, 3, "text:3"), { index: 2, done: false });
  assert.deepEqual(moveSelect(0, 0, "down"), { index: 0, done: false });
});

test("promptText 提交值并渲染回执", async () => {
  const { stdin, stdout } = makeStreams();
  const pending = promptText({
    message: "名称",
    initial: "ab",
    stdin,
    stdout,
    injectKeys: true,
  });
  stdin.emit("keypress", "c", { name: "c" });
  stdin.emit("keypress", "\u007f", { name: "backspace" });
  stdin.emit("keypress", "\r", { name: "return" });
  assert.equal(await pending, "ab");
  assert.match(stdout.text, /名称: ab/);
  assert.equal(stdin.isRaw, false);
});

test("promptText 校验失败时留在原地", async () => {
  const { stdin, stdout } = makeStreams();
  const pending = promptText({
    message: "标识",
    initial: "",
    validate: (value) => (value.length >= 3 ? null : "至少 3 个字符"),
    stdin,
    stdout,
    injectKeys: true,
  });
  stdin.emit("keypress", "a", { name: "a" });
  stdin.emit("keypress", "b", { name: "b" });
  stdin.emit("keypress", "\r", { name: "return" });
  stdin.emit("keypress", "c", { name: "c" });
  stdin.emit("keypress", "\r", { name: "return" });
  assert.equal(await pending, "abc");
  assert.match(stdout.text, /至少 3 个字符/);
});

test("promptSelect 用方向键选择并回执标签", async () => {
  const { stdin, stdout } = makeStreams();
  const pending = promptSelect({
    message: "模板",
    options: [
      { value: "vanilla", label: "vanilla" },
      { value: "vite-react", label: "vite-react" },
    ],
    stdin,
    stdout,
    injectKeys: true,
  });
  stdin.emit("keypress", "\u001b[B", { name: "down" });
  stdin.emit("keypress", "\r", { name: "return" });
  assert.equal(await pending, "vite-react");
  assert.match(stdout.text, /模板: vite-react/);
});

test("promptConfirm 默认选是", async () => {
  const { stdin, stdout } = makeStreams();
  const pending = promptConfirm({ message: "继续？", stdin, stdout, injectKeys: true });
  stdin.emit("keypress", "\r", { name: "return" });
  assert.equal(await pending, true);
});
