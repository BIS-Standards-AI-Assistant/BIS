import type { NormalizedVoiceQuery } from "./types";

// Indic digit mapping for common Indian scripts to Arabic numerals (0-9)
const INDIC_DIGIT_MAP: Record<string, string> = {
  // Devanagari (Hindi, Marathi, Sanskrit, Nepali)
  "०": "0", "१": "1", "२": "2", "३": "3", "४": "4",
  "५": "5", "६": "6", "७": "7", "८": "8", "९": "9",
  // Bengali / Assamese
  "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4",
  "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9",
  // Gujarati
  "૦": "0", "૧": "1", "૨": "2", "૩": "3", "૪": "4",
  "૫": "5", "૬": "6", "૭": "7", "૮": "8", "૯": "9",
  // Gurmukhi (Punjabi)
  "੦": "0", "੧": "1", "੨": "2", "੩": "3", "੪": "4",
  "੫": "5", "੬": "6", "੭": "7", "੮": "8", "੯": "9",
  // Tamil
  "௦": "0", "௧": "1", "௨": "2", "௩": "3", "௪": "4",
  "௫": "5", "௬": "6", "௭": "7", "௮": "8", "௯": "9",
  // Telugu
  "౦": "0", "౧": "1", "౨": "2", "౩": "3", "౪": "4",
  "౫": "5", "౬": "6", "౭": "7", "౮": "8", "౯": "9",
  // Kannada
  "೦": "0", "೧": "1", "೨": "2", "೩": "3", "೪": "4",
  "೫": "5", "೬": "6", "೭": "7", "೮": "8", "೯": "9",
  // Malayalam
  "൦": "0", "൧": "1", "൨": "2", "൩": "3", "൪": "4",
  "൫": "5", "൬": "6", "൭": "7", "൮": "8", "൯": "9",
  // Odia
  "୦": "0", "୧": "1", "୨": "2", "୩": "3", "୪": "4",
  "୫": "5", "୬": "6", "୭": "7", "୮": "8", "୯": "9",
};

const INDIC_DIGIT_REGEX = new RegExp(`[${Object.keys(INDIC_DIGIT_MAP).join("")}]`, "g");

/**
 * Normalizes spoken STT transcripts before they enter the BIS query pipeline.
 *
 * Designed to be deterministic, safe, and transparent.
 * Never invents or speculatively replaces standard numbers.
 */
export function normalizeVoiceTranscript(
  transcript: string,
  detectedLanguage?: string
): NormalizedVoiceQuery {
  const originalTranscript = transcript ?? "";
  const transformations: string[] = [];
  let text = originalTranscript.trim();

  if (!text) {
    return {
      originalTranscript,
      normalizedQuery: "",
      detectedLanguage,
      transformations,
    };
  }

  // 1. Convert Indic numerals to standard ASCII digits (e.g., ४१५१ -> 4151)
  const hadIndicDigits = INDIC_DIGIT_REGEX.test(text);
  if (hadIndicDigits) {
    text = text.replace(INDIC_DIGIT_REGEX, (char) => INDIC_DIGIT_MAP[char] || char);
    transformations.push("indic_digits_to_ascii");
  }

  // 2. BIS Acronyms first (to avoid partial match of IS inside BIS)
  // "B I S" / "b.i.s." / "B-I-S" -> "BIS"
  const bisAcronymPattern = /\b(?:b\s*\.\s*i\s*\.\s*s(?:\.|\b)|b\s+i\s+s\b|b\s*-\s*i\s*-\s*s\b)/gi;
  if (bisAcronymPattern.test(text)) {
    text = text.replace(bisAcronymPattern, "BIS");
    transformations.push("spoken_bis_acronym_collapse");
  }

  // Devanagari: "बी आई एस" / "बीआईएस" -> "BIS"
  const devanagariBis = /(?:बी\s*[\.\-]?\s*आई\s*[\.\-]?\s*एस|बीआईएस)/g;
  if (devanagariBis.test(text)) {
    text = text.replace(devanagariBis, "BIS");
    transformations.push("devanagari_bis_to_ascii");
  }

  // 3. Spoken IS Acronyms
  // "I S 4151" or "I.S. 4151" or "I.S 4151" or "i - s 4151" -> "IS 4151"
  // Note: we do NOT match the plain English word "is" (e.g., "What is ...")
  const isAcronymPattern = /\b(?:i\s*\.\s*s(?:\.|\b)|i\s+s\b|i\s*-\s*s\b)/gi;
  if (isAcronymPattern.test(text)) {
    text = text.replace(isAcronymPattern, "IS");
    transformations.push("spoken_is_acronym_collapse");
  }

  // Devanagari: "आई एस" / "आई.एस." / "आई-एस" -> "IS"
  const devanagariIs = /(?:आई\s*[\.\-]?\s*एस|आइ\s*[\.\-]?\s*एस)/g;
  if (devanagariIs.test(text)) {
    text = text.replace(devanagariIs, "IS");
    transformations.push("devanagari_is_to_ascii");
  }

  // Tamil: "ஐ எஸ்" -> "IS", "பி ஐ எஸ்" -> "BIS"
  const tamilBis = /பி\s*[\.\-]?\s*ஐ\s*[\.\-]?\s*எஸ்/g;
  if (tamilBis.test(text)) {
    text = text.replace(tamilBis, "BIS");
    transformations.push("tamil_bis_to_ascii");
  }

  const tamilIs = /ஐ\s*[\.\-]?\s*எஸ்/g;
  if (tamilIs.test(text)) {
    text = text.replace(tamilIs, "IS");
    transformations.push("tamil_is_to_ascii");
  }

  // Telugu: "ఐ ఎస్" -> "IS", "బి ఐ ఎస్" -> "BIS"
  const teluguBis = /బి\s*[\.\-]?\s*ఐ\s*[\.\-]?\s*ఎస్/g;
  if (teluguBis.test(text)) {
    text = text.replace(teluguBis, "BIS");
    transformations.push("telugu_bis_to_ascii");
  }

  const teluguIs = /ఐ\s*[\.\-]?\s*ఎస్/g;
  if (teluguIs.test(text)) {
    text = text.replace(teluguIs, "IS");
    transformations.push("telugu_is_to_ascii");
  }

  // Bengali: "আই এস" -> "IS", "বি আই এস" -> "BIS"
  const bengaliBis = /বি\s*[\.\-]?\s*আই\s*[\.\-]?\s*এস/g;
  if (bengaliBis.test(text)) {
    text = text.replace(bengaliBis, "BIS");
    transformations.push("bengali_bis_to_ascii");
  }

  const bengaliIs = /আই\s*[\.\-]?\s*এস/g;
  if (bengaliIs.test(text)) {
    text = text.replace(bengaliIs, "IS");
    transformations.push("bengali_is_to_ascii");
  }

  // Gujarati: "આઈ એસ" -> "IS"
  const gujaratiIs = /આઈ\s*[\.\-]?\s*એસ/g;
  if (gujaratiIs.test(text)) {
    text = text.replace(gujaratiIs, "IS");
    transformations.push("gujarati_is_to_ascii");
  }

  // 4. Clean up standard formatting spacing: "IS-14543" or "IS : 14543" or "IS / ISO"
  text = text.replace(/\bIS\s*[:\-]\s*(\d+)/gi, "IS $1");
  text = text.replace(/\bIS\s*\/\s*ISO\b/gi, "IS/ISO");

  // 5. Whitespace and trailing punctuation cleanup
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned !== text) {
    transformations.push("whitespace_cleanup");
    text = cleaned;
  }

  // Remove trailing terminal punctuation if present (? . !)
  text = text.replace(/[?.!]+$/, "").trim();

  return {
    originalTranscript,
    normalizedQuery: text,
    detectedLanguage,
    transformations,
  };
}
