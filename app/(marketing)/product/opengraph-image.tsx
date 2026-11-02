import { ImageResponse } from "next/og";

/* Social share card, generated from code. satori's bundled sans renders here —
   Geist is woff2-only and satori needs TTF/OTF; close enough for a share card. */

export const contentType = "image/png";
export const size = { width: 1280, height: 630 };
export const alt = "Valgate — property, protected: the web app and iOS app in one portfolio";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(180deg,#eff6ff 0%,#ffffff 45%,#f5f5f5 100%)",
          color: "#262626",
        }}
      >
        <div style={{ display: "flex", letterSpacing: -1.5, fontSize: 84, fontWeight: 700, color: "#1a5bff" }}>
          Valgate
        </div>
        <div style={{ marginTop: 14, fontSize: 40, letterSpacing: -0.5 }}>
          Property, protected. One portfolio — web app + iOS.
        </div>
        <div style={{ marginTop: 22, fontSize: 26, color: "#7b7b85" }}>
          Documents · Boundaries · Risks · Succession
        </div>
        <div style={{ marginTop: 40, display: "flex", gap: 14 }}>
          <div style={{ display: "flex", padding: "14px 30px", borderRadius: 999, background: "#1a5bff", color: "#fff", fontSize: 26 }}>
            Open the web app
          </div>
          <div style={{ display: "flex", padding: "14px 30px", borderRadius: 999, background: "#101014", color: "#fff", fontSize: 26 }}>
            Get it on iOS
          </div>
        </div>
        <div style={{ position: "absolute", bottom: 34, fontSize: 22, color: "#9a9aa2" }}>app.getvalgate.com</div>
      </div>
    ),
    size
  );
}
