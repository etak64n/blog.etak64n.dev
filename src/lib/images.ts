/**
 * The height to ask for an image at `width`, keeping the image's own proportions.
 *
 * EmDash's image endpoint on Cloudflare passes only the width and the height to the Images binding,
 * which fits the image inside them without cropping: asking a square image for 520×273 returns
 * 273×273. So cards ask for the image in its own shape and crop it with CSS (`object-fit: cover`).
 */
export function heightAtWidth(image: { width?: number; height?: number }, width: number): number | undefined {
	return image.width && image.height ? Math.round((width * image.height) / image.width) : undefined;
}
