import { withAppBuildGradle, type ConfigPlugin } from "expo/config-plugins";

/**
 * Release APKs signed with our own keystore instead of prebuild's debug key. The keystore and its
 * passwords come from Gradle properties (~/.gradle/gradle.properties), never from the repo.
 * Without them, local release builds keep the debug key so anyone can still build a test APK;
 * HEIRLOOM_RELEASE_SIGNING=required (set by `release:mobile`) turns that into a hard failure.
 */
const MARKER = "// release-signing (plugins/with-release-signing)";

const SIGNING_BLOCK = `${MARKER}
def heirloomStoreFile = findProperty('HEIRLOOM_RELEASE_STORE_FILE')
if (heirloomStoreFile) {
    android.signingConfigs.create('release') {
        storeFile file(heirloomStoreFile)
        storePassword findProperty('HEIRLOOM_RELEASE_STORE_PASSWORD')
        keyAlias findProperty('HEIRLOOM_RELEASE_KEY_ALIAS')
        keyPassword findProperty('HEIRLOOM_RELEASE_KEY_PASSWORD')
    }
    android.buildTypes.release.signingConfig android.signingConfigs.release
} else if (System.getenv('HEIRLOOM_RELEASE_SIGNING') == 'required') {
    throw new GradleException('Release signing required: set HEIRLOOM_RELEASE_STORE_FILE and friends in ~/.gradle/gradle.properties (see mobile/RELEASING.md).')
}
`;

const withReleaseSigning: ConfigPlugin = (config) => {
  return withAppBuildGradle(config, (cfg) => {
    if (!cfg.modResults.contents.includes(MARKER)) {
      cfg.modResults.contents += `\n${SIGNING_BLOCK}`;
    }
    return cfg;
  });
};

export default withReleaseSigning;
