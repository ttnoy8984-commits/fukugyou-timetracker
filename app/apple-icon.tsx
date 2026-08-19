import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#EB670E",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="112" height="112" viewBox="0 0 32 32">
          <circle cx="16" cy="18" r="9" fill="none" stroke="#ffffff" strokeWidth="2.6" />
          <path d="M16 13v5l4 2.5" fill="none" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M13 6h6" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M23 8.5 24.6 6.9" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
