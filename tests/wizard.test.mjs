// 向导集成测试：假终端里按 9 次 Enter（第 1 次选语言，其余用默认值），走完整流程并生成工程。
import { EventEmitter } from "node:events";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { runWizard } from "../lib/wizard.mjs";
import { scaffold } from "../lib/scaffold.mjs";
import { setLocale } from "../lib/i18n.mjs";

class FakeStdin extends EventEmitter {
  constructor() {
    super();
    this.isTTY = true;
    this.isRaw = false;
  }
  setRawMode(value) {
    this.isRaw = Boolean(value);
  }
  resume() {}
  pause() {}
}

const tick = () => new Promise((resolve) => setImmediate(resolve));

test("向导收集参数并生成工程", async () => {
  const base = mkdtempSync(join(tmpdir(), "mcugl-wizard-"));
  try {
    const stdin = new FakeStdin();
    const stdout = { isTTY: true, write() {} };
    const pending = runWizard({ cwd: base, version: "0.1.0", stdin, stdout });

    for (let i = 0; i < 9; i += 1) {
      await tick();
      stdin.emit("keypress", "\r", { name: "return" });
    }
    const answers = await pending;
    assert.equal(answers.target, join(base, "my-mcugl-frontend"));
    assert.equal(answers.template, "vanilla");
    assert.equal(answers.identifier, "com.example.my-mcugl-frontend");

    scaffold({ ...answers, root: answers.target });
    const manifest = JSON.parse(readFileSync(join(answers.target, "frontend", "frontend.json"), "utf8"));
    assert.equal(manifest.identifier, "com.example.my-mcugl-frontend");
    assert.equal(manifest.entry, "index.html");
    assert.ok(existsSync(join(answers.target, "scripts", "pack.mjs")));
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("目录非空且拒绝覆盖时抛 CancelledError", async () => {
  const base = mkdtempSync(join(tmpdir(), "mcugl-wizard-"));
  try {
    mkdirSync(join(base, "my-mcugl-frontend"), { recursive: true });
    writeFileSync(join(base, "my-mcugl-frontend", "keep.txt"), "keep");
    const stdin = new FakeStdin();
    const stdout = { isTTY: true, write() {} };
    let rejected;
    const pending = runWizard({ cwd: base, version: "0.1.0", stdin, stdout }).catch((error) => {
      rejected = error;
    });

    // 9 个普通问题（含语言）+ 覆盖确认（默认「否」）
    for (let i = 0; i < 10; i += 1) {
      await tick();
      stdin.emit("keypress", "\r", { name: "return" });
    }
    await pending;
    assert.ok(rejected, "应当拒绝覆盖");
    assert.equal(rejected.code, 0);
    assert.equal(readFileSync(join(base, "my-mcugl-frontend", "keep.txt"), "utf8"), "keep");
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("向导第一问可切换成中文", async () => {
  const base = mkdtempSync(join(tmpdir(), "mcugl-wizard-"));
  try {
    const stdin = new FakeStdin();
    let output = "";
    const stdout = {
      isTTY: true,
      write(chunk) {
        output += String(chunk);
      },
    };
    const pending = runWizard({ cwd: base, version: "0.1.0", stdin, stdout });

    await tick();
    stdin.emit("keypress", "\u001b[B", { name: "down" });
    stdin.emit("keypress", "\r", { name: "return" });
    for (let i = 0; i < 8; i += 1) {
      await tick();
      stdin.emit("keypress", "\r", { name: "return" });
    }

    const answers = await pending;
    assert.equal(answers.template, "vanilla");
    assert.equal(answers.identifier, "com.example.my-mcugl-frontend");
    assert.match(output, /项目目录/);
  } finally {
    setLocale("en");
    rmSync(base, { recursive: true, force: true });
  }
});
