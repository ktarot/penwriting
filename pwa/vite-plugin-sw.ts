import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import type { Plugin } from "vite";

/** public 폴더의 파일 목록 (상대 경로) */
function listPublic(dir: string, root = dir): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? listPublic(full, root) : [relative(root, full).split("\\").join("/")];
  });
}

/**
 * 빌드 결과로 sw.js를 만든다.
 * 앱 화면(JS·CSS·HTML)·언어팩·아이콘은 설치 때 미리 저장하고,
 * 글꼴 조각(수백 개)은 처음 쓸 때 저장한다.
 */
export function serviceWorker(): Plugin {
  return {
    name: "penwriting-sw",
    apply: "build",
    // index.html 등 다른 플러그인이 만든 파일까지 목록에 넣기 위해 마지막에 실행
    enforce: "post",
    generateBundle(_opts, bundle) {
      const built = Object.keys(bundle).filter((f) => !/\.(woff2?|ttf|otf|map)$/.test(f));
      const pub = listPublic("public").filter((f) => !f.startsWith("."));
      const precache = ["./", ...[...new Set([...built, ...pub])].sort().map((f) => `./${f}`)];
      const hash = createHash("sha256");
      for (const f of Object.keys(bundle).sort()) {
        const item = bundle[f];
        hash.update(f);
        hash.update(item.type === "chunk" ? item.code : typeof item.source === "string" ? item.source : Buffer.from(item.source));
      }
      for (const f of pub) hash.update(readFileSync(join("public", f)));
      const version = hash.digest("hex").slice(0, 12);
      const source = readFileSync("pwa/sw-template.js", "utf8").replace("__VERSION__", version).replace("__PRECACHE__", JSON.stringify(precache, null, 1));
      this.emitFile({ type: "asset", fileName: "sw.js", source });
    },
  };
}
