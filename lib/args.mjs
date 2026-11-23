// 零依赖的参数解析：只处理本脚手架定义的开关。
import { t } from "./i18n.mjs";

export function parseArgs(argv) {
  const result = {
    positional: [],
    yes: false,
    force: false,
    help: false,
    lang: null,
    template: null,
    layout: null,
    identifier: null,
    name: null,
    description: null,
    author: null,
    version: null,
  };

  const takeValue = (index, flag) => {
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("-")) {
      throw new Error(t("valueRequired", { flag }));
    }
    return value;
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case "-h":
      case "--help":
        result.help = true;
        break;
      case "-y":
      case "--yes":
        result.yes = true;
        break;
      case "-f":
      case "--force":
        result.force = true;
        break;
      case "-l":
      case "--lang":
        result.lang = takeValue(index, arg);
        index += 1;
        break;
      case "-t":
      case "--template":
        result.template = takeValue(index, arg);
        index += 1;
        break;
      case "--layout":
        result.layout = takeValue(index, arg);
        index += 1;
        break;
      case "--identifier":
        result.identifier = takeValue(index, arg);
        index += 1;
        break;
      case "--name":
        result.name = takeValue(index, arg);
        index += 1;
        break;
      case "--description":
        result.description = takeValue(index, arg);
        index += 1;
        break;
      case "--author":
        result.author = takeValue(index, arg);
        index += 1;
        break;
      case "--version":
        result.version = takeValue(index, arg);
        index += 1;
        break;
      default:
        if (arg.startsWith("-")) throw new Error(t("unknownOption", { arg }));
        result.positional.push(arg);
    }
  }

  return result;
}
