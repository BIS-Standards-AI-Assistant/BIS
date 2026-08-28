export type LangCode = "en" | "hi";

export interface LanguageOption {
  code: LangCode | string;
  label: string;
  nativeLabel: string;
  available: boolean;
}

/**
 * Only English and Hindi are actually translated — the other entries are
 * listed (as real government portals do) but fall back to English rather
 * than shipping guessed/machine translations of technical BIS terminology.
 */
export const LANGUAGES: LanguageOption[] = [
  { code: "en", label: "English", nativeLabel: "English", available: true },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी", available: true },
  { code: "bn", label: "Bengali", nativeLabel: "বাংলা", available: false },
  { code: "ta", label: "Tamil", nativeLabel: "தமிழ்", available: false },
  { code: "te", label: "Telugu", nativeLabel: "తెలుగు", available: false },
  { code: "mr", label: "Marathi", nativeLabel: "मराठी", available: false },
  { code: "gu", label: "Gujarati", nativeLabel: "ગુજરાતી", available: false },
  { code: "kn", label: "Kannada", nativeLabel: "ಕನ್ನಡ", available: false },
];

export interface Dictionary {
  gov: { skip: string; screenReader: string; theme: string };
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
    heading: string;
    viewAll: string;
    colHash: string;
    colQuery: string;
    colStandards: string;
    colLast: string;
  };
  whatsnew: { heading: string; viewAll: string };
  quicklinks: { heading: string };
  footer: {
    ministryLine1: string;
    ministryLine2: string;
    connect: string;
    rights: string;
    sitemap: string;
    privacy: string;
    terms: string;
    accessibility: string;
    columns: { title: string; body: string; cta: string }[];
  };
}

const en: Dictionary = {
  gov: { skip: "Skip to main content", screenReader: "Screen Reader Access", theme: "Toggle dark mode" },
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
    heading: "Recent Queries",
    viewAll: "View all",
    colHash: "#",
    colQuery: "Query",
    colStandards: "Standards Found",
    colLast: "Last Searched",
  },
  whatsnew: { heading: "What's New", viewAll: "View all" },
  quicklinks: { heading: "Quick Links" },
  footer: {
    ministryLine1: "MINISTRY OF CONSUMER AFFAIRS, FOOD & PUBLIC DISTRIBUTION",
    ministryLine2: "GOVERNMENT OF INDIA",
    connect: "Connect with BIS",
    rights: "Bureau of Indian Standards (BIS). All Rights Reserved.",
    sitemap: "Sitemap",
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
};

const hi: Dictionary = {
  gov: { skip: "मुख्य सामग्री पर जाएं", screenReader: "स्क्रीन रीडर एक्सेस", theme: "डार्क मोड टॉगल करें" },
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
    viewAll: "सभी देखें",
    colHash: "#",
    colQuery: "खोज",
    colStandards: "मेल खाते मानक",
    colLast: "प्रकार",
  },
  whatsnew: { heading: "ज्ञान आधार में शामिल मानक", viewAll: "सभी देखें" },
  quicklinks: { heading: "त्वरित लिंक" },
  footer: {
    ministryLine1: "उपभोक्ता मामले, खाद्य एवं सार्वजनिक वितरण मंत्रालय",
    ministryLine2: "भारत सरकार",
    connect: "बीआईएस से जुड़ें",
    rights: "भारतीय मानक ब्यूरो (BIS)। सर्वाधिकार सुरक्षित।",
    sitemap: "साइटमैप",
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
};

export const DICTIONARIES: Record<LangCode, Dictionary> = { en, hi };
