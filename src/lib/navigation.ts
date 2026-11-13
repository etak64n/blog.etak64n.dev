import { getEmDashCollection } from "emdash";

/**
 * Header links that depend on content: Magazines while a magazine is published, About while the
 * about page is. Two small queries, run together.
 */
export async function getContentLinks() {
	const [magazines, about] = await Promise.all([
		getEmDashCollection("magazines", { status: "published", limit: 1 }),
		getEmDashCollection("pages", { status: "published", where: { slug: "about" }, limit: 1 }),
	]);
	return {
		magazines: magazines.entries.length > 0,
		about: about.entries.length > 0,
	};
}
