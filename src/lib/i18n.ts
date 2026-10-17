export type LangCode = "en" | "hi" | "bn" | "ta" | "te" | "mr" | "gu" | "kn";

export interface LanguageOption {
  code: LangCode;
  label: string;
  nativeLabel: string;
  available: boolean;
}

export const LANGUAGES: LanguageOption[] = [
  { code: "en", label: "English", nativeLabel: "English", available: true },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी", available: true },
  { code: "bn", label: "Bengali", nativeLabel: "বাংলা", available: true },
  { code: "ta", label: "Tamil", nativeLabel: "தமிழ்", available: true },
  { code: "te", label: "Telugu", nativeLabel: "తెలుగు", available: true },
  { code: "mr", label: "Marathi", nativeLabel: "मराठी", available: true },
  { code: "gu", label: "Gujarati", nativeLabel: "ગુજરાતી", available: true },
  { code: "kn", label: "Kannada", nativeLabel: "ಕನ್ನಡ", available: true },
];

export interface Dictionary {
  gov: { skip: string; screenReader: string; theme: string; openMenu: string; closeMenu: string };
  header: { tagline: string };
  nav: {
    standards: string;
    certification: string;
    testing: string;
    resources: string;
    eservices: string;
    about: string;
    contact: string;
    search: string;
  };
  hero: {
    titleLine1: string;
    titlePre: string;
    titleHighlight: string;
    subtitle: string;
    searchPlaceholderFull: string;
    searchPlaceholderCompact: string;
    searchButton: string;
    searching: string;
    popularLabel: string;
    popularItems: string[];
  };
  trust: {
    heading: string;
    description: string;
    rows: [string, string, string, string];
  };
  services: {
    heading: string;
    cards: { title: string; description: string }[];
  };
  recent: {
    /** Shown over the example searches, before the reader has any history. */
    heading: string;
    /** Shown once the list is the reader's own searches. */
    headingHistory: string;
    viewAll: string;
    colHash: string;
    colQuery: string;
    colStandards: string;
    colLast: string;
  };
  whatsnew: { heading: string; viewAll: string };
  placeholder: {
    headingWithSources: string;
    headingWithoutSources: string;
    bodyWithSources: string;
    bodyWithoutSources: string;
    sourcesHeading: string;
    sourcesNote: string;
    opensNewTab: string;
    canDoHeading: string;
    browseStandards: string;
    askAbout: string;
    breadcrumbHome: string;
  };
  quicklinks: { heading: string };
  footer: {
    ministryLine1: string;
    ministryLine2: string;
    connect: string;
    rights: string;
    privacy: string;
    terms: string;
    accessibility: string;
    columns: { title: string; body: string; cta: string }[];
  };
  results?: {
    summaryTitle: string;
    summarySubtitle: string;
    candidateStandards: string;
    candidateSubtitle: string;
    verifiedEvidence: string;
    refinePrompt: string;
    refineSubtitle: string;
    refineButton: string;
    searchingRefined: string;
    selectedCount: string;
    viewPassport: string;
    viewStats: string;
    hideStats: string;
    limitations: string;
  };
}

const en: Dictionary = {
  gov: { skip: "Skip to main content", screenReader: "Screen Reader Access", theme: "Toggle dark mode", openMenu: "Open menu", closeMenu: "Close menu" },
  header: { tagline: "The National Standards Body of India" },
  nav: {
    standards: "Standards",
    certification: "Certification",
    testing: "Testing",
    resources: "Resources",
    eservices: "e-Services",
    about: "About BIS",
    contact: "Contact Us",
    search: "Search the site",
  },
  hero: {
    titleLine1: "Find the right Indian Standard",
    titlePre: "for your ",
    titleHighlight: "product, process or service",
    subtitle:
      "AI-powered assistance to discover applicable Indian Standards, certification routes, testing requirements and more — backed by authoritative BIS sources.",
    searchPlaceholderFull: "Describe your product, process or compliance question in simple words...",
    searchPlaceholderCompact: "Describe your product or compliance question…",
    searchButton: "Search",
    searching: "Searching…",
    popularLabel: "Popular searches:",
    popularItems: ["Water Bottle", "LED Bulb", "Pressure Cooker", "Steel Pipes", "Helmets"],
  },
  trust: {
    heading: "Trusted. Authoritative. Reliable.",
    description: "Information directly from BIS standards and official publications.",
    rows: ["Authoritative Standards", "Evidence-backed Answers", "Up-to-date Information", "Secure & Reliable"],
  },
  services: {
    heading: "How can we help you today?",
    cards: [
      { title: "Find Applicable Standards", description: "Discover Indian Standards (IS) applicable to your product or process." },
      { title: "Certification Routes", description: "Understand BIS certification schemes, procedures and requirements." },
      { title: "Testing Requirements", description: "Find relevant test methods, parameters and recognized laboratories." },
      { title: "Compare Standards", description: "Compare two or more standards to understand key differences and similarities." },
    ],
  },
  recent: {
    heading: "Example Searches",
    headingHistory: "Recent Searches",
    viewAll: "View all",
    colHash: "#",
    colQuery: "Query",
    colStandards: "Standards Found",
    colLast: "Last Searched",
  },
  whatsnew: { heading: "What's New", viewAll: "View all" },
  placeholder: {
    headingWithSources: "Not built into this system — here's where BIS publishes it",
    headingWithoutSources: "Not covered by this system yet",
    bodyWithSources:
      "This system doesn't hold this information itself, so rather than show you an invented version, it points you at the official BIS pages that do.",
    bodyWithoutSources:
      "This section is part of the BIS information architecture but isn't populated with real content here yet. We'd rather show you an honest placeholder than invented details.",
    sourcesHeading: "Official BIS sources",
    sourcesNote: "These open on official BIS websites. This system does not mirror or interpret their content.",
    opensNewTab: "(opens in a new tab)",
    canDoHeading: "What this system can do",
    browseStandards: "Browse Standards",
    askAbout: "Ask about a Standard",
    breadcrumbHome: "Home",
  },
  quicklinks: { heading: "Quick Links" },
  footer: {
    ministryLine1: "MINISTRY OF CONSUMER AFFAIRS, FOOD & PUBLIC DISTRIBUTION",
    ministryLine2: "GOVERNMENT OF INDIA",
    connect: "Connect with BIS",
    rights: "Bureau of Indian Standards (BIS). All Rights Reserved.",
    privacy: "Privacy Policy",
    terms: "Terms of Use",
    accessibility: "Accessibility Statement",
    columns: [
      { title: "Know About BIS", body: "Learn about our role, vision, structure and international collaborations.", cta: "Explore →" },
      { title: "Standards Development", body: "Steps in the development of Indian Standards.", cta: "Learn more →" },
      { title: "Publications", body: "Access BIS publications, journals and newsletters.", cta: "Browse →" },
      { title: "Help & Support", body: "FAQs, guides and support for all your queries.", cta: "Get help →" },
    ],
  },
  results: {
    summaryTitle: "STANDARDS SUMMARY",
    summarySubtitle: "Official Synthesis",
    candidateStandards: "Candidate Standards",
    candidateSubtitle: "Ranked by relevance & verified Bureau of Indian Standards evidence",
    verifiedEvidence: "Verified Bureau Evidence",
    refinePrompt: "This answer would be more precise with one more detail",
    refineSubtitle: "Click any recommended specification below to add it directly to your query:",
    refineButton: "Refine Search",
    searchingRefined: "Searching Refined Standards...",
    selectedCount: "selected",
    viewPassport: "View Complete Standard Passport",
    viewStats: "View Stats",
    hideStats: "Hide Stats",
    limitations: "Uncertainty & limitations",
  },
};

const hi: Dictionary = {
  gov: { skip: "मुख्य सामग्री पर जाएं", screenReader: "स्क्रीन रीडर एक्सेस", theme: "डार्क मोड टॉगल करें", openMenu: "मेनू खोलें", closeMenu: "मेनू बंद करें" },
  header: { tagline: "भारत की राष्ट्रीय मानक संस्था" },
  nav: {
    standards: "मानक",
    certification: "प्रमाणन",
    testing: "परीक्षण",
    resources: "संसाधन",
    eservices: "ई-सेवाएं",
    about: "बीआईएस के बारे में",
    contact: "संपर्क करें",
    search: "साइट खोजें",
  },
  hero: {
    titleLine1: "सही भारतीय मानक खोजें",
    titlePre: "अपने ",
    titleHighlight: "उत्पाद, प्रक्रिया या सेवा के लिए",
    subtitle:
      "लागू भारतीय मानकों, प्रमाणन मार्गों, परीक्षण आवश्यकताओं आदि की खोज के लिए AI-संचालित सहायता — विश्वसनीय बीआईएस स्रोतों पर आधारित।",
    searchPlaceholderFull: "अपने उत्पाद, प्रक्रिया या अनुपालन प्रश्न को सरल शब्दों में बताएं...",
    searchPlaceholderCompact: "अपने उत्पाद या अनुपालन प्रश्न को बताएं…",
    searchButton: "खोजें",
    searching: "खोज रहे हैं…",
    popularLabel: "लोकप्रिय खोजें:",
    popularItems: ["पानी की बोतल", "एलईडी बल्ब", "प्रेशर कुकर", "स्टील पाइप", "हेलमेट"],
  },
  trust: {
    heading: "विश्वसनीय। आधिकारिक। भरोसेमंद।",
    description: "बीआईएस मानकों और आधिकारिक प्रकाशनों से सीधी जानकारी।",
    rows: ["आधिकारिक मानक", "प्रमाण-आधारित उत्तर", "अद्यतन जानकारी", "सुरक्षित और भरोसेमंद"],
  },
  services: {
    heading: "आज हम आपकी कैसे मदद कर सकते हैं?",
    cards: [
      { title: "लागू मानक खोजें", description: "अपने उत्पाद या प्रक्रिया पर लागू भारतीय मानक (IS) खोजें।" },
      { title: "प्रमाणन मार्ग", description: "बीआईएस प्रमाणन योजनाओं, प्रक्रियाओं और आवश्यकताओं को समझें।" },
      { title: "परीक्षण आवश्यकताएं", description: "प्रासंगिक परीक्षण विधियां, पैरामीटर और मान्यता प्राप्त प्रयोगशालाएं खोजें।" },
      { title: "मानकों की तुलना करें", description: "मुख्य अंतर और समानताएं समझने के लिए दो या अधिक मानकों की तुलना करें।" },
    ],
  },
  recent: {
    heading: "उदाहरण खोजें",
    headingHistory: "हाल की खोजें",
    viewAll: "सभी देखें",
    colHash: "#",
    colQuery: "खोज",
    colStandards: "मेल खाते मानक",
    colLast: "अंतिम खोज",
  },
  whatsnew: { heading: "ज्ञान आधार में शामिल मानक", viewAll: "सभी देखें" },
  placeholder: {
    headingWithSources: "यह प्रणाली में नहीं है — बीआईएस इसे यहां प्रकाशित करता है",
    headingWithoutSources: "यह जानकारी अभी इस प्रणाली में उपलब्ध नहीं है",
    bodyWithSources:
      "यह जानकारी इस प्रणाली में संग्रहीत नहीं है। अनुमानित विवरण दिखाने के बजाय, यह पृष्ठ आपको बीआईएस के आधिकारिक पृष्ठों तक पहुंचाता है जहां यह जानकारी उपलब्ध है।",
    bodyWithoutSources:
      "यह अनुभाग बीआईएस की सूचना संरचना का हिस्सा है, किंतु यहां अभी वास्तविक सामग्री उपलब्ध नहीं है। मनगढ़ंत विवरण दिखाने के बजाय हम स्पष्ट रूप से यह बताना उचित समझते हैं।",
    sourcesHeading: "आधिकारिक बीआईएस स्रोत",
    sourcesNote:
      "ये लिंक बीआईएस की आधिकारिक वेबसाइटों पर खुलते हैं। यह प्रणाली उनकी सामग्री की प्रतिलिपि या व्याख्या नहीं करती।",
    opensNewTab: "(नए टैब में खुलता है)",
    canDoHeading: "यह प्रणाली क्या कर सकती है",
    browseStandards: "मानक ब्राउज़ करें",
    askAbout: "किसी मानक के बारे में पूछें",
    breadcrumbHome: "होम",
  },
  quicklinks: { heading: "त्वरित लिंक" },
  footer: {
    ministryLine1: "उपभोक्ता मामले, खाद्य एवं सार्वजनिक वितरण मंत्रालय",
    ministryLine2: "भारत सरकार",
    connect: "बीआईएस से जुड़ें",
    rights: "भारतीय मानक ब्यूरो (BIS)। सर्वाधिकार सुरक्षित।",
    privacy: "गोपनीयता नीति",
    terms: "उपयोग की शर्तें",
    accessibility: "पहुंच-योग्यता विवरण",
    columns: [
      { title: "बीआईएस के बारे में जानें", body: "हमारी भूमिका, दृष्टि, संरचना और अंतरराष्ट्रीय सहयोग के बारे में जानें।", cta: "जानें →" },
      { title: "मानक विकास", body: "भारतीय मानकों के विकास के चरण।", cta: "अधिक जानें →" },
      { title: "प्रकाशन", body: "बीआईएस प्रकाशन, पत्रिकाएं और न्यूज़लेटर देखें।", cta: "ब्राउज़ करें →" },
      { title: "सहायता और समर्थन", body: "आपके सभी प्रश्नों के लिए FAQ, गाइड और सहायता।", cta: "सहायता लें →" },
    ],
  },
  results: {
    summaryTitle: "मानक सारांश",
    summarySubtitle: "आधिकारिक संश्लेषण",
    candidateStandards: "उम्मीदवार मानक",
    candidateSubtitle: "प्रासंगिकता और सत्यापित भारतीय मानक ब्यूरो साक्ष्य के अनुसार",
    verifiedEvidence: "सत्यापित ब्यूरो साक्ष्य",
    refinePrompt: "एक और विवरण जोड़ने पर उत्तर अधिक सटीक होगा",
    refineSubtitle: "सीधे अपनी खोज में जोड़ने के लिए नीचे किसी अनुशंसित विनिर्देश पर क्लिक करें:",
    refineButton: "खोज परिष्कृत करें",
    searchingRefined: "परिष्कृत मानक खोजे जा रहे हैं...",
    selectedCount: "चयनित",
    viewPassport: "पूर्ण मानक पासपोर्ट देखें",
    viewStats: "आंकड़े देखें",
    hideStats: "आंकड़े छिपाएं",
    limitations: "अनिश्चितता और सीमाएं",
  },
};

const bn: Dictionary = {
  gov: { skip: "মূল সামগ্রীতে যান", screenReader: "স্ক্রিন রিডার অ্যাক্সেস", theme: "ডার্ক মোড পরিবর্তন করুন", openMenu: "মেনু খুলুন", closeMenu: "মেনু বন্ধ করুন" },
  header: { tagline: "ভারতের জাতীয় মানক সংস্থা" },
  nav: {
    standards: "মানকসমূহ",
    certification: "শংসাপত্র",
    testing: "পরীক্ষণ",
    resources: "সম্পদ",
    eservices: "ই-পরিষেবা",
    about: "বিআইএস সম্পর্কে",
    contact: "যোগাযোগ",
    search: "অনুসন্ধান করুন",
  },
  hero: {
    titleLine1: "সঠিক ভারতীয় মানক খুঁজুন",
    titlePre: "আপনার ",
    titleHighlight: "পণ্য, প্রক্রিয়া বা পরিষেবার জন্য",
    subtitle:
      "প্রযোজ্য ভারতীয় মানক, শংসাপত্রের পথ, পরীক্ষার প্রয়োজনীয়তা এবং আরও অনেক কিছু খুঁজে পেতে এআই-চালিত সহায়তা — বিআইএস-এর প্রামাণিক উৎসের উপর ভিত্তি করে।",
    searchPlaceholderFull: "আপনার পণ্য, প্রক্রিয়া বা সম্মতি-সংক্রান্ত প্রশ্ন সহজ ভাষায় লিখুন...",
    searchPlaceholderCompact: "আপনার পণ্য বা সম্মতি-সংক্রান্ত প্রশ্ন লিখুন…",
    searchButton: "অনুসন্ধান",
    searching: "অনুসন্ধান চলছে…",
    popularLabel: "জনপ্রিয় অনুসন্ধান:",
    popularItems: ["জলের বোতল", "এলইডি বাল্ব", "প্রেশার কুকার", "স্টিলের পাইপ", "হেলমেট"],
  },
  trust: {
    heading: "বিশ্বস্ত। প্রামাণিক। নির্ভরযোগ্য।",
    description: "বিআইএস মানক ও সরকারি প্রকাশনা থেকে সরাসরি তথ্য।",
    rows: ["প্রামাণিক মানক", "প্রমাণ-ভিত্তিক উত্তর", "হালনাগাদ তথ্য", "সুরক্ষিত ও নির্ভরযোগ্য"],
  },
  services: {
    heading: "আজ আমরা আপনাকে কীভাবে সাহায্য করতে পারি?",
    cards: [
      { title: "প্রযোজ্য মানক খুঁজুন", description: "আপনার পণ্য বা প্রক্রিয়ার জন্য প্রযোজ্য ভারতীয় মানক (IS) খুঁজুন।" },
      { title: "শংসাপত্রের পথ", description: "বিআইএস শংসাপত্র প্রকল্প, পদ্ধতি ও প্রয়োজনীয়তা বুঝুন।" },
      { title: "পরীক্ষার প্রয়োজনীয়তা", description: "প্রাসঙ্গিক পরীক্ষা পদ্ধতি, মাপকাঠি এবং স্বীকৃত পরীক্ষাগার খুঁজুন।" },
      { title: "মানক তুলনা করুন", description: "মূল পার্থক্য ও মিল বুঝতে দুই বা ততোধিক মানক তুলনা করুন।" },
    ],
  },
  recent: {
    heading: "উদাহরণ অনুসন্ধান",
    headingHistory: "সাম্প্রতিক অনুসন্ধান",
    viewAll: "সব দেখুন",
    colHash: "#",
    colQuery: "অনুসন্ধান",
    colStandards: "প্রাপ্ত মানক",
    colLast: "শেষ অনুসন্ধান",
  },
  whatsnew: { heading: "নির্বাচিত মানক", viewAll: "সব দেখুন" },
  placeholder: {
    headingWithSources: "এই ব্যবস্থায় নেই — বিআইএস এটি এখানে প্রকাশ করে",
    headingWithoutSources: "এই ব্যবস্থায় এখনও অন্তর্ভুক্ত নয়",
    bodyWithSources:
      "এই ব্যবস্থা নিজে এই তথ্য রাখে না, তাই বানানো তথ্য দেখানোর বদলে এটি আপনাকে বিআইএস-এর সেই সরকারি পৃষ্ঠাগুলিতে নিয়ে যায় যেখানে তথ্যটি আছে।",
    bodyWithoutSources:
      "এই অংশটি বিআইএস-এর তথ্য কাঠামোর অংশ, কিন্তু এখানে এখনও প্রকৃত বিষয়বস্তু যোগ করা হয়নি। বানানো বিবরণ দেখানোর চেয়ে আমরা সৎভাবে এটি জানানো শ্রেয় মনে করি।",
    sourcesHeading: "বিআইএস-এর সরকারি উৎস",
    sourcesNote: "এগুলি বিআইএস-এর সরকারি ওয়েবসাইটে খোলে। এই ব্যবস্থা তাদের বিষয়বস্তু অনুলিপি বা ব্যাখ্যা করে না।",
    opensNewTab: "(নতুন ট্যাবে খোলে)",
    canDoHeading: "এই ব্যবস্থা কী করতে পারে",
    browseStandards: "মানক দেখুন",
    askAbout: "কোনো মানক সম্পর্কে জিজ্ঞাসা করুন",
    breadcrumbHome: "হোম",
  },
  quicklinks: { heading: "দ্রুত লিঙ্ক" },
  footer: {
    ministryLine1: "ভোক্তা বিষয়ক, খাদ্য ও গণবণ্টন মন্ত্রক",
    ministryLine2: "ভারত সরকার",
    connect: "বিআইএস-এর সঙ্গে যুক্ত থাকুন",
    rights: "ভারতীয় মানক ব্যুরো (বিআইএস)। সর্বস্বত্ব সংরক্ষিত।",
    privacy: "গোপনীয়তা নীতি",
    terms: "ব্যবহারের শর্তাবলি",
    accessibility: "অভিগম্যতা বিবৃতি",
    columns: [
      { title: "বিআইএস সম্পর্কে জানুন", body: "আমাদের ভূমিকা, লক্ষ্য, কাঠামো ও আন্তর্জাতিক সহযোগিতা সম্পর্কে জানুন।", cta: "দেখুন →" },
      { title: "মানক প্রণয়ন", body: "ভারতীয় মানক প্রণয়নের ধাপসমূহ।", cta: "আরও জানুন →" },
      { title: "প্রকাশনা", body: "বিআইএস-এর প্রকাশনা, পত্রিকা ও নিউজলেটার দেখুন।", cta: "দেখুন →" },
      { title: "সহায়তা", body: "আপনার সব প্রশ্নের জন্য প্রায়শই জিজ্ঞাসিত প্রশ্ন, নির্দেশিকা ও সহায়তা।", cta: "সাহায্য নিন →" },
    ],
  },
  results: {
    summaryTitle: "মানক সারাংশ",
    summarySubtitle: "প্রামাণিক সংশ্লেষণ",
    candidateStandards: "সম্ভাব্য মানক",
    candidateSubtitle: "প্রাসঙ্গিকতা ও যাচাইকৃত ভারতীয় মানক ব্যুরোর প্রমাণ অনুযায়ী সাজানো",
    verifiedEvidence: "যাচাইকৃত ব্যুরো প্রমাণ",
    refinePrompt: "আর একটি বিবরণ যোগ করলে এই উত্তর আরও নির্ভুল হবে",
    refineSubtitle: "সরাসরি আপনার প্রশ্নে যোগ করতে নিচের যেকোনো প্রস্তাবিত বিবরণে ক্লিক করুন:",
    refineButton: "অনুসন্ধান পরিমার্জন করুন",
    searchingRefined: "পরিমার্জিত মানক খোঁজা হচ্ছে...",
    selectedCount: "নির্বাচিত",
    viewPassport: "সম্পূর্ণ মানক পাসপোর্ট দেখুন",
    viewStats: "পরিসংখ্যান দেখুন",
    hideStats: "পরিসংখ্যান লুকান",
    limitations: "অনিশ্চয়তা ও সীমাবদ্ধতা",
  },
};

const ta: Dictionary = {
  gov: { skip: "முக்கிய பகுதிக்கு செல்லவும்", screenReader: "திரை வாசிப்பான் வசதி", theme: "டார்க் மோட் மாற்றவும்", openMenu: "மெனுவைத் திறக்கவும்", closeMenu: "மெனுவை மூடவும்" },
  header: { tagline: "இந்தியாவின் தேசிய தர நிர்ணய அமைப்பு" },
  nav: {
    standards: "தரநிலைகள்",
    certification: "சான்றிதழ்",
    testing: "பரிசோதனை",
    resources: "வளங்கள்",
    eservices: "மின்-சேவைகள்",
    about: "பிஐஎஸ் பற்றி",
    contact: "தொடர்புக்கு",
    search: "தேடுக",
  },
  hero: {
    titleLine1: "சரியான இந்திய தரநிலையை கண்டறியவும்",
    titlePre: "உங்கள் ",
    titleHighlight: "தயாரிப்பு, செயல்முறை அல்லது சேவைக்கு",
    subtitle:
      "பொருந்தக்கூடிய இந்திய தரநிலைகள், சான்றிதழ் வழிமுறைகள், சோதனைத் தேவைகள் மற்றும் பலவற்றைக் கண்டறிய AI உதவி — அதிகாரப்பூர்வ பிஐஎஸ் ஆதாரங்களின் அடிப்படையில்.",
    searchPlaceholderFull: "உங்கள் தயாரிப்பு, செயல்முறை அல்லது இணக்கக் கேள்வியை எளிய சொற்களில் விவரிக்கவும்...",
    searchPlaceholderCompact: "உங்கள் தயாரிப்பு அல்லது இணக்கக் கேள்வியை விவரிக்கவும்…",
    searchButton: "தேடு",
    searching: "தேடுகிறது…",
    popularLabel: "பிரபலமான தேடல்கள்:",
    popularItems: ["தண்ணீர் பாட்டில்", "எல்இடி பல்பு", "பிரஷர் குக்கர்", "எஃகுக் குழாய்கள்", "தலைக்கவசங்கள்"],
  },
  trust: {
    heading: "நம்பகமானது. அதிகாரப்பூர்வமானது. உறுதியானது.",
    description: "பிஐஎஸ் தரநிலைகள் மற்றும் அதிகாரப்பூர்வ வெளியீடுகளிலிருந்து நேரடித் தகவல்.",
    rows: ["அதிகாரப்பூர்வ தரநிலைகள்", "ஆதாரம் சார்ந்த பதில்கள்", "புதுப்பிக்கப்பட்ட தகவல்", "பாதுகாப்பானது & நம்பகமானது"],
  },
  services: {
    heading: "இன்று நாங்கள் உங்களுக்கு எப்படி உதவலாம்?",
    cards: [
      { title: "பொருந்தும் தரநிலைகளைக் கண்டறியவும்", description: "உங்கள் தயாரிப்பு அல்லது செயல்முறைக்குப் பொருந்தும் இந்திய தரநிலைகளை (IS) கண்டறியவும்." },
      { title: "சான்றிதழ் வழிமுறைகள்", description: "பிஐஎஸ் சான்றிதழ் திட்டங்கள், நடைமுறைகள் மற்றும் தேவைகளைப் புரிந்துகொள்ளுங்கள்." },
      { title: "சோதனைத் தேவைகள்", description: "தொடர்புடைய சோதனை முறைகள், அளவுருக்கள் மற்றும் அங்கீகரிக்கப்பட்ட ஆய்வகங்களைக் கண்டறியவும்." },
      { title: "தரநிலைகளை ஒப்பிடுக", description: "முக்கிய வேறுபாடுகளையும் ஒற்றுமைகளையும் புரிந்துகொள்ள இரண்டு அல்லது அதற்கு மேற்பட்ட தரநிலைகளை ஒப்பிடுங்கள்." },
    ],
  },
  recent: {
    heading: "எடுத்துக்காட்டுத் தேடல்கள்",
    headingHistory: "சமீபத்திய தேடல்கள்",
    viewAll: "அனைத்தையும் காண்க",
    colHash: "#",
    colQuery: "தேடல்",
    colStandards: "கண்டறிந்த தரநிலைகள்",
    colLast: "கடைசியாகத் தேடியது",
  },
  whatsnew: { heading: "சிறப்புத் தரநிலைகள்", viewAll: "அனைத்தையும் காண்க" },
  placeholder: {
    headingWithSources: "இந்த அமைப்பில் இல்லை — பிஐஎஸ் இதை இங்கே வெளியிடுகிறது",
    headingWithoutSources: "இந்த அமைப்பில் இன்னும் சேர்க்கப்படவில்லை",
    bodyWithSources:
      "இந்தத் தகவல் இந்த அமைப்பில் இல்லை. எனவே புனையப்பட்ட தகவலைக் காட்டுவதற்குப் பதிலாக, இத்தகவல் உள்ள அதிகாரப்பூர்வ பிஐஎஸ் பக்கங்களுக்கு உங்களை வழிநடத்துகிறது.",
    bodyWithoutSources:
      "இந்தப் பகுதி பிஐஎஸ் தகவல் கட்டமைப்பின் ஒரு பகுதியாகும், ஆனால் இங்கு இன்னும் உண்மையான உள்ளடக்கம் சேர்க்கப்படவில்லை. புனையப்பட்ட விவரங்களைக் காட்டுவதைவிட நேர்மையாகத் தெரிவிப்பதையே நாங்கள் விரும்புகிறோம்.",
    sourcesHeading: "அதிகாரப்பூர்வ பிஐஎஸ் ஆதாரங்கள்",
    sourcesNote: "இவை அதிகாரப்பூர்வ பிஐஎஸ் இணையதளங்களில் திறக்கும். இந்த அமைப்பு அவற்றின் உள்ளடக்கத்தை நகலெடுப்பதோ விளக்குவதோ இல்லை.",
    opensNewTab: "(புதிய தாவலில் திறக்கும்)",
    canDoHeading: "இந்த அமைப்பு என்ன செய்ய முடியும்",
    browseStandards: "தரநிலைகளை உலாவுக",
    askAbout: "ஒரு தரநிலை பற்றிக் கேளுங்கள்",
    breadcrumbHome: "முகப்பு",
  },
  quicklinks: { heading: "விரைவு இணைப்புகள்" },
  footer: {
    ministryLine1: "நுகர்வோர் விவகாரங்கள், உணவு மற்றும் பொது விநியோக அமைச்சகம்",
    ministryLine2: "இந்திய அரசு",
    connect: "பிஐஎஸ் உடன் இணையுங்கள்",
    rights: "இந்திய தர நிர்ணய பணியகம் (பிஐஎஸ்). அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை.",
    privacy: "தனியுரிமைக் கொள்கை",
    terms: "பயன்பாட்டு விதிமுறைகள்",
    accessibility: "அணுகல்தன்மை அறிக்கை",
    columns: [
      { title: "பிஐஎஸ் பற்றி அறிக", body: "எங்கள் பங்கு, நோக்கம், கட்டமைப்பு மற்றும் சர்வதேச ஒத்துழைப்புகள் பற்றி அறிக.", cta: "ஆராய்க →" },
      { title: "தரநிலை உருவாக்கம்", body: "இந்திய தரநிலைகளை உருவாக்கும் படிநிலைகள்.", cta: "மேலும் அறிக →" },
      { title: "வெளியீடுகள்", body: "பிஐஎஸ் வெளியீடுகள், இதழ்கள் மற்றும் செய்திமடல்களைப் பார்க்கவும்.", cta: "உலாவுக →" },
      { title: "உதவி & ஆதரவு", body: "உங்கள் எல்லாக் கேள்விகளுக்கும் அடிக்கடி கேட்கப்படும் கேள்விகள், வழிகாட்டிகள் மற்றும் உதவி.", cta: "உதவி பெறுக →" },
    ],
  },
  results: {
    summaryTitle: "தரநிலைகள் சுருக்கம்",
    summarySubtitle: "அதிகாரப்பூர்வத் தொகுப்பு",
    candidateStandards: "பரிசீலனைக்குரிய தரநிலைகள்",
    candidateSubtitle: "பொருத்தம் மற்றும் சரிபார்க்கப்பட்ட இந்திய தர நிர்ணய பணியக ஆதாரங்களின்படி வரிசைப்படுத்தப்பட்டது",
    verifiedEvidence: "சரிபார்க்கப்பட்ட பணியக ஆதாரம்",
    refinePrompt: "இன்னும் ஒரு விவரம் சேர்த்தால் இந்தப் பதில் மேலும் துல்லியமாக இருக்கும்",
    refineSubtitle: "உங்கள் தேடலில் நேரடியாகச் சேர்க்க கீழே உள்ள பரிந்துரைக்கப்பட்ட விவரக்குறிப்பைக் கிளிக் செய்யவும்:",
    refineButton: "தேடலைச் செம்மைப்படுத்து",
    searchingRefined: "செம்மைப்படுத்தப்பட்ட தரநிலைகள் தேடப்படுகின்றன...",
    selectedCount: "தேர்ந்தெடுக்கப்பட்டவை",
    viewPassport: "முழுமையான தரநிலை பாஸ்போர்ட்டைக் காண்க",
    viewStats: "புள்ளிவிவரங்களைக் காண்க",
    hideStats: "புள்ளிவிவரங்களை மறை",
    limitations: "நிச்சயமின்மை & வரம்புகள்",
  },
};

const te: Dictionary = {
  gov: { skip: "ప్రధాన విషయానికి వెళ్లండి", screenReader: "స్క్రీన్ రీడర్ సదుపాయం", theme: "డార్క్ మోడ్ మార్చండి", openMenu: "మెనూ తెరవండి", closeMenu: "మెనూ మూసివేయండి" },
  header: { tagline: "భారత జాతీయ ప్రమాణాల సంస్థ" },
  nav: {
    standards: "ప్రమాణాలు",
    certification: "ధృవీకరణ",
    testing: "పరీక్షలు",
    resources: "వనరులు",
    eservices: "ఈ-సేవలు",
    about: "బీఐఎస్ గురించి",
    contact: "సంప్రదించండి",
    search: "వెతకండి",
  },
  hero: {
    titleLine1: "సరైన భారతీయ ప్రమాణాన్ని కనుగొనండి",
    titlePre: "మీ ",
    titleHighlight: "ఉత్పత్తి, ప్రక్రియ లేదా సేవ కోసం",
    subtitle:
      "వర్తించే భారతీయ ప్రమాణాలు, ధృవీకరణ మార్గాలు, పరీక్ష అవసరాలు మరియు మరిన్నింటిని కనుగొనడానికి AI ఆధారిత సహాయం — అధికారిక బీఐఎస్ మూలాల ఆధారంగా.",
    searchPlaceholderFull: "మీ ఉత్పత్తి, ప్రక్రియ లేదా అనుగుణ్యత ప్రశ్నను సులభమైన మాటల్లో వివరించండి...",
    searchPlaceholderCompact: "మీ ఉత్పత్తి లేదా అనుగుణ్యత ప్రశ్నను వివరించండి…",
    searchButton: "శోధించండి",
    searching: "శోధిస్తోంది…",
    popularLabel: "ప్రసిద్ధ శోధనలు:",
    popularItems: ["నీటి సీసా", "ఎల్ఈడీ బల్బు", "ప్రెషర్ కుక్కర్", "ఉక్కు పైపులు", "హెల్మెట్లు"],
  },
  trust: {
    heading: "విశ్వసనీయం. అధికారికం. నమ్మదగినది.",
    description: "బీఐఎస్ ప్రమాణాలు మరియు అధికారిక ప్రచురణల నుండి నేరుగా సమాచారం.",
    rows: ["అధికారిక ప్రమాణాలు", "ఆధారాలతో కూడిన సమాధానాలు", "తాజా సమాచారం", "సురక్షితం & నమ్మదగినది"],
  },
  services: {
    heading: "ఈ రోజు మేము మీకు ఎలా సహాయపడగలం?",
    cards: [
      { title: "వర్తించే ప్రమాణాలను కనుగొనండి", description: "మీ ఉత్పత్తి లేదా ప్రక్రియకు వర్తించే భారతీయ ప్రమాణాలను (IS) కనుగొనండి." },
      { title: "ధృవీకరణ మార్గాలు", description: "బీఐఎస్ ధృవీకరణ పథకాలు, విధానాలు మరియు అవసరాలను అర్థం చేసుకోండి." },
      { title: "పరీక్ష అవసరాలు", description: "సంబంధిత పరీక్షా పద్ధతులు, పరామితులు మరియు గుర్తింపు పొందిన ప్రయోగశాలలను కనుగొనండి." },
      { title: "ప్రమాణాలను పోల్చండి", description: "ముఖ్యమైన తేడాలు మరియు సారూప్యతలను అర్థం చేసుకోవడానికి రెండు లేదా అంతకంటే ఎక్కువ ప్రమాణాలను పోల్చండి." },
    ],
  },
  recent: {
    heading: "ఉదాహరణ శోధనలు",
    headingHistory: "ఇటీవలి శోధనలు",
    viewAll: "అన్నీ చూడండి",
    colHash: "#",
    colQuery: "శోధన",
    colStandards: "కనుగొన్న ప్రమాణాలు",
    colLast: "చివరి శోధన",
  },
  whatsnew: { heading: "ఎంపిక చేసిన ప్రమాణాలు", viewAll: "అన్నీ చూడండి" },
  placeholder: {
    headingWithSources: "ఈ వ్యవస్థలో లేదు — బీఐఎస్ దీన్ని ఇక్కడ ప్రచురిస్తుంది",
    headingWithoutSources: "ఈ వ్యవస్థలో ఇంకా అందుబాటులో లేదు",
    bodyWithSources:
      "ఈ సమాచారం ఈ వ్యవస్థలో నిల్వ లేదు. కల్పిత సమాచారం చూపడానికి బదులుగా, ఈ సమాచారం ఉన్న అధికారిక బీఐఎస్ పేజీలకు ఇది మిమ్మల్ని తీసుకెళ్తుంది.",
    bodyWithoutSources:
      "ఈ విభాగం బీఐఎస్ సమాచార నిర్మాణంలో భాగం, కానీ ఇక్కడ ఇంకా నిజమైన సమాచారం చేర్చబడలేదు. కల్పిత వివరాలు చూపడం కంటే నిజాయితీగా తెలియజేయడమే మేము మేలని భావిస్తాము.",
    sourcesHeading: "అధికారిక బీఐఎస్ మూలాలు",
    sourcesNote: "ఇవి అధికారిక బీఐఎస్ వెబ్‌సైట్లలో తెరుచుకుంటాయి. ఈ వ్యవస్థ వాటి కంటెంట్‌ను నకలు చేయదు లేదా వ్యాఖ్యానించదు.",
    opensNewTab: "(కొత్త ట్యాబ్‌లో తెరుచుకుంటుంది)",
    canDoHeading: "ఈ వ్యవస్థ ఏమి చేయగలదు",
    browseStandards: "ప్రమాణాలను బ్రౌజ్ చేయండి",
    askAbout: "ఒక ప్రమాణం గురించి అడగండి",
    breadcrumbHome: "హోమ్",
  },
  quicklinks: { heading: "త్వరిత లింకులు" },
  footer: {
    ministryLine1: "వినియోగదారుల వ్యవహారాలు, ఆహార & ప్రజా పంపిణీ మంత్రిత్వ శాఖ",
    ministryLine2: "భారత ప్రభుత్వం",
    connect: "బీఐఎస్‌తో అనుసంధానం అవ్వండి",
    rights: "బ్యూరో ఆఫ్ ఇండియన్ స్టాండర్డ్స్ (బీఐఎస్). సర్వహక్కులు ప్రత్యేకించబడ్డాయి.",
    privacy: "గోప్యతా విధానం",
    terms: "వినియోగ నిబంధనలు",
    accessibility: "ప్రాప్యత ప్రకటన",
    columns: [
      { title: "బీఐఎస్ గురించి తెలుసుకోండి", body: "మా పాత్ర, దార్శనికత, నిర్మాణం మరియు అంతర్జాతీయ సహకారాల గురించి తెలుసుకోండి.", cta: "అన్వేషించండి →" },
      { title: "ప్రమాణాల రూపకల్పన", body: "భారతీయ ప్రమాణాల రూపకల్పనలోని దశలు.", cta: "మరింత తెలుసుకోండి →" },
      { title: "ప్రచురణలు", body: "బీఐఎస్ ప్రచురణలు, పత్రికలు మరియు వార్తాలేఖలను చూడండి.", cta: "బ్రౌజ్ చేయండి →" },
      { title: "సహాయం & మద్దతు", body: "మీ అన్ని ప్రశ్నలకు తరచుగా అడిగే ప్రశ్నలు, మార్గదర్శకాలు మరియు సహాయం.", cta: "సహాయం పొందండి →" },
    ],
  },
  results: {
    summaryTitle: "ప్రమాణాల సారాంశం",
    summarySubtitle: "అధికారిక సంగ్రహం",
    candidateStandards: "పరిశీలనలోని ప్రమాణాలు",
    candidateSubtitle: "ఔచిత్యం మరియు ధృవీకరించబడిన భారతీయ ప్రమాణాల బ్యూరో ఆధారాల ప్రకారం క్రమబద్ధీకరించబడింది",
    verifiedEvidence: "ధృవీకరించబడిన బ్యూరో ఆధారాలు",
    refinePrompt: "మరొక వివరం జోడిస్తే ఈ సమాధానం మరింత ఖచ్చితంగా ఉంటుంది",
    refineSubtitle: "మీ శోధనకు నేరుగా జోడించడానికి క్రింది సిఫార్సు చేసిన వివరణలలో దేనిపైనైనా క్లిక్ చేయండి:",
    refineButton: "శోధనను మెరుగుపరచండి",
    searchingRefined: "మెరుగుపరచిన ప్రమాణాల కోసం శోధిస్తోంది...",
    selectedCount: "ఎంచుకున్నవి",
    viewPassport: "పూర్తి ప్రమాణ పాస్‌పోర్ట్ చూడండి",
    viewStats: "గణాంకాలు చూడండి",
    hideStats: "గణాంకాలు దాచండి",
    limitations: "అనిశ్చితి & పరిమితులు",
  },
};

const mr: Dictionary = {
  gov: { skip: "मुख्य मजकुराकडे जा", screenReader: "स्क्रीन रीडर ऍक्सेस", theme: "डार्क मोड टॉगल करा", openMenu: "मेनू उघडा", closeMenu: "मेनू बंद करा" },
  header: { tagline: "भारताची राष्ट्रीय मानक संस्था" },
  nav: {
    standards: "मानके",
    certification: "प्रमाणीकरण",
    testing: "चाचणी",
    resources: "संसाधने",
    eservices: "ई-सेवा",
    about: "बीआयएस बद्दल",
    contact: "संपर्क साधा",
    search: "शोधा",
  },
  hero: {
    titleLine1: "योग्य भारतीय मानक शोधा",
    titlePre: "आपल्या ",
    titleHighlight: "उत्पादन, प्रक्रिया किंवा सेवेसाठी",
    subtitle:
      "लागू भारतीय मानके, प्रमाणीकरण मार्ग, चाचणी आवश्यकता आणि बरेच काही शोधण्यासाठी AI-आधारित सहाय्य — अधिकृत बीआयएस स्रोतांवर आधारित.",
    searchPlaceholderFull: "आपले उत्पादन, प्रक्रिया किंवा अनुपालनविषयक प्रश्न सोप्या शब्दांत सांगा...",
    searchPlaceholderCompact: "आपले उत्पादन किंवा अनुपालनविषयक प्रश्न सांगा…",
    searchButton: "शोधा",
    searching: "शोधत आहे…",
    popularLabel: "लोकप्रिय शोध:",
    popularItems: ["पाण्याची बाटली", "एलईडी बल्ब", "प्रेशर कुकर", "स्टीलचे पाईप", "हेल्मेट"],
  },
  trust: {
    heading: "विश्वसनीय. अधिकृत. खात्रीशीर.",
    description: "बीआयएस मानके आणि अधिकृत प्रकाशनांमधून थेट माहिती.",
    rows: ["अधिकृत मानके", "पुराव्यावर आधारित उत्तरे", "अद्ययावत माहिती", "सुरक्षित आणि विश्वसनीय"],
  },
  services: {
    heading: "आज आम्ही आपली कशी मदत करू शकतो?",
    cards: [
      { title: "लागू मानके शोधा", description: "आपल्या उत्पादन किंवा प्रक्रियेला लागू असलेली भारतीय मानके (IS) शोधा." },
      { title: "प्रमाणीकरण मार्ग", description: "बीआयएस प्रमाणीकरण योजना, कार्यपद्धती आणि आवश्यकता समजून घ्या." },
      { title: "चाचणी आवश्यकता", description: "संबंधित चाचणी पद्धती, मापदंड आणि मान्यताप्राप्त प्रयोगशाळा शोधा." },
      { title: "मानकांची तुलना करा", description: "मुख्य फरक आणि साम्य समजून घेण्यासाठी दोन किंवा अधिक मानकांची तुलना करा." },
    ],
  },
  recent: {
    heading: "उदाहरण शोध",
    headingHistory: "अलीकडील शोध",
    viewAll: "सर्व पहा",
    colHash: "#",
    colQuery: "शोध",
    colStandards: "आढळलेली मानके",
    colLast: "शेवटचा शोध",
  },
  whatsnew: { heading: "निवडक मानके", viewAll: "सर्व पहा" },
  placeholder: {
    headingWithSources: "या प्रणालीत उपलब्ध नाही — बीआयएस ही माहिती येथे प्रकाशित करते",
    headingWithoutSources: "या प्रणालीत अद्याप समाविष्ट नाही",
    bodyWithSources:
      "ही माहिती या प्रणालीत साठवलेली नाही. त्यामुळे काल्पनिक माहिती दाखवण्याऐवजी, ही माहिती जिथे उपलब्ध आहे त्या अधिकृत बीआयएस पृष्ठांकडे हे आपल्याला नेते.",
    bodyWithoutSources:
      "हा विभाग बीआयएसच्या माहिती रचनेचा भाग आहे, परंतु येथे अद्याप प्रत्यक्ष माहिती भरलेली नाही. काल्पनिक तपशील दाखवण्यापेक्षा प्रामाणिकपणे सांगणे आम्हाला योग्य वाटते.",
    sourcesHeading: "अधिकृत बीआयएस स्रोत",
    sourcesNote: "हे दुवे बीआयएसच्या अधिकृत संकेतस्थळांवर उघडतात. ही प्रणाली त्यांच्या मजकुराची प्रत करत नाही किंवा अर्थ लावत नाही.",
    opensNewTab: "(नवीन टॅबमध्ये उघडते)",
    canDoHeading: "ही प्रणाली काय करू शकते",
    browseStandards: "मानके पहा",
    askAbout: "एखाद्या मानकाबद्दल विचारा",
    breadcrumbHome: "मुख्यपृष्ठ",
  },
  quicklinks: { heading: "जलद दुवे" },
  footer: {
    ministryLine1: "ग्राहक व्यवहार, अन्न आणि सार्वजनिक वितरण मंत्रालय",
    ministryLine2: "भारत सरकार",
    connect: "बीआयएसशी जोडलेले राहा",
    rights: "भारतीय मानक ब्युरो (बीआयएस). सर्व हक्क राखीव.",
    privacy: "गोपनीयता धोरण",
    terms: "वापराच्या अटी",
    accessibility: "सुलभता निवेदन",
    columns: [
      { title: "बीआयएसबद्दल जाणून घ्या", body: "आमची भूमिका, दृष्टी, रचना आणि आंतरराष्ट्रीय सहकार्याबद्दल जाणून घ्या.", cta: "पहा →" },
      { title: "मानक विकास", body: "भारतीय मानकांच्या विकासाचे टप्पे.", cta: "अधिक जाणून घ्या →" },
      { title: "प्रकाशने", body: "बीआयएस प्रकाशने, नियतकालिके आणि वृत्तपत्रे पहा.", cta: "पहा →" },
      { title: "मदत आणि सहाय्य", body: "आपल्या सर्व प्रश्नांसाठी नेहमी विचारले जाणारे प्रश्न, मार्गदर्शिका आणि सहाय्य.", cta: "मदत मिळवा →" },
    ],
  },
  results: {
    summaryTitle: "मानक सारांश",
    summarySubtitle: "अधिकृत संश्लेषण",
    candidateStandards: "संभाव्य मानके",
    candidateSubtitle: "प्रासंगिकता आणि सत्यापित भारतीय मानक ब्युरो पुराव्यानुसार क्रमवारी",
    verifiedEvidence: "सत्यापित ब्युरो पुरावा",
    refinePrompt: "आणखी एक तपशील दिल्यास हे उत्तर अधिक अचूक होईल",
    refineSubtitle: "थेट आपल्या शोधात जोडण्यासाठी खालीलपैकी कोणत्याही शिफारस केलेल्या तपशिलावर क्लिक करा:",
    refineButton: "शोध अधिक नेमका करा",
    searchingRefined: "नेमकी मानके शोधत आहे...",
    selectedCount: "निवडलेली",
    viewPassport: "संपूर्ण मानक पासपोर्ट पहा",
    viewStats: "आकडेवारी पहा",
    hideStats: "आकडेवारी लपवा",
    limitations: "अनिश्चितता आणि मर्यादा",
  },
};

const gu: Dictionary = {
  gov: { skip: "મુખ્ય સામગ્રી પર જાઓ", screenReader: "સ્ક્રીન રીડર એક્સેસ", theme: "ડાર્ક મોડ બદલો", openMenu: "મેનૂ ખોલો", closeMenu: "મેનૂ બંધ કરો" },
  header: { tagline: "ભારતની રાષ્ટ્રીય માનક સંસ્થા" },
  nav: {
    standards: "માનકો",
    certification: "પ્રમાણીકરણ",
    testing: "પરીક્ષણ",
    resources: "સંસાધનો",
    eservices: "ઈ-સેવાઓ",
    about: "બીઆઈએસ વિશે",
    contact: "સંપર્ક કરો",
    search: "શોધો",
  },
  hero: {
    titleLine1: "યોગ્ય ભારતીય માનક શોધો",
    titlePre: "તમારા ",
    titleHighlight: "ઉત્પાદન, પ્રક્રિયા અથવા સેવા માટે",
    subtitle:
      "લાગુ પડતા ભારતીય માનકો, પ્રમાણીકરણ માર્ગો, પરીક્ષણ આવશ્યકતાઓ અને વધુ શોધવા માટે AI-આધારિત સહાય — અધિકૃત બીઆઈએસ સ્રોતો પર આધારિત.",
    searchPlaceholderFull: "તમારા ઉત્પાદન, પ્રક્રિયા અથવા અનુપાલન સંબંધિત પ્રશ્નનું સરળ શબ્દોમાં વર્ણન કરો...",
    searchPlaceholderCompact: "તમારા ઉત્પાદન અથવા અનુપાલન પ્રશ્નનું વર્ણન કરો…",
    searchButton: "શોધો",
    searching: "શોધી રહ્યું છે…",
    popularLabel: "લોકપ્રિય શોધ:",
    popularItems: ["પાણીની બોટલ", "એલઈડી બલ્બ", "પ્રેશર કૂકર", "સ્ટીલની પાઇપ", "હેલ્મેટ"],
  },
  trust: {
    heading: "વિશ્વસનીય. અધિકૃત. ભરોસાપાત્ર.",
    description: "બીઆઈએસ માનકો અને સત્તાવાર પ્રકાશનોમાંથી સીધી માહિતી.",
    rows: ["અધિકૃત માનકો", "પુરાવા-આધારિત જવાબો", "અદ્યતન માહિતી", "સુરક્ષિત અને ભરોસાપાત્ર"],
  },
  services: {
    heading: "આજે અમે તમારી કેવી રીતે મદદ કરી શકીએ?",
    cards: [
      { title: "લાગુ પડતા માનકો શોધો", description: "તમારા ઉત્પાદન અથવા પ્રક્રિયાને લાગુ પડતા ભારતીય માનકો (IS) શોધો." },
      { title: "પ્રમાણીકરણ માર્ગો", description: "બીઆઈએસ પ્રમાણીકરણ યોજનાઓ, પ્રક્રિયાઓ અને આવશ્યકતાઓ સમજો." },
      { title: "પરીક્ષણ આવશ્યકતાઓ", description: "સંબંધિત પરીક્ષણ પદ્ધતિઓ, માપદંડો અને માન્યતાપ્રાપ્ત પ્રયોગશાળાઓ શોધો." },
      { title: "માનકોની સરખામણી કરો", description: "મુખ્ય તફાવતો અને સમાનતાઓ સમજવા માટે બે કે વધુ માનકોની સરખામણી કરો." },
    ],
  },
  recent: {
    heading: "ઉદાહરણ શોધ",
    headingHistory: "તાજેતરની શોધ",
    viewAll: "બધું જુઓ",
    colHash: "#",
    colQuery: "શોધ",
    colStandards: "મળેલા માનકો",
    colLast: "છેલ્લી શોધ",
  },
  whatsnew: { heading: "પસંદગીના માનકો", viewAll: "બધું જુઓ" },
  placeholder: {
    headingWithSources: "આ સિસ્ટમમાં નથી — બીઆઈએસ તેને અહીં પ્રકાશિત કરે છે",
    headingWithoutSources: "આ સિસ્ટમમાં હજી સમાવિષ્ટ નથી",
    bodyWithSources:
      "આ માહિતી આ સિસ્ટમમાં સંગ્રહિત નથી. તેથી કાલ્પનિક માહિતી બતાવવાને બદલે, તે તમને બીઆઈએસનાં એવાં સત્તાવાર પૃષ્ઠો પર લઈ જાય છે જ્યાં આ માહિતી ઉપલબ્ધ છે.",
    bodyWithoutSources:
      "આ વિભાગ બીઆઈએસની માહિતી રચનાનો ભાગ છે, પરંતુ અહીં હજી વાસ્તવિક સામગ્રી ઉમેરાઈ નથી. કાલ્પનિક વિગતો બતાવવા કરતાં પ્રામાણિકપણે જણાવવું અમે વધુ યોગ્ય માનીએ છીએ.",
    sourcesHeading: "સત્તાવાર બીઆઈએસ સ્રોતો",
    sourcesNote: "આ લિંક બીઆઈએસની સત્તાવાર વેબસાઇટ પર ખૂલે છે. આ સિસ્ટમ તેમની સામગ્રીની નકલ કે અર્થઘટન કરતી નથી.",
    opensNewTab: "(નવા ટૅબમાં ખૂલે છે)",
    canDoHeading: "આ સિસ્ટમ શું કરી શકે છે",
    browseStandards: "માનકો જુઓ",
    askAbout: "કોઈ માનક વિશે પૂછો",
    breadcrumbHome: "હોમ",
  },
  quicklinks: { heading: "ઝડપી લિંક" },
  footer: {
    ministryLine1: "ગ્રાહક બાબતો, ખાદ્ય અને જાહેર વિતરણ મંત્રાલય",
    ministryLine2: "ભારત સરકાર",
    connect: "બીઆઈએસ સાથે જોડાઓ",
    rights: "ભારતીય માનક બ્યુરો (બીઆઈએસ). સર્વાધિકાર સુરક્ષિત.",
    privacy: "ગોપનીયતા નીતિ",
    terms: "ઉપયોગની શરતો",
    accessibility: "સુલભતા નિવેદન",
    columns: [
      { title: "બીઆઈએસ વિશે જાણો", body: "અમારી ભૂમિકા, દ્રષ્ટિ, માળખું અને આંતરરાષ્ટ્રીય સહયોગ વિશે જાણો.", cta: "જુઓ →" },
      { title: "માનક વિકાસ", body: "ભારતીય માનકોના વિકાસના તબક્કા.", cta: "વધુ જાણો →" },
      { title: "પ્રકાશનો", body: "બીઆઈએસ પ્રકાશનો, સામયિકો અને ન્યૂઝલેટર જુઓ.", cta: "જુઓ →" },
      { title: "મદદ અને સહાય", body: "તમારા બધા પ્રશ્નો માટે વારંવાર પૂછાતા પ્રશ્નો, માર્ગદર્શિકાઓ અને સહાય.", cta: "મદદ મેળવો →" },
    ],
  },
  results: {
    summaryTitle: "માનકોનો સારાંશ",
    summarySubtitle: "અધિકૃત સંકલન",
    candidateStandards: "સંભવિત માનકો",
    candidateSubtitle: "પ્રાસંગિકતા અને ચકાસાયેલા ભારતીય માનક બ્યુરોના પુરાવા મુજબ ક્રમાંકિત",
    verifiedEvidence: "ચકાસાયેલા બ્યુરો પુરાવા",
    refinePrompt: "વધુ એક વિગત ઉમેરવાથી આ જવાબ વધુ ચોક્કસ બનશે",
    refineSubtitle: "તમારી શોધમાં સીધું ઉમેરવા માટે નીચેની કોઈપણ ભલામણ કરેલી વિગત પર ક્લિક કરો:",
    refineButton: "શોધ સુધારો",
    searchingRefined: "સુધારેલા માનકો શોધી રહ્યા છીએ...",
    selectedCount: "પસંદ કરેલા",
    viewPassport: "સંપૂર્ણ માનક પાસપોર્ટ જુઓ",
    viewStats: "આંકડા જુઓ",
    hideStats: "આંકડા છુપાવો",
    limitations: "અનિશ્ચિતતા અને મર્યાદાઓ",
  },
};

const kn: Dictionary = {
  gov: { skip: "ಮುಖ್ಯ ವಿಷಯಕ್ಕೆ ಹೋಗಿ", screenReader: "ಸ್ಕ್ರೀನ್ ರೀಡರ್ ಪ್ರವೇಶ", theme: "ಡಾರ್ಕ್ ಮೋಡ್ ಬದಲಿಸಿ", openMenu: "ಮೆನು ತೆರೆಯಿರಿ", closeMenu: "ಮೆನು ಮುಚ್ಚಿರಿ" },
  header: { tagline: "ಭಾರತದ ರಾಷ್ಟ್ರೀಯ ಮಾನದಂಡಗಳ ಸಂಸ್ಥೆ" },
  nav: {
    standards: "ಮಾನದಂಡಗಳು",
    certification: "ಪ್ರಮಾಣೀಕರಣ",
    testing: "ಪರೀಕ್ಷೆ",
    resources: "ಸಂಪನ್ಮೂಲಗಳು",
    eservices: "ಇ-ಸೇವೆಗಳು",
    about: "ಬಿಐಎಸ್ ಬಗ್ಗೆ",
    contact: "ಸಂಪರ್ಕಿಸಿ",
    search: "ಹುಡುಕಿ",
  },
  hero: {
    titleLine1: "ಸರಿಯಾದ ಭಾರತೀಯ ಮಾನದಂಡವನ್ನು ಹುಡುಕಿ",
    titlePre: "ನಿಮ್ಮ ",
    titleHighlight: "ಉತ್ಪನ್ನ, ಪ್ರಕ್ರಿಯೆ ಅಥವಾ ಸೇವೆಗಾಗಿ",
    subtitle:
      "ಅನ್ವಯವಾಗುವ ಭಾರತೀಯ ಮಾನದಂಡಗಳು, ಪ್ರಮಾಣೀಕರಣ ಮಾರ್ಗಗಳು, ಪರೀಕ್ಷಾ ಅಗತ್ಯತೆಗಳು ಮತ್ತು ಇನ್ನಷ್ಟನ್ನು ಅನ್ವೇಷಿಸಲು AI-ಚಾಲಿತ ನೆರವು — ಅಧಿಕೃತ ಬಿಐಎಸ್ ಮೂಲಗಳನ್ನು ಆಧರಿಸಿದೆ.",
    searchPlaceholderFull: "ನಿಮ್ಮ ಉತ್ಪನ್ನ, ಪ್ರಕ್ರಿಯೆ ಅಥವಾ ಅನುಸರಣೆಯ ಪ್ರಶ್ನೆಯನ್ನು ಸರಳ ಪದಗಳಲ್ಲಿ ವಿವರಿಸಿ...",
    searchPlaceholderCompact: "ನಿಮ್ಮ ಉತ್ಪನ್ನ ಅಥವಾ ಅನುಸರಣೆಯ ಪ್ರಶ್ನೆಯನ್ನು ವಿವರಿಸಿ…",
    searchButton: "ಹುಡುಕಿ",
    searching: "ಹುಡುಕಲಾಗುತ್ತಿದೆ…",
    popularLabel: "ಜನಪ್ರಿಯ ಹುಡುಕಾಟಗಳು:",
    popularItems: ["ನೀರಿನ ಬಾಟಲಿ", "ಎಲ್ಇಡಿ ಬಲ್ಬ್", "ಪ್ರೆಶರ್ ಕುಕ್ಕರ್", "ಉಕ್ಕಿನ ಪೈಪ್‌ಗಳು", "ಹೆಲ್ಮೆಟ್‌ಗಳು"],
  },
  trust: {
    heading: "ವಿಶ್ವಾಸಾರ್ಹ. ಅಧಿಕೃತ. ನಂಬಲರ್ಹ.",
    description: "ಬಿಐಎಸ್ ಮಾನದಂಡಗಳು ಮತ್ತು ಅಧಿಕೃತ ಪ್ರಕಟಣೆಗಳಿಂದ ನೇರ ಮಾಹಿತಿ.",
    rows: ["ಅಧಿಕೃತ ಮಾನದಂಡಗಳು", "ಪುರಾವೆ ಆಧಾರಿತ ಉತ್ತರಗಳು", "ನವೀಕೃತ ಮಾಹಿತಿ", "ಸುರಕ್ಷಿತ ಮತ್ತು ನಂಬಲರ್ಹ"],
  },
  services: {
    heading: "ಇಂದು ನಾವು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?",
    cards: [
      { title: "ಅನ್ವಯವಾಗುವ ಮಾನದಂಡಗಳನ್ನು ಹುಡುಕಿ", description: "ನಿಮ್ಮ ಉತ್ಪನ್ನ ಅಥವಾ ಪ್ರಕ್ರಿಯೆಗೆ ಅನ್ವಯವಾಗುವ ಭಾರತೀಯ ಮಾನದಂಡಗಳನ್ನು (IS) ಹುಡುಕಿ." },
      { title: "ಪ್ರಮಾಣೀಕರಣ ಮಾರ್ಗಗಳು", description: "ಬಿಐಎಸ್ ಪ್ರಮಾಣೀಕರಣ ಯೋಜನೆಗಳು, ಕಾರ್ಯವಿಧಾನಗಳು ಮತ್ತು ಅಗತ್ಯತೆಗಳನ್ನು ಅರ್ಥಮಾಡಿಕೊಳ್ಳಿ." },
      { title: "ಪರೀಕ್ಷಾ ಅಗತ್ಯತೆಗಳು", description: "ಸಂಬಂಧಿತ ಪರೀಕ್ಷಾ ವಿಧಾನಗಳು, ನಿಯತಾಂಕಗಳು ಮತ್ತು ಮಾನ್ಯತೆ ಪಡೆದ ಪ್ರಯೋಗಾಲಯಗಳನ್ನು ಹುಡುಕಿ." },
      { title: "ಮಾನದಂಡಗಳನ್ನು ಹೋಲಿಸಿ", description: "ಮುಖ್ಯ ವ್ಯತ್ಯಾಸಗಳು ಮತ್ತು ಹೋಲಿಕೆಗಳನ್ನು ಅರ್ಥಮಾಡಿಕೊಳ್ಳಲು ಎರಡು ಅಥವಾ ಹೆಚ್ಚಿನ ಮಾನದಂಡಗಳನ್ನು ಹೋಲಿಸಿ." },
    ],
  },
  recent: {
    heading: "ಉದಾಹರಣೆ ಹುಡುಕಾಟಗಳು",
    headingHistory: "ಇತ್ತೀಚಿನ ಹುಡುಕಾಟಗಳು",
    viewAll: "ಎಲ್ಲವನ್ನೂ ನೋಡಿ",
    colHash: "#",
    colQuery: "ಹುಡುಕಾಟ",
    colStandards: "ಕಂಡುಬಂದ ಮಾನದಂಡಗಳು",
    colLast: "ಕೊನೆಯ ಹುಡುಕಾಟ",
  },
  whatsnew: { heading: "ಆಯ್ದ ಮಾನದಂಡಗಳು", viewAll: "ಎಲ್ಲವನ್ನೂ ನೋಡಿ" },
  placeholder: {
    headingWithSources: "ಈ ವ್ಯವಸ್ಥೆಯಲ್ಲಿ ಇಲ್ಲ — ಬಿಐಎಸ್ ಇದನ್ನು ಇಲ್ಲಿ ಪ್ರಕಟಿಸುತ್ತದೆ",
    headingWithoutSources: "ಈ ವ್ಯವಸ್ಥೆಯಲ್ಲಿ ಇನ್ನೂ ಒಳಗೊಂಡಿಲ್ಲ",
    bodyWithSources:
      "ಈ ಮಾಹಿತಿ ಈ ವ್ಯವಸ್ಥೆಯಲ್ಲಿ ಸಂಗ್ರಹವಾಗಿಲ್ಲ. ಆದ್ದರಿಂದ ಕಲ್ಪಿತ ಮಾಹಿತಿಯನ್ನು ತೋರಿಸುವ ಬದಲು, ಈ ಮಾಹಿತಿ ಲಭ್ಯವಿರುವ ಅಧಿಕೃತ ಬಿಐಎಸ್ ಪುಟಗಳಿಗೆ ಇದು ನಿಮ್ಮನ್ನು ಕರೆದೊಯ್ಯುತ್ತದೆ.",
    bodyWithoutSources:
      "ಈ ವಿಭಾಗವು ಬಿಐಎಸ್ ಮಾಹಿತಿ ರಚನೆಯ ಭಾಗವಾಗಿದೆ, ಆದರೆ ಇಲ್ಲಿ ಇನ್ನೂ ನೈಜ ವಿಷಯವನ್ನು ಸೇರಿಸಲಾಗಿಲ್ಲ. ಕಲ್ಪಿತ ವಿವರಗಳನ್ನು ತೋರಿಸುವುದಕ್ಕಿಂತ ಪ್ರಾಮಾಣಿಕವಾಗಿ ತಿಳಿಸುವುದೇ ಸೂಕ್ತವೆಂದು ನಾವು ಭಾವಿಸುತ್ತೇವೆ.",
    sourcesHeading: "ಅಧಿಕೃತ ಬಿಐಎಸ್ ಮೂಲಗಳು",
    sourcesNote: "ಇವು ಅಧಿಕೃತ ಬಿಐಎಸ್ ಜಾಲತಾಣಗಳಲ್ಲಿ ತೆರೆಯುತ್ತವೆ. ಈ ವ್ಯವಸ್ಥೆ ಅವುಗಳ ವಿಷಯವನ್ನು ನಕಲಿಸುವುದಿಲ್ಲ ಅಥವಾ ವ್ಯಾಖ್ಯಾನಿಸುವುದಿಲ್ಲ.",
    opensNewTab: "(ಹೊಸ ಟ್ಯಾಬ್‌ನಲ್ಲಿ ತೆರೆಯುತ್ತದೆ)",
    canDoHeading: "ಈ ವ್ಯವಸ್ಥೆ ಏನು ಮಾಡಬಲ್ಲದು",
    browseStandards: "ಮಾನದಂಡಗಳನ್ನು ನೋಡಿ",
    askAbout: "ಒಂದು ಮಾನದಂಡದ ಬಗ್ಗೆ ಕೇಳಿ",
    breadcrumbHome: "ಮುಖಪುಟ",
  },
  quicklinks: { heading: "ತ್ವರಿತ ಲಿಂಕ್‌ಗಳು" },
  footer: {
    ministryLine1: "ಗ್ರಾಹಕ ವ್ಯವಹಾರಗಳು, ಆಹಾರ ಮತ್ತು ಸಾರ್ವಜನಿಕ ವಿತರಣಾ ಸಚಿವಾಲಯ",
    ministryLine2: "ಭಾರತ ಸರ್ಕಾರ",
    connect: "ಬಿಐಎಸ್ ಜೊತೆ ಸಂಪರ್ಕದಲ್ಲಿರಿ",
    rights: "ಭಾರತೀಯ ಮಾನಕ ಬ್ಯೂರೋ (ಬಿಐಎಸ್). ಎಲ್ಲ ಹಕ್ಕುಗಳನ್ನು ಕಾಯ್ದಿರಿಸಲಾಗಿದೆ.",
    privacy: "ಗೌಪ್ಯತಾ ನೀತಿ",
    terms: "ಬಳಕೆಯ ನಿಯಮಗಳು",
    accessibility: "ಪ್ರವೇಶಸಾಧ್ಯತೆ ಹೇಳಿಕೆ",
    columns: [
      { title: "ಬಿಐಎಸ್ ಬಗ್ಗೆ ತಿಳಿಯಿರಿ", body: "ನಮ್ಮ ಪಾತ್ರ, ದೃಷ್ಟಿ, ರಚನೆ ಮತ್ತು ಅಂತರರಾಷ್ಟ್ರೀಯ ಸಹಯೋಗಗಳ ಬಗ್ಗೆ ತಿಳಿಯಿರಿ.", cta: "ಅನ್ವೇಷಿಸಿ →" },
      { title: "ಮಾನದಂಡ ಅಭಿವೃದ್ಧಿ", body: "ಭಾರತೀಯ ಮಾನದಂಡಗಳ ಅಭಿವೃದ್ಧಿಯ ಹಂತಗಳು.", cta: "ಇನ್ನಷ್ಟು ತಿಳಿಯಿರಿ →" },
      { title: "ಪ್ರಕಟಣೆಗಳು", body: "ಬಿಐಎಸ್ ಪ್ರಕಟಣೆಗಳು, ನಿಯತಕಾಲಿಕೆಗಳು ಮತ್ತು ಸುದ್ದಿಪತ್ರಗಳನ್ನು ನೋಡಿ.", cta: "ನೋಡಿ →" },
      { title: "ಸಹಾಯ ಮತ್ತು ಬೆಂಬಲ", body: "ನಿಮ್ಮ ಎಲ್ಲಾ ಪ್ರಶ್ನೆಗಳಿಗೆ ಪದೇ ಪದೇ ಕೇಳಲಾಗುವ ಪ್ರಶ್ನೆಗಳು, ಮಾರ್ಗದರ್ಶಿಗಳು ಮತ್ತು ಸಹಾಯ.", cta: "ಸಹಾಯ ಪಡೆಯಿರಿ →" },
    ],
  },
  results: {
    summaryTitle: "ಮಾನದಂಡಗಳ ಸಾರಾಂಶ",
    summarySubtitle: "ಅಧಿಕೃತ ಸಂಶ್ಲೇಷಣೆ",
    candidateStandards: "ಸಂಭಾವ್ಯ ಮಾನದಂಡಗಳು",
    candidateSubtitle: "ಪ್ರಸ್ತುತತೆ ಮತ್ತು ಪರಿಶೀಲಿಸಿದ ಭಾರತೀಯ ಮಾನಕ ಬ್ಯೂರೋ ಪುರಾವೆಗಳ ಪ್ರಕಾರ ಶ್ರೇಣೀಕರಿಸಲಾಗಿದೆ",
    verifiedEvidence: "ಪರಿಶೀಲಿಸಿದ ಬ್ಯೂರೋ ಪುರಾವೆ",
    refinePrompt: "ಇನ್ನೊಂದು ವಿವರ ಸೇರಿಸಿದರೆ ಈ ಉತ್ತರ ಇನ್ನಷ್ಟು ನಿಖರವಾಗಿರುತ್ತದೆ",
    refineSubtitle: "ನಿಮ್ಮ ಹುಡುಕಾಟಕ್ಕೆ ನೇರವಾಗಿ ಸೇರಿಸಲು ಕೆಳಗಿನ ಯಾವುದೇ ಶಿಫಾರಸು ಮಾಡಿದ ವಿವರಣೆಯ ಮೇಲೆ ಕ್ಲಿಕ್ ಮಾಡಿ:",
    refineButton: "ಹುಡುಕಾಟವನ್ನು ಪರಿಷ್ಕರಿಸಿ",
    searchingRefined: "ಪರಿಷ್ಕೃತ ಮಾನದಂಡಗಳನ್ನು ಹುಡುಕಲಾಗುತ್ತಿದೆ...",
    selectedCount: "ಆಯ್ಕೆ ಮಾಡಲಾಗಿದೆ",
    viewPassport: "ಸಂಪೂರ್ಣ ಮಾನದಂಡ ಪಾಸ್‌ಪೋರ್ಟ್ ನೋಡಿ",
    viewStats: "ಅಂಕಿಅಂಶಗಳನ್ನು ನೋಡಿ",
    hideStats: "ಅಂಕಿಅಂಶಗಳನ್ನು ಮರೆಮಾಡಿ",
    limitations: "ಅನಿಶ್ಚಿತತೆ ಮತ್ತು ಮಿತಿಗಳು",
  },
};

export const DICTIONARIES: Record<LangCode, Dictionary> = {
  en,
  hi,
  bn,
  ta,
  te,
  mr,
  gu,
  kn,
};
