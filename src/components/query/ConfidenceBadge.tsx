import type { Confidence } from "@/types/api";
import { Badge } from "@/components/ui/Badge";

const TONE: Record<Confidence, "success" | "warning" | "danger" | "neutral"> = {
  high: "success",
  medium: "warning",
  low: "danger",
  none: "neutral",
};

const LABEL: Record<Confidence, string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
  none: "No verified evidence",
};

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  return <Badge tone={TONE[confidence]}>{LABEL[confidence]}</Badge>;
}
