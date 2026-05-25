import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  GitBranch,
  Info,
  Keyboard,
  RefreshCw,
  Rocket,
  Sparkles,
  Wand2,
  XCircle,
} from "lucide-react";
import { api } from "@/lib/tauri";
import { cn } from "@/lib/utils";
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
    <div className="space-y-6 fade-in">
      <header>
        <h1 className="text-[28px] font-semibold tracking-tight">设置</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          配置系统集成与应用偏好。
        </p>
      </header>

      {error && (
        <div className="surface-card flex items-start gap-2 border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <Section title="系统集成" description="与操作系统的深度交互">
        <div className="divide-y">
          <IntegrationToggle
            icon={<Rocket className="h-4 w-4" />}
            iconBg="from-orange-500 to-rose-500"
            title="开机自启"
            description="使用系统启动项自动打开 Git Profile Switcher"
            enabled={status?.autostartEnabled ?? false}
            disabled={!status || systemBusy}
            onClick={() =>
              toggleIntegration("autostartEnabled", api.setAutostart)
            }
          />
          <IntegrationToggle
            icon={<Keyboard className="h-4 w-4" />}
            iconBg="from-blue-500 to-indigo-600"
            title="全局快捷键"
            description="注册 Cmd/Ctrl + Shift + G 唤起主窗口"
            enabled={status?.globalShortcutEnabled ?? false}
            disabled={!status || systemBusy}
            onClick={() =>
              toggleIntegration("globalShortcutEnabled", api.setGlobalShortcut)
            }
          />
          <IntegrationToggle
            icon={<GitBranch className="h-4 w-4" />}
            iconBg="from-violet-500 to-purple-600"
            title="系统托盘"
            description="启用托盘入口，便捷显示窗口与退出"
            enabled={status?.trayEnabled ?? false}
            disabled={!status || systemBusy}
            onClick={() => toggleIntegration("trayEnabled", api.setTray)}
          />
          <IntegrationToggle
            icon={<Bell className="h-4 w-4" />}
            iconBg="from-emerald-500 to-teal-600"
            title="桌面通知"
            description="切换 Profile 成功后发送桌面通知"
            enabled={status?.notificationsEnabled ?? false}
            disabled={!status || systemBusy}
            onClick={() =>
              toggleIntegration("notificationsEnabled", api.setNotifications)
            }
          />
        </div>
      </Section>

      <Section title="工具" description="实用工具与高级操作">
        <div className="flex items-center gap-3 p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-pink-500 text-white shadow-soft">
            <Wand2 className="h-4 w-4" strokeWidth={2.5} />
          </span>
          <div className="flex-1">
            <div className="text-[13px] font-semibold">重新扫描环境</div>
            <div className="text-[11px] text-muted-foreground">
              重新扫描本机 Git / SSH / GPG 配置并打开导入向导
            </div>
          </div>
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
            className="btn-secondary"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            扫描
          </button>
        </div>
      </Section>

      <Section title="关于" description="">
        <div className="flex items-center gap-4 p-5">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-blue-600 text-white shadow-soft">
            <GitBranch className="h-6 w-6" strokeWidth={2.4} />
          </span>
          <div className="flex-1">
            <div className="text-[15px] font-semibold tracking-tight">
              Git Profile Switcher
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              一个让 Git 多账号管理变得优雅的工具
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="badge-muted">v0.0.1</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                <Sparkles className="h-2.5 w-2.5" />
                Tauri 2
              </span>
            </div>
          </div>
          <Info className="h-4 w-4 text-muted-foreground" />
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 px-1">
        <div className="section-title">{title}</div>
        {description && (
          <div className="mt-0.5 text-[11px] text-muted-foreground/80">
            {description}
          </div>
        )}
      </div>
      <div className="surface-card overflow-hidden">{children}</div>
    </section>
  );
}

function IntegrationToggle({
  icon,
  iconBg,
  title,
  description,
  enabled,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  enabled: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-soft-sm",
          iconBg,
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold">{title}</div>
        <div className="text-[11px] text-muted-foreground">{description}</div>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className="ios-toggle"
        data-state={enabled ? "on" : "off"}
        aria-pressed={enabled}
      />
    </div>
  );
}
