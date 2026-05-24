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

  const toggleIntegration = async (
    key:
      | "autostartEnabled"
      | "globalShortcutEnabled"
      | "trayEnabled"
      | "notificationsEnabled",
    setter: (enabled: boolean) => Promise<SystemIntegrationStatus>,
  ) => {
    if (!status) return;
    setSystemBusy(true);
    setError(null);
    try {
      setStatus(await setter(!status[key]));
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
          <IntegrationToggle
            title="开机自启"
            description="使用系统启动项自动打开 Git Profile Switcher。"
            enabled={status?.autostartEnabled ?? false}
            disabled={!status || systemBusy}
            onClick={() =>
              toggleIntegration("autostartEnabled", api.setAutostart)
            }
          />
          <IntegrationToggle
            title="全局快捷键"
            description="注册 Cmd/Ctrl + Shift + G，用于显示主窗口。"
            enabled={status?.globalShortcutEnabled ?? false}
            disabled={!status || systemBusy}
            onClick={() =>
              toggleIntegration("globalShortcutEnabled", api.setGlobalShortcut)
            }
          />
          <IntegrationToggle
            title="系统托盘"
            description="启用托盘入口，用于显示窗口和退出应用。"
            enabled={status?.trayEnabled ?? false}
            disabled={!status || systemBusy}
            onClick={() => toggleIntegration("trayEnabled", api.setTray)}
          />
          <IntegrationToggle
            title="桌面通知"
            description="切换 Profile 成功后发送桌面通知。"
            enabled={status?.notificationsEnabled ?? false}
            disabled={!status || systemBusy}
            onClick={() =>
              toggleIntegration("notificationsEnabled", api.setNotifications)
            }
          />
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

function IntegrationToggle({
  title,
  description,
  enabled,
  disabled,
  onClick,
}: {
  title: string;
  description: string;
  enabled: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border p-3">
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <button
        disabled={disabled}
        onClick={onClick}
        className="shrink-0 rounded-md border px-3 py-1.5 text-xs hover:bg-accent disabled:opacity-50"
      >
        {enabled ? "关闭" : "开启"}
      </button>
    </div>
  );
}
