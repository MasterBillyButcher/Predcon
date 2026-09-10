import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Minus, Plus } from "lucide-react";
import clsx from "clsx";
import { api, ApiRequestError } from "../lib/api";
import { Button } from "../components/ui/Button";
import { Field } from "../components/ui/Field";
import { LoadingState } from "../components/ui/LoadingState";
import { ErrorState } from "../components/ui/ErrorState";
import { useToastStore } from "../store/toastStore";
import { OUTCOME_COLOR_ORDER, outcomeBg } from "../lib/colors";
import type { OutcomeColor, Prediction } from "../types";

interface OutcomeField {
  label: string;
  color: OutcomeColor;
}

/**
 * Editing a DRAFT prediction before it goes live. The server rejects this
 * once the prediction has started (PREDICTION_NOT_EDITABLE), matching the
 * same rule this page enforces on load: if it's not a draft anymore,
 * there's nothing to edit here.
 */
export function PredictEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const push = useToastStore((s) => s.push);

  const [loaded, setLoaded] = useState<Prediction | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notEditable, setNotEditable] = useState(false);

  const [question, setQuestion] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [outcomes, setOutcomes] = useState<OutcomeField[]>([]);
  const [minPoints, setMinPoints] = useState("1");
  const [maxPoints, setMaxPoints] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    api
      .get<Prediction>(`/predictions/${id}`)
      .then((p) => {
        if (p.status !== "DRAFT") {
          setNotEditable(true);
          return;
        }
        setLoaded(p);
        setQuestion(p.question);
        setTitle(p.title ?? "");
        setDescription(p.description ?? "");
        setOutcomes(p.outcomes.map((o) => ({ label: o.label, color: o.color })));
        setMinPoints(String(p.minPoints));
        setMaxPoints(p.maxPoints ? String(p.maxPoints) : "");
      })
      .catch(() => setLoadError("Couldn't load this prediction."));
  }, [id]);

  function updateOutcome(index: number, label: string) {
    setOutcomes((prev) => prev.map((o, i) => (i === index ? { ...o, label } : o)));
  }

  function addOutcome() {
    if (outcomes.length >= 4) return;
    setOutcomes((prev) => [...prev, { label: "", color: OUTCOME_COLOR_ORDER[prev.length] }]);
  }

  function removeOutcome(index: number) {
    if (outcomes.length <= 2) return;
    setOutcomes((prev) => prev.filter((_, i) => i !== index));
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!question.trim()) next.question = "Question is required";
    const filled = outcomes.map((o) => o.label.trim());
    if (filled.some((l) => !l)) next.outcomes = "Every outcome needs text";
    else if (new Set(filled.map((l) => l.toLowerCase())).size !== filled.length) {
      next.outcomes = "Outcomes must be unique";
    }
    if (maxPoints && Number(maxPoints) < Number(minPoints || 1)) {
      next.maxPoints = "Maximum must be at least the minimum";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit() {
    if (!id || !validate()) return;
    setSubmitting(true);
    try {
      await api.patch<Prediction>(`/predictions/${id}`, {
        question: question.trim(),
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        outcomes: outcomes.map((o) => ({ label: o.label.trim(), color: o.color })),
        minPoints: Number(minPoints || 1),
        maxPoints: maxPoints ? Number(maxPoints) : undefined,
      });
      push("Draft updated.", "success");
      navigate(`/predict/${id}`);
    } catch (err) {
      push(err instanceof ApiRequestError ? err.message : "Couldn't save changes.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (notEditable) {
    return (
      <ErrorState message="This prediction has already started, so it can no longer be edited. Cancel and create a new one instead." />
    );
  }
  if (loadError) return <ErrorState message={loadError} />;
  if (!loaded) return <LoadingState label="Loading draft..." />;

  return (
    <div className="space-y-8 pb-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-text-primary">Edit draft</h1>
        <p className="mt-1 font-body text-sm text-text-secondary">
          Duration is locked in from when the draft was created — only question, outcomes, and
          participation limits can change before it goes live.
        </p>
      </div>

      <Field label="Question" error={errors.question} required>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={140}
          className="h-11 w-full rounded-lg border border-border bg-surface px-3 font-body text-sm text-text-primary focus:border-accent"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" hint="Optional, shown above the question">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
            className="h-11 w-full rounded-lg border border-border bg-surface px-3 font-body text-sm text-text-primary focus:border-accent"
          />
        </Field>
        <Field label="Description" hint="Optional, extra context for viewers">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={280}
            className="h-11 w-full rounded-lg border border-border bg-surface px-3 font-body text-sm text-text-primary focus:border-accent"
          />
        </Field>
      </div>

      <Field label="Outcomes" error={errors.outcomes} required>
        <div className="space-y-2">
          {outcomes.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className={clsx("h-6 w-2 shrink-0 rounded-full", outcomeBg[o.color])} aria-hidden />
              <input
                value={o.label}
                onChange={(e) => updateOutcome(i, e.target.value)}
                aria-label={`Outcome ${i + 1}`}
                maxLength={45}
                className="h-11 w-full rounded-lg border border-border bg-surface px-3 font-body text-sm text-text-primary focus:border-accent"
              />
              {outcomes.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeOutcome(i)}
                  aria-label={`Remove outcome ${i + 1}`}
                  className="shrink-0 rounded-md border border-border p-2 text-text-muted hover:text-danger hover:border-danger/40"
                >
                  <Minus className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          {outcomes.length < 4 && (
            <button
              type="button"
              onClick={addOutcome}
              className="flex items-center gap-1.5 font-ui text-sm font-semibold text-accent hover:underline"
            >
              <Plus className="h-4 w-4" /> Add outcome
            </button>
          )}
        </div>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Minimum participation" hint="Points required to join">
          <input
            type="number"
            min={1}
            value={minPoints}
            onChange={(e) => setMinPoints(e.target.value)}
            className="h-11 w-full rounded-lg border border-border bg-surface px-3 font-body text-sm text-text-primary focus:border-accent"
          />
        </Field>
        <Field label="Maximum participation" hint="Optional cap per entry" error={errors.maxPoints}>
          <input
            type="number"
            min={1}
            value={maxPoints}
            onChange={(e) => setMaxPoints(e.target.value)}
            placeholder="No limit"
            className="h-11 w-full rounded-lg border border-border bg-surface px-3 font-body text-sm text-text-primary focus:border-accent"
          />
        </Field>
      </div>

      <div className="flex gap-3 border-t border-border pt-6">
        <Button size="lg" onClick={submit} loading={submitting}>
          Save changes
        </Button>
        <Button size="lg" variant="ghost" onClick={() => navigate(-1)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
