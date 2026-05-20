import { useEffect, useState } from "react";
import { api } from "@/lib/tauri";
import type { BackupEntry, SwitchRecord } from "@/types";
import { formatDateTime } from "@/lib/utils";

export default function History() {
  const [history, setHistory] = useState<SwitchRecord[]>([]);
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

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
    try {
      await api.restoreBackup(id);
      alert("已恢复。");
    } catch (e: any) {
      setError(String(e?.message ?? e));
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">历史</h1>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <section>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">
          切换记录
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
                  {h.success ? "✓" : "✗"} {h.profileName} ({h.scope})
                  {h.errorMessage && (
                    <span className="ml-2 text-destructive text-xs">
                      {h.errorMessage}
                    </span>
                  )}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(h.timestamp)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">
          备份文件
        </h2>
        {backups.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无备份。</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {backups.map((b) => (
              <li
                key={b.id}
                className="flex items-center justify-between rounded-md border bg-card px-3 py-2"
              >
                <div>
                  <div className="font-mono text-xs">{b.id}</div>
                  <div className="text-xs text-muted-foreground">{b.path}</div>
                </div>
                <button
                  onClick={() => handleRestore(b.id)}
                  className="rounded-md border px-3 py-1 text-xs hover:bg-accent"
                >
                  恢复
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
