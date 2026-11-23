// 仿官方启动器布局的极简前端：首页 / 实例 / 账号 / 设置。
// 这里只演示核心流程；完整命令覆盖与参数表单见 vite-react 模板。
import { KernelError, call } from "./kernel.js";

const nav = document.querySelector("#nav");
const view = document.querySelector("#view");
const statusEl = document.querySelector("#status");
const launchBtn = document.querySelector("#launch");
const toastEl = document.querySelector("#toast");

const state = {
  page: "home",
  loading: true,
  error: null,
  manifest: null,
  overview: null,
  instances: [],
  accounts: [],
  tasks: [],
  log: "",
};

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

let toastTimer = 0;
function showToast(message) {
  toastEl.textContent = message;
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.hidden = true;
  }, 3000);
}

function describe(error) {
  if (error instanceof KernelError && error.code === "UNSUPPORTED") {
    return "当前内核为演示后端，这个操作还没有实现";
  }
  return error instanceof Error ? error.message : String(error);
}

function selectedInstance() {
  const id = state.overview?.selectedInstanceId;
  return state.instances.find((instance) => instance.id === id) ?? null;
}

function selectedAccount() {
  const id = state.overview?.activeAccountId;
  return state.accounts.find((account) => account.id === id) ?? null;
}

async function load() {
  state.loading = true;
  state.error = null;
  render();
  try {
    const [manifest, overview, instances, accounts, tasks] = await Promise.all([
      call("kernel_manifest"),
      call("get_overview"),
      call("list_instances"),
      call("list_accounts"),
      call("list_tasks").catch(() => null),
    ]);
    state.manifest = manifest;
    state.overview = overview.data;
    state.instances = instances.data.items ?? [];
    state.accounts = accounts.data ?? [];
    state.tasks = tasks?.data ?? [];
  } catch (error) {
    state.error = error instanceof Error ? error : new KernelError(String(error));
  } finally {
    state.loading = false;
    render();
  }
}

async function selectInstance(id) {
  try {
    const saved = await call("select_instance", { instanceId: id });
    state.overview = { ...state.overview, selectedInstanceId: id };
    showToast(saved?.message ?? "已切换实例");
    render();
  } catch (error) {
    showToast(`切换实例失败：${describe(error)}`);
  }
}

async function selectAccount(id) {
  try {
    const saved = await call("select_account", { accountId: id });
    state.overview = { ...state.overview, activeAccountId: id };
    showToast(saved?.message ?? "已切换账号");
    render();
  } catch (error) {
    showToast(`切换账号失败：${describe(error)}`);
  }
}

async function launch() {
  const instance = selectedInstance();
  if (!instance) {
    showToast("请先选择一个实例");
    return;
  }
  launchBtn.disabled = true;
  try {
    const result = await call("launch_game", {
      instanceId: instance.id,
      accountId: state.overview?.activeAccountId ?? "",
    });
    showToast(result?.sessionId ? `已请求启动 ${instance.displayName}` : "启动请求已发送");
  } catch (error) {
    showToast(`启动未完成：${describe(error)}`);
  } finally {
    renderLaunch();
  }
}

async function readLog() {
  try {
    const result = await call("read_log");
    state.log = JSON.stringify(result?.data ?? result, null, 2);
    showToast("已读取运行日志");
  } catch (error) {
    state.log = `读取日志失败：${describe(error)}`;
  }
  render();
}

function renderLaunch() {
  launchBtn.disabled = !selectedInstance() || Boolean(state.error);
}

function instanceRow(instance, withAction) {
  const selected = instance.id === state.overview?.selectedInstanceId;
  const subtitle = [instance.loader, instance.minecraft, `${instance.mods ?? 0} 个模组`]
    .filter(Boolean)
    .join(" · ");
  return `
    <div class="row${selected ? " selected" : ""}" data-action="select-instance" data-id="${esc(instance.id)}">
      <div class="grow">
        <div>${esc(instance.displayName || instance.name)}${selected ? ' <span class="badge ok">当前</span>' : ""}</div>
        <div class="sub">${esc(subtitle || "空实例")}</div>
      </div>
      ${withAction || selected ? "" : '<button class="action ghost" type="button">设为当前</button>'}
    </div>`;
}

function accountRow(account) {
  const active = account.id === state.overview?.activeAccountId;
  return `
    <div class="row${active ? " selected" : ""}" data-action="select-account" data-id="${esc(account.id)}">
      <div class="grow">
        <div>${esc(account.player)}${active ? ' <span class="badge ok">使用中</span>' : ""}</div>
        <div class="sub">${esc(account.kind)} · ${esc(account.status)}</div>
      </div>
      <button class="action ghost" type="button">使用</button>
    </div>`;
}

function renderHome() {
  const instance = selectedInstance();
  const account = selectedAccount();
  const running = state.tasks.filter((task) => task.status === "running").length;
  const recent = state.instances.slice(0, 4);
  return `
    <section class="hero">
      <div>
        <p class="muted">当前实例</p>
        <h1>${esc(instance?.displayName || instance?.name || "还没有选择实例")}</h1>
        <p class="muted">${instance ? esc(`${instance.loader} ${instance.minecraft}`) : "到「实例」页选择一个实例"} · 账号 ${esc(account?.player ?? "未选择")}</p>
      </div>
      <span class="badge">${esc(state.manifest?.backend ?? "unknown")} 后端</span>
    </section>
    <div class="stats">
      <div class="stat"><span class="muted">实例</span><b>${state.instances.length}</b></div>
      <div class="stat"><span class="muted">账号</span><b>${state.accounts.length}</b></div>
      <div class="stat"><span class="muted">进行中任务</span><b>${running}</b></div>
    </div>
    <section class="card">
      <h2>快速开始</h2>
      <div class="list">${recent.length ? recent.map((item) => instanceRow(item)).join("") : '<p class="muted">还没有实例。</p>'}</div>
    </section>`;
}

function renderInstances() {
  return `
    <h1>实例</h1>
    <div class="list">${state.instances.length ? state.instances.map((item) => instanceRow(item)).join("") : '<p class="muted">还没有实例。</p>'}</div>`;
}

function renderAccounts() {
  return `
    <h1>账号</h1>
    <div class="list">${state.accounts.length ? state.accounts.map((item) => accountRow(item)).join("") : '<p class="muted">还没有账号。</p>'}</div>`;
}

function renderSettings() {
  const manifest = state.manifest;
  const rows = manifest
    ? [
        ["协议", manifest.protocol],
        ["内核 API", manifest.apiVersion],
        ["应用版本", manifest.appVersion],
        ["传输", (manifest.transports ?? []).join(", ")],
        ["方法", `${manifest.methods?.length ?? 0} 个`],
        ["前端", manifest.frontend?.mode ?? "official"],
      ]
    : [];
  return `
    <h1>设置</h1>
    <section class="card">
      <h2>内核</h2>
      <dl class="facts">${rows.map(([label, value]) => `<dt>${esc(label)}</dt><dd>${esc(value)}</dd>`).join("")}</dl>
    </section>
    <section class="card">
      <h2>运行日志</h2>
      <p class="muted">读取启动器最近的日志输出，排查前端与内核通信问题。</p>
      <button class="action" type="button" data-action="read-log">读取日志</button>
      ${state.log ? `<pre>${esc(state.log)}</pre>` : ""}
    </section>
    <section class="card">
      <h2>关于这个模板</h2>
      <p class="muted">这是布局起点，只覆盖核心流程。需要全部命令与参数表单时，参考 vite-react 模板。</p>
    </section>`;
}

function renderBody() {
  if (state.loading) {
    return '<p class="muted">正在连接 MCUGL 内核…</p>';
  }
  if (state.error) {
    const hint =
      state.error instanceof KernelError && state.error.code === "KERNEL_UNAVAILABLE"
        ? "请用 MCUGL_FRONTEND 指向本目录后重启启动器。"
        : "请确认启动器已启动，且内核版本兼容。";
    return `
      <section class="card error">
        <h2>无法连接内核</h2>
        <p>${esc(state.error.message)}</p>
        <p class="muted">${esc(hint)}</p>
        <button class="action" type="button" data-action="reload">重试</button>
      </section>`;
  }
  if (state.page === "instances") return renderInstances();
  if (state.page === "accounts") return renderAccounts();
  if (state.page === "settings") return renderSettings();
  return renderHome();
}

function render() {
  document.title = state.manifest ? `${state.manifest.frontend?.name ?? "MCUGL"} — ${state.manifest.appVersion}` : "MCUGL";
  statusEl.textContent = state.error
    ? "未连接"
    : state.manifest
      ? `v${state.manifest.apiVersion} · ${state.manifest.methods?.length ?? 0} 个方法`
      : "连接中…";
  for (const button of nav.querySelectorAll("button")) {
    if (button.dataset.page === state.page) {
      button.setAttribute("aria-current", "page");
    } else {
      button.removeAttribute("aria-current");
    }
  }
  view.innerHTML = renderBody();
  renderLaunch();
}

nav.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-page]");
  if (!button) return;
  state.page = button.dataset.page;
  render();
});

view.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  if (action === "select-instance") selectInstance(target.dataset.id);
  if (action === "select-account") selectAccount(target.dataset.id);
  if (action === "read-log") readLog();
  if (action === "reload") load();
});

launchBtn.addEventListener("click", launch);

load();
