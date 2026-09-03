import type { Confidence } from "@/types/api";
import { Badge } from "@/components/ui/Badge";

const TONE: Record<Confidence, "success" | "warning" | "danger" | "neutral"> = {
  high: "success",
  medium: "warning",
  low: "danger",
  none: "neutral",
};

// Evidence-oriented labels, not raw confidence-score language — the
// reader should see what evidence supports a result, not what score an
// internal model assigned it. The underlying `confidence` value and its
// tone still come straight from the engine; only the wording changes.
const LABEL: Record<Confidence, string> = {
  high: "Verified evidence",
  medium: "Partially supported",
  low: "Limited evidence",
  none: "No verified evidence",
};

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  return <Badge tone={TONE[confidence]}>{LABEL[confidence]}</Badge>;
}
