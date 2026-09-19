import {
  AndroidConfig,
  withAndroidStyles,
  type ConfigPlugin,
} from "expo/config-plugins";

const STYLE = "Theme.App.SplashScreen";
const ITEM = "windowSplashScreenIconBackgroundColor";

const withSplashIconBackground: ConfigPlugin = (config) => {
  return withAndroidStyles(config, (cfg) => {
    const styles = cfg.modResults.resources.style ?? [];
    for (const style of styles) {
      if (style.$.name !== STYLE) continue;
      const items = (style.item ?? []).filter((entry) => entry.$.name !== ITEM);
      items.push(
        AndroidConfig.Resources.buildResourceItem({
          name: ITEM,
          value: "@color/splashscreen_background",
        }),
      );
      style.item = items;
    }
    return cfg;
  });
};

export default withSplashIconBackground;
