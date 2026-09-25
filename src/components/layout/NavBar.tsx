import { Header } from "@/components/layout/Header";

/**
 * NavBar now delegates entirely to Header, which renders GovernmentBar
 * internally. Kept as a re-export so existing imports (e.g. HomeClient)
 * don't break.
 */
export function NavBar() {
  return <Header />;
}
