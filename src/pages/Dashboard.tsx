import { useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  FolderGit2,
  FolderOpen,
  Loader2,
  Plus,
  RefreshCw,
  UserRound,
  XCircle,
} from "lucide-react";
import { api } from "@/lib/tauri";
import { useProfileStore } from "@/store/profileStore";
import type { GitConfigSnapshot, SwitchRecord } from "@/types";
import { cn, formatDateTime } from "@/lib/utils";

export default function Dashboard() {
  const { profiles, activeProfile, refresh } = useProfileStore();
  const [snapshot, setSnapshot] = useState<GitConfigSnapshot | null>(null);
  const [history, setHistory] = useState<SwitchRecord[]>([]);
  const [switching, setSwitching] = useState<string | null>(null);
  const [localPath, setLocalPath] = useState("");
  const [localSwitching, setLocalSwitching] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setRefreshing(true);
    try {
      const [snap, hist] = await Promise.all([
        api.getCurrentGitConfig({ type: "Global" }),
        api.listHistory(200),
      ]);
      setSnapshot(snap);
      setHistory(hist);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSwitch = async (id: string) => {
    setSwitching(id);
    setError(null);
    try {
      await api.switchProfile(id, { type: "Global" });
      await refresh();
      await load();
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setSwitching(null);
    }
  };

  const handlePickDirectory = async () => {
    const selected = await open({ directory: true, multiple: false });
    if (typeof selected === "string") setLocalPath(selected);
  };

  const handleLocalSwitch = async (id: string) => {
    if (!localPath.trim()) {
      setError("请先选择仓库目录。");
      return;
    }
    setLocalSwitching(id);
    setError(null);
    try {
      await api.switchProfile(id, { type: "Local", path: localPath.trim() });
      await load();
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLocalSwitching(null);
    }
  };

  const configuredRepositories = history
    .filter((record) => record.success && record.scope === "local" && record.targetPath)
    .reduce<SwitchRecord[]>((items, record) => {
      if (!record.targetPath || items.some((item) => item.targetPath === record.targetPath)) {
        return items;
      }
      return [...items, record];
    }, []);

  return (
    <div className="space-y-7 fade-in">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">仪表盘</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            一目了然地查看当前 Git 身份，并快速切换。
          </p>
        </div>
        <button
          onClick={load}
          className="btn-secondary !px-3"
          title="刷新"
        >
          <RefreshCw
            className={cn("h-4 w-4", refreshing && "animate-spin")}
            strokeWidth={2.2}
          />
        </button>
      </header>

      {error && (
        <div className="surface-card flex items-start gap-2 border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <section className="surface-card-elevated relative overflow-hidden">
        <div className="absolute inset-0 bg-mesh opacity-60" />
        <div className="relative flex items-start justify-between gap-4 p-6">
          <div className="space-y-1">
            <div className="section-title">当前激活</div>
            <div className="flex items-baseline gap-2">
              {activeProfile ? (
                <>
                  <span className="text-2xl">{activeProfile.icon || "👤"}</span>
                  <span className="text-xl font-semibold tracking-tight">
                    {activeProfile.name}
                  </span>
                </>
              ) : (
                <span className="text-xl font-semibold text-muted-foreground">
                  未设置
                </span>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              {snapshot?.userEmail || "—"}
            </div>
          </div>
          {activeProfile && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 animate-pulse-ring" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              在用
            </span>
          )}
        </div>
        <div className="relative grid grid-cols-2 gap-x-6 gap-y-3 border-t bg-background/40 px-6 py-4 backdrop-blur-sm md:grid-cols-4">
          <DataItem label="user.name" value={snapshot?.userName} />
          <DataItem label="user.email" value={snapshot?.userEmail} mono />
          <DataItem label="signing key" value={snapshot?.signingKey} mono />
          <DataItem
            label="gpg sign"
            value={
              snapshot?.gpgSign === undefined
                ? undefined
                : snapshot.gpgSign
                  ? "true"
                  : "false"
            }
          />
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="section-title">快速切换</h2>
          <Link
            to="/profiles/new"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            <Plus className="h-3 w-3" /> 新建
          </Link>
        </div>
        {profiles.length === 0 ? (
          <div className="surface-card flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Plus className="h-5 w-5" />
            </span>
            <div>
              <div className="text-sm font-medium">还没有任何 profile</div>
              <Link
                to="/profiles/new"
                className="mt-1 text-xs text-primary hover:underline"
              >
                创建第一个 →
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {profiles.map((p) => {
              const active = activeProfile?.id === p.id;
              const isSwitching = switching === p.id;
              return (
                <button
                  key={p.id}
                  disabled={active || isSwitching}
                  onClick={() => handleSwitch(p.id)}
                  className={cn(
                    "surface-card group relative overflow-hidden p-4 text-left transition-all duration-200",
                    "disabled:cursor-default",
                    !active &&
                      !isSwitching &&
                      "hover:-translate-y-0.5 hover:shadow-soft-lg hover:ring-1 hover:ring-primary/30",
                    active && "ring-2 ring-emerald-500/40",
                  )}
                >
                  {active && (
                    <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" strokeWidth={2.5} />
                      激活
                    </span>
                  )}
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-muted to-muted/50 text-xl">
                      {p.icon || "👤"}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-[15px] font-semibold tracking-tight">
                        {p.name}
                      </div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        {p.git.userEmail}
                      </div>
                    </div>
                  </div>
                  <div
                    className={cn(
                      "mt-3 inline-flex items-center gap-1 text-[11px] font-medium",
                      active
                        ? "text-emerald-600"
                        : "text-primary opacity-0 transition-opacity group-hover:opacity-100",
                    )}
                  >
                    {isSwitching ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        切换中…
                      </>
                    ) : active ? (
                      "正在使用"
                    ) : (
                      <>
                        切换到此 <ChevronRight className="h-3 w-3" />
                      </>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="section-title">仓库级切换</h2>
        </div>
        <div className="surface-card space-y-3 p-4">
          <div className="flex gap-2">
            <input
              className="field-input flex-1"
              value={localPath}
              onChange={(e) => setLocalPath(e.target.value)}
              placeholder="选择或输入 Git 仓库目录"
            />
            <button
              onClick={handlePickDirectory}
              className="btn-secondary !px-3"
              title="浏览目录"
            >
              <FolderOpen className="h-4 w-4" />
              浏览
            </button>
          </div>
          {profiles.length > 0 && (
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              {profiles.map((p) => (
                <button
                  key={p.id}
                  disabled={!localPath.trim() || localSwitching === p.id}
                  onClick={() => handleLocalSwitch(p.id)}
                  className="group flex items-center gap-2 rounded-xl border bg-card px-3 py-2 text-left text-xs transition-all hover:bg-accent disabled:opacity-50"
                >
                  <span className="text-base">{p.icon || "👤"}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{p.name}</div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {localSwitching === p.id ? "切换中…" : p.git.userEmail}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="section-title">已设置仓库身份</h2>
          <span className="text-[11px] text-muted-foreground">
            {configuredRepositories.length} 个仓库
          </span>
        </div>
        {configuredRepositories.length === 0 ? (
          <div className="surface-card flex flex-col items-center gap-3 py-10 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <FolderGit2 className="h-5 w-5" strokeWidth={2.3} />
            </span>
            <div className="space-y-1">
              <div className="text-sm font-medium">还没有仓库级身份</div>
              <div className="text-xs text-muted-foreground">
                在下方为仓库切换一次 profile 后，这里会显示该仓库当前使用的 Git 身份。
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {configuredRepositories.map((record) => {
              const profile = profiles.find((p) => p.id === record.profileId);
              const identityName = profile?.git.userName ?? record.profileUserName;
              const identityEmail = profile?.git.userEmail ?? record.profileEmail;
              return (
                <article
                  key={record.targetPath}
                  className="surface-card group overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft-lg"
                >
                  <div className="flex items-start gap-3 p-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <FolderGit2 className="h-5 w-5" strokeWidth={2.4} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div
                        className="truncate font-mono text-[12px] font-medium"
                        title={record.targetPath}
                      >
                        {record.targetPath}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                          <UserRound className="h-3 w-3" strokeWidth={2.4} />
                          {profile?.name ?? record.profileName}
                        </span>
                        {record.timestamp && (
                          <span className="text-[11px] text-muted-foreground">
                            {formatDateTime(record.timestamp)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 border-t bg-background/40 px-4 py-3 sm:grid-cols-2">
                    <DataItem label="user.name" value={identityName} />
                    <DataItem label="user.email" value={identityEmail} mono />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="section-title">最近活动</h2>
          <Link
            to="/history"
            className="text-xs font-medium text-primary hover:underline"
          >
            查看全部 →
          </Link>
        </div>
        {history.length === 0 ? (
          <div className="surface-card py-8 text-center text-sm text-muted-foreground">
            暂无切换记录
          </div>
        ) : (
          <ul className="surface-card divide-y overflow-hidden">
            {history.slice(0, 6).map((h) => (
              <li
                key={h.id}
                className="flex items-center gap-3 px-4 py-3 text-sm"
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                    h.success
                      ? "bg-emerald-500/10 text-emerald-600"
                      : "bg-destructive/10 text-destructive",
                  )}
                >
                  {h.success ? (
                    <CheckCircle2 className="h-4 w-4" strokeWidth={2.5} />
                  ) : (
                    <XCircle className="h-4 w-4" strokeWidth={2.5} />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">
                    切换到「{h.profileName}」
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {h.scope}
                  </div>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  {formatDateTime(h.timestamp)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function DataItem({
  label,
  value,
  mono,
}: {
  label: string;
  value?: string;
  mono?: boolean;
}) {
  return (
    <div className="space-y-0.5">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "truncate text-[13px]",
          mono && "font-mono",
          !value && "text-muted-foreground/60",
        )}
        title={value}
      >
        {value || "—"}
      </div>
    </div>
  );
}
