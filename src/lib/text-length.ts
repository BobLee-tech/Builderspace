// How long a line reads, for limits that have to work in Chinese and English:
// a Chinese character counts 1, a Latin letter, digit, space or half-width
// mark counts ½. So 36 is about 36 汉字 or 72 letters (a dozen English words).

/** Most a project's one-line pitch may read; see displayLength. */
export const PITCH_MAX = 36;

/** CJK, full-width forms and CJK punctuation take a full square. */
const WIDE = /[⺀-鿿가-힯豈-﫿︰-﹏＀-￯]/;

/** The text's display length, rounded up: 汉字 count 1, everything else ½. */
export function displayLength(text: string): number {
  let n = 0;
  for (const ch of text) n += WIDE.test(ch) ? 1 : 0.5;
  return Math.ceil(n);
}
