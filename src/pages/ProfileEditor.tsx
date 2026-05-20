import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useProfileStore } from "@/store/profileStore";
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
        ssh: form.ssh && form.ssh.keyPath ? form.ssh : undefined,
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
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">
        {isEdit ? "编辑 Profile" : "新建 Profile"}
      </h1>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Section title="基本信息">
          <Field label="名称 *">
            <input
              required
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="如：公司账户"
            />
          </Field>
          <Field label="图标 (emoji)">
            <input
              className="input"
              value={form.icon ?? ""}
              onChange={(e) => setForm({ ...form, icon: e.target.value })}
              placeholder="🏢"
            />
          </Field>
        </Section>

        <Section title="Git 身份">
          <Field label="user.name *">
            <input
              required
              className="input"
              value={form.git.userName}
              onChange={(e) => setGit("userName", e.target.value)}
            />
          </Field>
          <Field label="user.email *">
            <input
              required
              type="email"
              className="input"
              value={form.git.userEmail}
              onChange={(e) => setGit("userEmail", e.target.value)}
            />
          </Field>
          <Field label="user.signingkey">
            <input
              className="input"
              value={form.git.signingKey ?? ""}
              onChange={(e) => setGit("signingKey", e.target.value)}
              placeholder="GPG keyId"
            />
          </Field>
          <Field label="commit.gpgsign">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!form.git.gpgSign}
                onChange={(e) => setGit("gpgSign", e.target.checked)}
              />
              启用 GPG 签名
            </label>
          </Field>
          <Field label="init.defaultBranch">
            <input
              className="input"
              value={form.git.defaultBranch ?? ""}
              onChange={(e) => setGit("defaultBranch", e.target.value)}
              placeholder="main"
            />
          </Field>
        </Section>

        <Section title="SSH（可选）">
          <Field label="私钥路径">
            <input
              className="input"
              value={form.ssh?.keyPath ?? ""}
              onChange={(e) => setSsh("keyPath", e.target.value)}
              placeholder="~/.ssh/id_ed25519_work"
            />
          </Field>
        </Section>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "保存中…" : "保存"}
          </button>
        </div>
      </form>

      <style>{`
        .input {
          width: 100%;
          border-radius: 0.375rem;
          border: 1px solid hsl(var(--border));
          background: hsl(var(--background));
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
        }
        .input:focus { border-color: hsl(var(--primary)); }
      `}</style>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="rounded-lg border bg-card p-4">
      <legend className="px-1 text-sm font-medium text-muted-foreground">
        {title}
      </legend>
      <div className="space-y-3">{children}</div>
    </fieldset>
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
