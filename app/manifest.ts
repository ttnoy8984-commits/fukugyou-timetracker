import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "時給ノート",
    short_name: "時給ノート",
    description: "副業の作業時間・報酬を管理するアプリ",
    start_url: "/",
    display: "standalone",
    background_color: "#fefaf8",
    theme_color: "#eb670e",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
