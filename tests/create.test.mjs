import assert from "node:assert/strict";
import {
  closeSync,
  mkdtempSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { validateIdentifier, validateVersion } from "../lib/manifest.mjs";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cli = join(packageRoot, "bin", "mcugl-buildtool.mjs");

// 子进程输出写到文件而不是管道：在受限环境（以及某些 CI）里，Node 无法创建
// 命名管道，spawn 时用默认的 stdio: "pipe" 会直接 EPERM。文件描述符不受影响。
function runNode(args, options = {}) {
  const { cwd = packageRoot, ...rest } = options;
  const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const outPath = join(tmpdir(), `mcugl-test-${stamp}.out`);
  const errPath = join(tmpdir(), `mcugl-test-${stamp}.err`);
  const outFd = openSync(outPath, "w");
  const errFd = openSync(errPath, "w");
  let result;
  try {
    result = spawnSync(process.execPath, args, {
      cwd,
      // 固定成英文界面，避免测试机上的 LANG/LC_ALL 让断言随语言变化。
      env: { ...process.env, LANG: "", LC_ALL: "", MCUGL_LANG: "" },
      stdio: ["ignore", outFd, errFd],
      ...rest,
    });
  } finally {
    closeSync(outFd);
    closeSync(errFd);
  }
  return {
    status: result.status,
    stdout: readFileSync(outPath, "utf8"),
    stderr: readFileSync(errPath, "utf8"),
  };
}

function runCli(args, options) {
  return runNode([cli, ...args], options);
}

function tempProject() {
  return join(mkdtempSync(join(tmpdir(), "mcugl-scaffold-")), "demo-frontend");
}

test("vanilla 模板生成完整工程并能打包", () => {
  const target = tempProject();
  const result = runCli([
    target,
    "--yes",
    "--template",
    "vanilla",
    "--identifier",
    "com.example.demo",
    "--name",
    "Demo Frontend",
    "--version",
    "0.2.0",
  ]);
  assert.equal(result.status, 0, result.stderr);

  const manifest = JSON.parse(readFileSync(join(target, "frontend", "frontend.json"), "utf8"));
  assert.equal(manifest.identifier, "com.example.demo");
  assert.equal(manifest.name, "Demo Frontend");
  assert.equal(manifest.version, "0.2.0");
  assert.equal(manifest.entry, "index.html");
  assert.equal(manifest.kernelApi, "^1.0.0");

  assert.ok(readdirSync(join(target, "frontend")).includes("index.html"));
  assert.ok(readdirSync(join(target, "frontend")).includes("kernel.js"));
  assert.ok(readdirSync(join(target, "scripts")).includes("pack.mjs"));

  const packageJson = JSON.parse(readFileSync(join(target, "package.json"), "utf8"));
  assert.equal(packageJson.scripts.build, "node scripts/pack.mjs frontend");
  assert.equal(packageJson.scripts.pack, "node scripts/pack.mjs frontend");

  const pack = runNode([join(target, "scripts", "pack.mjs"), "frontend"], { cwd: target });
  assert.equal(pack.status, 0, pack.stderr);
  assert.match(pack.stdout, /com\.example\.demo-0\.2\.0\.mcuglf/);

  const archive = readFileSync(
    join(target, "dist-frontends", "com.example.demo-0.2.0.mcuglf"),
  );
  assert.equal(archive.subarray(0, 4).toString("hex"), "504b0304");
});

test("simple 模板生成仿启动器布局并且可直接打包", () => {
  const target = tempProject();
  const result = runCli([
    target,
    "--yes",
    "--template",
    "simple",
    "--identifier",
    "com.example.simple",
    "--name",
    "Simple UI",
  ]);
  assert.equal(result.status, 0, result.stderr);

  const frontend = join(target, "frontend");
  for (const name of ["index.html", "app.js", "kernel.js", "styles.css"]) {
    assert.ok(readdirSync(frontend).includes(name), `缺少 ${name}`);
  }

  const html = readFileSync(join(frontend, "index.html"), "utf8");
  assert.match(html, /data-page="home"/);
  assert.ok(html.includes("Simple UI"), "HTML 里应写入显示名称");

  const app = readFileSync(join(frontend, "app.js"), "utf8");
  assert.match(app, /launch_game/);
  assert.match(app, /select_instance/);

  const packageJson = JSON.parse(readFileSync(join(target, "package.json"), "utf8"));
  assert.equal(packageJson.scripts.build, "node scripts/pack.mjs frontend");

  const pack = runNode([join(target, "scripts", "pack.mjs"), "frontend"], { cwd: target });
  assert.equal(pack.status, 0, pack.stderr);
  const archive = readFileSync(
    join(target, "dist-frontends", "com.example.simple-0.1.0.mcuglf"),
  );
  assert.equal(archive.subarray(0, 4).toString("hex"), "504b0304");
});

test("vite-react 模板包含可构建的配置", () => {
  const target = tempProject();
  const result = runCli([
    target,
    "--yes",
    "--template",
    "vite-react",
    "--identifier",
    "com.example.vite-demo",
    "--name",
    "Vite Demo",
  ]);
  assert.equal(result.status, 0, result.stderr);

  const files = readdirSync(target);
  for (const name of ["package.json", "tsconfig.json", "vite.config.ts", "frontend", "scripts"]) {
    assert.ok(files.includes(name), `缺少 ${name}`);
  }

  const viteConfig = readFileSync(join(target, "vite.config.ts"), "utf8");
  assert.match(viteConfig, /base: "\.\/"/);
  assert.match(viteConfig, /frontend\.json/);

  const packageJson = JSON.parse(readFileSync(join(target, "package.json"), "utf8"));
  assert.equal(packageJson.name, "demo-frontend");
  assert.equal(packageJson.scripts.pack, "node scripts/pack.mjs dist/frontend");
});

test("目标目录非空时拒绝，--force 才覆盖", () => {
  const target = tempProject();
  mkdirSync(target, { recursive: true });
  writeFileSync(join(target, "keep.txt"), "kept");

  const refused = runCli([target, "--yes", "--template", "vanilla"]);
  assert.notEqual(refused.status, 0);
  assert.match(refused.stderr, /Directory is not empty/);

  const forced = runCli([target, "--yes", "--template", "vanilla", "--force"]);
  assert.equal(forced.status, 0, forced.stderr);
  assert.ok(!readdirSync(target).includes("keep.txt"));
});

test("模板名与版本等参数会被校验", () => {
  const target = tempProject();
  const badTemplate = runCli([target, "--yes", "--template", "svelte"]);
  assert.notEqual(badTemplate.status, 0);
  assert.match(badTemplate.stderr, /Unknown template/);

  const badTemplateZh = runCli([target, "--yes", "--template", "svelte", "--lang", "zh"]);
  assert.notEqual(badTemplateZh.status, 0);
  assert.match(badTemplateZh.stderr, /未知模板/);

  const badVersion = runCli([
    tempProject(),
    "--yes",
    "--template",
    "vanilla",
    "--version",
    "1.0",
  ]);
  assert.notEqual(badVersion.status, 0);
  assert.match(badVersion.stderr, /version/);
});

test("名称里的引号与尖括号会按文件类型转义", () => {
  const target = tempProject();
  const result = runCli([
    target,
    "--yes",
    "--template",
    "vanilla",
    "--identifier",
    "com.example.escape",
    "--name",
    'Demo "Quoted" <X>',
  ]);
  assert.equal(result.status, 0, result.stderr);

  const manifest = JSON.parse(readFileSync(join(target, "frontend", "frontend.json"), "utf8"));
  assert.equal(manifest.name, 'Demo "Quoted" <X>');

  const app = readFileSync(join(target, "frontend", "app.js"), "utf8");
  assert.ok(app.includes('Demo \\"Quoted\\" <X>'), "JS 字符串里的引号应转义");

  const html = readFileSync(join(target, "frontend", "index.html"), "utf8");
  assert.ok(html.includes("Demo &quot;Quoted&quot; &lt;X&gt;"), "HTML 文本应转义");
});

test("脚手架包自己的 npm run build 只给提示", () => {
  const pkg = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8"));
  assert.ok(pkg.scripts.build, "应有 build 脚本，避免 Missing script");
  assert.match(pkg.scripts.build, /no build step/);
  assert.match(pkg.scripts.build, /mcugl-buildtool/);
});

test("identifier 校验与 Rust 安装器保持一致", () => {
  assert.equal(validateIdentifier("com.example.hello"), null);
  assert.equal(validateIdentifier("Com.Example-1"), null);

  assert.equal(validateVersion("1.0.0"), null);
  assert.equal(validateVersion("0.2.0-beta.1"), null);

  // 默认英语
  assert.match(validateIdentifier("ab"), /3–128/);
  assert.match(validateIdentifier("com..x"), /consecutive dots/);
  assert.match(validateIdentifier(".com.x"), /start or end with a dot/);
  assert.match(validateIdentifier("com.x."), /start or end/);
  assert.match(validateIdentifier("com.exa mple"), /ASCII letters/);
  assert.match(validateIdentifier("com.con"), /reserved names/);
  assert.match(validateIdentifier("com.lpt9"), /reserved names/);
  assert.match(validateVersion("1.0"), /semantic version/);

  // 显式中文
  assert.match(validateIdentifier("ab", "zh"), /3–128/);
  assert.match(validateIdentifier("com..x", "zh"), /连续/);
  assert.match(validateIdentifier(".com.x", "zh"), /点开头/);
  assert.match(validateIdentifier("com.x.", "zh"), /开头或结尾/);
  assert.match(validateIdentifier("com.exa mple", "zh"), /只能包含/);
  assert.match(validateIdentifier("com.con", "zh"), /保留名/);
  assert.match(validateIdentifier("com.lpt9", "zh"), /保留名/);
  assert.match(validateVersion("1.0", "zh"), /语义化版本/);
});

test("vite-react 模板覆盖全部内核方法与宿主命令", () => {
  const actions = readFileSync(
    join(packageRoot, "templates", "vite-react", "frontend", "src", "actions.ts"),
    "utf8",
  );
  const commands = [...actions.matchAll(/command: "([a-z_]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(commands).size, commands.length, "命令不应重复");
  assert.equal(commands.length, 70);

  const host = ["install_frontend", "list_frontends", "remove_frontend", "use_frontend"];
  const kernel = commands.filter((command) => !host.includes(command));
  // mcugl.kernel/v1 的 66 个方法；内核新增方法时同步更新 actions.ts 与这个数字。
  assert.equal(kernel.length, 66);
  assert.equal(host.length, 4);
});
