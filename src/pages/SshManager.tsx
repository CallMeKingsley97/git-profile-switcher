import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  Copy,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  Shield,
  Sparkles,
  Terminal,
  X,
} from "lucide-react";
import { api } from "@/lib/tauri";
import { cn } from "@/lib/utils";
import type { SshKeyInfo, SshKeyType, SshTestResult } from "@/types";

const keyTypes: { value: SshKeyType; label: string; desc: string }[] = [
  { value: "ed25519", label: "Ed25519", desc: "现代、安全、推荐" },
  { value: "rsa", label: "RSA 4096", desc: "兼容性好" },
  { value: "ecdsa", label: "ECDSA", desc: "椭圆曲线" },
];

export default function SshManager() {
  const [keys, setKeys] = useState<SshKeyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<SshTestResult | null>(null);
  const [showGenerate, setShowGenerate] = useState(false);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [publicKeyCache, setPublicKeyCache] = useState<Record<string, string>>(
    {},
  );
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [form, setForm] = useState({
    keyType: "ed25519" as SshKeyType,
    fileName: "id_ed25519_git_profile_switcher",
    comment: "",
    passphrase: "",
  });
  const [generating, setGenerating] = useState(false);

  const defaultComment = useMemo(() => {
    if (form.comment.trim()) return form.comment;
    return "git-profile-switcher";
  }, [form.comment]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setKeys(await api.listSshKeys());
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      await api.generateSshKey(
        form.keyType,
        form.fileName,
        defaultComment,
        form.passphrase || undefined,
      );
      setForm((current) => ({ ...current, passphrase: "" }));
      setShowGenerate(false);
      await load();
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setGenerating(false);
    }
  };

  const handleTest = async (host: string, keyName: string) => {
    const id = `${keyName}:${host}`;
    setTesting(id);
    setTestResult(null);
    setError(null);
    try {
      setTestResult(await api.testSshConnection(host));
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setTesting(null);
    }
  };

  const togglePublicKey = async (key: SshKeyInfo) => {
    if (expandedKey === key.privatePath) {
      setExpandedKey(null);
      return;
    }
    setExpandedKey(key.privatePath);
    if (key.publicPath && !publicKeyCache[key.publicPath]) {
      try {
        const content = await api.readSshPublicKey(key.publicPath);
        setPublicKeyCache((prev) => ({ ...prev, [key.publicPath!]: content }));
      } catch (e: any) {
        setError(String(e?.message ?? e));
      }
    }
  };

  const handleCopy = async (text: string, marker: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPath(marker);
      setTimeout(() => setCopiedPath((curr) => (curr === marker ? null : curr)), 1600);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-soft">
              <KeyRound className="h-5 w-5 text-white" strokeWidth={2.2} />
            </span>
            <h1 className="text-[28px] font-semibold tracking-tight">
              SSH Keys
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            管理本机 SSH key 元信息，生成新 key，并测试 Host 连接。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="btn-secondary !px-3" title="刷新">
            <RefreshCw
              className={cn("h-4 w-4", loading && "animate-spin")}
              strokeWidth={2.2}
            />
          </button>
          <button
            onClick={() => setShowGenerate((v) => !v)}
            className="btn-primary"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            生成 Key
          </button>
        </div>
      </header>

      {error && (
        <div className="surface-card flex items-start gap-3 border-destructive/30 bg-destructive/5 p-4">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-destructive/15">
            <X className="h-3 w-3 text-destructive" strokeWidth={3} />
          </span>
          <div className="flex-1 text-sm text-destructive">{error}</div>
          <button
            onClick={() => setError(null)}
            className="rounded-md p-1 text-destructive/70 hover:bg-destructive/10"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {showGenerate && (
        <section className="surface-card-elevated slide-up overflow-hidden">
          <div className="flex items-center gap-2 border-b bg-gradient-to-br from-primary/5 to-transparent px-5 py-4">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">生成新的 SSH Key</h2>
          </div>
          <div className="space-y-5 p-5">
            <div>
              <div className="field-label">Key 类型</div>
              <div className="grid grid-cols-3 gap-2">
                {keyTypes.map((type) => (
                  <button
                    type="button"
                    key={type.value}
                    onClick={() =>
                      setForm((c) => ({ ...c, keyType: type.value }))
                    }
                    className={cn(
                      "flex flex-col items-start gap-0.5 rounded-xl border bg-card px-3 py-2.5 text-left transition-all",
                      form.keyType === type.value
                        ? "border-primary/60 ring-2 ring-primary/20"
                        : "hover:border-primary/30 hover:bg-accent/30",
                    )}
                  >
                    <span className="text-[13px] font-semibold">
                      {type.label}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {type.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="文件名">
                <input
                  className="field-input font-mono text-[13px]"
                  value={form.fileName}
                  onChange={(e) =>
                    setForm((c) => ({ ...c, fileName: e.target.value }))
                  }
                  placeholder="id_ed25519_work"
                />
              </Field>
              <Field label="Comment">
                <input
                  className="field-input"
                  value={form.comment}
                  onChange={(e) =>
                    setForm((c) => ({ ...c, comment: e.target.value }))
                  }
                  placeholder="git-profile-switcher"
                />
              </Field>
              <Field label="Passphrase（可选）" className="md:col-span-2">
                <input
                  className="field-input"
                  type="password"
                  value={form.passphrase}
                  onChange={(e) =>
                    setForm((c) => ({ ...c, passphrase: e.target.value }))
                  }
                  placeholder="留空则不设置"
                />
              </Field>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setShowGenerate(false)}
                className="btn-ghost"
              >
                取消
              </button>
              <button
                disabled={generating || !form.fileName.trim()}
                onClick={handleGenerate}
                className="btn-primary"
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" strokeWidth={2.5} />
                )}
                {generating ? "生成中…" : "生成"}
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-end justify-between px-1">
          <h2 className="section-title">已发现的 SSH Keys</h2>
          <span className="text-xs text-muted-foreground">
            {keys.length} 个 key · ~/.ssh/
          </span>
        </div>

        {loading ? (
          <div className="surface-card flex items-center justify-center gap-3 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> 加载中…
          </div>
        ) : keys.length === 0 ? (
          <div className="surface-card flex flex-col items-center gap-3 py-14 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
              <KeyRound className="h-6 w-6 text-muted-foreground" />
            </span>
            <div>
              <div className="text-sm font-medium">还没有 SSH key</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                点击右上角「生成 Key」即可创建一个。
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {keys.map((key) => {
              const isOpen = expandedKey === key.privatePath;
              const pubKey = key.publicPath
                ? publicKeyCache[key.publicPath]
                : undefined;
              return (
                <article
                  key={key.privatePath}
                  className={cn(
                    "surface-card overflow-hidden transition-all duration-300",
                    isOpen && "shadow-soft-lg ring-1 ring-primary/10",
                  )}
                >
                  <div className="flex items-start gap-4 p-5">
                    <KeyAvatar type={key.keyType} />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[15px] font-semibold tracking-tight">
                          {key.name}
                        </span>
                        {key.keyType && (
                          <span className="badge-primary !text-[10px] uppercase">
                            {key.keyType.replace("ssh-", "")}
                          </span>
                        )}
                        {key.publicPath ? (
                          <span className="badge-success">
                            <Check className="h-3 w-3" strokeWidth={3} />
                            public 已存在
                          </span>
                        ) : (
                          <span className="badge-warning">仅私钥</span>
                        )}
                      </div>

                      <button
                        onClick={() =>
                          handleCopy(key.privatePath, key.privatePath)
                        }
                        className="group/path mt-1.5 flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground hover:text-foreground"
                        title="复制路径"
                      >
                        <span className="truncate">{key.privatePath}</span>
                        {copiedPath === key.privatePath ? (
                          <Check className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <Copy className="h-3 w-3 opacity-0 transition-opacity group-hover/path:opacity-100" />
                        )}
                      </button>

                      {key.comment && (
                        <div className="mt-2 line-clamp-1 text-[12px] text-muted-foreground">
                          <span className="text-muted-foreground/60">
                            comment ·{" "}
                          </span>
                          {key.comment}
                        </div>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <div className="flex gap-1.5">
                        <TestHostButton
                          label="GitHub"
                          host="git@github.com"
                          loading={testing === `${key.name}:git@github.com`}
                          onClick={() => handleTest("git@github.com", key.name)}
                        />
                        <TestHostButton
                          label="Gitee"
                          host="git@gitee.com"
                          loading={testing === `${key.name}:git@gitee.com`}
                          onClick={() => handleTest("git@gitee.com", key.name)}
                        />
                      </div>
                      {key.publicPath && (
                        <button
                          onClick={() => togglePublicKey(key)}
                          className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                        >
                          {isOpen ? "收起" : "查看公钥"}
                          <ChevronDown
                            className={cn(
                              "h-3 w-3 transition-transform",
                              isOpen && "rotate-180",
                            )}
                          />
                        </button>
                      )}
                    </div>
                  </div>

                  {isOpen && key.publicPath && (
                    <div className="border-t bg-muted/30 p-5">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="section-title">Public Key</span>
                        <button
                          onClick={() =>
                            pubKey &&
                            handleCopy(pubKey, `pub:${key.publicPath}`)
                          }
                          disabled={!pubKey}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-card px-2.5 py-1 text-[11px] font-medium shadow-soft-sm hover:bg-accent disabled:opacity-50"
                        >
                          {copiedPath === `pub:${key.publicPath}` ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-500" />
                              已复制
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              复制
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="max-h-32 overflow-auto rounded-xl border bg-card p-3 font-mono text-[11px] leading-relaxed">
                        {pubKey ?? "读取中…"}
                      </pre>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {testResult && (
        <section
          className={cn(
            "surface-card-elevated slide-up overflow-hidden",
            testResult.success ? "ring-1 ring-emerald-500/20" : "ring-1 ring-destructive/20",
          )}
        >
          <div className="flex items-center justify-between border-b px-5 py-3">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-lg",
                  testResult.success
                    ? "bg-emerald-500/10 text-emerald-600"
                    : "bg-destructive/10 text-destructive",
                )}
              >
                {testResult.success ? (
                  <Shield className="h-4 w-4" strokeWidth={2.5} />
                ) : (
                  <X className="h-4 w-4" strokeWidth={2.5} />
                )}
              </span>
              <div>
                <div className="text-sm font-semibold">
                  SSH 测试 · {testResult.host}
                </div>
                <div
                  className={cn(
                    "text-[11px] font-medium",
                    testResult.success
                      ? "text-emerald-600"
                      : "text-destructive",
                  )}
                >
                  {testResult.success ? "连接成功" : "连接失败"}
                </div>
              </div>
            </div>
            <button
              onClick={() => setTestResult(null)}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <pre className="max-h-48 overflow-auto bg-muted/40 p-4 font-mono text-[11px] leading-relaxed">
            <span className="text-muted-foreground/70">$ </span>
            <span className="text-muted-foreground">
              ssh -T {testResult.host}
            </span>
            {"\n"}
            {testResult.message || "无输出"}
          </pre>
        </section>
      )}
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

function KeyAvatar({ type }: { type?: string }) {
  const gradient = useMemo(() => {
    const t = (type || "").toLowerCase();
    if (t.includes("ed25519"))
      return "from-violet-500 to-fuchsia-500";
    if (t.includes("rsa")) return "from-sky-500 to-blue-600";
    if (t.includes("ecdsa")) return "from-emerald-500 to-teal-600";
    return "from-slate-500 to-slate-700";
  }, [type]);

  return (
    <div className="relative shrink-0">
      <div
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br shadow-soft",
          gradient,
        )}
      >
        <KeyRound className="h-5 w-5 text-white" strokeWidth={2.4} />
      </div>
    </div>
  );
}

function TestHostButton({
  label,
  host,
  loading,
  onClick,
}: {
  label: string;
  host: string;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      disabled={loading}
      onClick={onClick}
      title={`测试 ${host}`}
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border bg-card px-2.5 py-1 text-[11px] font-medium transition-all",
        "hover:bg-accent hover:shadow-soft-sm disabled:opacity-50",
      )}
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Terminal className="h-3 w-3" strokeWidth={2.5} />
      )}
      {label}
    </button>
  );
}
