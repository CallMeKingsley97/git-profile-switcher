export interface GitIdentity {
  userName: string;
  userEmail: string;
  signingKey?: string;
  gpgSign?: boolean;
  defaultBranch?: string;
  customConfig?: Record<string, string>;
}

export interface SshConfig {
  keyPath: string;
  hostAlias?: string;
  realHost?: string;
  port?: number;
}

export type Scope = "global" | "directory";

export interface Profile {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  git: GitIdentity;
  ssh?: SshConfig;
  scope: Scope;
  directories?: string[];
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
}

export interface GitConfigSnapshot {
  userName?: string;
  userEmail?: string;
  signingKey?: string;
  gpgSign?: boolean;
  defaultBranch?: string;
  raw: Record<string, string>;
}

export interface SshKeyInfo {
  name: string;
  privatePath: string;
  publicPath?: string;
  publicFingerprint?: string;
  keyType?: string;
  comment?: string;
}

export interface SshTestResult {
  host: string;
  keyPath: string;
  success: boolean;
  message: string;
}

export type SshKeyType = "ed25519" | "rsa" | "ecdsa";

export interface SshHostEntry {
  host: string;
  hostName?: string;
  user?: string;
  identityFile?: string;
  port?: number;
}

export interface GpgKeyInfo {
  keyId: string;
  uid?: string;
  expires?: string;
}

export interface DiscoveredIdentity {
  source: string;
  userName?: string;
  userEmail?: string;
  directory?: string;
}

export interface EnvScanReport {
  globalGitConfig: GitConfigSnapshot;
  sshKeys: SshKeyInfo[];
  sshConfigHosts: SshHostEntry[];
  gpgKeys: GpgKeyInfo[];
  discoveredIdentities: DiscoveredIdentity[];
  scannedAt: string;
}

export interface ProfileDraft {
  name: string;
  git: GitIdentity;
  sshKeyPath?: string;
  makeActive: boolean;
}

export type SwitchScope =
  | { type: "Global" }
  | { type: "Local"; path: string };

export interface SwitchResult {
  profileId: string;
  scope: string;
  backupId?: string;
  sshBackupId?: string;
  appliedKeys: string[];
}

export interface SwitchRecord {
  id: string;
  profileId: string;
  profileName: string;
  scope: string;
  targetPath?: string;
  timestamp: string;
  success: boolean;
  errorMessage?: string;
}

export interface BackupEntry {
  id: string;
  kind: string;
  path: string;
  createdAt: string;
}

export interface SystemIntegrationStatus {
  autostartEnabled: boolean;
  globalShortcutEnabled: boolean;
  trayEnabled: boolean;
  notificationsEnabled: boolean;
}
