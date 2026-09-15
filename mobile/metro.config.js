const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "..");
const projectModules = path.resolve(projectRoot, "node_modules");

const config = getDefaultConfig(projectRoot);

// Bun keeps nested deps (Tamagui, Expo) inside node_modules/.bun. Hierarchical
// lookup is required to see those. Pin React so Metro does not walk into app/.
config.watchFolders = [projectRoot];
config.resolver.nodeModulesPaths = [
  projectModules,
  path.resolve(monorepoRoot, "node_modules"),
];
config.resolver.extraNodeModules = {
  react: path.resolve(projectModules, "react"),
  "react-dom": path.resolve(projectModules, "react-dom"),
  "react-native": path.resolve(projectModules, "react-native"),
  // Kit imports Node `crypto`. Route it to react-native-quick-crypto.
  crypto: require.resolve("react-native-quick-crypto"),
};
config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_conditionNames = ["react-native", "require", "default"];

module.exports = config;
