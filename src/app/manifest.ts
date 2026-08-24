import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Narciso Geronimo Jewelry Inventory",
    short_name: "NGJ Inventory",
    description: "Gold jewelry inventory and barcode scanner",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f4ec",
    theme_color: "#b68a31",
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}
