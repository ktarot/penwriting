"""생활 단어 주제표(themes/*.txt)를 언어팩(public/languages/*/pack.json)에 반영한다.

사용: python3 -I scripts/content/build-words.py

표 형식 (한 줄 = 4개 언어가 같은 뜻인 개념):
  slug | ko;로마자;일본어근사;베트남어근사 | en;IPA;한국어근사;일본어근사;베트남어근사 | ja;가나읽기 | vi;한국어근사;영어근사;일본어근사
한 언어에만 있는 단어:
  +ko slug | 단어;로마자;일본어근사;베트남어근사 | 영어뜻;일본어뜻;베트남어뜻
  +ja slug | 단어;가나읽기 | 한국어뜻;영어뜻;베트남어뜻
  +vi slug | 단어;한국어근사;영어근사;일본어근사 | 한국어뜻;영어뜻;일본어뜻
  +en slug | 단어;IPA;한국어근사;일본어근사;베트남어근사 | 한국어뜻;일본어뜻;베트남어뜻
일본어 단어의 발음 안내(로마자·한글·베트남어)는 kana.py 규칙으로 만든다.
베트남어 성조 설명은 성조 부호에서 정한다.
"""
import json, re, sys, unicodedata
import os
SP = os.path.dirname(os.path.abspath(__file__))  # 이 폴더의 themes/*.txt 를 읽는다
sys.path.insert(0, SP)
from kana import convert
ROOT = os.path.join(SP, "..", "..", "public", "languages")
LANGS = ["ko", "en", "ja", "vi"]
THEMES = [("numbers", ("숫자","Numbers","数字","Số đếm")), ("units", ("단위","Units","単位","Đơn vị")),
          ("directions", ("방향·위치","Directions","方向・位置","Phương hướng")), ("address", ("주소","Addresses","住所","Địa chỉ")),
          ("time", ("시간·날짜","Time & dates","時間・日付","Thời gian")), ("people", ("가족·사람","Family & people","家族・人","Gia đình")),
          ("food", ("음식·장보기","Food & shopping","食べ物・買い物","Ăn uống")), ("places", ("장소·교통","Places & transport","場所・交通","Địa điểm"))]

TONE_MARK = {"̀": "huyền", "́": "sắc", "̉": "hỏi", "̃": "ngã", "̣": "nặng"}
TONE_DESC = {
 "ngang": {"ko":"평평한 중간 높이","en":"level, mid pitch","ja":"平らな中くらいの高さ"},
 "huyền": {"ko":"낮게 천천히 내려감","en":"low, falling","ja":"低くゆっくり下がる"},
 "sắc": {"ko":"높게 올라감","en":"high, rising","ja":"高く上がる"},
 "hỏi": {"ko":"내려갔다가 다시 올라감","en":"dipping, then rising","ja":"下がってから上がる"},
 "ngã": {"ko":"올라가다 목에서 끊기듯 다시 올라감","en":"rising with a break in the voice","ja":"上がる途中で喉を詰めてまた上がる"},
 "nặng": {"ko":"낮고 짧게 목을 막듯 끊음","en":"low, short, with a catch in the throat","ja":"低く短く喉を詰める"},
}
def tone_of(syl):
    for ch in unicodedata.normalize("NFD", syl):
        if ch in TONE_MARK: return TONE_MARK[ch]
    return "ngang"
def tone_note(text, native):
    syls = [s.strip(".,?!()") for s in text.replace("-", " ").split() if s.strip(".,?!()")]
    return ", ".join(f"{s}: {TONE_DESC[tone_of(s)][native]} ({tone_of(s)})" for s in syls)

def has_kanji_or_latin(s):
    return any("一" <= c <= "鿿" or c.isascii() and c.isalpha() for c in s)

def ja_reading(word, kana):
    rom, ko, vi = convert(kana)
    std = f"{kana} · {rom}" if has_kanji_or_latin(word) else rom
    return std, {"ko": ko, "en": rom, "vi": vi}

def parse(theme):
    rows, extras = [], []
    for line in open(f"{SP}/themes/{theme}.txt", encoding="utf-8"):
        line = line.rstrip("\n")
        if not line.strip() or line.startswith("#"): continue
        parts = [p.strip() for p in line.split("|")]
        if line.startswith("+"):
            lang, slug = parts[0][1:].split()
            extras.append((lang, slug, parts[1].split(";"), parts[2].split(";")))
        else:
            slug = parts[0]
            ko, en, ja, vi = (p.split(";") for p in parts[1:5])
            assert len(ko) == 4 and len(en) == 5 and len(ja) == 2 and len(vi) == 4, (theme, slug)
            rows.append((slug, ko, en, ja, vi))
    return rows, extras

def build(lang):
    cats = []
    for key, titles in THEMES:
        rows, extras = parse(key)
        items = []
        for slug, ko, en, ja, vi in rows:
            word = {"ko": ko[0], "en": en[0], "ja": ja[0], "vi": vi[0]}
            if lang == "ko": text, std, pron = ko[0], ko[1], {"en": ko[1], "ja": ko[2], "vi": ko[3]}
            elif lang == "en": text, std, pron = en[0], en[1], {"ko": en[2], "ja": en[3], "vi": en[4]}
            elif lang == "ja":
                text = ja[0]; std, pron = ja_reading(ja[0], ja[1])
            else: text, std, pron = vi[0], None, {"ko": vi[1], "en": vi[2], "ja": vi[3]}
            guides = {}
            for n in LANGS:
                if n == lang: continue
                g = {"pronunciation": pron[n], "meaning": word[n]}
                if lang == "vi": g["explanation"] = tone_note(text, n)
                guides[n] = g
            it = {"id": f"{lang}-w-{key}-{slug}", "language": lang, "level": "word", "text": text}
            if std: it["standardReading"] = std
            it["nativeGuides"] = guides
            items.append(it)
        for xl, slug, w, means in extras:
            if xl != lang: continue
            others = [n for n in LANGS if n != lang]
            if lang == "ko": text, std, pron = w[0], w[1], {"en": w[1], "ja": w[2], "vi": w[3]}
            elif lang == "en": text, std, pron = w[0], w[1], {"ko": w[2], "ja": w[3], "vi": w[4]}
            elif lang == "ja": text = w[0]; std, pron = ja_reading(w[0], w[1])
            else: text, std, pron = w[0], None, {"ko": w[1], "en": w[2], "ja": w[3]}
            assert len(means) == 3, (lang, slug)
            guides = {}
            for n, m in zip(others, means):
                g = {"pronunciation": pron[n], "meaning": m}
                if lang == "vi": g["explanation"] = tone_note(text, n)
                guides[n] = g
            it = {"id": f"{lang}-w-{key}-{slug}", "language": lang, "level": "word", "text": text}
            if std: it["standardReading"] = std
            it["nativeGuides"] = guides
            items.append(it)
        cats.append({"id": key, "level": "word", "title": dict(zip(LANGS, titles)), "items": items})
    return cats

theme_ids = {k for k, _ in THEMES}
for lang in LANGS:
    p = f"{ROOT}/{lang}/pack.json"
    pack = json.load(open(p, encoding="utf-8"))
    new = build(lang)
    out, inserted = [], False
    for c in pack["categories"]:
        if c["id"] in theme_ids:
            if not inserted: out.extend(new); inserted = True
            continue
        out.append(c)
    pack["categories"] = out
    pack["version"] = "0.3.0"
    ids = [i["id"] for c in pack["categories"] for i in c["items"]]
    dup = {x for x in ids if ids.count(x) > 1}
    assert not dup, (lang, dup)
    bad = [x for x in ids if not re.match(r"^[a-z0-9-]+$", x)]
    assert not bad, bad
    json.dump(pack, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    open(p, "a").write("\n")
    print(lang, {c["id"]: len(c["items"]) for c in new}, "total words", sum(len(c["items"]) for c in pack["categories"] if c["level"] == "word"))
