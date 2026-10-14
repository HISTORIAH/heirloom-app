import type { Config } from "release-it";

/**
 * One release flow, two clusters: `bun release:mobile:devnet` or `bun release:mobile:mainnet`
 * set HEIRLOOM_CLUSTER. There is no default, so nobody ships a cluster by accident. Placeholders like "${version}" are
 * release-it's, filled at run time, so these are plain strings, never JS template literals.
 * See RELEASING.md for the why.
 */
type Cluster = "devnet" | "mainnet";

function clusterFromEnv(): Cluster {
  const value = process.env.HEIRLOOM_CLUSTER;
  if (value === "devnet" || value === "mainnet") return value;
  throw new Error("Run bun release:mobile:devnet or bun release:mobile:mainnet from the repo root.");
}

const cluster = clusterFromEnv();
const isMainnet = cluster === "mainnet";

const TAG = "mobile/v${version}";
/** Mainnet is the product, so its files and release carry no cluster name. */
const APK = isMainnet ? "heirloom-${version}.apk" : "heirloom-${version}-devnet.apk";
const ENV_FILE = ".env." + cluster;

const tagIsFree =
  "if git rev-parse -q --verify refs/tags/" + TAG + " >/dev/null || " +
  "git ls-remote --exit-code --tags origin refs/tags/" + TAG + " >/dev/null; " +
  "then echo '" + TAG + " already exists. Pick a higher version.'; exit 1; fi";

/** 1.0.0 is the mainnet launch: no 0.x mainnet builds. */
const mainnetIsOneOrLater =
  "case '${version}' in 0.*) echo 'Mainnet releases start at 1.0.0.'; exit 1;; esac";

const config: Config = {
  git: {
    requireBranch: "main",
    requireCleanWorkingDir: true,
    requireCommits: true,
    commitsPath: ".",
    commitMessage: "chore(mobile): release ${version}",
    tagName: TAG,
    tagMatch: "mobile/v*",
    tagAnnotation: "Heirloom Mobile ${version}",
    changelog: 'git log --pretty=format:"* %s (%h)" ${from}...${to} -- .',
  },
  npm: false,
  github: {
    release: true,
    releaseName: isMainnet ? "Heirloom Mobile ${version}" : "Heirloom Mobile ${version} (Devnet)",
    // Devnet builds are previews. Mainnet lands as a draft: the release candidate, tested on a
    // device and then published by hand (RELEASING.md), with the same APK going to the dApp Store.
    preRelease: !isMainnet,
    draft: isMainnet,
    assets: ["dist/*"],
  },
  plugins: {
    "@release-it/bumper": {
      in: { file: "app.json", path: "expo.version" },
      out: [
        { file: "app.json", path: "expo.version" },
        { file: "package.json", path: "version" },
      ],
    },
  },
  hooks: {
    "before:init": [
      "test -f " + ENV_FILE + " || { echo 'Missing mobile/" + ENV_FILE + " (see RELEASING.md)'; exit 1; }",
      "grep -q '^HEIRLOOM_RELEASE_STORE_FILE=' ~/.gradle/gradle.properties 2>/dev/null || " +
        "{ echo 'Release keystore not set in ~/.gradle/gradle.properties (see RELEASING.md)'; exit 1; }",
      "bun lint",
      "bun run test",
      "bunx tsc --noEmit -p .",
    ],
    "before:bump": [...(isMainnet ? [mainnetIsOneOrLater] : []), tagIsFree],
    "after:bump": [
      "rm -rf dist",
      "EXPO_NO_GIT_STATUS=1 bunx expo prebuild --platform android --clean --no-install",
      "HEIRLOOM_RELEASE_SIGNING=required bun apk:" + cluster,
      "mkdir -p dist && cp android/app/build/outputs/apk/release/app-release.apk dist/" + APK,
      "cd dist && sha256sum " + APK + " > " + APK + ".sha256",
    ],
  },
};

export default config;
