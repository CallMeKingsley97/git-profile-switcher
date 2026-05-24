import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/tauri";
import type { SystemIntegrationStatus } from "@/types";

export default function Settings() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [systemBusy, setSystemBusy] = useState(false);
  const [status, setStatus] = useState<SystemIntegrationStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setStatus(await api.getSystemIntegrationStatus());
      } catch (e: any) {
        setError(String(e?.message ?? e));
      }
    })();
  }, []);

  const toggleAutostart = async () => {
    if (!status) return;
    setSystemBusy(true);
    setError(null);
    try {
      setStatus(await api.setAutostart(!status.autostartEnabled));
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setSystemBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">设置</h1>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <section className="rounded-lg border bg-card p-4">
        <h2 className="mb-2 text-sm font-medium">系统集成</h2>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <div className="font-medium">开机自启</div>
              <div className="text-xs text-muted-foreground">
                使用系统启动项自动打开 Git Profile Switcher。
              </div>
            </div>
            <button
              disabled={!status || systemBusy}
              onClick={toggleAutostart}
              className="rounded-md border px-3 py-1.5 text-xs hover:bg-accent disabled:opacity-50"
            >
              {status?.autostartEnabled ? "关闭" : "开启"}
            </button>
          </div>
          <div className="rounded-md border p-3">
            <div className="font-medium">全局快捷键</div>
            <div className="text-xs text-muted-foreground">
              已注册 Cmd/Ctrl + Shift + G，用于显示主窗口。
            </div>
          </div>
          <div className="rounded-md border p-3">
            <div className="font-medium">系统托盘与通知</div>
            <div className="text-xs text-muted-foreground">
              托盘支持显示窗口和退出；切换 Profile 成功后会发送桌面通知。
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-4">
        <h2 className="mb-2 text-sm font-medium">首次启动向导</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          重新扫描本机配置并打开导入向导。
        </p>
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              navigate("/first-run");
            } finally {
              setBusy(false);
            }
          }}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
        >
          重新扫描
        </button>
      </section>

      <section className="rounded-lg border bg-card p-4">
        <h2 className="mb-2 text-sm font-medium">关于</h2>
        <p className="text-xs text-muted-foreground">
          Git Profile Switcher v0.0.1
        </p>
      </section>
    </div>
  );
}
