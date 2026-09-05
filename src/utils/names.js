// Bilingual display of a voter name: "English / हिंदी".
// Hindi source (current Excel) -> transliterate to English.
// English source (older uploads) -> transliterate to Hindi.
import { toHindi } from './toHindi.js';
import { toEnglish, isDevanagari } from './toEnglish.js';

export function englishOf(name, nameEn) {
  if (!name) return '';
  if (nameEn) return nameEn;
  return isDevanagari(name) ? toEnglish(name) : name;
}

export function hindiOf(name) {
  if (!name) return '';
  return isDevanagari(name) ? name : toHindi(name);
}

// "Rajesh Kumar / राजेश कुमार"
export function both(name, nameEn) {
  if (!name) return '';
  const en = englishOf(name, nameEn);
  const hi = hindiOf(name);
  return en === hi ? en : `${en} / ${hi}`;
}
