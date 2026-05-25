import { useEffect, useState } from "react";
import {
  Archive,
  CheckCircle2,
  Clock,
  HardDrive,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { api } from "@/lib/tauri";
import { cn, formatDateTime } from "@/lib/utils";
import type { BackupEntry, SwitchRecord } from "@/types";

export default function History() {
  const [history, setHistory] = useState<SwitchRecord[]>([]);
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);

  const load = async () => {
    try {
      const [h, b] = await Promise.all([
        api.listHistory(100),
        api.listBackups(),
      ]);
      setHistory(h);
      setBackups(b);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleRestore = async (id: string) => {
    if (!confirm(`确认恢复备份 ${id}？这会覆盖当前 ~/.gitconfig。`)) return;
    setRestoring(id);
    try {
      await api.restoreBackup(id);
      alert("已恢复。");
      await load();
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setRestoring(null);
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <header>
        <h1 className="text-[28px] font-semibold tracking-tight">历史</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          切换记录与备份。在必要时可以一键恢复历史 git config。
        </p>
      </header>

      {error && (
        <div className="surface-card flex items-start gap-2 border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="section-title">
            <Clock className="mr-1 inline-block h-3 w-3" />
            切换记录
          </h2>
          <span className="text-[11px] text-muted-foreground">
            {history.length} 条
          </span>
        </div>
        {history.length === 0 ? (
          <div className="surface-card py-10 text-center text-sm text-muted-foreground">
            暂无记录
          </div>
        ) : (
          <div className="surface-card overflow-hidden">
            <ul className="relative divide-y">
              {history.map((h) => (
                <li
                  key={h.id}
                  className="group relative flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent/30"
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
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
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-[13px] font-semibold tracking-tight">
                        {h.profileName}
                      </span>
                      <span className="badge-muted !text-[10px]">{h.scope}</span>
                      {!h.success && (
                        <span className="badge-destructive !text-[10px]">
                          失败
                        </span>
                      )}
                    </div>
                    {h.errorMessage && (
                      <div className="mt-1 line-clamp-2 text-[11px] text-destructive/80">
                        {h.errorMessage}
                      </div>
                    )}
                    {h.targetPath && (
                      <div className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                        {h.targetPath}
                      </div>
                    )}
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {formatDateTime(h.timestamp)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="section-title">
            <Archive className="mr-1 inline-block h-3 w-3" />
            备份文件
          </h2>
          <span className="text-[11px] text-muted-foreground">
            {backups.length} 个
          </span>
        </div>
        {backups.length === 0 ? (
          <div className="surface-card py-10 text-center text-sm text-muted-foreground">
            暂无备份
          </div>
        ) : (
          <div className="surface-card overflow-hidden">
            <ul className="divide-y">
              {backups.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/30"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-400 to-slate-600 text-white shadow-soft-sm">
                    <HardDrive className="h-4 w-4" strokeWidth={2.4} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-mono text-[12px] font-medium">
                      {b.id}
                    </div>
                    <div className="truncate font-mono text-[11px] text-muted-foreground">
                      {b.path}
                    </div>
                  </div>
                  <button
                    disabled={restoring === b.id}
                    onClick={() => handleRestore(b.id)}
                    className="btn-secondary !py-1.5 !text-xs"
                  >
                    <RotateCcw className="h-3 w-3" />
                    {restoring === b.id ? "恢复中…" : "恢复"}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
