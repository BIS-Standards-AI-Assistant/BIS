import type { AnswerLanguage } from "./language";

/**
 * Fixed, explicit refusal responses (PRD FR4, §8).
 *
 * The PRD is specific: when a query falls outside the indexed corpus, the
 * system must return a FIXED response that names the corpus boundary — not
 * a hedged, generated guess and not a different wording each time. These
 * are those fixed strings. The pipeline swaps the synthesis answer for the
 * matching one whenever the deterministic engine decides there is not
 * enough grounded evidence to answer (see src/lib/query-pipeline.ts).
 *
 * The corpus boundary itself (from PRD §3.1): this system searches public
 * BIS standard titles and scope summaries, public certification-scheme
 * documentation, and BIS public FAQs/circulars — never the full, licensed
 * text of Indian Standards.
 */

export type RefusalReason =
  | "out_of_scope" // not about products / standards / certification at all
  | "insufficient_evidence" // on-topic, but nothing in the corpus supports an answer
  | "not_in_database"; // a specific standard was identified but its document is not indexed

interface RefusalCopy {
  answer: string;
  limitation: string;
}

const EN: Record<RefusalReason, RefusalCopy> = {
  out_of_scope: {
    answer:
      "This question is outside what BIS Standards Navigator covers. This service searches public Indian Standard titles and scope summaries, public BIS certification-scheme documentation, and BIS public FAQs — it does not answer general questions. Try a product, material, or standard number, for example “LED bulb”, “stainless steel utensils”, or “IS 14543”.",
    limitation: "Query is outside the scope of Indian Standards, product compliance, and BIS certification.",
  },
  insufficient_evidence: {
    answer:
      "Not found in the indexed corpus. BIS Standards Navigator only answers from an indexed set of public BIS material — standard titles and scope summaries, certification-scheme documentation, and public FAQs — and it did not find a source in that set that supports an answer to this question. It does not hold the full text of Indian Standards. Any standards listed below were retrieved as loosely related context only and are not confirmed as applicable.",
    limitation: "No indexed BIS source supports a grounded answer to this query; the corpus does not include full standard text.",
  },
  not_in_database: {
    answer:
      "That standard was identified, but its authoritative document is not currently indexed in BIS Standards Navigator, so its requirements cannot be quoted here. Check the official catalogue at www.bis.gov.in or the BIS Standards portal for the full standard.",
    limitation: "The identified standard's document is not in the indexed corpus.",
  },
};

const HI: Record<RefusalReason, RefusalCopy> = {
  out_of_scope: {
    answer:
      "यह प्रश्न BIS Standards Navigator के दायरे से बाहर है। यह सेवा सार्वजनिक भारतीय मानकों के शीर्षक और क्षेत्र-सारांश, सार्वजनिक BIS प्रमाणन-योजना दस्तावेज़ और BIS के सार्वजनिक FAQ खोजती है — यह सामान्य प्रश्नों का उत्तर नहीं देती। किसी उत्पाद, सामग्री या मानक संख्या से खोजें, जैसे “LED बल्ब”, “स्टेनलेस स्टील बर्तन” या “IS 14543”।",
    limitation: "प्रश्न भारतीय मानकों, उत्पाद अनुपालन और BIS प्रमाणन के दायरे से बाहर है।",
  },
  insufficient_evidence: {
    answer:
      "अनुक्रमित सामग्री में नहीं मिला। BIS Standards Navigator केवल सार्वजनिक BIS सामग्री — मानक शीर्षक और क्षेत्र-सारांश, प्रमाणन-योजना दस्तावेज़ और सार्वजनिक FAQ — के अनुक्रमित समूह से उत्तर देता है, और इस प्रश्न का समर्थन करने वाला कोई स्रोत नहीं मिला। इसमें भारतीय मानकों का पूर्ण पाठ नहीं है। नीचे दिए गए कोई भी मानक केवल ढीले-ढाले संदर्भ के रूप में प्राप्त हुए हैं और लागू होने के रूप में पुष्ट नहीं हैं।",
    limitation: "इस प्रश्न का आधारभूत उत्तर देने वाला कोई अनुक्रमित BIS स्रोत नहीं है।",
  },
  not_in_database: {
    answer:
      "वह मानक पहचाना गया, लेकिन उसका आधिकारिक दस्तावेज़ इस समय BIS Standards Navigator में अनुक्रमित नहीं है, इसलिए उसकी आवश्यकताएं यहां उद्धृत नहीं की जा सकतीं। पूर्ण मानक के लिए www.bis.gov.in देखें।",
    limitation: "पहचाने गए मानक का दस्तावेज़ अनुक्रमित समूह में नहीं है।",
  },
};

export function refusalCopy(reason: RefusalReason, language: AnswerLanguage): RefusalCopy {
  return (language === "hi" ? HI : EN)[reason];
}
