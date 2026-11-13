// Types for the parts of the EmDash admin that the AI image plugin uses. The admin package is a
// dependency of emdash rather than of this site; EmDash's Vite config points "@emdash-cms/admin" at
// that copy when it builds the admin, so the plugin shares the admin's own module and contexts.
declare module "@emdash-cms/admin" {
	import type { ComponentType } from "react";

	export interface MediaItem {
		id: string;
		filename: string;
		mimeType: string;
		url: string;
		/** Set for media in the site's own library. */
		storageKey?: string;
		width?: number;
		height?: number;
		alt?: string;
		caption?: string;
		blurhash?: string;
		dominantColor?: string;
		/** Set for media from an external provider. */
		provider?: string;
		meta?: Record<string, unknown>;
	}

	/** Uploads to the media library; for images it also sends their size and a small thumbnail. */
	export function uploadMedia(file: File): Promise<MediaItem & { storageKey: string }>;

	export const MediaPickerModal: ComponentType<{
		open: boolean;
		onOpenChange: (open: boolean) => void;
		onSelect: (item: MediaItem) => void;
		mediaKind?: "image" | "file" | "video";
		title?: string;
	}>;
}
