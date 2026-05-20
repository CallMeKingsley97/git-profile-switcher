import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/tauri";

export default function Settings() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">设置</h1>

      <section className="rounded-lg border bg-card p-4">
        <h2 className="mb-2 text-sm font-medium">首次启动向导</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          重新扫描本机配置并打开导入向导。
        </p>
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              navigate("/first-run");
            } finally {
              setBusy(false);
            }
          }}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
        >
          重新扫描
        </button>
      </section>

      <section className="rounded-lg border bg-card p-4">
        <h2 className="mb-2 text-sm font-medium">关于</h2>
        <p className="text-xs text-muted-foreground">
          Git Profile Switcher v0.1.0-alpha — Milestone 1 MVP
        </p>
      </section>
    </div>
  );
}
