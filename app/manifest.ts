import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Personal Workspace",
    short_name: "Personal Workspace",
    description: "나를 만들어가는 공간",
    start_url: "/",
    display: "standalone",
    background_color: "#1c1c21",
    theme_color: "#1c1c21",
    icons: [
      { src: "/mascot.png", sizes: "128x128", type: "image/png" },
    ],
  };
}
