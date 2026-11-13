// Server side of the AI image plugin: two private routes the image field editor (admin.tsx) calls.
//
//   POST /_emdash/api/plugins/ai-image/scene  { subject } -> { scene }
//     A text model turns the subject (usually the post's Japanese title) into one English scene.
//   POST /_emdash/api/plugins/ai-image/draw   { scene }   -> { image }
//     The image model draws the scene; `image` is a base64 JPEG. The editor calls it once a candidate.
//
// Both only wait on Workers AI, so they stay within the Worker's CPU time. Saving a candidate is done
// by the browser through the media library's upload, which sends a small thumbnail with the image.

import { env } from "cloudflare:workers";
import { definePlugin, PluginRouteError } from "emdash";

/** Writes the scene. Not among the models Workers AI retires on 2026-11-20. */
const TEXT_MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8-fast";

/**
 * Draws the scene at 1024×1024. With IMAGE_STEPS steps an image costs 4 tiles × (4.8 + 9.6 × steps)
 * Neurons: 249.6 at 6 steps, against the account's 10,000 free Neurons a day.
 */
const IMAGE_MODEL = "@cf/black-forest-labs/flux-1-schnell";
const IMAGE_STEPS = 6;

/** The look of every image, after the scene. The model does not always keep to the "no" list. */
const STYLE =
	"flat vector illustration, solid flat colors, no gradients, simple geometric shapes, calm muted palette, " +
	"wide composition, no people, no faces, no hands, no arms, no characters, no text, no letters, no numbers, " +
	"no logos, no flags";

const SCENE_INSTRUCTIONS =
	"You write the subject for an illustration generator. Read the title of a technical blog post, " +
	"usually in Japanese, and describe one simple, concrete scene of objects or places that suggests " +
	"its topic. Write in English, under 20 words, as a noun phrase. Never include people, faces, hands, " +
	"characters, text, letters, numbers, screens with writing, logos or flags. Reply with the scene only.";

const MAX_SUBJECT = 200;
const MAX_SCENE = 300;

function readText(input: unknown, key: string, max: number): string {
	const value = input && typeof input === "object" ? (input as Record<string, unknown>)[key] : undefined;
	const text = typeof value === "string" ? value.trim() : "";
	if (!text) throw PluginRouteError.badRequest(`Please send a non-empty "${key}".`);
	return text.slice(0, max);
}

/** Workers AI failures, told in the editor's words. */
function aiError(error: unknown): PluginRouteError {
	const message = error instanceof Error ? error.message : String(error);
	if (/4006|daily free allocation|neurons/i.test(message)) {
		return new PluginRouteError(
			"AI_DAILY_LIMIT",
			"Workers AI の今日の無料枠（10,000 Neuron）を使い切りました。日本時間 9:00 に戻ります。",
			429,
		);
	}
	return new PluginRouteError("AI_FAILED", `Workers AI が失敗しました: ${message}`, 502);
}

export function createPlugin() {
	return definePlugin({
		id: "ai-image",
		version: "1.0.0",
		routes: {
			scene: {
				permission: "media:upload",
				handler: async (ctx) => {
					const subject = readText(ctx.input, "subject", MAX_SUBJECT);
					let result: { response?: string };
					try {
						result = (await env.AI.run(TEXT_MODEL, {
							messages: [
								{ role: "system", content: SCENE_INSTRUCTIONS },
								{ role: "user", content: subject },
							],
							max_tokens: 60,
							temperature: 0.7,
						})) as { response?: string };
					} catch (error) {
						throw aiError(error);
					}
					const scene = (result.response ?? "").trim().replace(/^["'“]+|["'”.]+$/g, "").slice(0, MAX_SCENE);
					if (!scene) throw new PluginRouteError("AI_EMPTY", "Workers AI が場面を書けませんでした。", 502);
					return { scene };
				},
			},
			draw: {
				permission: "media:upload",
				handler: async (ctx) => {
					const scene = readText(ctx.input, "scene", MAX_SCENE);
					let result: { image?: string };
					try {
						result = (await env.AI.run(IMAGE_MODEL, {
							prompt: `${scene}, ${STYLE}`,
							steps: IMAGE_STEPS,
						})) as { image?: string };
					} catch (error) {
						throw aiError(error);
					}
					if (!result.image) throw new PluginRouteError("AI_EMPTY", "Workers AI が画像を返しませんでした。", 502);
					return { image: result.image };
				},
			},
		},
		admin: {
			fieldWidgets: [{ name: "image", label: "AI image", fieldTypes: ["image"] }],
		},
	});
}
