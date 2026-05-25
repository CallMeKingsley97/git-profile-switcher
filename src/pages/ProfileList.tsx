import { Link } from "react-router-dom";
import { Copy, KeyRound, Mail, Pencil, Plus, Trash2 } from "lucide-react";
import { useProfileStore } from "@/store/profileStore";
import { cn, formatDateTime } from "@/lib/utils";

export default function ProfileList() {
  const { profiles, activeProfile, remove, duplicate } = useProfileStore();

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确认删除 profile「${name}」？此操作不可撤销。`)) return;
    await remove(id);
  };

  return (
    <div className="space-y-6 fade-in">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">Profiles</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            管理所有 Git 身份，点击编辑或复制以快速创建相似的 profile。
          </p>
        </div>
        <Link to="/profiles/new" className="btn-primary">
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          新建 Profile
        </Link>
      </header>

      {profiles.length === 0 ? (
        <div className="surface-card flex flex-col items-center gap-3 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Plus className="h-6 w-6" />
          </span>
          <div className="space-y-1">
            <div className="text-sm font-medium">还没有任何 profile</div>
            <Link
              to="/profiles/new"
              className="text-xs text-primary hover:underline"
            >
              创建第一个 →
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {profiles.map((p) => {
            const active = activeProfile?.id === p.id;
            return (
              <article
                key={p.id}
                className={cn(
                  "surface-card group relative flex flex-col p-5 transition-all duration-200",
                  "hover:-translate-y-0.5 hover:shadow-soft-lg",
                  active && "ring-2 ring-emerald-500/40",
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-muted to-muted/40 text-2xl">
                    {p.icon || "👤"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-[15px] font-semibold tracking-tight">
                        {p.name}
                      </h3>
                      {active && (
                        <span className="badge-success !px-1.5 !text-[10px]">
                          ● 激活
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                      {p.git.userName}
                    </div>
                  </div>
                </div>

                <dl className="mt-4 space-y-2 text-[12px]">
                  <InfoRow
                    icon={<Mail className="h-3 w-3" />}
                    label="email"
                    value={p.git.userEmail}
                    mono
                  />
                  <InfoRow
                    icon={<KeyRound className="h-3 w-3" />}
                    label="ssh key"
                    value={p.ssh?.keyPath}
                    mono
                  />
                </dl>

                <div className="mt-4 flex items-center justify-between border-t pt-3">
                  <span className="text-[11px] text-muted-foreground">
                    {p.lastUsedAt ? formatDateTime(p.lastUsedAt) : "未使用"}
                  </span>
                  <div className="flex items-center gap-1">
                    <Link
                      to={`/profiles/${p.id}`}
                      className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      title="编辑"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                    <button
                      onClick={() => duplicate(p.id)}
                      className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      title="复制"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id, p.name)}
                      className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      title="删除"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        {icon}
      </span>
      <span className="text-muted-foreground/70">{label}</span>
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-right",
          mono && "font-mono text-[11px]",
          !value && "text-muted-foreground/60",
        )}
        title={value || undefined}
      >
        {value || "—"}
      </span>
    </div>
  );
}
