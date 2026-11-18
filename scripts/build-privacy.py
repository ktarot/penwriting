"""public/privacy.html 을 앱 안의 개인정보처리방침 문구(src/i18n/strings.ts)로 다시 만든다.
사용: python3 -I scripts/build-privacy.py
(스토어 등록용 공개 URL: https://ktarot.github.io/penwriting/privacy.html)
"""
import html, re

src = open("src/i18n/strings.ts", encoding="utf-8").read()
LANGS = {"ko": "const ko = {", "en": "const en: Strings = {", "ja": "const ja: Strings = {", "vi": "const vi: Strings = {"}
NAMES = {"ko": "한국어", "en": "English", "ja": "日本語", "vi": "Tiếng Việt"}


def block(marker):
    i = src.index(marker)
    return src[i : src.index("\n};", i)]


secs = []
for code, m in LANGS.items():
    b = block(m)
    title = re.search(r'\n  privacy: "([^"]+)"', b).group(1)
    paras = re.findall(r'"((?:[^"\\]|\\.)*)"', re.search(r"privacyBody: \[(.*?)\n  \]", b, re.S).group(1))
    upd = re.search(r'privacyUpdated: "([^"]+)"', b).group(1)
    contact = re.search(r'contactText: "([^"]+)"', b).group(1)
    body = "".join(f"<p>{html.escape(p)}</p>" for p in paras)
    secs.append(
        f'<section lang="{code}" id="{code}">\n<h2>{html.escape(title)} · {NAMES[code]}</h2>\n{body}\n'
        f'<p>{html.escape(contact)} <a href="https://github.com/ktarot/penwriting/issues">GitHub Issues</a></p>\n'
        f'<p class="muted">{html.escape(upd)}</p>\n</section>'
    )

tpl = open("public/privacy.html", encoding="utf-8").read()
start = tpl.index("<main>")
end = tpl.index("</main>")
nav = "".join(f'<a href="#{c}">{NAMES[c]}</a>' for c in LANGS)
tpl = tpl[:start] + f"<main>\n<h1>PenWriting — Privacy Policy</h1>\n<nav>{nav}</nav>\n" + "".join(secs) + "\n" + tpl[end:]
open("public/privacy.html", "w", encoding="utf-8").write(tpl)
print("public/privacy.html updated")
