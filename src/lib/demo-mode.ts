/** Whether this installation is a demo: visits only, no real accounts. Set with DISTIL_DEMO=on. */
export function isDemoMode(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.DISTIL_DEMO === "on";
}

/** Whether the installation holds real accounts: always, unless it is a demo with sign-up closed. */
export function hasRealAccounts(env: NodeJS.ProcessEnv = process.env): boolean {
  return !isDemoMode(env) || env.DISTIL_SIGNUP === "open";
}

/** Where the source of this installation can be fetched; AGPL asks a network service to offer it. */
export function sourceUrl(env: NodeJS.ProcessEnv = process.env): string {
  return env.DISTIL_SOURCE_URL?.trim() || "https://github.com/Stylfan/distil";
}
