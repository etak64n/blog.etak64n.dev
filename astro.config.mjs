import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { d1, r2 } from "@emdash-cms/cloudflare";
import { defineConfig } from "astro/config";
import emdash from "emdash/astro";
import { aiImage } from "./src/plugins/ai-image/descriptor.mjs";

export default defineConfig({
	// Canonical URLs and link previews point here, whichever hostname served the page.
	site: "https://blog.etak64n.dev",
	output: "server",
	adapter: cloudflare(),
	image: {
		layout: "constrained",
		responsiveStyles: true,
	},
	integrations: [
		// The EmDash admin is a React app.
		react(),
		emdash({
			// Known at build time, so EmDash lets Astro resize its own media (/_emdash/api/media/file/…)
			// through the Cloudflare Images binding. Without it, pages show the uploaded originals.
			siteUrl: "https://blog.etak64n.dev",
			database: d1({ binding: "DB", session: "auto", coalesce: true }),
			storage: r2({ binding: "MEDIA" }),
			// Image fields with `widget: "ai-image:image"` can also draw images with Workers AI.
			plugins: [aiImage()],
		}),
	],
	devToolbar: { enabled: false },
});
