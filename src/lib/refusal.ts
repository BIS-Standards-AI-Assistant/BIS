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

// Marathi and Bengali copy is LLM-authored, mirroring the EN/HI strings
// above sentence-for-sentence. Flagged for a native-speaker spot-check
// before being treated as final — same honesty convention as the
// verification_note fields on the certification/QCO reference dataset.
const MR: Record<RefusalReason, RefusalCopy> = {
  out_of_scope: {
    answer:
      "हा प्रश्न BIS Standards Navigator च्या कार्यक्षेत्राबाहेर आहे. ही सेवा सार्वजनिक भारतीय मानकांचे शीर्षक आणि व्याप्ती-सारांश, सार्वजनिक BIS प्रमाणन-योजना दस्तऐवज आणि BIS चे सार्वजनिक FAQ शोधते — ती सर्वसाधारण प्रश्नांची उत्तरे देत नाही. एखादे उत्पादन, साहित्य किंवा मानक क्रमांक वापरून शोधा, उदा. “LED बल्ब”, “स्टेनलेस स्टील भांडी” किंवा “IS 14543”.",
    limitation: "प्रश्न भारतीय मानके, उत्पादन अनुपालन आणि BIS प्रमाणनाच्या कार्यक्षेत्राबाहेर आहे.",
  },
  insufficient_evidence: {
    answer:
      "अनुक्रमित सामग्रीत आढळले नाही. BIS Standards Navigator फक्त सार्वजनिक BIS सामग्रीच्या अनुक्रमित संचामधून उत्तर देते — मानक शीर्षके आणि व्याप्ती-सारांश, प्रमाणन-योजना दस्तऐवज आणि सार्वजनिक FAQ — आणि या प्रश्नाला समर्थन देणारा स्रोत त्या संचात सापडला नाही. यात भारतीय मानकांचा संपूर्ण मजकूर नाही. खाली दाखवलेले कोणतेही मानक केवळ सैलसर संबंधित संदर्भ म्हणून मिळाले आहेत आणि ते लागू असल्याची खात्री नाही.",
    limitation: "या प्रश्नाला आधारभूत उत्तर देणारा कोणताही अनुक्रमित BIS स्रोत नाही; अनुक्रमित सामग्रीत मानकाचा संपूर्ण मजकूर समाविष्ट नाही.",
  },
  not_in_database: {
    answer:
      "ते मानक ओळखले गेले, परंतु त्याचे अधिकृत दस्तऐवज सध्या BIS Standards Navigator मध्ये अनुक्रमित नाही, त्यामुळे त्याच्या आवश्यकता येथे उद्धृत करता येत नाहीत. संपूर्ण मानकासाठी www.bis.gov.in किंवा BIS Standards पोर्टल पहा.",
    limitation: "ओळखलेल्या मानकाचे दस्तऐवज अनुक्रमित सामग्रीत नाही.",
  },
};

const BN: Record<RefusalReason, RefusalCopy> = {
  out_of_scope: {
    answer:
      "এই প্রশ্নটি BIS Standards Navigator-এর আওতার বাইরে। এই পরিষেবাটি সর্বজনীন ভারতীয় মান (Indian Standard)-এর শিরোনাম ও পরিধি-সারাংশ, সর্বজনীন BIS প্রত্যয়ন-প্রকল্প নথি এবং BIS-এর সর্বজনীন FAQ অনুসন্ধান করে — এটি সাধারণ প্রশ্নের উত্তর দেয় না। কোনো পণ্য, উপাদান বা মান নম্বর দিয়ে খুঁজুন, যেমন “LED বাল্ব”, “স্টেইনলেস স্টিল বাসনপত্র” বা “IS 14543”।",
    limitation: "প্রশ্নটি ভারতীয় মান, পণ্য সম্মতি এবং BIS প্রত্যয়নের আওতার বাইরে।",
  },
  insufficient_evidence: {
    answer:
      "সূচিত (indexed) তথ্যভাণ্ডারে পাওয়া যায়নি। BIS Standards Navigator শুধুমাত্র সর্বজনীন BIS উপাদানের একটি সূচিত সেট থেকে উত্তর দেয় — মান শিরোনাম ও পরিধি-সারাংশ, প্রত্যয়ন-প্রকল্প নথি এবং সর্বজনীন FAQ — এবং এই প্রশ্নের উত্তর সমর্থন করে এমন কোনো উৎস সেই সেটে পাওয়া যায়নি। এতে ভারতীয় মানের সম্পূর্ণ পাঠ্য নেই। নিচে তালিকাভুক্ত যেকোনো মান শুধুমাত্র শিথিলভাবে সম্পর্কিত প্রসঙ্গ হিসেবে পাওয়া গেছে এবং প্রযোজ্য বলে নিশ্চিত নয়।",
    limitation: "এই প্রশ্নের একটি সুনিশ্চিত উত্তর সমর্থনকারী কোনো সূচিত BIS উৎস নেই; তথ্যভাণ্ডারে মানের সম্পূর্ণ পাঠ্য অন্তর্ভুক্ত নেই।",
  },
  not_in_database: {
    answer:
      "সেই মানটি শনাক্ত করা হয়েছে, কিন্তু এর প্রামাণিক নথিটি বর্তমানে BIS Standards Navigator-এ সূচিত নয়, তাই এর প্রয়োজনীয়তাগুলো এখানে উদ্ধৃত করা যাচ্ছে না। সম্পূর্ণ মানের জন্য www.bis.gov.in বা BIS Standards পোর্টাল দেখুন।",
    limitation: "শনাক্ত করা মানের নথিটি সূচিত তথ্যভাণ্ডারে নেই।",
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

const COPY_BY_LANGUAGE: Record<AnswerLanguage, Record<RefusalReason, RefusalCopy>> = { en: EN, hi: HI, mr: MR, bn: BN };

export function refusalCopy(reason: RefusalReason, language: AnswerLanguage): RefusalCopy {
  return COPY_BY_LANGUAGE[language][reason];
}
