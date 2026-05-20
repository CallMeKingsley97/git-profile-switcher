import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { api } from "@/lib/tauri";
import { useProfileStore } from "@/store/profileStore";
import type { GitConfigSnapshot, SwitchRecord } from "@/types";
import { formatDateTime } from "@/lib/utils";

export default function Dashboard() {
  const { profiles, activeProfile, refresh } = useProfileStore();
  const [snapshot, setSnapshot] = useState<GitConfigSnapshot | null>(null);
  const [history, setHistory] = useState<SwitchRecord[]>([]);
  const [switching, setSwitching] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const [snap, hist] = await Promise.all([
        api.getCurrentGitConfig({ type: "Global" }),
        api.listHistory(10),
      ]);
      setSnapshot(snap);
      setHistory(hist);
    } catch (e: any) {
      setError(String(e?.message ?? e));
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

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">仪表盘</h1>
        <button
          onClick={load}
          className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
        >
          <RefreshCw className="h-3.5 w-3.5" /> 刷新
        </button>
      </header>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      <section className="rounded-lg border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">
            当前激活
          </h2>
          {activeProfile ? (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" /> {activeProfile.name}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">未设置</span>
          )}
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <Row label="user.name" value={snapshot?.userName} />
          <Row label="user.email" value={snapshot?.userEmail} />
          <Row label="signing key" value={snapshot?.signingKey} />
          <Row
            label="commit.gpgsign"
            value={
              snapshot?.gpgSign === undefined
                ? undefined
                : snapshot.gpgSign
                  ? "true"
                  : "false"
            }
          />
        </dl>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">
            快速切换
          </h2>
          <Link
            to="/profiles/new"
            className="text-xs text-primary hover:underline"
          >
            + 新建
          </Link>
        </div>
        {profiles.length === 0 ? (
          <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
            还没有任何 profile。
            <Link to="/profiles/new" className="ml-1 text-primary hover:underline">
              创建第一个
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {profiles.map((p) => {
              const active = activeProfile?.id === p.id;
              return (
                <div
                  key={p.id}
                  className="rounded-lg border bg-card p-4 transition-colors hover:border-primary/40"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium">
                      {p.icon ? `${p.icon} ` : ""}
                      {p.name}
                    </div>
                    {active && (
                      <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-xs text-emerald-600">
                        ● 激活
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {p.git.userEmail}
                  </div>
                  <button
                    disabled={active || switching === p.id}
                    onClick={() => handleSwitch(p.id)}
                    className="mt-3 w-full rounded-md border px-3 py-1.5 text-xs hover:bg-accent disabled:opacity-50"
                  >
                    {switching === p.id
                      ? "切换中…"
                      : active
                        ? "已激活"
                        : "切换到此"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          最近活动
        </h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无记录。</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {history.map((h) => (
              <li
                key={h.id}
                className="flex items-center justify-between rounded-md border bg-card px-3 py-2"
              >
                <span>
                  {h.success ? "✓" : "✗"} 切换到「{h.profileName}」(
                  {h.scope})
                </span>
                <span className="text-xs text-muted-foreground">
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

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono text-xs">{value || "—"}</dd>
    </>
  );
}
