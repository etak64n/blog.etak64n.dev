// Worker configuration that the Cloudflare CLI (cf) and @astrojs/cloudflare read.
//
// `cf deploy` runs `astro build` and uploads the result. The account comes
// from CLOUDFLARE_ACCOUNT_ID, which cf reads from the environment.

import { bindings, defineConfig } from "cf/config";

export default defineConfig({
	worker: {
		name: "blog-etak64n-dev",
		entrypoint: "./src/worker.ts",
		compatibilityDate: "2026-02-24",
		compatibilityFlags: ["nodejs_compat"],
		// Reachable on workers.dev only until the site moves to blog.etak64n.dev.
		domains: [],
		workersDev: true,
		previewUrls: false,
		// No cron trigger, so EmDash's scheduled publishing and its hourly cleanup
		// never run. The posts collection does not offer scheduling (seed/seed.json).
		env: {
			// The origin that setup records and that passkeys are bound to.
			EMDASH_SITE_URL: bindings.text("https://blog.etak64n.dev"),
			DB: bindings.d1({ name: "blog-etak64n-dev", id: "40a37fa8-4d9f-4d81-8a98-9250c81fb3a6" }),
			MEDIA: bindings.r2({ name: "blog-etak64n-dev-media" }),
			// Astro sessions: the sign-in state of the admin.
			SESSION: bindings.kv({ id: "91415a93c788472cbbe6873475d174b6" }),
			// Resizes media for the Image component and images in rich text.
			IMAGES: bindings.images(),
		},
	},
});
