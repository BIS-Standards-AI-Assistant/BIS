import { describe, test, expect } from "vitest";
import { normalizeVoiceTranscript } from "./voice-normalizer";

describe("normalizeVoiceTranscript", () => {
  test("returns empty query for empty or null input", () => {
    expect(normalizeVoiceTranscript("").normalizedQuery).toBe("");
    expect(normalizeVoiceTranscript("   ").normalizedQuery).toBe("");
  });

  test("normalizes spoken English acronyms ('I S 4151', 'I.S. 4151', 'B I S')", () => {
    const res1 = normalizeVoiceTranscript("I S 4151 certification requirements");
    expect(res1.normalizedQuery).toBe("IS 4151 certification requirements");
    expect(res1.transformations).toContain("spoken_is_acronym_collapse");

    const res2 = normalizeVoiceTranscript("What is I.S. 14543?");
    expect(res2.normalizedQuery).toBe("What is IS 14543");

    const res3 = normalizeVoiceTranscript("B.I.S. certified helmets");
    expect(res3.normalizedQuery).toBe("BIS certified helmets");
    expect(res3.transformations).toContain("spoken_bis_acronym_collapse");
  });

  test("normalizes Devanagari spoken acronyms ('आई एस 4151', 'बीआईएस')", () => {
    const res1 = normalizeVoiceTranscript("मुझे आई एस 4151 का प्रोसेस बताओ");
    expect(res1.normalizedQuery).toBe("मुझे IS 4151 का प्रोसेस बताओ");
    expect(res1.transformations).toContain("devanagari_is_to_ascii");

    const res2 = normalizeVoiceTranscript("बीआईएस सर्टिफिकेशन फॉर सीमेंट");
    expect(res2.normalizedQuery).toBe("BIS सर्टिफिकेशन फॉर सीमेंट");
    expect(res2.transformations).toContain("devanagari_bis_to_ascii");
  });

  test("normalizes Tamil and Telugu spoken acronyms ('ஐ எஸ்', 'ఐ ఎస్')", () => {
    const resTamil = normalizeVoiceTranscript("ஐ எஸ் 4151 சான்றிதழ்");
    expect(resTamil.normalizedQuery).toBe("IS 4151 சான்றிதழ்");
    expect(resTamil.transformations).toContain("tamil_is_to_ascii");

    const resTelugu = normalizeVoiceTranscript("ఐ ఎస్ 4151 సర్టిఫికేషన్");
    expect(resTelugu.normalizedQuery).toBe("IS 4151 సర్టిఫికేషన్");
    expect(resTelugu.transformations).toContain("telugu_is_to_ascii");
  });

  test("converts Indic digits to ASCII numerals", () => {
    // Hindi Devanagari digits: ४१५१ -> 4151
    const res1 = normalizeVoiceTranscript("आई एस ४१५१");
    expect(res1.normalizedQuery).toBe("IS 4151");
    expect(res1.transformations).toContain("indic_digits_to_ascii");

    // Bengali digits: ১৪৫৪৩ -> 14543
    const res2 = normalizeVoiceTranscript("আই এস ১৪৫৪৩");
    expect(res2.normalizedQuery).toBe("IS 14543");
  });

  test("cleans up formatting spacing in standard numbers ('IS:14543' -> 'IS 14543')", () => {
    const res = normalizeVoiceTranscript("Requirements for IS:14543?");
    expect(res.normalizedQuery).toBe("Requirements for IS 14543");
  });

  test("never speculatively invents or changes standard numbers", () => {
    const text = "मुझे पानी की बोतल का मानक बताओ";
    const res = normalizeVoiceTranscript(text);
    expect(res.normalizedQuery).toBe("मुझे पानी की बोतल का मानक बताओ");
    expect(res.transformations.length).toBe(0);
  });
});
