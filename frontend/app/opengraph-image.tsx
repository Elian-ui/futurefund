import { ImageResponse } from "next/og";

export const alt = "FutureFund high-yield ROI investment platform";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#04100B",
          color: "#EAFBF2",
          padding: "72px",
          fontFamily: "Arial, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 22% 18%, rgba(22, 199, 132, 0.26), transparent 30%), radial-gradient(circle at 78% 24%, rgba(245, 184, 75, 0.18), transparent 28%), linear-gradient(135deg, rgba(22, 199, 132, 0.08), rgba(4, 16, 11, 0))",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 24,
              background: "#062117",
              border: "2px solid rgba(22, 199, 132, 0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 18px 60px rgba(22, 199, 132, 0.16)",
            }}
          >
            <svg width="62" height="62" viewBox="0 0 64 64" fill="none">
              <path
                d="M16 44L27 33L35 41L49 20"
                stroke="#16C784"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M38 20H49V31"
                stroke="#F5B84B"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M15 49H51"
                stroke="#EAFBF2"
                strokeWidth="4"
                strokeLinecap="round"
                opacity=".82"
              />
            </svg>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 54, fontWeight: 900, letterSpacing: 0 }}>
              Future<span style={{ color: "#16C784" }}>Fund</span>
            </div>
            <div style={{ fontSize: 22, color: "rgba(234, 251, 242, 0.64)" }}>
              Structured ROI investment platform
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              fontSize: 76,
              lineHeight: 0.98,
              fontWeight: 900,
              maxWidth: 900,
              letterSpacing: 0,
            }}
          >
            Secure compound yields with daily, weekly, and monthly plans.
          </div>
          <div style={{ display: "flex", gap: 18 }}>
            {["Admin-managed plans", "Mobile money deposits", "Automated payouts"].map((item) => (
              <div
                key={item}
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: "#EAFBF2",
                  border: "1px solid rgba(22, 199, 132, 0.34)",
                  background: "rgba(6, 33, 23, 0.72)",
                  borderRadius: 18,
                  padding: "14px 20px",
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
