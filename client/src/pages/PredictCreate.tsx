import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Minus, Plus } from "lucide-react";
import clsx from "clsx";
import { api, ApiRequestError } from "../lib/api";
import { Button } from "../components/ui/Button";
import { Field } from "../components/ui/Field";
import { useToastStore } from "../store/toastStore";
import { OUTCOME_COLOR_ORDER, outcomeBg } from "../lib/colors";
import type { OutcomeColor, Prediction } from "../types";

const DURATION_PRESETS = [
  { label: "30 sec", value: 30 },
  { label: "1 min", value: 60 },
  { label: "2 min", value: 120 },
  { label: "5 min", value: 300 },
  { label: "10 min", value: 600 },
];

interface OutcomeField {
  label: string;
  color: OutcomeColor;
}

export function PredictCreate() {
  const navigate = useNavigate();
  const push = useToastStore((s) => s.push);

  const [question, setQuestion] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [outcomes, setOutcomes] = useState<OutcomeField[]>([
    { label: "", color: "blue" },
    { label: "", color: "pink" },
  ]);
  const [duration, setDuration] = useState(60);
  const [customDuration, setCustomDuration] = useState("");
  const [useCustomDuration, setUseCustomDuration] = useState(false);
  const [minPoints, setMinPoints] = useState("1");
  const [maxPoints, setMaxPoints] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [autoStart, setAutoStart] = useState(true);

  const effectiveDuration = useCustomDuration ? Number(customDuration) : duration;

  function updateOutcome(index: number, label: string) {
    setOutcomes((prev) => prev.map((o, i) => (i === index ? { ...o, label } : o)));
  }

  function addOutcome() {
    if (outcomes.length >= 4) return;
    const nextColor = OUTCOME_COLOR_ORDER[outcomes.length];
    setOutcomes((prev) => [...prev, { label: "", color: nextColor }]);
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
    if (!effectiveDuration || effectiveDuration < 15 || effectiveDuration > 1800) {
      next.duration = "Duration must be between 15 seconds and 30 minutes";
    }
    if (maxPoints && Number(maxPoints) < Number(minPoints || 1)) {
      next.maxPoints = "Maximum must be at least the minimum";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit() {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const created = await api.post<Prediction>("/predictions", {
        question: question.trim(),
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        outcomes: outcomes.map((o) => ({ label: o.label.trim(), color: o.color })),
        durationSecs: effectiveDuration,
        minPoints: Number(minPoints || 1),
        maxPoints: maxPoints ? Number(maxPoints) : undefined,
      });
      if (autoStart) {
        await api.post<Prediction>(`/predictions/${created.id}/start`);
        push("Prediction is live.", "success");
        navigate("/predict");
      } else {
        push("Draft saved.", "success");
        navigate(`/predict/${created.id}`);
      }
    } catch (err) {
      push(err instanceof ApiRequestError ? err.message : "Couldn't create the prediction.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8 pb-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-text-primary">New prediction</h1>
        <p className="mt-1 font-body text-sm text-text-secondary">
          Ask your chat something, give them outcomes to pick from, and set the clock.
        </p>
      </div>

      <Field label="Question" error={errors.question} required>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="What will happen next?"
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
                placeholder={`Outcome ${i + 1}`}
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

      <Field label="Duration" error={errors.duration} required>
        <div className="flex flex-wrap gap-2">
          {DURATION_PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => {
                setDuration(p.value);
                setUseCustomDuration(false);
              }}
              className={clsx(
                "rounded-lg border px-3 py-2 font-ui text-sm font-semibold",
                !useCustomDuration && duration === p.value
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-border text-text-secondary hover:border-text-secondary",
              )}
            >
              {p.label}
            </button>
          ))}
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Custom (sec)"
              value={customDuration}
              onFocus={() => setUseCustomDuration(true)}
              onChange={(e) => {
                setUseCustomDuration(true);
                setCustomDuration(e.target.value);
              }}
              className={clsx(
                "h-10 w-32 rounded-lg border bg-surface px-3 font-body text-sm text-text-primary focus:border-accent",
                useCustomDuration ? "border-accent" : "border-border",
              )}
            />
          </div>
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

      <label className="flex items-center gap-2 font-ui text-sm text-text-secondary">
        <input
          type="checkbox"
          checked={autoStart}
          onChange={(e) => setAutoStart(e.target.checked)}
          className="h-4 w-4 rounded border-border accent-[var(--color-accent)]"
        />
        Start immediately after creating
      </label>

      <div className="flex gap-3 border-t border-border pt-6">
        <Button size="lg" onClick={submit} loading={submitting}>
          {autoStart ? "Create and start" : "Save draft"}
        </Button>
        <Button size="lg" variant="ghost" onClick={() => navigate(-1)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
