import { withGradleProperties, type ConfigPlugin } from "expo/config-plugins";

/**
 * Gradle daemon memory. Prebuild's default 2 GiB heap runs out on release builds now that the
 * Tangem SDK is compiled from source. Kept at 4 GiB: more just lets release lint and parallel
 * tasks eat the machine (the `apk` script skips release lint for that reason).
 */
const JVM_ARGS_KEY = "org.gradle.jvmargs";
const JVM_ARGS = "-Xmx4096m -XX:MaxMetaspaceSize=1024m";

const withGradleMemory: ConfigPlugin = (config) => {
  return withGradleProperties(config, (cfg) => {
    const others = cfg.modResults.filter((item) => !(item.type === "property" && item.key === JVM_ARGS_KEY));
    cfg.modResults = [...others, { type: "property", key: JVM_ARGS_KEY, value: JVM_ARGS }];
    return cfg;
  });
};

export default withGradleMemory;
