// Name matching for the entrance check-in. Pure, so the gate can filter the
// guest list in the browser as you type and the server can use the same rules.

// Case, punctuation, word order and common romanisation variants don't matter.
export const foldName = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^a-z0-9가-힣\s]/g, " ")
    .replace(/eo/g, "u").replace(/oo/g, "u").replace(/ee/g, "i").replace(/ou/g, "u")
    .replace(/rh/g, "r").replace(/\b(yi|ri)\b/g, "li")
    .replace(/gw/g, "kw").replace(/ch/g, "j").replace(/sh/g, "s")
    // k/g, t/d, p/b are spelled either way in Korean names (Kim/Gim, Dae/Tae)
    .replace(/k/g, "g").replace(/t/g, "d").replace(/p/g, "b")
    .replace(/\bwu/g, "u")
    .replace(/\s+/g, " ")
    .trim();

// Hangul → Revised Romanisation, syllable by syllable, so "김동현" finds
// "DongHyun Kim" and an English query finds a name typed in Korean.
const RR_L = ["g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj", "ch", "k", "t", "p", "h"];
const RR_V = ["a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae", "oe", "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i"];
const RR_T = ["", "k", "k", "k", "n", "n", "n", "t", "l", "k", "m", "l", "l", "l", "p", "l", "m", "p", "p", "t", "t", "ng", "t", "t", "k", "t", "p", "t"];
const romanise = (s: string) =>
  Array.from(s, (ch) => {
    const c = ch.charCodeAt(0) - 0xac00;
    if (c < 0 || c > 11171) return ch;
    return RR_L[Math.floor(c / 588)] + RR_V[Math.floor((c % 588) / 28)] + RR_T[c % 28];
  }).join("");
// How common surnames are actually spelled in passports and email signatures.
const SURNAMES: Record<string, string[]> = {
  김: ["kim", "gim"], 이: ["lee", "yi", "rhee", "li", "i"], 박: ["park", "pak", "bak"], 최: ["choi", "choe"],
  정: ["jung", "jeong", "chung"], 강: ["kang", "gang"], 조: ["cho", "jo"], 윤: ["yoon", "yun"], 장: ["jang", "chang"],
  임: ["lim", "im", "yim"], 한: ["han"], 오: ["oh", "o"], 서: ["seo", "suh"], 신: ["shin", "sin"], 권: ["kwon", "gwon"],
  황: ["hwang"], 안: ["ahn", "an"], 송: ["song"], 류: ["ryu", "yoo", "yu", "rhew"], 유: ["yoo", "yu"], 전: ["jeon", "chun", "jun"],
  홍: ["hong"], 고: ["ko", "go"], 문: ["moon", "mun"], 양: ["yang"], 손: ["son", "sohn"], 배: ["bae", "pae"], 백: ["baek", "paik", "baik"],
  허: ["heo", "huh", "hur"], 남: ["nam"], 노: ["noh", "roh", "no"], 하: ["ha"], 곽: ["kwak", "gwak"], 성: ["sung", "seong"],
  차: ["cha"], 주: ["joo", "ju", "chu"], 우: ["woo", "u"], 구: ["koo", "ku", "gu"], 민: ["min"], 진: ["jin", "chin"], 나: ["na", "ra"],
  지: ["ji", "chi"], 엄: ["um", "eom"], 원: ["won"], 천: ["chun", "cheon"], 방: ["bang"], 공: ["kong", "gong"], 현: ["hyun", "hyeon"],
  함: ["ham"], 변: ["byun", "byeon"], 염: ["yeom", "yum"], 여: ["yeo", "yuh"], 추: ["choo", "chu"], 도: ["do", "doh"], 석: ["seok", "suk"],
  선: ["sun", "seon"], 설: ["seol", "sul"], 마: ["ma"], 길: ["gil", "kil"], 연: ["yeon", "yun"], 표: ["pyo"], 명: ["myung"], 기: ["ki", "gi"],
  왕: ["wang"], 금: ["keum", "geum"], 인: ["in"], 제: ["je"], 탁: ["tak"], 국: ["kook", "guk"], 은: ["eun"], 용: ["yong"], 육: ["yuk"],
};
const HANGUL = /[가-힣]/;

// One person per row: does this query point at them?
export function nameMatches(q: string, fullName: string, organisation: string): { hit: boolean; front: boolean } {
  const name = foldName(`${fullName} ${romanise(fullName)}`);
  const hay = `${name} ${foldName(organisation)}`;
  const flat = hay.replace(/ /g, "");
  const words = hay.split(" ");
  const qWords = foldName(q).split(" ").filter(Boolean);
  if (!qWords.length) return { hit: false, front: false };
  const plain = qWords.every((w) => hay.includes(w)) || flat.includes(qWords.join(""));
  if (plain || !HANGUL.test(q)) return { hit: plain, front: name.startsWith(qWords[0]) };
  // Korean query against a romanised name: try "whole thing is the given
  // name" and "first syllable is the surname".
  const ko = q.replace(/[^가-힣]/g, "");
  const given = (s: string) => !s || flat.includes(foldName(romanise(s)));
  if (given(ko)) return { hit: true, front: false };
  const sur = SURNAMES[ko[0]];
  if (sur) {
    const surHit = sur.map(foldName).some((v) => words.includes(v) || flat.startsWith(v) || name.replace(/ /g, "").endsWith(v));
    if (surHit && given(ko.slice(1))) return { hit: true, front: true };
  }
  return { hit: false, front: false };
}
