// 앱 전체를 HTML 파일 하나로 묶는다 (태블릿·휴대폰 테스트용 공유 페이지).
// 사용: npm run build:artifact  →  dist-artifact/penwriting.html
import { execSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

execSync("npx vite build --mode artifact", { stdio: "inherit" });
const out = "dist-artifact";
const index = readFileSync(join(out, "index.html"), "utf8");
const js = index.match(/<script[^>]*src="\.\/(assets\/[^"]+\.js)"/)?.[1];
const css = index.match(/<link[^>]*href="\.\/(assets\/[^"]+\.css)"/)?.[1];
if (!js || !css) throw new Error("빌드 결과에서 JS/CSS를 찾지 못했습니다");
const script = readFileSync(join(out, js), "utf8").replace(/<\/script/gi, "<\\/script");
const style = readFileSync(join(out, css), "utf8");
// 언어팩을 페이지 안에 넣는다 (단일 파일이므로 fetch할 곳이 없다)
const packs = Object.fromEntries(
  readdirSync("public/languages").map((l) => [l, JSON.parse(readFileSync(join("public/languages", l, "pack.json"), "utf8"))]),
);
const packScript = `window.__PENWRITING_PACKS__=${JSON.stringify(packs).replace(/</g, "\\u003c")};`;

const html = `<title>PenWriting</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="theme-color" content="#f7f4ec">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Klee+One:wght@600&family=Nanum+Pen+Script&family=Noto+Sans:wght@400&family=Noto+Sans+JP:wght@400&family=Noto+Sans+KR:wght@400&family=Patrick+Hand&display=swap">
<style>${style}</style>
<div id="app"></div>
<script>${packScript}</script>
<script type="module">${script}</script>
`;
writeFileSync(join(out, "penwriting.html"), html);
console.log(`dist-artifact/penwriting.html  ${(html.length / 1024).toFixed(1)} kB`);
