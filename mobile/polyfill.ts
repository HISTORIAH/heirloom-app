import { install } from "react-native-quick-crypto";

install();

// Kit refuses crypto unless this is true. Native Android is a secure context.
Object.assign(globalThis, { isSecureContext: true });
