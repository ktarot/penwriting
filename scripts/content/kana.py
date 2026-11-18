"""가나 읽기 → (헵번식 로마자, 한글 근사, 베트남어 근사). 규칙 기반·결정적."""
BASE = {
 "あ":("a","아","a"),"い":("i","이","i"),"う":("u","우","ư"),"え":("e","에","ê"),"お":("o","오","ô"),
 "か":("ka","카","ca"),"き":("ki","키","ki"),"く":("ku","쿠","cư"),"け":("ke","케","kê"),"こ":("ko","코","cô"),
 "が":("ga","가","ga"),"ぎ":("gi","기","ghi"),"ぐ":("gu","구","gư"),"げ":("ge","게","ghê"),"ご":("go","고","gô"),
 "さ":("sa","사","xa"),"し":("shi","시","si"),"す":("su","스","xư"),"せ":("se","세","xê"),"そ":("so","소","xô"),
 "ざ":("za","자","da"),"じ":("ji","지","gi"),"ず":("zu","즈","dư"),"ぜ":("ze","제","dê"),"ぞ":("zo","조","dô"),
 "た":("ta","타","ta"),"ち":("chi","치","chi"),"つ":("tsu","츠","chư"),"て":("te","테","tê"),"と":("to","토","tô"),
 "だ":("da","다","đa"),"ぢ":("ji","지","gi"),"づ":("zu","즈","dư"),"で":("de","데","đê"),"ど":("do","도","đô"),
 "な":("na","나","na"),"に":("ni","니","ni"),"ぬ":("nu","누","nư"),"ね":("ne","네","nê"),"の":("no","노","nô"),
 "は":("ha","하","ha"),"ひ":("hi","히","hi"),"ふ":("fu","후","phư"),"へ":("he","헤","hê"),"ほ":("ho","호","hô"),
 "ば":("ba","바","ba"),"び":("bi","비","bi"),"ぶ":("bu","부","bư"),"べ":("be","베","bê"),"ぼ":("bo","보","bô"),
 "ぱ":("pa","파","pa"),"ぴ":("pi","피","pi"),"ぷ":("pu","푸","pư"),"ぺ":("pe","페","pê"),"ぽ":("po","포","pô"),
 "ま":("ma","마","ma"),"み":("mi","미","mi"),"む":("mu","무","mư"),"め":("me","메","mê"),"も":("mo","모","mô"),
 "や":("ya","야","ia"),"ゆ":("yu","유","iu"),"よ":("yo","요","iô"),
 "ら":("ra","라","ra"),"り":("ri","리","ri"),"る":("ru","루","rư"),"れ":("re","레","rê"),"ろ":("ro","로","rô"),
 "わ":("wa","와","oa"),"を":("o","오","ô"),"ゔ":("vu","부","vư"),
}
# 요음·외래음 (2글자)
COMBO = {}
for head, (r, k, v) in {"き":("ky","캬큐쿄","kia kiu kiô"),"ぎ":("gy","갸규교","ghia ghiu ghiô"),"し":("sh","샤슈쇼","xa xiu xô"),
    "じ":("j","쟈쥬죠","gia giu giô"),"ち":("ch","챠츄쵸","cha chu chô"),"に":("ny","냐뉴뇨","nha nhiu nhô"),
    "ひ":("hy","햐휴효","hia hiu hiô"),"び":("by","뱌뷰뵤","bia biu biô"),"ぴ":("py","퍄퓨표","pia piu piô"),
    "み":("my","먀뮤묘","mia miu miô"),"り":("ry","랴류료","ria riu riô")}.items():
    for i, small in enumerate("ゃゅょ"):
        COMBO[head + small] = (r + "auo"[i], k[i], v.split()[i])
COMBO.update({"てぃ":("ti","티","ti"),"でぃ":("di","디","đi"),"ふぁ":("fa","파","pha"),"ふぃ":("fi","피","phi"),"ふぇ":("fe","페","phê"),
    "ふぉ":("fo","포","phô"),"うぃ":("wi","위","uy"),"うぇ":("we","웨","uê"),"うぉ":("wo","워","uô"),"しぇ":("she","셰","sê"),
    "じぇ":("je","제","giê"),"ちぇ":("che","체","chê"),"とぅ":("tu","투","tu"),"どぅ":("du","두","đu"),"でゅ":("dyu","듀","điu")})
MACRON = {"a":"ā","i":"ī","u":"ū","e":"ē","o":"ō"}
KO_VOWEL = {"a":"아","i":"이","u":"우","e":"에","o":"오"}

def to_hira(s):
    return "".join(chr(ord(c) - 0x60) if "ァ" <= c <= "ヶ" else c for c in s)

def add_final(syl, final):
    """한글 음절에 받침을 붙인다 (이미 있으면 그대로)"""
    code = ord(syl) - 0xAC00
    if not (0 <= code < 11172) or code % 28: return syl + {1:"ㄱ",4:"ㄴ",16:"ㅁ",17:"ㅂ",19:"ㅅ",21:"ㅇ"}[final]
    return chr(ord(syl) + final)

def convert(kana):
    s = to_hira(kana)
    morae = []  # (romaji, hangul, vi)
    i = 0
    while i < len(s):
        two = s[i:i+2]
        if two in COMBO: morae.append(list(COMBO[two])); i += 2; continue
        c = s[i]
        if c in BASE: morae.append(list(BASE[c]))
        elif c == "っ": morae.append(["Q","Q","Q"])
        elif c == "ん": morae.append(["N","N","N"])
        elif c == "ー": morae.append(["L","L","L"])
        elif c in " 　": morae.append([" "," "," "])
        else: raise ValueError(f"unknown kana {c!r} in {kana}")
        i += 1
    rom, ko, vi = [], [], []
    for j, (r, k, v) in enumerate(morae):
        nxt = morae[j+1][0] if j + 1 < len(morae) else ""
        prev_r = rom[-1] if rom else ""
        if r == " ": rom.append(" "); ko.append(" "); vi.append(" "); continue
        if r == "Q":  # 촉음: 다음 자음 겹침
            c0 = nxt[:1] if nxt not in ("", " ") else "t"
            rom.append("t" if nxt.startswith("ch") else c0)
            fin = 1 if c0 in "kg" else 17 if c0 in "pb" else 19
            if ko and ko[-1].strip(): ko[-1] = add_final(ko[-1], fin)
            if vi and vi[-1].strip(): vi[-1] += "c" if c0 in "kg" else "p" if c0 in "pb" else "t"
            continue
        if r == "N":  # 발음: 다음 소리에 따라 ㄴ/ㅁ/ㅇ
            rom.append("n'" if nxt[:1] in ("a","i","u","e","o","y") else "n")
            fin = 16 if nxt[:1] in "mbp" and nxt else 21 if nxt[:1] in "kg" and nxt else 4
            if ko and ko[-1].strip(): ko[-1] = add_final(ko[-1], fin)
            if vi and vi[-1].strip(): vi[-1] += "m" if fin == 16 else "ng" if fin == 21 else "n"
            continue
        if r == "L":  # 장음 부호
            last = prev_r[-1]
            rom[-1] = prev_r[:-1] + MACRON[last]
            ko.append(KO_VOWEL[last])
            continue
        # 장모음: おう/おお→ō, うう→ū (로마자), 한글은 모음을 그대로 적고, 베트남어는 생략
        if prev_r and prev_r[-1] in "o" and r in ("u", "o") and len(morae[j-1][0]) and morae[j-1][0] not in ("Q","N","L"):
            rom[-1] = prev_r[:-1] + "ō"; ko.append("오"); continue
        if prev_r and prev_r[-1] == "u" and r == "u" and morae[j-1][0] not in ("Q","N","L"):
            rom[-1] = prev_r[:-1] + "ū"; ko.append("우"); continue
        if prev_r and prev_r[-1] == "e" and r == "i" and morae[j-1][0] not in ("Q","N","L"):
            rom.append("i"); ko.append("에"); continue
        rom.append(r); ko.append(k); vi.append(v)
    romaji = "".join(rom)
    hangul = "".join(ko)
    viet = "-".join(x for x in "".join(f"|{x}" if x != " " else " " for x in vi).split("|") if x).replace("- ", " ").replace(" -", " ").strip("-")
    viet = " ".join(w.strip("-") for w in viet.split(" "))
    return romaji, hangul, viet

if __name__ == "__main__":
    for t in ["がっこう","めーとる","せんせい","ぎんこう","しゅう","ちかてつ","ゆうびん ばんごう","きっぷ","しんぶん","おとうと","すーぱー","こんびに","がそりんすたんど","えれべーたー","ちゅうしゃじょう","りょうしん","おにいさん","でんわ ばんごう","じゅうまん","いちおく","せんちめーとる","ろっぽんぎ"]:
        print(t, convert(t))
