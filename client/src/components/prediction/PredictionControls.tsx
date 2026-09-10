import { useState } from "react";
import { Lock, Pencil, Play, Trophy, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../ui/Button";
import { ConfirmModal } from "../ui/ConfirmModal";
import { api } from "../../lib/api";
import { useToastStore } from "../../store/toastStore";
import type { Prediction } from "../../types";

interface PredictionControlsProps {
  prediction: Prediction;
  onChanged: (updated: Prediction) => void;
}

/**
 * Creator-only lifecycle controls. Every action calls the server, which is
 * the sole authority on whether the transition is legal -- these buttons
 * are just convenience; a rejected transition surfaces as a toast, not a
 * client-side guess about what's allowed.
 */
export function PredictionControls({ prediction, onChanged }: PredictionControlsProps) {
  const [pending, setPending] = useState<"start" | "lock" | "cancel" | "resolve" | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [resolveOutcomeId, setResolveOutcomeId] = useState<string | null>(null);
  const push = useToastStore((s) => s.push);

  async function run(action: "start" | "lock" | "cancel", verb: string) {
    setPending(action);
    try {
      const updated = await api.post<Prediction>(`/predictions/${prediction.id}/${action}`);
      onChanged(updated);
      push(`Prediction ${verb}.`, "success");
    } catch (err) {
      push(err instanceof Error ? err.message : "Something went wrong.", "error");
    } finally {
      setPending(null);
      setConfirmCancel(false);
    }
  }

  async function resolve(outcomeId: string) {
    setPending("resolve");
    try {
      const updated = await api.post<Prediction>(`/predictions/${prediction.id}/resolve`, {
        winningOutcomeId: outcomeId,
      });
      onChanged(updated);
      push("Prediction resolved.", "success");
    } catch (err) {
      push(err instanceof Error ? err.message : "Something went wrong.", "error");
    } finally {
      setPending(null);
      setResolveOutcomeId(null);
    }
  }

  if (prediction.status === "DRAFT") {
    return (
      <div className="flex gap-2">
        <Button onClick={() => run("start", "started")} loading={pending === "start"}>
          <Play className="h-4 w-4" /> Start prediction
        </Button>
        <Link to={`/predict/${prediction.id}/edit`}>
          <Button variant="secondary">
            <Pencil className="h-4 w-4" /> Edit
          </Button>
        </Link>
        <Button variant="ghost" onClick={() => setConfirmCancel(true)}>
          <X className="h-4 w-4" /> Discard
        </Button>
        <ConfirmModal
          open={confirmCancel}
          title="Discard this prediction?"
          description="This draft hasn't started yet. Discarding it cannot be undone."
          confirmLabel="Discard"
          variant="danger"
          loading={pending === "cancel"}
          onConfirm={() => run("cancel", "discarded")}
          onCancel={() => setConfirmCancel(false)}
        />
      </div>
    );
  }

  if (prediction.status === "ACTIVE") {
    return (
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => run("lock", "locked")} loading={pending === "lock"}>
          <Lock className="h-4 w-4" /> Lock now
        </Button>
        <Button variant="ghost" onClick={() => setConfirmCancel(true)}>
          <X className="h-4 w-4" /> Cancel
        </Button>
        <ConfirmModal
          open={confirmCancel}
          title="Cancel this prediction?"
          description="Entries will be void and no points will be awarded. This cannot be undone."
          confirmLabel="Cancel prediction"
          variant="danger"
          loading={pending === "cancel"}
          onConfirm={() => run("cancel", "cancelled")}
          onCancel={() => setConfirmCancel(false)}
        />
      </div>
    );
  }

  if (prediction.status === "LOCKED") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-ui text-sm text-text-secondary">Pick the winning outcome:</span>
        {prediction.outcomes.map((o) => (
          <Button
            key={o.id}
            variant="secondary"
            onClick={() => setResolveOutcomeId(o.id)}
            loading={pending === "resolve" && resolveOutcomeId === o.id}
          >
            <Trophy className="h-4 w-4" /> {o.label}
          </Button>
        ))}
        <ConfirmModal
          open={resolveOutcomeId !== null}
          title="Confirm the winning outcome"
          description={`This resolves the prediction and pays out "${
            prediction.outcomes.find((o) => o.id === resolveOutcomeId)?.label ?? ""
          }". This cannot be undone.`}
          confirmLabel="Resolve"
          loading={pending === "resolve"}
          onConfirm={() => resolveOutcomeId && resolve(resolveOutcomeId)}
          onCancel={() => setResolveOutcomeId(null)}
        />
      </div>
    );
  }

  return null;
}
