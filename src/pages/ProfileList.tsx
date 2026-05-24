import { Link } from "react-router-dom";
import { Copy, Trash2, Pencil } from "lucide-react";
import { useProfileStore } from "@/store/profileStore";
import { formatDateTime } from "@/lib/utils";

export default function ProfileList() {
  const { profiles, activeProfile, remove, duplicate } = useProfileStore();

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确认删除 profile「${name}」？此操作不可撤销。`)) return;
    await remove(id);
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Profiles</h1>
        <Link
          to="/profiles/new"
          className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90"
        >
          + 新建 Profile
        </Link>
      </header>

      {profiles.length === 0 ? (
        <div className="rounded-md border border-dashed p-12 text-center text-sm text-muted-foreground">
          还没有任何 profile。
          <Link to="/profiles/new" className="ml-1 text-primary hover:underline">
            创建第一个
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2">名称</th>
                <th className="px-4 py-2">user.name</th>
                <th className="px-4 py-2">user.email</th>
                <th className="px-4 py-2">SSH key</th>
                <th className="px-4 py-2 whitespace-nowrap">最近使用</th>
                <th className="sticky right-0 bg-muted/50 px-4 py-2 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="px-4 py-2 font-medium whitespace-nowrap">
                    {activeProfile?.id === p.id && (
                      <span className="mr-1 text-emerald-600">●</span>
                    )}
                    {p.icon ? `${p.icon} ` : ""}
                    {p.name}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">
                    {p.git.userName}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">
                    {p.git.userEmail}
                  </td>
                  <td
                    className="max-w-[220px] truncate px-4 py-2 font-mono text-xs"
                    title={p.ssh?.keyPath ?? ""}
                  >
                    {p.ssh?.keyPath ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">
                    {formatDateTime(p.lastUsedAt)}
                  </td>
                  <td className="sticky right-0 bg-background px-4 py-2">
                    <div className="flex justify-end gap-1">
                      <Link
                        to={`/profiles/${p.id}`}
                        className="rounded p-1.5 hover:bg-accent"
                        title="编辑"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        onClick={() => duplicate(p.id)}
                        className="rounded p-1.5 hover:bg-accent"
                        title="复制"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id, p.name)}
                        className="rounded p-1.5 text-destructive hover:bg-destructive/10"
                        title="删除"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
