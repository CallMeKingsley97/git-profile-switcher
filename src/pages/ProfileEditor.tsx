import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  GitBranch,
  KeyRound,
  Loader2,
  Save,
  Shield,
  Sparkles,
  User,
  XCircle,
} from "lucide-react";
import { useProfileStore } from "@/store/profileStore";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types";

const emptyProfile = (): Profile => ({
  id: "",
  name: "",
  icon: "",
  git: {
    userName: "",
    userEmail: "",
    signingKey: "",
    gpgSign: false,
    defaultBranch: "",
  },
  ssh: { keyPath: "" },
  scope: "global",
  directories: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const emojiSuggestions = ["🏢", "🏠", "💼", "🎓", "🚀", "🧪", "👤", "💻"];

export default function ProfileEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profiles, create, update } = useProfileStore();
  const [form, setForm] = useState<Profile>(emptyProfile());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!id;

  useEffect(() => {
    if (id) {
      const found = profiles.find((p) => p.id === id);
      if (found) {
        setForm({
          ...found,
          ssh: found.ssh ?? { keyPath: "" },
          git: { ...found.git, signingKey: found.git.signingKey ?? "" },
        });
      }
    }
  }, [id, profiles]);

  const setGit = (k: keyof Profile["git"], v: unknown) =>
    setForm((f) => ({ ...f, git: { ...f.git, [k]: v } }));

  const setSsh = (k: string, v: unknown) =>
    setForm((f) => ({ ...f, ssh: { ...(f.ssh ?? { keyPath: "" }), [k]: v } }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: Profile = {
        ...form,
        ssh:
          form.ssh && form.ssh.keyPath
            ? {
                ...form.ssh,
                hostAlias: form.ssh.hostAlias || undefined,
                realHost: form.ssh.realHost || undefined,
              }
            : undefined,
      };
      if (isEdit && id) {
        await update(id, payload);
      } else {
        await create(payload);
      }
      navigate("/profiles");
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 fade-in">
      <header className="space-y-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          返回
        </button>
        <h1 className="text-[28px] font-semibold tracking-tight">
          {isEdit ? "编辑 Profile" : "新建 Profile"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isEdit
            ? "更新此身份的 Git 与 SSH 配置。"
            : "为新的 Git 身份配置完整信息。"}
        </p>
      </header>

      {error && (
        <div className="surface-card flex items-start gap-2 border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Section
          icon={<User className="h-4 w-4" />}
          title="基本信息"
          description="profile 的展示名称和图标"
        >
          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <Field label="名称" required>
              <input
                required
                className="field-input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="如：公司账户"
              />
            </Field>
            <Field label="图标">
              <div className="flex gap-2">
                <input
                  className="field-input w-20 text-center text-lg"
                  value={form.icon ?? ""}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  placeholder="🏢"
                />
              </div>
            </Field>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {emojiSuggestions.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setForm({ ...form, icon: emoji })}
                className={cn(
                  "rounded-lg border bg-card p-1.5 text-base transition-all hover:scale-110 hover:bg-accent",
                  form.icon === emoji && "border-primary/60 bg-primary/5",
                )}
              >
                {emoji}
              </button>
            ))}
          </div>
        </Section>

        <Section
          icon={<GitBranch className="h-4 w-4" />}
          title="Git 身份"
          description="user.name / user.email 等核心信息"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="user.name" required>
              <input
                required
                className="field-input font-mono text-[13px]"
                value={form.git.userName}
                onChange={(e) => setGit("userName", e.target.value)}
              />
            </Field>
            <Field label="user.email" required>
              <input
                required
                type="email"
                className="field-input font-mono text-[13px]"
                value={form.git.userEmail}
                onChange={(e) => setGit("userEmail", e.target.value)}
              />
            </Field>
            <Field label="user.signingkey">
              <input
                className="field-input font-mono text-[13px]"
                value={form.git.signingKey ?? ""}
                onChange={(e) => setGit("signingKey", e.target.value)}
                placeholder="GPG keyId"
              />
            </Field>
            <Field label="init.defaultBranch">
              <input
                className="field-input font-mono text-[13px]"
                value={form.git.defaultBranch ?? ""}
                onChange={(e) => setGit("defaultBranch", e.target.value)}
                placeholder="main"
              />
            </Field>
          </div>
          <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-accent/30">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="text-[13px] font-medium">启用 GPG 签名</div>
              <div className="text-[11px] text-muted-foreground">
                提交时使用 signing key 签名
              </div>
            </div>
            <button
              type="button"
              onClick={() => setGit("gpgSign", !form.git.gpgSign)}
              className="ios-toggle"
              data-state={form.git.gpgSign ? "on" : "off"}
              aria-pressed={!!form.git.gpgSign}
            />
          </label>
        </Section>

        <Section
          icon={<KeyRound className="h-4 w-4" />}
          title="SSH 配置"
          description="可选：仅切换 Git 配置无需 SSH"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="私钥路径" className="md:col-span-2">
              <input
                className="field-input font-mono text-[13px]"
                value={form.ssh?.keyPath ?? ""}
                onChange={(e) => setSsh("keyPath", e.target.value)}
                placeholder="~/.ssh/id_ed25519_work"
              />
            </Field>
            <Field label="Host 别名">
              <input
                className="field-input font-mono text-[13px]"
                value={form.ssh?.hostAlias ?? ""}
                onChange={(e) => setSsh("hostAlias", e.target.value)}
                placeholder="github.com"
              />
            </Field>
            <Field label="真实 HostName">
              <input
                className="field-input font-mono text-[13px]"
                value={form.ssh?.realHost ?? ""}
                onChange={(e) => setSsh("realHost", e.target.value)}
                placeholder="github.com"
              />
            </Field>
            <Field label="端口">
              <input
                className="field-input font-mono text-[13px]"
                type="number"
                min="1"
                max="65535"
                value={form.ssh?.port ?? ""}
                onChange={(e) =>
                  setSsh(
                    "port",
                    e.target.value ? Number(e.target.value) : undefined,
                  )
                }
                placeholder="22"
              />
            </Field>
          </div>
        </Section>

        <div className="sticky bottom-0 -mx-8 flex justify-end gap-2 border-t border-border/60 bg-background/85 px-8 py-4 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-ghost"
          >
            取消
          </button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isEdit ? (
              <Save className="h-4 w-4" strokeWidth={2.5} />
            ) : (
              <Sparkles className="h-4 w-4" strokeWidth={2.5} />
            )}
            {saving ? "保存中…" : isEdit ? "保存" : "创建"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Section({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="surface-card overflow-hidden">
      <header className="flex items-center gap-2.5 border-b bg-gradient-to-br from-muted/20 to-transparent px-5 py-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-card text-muted-foreground shadow-soft-sm">
          {icon}
        </span>
        <div>
          <div className="text-[13px] font-semibold tracking-tight">
            {title}
          </div>
          {description && (
            <div className="text-[11px] text-muted-foreground">
              {description}
            </div>
          )}
        </div>
      </header>
      <div className="space-y-4 p-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  required,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="field-label">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </span>
      {children}
    </label>
  );
}
