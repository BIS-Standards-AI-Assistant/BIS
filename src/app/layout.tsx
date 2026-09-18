import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { LanguageProvider } from "@/components/providers/LanguageProvider";
import { BisChatBot } from "@/components/chat/BisChatBot";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BIS Assistant | Bureau of Indian Standards",
  description: "AI-powered assistant for discovering applicable Indian Standards, certification routes, and testing requirements — backed by authoritative BIS sources.",
};

/** Defaults to light regardless of OS preference — dark mode is opt-in only, via the toggle. */
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("bis-theme");
    var theme = stored === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {}
})();
`;

// P2-17: valid lang codes the app actually supports
const VALID_LANGS = new Set(["en", "hi", "bn", "ta", "te", "mr", "gu", "kn"]);

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // P2-17: read the language cookie so SSR markup has the correct lang
  const cookieStore = await cookies();
  const cookieLang = cookieStore.get("bis-lang")?.value ?? "en";
  const lang = VALID_LANGS.has(cookieLang) ? cookieLang : "en";

  return (
    <html
      lang={lang}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <LanguageProvider>
          {children}
          {/* Site-wide "Ask BIS Assistant" widget -- present on every page (not
              just the homepage's inline search), for general questions about
              standards/certification/testing. Goes through the same
              /api/v1/chat -> runQueryPipeline path as the main search, so it
              inherits the same guardrails (fixed refusal, relevance floor,
              no fabricated citations) rather than being a separate, looser
              chat surface. */}
          <BisChatBot />
        </LanguageProvider>
      </body>
    </html>
  );
}
