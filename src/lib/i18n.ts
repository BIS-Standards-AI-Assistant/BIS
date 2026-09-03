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
  ...en,
  gov: { skip: "মূল সামগ্রীতে যান", screenReader: "স্ক্রিন রিডার অ্যাক্সেস", theme: "ডার্ক মোড পরিবর্তন করুন" },
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
    ...en.hero,
    titleLine1: "সঠিক ভারতীয় মানক খুঁজুন",
    titlePre: "আপনার ",
    titleHighlight: "পণ্য, প্রক্রিয়া বা পরিষেবার জন্য",
    subtitle: "প্রযোজ্য ভারতীয় মানক, শংসাপত্র এবং পরীক্ষার প্রয়োজনীয়তা আবিষ্কার করার জন্য এআই-চালিত সহায়তা।",
    searchButton: "অনুসন্ধান",
    searching: "অনুসন্ধান চলছে…",
  },
  footer: {
    ...en.footer,
    ministryLine1: "ভোক্তা বিষয়ক, খাদ্য ও গণবণ্টন মন্ত্রক",
    ministryLine2: "ভারত সরকার",
    rights: "ভারতীয় মানক ব্যুরো (বিআইএস)। সর্বস্বত্ব সংরক্ষিত।",
  },
};

const ta: Dictionary = {
  ...en,
  gov: { skip: "முக்கிய பகுதிக்கு செல்லவும்", screenReader: "திரை வாசிப்பான் வசதி", theme: "டார்க் மோட் மாற்றவும்" },
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
    ...en.hero,
    titleLine1: "சரியான இந்திய தரநிலையை கண்டறியவும்",
    titlePre: "உங்கள் ",
    titleHighlight: "தயாரிப்பு, செயல்முறை அல்லது சேவைக்கு",
    subtitle: "பொருந்தக்கூடிய இந்திய தரநிலைகள், சான்றிதழ் முறைகள் மற்றும் சோதனை தேவைகளை அறிய AI உதவி.",
    searchButton: "தேடு",
    searching: "தேடுகிறது…",
  },
  footer: {
    ...en.footer,
    ministryLine1: "நுகர்வோர் விவகாரங்கள், உணவு மற்றும் பொது விநியோக அமைச்சகம்",
    ministryLine2: "இந்திய அரசு",
    rights: "இந்திய தர நிர்ணய பணியகம் (பிஐஎஸ்). அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை.",
  },
};

const te: Dictionary = {
  ...en,
  gov: { skip: "ప్రధాన విషయానికి వెళ్లండి", screenReader: "స్క్రీన్ రీడర్ సదుపాయం", theme: "డార్క్ మోడ్ మార్చండి" },
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
    ...en.hero,
    titleLine1: "సరైన భారతీయ ప్రమాణాన్ని కనుగొనండి",
    titlePre: "మీ ",
    titleHighlight: "ఉత్పత్తి, ప్రక్రియ లేదా సేవ కోసం",
    subtitle: "వర్తించే భారతీయ ప్రమాణాలు మరియు పరీక్ష అవసరాలను తెలుసుకోవడానికి AI ఆధారిత సహాయం.",
    searchButton: "శోధించండి",
    searching: "శోధిస్తోంది…",
  },
  footer: {
    ...en.footer,
    ministryLine1: "వినియోగదారుల వ్యవహారాలు, ఆహార & ప్రజా పంపిణీ మంత్రిత్వ శాఖ",
    ministryLine2: "భారత ప్రభుత్వం",
    rights: "బ్యూరో ఆఫ్ ఇండియన్ స్టాండర్డ్స్ (బీఐఎస్). సర్వహక్కులు ప్రత్యేకించబడ్డాయి.",
  },
};

const mr: Dictionary = {
  ...en,
  gov: { skip: "मुख्य मजकुराकडे जा", screenReader: "स्क्रीन रीडर ऍक्सेस", theme: "डार्क मोड टॉगल करा" },
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
    ...en.hero,
    titleLine1: "योग्य भारतीय मानक शोधा",
    titlePre: "आपल्या ",
    titleHighlight: "उत्पादन, प्रक्रिया किंवा सेवेसाठी",
    subtitle: "लागू भारतीय मानके, प्रमाणीकरण आणि चाचणी आवश्यकता शोधण्यासाठी AI सहाय्य.",
    searchButton: "शोधा",
    searching: "शोधत आहे…",
  },
  footer: {
    ...en.footer,
    ministryLine1: "ग्राहक व्यवहार, अन्न आणि सार्वजनिक वितरण मंत्रालय",
    ministryLine2: "भारत सरकार",
    rights: "भारतीय मानक ब्युरो (बीआयएस). सर्व हक्क राखीव.",
  },
};

const gu: Dictionary = {
  ...en,
  gov: { skip: "મુખ્ય સામગ્રી પર જાઓ", screenReader: "સ્ક્રીન રીડર એક્સેસ", theme: "ડાર્ક મોડ બદલો" },
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
    ...en.hero,
    titleLine1: "યોગ્ય ભારતીય માનક શોધો",
    titlePre: "તમારા ",
    titleHighlight: "ઉત્પાદન, પ્રક્રિયા અથવા સેવા માટે",
    subtitle: "લાગુ પડતા ભારતીય ધોરણો અને પરીક્ષણ આવશ્યકતાઓ શોધવા માટે AI-આધારિત સહાય.",
    searchButton: "શોધો",
    searching: "શોધી રહ્યું છે…",
  },
  footer: {
    ...en.footer,
    ministryLine1: "ગ્રાહક બાબતો, ખાદ્ય અને જાહેર વિતરણ મંત્રાલય",
    ministryLine2: "ભારત સરકાર",
    rights: "ભારતીય માનક બ્યુરો (બીઆઈએસ). સર્વાધિકાર સુરક્ષિત.",
  },
};

const kn: Dictionary = {
  ...en,
  gov: { skip: "ಮುಖ್ಯ ವಿಷಯಕ್ಕೆ ಹೋಗಿ", screenReader: "ಸ್ಕ್ರೀನ್ ರೀಡರ್ ಪ್ರವೇಶ", theme: "ಡಾರ್ಕ್ ಮೋಡ್ ಬದಲಿಸಿ" },
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
    ...en.hero,
    titleLine1: "ಸರಿಯಾದ ಭಾರತೀಯ ಮಾನದಂಡವನ್ನು ಹುಡುಕಿ",
    titlePre: "ನಿಮ್ಮ ",
    titleHighlight: "ಉತ್ಪನ್ನ, ಪ್ರಕ್ರಿಯೆ ಅಥವಾ ಸೇವೆಗಾಗಿ",
    subtitle: "ಅನ್ವಯವಾಗುವ ಭಾರತೀಯ ಮಾನದಂಡಗಳು ಮತ್ತು ಪರೀಕ್ಷಾ ಅಗತ್ಯತೆಗಳನ್ನು ಅನ್ವೇಷಿಸಲು AI-ಚಾಲಿತ ನೆರವು.",
    searchButton: "ಹುಡುಕಿ",
    searching: "ಹುಡುಕಲಾಗುತ್ತಿದೆ…",
  },
  footer: {
    ...en.footer,
    ministryLine1: "ಗ್ರಾಹಕ ವ್ಯವಹಾರಗಳು, ಆಹಾರ ಮತ್ತು ಸಾರ್ವಜನಿಕ ವಿತರಣಾ ಸಚಿವಾಲಯ",
    ministryLine2: "ಭಾರತ ಸರ್ಕಾರ",
    rights: "ಭಾರತೀಯ ಮಾನಕ ಬ್ಯೂರೋ (ಬಿಐಎಸ್). ಎಲ್ಲ ಹಕ್ಕುಗಳನ್ನು ಕಾಯ್ದಿರಿಸಲಾಗಿದೆ.",
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
