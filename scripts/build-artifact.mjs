// 앱 전체를 HTML 파일 하나로 묶는다 (태블릿·휴대폰 테스트용 공유 페이지).
// 사용: npm run build:artifact  →  dist-artifact/penwriting.html
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

execSync("npx vite build --mode artifact", { stdio: "inherit" });
const out = "dist-artifact";
const index = readFileSync(join(out, "index.html"), "utf8");
const js = index.match(/<script[^>]*src="\.\/(assets\/[^"]+\.js)"/)?.[1];
const css = index.match(/<link[^>]*href="\.\/(assets\/[^"]+\.css)"/)?.[1];
if (!js || !css) throw new Error("빌드 결과에서 JS/CSS를 찾지 못했습니다");
const script = readFileSync(join(out, js), "utf8").replace(/<\/script/gi, "<\\/script");
const style = readFileSync(join(out, css), "utf8");

const html = `<title>PenWriting</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="theme-color" content="#f7f4ec">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nanum+Pen+Script&family=Noto+Sans+KR:wght@400;600;700&display=swap">
<style>${style}</style>
<div id="app"></div>
<script type="module">${script}</script>
`;
writeFileSync(join(out, "penwriting.html"), html);
console.log(`dist-artifact/penwriting.html  ${(html.length / 1024).toFixed(1)} kB`);
