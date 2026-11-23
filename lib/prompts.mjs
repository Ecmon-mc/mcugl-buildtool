// 交互提示：readline/promises 足够，不引入第三方 prompt 库。
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { t } from "./i18n.mjs";

let rl;

function interfaceInstance() {
  if (!rl) {
    rl = createInterface({ input: stdin, output: stdout });
    rl.on("SIGINT", () => {
      rl.close();
      console.error(`\n${t("cancelled")}`);
      process.exit(130);
    });
  }
  return rl;
}

export function closePrompts() {
  rl?.close();
  rl = undefined;
}

export async function askText({ message, fallback = "", validate }) {
  for (;;) {
    const suffix = fallback ? t("fallbackSuffix", { fallback }) : "";
    const answer = (await interfaceInstance().question(`${message}${suffix}${t("questionColon")}`)).trim();
    const value = answer || fallback;
    if (validate) {
      const error = validate(value);
      if (error) {
        console.log(`  ${error}`);
        continue;
      }
    }
    return value;
  }
}

export async function askSelect({ message, options, fallback = 0 }) {
  const lines = options.map((option, index) => `  ${index + 1}) ${option.label}`).join("\n");
  for (;;) {
    const answer = (await interfaceInstance().question(t("selectPrompt", { message, lines, index: fallback + 1 }))).trim();
    const index = answer === "" ? fallback : Number(answer) - 1;
    if (Number.isInteger(index) && options[index]) return options[index].value;
    console.log(`  ${t("invalidNumber")}`);
  }
}
