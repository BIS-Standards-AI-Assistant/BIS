import { Suspense } from "react";
import { HomeClient } from "@/components/home/HomeClient";

export default function Home() {
  return (
    <Suspense>
      <HomeClient />
    </Suspense>
  );
}
