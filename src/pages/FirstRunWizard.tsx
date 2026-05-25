import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  ChevronRight,
  KeyRound,
  Loader2,
  Sparkles,
  Star,
  Wand2,
  XCircle,
} from "lucide-react";
import { api } from "@/lib/tauri";
import { useProfileStore } from "@/store/profileStore";
import { cn } from "@/lib/utils";
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
        .map<ProfileDraft>(({ enabled: _e, source: _s, ...rest }) => rest);
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
      <div className="mx-auto flex h-[60vh] max-w-md flex-col items-center justify-center gap-4 text-center">
        <div className="relative">
          <span className="absolute -inset-2 animate-pulse-ring rounded-full bg-primary/30" />
          <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-blue-600 text-white shadow-soft-lg">
            <Wand2 className="h-6 w-6" strokeWidth={2.4} />
          </span>
        </div>
        <div className="space-y-1">
          <div className="text-base font-semibold tracking-tight">
            正在扫描本机环境…
          </div>
          <div className="text-xs text-muted-foreground">
            Git / SSH / GPG 配置（仅读取，不修改任何文件）
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 fade-in">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400/20 to-pink-500/20 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-pink-600 dark:text-pink-400">
            <Sparkles className="h-3 w-3" />
            首次启动
          </span>
          <h1 className="text-[28px] font-semibold tracking-tight">
            欢迎使用
          </h1>
          <p className="text-sm text-muted-foreground">
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
        <div className="surface-card flex items-start gap-2 border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {report && (
        <section className="surface-card overflow-hidden">
          <div className="border-b bg-gradient-to-br from-primary/5 to-transparent px-5 py-3">
            <div className="section-title">扫描概览</div>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 p-5 md:grid-cols-4">
            <StatItem
              label="全局 email"
              value={report.globalGitConfig.userEmail ?? "—"}
              mono
            />
            <StatItem
              label="SSH key"
              value={String(report.sshKeys.length)}
            />
            <StatItem
              label="SSH Host"
              value={String(report.sshConfigHosts.length)}
            />
            <StatItem
              label="GPG key"
              value={String(report.gpgKeys.length)}
            />
            <div className="col-span-2 md:col-span-4">
              <StatItem
                label="检测到的目录身份"
                value={String(report.discoveredIdentities.length)}
              />
            </div>
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="section-title">
            建议导入 · 已选 {enabledCount}/{drafts.length}
          </h2>
        </div>
        {drafts.length === 0 ? (
          <div className="surface-card flex flex-col items-center gap-2 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <KeyRound className="h-5 w-5" />
            </span>
            <div className="text-sm text-muted-foreground">
              未检测到可导入的身份。可以稍后手动创建 profile。
            </div>
          </div>
        ) : (
          drafts.map((d, idx) => (
            <article
              key={idx}
              className={cn(
                "surface-card overflow-hidden transition-all",
                d.enabled && "ring-1 ring-primary/20",
              )}
            >
              <header className="flex items-center justify-between gap-3 border-b bg-muted/20 px-5 py-3">
                <label className="flex flex-1 cursor-pointer items-center gap-3">
                  <CheckBox
                    checked={d.enabled}
                    onChange={(e) =>
                      updateDraft(setDrafts, idx, { enabled: e.target.checked })
                    }
                  />
                  <span className="text-[13px] font-semibold">{d.source}</span>
                </label>
                <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-[11px] text-muted-foreground">
                  <input
                    type="radio"
                    name="active"
                    checked={d.makeActive}
                    onChange={() =>
                      setDrafts((prev) =>
                        prev.map((x, i) => ({ ...x, makeActive: i === idx })),
                      )
                    }
                    className="sr-only peer"
                  />
                  <span
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded-full border transition-colors",
                      d.makeActive
                        ? "border-amber-500 bg-amber-500 text-white"
                        : "border-muted-foreground/30",
                    )}
                  >
                    {d.makeActive && (
                      <Star className="h-2.5 w-2.5 fill-current" />
                    )}
                  </span>
                  设为激活
                </label>
              </header>
              <div className="grid grid-cols-2 gap-4 p-5">
                <Field label="名称">
                  <input
                    className="field-input"
                    value={d.name}
                    onChange={(e) =>
                      updateDraft(setDrafts, idx, { name: e.target.value })
                    }
                  />
                </Field>
                <Field label="user.email">
                  <input
                    className="field-input font-mono text-[13px]"
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
                    className="field-input font-mono text-[13px]"
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
                    className="field-input font-mono text-[13px]"
                    value={d.sshKeyPath ?? ""}
                    onChange={(e) =>
                      updateDraft(setDrafts, idx, { sshKeyPath: e.target.value })
                    }
                  />
                </Field>
              </div>
            </article>
          ))
        )}
      </section>

      <div className="sticky bottom-0 -mx-8 flex items-center justify-between gap-2 border-t border-border/60 bg-background/85 px-8 py-4 backdrop-blur-xl">
        <button onClick={handleSkip} className="btn-ghost">
          稍后再说
        </button>
        <button
          onClick={handleImport}
          disabled={importing}
          className="btn-primary"
        >
          {importing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" strokeWidth={2.5} />
          )}
          {importing
            ? "导入中…"
            : enabledCount > 0
              ? `导入 ${enabledCount} 个 profile`
              : "跳过"}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function StatItem({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="space-y-0.5">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "truncate text-[13px] font-semibold tracking-tight",
          mono && "font-mono text-[12px]",
        )}
        title={value}
      >
        {value}
      </div>
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
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

function CheckBox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <span className="relative flex h-4 w-4 items-center justify-center">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="peer absolute inset-0 cursor-pointer opacity-0"
      />
      <span
        className={cn(
          "flex h-4 w-4 items-center justify-center rounded-md border transition-all",
          checked
            ? "border-primary bg-gradient-to-br from-primary to-blue-600 text-white shadow-soft-sm"
            : "border-muted-foreground/30",
        )}
      >
        {checked && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
    </span>
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
  const defaultKeyPath = pickDefaultSshKey(report);
  const seenEmails = new Set<string>();

  report.sshKeys.forEach((k) => {
    const email = extractEmail(k.comment) ?? g.userEmail ?? "";
    const isDefault = k.privatePath === defaultKeyPath;
    out.push({
      enabled: true,
      makeActive: isDefault,
      source: isDefault
        ? `Current（${k.name}${email ? `，${email}` : ""}）`
        : `SSH key ${k.name}${email ? `（${email}）` : ""}`,
      name: suggestNameFromKey(k),
      git: {
        userName: g.userName ?? "",
        userEmail: email,
        signingKey: isDefault ? g.signingKey : undefined,
        gpgSign: isDefault ? g.gpgSign : undefined,
        defaultBranch: isDefault ? g.defaultBranch : undefined,
      },
      sshKeyPath: k.privatePath,
    });
    if (email) seenEmails.add(email);
  });

  if (out.length === 0 && (g.userName || g.userEmail)) {
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
    });
    if (g.userEmail) seenEmails.add(g.userEmail);
  }

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
