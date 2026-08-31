/**
 * Single source of truth for the primary navigation. Every mega-menu item
 * declared here is a real, loading route — `real: true` items point at
 * actual working features (search, compare, the query engine); everything
 * else resolves through a shared catch-all page (see
 * src/components/layout/PlaceholderPage.tsx and the [...slug] routes under
 * each top-level section) that renders the item's own label/description
 * with an honest "not yet available" state, never a 404 and never invented
 * content.
 *
 * This file drives BOTH the mega-menu UI in Header.tsx AND the routing —
 * add an item once, it's navigable and has a page.
 */

export interface NavItem {
  label: string;
  slug: string; // path segment(s) under the section root, e.g. "hallmarking" or "schemes/crs"
  description: string;
  real?: boolean; // true = links to an actual working feature (href below), not a placeholder
  href?: string; // only set when real; overrides the computed placeholder path
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export interface NavSection {
  key: string;
  label: string;
  rootHref: string;
  rootLabel: string; // label used for the section's own "Overview" page
  rootDescription: string;
  groups: NavGroup[];
  cta?: { heading: string; body: string; ctaLabel: string; ctaHref: string };
  /**
   * Base path for this section's placeholder sub-pages, if it differs from
   * rootHref. Only Standards needs this: /standards/[id] already occupies a
   * single dynamic segment for real standard detail pages, and Next.js
   * cannot have both /standards/[id] and /standards/[...slug] as siblings,
   * so its placeholder catch-all lives at /standards/explore instead. Every
   * other section's placeholders live directly under rootHref.
   */
  placeholderBasePath?: string;
}

export const STANDARDS_SECTION: NavSection = {
  key: "standards",
  label: "Standards",
  rootHref: "/standards",
  placeholderBasePath: "/standards/explore",
  rootLabel: "Browse Standards",
  rootDescription: "Every Indian Standard currently in this system's knowledge base.",
  groups: [
    {
      title: "Discover Standards",
      items: [
        { label: "Find an Indian Standard", slug: "", real: true, href: "/?focus=search", description: "Describe a product or process and get evidence-backed standard recommendations." },
        { label: "Browse Standards", slug: "", real: true, href: "/standards", description: "See every ingested standard directly." },
        { label: "Standards by Product", slug: "by-product", description: "Browse standards grouped by product category." },
        { label: "Standards by Industry", slug: "by-industry", description: "Browse standards grouped by industry sector." },
        { label: "Standards by Material", slug: "by-material", description: "Browse standards grouped by material." },
      ],
    },
    {
      title: "Understand Standards",
      items: [
        { label: "Standard Explorer", slug: "explorer", description: "A structured way to explore a standard's scope, sections, and clauses beyond the detail page." },
        { label: "Compare Standards", slug: "", real: true, href: "/compare", description: "Place two or more standards side by side to see sourced differences." },
        { label: "Standards Versions & Amendments", slug: "versions", description: "Track editions, revisions, and amendments to a standard over time." },
        { label: "Related Standards", slug: "related", description: "Standards connected to one another by scope, material, or reference." },
        { label: "Referenced Standards", slug: "referenced", description: "Other Indian Standards a given standard explicitly references." },
        { label: "Clauses & Requirements", slug: "clauses", description: "Look up a specific clause or requirement directly. Standards already ingested into this system carry real clause-level evidence — browse them below to see it." },
      ],
    },
    {
      title: "Standards Intelligence",
      items: [
        { label: "Ask about a Standard", slug: "", real: true, href: "/?focus=search", description: "Ask a natural-language question and get a grounded, cited answer." },
        { label: "Find Relevant Standards", slug: "", real: true, href: "/standards", description: "Describe your product to discover potentially applicable standards." },
        { label: "Why is this Standard Relevant?", slug: "why-relevant", description: "Every recommendation from the query engine already includes a grounded relevance explanation — this page explains how to read it." },
      ],
    },
  ],
  cta: {
    heading: "Can't find the right standard?",
    body: "Describe your product or requirement and explore potentially relevant BIS standards.",
    ctaLabel: "Find Relevant Standards →",
    ctaHref: "/standards",
  },
};

export const CERTIFICATION_SECTION: NavSection = {
  key: "certification",
  label: "Certification",
  rootHref: "/certification",
  rootLabel: "Certification Overview",
  rootDescription: "Understand BIS certification schemes, procedures, and requirements.",
  groups: [
    {
      title: "Certification",
      items: [
        { label: "Certification Overview", slug: "", description: "What BIS certification is and when it applies." },
        { label: "Find Certification Information", slug: "find", description: "Look up certification information for a specific product." },
        { label: "Product Certification", slug: "product", description: "Scheme-I product certification (the ISI mark)." },
        { label: "Management Systems Certification", slug: "management-systems", description: "Certification for quality, environmental, and other management systems." },
        { label: "Foreign Manufacturers", slug: "foreign-manufacturers", description: "Certification pathways for manufacturers outside India." },
        { label: "Hallmarking", slug: "hallmarking", description: "Gold and silver hallmarking under BIS." },
        { label: "Registration Schemes", slug: "registration-schemes", description: "Compulsory Registration Scheme and related registration routes." },
      ],
    },
    {
      title: "Schemes & Licences",
      items: [
        { label: "Product Certification Schemes", slug: "schemes/product", description: "The different schemes under which a product can be certified." },
        { label: "Compulsory Registration Scheme", slug: "schemes/crs", description: "CRS for electronics and IT goods." },
        { label: "BIS Licence Information", slug: "licence-information", description: "What a BIS licence covers and how it's structured." },
        { label: "Scheme / Product Mapping", slug: "scheme-product-mapping", description: "Which scheme applies to which product category." },
      ],
    },
    {
      title: "Assistance",
      items: [
        { label: "Certification Process", slug: "process", description: "The step-by-step certification process." },
        { label: "Documents Required", slug: "documents-required", description: "Documentation needed to apply for certification." },
        { label: "Fees & Charges", slug: "fees", description: "Fee structure for certification and licensing." },
        { label: "Renewal / Modification", slug: "renewal-modification", description: "Renewing or modifying an existing licence." },
        { label: "Application Status", slug: "application-status", description: "Check the status of a certification application." },
      ],
    },
  ],
  cta: {
    heading: "Not sure which certification information applies?",
    body: "Describe your product and see what evidence-backed certification information exists for it — the query engine never determines legal compliance on its own.",
    ctaLabel: "Explore Certification Information →",
    ctaHref: "/certification",
  },
};

export const TESTING_SECTION: NavSection = {
  key: "testing",
  label: "Testing",
  rootHref: "/testing",
  rootLabel: "Testing Overview",
  rootDescription: "Find relevant test methods, parameters, and recognized laboratories.",
  groups: [
    {
      title: "Testing Services",
      items: [
        { label: "Testing Overview", slug: "", description: "How BIS testing requirements work." },
        { label: "Laboratory Search", slug: "laboratory-search", description: "Find a testing laboratory." },
        { label: "Testing Services", slug: "services", description: "Services offered by BIS testing labs." },
        { label: "Testing Facilities", slug: "facilities", description: "Facilities and equipment available for testing." },
      ],
    },
    {
      title: "Test Intelligence",
      items: [
        { label: "Find Test Methods", slug: "find-test-methods", description: "Look up the test method associated with a requirement." },
        { label: "Testing Information", slug: "information", description: "General testing information sourced from ingested standards." },
        { label: "Tests Associated with a Standard", slug: "tests-for-standard", description: "The specific tests a given standard requires." },
        { label: "Compare Testing Information", slug: "compare", description: "Compare testing requirements across standards." },
      ],
    },
    {
      title: "Laboratories",
      items: [
        { label: "BIS Laboratories", slug: "bis-laboratories", description: "Laboratories operated directly by BIS." },
        { label: "Recognized / Empanelled Laboratories", slug: "recognized-laboratories", description: "Third-party laboratories recognized by BIS." },
        { label: "Laboratory Services", slug: "laboratory-services", description: "Services offered by recognized laboratories." },
        { label: "Laboratory Contacts", slug: "laboratory-contacts", description: "Contact information for laboratories." },
      ],
    },
  ],
  cta: {
    heading: "Looking for testing information?",
    body: "Ask about a product and see what testing information the ingested standards actually establish for it.",
    ctaLabel: "Explore Testing Information →",
    ctaHref: "/testing",
  },
};

export const RESOURCES_SECTION: NavSection = {
  key: "resources",
  label: "Resources",
  rootHref: "/resources",
  rootLabel: "Resources",
  rootDescription: "Standards resources, learning materials, publications, and tools.",
  groups: [
    {
      title: "Standards Resources",
      items: [
        { label: "Standards Catalogue", slug: "standards-catalogue", description: "A catalogue of standards beyond the current ingested corpus." },
        { label: "Technical Documents", slug: "technical-documents", description: "Supporting technical documentation." },
        { label: "Guidelines", slug: "guidelines", description: "BIS guidelines for manufacturers and applicants." },
        { label: "Handbooks", slug: "handbooks", description: "Reference handbooks." },
        { label: "Codes of Practice", slug: "codes-of-practice", description: "Codes of practice referenced by standards." },
      ],
    },
    {
      title: "Learning",
      items: [
        { label: "Standards Explained", slug: "standards-explained", description: "Plain-language explanations of how Indian Standards work." },
        { label: "BIS Glossary", slug: "glossary", description: "Terminology used across BIS standards and services." },
        { label: "Frequently Asked Questions", slug: "faq", description: "Common questions about standards and certification." },
        { label: "MSME Resources", slug: "msme", description: "Resources specifically for small and medium enterprises." },
        { label: "Startup Resources", slug: "startups", description: "Resources for early-stage manufacturers." },
        { label: "Student Resources", slug: "students", description: "Resources for students and researchers." },
      ],
    },
    {
      title: "Publications",
      items: [
        { label: "BIS Publications", slug: "publications", description: "Official BIS publications." },
        { label: "News & Updates", slug: "news", description: "Recent BIS news and updates." },
        { label: "Reports", slug: "reports", description: "BIS reports." },
        { label: "Circulars / Notices", slug: "circulars", description: "Circulars and official notices." },
      ],
    },
    {
      title: "Tools",
      items: [
        { label: "Standards Comparison", slug: "", real: true, href: "/compare", description: "Compare two or more standards side by side." },
        { label: "Document Search", slug: "", real: true, href: "/search", description: "Keyword and semantic search across ingested BIS documents." },
        { label: "BIS Standards Assistant", slug: "", real: true, href: "/?focus=search", description: "Ask a question and get a grounded, cited answer." },
      ],
    },
  ],
};

export const ESERVICES_SECTION: NavSection = {
  key: "e-services",
  label: "e-Services",
  rootHref: "/e-services",
  rootLabel: "e-Services",
  rootDescription: "Online, tracking, and account services.",
  groups: [
    {
      title: "Online Services",
      items: [
        { label: "Apply for Certification", slug: "apply-certification", description: "Start a certification application." },
        { label: "Licence Services", slug: "licence-services", description: "Manage an existing licence." },
        { label: "Registration Services", slug: "registration-services", description: "CRS and other registration services." },
        { label: "Hallmarking Services", slug: "hallmarking-services", description: "Jeweller registration and hallmarking services." },
        { label: "Laboratory Services", slug: "laboratory-services", description: "Request laboratory services." },
      ],
    },
    {
      title: "Track & Manage",
      items: [
        { label: "Track Application", slug: "track-application", description: "Track the status of a submitted application." },
        { label: "Check Licence", slug: "check-licence", description: "Look up licence status and details." },
        { label: "Verify Certificate", slug: "verify-certificate", description: "Verify a certificate's authenticity." },
        { label: "Verify BIS Mark", slug: "verify-bis-mark", description: "Verify a product's BIS/ISI mark." },
        { label: "Application Status", slug: "application-status", description: "Check application status." },
      ],
    },
    {
      title: "Digital Services",
      items: [
        { label: "Online Payments", slug: "payments", description: "Pay fees online." },
        { label: "Submit Documents", slug: "submit-documents", description: "Upload documents for an application." },
        { label: "Download Documents", slug: "download-documents", description: "Download certificates and related documents." },
        { label: "User Account / Dashboard", slug: "account", description: "Manage your account." },
      ],
    },
  ],
};

export const ABOUT_SECTION: NavSection = {
  key: "about",
  label: "About BIS",
  rootHref: "/about",
  rootLabel: "About BIS",
  rootDescription: "Organisation, governance, network, and public information.",
  groups: [
    {
      title: "About",
      items: [
        { label: "About BIS", slug: "", description: "What the Bureau of Indian Standards is and does." },
        { label: "Vision & Mission", slug: "vision-mission", description: "BIS's vision and mission." },
        { label: "Organisation", slug: "organisation", description: "Organisational structure." },
        { label: "Leadership", slug: "leadership", description: "BIS leadership." },
        { label: "Departments", slug: "departments", description: "BIS departments." },
      ],
    },
    {
      title: "Governance",
      items: [
        { label: "Acts & Regulations", slug: "acts-regulations", description: "The BIS Act and related regulations." },
        { label: "Rules & Regulations", slug: "rules-regulations", description: "Operational rules and regulations." },
        { label: "Policies", slug: "policies", description: "BIS policies." },
        { label: "Committees", slug: "committees", description: "Technical and governing committees." },
        { label: "Standards Development Process", slug: "standards-development-process", description: "How an Indian Standard is developed." },
      ],
    },
    {
      title: "BIS Network",
      items: [
        { label: "Regional Offices", slug: "regional-offices", description: "BIS regional offices." },
        { label: "Branches", slug: "branches", description: "BIS branch offices." },
        { label: "Laboratories", slug: "laboratories", description: "BIS laboratory network." },
        { label: "International Cooperation", slug: "international-cooperation", description: "International standards cooperation." },
      ],
    },
    {
      title: "Information",
      items: [
        { label: "Annual Reports", slug: "annual-reports", description: "BIS annual reports." },
        { label: "RTI", slug: "rti", description: "Right to Information." },
        { label: "Careers", slug: "careers", description: "Careers at BIS." },
        { label: "Tenders", slug: "tenders", description: "Open tenders." },
        { label: "Contact Directory", slug: "contact-directory", description: "Contact directory." },
      ],
    },
  ],
};

export const NAV_SECTIONS: NavSection[] = [
  STANDARDS_SECTION,
  CERTIFICATION_SECTION,
  TESTING_SECTION,
  RESOURCES_SECTION,
  ESERVICES_SECTION,
  ABOUT_SECTION,
];

/**
 * The single place that turns a nav item into a URL. A placeholder item
 * (no `real`, no explicit `href`) resolves under the section's
 * placeholderBasePath when set, or rootHref otherwise — MegaMenu and the
 * mobile nav menu both call this rather than each re-deriving the path, so
 * a section like Standards with a non-default placeholder base can't drift
 * out of sync between the two menus again.
 */
export function navItemHref(section: NavSection, item: Pick<NavItem, "slug" | "href">): string {
  if (item.href) return item.href;
  if (!item.slug) return section.rootHref;
  return `${section.placeholderBasePath ?? section.rootHref}/${item.slug}`;
}

export function findNavItem(sectionKey: string, slug: string[]): { section: NavSection; item: NavItem } | null {
  const section = NAV_SECTIONS.find((s) => s.key === sectionKey);
  if (!section) return null;
  const path = slug.join("/");
  for (const group of section.groups) {
    const item = group.items.find((i) => i.slug === path);
    if (item) return { section, item };
  }
  return null;
}
