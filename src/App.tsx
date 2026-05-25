import { useEffect, useState } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import Dashboard from "@/pages/Dashboard";
import ProfileList from "@/pages/ProfileList";
import ProfileEditor from "@/pages/ProfileEditor";
import FirstRunWizard from "@/pages/FirstRunWizard";
import History from "@/pages/History";
import Settings from "@/pages/Settings";
import SshManager from "@/pages/SshManager";
import { api } from "@/lib/tauri";
import { useProfileStore } from "@/store/profileStore";

export default function App() {
  const [booted, setBooted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refresh = useProfileStore((s) => s.refresh);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const firstRun = await api.isFirstRun();
        await refresh();
        if (firstRun) navigate("/first-run", { replace: true });
        setBooted(true);
      } catch (e: any) {
        setError(String(e?.message ?? e));
        setBooted(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!booted) {
    return (
      <div className="flex h-screen items-center justify-center gap-3 text-muted-foreground">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
        <span className="text-sm">启动中…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center p-8">
        <div className="surface-card-elevated max-w-md p-6 text-center">
          <div className="mb-3 text-sm font-medium text-destructive">
            启动失败
          </div>
          <div className="text-xs text-muted-foreground">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <main className="relative flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/profiles" element={<ProfileList />} />
            <Route path="/profiles/new" element={<ProfileEditor />} />
            <Route path="/profiles/:id" element={<ProfileEditor />} />
            <Route path="/first-run" element={<FirstRunWizard />} />
            <Route path="/history" element={<History />} />
            <Route path="/ssh" element={<SshManager />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
