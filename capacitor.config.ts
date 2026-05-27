import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Local iOS dev: WebView loads Next dev server (npm run dev).
 * Simulator: localhost. Physical device: set CAPACITOR_SERVER_URL to http://<LAN-IP>:3000
 */
const serverUrl =
  process.env.CAPACITOR_SERVER_URL ?? "http://192.168.0.102:3000";

const config: CapacitorConfig = {
  appId: "com.valgate.app",
  appName: "Valgate",
  webDir: "mobile/www",
  server: {
    url: serverUrl,
    cleartext: true,
  },
};

export default config;
