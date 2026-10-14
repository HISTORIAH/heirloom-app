import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * app.json holds the config; this only adds what can't be static. `expo.version` is the one
 * version the release bumps, and Android's versionCode is derived from it so it always rises:
 * 0.2.0 → 200, 0.2.1 → 201, 1.0.0 → 10000.
 */
function versionCodeOf(version: string): number {
  // No pre-release suffixes: 0.3.0-rc.1 and 0.3.0 would share a versionCode.
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(`app.json version "${version}" must be plain MAJOR.MINOR.PATCH`);
  }
  const [major, minor, patch] = version.split(".").map(Number);
  if (minor >= 100 || patch >= 100) {
    throw new Error(`app.json version "${version}": minor and patch must stay below 100 for versionCode`);
  }
  return major * 10000 + minor * 100 + patch;
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const version = config.version ?? "0.0.0";
  return {
    ...config,
    name: config.name ?? "Heirloom",
    slug: config.slug ?? "mobile",
    android: { ...config.android, versionCode: versionCodeOf(version) },
  };
};
