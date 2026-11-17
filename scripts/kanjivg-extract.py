"""KanjiVG SVG에서 획순 데이터를 뽑아 public/strokes/ja.json을 만든다.

사용: python3 -I scripts/kanjivg-extract.py <KanjiVG SVG 폴더> <받은 날짜 YYYY-MM-DD>
SVG 폴더에는 https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/<코드>.svg 파일을 둔다.
대상 글자는 public/languages/ja/pack.json의 기초 문자 항목이다.

KanjiVG © Ulrich Apel, CC BY-SA 3.0 — https://kanjivg.tagaini.net
"""
import json, re, sys
import xml.etree.ElementTree as ET

SVG_NS = "{http://www.w3.org/2000/svg}"
PATH_OK = re.compile(r"^[MmCcSsLlHhVvQqTtZz0-9.,\-\s]+$")
NUM_OK = re.compile(r"^matrix\(1 0 0 1 (-?[0-9.]+) (-?[0-9.]+)\)$")

src, fetched = sys.argv[1], sys.argv[2]
pack = json.load(open("public/languages/ja/pack.json", encoding="utf-8"))
chars = [i["text"] for c in pack["categories"] if c["level"] == "character" for i in c["items"]]

out = {}
for ch in chars:
    code = "%05x" % ord(ch)
    tree = ET.parse(f"{src}/{code}.svg")
    root = tree.getroot()
    strokes, numbers = [], []
    for g in root.iter(f"{SVG_NS}g"):
        gid = g.get("id", "")
        if gid == f"kvg:StrokePaths_{code}":
            paths = [p for p in g.iter(f"{SVG_NS}path")]
            # 획 번호 순서대로 (id: kvg:03042-s1, -s2 ...)
            paths.sort(key=lambda p: int(p.get("id").rsplit("-s", 1)[1]))
            for p in paths:
                d = p.get("d").strip()
                if not PATH_OK.match(d):
                    raise SystemExit(f"unexpected path data in {code}")
                strokes.append(d)
        elif gid == f"kvg:StrokeNumbers_{code}":
            for t in g.iter(f"{SVG_NS}text"):
                m = NUM_OK.match(t.get("transform", ""))
                if not m or not t.text or not t.text.strip().isdigit():
                    raise SystemExit(f"unexpected stroke number in {code}")
                numbers.append({"n": int(t.text), "x": float(m.group(1)), "y": float(m.group(2))})
    numbers.sort(key=lambda n: n["n"])
    if not strokes or len(numbers) != len(strokes):
        raise SystemExit(f"stroke count mismatch in {code}")
    out[ch] = {"strokes": strokes, "numbers": [[n["x"], n["y"]] for n in numbers]}

data = {
    "source": "KanjiVG",
    "url": "https://kanjivg.tagaini.net",
    "license": "CC BY-SA 3.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0/",
    "copyright": "Copyright (C) 2009-2024 Ulrich Apel",
    "fetched": fetched,
    "viewBox": [109, 109],
    "chars": out,
}
with open("public/strokes/ja.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    f.write("\n")
print(len(out), "chars,", sum(len(v["strokes"]) for v in out.values()), "strokes")
