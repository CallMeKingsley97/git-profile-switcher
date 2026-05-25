import { invoke } from "@tauri-apps/api/core";
import type {
  BackupEntry,
  EnvScanReport,
  GitConfigSnapshot,
  Profile,
  ProfileDraft,
  SshKeyInfo,
  SshKeyType,
  SshTestResult,
  SwitchRecord,
  SwitchResult,
  SwitchScope,
  SystemIntegrationStatus,
} from "@/types";

export const api = {
  // first run
  isFirstRun: () => invoke<boolean>("is_first_run"),
  scanLocalGitEnvironment: () =>
    invoke<EnvScanReport>("scan_local_git_environment"),
  importAsProfile: (report: EnvScanReport, selections: ProfileDraft[]) =>
    invoke<Profile[]>("import_as_profile", { report, selections }),
  markFirstRunCompleted: () => invoke<void>("mark_first_run_completed"),

  // profile
  listProfiles: () => invoke<Profile[]>("list_profiles"),
  getProfile: (id: string) => invoke<Profile>("get_profile", { id }),
  createProfile: (profile: Profile) =>
    invoke<Profile>("create_profile", { profile }),
  updateProfile: (id: string, profile: Profile) =>
    invoke<Profile>("update_profile", { id, profile }),
  deleteProfile: (id: string) => invoke<void>("delete_profile", { id }),
  duplicateProfile: (id: string) =>
    invoke<Profile>("duplicate_profile", { id }),
  getActiveProfile: () => invoke<Profile | null>("get_active_profile"),

  // switch
  switchProfile: (id: string, scope: SwitchScope) =>
    invoke<SwitchResult>("switch_profile", { id, scope }),
  getCurrentGitConfig: (scope: SwitchScope) =>
    invoke<GitConfigSnapshot>("get_current_git_config", { scope }),

  // ssh
  listSshKeys: () => invoke<SshKeyInfo[]>("list_ssh_keys"),
  generateSshKey: (
    keyType: SshKeyType,
    fileName: string,
    comment: string,
    passphrase?: string,
  ) =>
    invoke<SshKeyInfo>("generate_ssh_key", {
      keyType,
      fileName,
      comment,
      passphrase,
    }),
  testSshConnection: (host: string) =>
    invoke<SshTestResult>("test_ssh_connection", { host }),
  readSshPublicKey: (path: string) =>
    invoke<string>("read_ssh_public_key", { path }),

  // system integration
  getSystemIntegrationStatus: () =>
    invoke<SystemIntegrationStatus>("get_system_integration_status"),
  setAutostart: (enabled: boolean) =>
    invoke<SystemIntegrationStatus>("set_autostart", { enabled }),
  setGlobalShortcut: (enabled: boolean) =>
    invoke<SystemIntegrationStatus>("set_global_shortcut", { enabled }),
  setTray: (enabled: boolean) =>
    invoke<SystemIntegrationStatus>("set_tray", { enabled }),
  setNotifications: (enabled: boolean) =>
    invoke<SystemIntegrationStatus>("set_notifications", { enabled }),
  showMainWindow: () => invoke<void>("show_main_window"),

  // backup / history
  listBackups: () => invoke<BackupEntry[]>("list_backups"),
  restoreBackup: (backupId: string) =>
    invoke<void>("restore_backup", { backupId }),
  listHistory: (limit?: number) =>
    invoke<SwitchRecord[]>("list_history", { limit }),
};
