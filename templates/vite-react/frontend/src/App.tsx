import { useEffect, useState } from "react";
import {
  KernelError,
  manifest,
  overview,
  type KernelManifest,
  type OverviewSnapshot,
} from "./kernel";

type State = {
  loading: boolean;
  manifest?: KernelManifest;
  overview?: OverviewSnapshot;
  error?: string;
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="row">
      <span className="label">{label}</span>
      <span className="value">{value}</span>
    </div>
  );
}

export default function App() {
  const [state, setState] = useState<State>({ loading: true });

  const load = () => {
    setState({ loading: true });
    Promise.all([manifest(), overview()])
      .then(([info, snapshot]) => setState({ loading: false, manifest: info, overview: snapshot }))
      .catch((error: unknown) =>
        setState({
          loading: false,
          error:
            error instanceof KernelError
              ? `${error.method}: ${error.message}`
              : String(error),
        }),
      );
  };

  useEffect(load, []);

  const info = state.manifest;
  const data = state.overview?.data ?? {};
  const implemented = info
    ? Object.values(info.capabilities ?? {}).filter(Boolean).length
    : 0;

  return (
    <main>
      <header className="hero">
        <p className="eyebrow">MCUGL 第三方前端</p>
        <h1>{"{{name}}"}</h1>
        <p className="muted">
          {"标识 {{identifier}} · 版本 {{version}}"}
        </p>
      </header>

      {state.error ? (
        <section className="card">
          <h2>无法连接内核</h2>
          <p className="error">{state.error}</p>
          <p className="muted">确认启动器开着、MCUGL_FRONTEND 指向 dist/frontend，然后刷新窗口。</p>
          <button className="button" onClick={load}>
            重试
          </button>
        </section>
      ) : state.loading || !info ? (
        <section className="card">
          <p className="muted">正在连接 MCUGL 内核…</p>
        </section>
      ) : (
        <>
          <section className="card">
            <h2>内核</h2>
            <Row label="协议" value={info.protocol} />
            <Row label="内核 API" value={info.apiVersion} />
            <Row label="启动器" value={String(info.appVersion)} />
            <Row label="后端" value={info.backend} />
            <Row label="方法" value={`${info.methods.length} 个（已实现 ${implemented} 个）`} />
            <Row label="前端模式" value={info.frontend?.mode ?? "官方"} />
          </section>

          <section className="card">
            <h2>当前实例</h2>
            <Row label="实例" value={String(data.selectedInstanceId ?? "未选择")} />
            <Row label="启动器版本" value={String(data.appVersion ?? "—")} />
          </section>

          <section className="card">
            <h2>方法示例</h2>
            <div className="chips">
              {info.methods.slice(0, 18).map((method) => (
                <code className="chip" key={method}>
                  {method}
                </code>
              ))}
            </div>
            <p className="muted">完整清单在 kernel_manifest.methods。</p>
          </section>

          <details className="raw">
            <summary>查看原始 JSON</summary>
            <pre>{JSON.stringify({ manifest: info, overview: state.overview }, null, 2)}</pre>
          </details>
        </>
      )}
    </main>
  );
}
