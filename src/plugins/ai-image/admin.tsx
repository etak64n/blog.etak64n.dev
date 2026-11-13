// Admin side of the AI image plugin: the editor of an image field that uses `widget: "ai-image:image"`.
//
// Top: the current image, with buttons to choose another from the media library or to remove it.
// Below: a subject (the entry's title to start with) and a button that draws CANDIDATES images with
// Workers AI through the plugin's routes (plugin.ts). Choosing a candidate uploads it to the media
// library and puts it in the field; the entry is saved as usual. Colors come from the admin's own
// variables, so the editor follows its light and dark themes.

import { MediaPickerModal, uploadMedia, type MediaItem } from "@emdash-cms/admin";
import { useEffect, useState, type CSSProperties } from "react";

/** The value EmDash keeps in an image field, as its own image field editor writes it. */
interface ImageValue {
	id: string;
	provider: string;
	src?: string;
	previewUrl?: string;
	alt: string;
	caption?: string;
	width?: number;
	height?: number;
	filename?: string;
	mimeType?: string;
	blurhash?: string;
	dominantColor?: string;
	meta?: Record<string, unknown>;
}

interface FieldProps {
	value: unknown;
	onChange: (value: ImageValue | null) => void;
	label: string;
	id: string;
}

type Candidate = { state: "drawing" } | { state: "ready"; image: string } | { state: "failed" };

const CANDIDATES = 4;
/** The id of the title field in the entry editor; its value starts the subject. */
const TITLE_FIELD_ID = "field-title";
const RADIUS = 6;
/** The shape the site's cards crop images to, so candidates show as they will appear there. */
const CARD_RATIO = "1200 / 630";

const styles = {
	field: { display: "grid", gap: 8 },
	label: { fontSize: 14, fontWeight: 500, color: "var(--text-color-kumo-default)" },
	box: {
		display: "grid",
		gap: 10,
		padding: 10,
		border: "1px solid var(--color-kumo-line)",
		borderRadius: RADIUS,
		background: "var(--color-kumo-base)",
	},
	current: { display: "flex", gap: 12, alignItems: "center" },
	currentImage: { width: 200, aspectRatio: CARD_RATIO, objectFit: "cover", borderRadius: RADIUS, display: "block" },
	name: { fontSize: 14, color: "var(--text-color-kumo-default)", wordBreak: "break-all" },
	subtle: { fontSize: 12, color: "var(--text-color-kumo-subtle)" },
	row: { display: "flex", gap: 8, alignItems: "center" },
	heading: { fontSize: 13, fontWeight: 500, color: "var(--text-color-kumo-default)" },
	input: {
		flex: 1,
		minWidth: 0,
		height: 30,
		padding: "0 10px",
		fontSize: 13,
		color: "var(--text-color-kumo-default)",
		background: "var(--color-kumo-control)",
		border: "1px solid var(--color-kumo-line)",
		borderRadius: RADIUS,
	},
	button: {
		height: 30,
		padding: "0 12px",
		fontSize: 12,
		fontWeight: 500,
		whiteSpace: "nowrap",
		color: "var(--text-color-kumo-default)",
		background: "var(--color-kumo-base)",
		border: "1px solid var(--color-kumo-line)",
		borderRadius: RADIUS,
		cursor: "pointer",
	},
	primary: {
		color: "#fff",
		background: "var(--color-kumo-brand)",
		borderColor: "var(--color-kumo-brand)",
	},
	grid: { display: "grid", gridTemplateColumns: `repeat(${CANDIDATES}, minmax(0, 1fr))`, gap: 8 },
	candidate: {
		position: "relative",
		padding: 0,
		aspectRatio: CARD_RATIO,
		overflow: "hidden",
		border: "1px solid var(--color-kumo-line)",
		borderRadius: RADIUS,
		background: "var(--color-kumo-fill)",
		cursor: "pointer",
	},
	candidateImage: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
	candidateNote: {
		position: "absolute",
		inset: 0,
		display: "grid",
		placeItems: "center",
		fontSize: 12,
		color: "var(--text-color-kumo-subtle)",
	},
	saving: { background: "var(--color-kumo-base)", opacity: 0.85 },
	error: { fontSize: 12, color: "var(--text-color-kumo-danger)" },
} satisfies Record<string, CSSProperties>;

function isImageValue(value: unknown): value is ImageValue {
	return Boolean(value) && typeof value === "object" && typeof (value as ImageValue).id === "string";
}

/** As the admin's image field turns a media library item into the field's value. */
function toValue(item: MediaItem): ImageValue {
	const local = !item.provider || item.provider === "local";
	return {
		id: item.id,
		provider: local ? "local" : (item.provider as string),
		previewUrl: local ? undefined : item.url,
		alt: item.alt ?? "",
		caption: item.caption,
		width: item.width,
		height: item.height,
		filename: item.filename,
		mimeType: item.mimeType,
		blurhash: item.blurhash,
		dominantColor: item.dominantColor,
		meta: local ? { ...item.meta, storageKey: item.storageKey } : item.meta,
	};
}

function previewOf(value: ImageValue): string {
	if (value.src) return value.src;
	if (value.previewUrl) return value.previewUrl;
	const key = value.meta?.storageKey;
	return typeof key === "string" ? `/_emdash/api/media/file/${key}` : "";
}

/** Calls a route of the plugin and returns its data; throws with the route's message on failure. */
async function callRoute<T>(route: "scene" | "draw", body: Record<string, string>): Promise<T> {
	const response = await fetch(`/_emdash/api/plugins/ai-image/${route}`, {
		method: "POST",
		credentials: "same-origin",
		headers: { "Content-Type": "application/json", "X-EmDash-Request": "1" },
		body: JSON.stringify(body),
	});
	const payload = (await response.json().catch(() => null)) as
		| { data?: T; error?: { message?: string } }
		| null;
	if (!response.ok || !payload?.data) throw new Error(payload?.error?.message ?? `HTTP ${response.status}`);
	return payload.data;
}

function toJpegFile(base64: string): File {
	const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
	return new File([bytes], `ai-${Date.now()}.jpg`, { type: "image/jpeg" });
}

function AiImageField({ value, onChange, label, id }: FieldProps) {
	const image = isImageValue(value) ? value : null;
	const [pickerOpen, setPickerOpen] = useState(false);
	const [subject, setSubject] = useState("");
	const [candidates, setCandidates] = useState<Candidate[]>([]);
	const [drawing, setDrawing] = useState(false);
	const [saving, setSaving] = useState<number | null>(null);
	const [error, setError] = useState("");

	/** Starts an empty subject with the entry's title, when the editor shows it. */
	function fillFromTitle() {
		const title = document.getElementById(TITLE_FIELD_ID);
		if (title instanceof HTMLInputElement && title.value) setSubject((current) => current || title.value);
	}
	useEffect(fillFromTitle, []);

	async function draw() {
		setDrawing(true);
		setError("");
		setCandidates(Array.from({ length: CANDIDATES }, (): Candidate => ({ state: "drawing" })));
		try {
			const { scene } = await callRoute<{ scene: string }>("scene", { subject });
			await Promise.all(
				Array.from({ length: CANDIDATES }, async (_, index) => {
					let next: Candidate;
					try {
						const { image: drawn } = await callRoute<{ image: string }>("draw", { scene });
						next = { state: "ready", image: drawn };
					} catch (cause) {
						next = { state: "failed" };
						setError(cause instanceof Error ? cause.message : String(cause));
					}
					setCandidates((current) => current.map((candidate, i) => (i === index ? next : candidate)));
				}),
			);
		} catch (cause) {
			setCandidates([]);
			setError(cause instanceof Error ? cause.message : String(cause));
		} finally {
			setDrawing(false);
		}
	}

	async function choose(index: number) {
		const candidate = candidates[index];
		if (candidate?.state !== "ready") return;
		setSaving(index);
		setError("");
		try {
			onChange(toValue(await uploadMedia(toJpegFile(candidate.image))));
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : String(cause));
		} finally {
			setSaving(null);
		}
	}

	return (
		<div style={styles.field}>
			<div style={styles.label}>{label}</div>
			<div style={styles.box}>
				<div style={styles.current}>
					{image && <img src={previewOf(image)} alt="" style={styles.currentImage} />}
					<div style={{ display: "grid", gap: 6, minWidth: 0 }}>
						{image && (
							<div>
								<div style={styles.name}>{image.filename}</div>
								{image.width && image.height && (
									<div style={styles.subtle}>
										{image.width} × {image.height}
									</div>
								)}
							</div>
						)}
						<div style={styles.row}>
							<button type="button" style={styles.button} onClick={() => setPickerOpen(true)}>
								ライブラリから選ぶ
							</button>
							{image && (
								<button type="button" style={styles.button} onClick={() => onChange(null)}>
									外す
								</button>
							)}
						</div>
					</div>
				</div>
			</div>
			<div style={styles.box}>
				<div style={styles.heading}>AI で描く</div>
				<div style={styles.row}>
					<input
						id={id}
						type="text"
						value={subject}
						onChange={(event) => setSubject(event.target.value)}
						onFocus={fillFromTitle}
						placeholder="題材"
						aria-label="描く題材"
						style={styles.input}
					/>
					<button
						type="button"
						style={{ ...styles.button, ...styles.primary, opacity: drawing || !subject.trim() ? 0.6 : 1 }}
						disabled={drawing || !subject.trim()}
						onClick={draw}
					>
						{drawing ? "描いています…" : `${CANDIDATES} 枚描く`}
					</button>
				</div>
				{candidates.length > 0 && (
					<div style={styles.grid}>
						{candidates.map((candidate, index) => (
							<button
								key={index}
								type="button"
								style={styles.candidate}
								disabled={candidate.state !== "ready" || saving !== null}
								onClick={() => choose(index)}
								aria-label="この画像にする"
							>
								{candidate.state === "ready" && (
									<img src={`data:image/jpeg;base64,${candidate.image}`} alt="" style={styles.candidateImage} />
								)}
								{candidate.state === "drawing" && <span style={styles.candidateNote}>描いています…</span>}
								{candidate.state === "failed" && <span style={styles.candidateNote}>描けませんでした</span>}
								{saving === index && <span style={{ ...styles.candidateNote, ...styles.saving }}>保存しています…</span>}
							</button>
						))}
					</div>
				)}
				{error && <div style={styles.error}>{error}</div>}
			</div>
			<MediaPickerModal
				open={pickerOpen}
				onOpenChange={setPickerOpen}
				mediaKind="image"
				onSelect={(item) => {
					onChange(toValue(item));
					setPickerOpen(false);
				}}
			/>
		</div>
	);
}

/** Field editors of this plugin, by widget name: `widget: "ai-image:image"`. */
export const fields = { image: AiImageField };
