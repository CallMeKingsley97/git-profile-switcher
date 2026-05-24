import { useEffect, useMemo, useState } from "react";
import { KeyRound, Loader2, Plus, RefreshCw, Terminal } from "lucide-react";
import { api } from "@/lib/tauri";
import type { SshKeyInfo, SshKeyType, SshTestResult } from "@/types";

const keyTypes: SshKeyType[] = ["ed25519", "rsa", "ecdsa"];

export default function SshManager() {
  const [keys, setKeys] = useState<SshKeyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<SshTestResult | null>(null);
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
      await load();
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setGenerating(false);
    }
  };

  const handleTest = async (host: string) => {
    setTesting(host);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">SSH Keys</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            管理本机 SSH key 元信息，生成新 key，并测试 Host 连接。
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent"
        >
          <RefreshCw className="h-4 w-4" />
          刷新
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <section className="rounded-lg border bg-card p-4">
        <div className="mb-4 flex items-center gap-2">
          <Plus className="h-4 w-4 text-primary" />
          <h2 className="font-medium">生成 SSH Key</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Key 类型">
            <select
              className="input"
              value={form.keyType}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  keyType: e.target.value as SshKeyType,
                }))
              }
            >
              {keyTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </Field>
          <Field label="文件名">
            <input
              className="input"
              value={form.fileName}
              onChange={(e) =>
                setForm((current) => ({ ...current, fileName: e.target.value }))
              }
              placeholder="id_ed25519_work"
            />
          </Field>
          <Field label="Comment">
            <input
              className="input"
              value={form.comment}
              onChange={(e) =>
                setForm((current) => ({ ...current, comment: e.target.value }))
              }
              placeholder="git-profile-switcher"
            />
          </Field>
          <Field label="Passphrase（可选）">
            <input
              className="input"
              type="password"
              value={form.passphrase}
              onChange={(e) =>
                setForm((current) => ({ ...current, passphrase: e.target.value }))
              }
              placeholder="留空则不设置"
            />
          </Field>
        </div>
        <button
          disabled={generating || !form.fileName.trim()}
          onClick={handleGenerate}
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
        >
          {generating && <Loader2 className="h-4 w-4 animate-spin" />}
          生成 Key
        </button>
      </section>

      <section className="rounded-lg border bg-card">
        <div className="border-b px-4 py-3">
          <h2 className="font-medium">已发现的 SSH Keys</h2>
        </div>
        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">加载中…</div>
        ) : keys.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            未发现 SSH key。可以在上方生成一个。
          </div>
        ) : (
          <div className="divide-y">
            {keys.map((key) => (
              <div key={key.privatePath} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 font-medium">
                      <KeyRound className="h-4 w-4 text-primary" />
                      {key.name}
                    </div>
                    <div className="mt-1 truncate text-xs text-muted-foreground">
                      {key.privatePath}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {key.keyType && <Badge>{key.keyType}</Badge>}
                      {key.comment && <Badge>{key.comment}</Badge>}
                      {key.publicPath && <Badge>public key 已存在</Badge>}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      disabled={testing === "git@github.com"}
                      onClick={() => handleTest("git@github.com")}
                      className="rounded-md border px-3 py-1.5 text-xs hover:bg-accent disabled:opacity-50"
                    >
                      测试 GitHub
                    </button>
                    <button
                      disabled={testing === "git@gitee.com"}
                      onClick={() => handleTest("git@gitee.com")}
                      className="rounded-md border px-3 py-1.5 text-xs hover:bg-accent disabled:opacity-50"
                    >
                      测试 Gitee
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {testResult && (
        <section className="rounded-lg border bg-card p-4">
          <div className="mb-2 flex items-center gap-2 font-medium">
            <Terminal className="h-4 w-4 text-primary" />
            SSH 测试结果：{testResult.host}
          </div>
          <div
            className={
              testResult.success
                ? "text-sm text-green-600"
                : "text-sm text-destructive"
            }
          >
            {testResult.success ? "连接成功" : "连接失败"}
          </div>
          <pre className="mt-3 max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs">
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
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded bg-muted px-2 py-1">{children}</span>;
}
