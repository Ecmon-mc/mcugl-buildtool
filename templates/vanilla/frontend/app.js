import { KernelError, call, manifest, overview } from "./kernel.js";

const app = document.querySelector("#app");

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function card(title, children) {
  const section = element("section", "card");
  section.append(element("h2", null, title));
  for (const child of children) section.append(child);
  return section;
}

function row(label, value) {
  const line = element("div", "row");
  line.append(element("span", "label", label), element("span", "value", value));
  return line;
}

async function boot() {
  const title = element("header", "hero");
  title.append(
    element("p", "eyebrow", "MCUGL 第三方前端"),
    element("h1", null, "{{name}}"),
    element("p", "muted", "标识 {{identifier}} · 版本 {{version}}"),
  );

  try {
    const [info, snapshot] = await Promise.all([manifest(), overview()]);
    const data = snapshot?.data ?? {};
    const implemented = Object.values(info.capabilities ?? {}).filter(Boolean).length;

    const summary = card("内核", [
      row("协议", info.protocol),
      row("内核 API", info.apiVersion),
      row("启动器", String(info.appVersion)),
      row("后端", info.backend),
      row("方法", `${info.methods?.length ?? 0} 个（已实现 ${implemented} 个）`),
      row("前端模式", info.frontend?.mode ?? "官方"),
    ]);

    const instance = card("当前实例", [
      row("实例", data.selectedInstanceId ?? "未选择"),
      row("启动器版本", String(data.appVersion ?? "—")),
    ]);

    const methods = element("div", "chips");
    for (const method of (info.methods ?? []).slice(0, 18)) {
      methods.append(element("code", "chip", method));
    }
    const api = card("方法示例", [methods, element("p", "muted", "完整清单在 kernel_manifest.methods。")]);

    const raw = element("details", "raw");
    raw.append(
      element("summary", null, "查看原始 JSON"),
      element("pre", null, JSON.stringify({ manifest: info, overview: snapshot }, null, 2)),
    );

    app.replaceChildren(title, summary, instance, api, raw);
  } catch (error) {
    const message = error instanceof KernelError ? `${error.method}: ${error.message}` : String(error);
    const failure = card("无法连接内核", [
      element("p", "error", message),
      element("p", "muted", "确认启动器开着、MCUGL_FRONTEND 指向本目录，然后刷新窗口。"),
    ]);
    const retry = element("button", "button", "重试");
    retry.addEventListener("click", () => {
      app.replaceChildren(title, element("p", "muted", "重试中…"));
      boot();
    });
    failure.append(retry);
    app.replaceChildren(title, failure);
  }
}

boot();
