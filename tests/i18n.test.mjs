// 语言检测与文案插值：命令行 flag > 环境变量 > 系统 locale > 英语。
import assert from "node:assert/strict";
import test from "node:test";
import { detectLocale, getLocale, normalizeLocale, setLocale, t } from "../lib/i18n.mjs";

test("语言规范化只认 en/zh", () => {
  assert.equal(normalizeLocale("zh"), "zh");
  assert.equal(normalizeLocale("zh-CN"), "zh");
  assert.equal(normalizeLocale("ZH_TW.UTF-8"), "zh");
  assert.equal(normalizeLocale("en_US.UTF-8"), "en");
  assert.equal(normalizeLocale("fr"), null);
  assert.equal(normalizeLocale(""), null);
  assert.equal(normalizeLocale(undefined), null);
});

test("语言检测优先级：--lang > MCUGL_LANG > LANG > 英语", () => {
  assert.equal(detectLocale(["--lang", "zh"], {}), "zh");
  assert.equal(detectLocale(["-l", "en"], { MCUGL_LANG: "zh" }), "en");
  assert.equal(detectLocale([], { MCUGL_LANG: "zh" }), "zh");
  assert.equal(detectLocale([], { LANG: "zh_CN.UTF-8" }), "zh");
  assert.equal(detectLocale([], { LC_ALL: "en_US.UTF-8" }), "en");
  assert.equal(detectLocale([], {}), "en");
});

test("setLocale/getLocale 与默认英语", () => {
  const previous = getLocale();
  setLocale("zh");
  assert.equal(getLocale(), "zh");
  setLocale("en");
  assert.equal(getLocale(), "en");
  setLocale("fr");
  assert.equal(getLocale(), "en", "不支持的语言不应改变当前语言");
  setLocale(previous);
});

test("文案插值且缺省键回退英语", () => {
  assert.equal(t("generated", { template: "vanilla", target: "app" }), "Generated vanilla project: app");
  assert.equal(
    t("generated", { template: "vanilla", target: "app" }, "zh"),
    "已生成 vanilla 工程：app",
  );
  assert.equal(t("committed", { message: "名称", value: "ab" }, "zh"), "名称：ab");
  assert.equal(t("committed", { message: "Name", value: "ab" }, "en"), "Name: ab");
  assert.equal(t("no-such-key"), "no-such-key");
});
