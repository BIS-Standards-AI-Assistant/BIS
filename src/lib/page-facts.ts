/**
 * Real, sourced factual content for the section pages.
 *
 * This is the counterpart to src/lib/official-links.ts: that file says
 * *where* to read about a topic, this one says what BIS actually states
 * about it, so a page answers its own heading instead of only pointing
 * elsewhere.
 *
 * Every point here is a restatement of something published on the cited
 * BIS page, read from that page on the `retrieved` date. Rules:
 *
 *  - Nothing here may be written from background knowledge. If it isn't on
 *    the cited page, it doesn't go in. This is the same non-negotiable that
 *    governs the rest of the app: no invented standards, routes, fees,
 *    requirements, or statistics.
 *  - Prefer BIS's own framing and terminology over paraphrase that could
 *    drift in meaning ("Standard Mark under a Licence or Certificate of
 *    Conformity", not "BIS approval").
 *  - Keep figures that BIS itself dates or versions (a notification date, a
 *    regulation year) and attribute them, rather than stating them bare.
 *  - Anything time-sensitive (fee amounts, product counts, lists that change)
 *    stays as a pointer to the live source rather than being copied here,
 *    where it would silently go stale.
 *  - `retrieved` is when a human/agent actually read the page. Re-read before
 *    changing it.
 */

export interface PageFacts {
  /** Short factual statements, each supported by the cited source. */
  points: string[];
  /** The BIS page these points were read from. */
  source: { label: string; href: string };
  /** ISO date the source was last read. */
  retrieved: string;
}

const BIS = "https://www.bis.gov.in";
const en = (path: string) => `${BIS}/${path}/?lang=en`;

const READ_ON = "2026-09-02";

/** Keyed by `${sectionKey}:${slug}`, matching src/lib/official-links.ts. */
const FACTS: Record<string, PageFacts> = {
  // ------------------------------------------------------------ certification
  "certification:find": {
    points: [
      "BIS product certification is voluntary by default. It becomes compulsory only where the Central Government brings a product under a Quality Control Order (QCO).",
      "The grounds the Central Government uses to make certification compulsory are public interest, protection of human, animal or plant health, safety of the environment, prevention of unfair trade practices, and national security.",
      "Where a QCO applies, the product must carry the Standard Mark under either a Licence or a Certificate of Conformity (CoC) issued by BIS.",
      "Compulsory products are organised across four schemes: Scheme-I (Mark Scheme), Scheme-II (Registration Scheme), Scheme-IV (Certificate of Conformity) and Scheme-X.",
    ],
    source: { label: "Products under Compulsory Certification", href: en("product-certification/products-under-compulsory-certification") },
    retrieved: READ_ON,
  },

  "certification:product": {
    points: [
      "Product certification lets a manufacturer apply the BIS Standard Mark to a product that conforms to the relevant Indian Standard.",
      "The scheme is voluntary in nature; compulsion comes only from a Quality Control Order issued by the Central Government for a particular product.",
      "Scheme-I of the BIS (Conformity Assessment) Regulations, 2018 governs use of the Standard Mark. Scheme-IV governs the grant of a Certificate of Conformity instead.",
      "BIS publishes product-specific material separately from the scheme rules: product manuals, the Scheme of Inspection and Testing, and grouping guidelines.",
    ],
    source: { label: "Product Certification Overview", href: en("product-certification/product-certification-overview") },
    retrieved: READ_ON,
  },

  "certification:process": {
    points: [
      "The governing instrument is the BIS (Conformity Assessment) Regulations, 2018 — Scheme-I for use of the Standard Mark, Scheme-IV for a Certificate of Conformity.",
      "BIS publishes separate guidelines for each stage rather than one combined procedure: grant of licence, renewal, change in scope, retesting of samples, and operation of the licence.",
      "Separate guidelines also cover what happens when things go wrong — product non-conformity, unsatisfactory performance other than product non-conformity, suspension and revocation.",
      "Oversight after grant is split into factory surveillance and market surveillance, each with its own published guideline.",
      "MSMEs have a specific published route for testing: guidelines for using a Cluster Based Test Facility (CBTF).",
    ],
    source: { label: "Product Certification Process", href: en("product-certification/product-certification-process") },
    retrieved: READ_ON,
  },

  "certification:management-systems": {
    points: [
      "BIS has operated management systems certification since 1991, starting with Quality Management System certification to IS/ISO 9001.",
      "The scheme now covers, among others: environmental management (IS/ISO 14001), food safety (IS/ISO 22000), energy management (IS/ISO 50001), occupational health and safety (IS 18001 and IS/ISO 45001), and service quality management (IS 15700).",
      "It also covers HACCP (IS 15000), medical devices (IS/ISO 13485 and IS 23485), social accountability at the workplace (IS/ISO 16001), road traffic safety (IS/ISO 39001), adventure tourism safety (IS/ISO 21101:2014) and anti-bribery management (IS/ISO 37001:2016).",
      "Some sector schemes combine two standards: ready mixed concrete is certified to ISO 9001 together with IS 4926, and packaged pasteurized milk to IS 13688 together with ISO 22000.",
    ],
    source: { label: "System Certification Overview", href: en("system-certification-overview") },
    retrieved: READ_ON,
  },

  "certification:foreign-manufacturers": {
    points: [
      "BIS has operated the Foreign Manufacturers Certification Scheme (FMCS) since 2000, under the BIS Act, 2016 and the rules and regulations framed under it.",
      "Under FMCS a licence is granted to a foreign manufacturer to use the Standard Mark on a product that conforms to an Indian Standard.",
      "FMCS applies to all products except Electronics & IT goods notified by MeitY — those go through the Compulsory Registration Scheme (CRS) instead.",
      "Licences are granted by the Foreign Manufacturers Certification Department (FMCD) at BIS headquarters in New Delhi.",
    ],
    source: { label: "FMCS Overview", href: en("fmcs/fmcs-overview") },
    retrieved: READ_ON,
  },

  "certification:hallmarking": {
    points: [
      "Hallmarking is the accurate determination and official recording of the proportionate content of precious metal in a precious metal article — an official guarantee of purity or fineness.",
      "Its stated objectives are to protect the public against adulteration and to oblige manufacturers to maintain legal standards of fineness.",
      "Two precious metals are currently within the scheme in India: gold and silver.",
      "A jeweller applies for registration online at manakonline.in. The certificate of registration is granted instantly, with no document upload and no fee, and is valid for lifetime.",
      "Recognition of an Assaying and Hallmarking Centre is governed by IS 15820:2009.",
    ],
    source: { label: "Hallmarking Overview", href: en("hallmarking-overview") },
    retrieved: READ_ON,
  },

  "certification:registration-schemes": {
    points: [
      "Scheme-II of the BIS (Conformity Assessment) Regulations, 2018 is the Registration Scheme, distinct from the Scheme-I Mark Scheme.",
      "The Compulsory Registration Scheme (CRS) covers Electronics & IT goods in the product categories notified by MeitY.",
      "Jeweller registration for selling hallmarked gold and silver is a separate registration route, applied for online and granted without fee for lifetime validity.",
    ],
    source: { label: "Products under Compulsory Certification", href: en("product-certification/products-under-compulsory-certification") },
    retrieved: READ_ON,
  },

  "certification:schemes/crs": {
    points: [
      "CRS is BIS's Compulsory Registration Scheme for Electronics & IT goods, covering the product categories notified by MeitY.",
      "It is operated separately from FMCS: a foreign manufacturer of electronics and IT goods registers under CRS rather than applying for an FMCS licence.",
      "CRS registration is handled on its own portal (crsbis.in) rather than through the main BIS certification portal.",
    ],
    source: { label: "FMCS Overview (which sets out the CRS boundary)", href: en("fmcs/fmcs-overview") },
    retrieved: READ_ON,
  },

  "certification:schemes/product": {
    points: [
      "Products under compulsory certification are grouped by scheme: Scheme-I (Mark Scheme), Scheme-II (Registration Scheme), Scheme-IV (Certificate of Conformity) and Scheme-X.",
      "Scheme-I covers use of the Standard Mark under a licence; Scheme-IV covers grant of a Certificate of Conformity for a consignment or lot rather than continuous production.",
      "BIS publishes a Guidance Document on Quality Control Orders explaining how a product comes to be covered.",
      "It also publishes a list of upcoming QCOs that are notified and due for implementation, so a manufacturer can see what is coming before it applies.",
    ],
    source: { label: "Products under Compulsory Certification", href: en("product-certification/products-under-compulsory-certification") },
    retrieved: READ_ON,
  },

  "certification:fees": {
    points: [
      "There is no single BIS fee schedule. Product certification (Scheme-I), management systems certification (MSCS) and foreign manufacturers certification (FMCS) each publish their own.",
      "For Scheme-I, the charge for using the Standard Mark is the marking fee, set per Indian Standard — BIS provides a search to look up the marking fee for a given standard.",
      "The marking fee was notified on 5 August 2021 and has been amended many times since; BIS publishes each amendment as a separate dated notification rather than only a consolidated figure.",
      "A consolidated document, 'Marking Fee for all Products under Certification (Scheme-I)', lists the fee across products.",
    ],
    source: { label: "Product Certification Fee", href: en("product-certification/product-certification-fee") },
    retrieved: READ_ON,
  },

  "certification:documents-required": {
    points: [
      "What a manufacturer must submit is product-specific, not generic: BIS publishes a product manual and a Scheme of Inspection and Testing for each certified product.",
      "Grouping guidelines determine which product varieties can be covered under a single licence.",
      "Forms and formats are published separately for domestic certification and for FMCS.",
    ],
    source: { label: "Product Certification Overview", href: en("product-certification/product-certification-overview") },
    retrieved: READ_ON,
  },

  "certification:scheme-product-mapping": {
    points: [
      "A product's scheme follows from the Quality Control Order that covers it, not from the manufacturer's choice.",
      "The four routes are Scheme-I (Mark Scheme), Scheme-II (Registration Scheme), Scheme-IV (Certificate of Conformity) and Scheme-X.",
      "Electronics & IT goods notified by MeitY sit under the Compulsory Registration Scheme, which is why they are excluded from FMCS.",
    ],
    source: { label: "Products under Compulsory Certification", href: en("product-certification/products-under-compulsory-certification") },
    retrieved: READ_ON,
  },

  "certification:renewal-modification": {
    points: [
      "Renewal is a defined stage with its own published guideline, separate from the guidelines for grant of licence.",
      "Changing what a licence covers is also a distinct procedure — the Guidelines for Change in Scope of Licence.",
      "Management systems certification and FMCS each publish their own renewal procedure rather than sharing the product-certification one.",
    ],
    source: { label: "Product Certification Process", href: en("product-certification/product-certification-process") },
    retrieved: READ_ON,
  },

  "certification:licence-information": {
    points: [
      "BIS publishes licence data online, so a licence can be checked independently of the manufacturer's own claim.",
      "Jewellers registered to sell hallmarked gold and silver are published as a separate list of licensed jewellers.",
      "Application and licence reports are served from the Manak Online portal rather than the main BIS website.",
    ],
    source: { label: "Online Information", href: en("product-certification/online-information") },
    retrieved: READ_ON,
  },

  "certification:application-status": {
    points: [
      "Application and licence status is tracked on Manak Online, BIS's certification portal, not on the bis.gov.in website.",
      "BIS also publishes online licence information separately, which is the route for checking someone else's licence rather than your own application.",
    ],
    source: { label: "Online Information", href: en("product-certification/online-information") },
    retrieved: READ_ON,
  },

  // ----------------------------------------------------------------- testing
  "testing:laboratory-search": {
    points: [
      "BIS runs a dedicated portal for laboratories — LIMS, the Laboratory Information Management System, at lims.bis.gov.in — rather than publishing the lab directory as static pages.",
      "LIMS lets you search for a laboratory directly, or search by IS number to find labs that test to a particular Indian Standard.",
      "Laboratories fall into three groups: BIS's own laboratories, laboratories recognised by BIS (Group-1), and laboratories empanelled by BIS (Group-2).",
      "Full details of each laboratory, its scope of testing, and its testing charges are held in LIMS rather than on the main BIS website.",
    ],
    source: { label: "Laboratory Services Overview", href: en("laboratorys/laboratory-services-overview") },
    retrieved: READ_ON,
  },

  "testing:bis-laboratories": {
    points: [
      "BIS operates its own network of laboratories to support its conformity assessment schemes, which require products to be tested on a regular basis for continued conformity to the relevant Indian Standard.",
      "BIS laboratories deliberately do not cover every certified product: BIS states it is neither physically possible nor economically viable to build test facilities for each one.",
      "That gap is filled by the Laboratory Recognition Scheme, which brings in outside laboratories in India and abroad.",
      "Current counts of BIS, recognised and empanelled laboratories are shown live on the LIMS portal rather than fixed here.",
    ],
    source: { label: "Testing Overview", href: en("laboratorys/testing-overview") },
    retrieved: READ_ON,
  },

  "testing:recognized-laboratories": {
    points: [
      "The Laboratory Recognition Scheme (LRS) exists so that enough laboratories, in India and abroad, are available to serve the Product Certification Scheme.",
      "LRS rests on statutory powers: Section 13(4) of the BIS Act, 2016 and Rules 32(2), (3) and (4) of the BIS Rules, 2017.",
      "Those provisions let BIS recognise a laboratory in India or in any other country to test samples in relation to use of the Standard Mark.",
      "The same Rules provide for de-recognition of a recognised laboratory for non-fulfilment of any condition laid down at the time of recognition.",
      "The governing document is the Laboratory Recognition Scheme 2020, published with its subsequent amendments.",
      "BIS publishes recognised laboratories as Group-1 and empanelled laboratories as Group-2, in separate lists.",
    ],
    source: { label: "Testing Overview", href: en("laboratorys/testing-overview") },
    retrieved: READ_ON,
  },

  "testing:services": {
    points: [
      "BIS testing exists to support its conformity assessment schemes: licences and registrations are granted to manufacturers capable of producing goods conforming to Indian Standards on a continuous basis, which requires regular testing.",
      "Testing capacity is split between BIS's own laboratories and outside laboratories brought in under the Laboratory Recognition Scheme.",
      "BIS publishes test facilities four ways: BIS lab-wise, recognised lab-wise, empanelled lab-wise, and Indian Standard-wise.",
      "Unified Test Report Formats (UTRFs) are published for products under the Compulsory Registration Scheme.",
    ],
    source: { label: "Laboratory Services Overview", href: en("laboratorys/laboratory-services-overview") },
    retrieved: READ_ON,
  },

  "testing:laboratory-services": {
    points: [
      "Laboratory services support the certification schemes: BIS grants licences to manufacturers who can produce to an Indian Standard continuously, and that requires products to be tested regularly.",
      "Both BIS's own laboratories and laboratories recognised or empanelled under the Laboratory Recognition Scheme carry out this testing.",
      "Scope of testing and testing charges for a given laboratory are published in LIMS at lims.bis.gov.in.",
    ],
    source: { label: "Laboratory Services Overview", href: en("laboratorys/laboratory-services-overview") },
    retrieved: READ_ON,
  },

  "testing:facilities": {
    points: [
      "BIS publishes test facilities from four different angles: BIS lab-wise, BIS recognised lab-wise, BIS empanelled lab-wise, and Indian Standard-wise across all three.",
      "The Indian Standard-wise view is the one to use when you know the standard and need to find a laboratory that can test to it.",
      "Testing charges are published alongside facilities rather than separately, and the full detail lives in LIMS.",
    ],
    source: { label: "Testing facility & Testing Charges", href: en("laboratorys/testing-facility-and-testing-charges") },
    retrieved: READ_ON,
  },

  "testing:find-test-methods": {
    points: [
      "Test methods themselves are specified inside the Indian Standard — BIS does not publish them as a separate searchable catalogue.",
      "What BIS does publish is which laboratory can test to which standard, through the Indian Standard-wise test facility listings.",
      "For products under the Compulsory Registration Scheme, BIS publishes Unified Test Report Formats (UTRFs) that recognised laboratories use when issuing test reports.",
    ],
    source: { label: "Laboratory Services Overview", href: en("laboratorys/laboratory-services-overview") },
    retrieved: READ_ON,
  },

  "testing:tests-for-standard": {
    points: [
      "The tests a standard requires are set out in the standard itself; BIS publishes the standard, not a separate list of its tests.",
      "To find where a given standard can be tested, BIS publishes Indian Standard-wise test facilities across BIS, recognised and empanelled laboratories.",
      "For a certified product, the applicable testing is also fixed by that product's Scheme of Inspection and Testing.",
    ],
    source: { label: "Laboratory Services Overview", href: en("laboratorys/laboratory-services-overview") },
    retrieved: READ_ON,
  },

  "testing:information": {
    points: [
      "BIS operates conformity assessment schemes that grant licences and registrations to manufacturers able to produce to an Indian Standard on a continuous basis.",
      "Regular testing is what sustains those schemes — it is how continued conformity is checked, not a one-off step at application.",
      "Testing is carried out both in BIS's own laboratories and in laboratories recognised or empanelled under the Laboratory Recognition Scheme.",
    ],
    source: { label: "Testing Overview", href: en("laboratorys/testing-overview") },
    retrieved: READ_ON,
  },

  "testing:compare": {
    points: [
      "BIS publishes testing capability lab-wise and Indian Standard-wise, which is what makes a like-for-like comparison between laboratories possible.",
      "Testing charges are published together with facilities, so cost and capability can be read side by side.",
      "The authoritative, current detail for any laboratory — scope and charges — is in LIMS rather than in a static page.",
    ],
    source: { label: "Testing facility & Testing Charges", href: en("laboratorys/testing-facility-and-testing-charges") },
    retrieved: READ_ON,
  },

  "testing:laboratory-contacts": {
    points: [
      "Laboratory recognition is handled by a named department: the Laboratory Recognition and Management Department (LRMD) at BIS headquarters.",
      "Its published address is 312, Manakalaya, Bureau of Indian Standards, 9 Bahadur Shah Zafar Marg, New Delhi 110002.",
      "BIS publishes a telephone number (+91 11 23230860) and an email address (lrmd-bis at bis.gov.in) for laboratory recognition queries.",
      "Applications themselves are not made by email — they go through the LIMS portal.",
    ],
    source: { label: "How to apply for BIS recognition", href: en("laboratorys/how-to-apply-for-bis-recognition") },
    retrieved: READ_ON,
  },

  // ------------------------------------------------------------------- about
  "about:acts-regulations": {
    points: [
      "The governing statute is the BIS Act, 2016, published alongside the BIS (Removal of Difficulty) Order, 2019 and the notification enforcing the Act.",
      "The BIS Rules, 2018 are published incorporating all amendments, rather than as a base text plus separate amendment files.",
      "Certification is governed by its own instrument: the Bureau of Indian Standards (Conformity Assessment) Regulations, 2018.",
      "Hallmarking has separate regulations — the Bureau of Indian Standards (Hallmarking) Regulations, 2018 — plus a Department of Consumer Affairs notification on which precious metal articles must be hallmarked.",
      "Further regulations cover advisory committees, the powers and duties of the Director General, and recruitment.",
    ],
    source: { label: "BIS Act, Rules & Regulations", href: en("the-bureau/bis-act-rules-and-regulations") },
    retrieved: READ_ON,
  },

  "about:rules-regulations": {
    points: [
      "BIS publishes the Act, the Rules and the Regulations as three distinct layers rather than one consolidated code.",
      "The BIS Rules, 2018 are published incorporating all amendments to date.",
      "Subject-specific regulations sit under them: Conformity Assessment (2018), Hallmarking (2018), Advisory Committees (2018), and Powers and Duties of the Director General (2018).",
    ],
    source: { label: "BIS Act, Rules & Regulations", href: en("the-bureau/bis-act-rules-and-regulations") },
    retrieved: READ_ON,
  },

  "about:rti": {
    points: [
      "BIS publishes its RTI material in four parts: the RTI Act 2005, the RTI Rules and Fee Regulations, its CPIOs and FAAs, and a proactive declaration.",
      "CPIOs (Central Public Information Officers) and FAAs (First Appellate Authorities) are named separately — the CPIO receives a request, the FAA hears an appeal against the response.",
      "The proactive declaration is the material BIS publishes without being asked, under the Act's suo motu disclosure obligation.",
    ],
    source: { label: "RTI", href: en("rti") },
    retrieved: READ_ON,
  },

  // --------------------------------------------------------------- resources
  "resources:publications": {
    points: [
      "Standards India is BIS's bilingual journal, published fortnightly.",
      "It carries write-ups on standardization subjects of both technical and consumer interest, plus in-depth articles contributed by professionals from industry, research institutes and government departments.",
      "It is also a change record: it reports the latest Indian Standards, amendments to standards, standards withdrawn, and draft standards circulated.",
      "BIS separately publishes a Monthly BIS Newsletter and e-books.",
    ],
    source: { label: "Standards India", href: en("consumer-overview/standards-india") },
    retrieved: READ_ON,
  },

  "resources:standards-explained": {
    points: [
      "Standards India, BIS's fortnightly bilingual journal, is written for both technical and consumer audiences rather than specialists only.",
      "Alongside explanatory articles it tracks what has changed — new Indian Standards, amendments, withdrawals, and drafts circulated for comment.",
      "Contributors include professionals from industry, research institutes and government departments.",
    ],
    source: { label: "Standards India", href: en("consumer-overview/standards-india") },
    retrieved: READ_ON,
  },

  // --------------------------------------------------------------- standards
  "standards:by-industry": {
    points: [
      "BIS organises standards work by technical department, each covering one broad industry — chemicals, civil engineering, electrotechnical, food and agriculture, mechanical engineering, textiles, transport, water resources and others.",
      "Under each department sits a hierarchy: division councils and sectional committees, then panels, then working groups. A standard is owned by the sectional committee for its subject.",
      "Published standards can be browsed by the department that owns them, which is the closest thing BIS offers to browsing by industry.",
      "Standardization cells map government ministries and industry associations onto that structure, showing who represents each sector.",
      "Current department, committee and panel counts are shown live on BIS's standards portal rather than fixed here.",
    ],
    source: { label: "Technical Departments (standards.bis.gov.in)", href: "https://standards.bis.gov.in/website/technical-departments/department-list" },
    retrieved: READ_ON,
  },

  "standards:versions": {
    points: [
      "A standard's life has distinct stages, and BIS publishes each separately rather than as one changelog: proposal for a new work item, wide circulation draft, publication, then periodic review.",
      "Review outcomes are recorded in three categories — reaffirmed, revised, or withdrawn — reported by technical department.",
      "Wide Circulation Drafts are the amendment pipeline in progress: draft standards currently open for public comment, listed by department.",
      "Because a standard can be withdrawn or superseded, the edition year in an IS number matters; the review listing is where to check whether the edition you hold is still current.",
    ],
    source: { label: "Review of Standards (standards.bis.gov.in)", href: "https://standards.bis.gov.in/website/review-of-standards" },
    retrieved: READ_ON,
  },

  "standards:referenced": {
    points: [
      "Indian Standards acquire legal force in two different ways: through a BIS Quality Control Order, or by being referred to in another ministry's regulations.",
      "For example, IS 14625:2015 (Plastics Feeding Bottles) is under mandatory BIS certification through the Infant Milk Substitutes, Feeding Bottles and Infant Foods Act, 1992.",
      "Thirty Indian Standards on finished cosmetics are listed in Schedule 'S' of the Drugs and Cosmetics Rules, 1945 — cosmetics manufactured or imported in finished form must conform to those specifications.",
      "So a standard can be legally binding on you without BIS itself being the enforcing body; the obligation comes from the regulation that references it.",
    ],
    source: { label: "Indian Standards referred in Government regulations", href: en("standards/indian-standards-referred-in-government-regulations") },
    retrieved: READ_ON,
  },

  "standards:by-product": {
    points: [
      "BIS publishes a live search over published Indian Standards — by IS number or by keyword — rather than a static product index.",
      "For products where certification is compulsory, the Products under Compulsory Certification listing names the governing Indian Standard for each product, which is the most direct product-to-standard mapping BIS publishes.",
      "That listing is grouped by scheme: Scheme-I (Mark Scheme), Scheme-II (Registration Scheme), Scheme-IV (Certificate of Conformity) and Scheme-X.",
      "Full text of any standard is sold through BIS's own webstore; the search tells you which standard applies, the webstore gives you its contents.",
    ],
    source: { label: "Products under Compulsory Certification", href: en("product-certification/products-under-compulsory-certification") },
    retrieved: READ_ON,
  },

  "standards:by-material": {
    points: [
      "BIS does not publish a standards index organised by material. The nearest equivalents are the compulsory-certification listing and the subject classification in the standards catalogue.",
      "The compulsory-certification listing is effectively material-oriented in practice — cement, steel products, cookware and similar categories appear as their own entries with the governing standard.",
      "Standards for a given material usually sit within one technical department (metallurgical engineering, chemicals, textiles), so the department-wise listing is another way in.",
    ],
    source: { label: "Products under Compulsory Certification", href: en("product-certification/products-under-compulsory-certification") },
    retrieved: READ_ON,
  },

  "standards:explorer": {
    points: [
      "BIS's own search covers published Indian Standards by number or keyword, and reports the standard's current status.",
      "Standards are classified department-wise, so a standard can also be found by the technical area that owns it rather than by its number.",
      "What the search does not include is the standard's clause text — that is only in the published standard itself, sold through the BIS webstore.",
    ],
    source: { label: "Know Your Standards (standards.bis.gov.in)", href: "https://standards.bis.gov.in/website/know-your-standards" },
    retrieved: READ_ON,
  },

  "standards:related": {
    points: [
      "BIS does not publish a standard-to-standard citation graph. Relationships have to be traced through structure or through the standards' own text.",
      "Standards owned by the same sectional committee are the most reliably related — the department-wise classification is the practical way to find them.",
      "A standard's own normative references section lists the other standards it depends on; that text is inside the published standard.",
      "Codes like the National Building Code are an exception: they explicitly reference large sets of Indian Standards in one document.",
    ],
    source: { label: "National Building Code", href: en("standards/national-building-code") },
    retrieved: READ_ON,
  },

  "standards:clauses": {
    points: [
      "Clause-level text is published only inside the standard itself. BIS does not offer a clause search across standards.",
      "The route is therefore two-step: identify the standard using BIS's search by number or keyword, then obtain the standard's full text from the BIS webstore.",
      "For a certified product, the specific requirements that are actually tested are also set out in that product's Scheme of Inspection and Testing.",
      "Standards already ingested into this system do carry clause-level evidence, visible on their detail pages under Browse Standards.",
    ],
    source: { label: "Know Your Standards (standards.bis.gov.in)", href: "https://standards.bis.gov.in/website/know-your-standards" },
    retrieved: READ_ON,
  },

  // --------------------------------------------------- resources (additional)
  "resources:codes-of-practice": {
    points: [
      "The National Building Code of India (SP 7 : 2016) is BIS's principal code of practice — a national instrument giving guidelines for regulating building construction across the country.",
      "It is a Model Code, intended for adoption by all agencies involved in building construction: Public Works Departments, other government construction departments, local bodies and private construction agencies.",
      "It covers administrative regulations, development control rules, general building requirements, fire safety, materials, structural design and construction, building and plumbing services, sustainability, and asset and facility management.",
      "The Code was first published in 1970 and has been revised since; the current edition is NBC 2016.",
    ],
    source: { label: "National Building Code", href: en("standards/national-building-code") },
    retrieved: READ_ON,
  },

  "resources:faq": {
    points: [
      "BIS publishes FAQs per subject area rather than as one combined list.",
      "The published sets cover standardization, product certification, systems certification, FMCS, the registration scheme, consumers, laboratory services, hallmarking, and training.",
      "Choosing the right set matters — certification questions are answered differently for domestic manufacturers, foreign manufacturers (FMCS) and electronics under the registration scheme.",
    ],
    source: { label: "Frequently Asked Questions", href: en("full-faq") },
    retrieved: READ_ON,
  },

  "resources:standards-catalogue": {
    points: [
      "The full text of Indian Standards is sold through BIS's own webstore rather than published free on bis.gov.in.",
      "BIS separately provides a free search over published standards by IS number or keyword, which is enough to identify the standard you need before buying it.",
      "Some standards are released for free download — BIS publishes an 'Indigenous Indian Standards – Free Download' listing alongside the compulsory-certification material.",
    ],
    source: { label: "Products under Compulsory Certification", href: en("product-certification/products-under-compulsory-certification") },
    retrieved: READ_ON,
  },

  "resources:news": {
    points: [
      "BIS publishes change information through several distinct channels rather than one feed.",
      "Standards India, its fortnightly bilingual journal, reports new standards, amendments, withdrawals and drafts circulated.",
      "Upcoming Quality Control Orders — notified and due for implementation — are published separately, which is the channel that matters most to manufacturers planning ahead.",
      "Wide Circulation Drafts open for comment are published by department on the standards portal.",
    ],
    source: { label: "Standards India", href: en("consumer-overview/standards-india") },
    retrieved: READ_ON,
  },

  // -------------------------------------------------------------- e-services
  "e-services:verify-bis-mark": {
    points: [
      "BIS publishes a free mobile app — BIS Care — for Android and iOS, specifically so a consumer can check a mark without needing the web portal.",
      "'Verify Licence Details' in the app checks whether a product carrying the Standard Mark is backed by a real licence.",
      "'Verify HUID' checks a hallmarked gold or silver item by its six-digit HUID number.",
      "The app supports 12 languages — ten regional languages plus Hindi and English.",
      "It also carries consumer education material on rights and penalties under the BIS Act, 2016.",
    ],
    source: { label: "BIS Care App", href: en("bis-apps") },
    retrieved: READ_ON,
  },

  "e-services:verify-certificate": {
    points: [
      "Verification is deliberately separated from application: BIS publishes licence information publicly so a certificate can be checked independently of whoever is showing it to you.",
      "The BIS Care app's 'Verify Licence Details' is the quickest route for a single product; online licence information covers the same ground on the web.",
      "Hallmarked jewellery is verified differently, by its six-digit HUID rather than a licence number.",
      "Online information is published separately for the Product Certification Scheme (domestic manufacturers) and the Hallmarking Scheme.",
    ],
    source: { label: "BIS Care App", href: en("bis-apps") },
    retrieved: READ_ON,
  },

  "e-services:check-licence": {
    points: [
      "BIS publishes licence data online in two streams: the Product Certification Scheme for domestic manufacturers, and the Hallmarking Scheme.",
      "Jewellers registered to sell hallmarked gold and silver are published as their own list of licensed jewellers.",
      "The BIS Care app exposes the same licence check on mobile, including licences held against a given Indian Standard.",
    ],
    source: { label: "Online Information", href: en("product-certification/online-information") },
    retrieved: READ_ON,
  },

  "e-services:apply-certification": {
    points: [
      "Applications are made on BIS's own portal, Manak Online (manakonline.in), not on bis.gov.in.",
      "Which route you take depends on the scheme: domestic product certification, management systems certification, and FMCS for foreign manufacturers each have their own application path.",
      "Electronics and IT goods notified by MeitY are applied for under the Compulsory Registration Scheme on the separate CRS portal instead.",
      "BIS publishes step-by-step guides for the Simplified Procedure, CRS and Normal Procedure routes.",
    ],
    source: { label: "BIS Care App", href: en("bis-apps") },
    retrieved: READ_ON,
  },

  "e-services:hallmarking-services": {
    points: [
      "A jeweller registers to sell hallmarked articles online at manakonline.in; the certificate is granted instantly, needs no document upload, carries no fee, and is valid for lifetime.",
      "Hallmarking applies to two precious metals in India: gold and silver.",
      "Assaying and Hallmarking Centres are recognised separately, under IS 15820:2009.",
      "Consumers verify a hallmarked item by its six-digit HUID, including through the BIS Care app.",
    ],
    source: { label: "Hallmarking Overview", href: en("hallmarking-overview") },
    retrieved: READ_ON,
  },

  "e-services:registration-services": {
    points: [
      "Registration is a distinct route from the Mark Scheme: Scheme-II of the BIS (Conformity Assessment) Regulations, 2018.",
      "The Compulsory Registration Scheme covers Electronics & IT goods in categories notified by MeitY, and runs on its own portal (crsbis.in).",
      "Jeweller registration for hallmarked gold and silver is a separate registration, handled on Manak Online and granted without fee.",
    ],
    source: { label: "Products under Compulsory Certification", href: en("product-certification/products-under-compulsory-certification") },
    retrieved: READ_ON,
  },

  "e-services:laboratory-services": {
    points: [
      "Laboratory-facing services run on LIMS (lims.bis.gov.in), separately from the certification portal.",
      "A laboratory seeking BIS recognition registers there: Login, then 'New Lab/Register Now'. A user manual for the application is published on the same portal.",
      "Recognition is granted under the Laboratory Recognition Scheme, backed by Section 13(4) of the BIS Act, 2016.",
      "Unified Test Report Formats are published for laboratories issuing test reports for CRS products.",
    ],
    source: { label: "How to apply for BIS recognition", href: en("laboratorys/how-to-apply-for-bis-recognition") },
    retrieved: READ_ON,
  },

  "e-services:account": {
    points: [
      "BIS accounts live on BIS's own portals, not in this system — this system has no login and holds no application data.",
      "Manak Online (manakonline.in) is the account for certification and hallmarking-related services.",
      "CRS registration for electronics and IT goods uses a separate account on crsbis.in, and laboratory recognition uses LIMS.",
    ],
    source: { label: "Online Information", href: en("product-certification/online-information") },
    retrieved: READ_ON,
  },

  // ---------------------------------------------------------- about (extra)
  "about:regional-offices": {
    points: [
      "BIS operates regional offices covering the country, each with an administrative office and, in several cases, a sales point for standards.",
      "The Central Regional Office is in New Delhi, the Eastern Regional Office in Kolkata, and the Northern Regional Office in Chandigarh.",
      "Each regional office publishes its own postal address, telephone numbers and a regional email address (for example cro, ero and nro at bis.gov.in).",
      "Sales points are listed separately from administrative offices — the address for buying standards is not always the administrative address.",
    ],
    source: { label: "Regional Offices", href: en("directory/regional-offices") },
    retrieved: READ_ON,
  },

  "about:contact-directory": {
    points: [
      "BIS publishes contacts by function rather than as one list: headquarters, regional offices, branch offices, sales offices and laboratories are separate directories.",
      "Regional offices each publish a dedicated email address of the form <office code>@bis.gov.in.",
      "Subject departments publish their own contacts too — FMCS, laboratory recognition, product certification and hallmarking each name a contact point.",
      "There is also a general enquiry page covering questions about BIS activities.",
    ],
    source: { label: "Regional Offices", href: en("directory/regional-offices") },
    retrieved: READ_ON,
  },

  // ----------------------------------------------------------- about (final)
  "about:international-cooperation": {
    points: [
      "BIS is a founder member of ISO and joined the IEC in 1947.",
      "India has provided two ISO Presidents: Mr. Jehangir J. Ghandy (1965–1967) and Dr. D. C. Kothari (1983–1985).",
      "BIS holds the secretariats for 3 Technical Committees and 8 Subcommittees of ISO.",
      "It convenes 28 ISO working groups and 14 IEC working groups / system evaluation groups.",
      "As published on BIS's ISO/IEC page (last updated April 2023): P-member on 502 and O-member on 181 ISO committees, and P-member on 121 and O-member on 61 IEC committees.",
    ],
    source: { label: "BIS at ISO/IEC", href: en("bis-iso-iec") },
    retrieved: READ_ON,
  },

  "about:annual-reports": {
    points: [
      "BIS publishes an annual report each year; the published series runs from 2011-12 through 2022-23.",
      "Alongside the reports themselves, BIS publishes Review Statements on the Annual Report as a separate series.",
      "It also publishes Delay Statements, covering years where the report was laid late.",
      "Reports are published as downloadable PDFs rather than as web pages.",
    ],
    source: { label: "Annual Report", href: en("the-bureau/annual-report") },
    retrieved: READ_ON,
  },

  "about:laboratories": {
    points: [
      "BIS operates its own network of laboratories, supported by a much larger set of recognised and empanelled laboratories across India and abroad.",
      "The Laboratory Recognition Scheme rests on Section 13(4) of the BIS Act, 2016, which lets BIS recognise a laboratory in any country to test samples in relation to the Standard Mark.",
      "Recognised laboratories are published as Group-1 and empanelled laboratories as Group-2.",
      "Live details for every laboratory — scope of testing and charges — are held in the LIMS portal at lims.bis.gov.in.",
    ],
    source: { label: "Testing Overview", href: en("laboratorys/testing-overview") },
    retrieved: READ_ON,
  },

  "about:branches": {
    points: [
      "BIS's field presence is organised in layers: headquarters, regional offices, branch offices, sales offices and laboratories, each published as its own directory.",
      "Branch offices are listed separately from the regional offices they sit under.",
      "Sales offices are listed separately again — the office that sells standards is not necessarily the administrative office.",
    ],
    source: { label: "Branch Office", href: en("directory/branch-office") },
    retrieved: READ_ON,
  },

  "about:standards-development-process": {
    points: [
      "A standard moves through defined stages: a proposal for a new work item, drafting by the sectional committee, wide circulation for public comment, publication, then periodic review.",
      "Wide Circulation Drafts are published openly and are open for comment — anyone can see what is being drafted before it becomes a standard.",
      "Periodic review ends in one of three recorded outcomes: reaffirmed, revised, or withdrawn.",
      "Work is carried out by technical departments, division councils and sectional committees, with panels and working groups beneath them.",
    ],
    source: { label: "Review of Standards (standards.bis.gov.in)", href: "https://standards.bis.gov.in/website/review-of-standards" },
    retrieved: READ_ON,
  },

  "about:departments": {
    points: [
      "BIS's standards work is divided into technical departments, each responsible for one broad subject area.",
      "Beneath each department sit division councils and sectional committees, then panels and working groups.",
      "A sectional committee owns the standards in its subject, so the committee is the unit that actually drafts and reviews a standard.",
      "Standardization cells connect this structure to government ministries and industry associations.",
    ],
    source: { label: "Technical Departments (standards.bis.gov.in)", href: "https://standards.bis.gov.in/website/technical-departments/department-list" },
    retrieved: READ_ON,
  },

  "about:committees": {
    points: [
      "BIS's governance and its technical work run through separate committee structures.",
      "Governance sits with the Governing Council, with an Executive Committee beneath it; BIS publishes both the membership and the proceedings.",
      "Technical work sits with division councils and sectional committees under each technical department, supported by panels and working groups.",
      "Advisory committees have their own instrument: the BIS (Advisory Committees) Regulations, 2018.",
    ],
    source: { label: "BIS Act, Rules & Regulations", href: en("the-bureau/bis-act-rules-and-regulations") },
    retrieved: READ_ON,
  },

  "about:careers": {
    points: [
      "BIS recruits into distinct cadres, each governed by its own regulations — the BIS (Recruitment to Scientific Cadre) Regulations, 2019 and the BIS (Recruitment to Laboratory Technical Posts) Regulations, 2019.",
      "Recruitment regulations are published alongside vacancies, so the eligibility rules can be read before applying.",
      "BIS publishes past recruitment advertisements and results as an archive, separately from current openings.",
    ],
    source: { label: "Career Opportunities", href: en("career-opportunities") },
    retrieved: READ_ON,
  },

  "about:tenders": {
    points: [
      "BIS publishes tenders in three separate streams: current tender details, cancelled tenders, and an archive of past tenders.",
      "Cancellations are published rather than simply removed, so a withdrawn tender leaves a record.",
    ],
    source: { label: "Tender Details", href: en("tender-details") },
    retrieved: READ_ON,
  },

  "about:policies": {
    points: [
      "BIS publishes its site-level policies separately from its statutory instruments: website policies, a copyright policy, terms and conditions, and an accessibility statement.",
      "These govern use of BIS's website and its published material, and are distinct from the BIS Act, Rules and Regulations that govern certification.",
    ],
    source: { label: "Website policies", href: en("website-policies") },
    retrieved: READ_ON,
  },

  // ------------------------------------------------------- e-services (final)
  "e-services:licence-services": {
    points: [
      "Licence servicing runs on Manak Online (manakonline.in) — grant, renewal, change in scope and related actions all sit on the portal, not on bis.gov.in.",
      "Renewal is a defined procedure with its own published guideline, separate from the guideline for grant of licence.",
      "Management systems certification and FMCS publish their own renewal procedures rather than sharing the product-certification one.",
      "Licence information is separately published online, which is the route for checking a licence rather than servicing your own.",
    ],
    source: { label: "Online Information", href: en("product-certification/online-information") },
    retrieved: READ_ON,
  },

  "e-services:track-application": {
    points: [
      "Application tracking is a Manak Online function; bis.gov.in publishes information about schemes, not the status of an individual application.",
      "BIS publishes application and licence-related reports from the Manak Online portal.",
      "Electronics and IT goods under the Compulsory Registration Scheme are tracked on the separate CRS portal instead.",
    ],
    source: { label: "Online Information", href: en("product-certification/online-information") },
    retrieved: READ_ON,
  },

  "e-services:application-status": {
    points: [
      "Status of your own application is held in the portal where you applied — Manak Online for certification and hallmarking, crsbis.in for CRS, LIMS for laboratory recognition.",
      "This is distinct from checking whether someone else's licence is genuine, which uses BIS's published online licence information.",
    ],
    source: { label: "Online Information", href: en("product-certification/online-information") },
    retrieved: READ_ON,
  },

  "e-services:payments": {
    points: [
      "Fees are paid through the portal that holds the application rather than through a separate payments site.",
      "What is payable depends on the scheme: product certification, management systems certification and FMCS each publish their own fee schedule.",
      "Some registrations carry no fee at all — jeweller registration for selling hallmarked articles is granted without any fee.",
    ],
    source: { label: "Product Certification Fee", href: en("product-certification/product-certification-fee") },
    retrieved: READ_ON,
  },

  "e-services:submit-documents": {
    points: [
      "Documents are submitted through the portal handling the application, not by email to BIS.",
      "BIS publishes the prescribed forms in advance — for hallmarking these are numbered forms such as Form-I (jeweller registration), Form-IV (recognition of an Assaying and Hallmarking Centre under IS 15820) and Form-VIII (licence to use the Hallmark).",
      "Some routes need no document upload at all: jeweller registration is granted instantly without uploading documents.",
    ],
    source: { label: "Forms & Formats", href: en("forms-formats") },
    retrieved: READ_ON,
  },

  "e-services:download-documents": {
    points: [
      "BIS publishes its forms and formats as downloadable PDFs, listed with the size and format of each file.",
      "Hallmarking forms are numbered and published individually — application, affidavit, renewal and licence forms are separate documents.",
      "Fee schedules are published alongside the forms as their own numbered schedules.",
      "FMCS publishes its own separate set of forms and formats.",
    ],
    source: { label: "Forms & Formats", href: en("forms-formats") },
    retrieved: READ_ON,
  },

  // -------------------------------------------------------- resources (final)
  "resources:msme": {
    points: [
      "BIS publishes a specific testing route for MSMEs: guidelines for utilisation of a Cluster Based Test Facility (CBTF), issued under the product certification process.",
      "It also publishes a Simplified Procedure for licensing, distinct from the Normal Procedure, with its own step-by-step guidance.",
      "Whether certification is compulsory for a given product is set by a Quality Control Order — the compulsory-certification listing is where a small manufacturer checks its own product first.",
      "Upcoming QCOs, notified and due for implementation, are published separately so a manufacturer can prepare before the obligation starts.",
    ],
    source: { label: "Product Certification Process", href: en("product-certification/product-certification-process") },
    retrieved: READ_ON,
  },

  "resources:startups": {
    points: [
      "The first question for a new product is whether certification is compulsory at all — BIS certification is voluntary except where a Quality Control Order applies.",
      "The compulsory-certification listing names the governing Indian Standard for each covered product, grouped by scheme.",
      "BIS publishes a Simplified Procedure alongside the Normal Procedure, and a Cluster Based Test Facility route for smaller manufacturers who lack in-house testing.",
      "Upcoming QCOs are published in advance, which matters when planning a product that is not yet regulated.",
    ],
    source: { label: "Products under Compulsory Certification", href: en("product-certification/products-under-compulsory-certification") },
    retrieved: READ_ON,
  },

  "resources:students": {
    points: [
      "BIS publishes a Students Corner as a dedicated entry point, separate from its manufacturer-facing material.",
      "It runs training programmes with a published calendar, fee structure and application procedure.",
      "Free-to-read material includes e-books, booklets, comic books on standards, and the Standards India journal.",
    ],
    source: { label: "Students Corner", href: en("students-corner-demo") },
    retrieved: READ_ON,
  },

  "resources:reports": {
    points: [
      "BIS's principal published report is its Annual Report, with the series running from 2011-12 through 2022-23.",
      "Review Statements on the Annual Report are published as a separate series.",
      "Enforcement activity is reported separately from the annual report.",
      "Reports are published as downloadable PDFs.",
    ],
    source: { label: "Annual Report", href: en("the-bureau/annual-report") },
    retrieved: READ_ON,
  },

  "resources:circulars": {
    points: [
      "BIS publishes notices through a What's New / Notifications channel rather than a formal circulars archive.",
      "Product recall alerts are published separately as public alerts for non-conformity of a product.",
      "Upcoming Quality Control Orders — notified and due for implementation — are published as their own listing.",
    ],
    source: { label: "What's New / Notifications", href: en("whats-new-notifications") },
    retrieved: READ_ON,
  },

  "resources:guidelines": {
    points: [
      "Certification guidelines are published per stage rather than as a single manual: grant of licence, renewal, change in scope, retesting, operation of licence, and factory and market surveillance.",
      "Product-specific guidance is separate again — each certified product has a product manual, a Scheme of Inspection and Testing, and grouping guidelines.",
      "BIS also publishes a Guidance Document on Quality Control Orders explaining how a product comes to be covered.",
      "Building work has its own instrument: the National Building Code (SP 7 : 2016), a model code for adoption by construction agencies.",
    ],
    source: { label: "Product Certification Process", href: en("product-certification/product-certification-process") },
    retrieved: READ_ON,
  },

  "resources:handbooks": {
    points: [
      "BIS publishes e-books and booklets as free-to-read material, separately from the standards it sells.",
      "Role-specific handbooks exist for people inside the system — an Auditor Handbook for management systems certification, and a Handbook for Technical Committee members.",
      "The National Building Code (SP 7 : 2016) functions as a handbook-style model code for building construction.",
    ],
    source: { label: "National Building Code", href: en("standards/national-building-code") },
    retrieved: READ_ON,
  },

  "resources:technical-documents": {
    points: [
      "Technical Information Services (TIS) is BIS's dedicated function for technical information, distinct from the sale of standards.",
      "BIS maintains a library and publishes its additions, alongside general library services.",
      "Resource materials are published as their own collection.",
      "The full text of a standard remains a purchased document — TIS and the library are the routes to surrounding technical material, not to the standards themselves.",
    ],
    source: { label: "Technical Information Services (TIS)", href: en("standards/tisc") },
    retrieved: READ_ON,
  },

  "resources:glossary": {
    points: [
      "BIS does not publish a standalone glossary of standards terminology.",
      "Definitions are normative and live inside each standard: a standard defines the terms it uses, in its own terminology clause.",
      "For scheme and certification vocabulary, BIS's subject-wise FAQ sets are the nearest published explanation.",
    ],
    source: { label: "Frequently Asked Questions", href: en("full-faq") },
    retrieved: READ_ON,
  },

  "about:vision-mission": {
    points: [
      "BIS is the National Standards Body of India, established under the BIS Act, 2016 for the harmonious development of standardization, marking and quality certification of goods.",
      "Its stated benefits to the national economy are providing safe, reliable, quality goods; minimising health hazards to consumers; promoting exports and import substitutes; and controlling the proliferation of varieties.",
      "It pursues those aims through three linked activities: standardization, certification and testing.",
      "Its published remit spans standards formulation, the product certification, compulsory registration, foreign manufacturers and hallmarking schemes, laboratory services and recognition, sale of standards, consumer affairs, promotional activities, training, and information services.",
    ],
    source: { label: "About BIS", href: en("the-bureau/about-bis") },
    retrieved: READ_ON,
  },

  "about:organisation": {
    points: [
      "BIS is headquartered in New Delhi and operates five Regional Offices: Kolkata (Eastern), Chennai (Southern), Mumbai (Western), Chandigarh (Northern) and Delhi (Central).",
      "Governance runs through a Governing Council with an Executive Committee beneath it; BIS publishes the membership of both.",
      "BIS publishes an administrative structure and an organization chart as separate documents.",
      "Beneath the regional offices sit branch offices, sales offices and laboratories, each published as its own directory.",
    ],
    source: { label: "About BIS", href: en("the-bureau/about-bis") },
    retrieved: READ_ON,
  },

  "about:leadership": {
    points: [
      "BIS publishes its leadership as distinct offices: the President, Vice Presidents, and the Director General.",
      "The powers and duties of the Director General are set by their own instrument — the BIS (Powers and Duties of Director General) Regulations, 2018.",
      "Historical office-holders are published too, as lists of past Presidents, Vice Presidents and Directors General.",
      "The Governing Council and Executive Committee memberships are published separately from these individual offices.",
    ],
    source: { label: "Organization", href: en("the-bureau/organization-2") },
    retrieved: READ_ON,
  },
};

/** Sourced factual content for a page, or null if none has been researched yet. */
export function getPageFacts(sectionKey: string, slug: string): PageFacts | null {
  return FACTS[`${sectionKey}:${slug}`] ?? null;
}

/** Every distinct source URL cited here, for the link checker. */
export function allFactSourceUrls(): string[] {
  return [...new Set(Object.values(FACTS).map((f) => f.source.href))].sort();
}

export const PAGE_FACTS = FACTS;
