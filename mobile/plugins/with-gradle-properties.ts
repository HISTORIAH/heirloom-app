import { withGradleProperties, type ConfigPlugin } from "expo/config-plugins";

/**
 * Gradle daemon memory. Prebuild's default 2 GiB heap runs out on release builds now that the
 * Tangem SDK is compiled from source, and 4 GiB still thrashed the GC on `assembleRelease`.
 * Kept at 6 GiB: more just lets release lint and parallel tasks eat the machine (the `apk`
 * script skips release lint for that reason).
 *
 * Build cache: releases run `prebuild --clean`, which wipes android/ and every compiled output in
 * it. The cache lives in ~/.gradle, so unchanged native modules are reused instead of rebuilt.
 */
const PROPERTIES: Record<string, string> = {
  "org.gradle.jvmargs": "-Xmx6144m -XX:MaxMetaspaceSize=1024m",
  "org.gradle.caching": "true",
};

const withBuildProperties: ConfigPlugin = (config) => {
  return withGradleProperties(config, (cfg) => {
    const others = cfg.modResults.filter((item) => !(item.type === "property" && item.key in PROPERTIES));
    const ours = Object.entries(PROPERTIES).map(([key, value]) => ({ type: "property" as const, key, value }));
    cfg.modResults = [...others, ...ours];
    return cfg;
  });
};

export default withBuildProperties;
