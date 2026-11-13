/**
 * Prepares the Portable Text of a post for rendering: gives headings their anchors, builds the table
 * of contents from them, and marks the source line under an image.
 */

export interface Span {
	_type: string;
	_key?: string;
	text?: string;
	marks?: string[];
}

export interface MarkDef {
	_type: string;
	_key: string;
	href?: string;
	blank?: boolean;
}

export interface TextBlock {
	_type: "block";
	_key: string;
	style?: string;
	listItem?: string;
	children: Span[];
	markDefs?: MarkDef[];
	/** Set here: the id of a heading, linked from the table of contents. */
	anchor?: string;
	/** Set here: a paragraph naming the source of the image above it. */
	imageSource?: boolean;
}

type Node = { _type: string; _key?: string } & Record<string, unknown>;

export interface TocItem {
	id: string;
	text: string;
	depth: number;
	children: TocItem[];
}

const HEADING = /^h([1-6])$/;
/** The line naming where an image or a quotation comes from: `出典: …`. */
export const SOURCE_LINE = /^(出典|引用)[:：]/;

export const isTextBlock = (node: Node): node is TextBlock =>
	node._type === "block" && Array.isArray(node.children);

export const blockText = (block: TextBlock) => block.children.map((child) => child.text ?? "").join("");

/** Heading ids as GitHub makes them: lowercase, punctuation dropped, spaces as hyphens, numbered when repeated. */
function slugify(text: string, used: Map<string, number>): string {
	const base =
		text
			.trim()
			.toLowerCase()
			.replace(/[^\p{L}\p{M}\p{N}\s_-]/gu, "")
			.replace(/\s+/g, "-") || "section";
	const count = used.get(base) ?? 0;
	used.set(base, count + 1);
	return count === 0 ? base : `${base}-${count}`;
}

export function prepareContent(value: unknown): { blocks: Node[]; toc: TocItem[] } {
	const source = Array.isArray(value) ? (value as Node[]) : [];
	const used = new Map<string, number>();
	const toc: TocItem[] = [];
	const open: TocItem[] = [];

	const blocks = source.map((node, index) => {
		if (!isTextBlock(node)) return node;
		const heading = HEADING.exec(node.style ?? "");
		if (heading && !node.listItem) {
			const text = blockText(node);
			const id = slugify(text, used);
			const depth = Number(heading[1]);
			// The contents list h2 to h4, nested by level.
			if (depth >= 2 && depth <= 4 && text.trim()) {
				const item: TocItem = { id, text, depth, children: [] };
				while (open.length > 0 && open[open.length - 1].depth >= depth) open.pop();
				(open.length > 0 ? open[open.length - 1].children : toc).push(item);
				open.push(item);
			}
			return { ...node, anchor: id };
		}
		const previous = source[index - 1];
		if (
			previous?._type === "image" &&
			(node.style ?? "normal") === "normal" &&
			!node.listItem &&
			SOURCE_LINE.test(blockText(node).trimStart())
		) {
			return { ...node, imageSource: true };
		}
		return node;
	});

	return { blocks, toc };
}
