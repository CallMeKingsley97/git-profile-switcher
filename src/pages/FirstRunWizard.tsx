import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Sparkles } from "lucide-react";
import { api } from "@/lib/tauri";
import { useProfileStore } from "@/store/profileStore";
import type {
  DiscoveredIdentity,
  EnvScanReport,
  ProfileDraft,
  SshKeyInfo,
} from "@/types";

interface DraftRow extends ProfileDraft {
  enabled: boolean;
  source: string;
}

export default function FirstRunWizard() {
  const navigate = useNavigate();
  const refresh = useProfileStore((s) => s.refresh);

  const [scanning, setScanning] = useState(true);
  const [report, setReport] = useState<EnvScanReport | null>(null);
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.scanLocalGitEnvironment();
        setReport(r);
        setDrafts(buildDrafts(r));
      } catch (e: any) {
        setError(String(e?.message ?? e));
      } finally {
        setScanning(false);
      }
    })();
  }, []);

  const enabledCount = useMemo(
    () => drafts.filter((d) => d.enabled).length,
    [drafts],
  );

  const handleSkip = async () => {
    await api.markFirstRunCompleted();
    navigate("/", { replace: true });
  };

  const handleImport = async () => {
    if (!report) return;
    setImporting(true);
    setError(null);
    try {
      const selections = drafts
        .filter((d) => d.enabled && d.name.trim() && d.git.userEmail.trim())
        .map<ProfileDraft>(({ enabled, source, ...rest }) => rest);
      if (selections.length === 0) {
        await api.markFirstRunCompleted();
      } else {
        await api.importAsProfile(report, selections);
      }
      await refresh();
      navigate("/", { replace: true });
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setImporting(false);
    }
  };

  if (scanning) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        正在扫描本机 Git / SSH / GPG 配置…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Sparkles className="h-5 w-5 text-primary" />
            欢迎使用
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            我们已扫描本机现有 Git 环境，下面是建议导入的 profile。所有操作均为只读，未修改任何文件。
          </p>
        </div>
        <button
          onClick={handleSkip}
          className="text-xs text-muted-foreground hover:underline"
        >
          跳过
        </button>
      </header>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {report && (
        <section className="rounded-lg border bg-card p-4 text-sm">
          <h2 className="mb-2 text-xs font-medium uppercase text-muted-foreground">
            扫描概览
          </h2>
          <ul className="grid grid-cols-2 gap-2 text-xs">
            <li>
              全局 user.email：
              <span className="font-mono">
                {report.globalGitConfig.userEmail ?? "—"}
              </span>
            </li>
            <li>
              SSH key：<span className="font-mono">{report.sshKeys.length}</span>
            </li>
            <li>
              ~/.ssh/config Host：
              <span className="font-mono">
                {report.sshConfigHosts.length}
              </span>
            </li>
            <li>
              GPG key：<span className="font-mono">{report.gpgKeys.length}</span>
            </li>
            <li className="col-span-2">
              检测到的目录身份：
              <span className="font-mono">
                {report.discoveredIdentities.length}
              </span>
            </li>
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          建议导入（已勾选 {enabledCount} / {drafts.length}）
        </h2>
        {drafts.length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            未检测到可导入的身份。你可以稍后手动新建 profile。
          </p>
        ) : (
          drafts.map((d, idx) => (
            <div
              key={idx}
              className="rounded-lg border bg-card p-4 text-sm"
            >
              <label className="mb-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={d.enabled}
                  onChange={(e) =>
                    updateDraft(setDrafts, idx, { enabled: e.target.checked })
                  }
                />
                <span className="font-medium">{d.source}</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <Field label="名称">
                  <input
                    className="input"
                    value={d.name}
                    onChange={(e) =>
                      updateDraft(setDrafts, idx, { name: e.target.value })
                    }
                  />
                </Field>
                <Field label="user.email">
                  <input
                    className="input"
                    value={d.git.userEmail}
                    onChange={(e) =>
                      updateDraft(setDrafts, idx, {
                        git: { ...d.git, userEmail: e.target.value },
                      })
                    }
                  />
                </Field>
                <Field label="user.name">
                  <input
                    className="input"
                    value={d.git.userName}
                    onChange={(e) =>
                      updateDraft(setDrafts, idx, {
                        git: { ...d.git, userName: e.target.value },
                      })
                    }
                  />
                </Field>
                <Field label="SSH key 路径（可选）">
                  <input
                    className="input"
                    value={d.sshKeyPath ?? ""}
                    onChange={(e) =>
                      updateDraft(setDrafts, idx, {
                        sshKeyPath: e.target.value,
                      })
                    }
                  />
                </Field>
              </div>
              <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="radio"
                  name="active"
                  checked={d.makeActive}
                  onChange={() =>
                    setDrafts((prev) =>
                      prev.map((x, i) => ({ ...x, makeActive: i === idx })),
                    )
                  }
                />
                导入后设为当前激活
              </label>
            </div>
          ))
        )}
      </section>

      <div className="flex justify-end gap-2 pt-2">
        <button
          onClick={handleSkip}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
        >
          稍后再说
        </button>
        <button
          onClick={handleImport}
          disabled={importing}
          className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {importing ? "导入中…" : `导入 ${enabledCount} 个 profile`}
        </button>
      </div>

      <style>{`
        .input {
          width: 100%;
          border-radius: 0.375rem;
          border: 1px solid hsl(var(--border));
          background: hsl(var(--background));
          padding: 0.4rem 0.6rem;
          font-size: 0.8rem;
          outline: none;
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function updateDraft(
  setter: React.Dispatch<React.SetStateAction<DraftRow[]>>,
  idx: number,
  patch: Partial<DraftRow>,
) {
  setter((prev) => prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)));
}

function buildDrafts(report: EnvScanReport): DraftRow[] {
  const out: DraftRow[] = [];

  const g = report.globalGitConfig;
  if (g.userName || g.userEmail) {
    out.push({
      enabled: true,
      makeActive: true,
      source: "Current（来自全局 ~/.gitconfig）",
      name: "Current",
      git: {
        userName: g.userName ?? "",
        userEmail: g.userEmail ?? "",
        signingKey: g.signingKey,
        gpgSign: g.gpgSign,
        defaultBranch: g.defaultBranch,
      },
      sshKeyPath: pickDefaultSshKey(report),
    });
  }

  const seenEmails = new Set<string>();
  if (g.userEmail) seenEmails.add(g.userEmail);
  const usedKeyPaths = new Set<string>();
  const current = out[0];
  if (current?.sshKeyPath) usedKeyPaths.add(current.sshKeyPath);

  report.sshKeys.forEach((k) => {
    if (usedKeyPaths.has(k.privatePath)) return;
    const email = extractEmail(k.comment);
    const name = suggestNameFromKey(k);
    out.push({
      enabled: true,
      makeActive: false,
      source: `SSH key ${k.name}${email ? `（${email}）` : ""}`,
      name,
      git: {
        userName: g.userName ?? "",
        userEmail: email ?? "",
      },
      sshKeyPath: k.privatePath,
    });
    usedKeyPaths.add(k.privatePath);
    if (email) seenEmails.add(email);
  });

  report.discoveredIdentities.forEach((d: DiscoveredIdentity, i) => {
    const email = d.userEmail ?? "";
    if (!email || seenEmails.has(email)) return;
    seenEmails.add(email);
    out.push({
      enabled: true,
      makeActive: false,
      source: `检测到 ${d.directory ?? d.source} 使用 ${email}`,
      name: suggestName(d, i),
      git: {
        userName: d.userName ?? "",
        userEmail: email,
      },
    });
  });

  return out;
}

function suggestNameFromKey(k: SshKeyInfo): string {
  const m = k.name.match(/^id_(?:rsa|ed25519|ecdsa|dsa)_(.+)$/);
  if (m) {
    const tail = m[1];
    return tail.charAt(0).toUpperCase() + tail.slice(1);
  }
  return k.name;
}

function extractEmail(comment?: string): string | undefined {
  if (!comment) return undefined;
  const m = comment.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/);
  return m?.[0];
}

function suggestName(d: DiscoveredIdentity, i: number): string {
  if (d.directory) {
    const base = d.directory.split("/").filter(Boolean).pop();
    if (base) return base[0].toUpperCase() + base.slice(1);
  }
  return `Profile ${i + 1}`;
}

function pickDefaultSshKey(report: EnvScanReport): string | undefined {
  const preferred = ["id_ed25519", "id_rsa", "id_ecdsa"];
  for (const name of preferred) {
    const found = report.sshKeys.find((k) => k.name === name);
    if (found) return found.privatePath;
  }
  return report.sshKeys[0]?.privatePath;
}
