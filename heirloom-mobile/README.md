# heirloom-mobile

Android client. Expo 57, Tamagui, Expo Router. Slice 1: workspace + metro. Wallet, Kit, and NFC are later slices.

```bash
bun install          # from repo root
bun run dev:mobile
bun run android      # expo run:android. Needs ANDROID_HOME. JDK 17 or 21, not 25.
```

`android/` is generated and gitignored. `bun android` installs the Heirloom APK. Expo Go is a different app and will not show our splash. JDK 17 or 21. On JDK 25, CMake dies until you `export JAVA_TOOL_OPTIONS=--enable-native-access=ALL-UNNAMED`.
