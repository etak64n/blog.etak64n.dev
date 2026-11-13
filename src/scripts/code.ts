// Code boxes in the post text: colours the code in the languages below (the Nord palette is in
// global.css), and adds a copy button that shows a check mark for a moment after copying.
//
// The colouring runs in the browser rather than on the server: the code then costs the Worker no
// CPU time on each request.

import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import c from "highlight.js/lib/languages/c";
import cpp from "highlight.js/lib/languages/cpp";
import css from "highlight.js/lib/languages/css";
import diff from "highlight.js/lib/languages/diff";
import dockerfile from "highlight.js/lib/languages/dockerfile";
import go from "highlight.js/lib/languages/go";
import ini from "highlight.js/lib/languages/ini";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import markdown from "highlight.js/lib/languages/markdown";
import python from "highlight.js/lib/languages/python";
import rust from "highlight.js/lib/languages/rust";
import shell from "highlight.js/lib/languages/shell";
import sql from "highlight.js/lib/languages/sql";
import typescript from "highlight.js/lib/languages/typescript";
import x86asm from "highlight.js/lib/languages/x86asm";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";

const LANGUAGES = {
	bash,
	c,
	cpp,
	css,
	diff,
	dockerfile,
	go,
	ini,
	javascript,
	json,
	markdown,
	python,
	rust,
	shell,
	sql,
	typescript,
	x86asm,
	xml,
	yaml,
};
for (const [name, language] of Object.entries(LANGUAGES)) hljs.registerLanguage(name, language);
// Names that the editor or writers use for the same languages.
hljs.registerAliases(["sh", "zsh", "console"], { languageName: "bash" });
hljs.registerAliases(["toml"], { languageName: "ini" });
hljs.registerAliases(["html", "svg"], { languageName: "xml" });
hljs.registerAliases(["js", "jsx", "mjs"], { languageName: "javascript" });
hljs.registerAliases(["ts", "tsx"], { languageName: "typescript" });
hljs.registerAliases(["yml"], { languageName: "yaml" });
hljs.registerAliases(["asm"], { languageName: "x86asm" });

const COPY_ICON =
	'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
const CHECK_ICON =
	'<svg viewBox="2 4 20 16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';

function addCopyButton(box: HTMLElement, code: HTMLElement) {
	const button = document.createElement("button");
	button.type = "button";
	button.className = "codebox-copy";
	button.setAttribute("aria-label", "コードをコピー");
	button.innerHTML = COPY_ICON;
	button.addEventListener("click", async () => {
		try {
			await navigator.clipboard.writeText(code.innerText);
			button.innerHTML = CHECK_ICON;
			button.classList.add("copied");
			setTimeout(() => {
				button.classList.remove("copied");
				setTimeout(() => {
					button.innerHTML = COPY_ICON;
				}, 200);
			}, 1200);
		} catch {
			// The clipboard can be unavailable (an insecure page or a denied permission); nothing is copied.
		}
	});
	box.append(button);
}

for (const box of document.querySelectorAll<HTMLElement>(".content .codebox")) {
	const code = box.querySelector<HTMLElement>(":scope > pre > code");
	if (!code) continue;
	const language = [...code.classList].find((name) => name.startsWith("language-"))?.slice("language-".length);
	if (language && hljs.getLanguage(language)) hljs.highlightElement(code);
	addCopyButton(box, code);
}
