import { withSettingsGradle, type ConfigPlugin } from "expo/config-plugins";

/**
 * Adds Tangem's SDK, built from the pinned source in modules/tangem-card/vendor (downloaded by
 * android/sdk/vendor.gradle), as two Gradle subprojects. The tangem-card module depends on them;
 * autolinking only includes the module itself.
 */
const SDK_DIR = "../modules/tangem-card/android/sdk";
const SUBPROJECTS = ["tangem-sdk-core", "tangem-sdk-android"] as const;
const PROJECT_DIRS: Record<(typeof SUBPROJECTS)[number], string> = {
  "tangem-sdk-core": `${SDK_DIR}/core`,
  "tangem-sdk-android": `${SDK_DIR}/android`,
};
const MARKER = "// tangem-sdk (plugins/with-tangem-sdk)";

function includeLines(): string {
  const lines = SUBPROJECTS.flatMap((name) => [
    `include ':${name}'`,
    `project(':${name}').projectDir = new File(rootDir, '${PROJECT_DIRS[name]}')`,
  ]);
  return [MARKER, ...lines].join("\n");
}

const withTangemSdk: ConfigPlugin = (config) => {
  return withSettingsGradle(config, (cfg) => {
    if (!cfg.modResults.contents.includes(MARKER)) {
      cfg.modResults.contents += `\n${includeLines()}\n`;
    }
    return cfg;
  });
};

export default withTangemSdk;
