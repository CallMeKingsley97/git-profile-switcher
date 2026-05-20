import { useEffect, useState } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import Dashboard from "@/pages/Dashboard";
import ProfileList from "@/pages/ProfileList";
import ProfileEditor from "@/pages/ProfileEditor";
import FirstRunWizard from "@/pages/FirstRunWizard";
import History from "@/pages/History";
import Settings from "@/pages/Settings";
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
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        启动中…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center text-destructive">
        启动失败：{error}
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/profiles" element={<ProfileList />} />
          <Route path="/profiles/new" element={<ProfileEditor />} />
          <Route path="/profiles/:id" element={<ProfileEditor />} />
          <Route path="/first-run" element={<FirstRunWizard />} />
          <Route path="/history" element={<History />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}
