// The site's AI image plugin, a native EmDash plugin registered in astro.config.mjs. It gives image
// fields an editor that, besides choosing from the media library, draws candidates with Workers AI.
// A field uses it with `widget: "ai-image:image"` in the schema.
import { fileURLToPath } from "node:url";

const here = (file) => fileURLToPath(new URL(file, import.meta.url));

export function aiImage() {
	return {
		id: "ai-image",
		version: "1.0.0",
		format: "native",
		entrypoint: here("./plugin.ts"),
		adminEntry: here("./admin.tsx"),
	};
}
