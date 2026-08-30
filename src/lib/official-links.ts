/**
 * Verified official destinations for every placeholder section.
 *
 * Each entry points at a page that actually exists on an official BIS
 * property. Every URL in this file was checked by fetching it and reading
 * back a real page title on 2026-08-31 — bis.gov.in is a WordPress site that
 * serves soft 404s (HTTP 200 with an empty <title>) for unknown paths, so a
 * status code alone is not evidence a page exists. `scripts/check-official-links.ts`
 * re-runs that check; run it if these ever look stale.
 *
 * Rules for adding to this file:
 *  - Only URLs on bis.gov.in or an official BIS portal linked from bis.gov.in
 *    (manakonline.in, crsbis.in, standardsbis.bsbedge.com).
 *  - Never guess a URL from a pattern. Verify it, or leave the entry out.
 *  - An entry with no genuinely relevant official page gets `[]`. The
 *    placeholder then says so honestly rather than sending the user somewhere
 *    that does not answer their question.
 */

export interface OfficialLink {
  label: string;
  href: string;
  /** Short, factual note on what the user will find there. No claims beyond the page's own scope. */
  note?: string;
}

const BIS = "https://www.bis.gov.in";
const en = (path: string) => `${BIS}/${path}/?lang=en`;

/** Official BIS portals that are separate properties, linked from bis.gov.in. */
export const PORTALS = {
  manak: "https://www.manakonline.in",
  manakLicence: "https://www.manakonline.in/MANAK/ApplicationLicenceRelatedrpt",
  crs: "https://www.crsbis.in/BIS/about-crs.do",
  crsRegister: "https://www.crsbis.in/BIS/registration-page.do",
  crsLabs: "https://www.crsbis.in/BIS/bis_lab.do",
  catalogue: "https://standardsbis.bsbedge.com/",
} as const;

/**
 * Keyed by `${sectionKey}:${slug}`. An empty slug is the section's own
 * landing page.
 */
const LINKS: Record<string, OfficialLink[]> = {
  // ---------------------------------------------------------------- standards
  "standards:by-product": [
    { label: "Know Your Standard", href: en("know-your-standard"), note: "BIS's own product-to-standard lookup." },
    { label: "Products under Compulsory Certification", href: en("product-certification/products-under-compulsory-certification"), note: "Products that require a licence, with the governing standard." },
    { label: "Standards catalogue (BIS webstore)", href: PORTALS.catalogue, note: "Search and buy the full text of any Indian Standard." },
  ],
  "standards:by-industry": [
    { label: "Standardization (Products & Methods)", href: en("standards/standardization-products-methods"), note: "How BIS organises standards work across sectors." },
    { label: "Standards catalogue (BIS webstore)", href: PORTALS.catalogue },
  ],
  "standards:by-material": [
    { label: "Standards catalogue (BIS webstore)", href: PORTALS.catalogue, note: "Browsable by subject and material." },
    { label: "Compendium of Indian Standards", href: en("compendium-of-indian-standards") },
  ],
  "standards:explorer": [
    { label: "Know Your Standard", href: en("know-your-standard") },
    { label: "Standards catalogue (BIS webstore)", href: PORTALS.catalogue, note: "Scope, publication date, and full text for a given standard." },
  ],
  "standards:versions": [
    { label: "Standards Under Development", href: en("standards/standard-formulation/standards-under-development"), note: "Drafts and revisions currently in progress." },
    { label: "View Previous Editions", href: en("view-previous-editions"), note: "Superseded editions of published standards." },
    { label: "Standards Watch", href: en("standardswatch"), note: "BIS's own change bulletin." },
  ],
  "standards:related": [
    { label: "Standards catalogue (BIS webstore)", href: PORTALS.catalogue, note: "Each entry lists the standards it cross-refers to." },
    { label: "Compendium of Indian Standards", href: en("compendium-of-indian-standards") },
  ],
  "standards:referenced": [
    { label: "Indian Standards referred in Government regulations", href: en("standards/indian-standards-referred-in-government-regulations"), note: "Standards given legal force by another ministry's rules." },
    { label: "National Building Code", href: en("standards/national-building-code"), note: "A code that references a large set of Indian Standards." },
  ],
  "standards:clauses": [
    { label: "Standards catalogue (BIS webstore)", href: PORTALS.catalogue, note: "Clause-level text is only available in the published standard itself." },
  ],
  // Explains this system's own output — an outbound link would not answer it.
  "standards:why-relevant": [],

  // ------------------------------------------------------------ certification
  "certification:find": [
    { label: "Products under Compulsory Certification", href: en("product-certification/products-under-compulsory-certification"), note: "Start here to see whether a product needs a licence." },
    { label: "Know Your Standard", href: en("know-your-standard") },
    { label: "Product Certification FAQ", href: en("product-certification/product-certification-faq") },
  ],
  "certification:product": [
    { label: "Product Certification Overview", href: en("product-certification/product-certification-overview") },
    { label: "Scheme-I (ISI Mark Scheme)", href: en("product-certification/products-under-compulsory-certification/scheme-i-mark-scheme") },
    { label: "Product Specific Guidelines", href: en("product-certification/product-specific-guidelines") },
  ],
  "certification:management-systems": [
    { label: "System Certification Overview", href: en("system-certification-overview") },
    { label: "Systems Under Certification", href: en("system-certification-overview/systems-under-certification"), note: "The management-system standards BIS certifies against." },
    { label: "Who Can Apply", href: en("system-certification-overview/who-can-apply") },
  ],
  "certification:foreign-manufacturers": [
    { label: "FMCS Overview", href: en("fmcs/fmcs-overview"), note: "Foreign Manufacturers Certification Scheme." },
    { label: "Who Can Apply (FMCS)", href: en("fmcs/certification-process/who-can-apply") },
    { label: "Products under FMCS", href: en("fmcs/certification-process/products-under-fmcs") },
  ],
  "certification:hallmarking": [
    { label: "Hallmarking Overview", href: en("hallmarking-overview") },
    { label: "Mandatory Hallmarking Order", href: en("hallmarking-overview/mandatory-hallmarking-order") },
    { label: "List of Hallmarking Centres", href: en("hallmarking-overview/hallmarking-centre/list-of-hallmarking-centres") },
  ],
  "certification:registration-schemes": [
    { label: "Scheme-II (Registration Scheme)", href: en("product-certification/products-under-compulsory-certification/scheme-ii-registration-scheme") },
    { label: "Compulsory Registration", href: en("product-certification/compulsory-registration") },
    { label: "Jewellers Registration Scheme", href: en("hallmarking-overview/jewellers-registration-scheme") },
  ],
  "certification:schemes/product": [
    { label: "Scheme-I (ISI Mark Scheme)", href: en("product-certification/products-under-compulsory-certification/scheme-i-mark-scheme") },
    { label: "Scheme-X Certification", href: en("scheme-x-certification"), note: "Machinery and electrical equipment." },
    { label: "Products under Compulsory Certification", href: en("product-certification/products-under-compulsory-certification") },
  ],
  "certification:schemes/crs": [
    { label: "Compulsory Registration", href: en("product-certification/compulsory-registration") },
    { label: "About CRS (CRS portal)", href: PORTALS.crs },
    { label: "CRS registration", href: PORTALS.crsRegister },
  ],
  "certification:licence-information": [
    { label: "Online Information on Licences", href: en("product-certification/online-information") },
    { label: "Licence and application reports (Manak Online)", href: PORTALS.manakLicence },
    { label: "List of Licensed Jewellers", href: en("hallmarking-overview/jewellers-registration-scheme/list-of-licensed-jewellers") },
  ],
  "certification:scheme-product-mapping": [
    { label: "Products under Compulsory Certification", href: en("product-certification/products-under-compulsory-certification"), note: "The authoritative product-to-scheme mapping." },
    { label: "Scheme-I (ISI Mark Scheme)", href: en("product-certification/products-under-compulsory-certification/scheme-i-mark-scheme") },
    { label: "Scheme-II (Registration Scheme)", href: en("product-certification/products-under-compulsory-certification/scheme-ii-registration-scheme") },
  ],
  "certification:process": [
    { label: "Product Certification Process", href: en("product-certification/product-certification-process") },
    { label: "FMCS Certification Process", href: en("fmcs/certification-process") },
    { label: "Apply for a licence", href: en("apply-for-licences") },
  ],
  "certification:documents-required": [
    { label: "Product Specific Guidelines", href: en("product-certification/product-specific-guidelines"), note: "Documents and tests required per product." },
    { label: "Forms & Formats", href: en("forms-formats") },
    { label: "FMCS Forms and Formats", href: en("fmcs/forms-and-formats") },
  ],
  "certification:fees": [
    { label: "Product Certification Fee", href: en("product-certification/product-certification-fee") },
    { label: "Fee structure for MSCS", href: en("system-certification-overview/fee-structure-for-mscs"), note: "Management system certification." },
    { label: "FMCS Fee", href: en("fmcs/fmcs-fee") },
  ],
  "certification:renewal-modification": [
    { label: "Apply for Renewal of Licence", href: en("apply-for-renewal-of-license") },
    { label: "Renewal of Licence (system certification)", href: en("system-certification-overview/system-certification-licence/renewal-of-licence") },
    { label: "Renewal of Licence (FMCS)", href: en("fmcs/renewal-of-licence") },
  ],
  "certification:application-status": [
    { label: "Licence and application reports (Manak Online)", href: PORTALS.manakLicence },
    { label: "Online Information on Licences", href: en("product-certification/online-information") },
  ],

  // ----------------------------------------------------------------- testing
  "testing:": [
    { label: "Testing Overview", href: en("laboratorys/testing-overview"), note: "BIS's testing services and how they work." },
    { label: "List of Laboratories", href: en("laboratorys/list-of-laboratories"), note: "Laboratories operated by BIS." },
    { label: "List of BIS Recognised / Empanelled Labs", href: en("laboratorys/list-of-bis-recognized-lab"), note: "Third-party labs recognised by BIS for product testing." },
    { label: "Testing facility & testing charges", href: en("laboratorys/testing-facility-and-testing-charges"), note: "What each facility tests, and what it costs." },
    { label: "Request a testing service (Manak Online)", href: PORTALS.manak, note: "Submit a testing request through BIS's official portal." },
  ],
  "testing:laboratory-search": [
    { label: "List of Laboratories", href: en("laboratorys/list-of-laboratories") },
    { label: "List of BIS Recognised / Empanelled Labs", href: en("laboratorys/list-of-bis-recognized-lab") },
    { label: "Laboratory directory", href: en("directory/laboratory") },
  ],
  "testing:bis-laboratories": [
    { label: "List of Laboratories", href: en("laboratorys/list-of-laboratories"), note: "Laboratories operated by BIS." },
    { label: "Regional Branch Offices & Labs", href: en("regional-branch-offices-bis-list") },
    { label: "Laboratory directory", href: en("directory/laboratory") },
  ],
  "testing:services": [
    { label: "Laboratory Services Overview", href: en("laboratorys/laboratory-services-overview") },
    { label: "Testing Overview", href: en("laboratorys/testing-overview") },
    { label: "Laboratory FAQ", href: en("laboratorys/laboratory-services-overview/laboratory-faq") },
  ],
  "testing:facilities": [
    { label: "Testing facility & testing charges", href: en("laboratorys/testing-facility-and-testing-charges") },
    { label: "FMCS testing facilities", href: en("product-certification/fmcs-testing-facilities") },
  ],
  "testing:find-test-methods": [
    { label: "Standards catalogue (BIS webstore)", href: PORTALS.catalogue, note: "Test methods are specified inside the standard itself." },
    { label: "Uniform Test Report Formats", href: en("laboratorys/utrf"), note: "Formats recognised labs use under the Compulsory Registration Scheme." },
  ],
  "testing:information": [
    { label: "Testing Overview", href: en("laboratorys/testing-overview") },
    { label: "Laboratory Services Overview", href: en("laboratorys/laboratory-services-overview") },
  ],
  "testing:tests-for-standard": [
    { label: "Standards catalogue (BIS webstore)", href: PORTALS.catalogue, note: "The standard lists its own required tests." },
    { label: "Product Specific Guidelines", href: en("product-certification/product-specific-guidelines") },
  ],
  "testing:compare": [
    { label: "Testing facility & testing charges", href: en("laboratorys/testing-facility-and-testing-charges") },
    { label: "List of BIS Recognised / Empanelled Labs", href: en("laboratorys/list-of-bis-recognized-lab") },
  ],
  "testing:recognized-laboratories": [
    { label: "List of BIS Recognised / Empanelled Labs", href: en("laboratorys/list-of-bis-recognized-lab") },
    { label: "How to apply for BIS recognition", href: en("laboratorys/how-to-apply-for-bis-recognition") },
    { label: "CRS recognised labs", href: PORTALS.crsLabs },
  ],
  "testing:laboratory-services": [
    { label: "Laboratory Services Overview", href: en("laboratorys/laboratory-services-overview") },
    { label: "Testing facility & testing charges", href: en("laboratorys/testing-facility-and-testing-charges") },
  ],
  "testing:laboratory-contacts": [
    { label: "Laboratory contact us", href: en("laboratorys/testing-overview/laboratory-contact-us") },
    { label: "Laboratory directory", href: en("directory/laboratory") },
  ],

  // --------------------------------------------------------------- resources
  "resources:": [
    { label: "Standards catalogue (BIS webstore)", href: PORTALS.catalogue },
    { label: "Know Your Standard", href: en("know-your-standard") },
    { label: "Frequently Asked Questions", href: en("full-faq") },
  ],
  "resources:standards-catalogue": [
    { label: "Standards catalogue (BIS webstore)", href: PORTALS.catalogue, note: "Official sales catalogue for the full text of Indian Standards." },
    { label: "Compendium of Indian Standards", href: en("compendium-of-indian-standards") },
    { label: "Know Your Standard", href: en("know-your-standard") },
  ],
  "resources:technical-documents": [
    { label: "Technical Information Services (TIS)", href: en("standards/tisc") },
    { label: "Resource materials", href: en("resource-materials") },
    { label: "Library Services", href: en("library-services-2") },
  ],
  "resources:guidelines": [
    { label: "Product Specific Guidelines", href: en("product-certification/product-specific-guidelines") },
    { label: "Standardized Development and Building Regulations, 2023", href: en("standardized-development-and-building-regulations-2023") },
    { label: "BIS Logo Guidelines", href: en("bis-logo-guidelines") },
  ],
  "resources:handbooks": [
    { label: "E-books", href: en("e-book") },
    { label: "Booklets", href: en("booklets") },
    { label: "Auditor handbook", href: en("system-certification-overview/auditor-handbook") },
  ],
  "resources:codes-of-practice": [
    { label: "National Building Code", href: en("standards/national-building-code") },
    { label: "Standardized Development and Building Regulations, 2023", href: en("standardized-development-and-building-regulations-2023") },
    { label: "Standards catalogue (BIS webstore)", href: PORTALS.catalogue },
  ],
  "resources:standards-explained": [
    { label: "Standards India", href: en("consumer-overview/standards-india"), note: "BIS's own explanatory magazine." },
    { label: "Know Your Standard", href: en("know-your-standard") },
    { label: "Consumer Overview", href: en("consumer-overview") },
  ],
  // BIS publishes no single glossary page; the FAQs are the nearest real thing.
  "resources:glossary": [
    { label: "Frequently Asked Questions", href: en("full-faq"), note: "BIS does not publish a standalone glossary; terminology is defined inside each standard." },
    { label: "Standards catalogue (BIS webstore)", href: PORTALS.catalogue },
  ],
  "resources:faq": [
    { label: "Frequently Asked Questions", href: en("full-faq") },
    { label: "Consumer FAQ", href: en("consumer-overview/for-consumers-faq") },
    { label: "Product Certification FAQ", href: en("product-certification/product-certification-faq") },
  ],
  // No MSME- or startup-specific BIS landing page exists. These are the pages
  // a small manufacturer actually needs; labelled for what they are.
  "resources:msme": [
    { label: "Products under Compulsory Certification", href: en("product-certification/products-under-compulsory-certification"), note: "Whether your product needs a BIS licence." },
    { label: "Product Certification Process", href: en("product-certification/product-certification-process") },
    { label: "Product Certification Fee", href: en("product-certification/product-certification-fee") },
  ],
  "resources:startups": [
    { label: "Product Certification Overview", href: en("product-certification/product-certification-overview") },
    { label: "Know Your Standard", href: en("know-your-standard") },
    { label: "Standards National Action Plan (SNAP) 2022", href: en("standards-national-action-plan-snap-2022") },
  ],
  "resources:students": [
    { label: "Students Corner", href: en("students-corner-demo") },
    { label: "Trainings", href: en("trainings") },
    { label: "E-books", href: en("e-book") },
  ],
  "resources:publications": [
    { label: "Monthly BIS Newsletter", href: en("monthly-bis-newsletter") },
    { label: "Standards India", href: en("consumer-overview/standards-india") },
    { label: "E-books", href: en("e-book") },
  ],
  "resources:news": [
    { label: "What's New", href: en("whats-new") },
    { label: "Standards Watch", href: en("standardswatch") },
    { label: "Upcoming QCOs", href: en("upcoming-qcos-notified-and-due-for-implementation"), note: "Quality Control Orders notified and due for implementation." },
  ],
  "resources:reports": [
    { label: "Annual Report", href: en("the-bureau/annual-report") },
    { label: "Enforcement Activities", href: en("enforcement-activities") },
    { label: "Review statements", href: en("the-bureau-2/review-statements") },
  ],
  "resources:circulars": [
    { label: "What's New / Notifications", href: en("whats-new-notifications") },
    { label: "Public alert for product recall", href: en("public-alert-for-product-recall-on-account-of-non-conformity-of-product") },
    { label: "Upcoming QCOs", href: en("upcoming-qcos-notified-and-due-for-implementation") },
  ],

  // -------------------------------------------------------------- e-services
  "e-services:": [
    { label: "Manak Online (BIS e-services portal)", href: PORTALS.manak },
    { label: "Licence and application reports", href: PORTALS.manakLicence },
    { label: "BIS Care app", href: en("bis-apps") },
  ],
  "e-services:apply-certification": [
    { label: "Apply for a licence", href: en("apply-for-licences") },
    { label: "Manak Online (BIS e-services portal)", href: PORTALS.manak },
    { label: "Apply online (system certification)", href: en("system-certification-overview/system-certification-apply-online") },
  ],
  "e-services:licence-services": [
    { label: "Licence and application reports", href: PORTALS.manakLicence },
    { label: "Online Information on Licences", href: en("product-certification/online-information") },
    { label: "Apply for Renewal of Licence", href: en("apply-for-renewal-of-license") },
  ],
  "e-services:registration-services": [
    { label: "CRS registration", href: PORTALS.crsRegister },
    { label: "Apply for Jewellers Registration", href: en("apply-for-jewellers-registration") },
    { label: "Scheme-X registration portal", href: en("scheme-x-certification/registration-portal") },
  ],
  "e-services:hallmarking-services": [
    { label: "Hallmarking Overview", href: en("hallmarking-overview") },
    { label: "Apply for Jewellers Registration", href: en("apply-for-jewellers-registration") },
    { label: "List of Hallmarking Centres", href: en("hallmarking-overview/hallmarking-centre/list-of-hallmarking-centres") },
  ],
  "e-services:laboratory-services": [
    { label: "Laboratory Services Overview", href: en("laboratorys/laboratory-services-overview") },
    { label: "How to apply for BIS recognition", href: en("laboratorys/how-to-apply-for-bis-recognition") },
    { label: "Uniform Test Report Formats", href: en("laboratorys/utrf") },
  ],
  "e-services:track-application": [
    { label: "Licence and application reports", href: PORTALS.manakLicence },
    { label: "Manak Online (BIS e-services portal)", href: PORTALS.manak },
  ],
  "e-services:check-licence": [
    { label: "Online Information on Licences", href: en("product-certification/online-information") },
    { label: "Licence and application reports", href: PORTALS.manakLicence },
    { label: "List of Licensed Jewellers", href: en("hallmarking-overview/jewellers-registration-scheme/list-of-licensed-jewellers") },
  ],
  "e-services:verify-certificate": [
    { label: "Online Information on Licences", href: en("product-certification/online-information") },
    { label: "Licence and application reports", href: PORTALS.manakLicence },
    { label: "BIS Care app", href: en("bis-apps"), note: "Verify an ISI mark, hallmark, or registration number." },
  ],
  "e-services:verify-bis-mark": [
    { label: "BIS Care app", href: en("bis-apps"), note: "BIS's official app for verifying a mark and filing a complaint." },
    { label: "Online Information on Licences", href: en("product-certification/online-information") },
    { label: "Online Complaint Registration", href: en("consumer-overview/online-complaint-registration") },
  ],
  "e-services:application-status": [
    { label: "Licence and application reports", href: PORTALS.manakLicence },
    { label: "Manak Online (BIS e-services portal)", href: PORTALS.manak },
  ],
  "e-services:payments": [
    { label: "Manak Online (BIS e-services portal)", href: PORTALS.manak, note: "Fees are paid through the portal that holds the application." },
    { label: "Product Certification Fee", href: en("product-certification/product-certification-fee") },
  ],
  "e-services:submit-documents": [
    { label: "Manak Online (BIS e-services portal)", href: PORTALS.manak },
    { label: "Forms & Formats", href: en("forms-formats") },
  ],
  "e-services:download-documents": [
    { label: "Forms & Formats", href: en("forms-formats") },
    { label: "FMCS Forms and Formats", href: en("fmcs/forms-and-formats") },
    { label: "Download approach forms", href: en("system-certification-overview/download-approach-forms") },
  ],
  "e-services:account": [
    { label: "Manak Online (BIS e-services portal)", href: PORTALS.manak, note: "BIS accounts live on the official portal; this system has no login." },
  ],

  // ------------------------------------------------------------------- about
  "about:vision-mission": [
    { label: "About BIS", href: en("the-bureau/about-bis") },
    { label: "Origin of BIS", href: en("the-bureau/origin-of-bis") },
  ],
  "about:organisation": [
    { label: "Organization", href: en("the-bureau/organization-2") },
    { label: "Bureau members", href: en("the-bureau/organization-2/bureau-members") },
    { label: "Head Quarter", href: en("head-quarter") },
  ],
  "about:leadership": [
    { label: "Director General", href: en("the-bureau/director-general") },
    { label: "President", href: en("the-bureau/president") },
    { label: "Vice President", href: en("the-bureau-2/vice-president") },
  ],
  "about:departments": [
    { label: "Standardization (Products & Methods)", href: en("standards/standardization-products-methods") },
    { label: "Technical Information Services (TIS)", href: en("standards/tisc") },
    { label: "Organization", href: en("the-bureau/organization-2") },
  ],
  "about:acts-regulations": [
    { label: "BIS Act, Rules & Regulations", href: en("the-bureau/bis-act-rules-and-regulations") },
    { label: "The Bureau — regulations", href: en("the-bureau-2") },
    { label: "Hallmarking Regulation 2018", href: en("hallmarking-overview/hallmarking-regulation-2018") },
  ],
  "about:rules-regulations": [
    { label: "BIS Act, Rules & Regulations", href: en("the-bureau/bis-act-rules-and-regulations") },
    { label: "The Bureau — regulations", href: en("the-bureau-2") },
  ],
  "about:policies": [
    { label: "Website policies", href: en("website-policies") },
    { label: "Copyright policy", href: en("copyright-policy") },
    { label: "Terms and conditions", href: en("terms-and-conditions") },
  ],
  "about:committees": [
    { label: "Governing Council", href: en("the-bureau/governining-council") },
    { label: "GC members", href: en("the-bureau/organization-2/gc-members") },
    { label: "GC proceedings", href: en("the-bureau/organization-2/gc-proceedings") },
  ],
  "about:standards-development-process": [
    { label: "Standards Formulation", href: en("standards/standard-formulation") },
    { label: "Standards Under Development", href: en("standards/standard-formulation/standards-under-development") },
    { label: "Other Standardization Bodies", href: en("standards/other-standardization-bodies") },
  ],
  "about:regional-offices": [
    { label: "Regional Offices", href: en("directory/regional-offices") },
    { label: "Regional Branch Offices & Labs", href: en("regional-branch-offices-bis-list") },
  ],
  "about:branches": [
    { label: "Branch Office", href: en("directory/branch-office") },
    { label: "Regional Branch Offices & Labs", href: en("regional-branch-offices-bis-list") },
    { label: "Sales Office", href: en("directory/sales-office") },
  ],
  "about:laboratories": [
    { label: "Laboratory directory", href: en("directory/laboratory") },
    { label: "List of Laboratories", href: en("laboratorys/list-of-laboratories") },
    { label: "Testing Overview", href: en("laboratorys/testing-overview") },
  ],
  "about:international-cooperation": [
    { label: "BIS at ISO/IEC", href: en("bis-iso-iec") },
    { label: "Other Standardization Bodies", href: en("standards/other-standardization-bodies") },
  ],
  "about:annual-reports": [
    { label: "Annual Report", href: en("the-bureau/annual-report") },
    { label: "Review statements", href: en("the-bureau-2/review-statements") },
  ],
  "about:rti": [
    { label: "RTI", href: en("rti") },
    { label: "CPIOs and FAAs", href: en("rti/cpios-and-faas") },
    { label: "Proactive disclosure", href: en("proactive-declaration") },
  ],
  "about:careers": [
    { label: "Career Opportunities", href: en("career-opportunities") },
    { label: "Recruitment regulations", href: en("career-opportunities/recruitment-regulations") },
  ],
  "about:tenders": [
    { label: "Tender Details", href: en("tender-details") },
    { label: "Cancelled tenders", href: en("cancel-tenders") },
    { label: "Tender archive", href: en("tender-archive") },
  ],
  "about:contact-directory": [
    { label: "Directory", href: en("directory/directory") },
    { label: "Enquiry related to BIS activities", href: en("directory/enquiry") },
    { label: "Regional Offices", href: en("directory/regional-offices") },
  ],
};

/**
 * Official channels for the Contact page. Not a placeholder section, but kept
 * here so every official URL in the app has one home and one provenance rule.
 */
export const CONTACT_CHANNELS: OfficialLink[] = [
  { label: "Enquiry related to BIS activities", href: en("directory/enquiry"), note: "Who to contact for standards, certification, testing, or training questions." },
  { label: "Online complaint registration", href: en("consumer-overview/online-complaint-registration"), note: "File a complaint about a product carrying the ISI mark or a hallmark." },
  { label: "BIS directory", href: en("directory/directory"), note: "Head office, regional, branch, and laboratory contacts." },
  { label: "Regional offices", href: en("directory/regional-offices"), note: "Addresses and contacts for BIS regional offices." },
];

/**
 * Verified official destinations for a placeholder page. Returns `[]` when
 * no official page genuinely answers the item — callers should then say so
 * rather than linking somewhere unrelated.
 */
export function getOfficialLinks(sectionKey: string, slug: string): OfficialLink[] {
  return LINKS[`${sectionKey}:${slug}`] ?? [];
}

/** Every distinct URL in this file, for the link checker and its test. */
export function allOfficialUrls(): string[] {
  const all = [...Object.values(LINKS).flat(), ...CONTACT_CHANNELS];
  return [...new Set(all.map((l) => l.href))].sort();
}

export const OFFICIAL_LINKS = LINKS;
