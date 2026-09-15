import { defaultConfig } from "@tamagui/config/v5";
import { createTamagui } from "tamagui";

export const tamaguiConfig = createTamagui(defaultConfig);

export default tamaguiConfig;

export type AppTamaguiConfig = typeof tamaguiConfig;

declare module "tamagui" {
  interface TamaguiCustomConfig extends AppTamaguiConfig {}
}
