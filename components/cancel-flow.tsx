"use client";

import { useState, useTransition } from "react";

import { acceptSaveOffer, cancelWithReason } from "@/app/app/actions";
import { track } from "@/lib/track-client";
import { btn, card, cx } from "./ui";

const REASONS = [
  { value: "found_job", label: "I found a job 🎉" },
  { value: "too_expensive", label: "It costs too much" },
  { value: "not_enough_roles", label: "Not enough roles for me" },
  { value: "not_useful", label: "It isn't helping" },
  { value: "taking_break", label: "Taking a break from searching" },
  { value: "other", label: "Something else" },
];

/**
 * Reason, then one save offer, then cancel. Cancelling always stays two clicks
 * away: "Cancel plan" and "No thanks, cancel". The UK subscription rules expect
 * leaving to be as easy as joining.
 */
export function CancelFlow({
  periodEnd,
  plan,
}: {
  periodEnd: string | null;
  plan: string;
}) {
  const [step, setStep] = useState<"idle" | "reason" | "offer" | "done">(
    "idle",
  );
  const [reason, setReason] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const until = periodEnd
    ? new Date(periodEnd).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
      })
    : null;

  if (step === "idle") {
    return (
      <button
        type="button"
        className={cx(btn.ghost, "text-coral")}
        onClick={() => {
          setStep("reason");
          track("cancel_start", { plan });
        }}
      >
        Cancel plan
      </button>
    );
  }
  if (step === "done")
    return (
      <p className="text-[14px] text-muted">
        Done. {until ? `You keep access until ${until}.` : ""}
      </p>
    );

  const cancelNow = () =>
    start(async () => {
      await cancelWithReason(reason ?? "other");
      setStep("done");
    });

  return (
    <div className={cx(card, "mt-2 p-5")}>
      {step === "reason" && (
        <>
          <p className="font-semibold">
            Sorry to see you go. What's the main reason?
          </p>
          <div className="mt-3 grid gap-2">
            {REASONS.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setReason(r.value)}
                className={cx(
                  "rounded-xl border px-4 py-3 text-left text-[14px]",
                  reason === r.value
                    ? "border-mint bg-mint/10"
                    : "border-line hover:border-faint",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className={btn.white}
              disabled={!reason}
              onClick={() =>
                reason === "found_job" ? cancelNow() : setStep("offer")
              }
            >
              Continue
            </button>
            <button
              type="button"
              className={btn.ghost}
              disabled={pending}
              onClick={cancelNow}
            >
              Just cancel
            </button>
          </div>
        </>
      )}
      {step === "offer" && (
        <>
          <p className="font-semibold">
            Before you go, would one of these help?
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              disabled={pending}
              className={cx(card, "p-4 text-left hover:border-mint")}
              onClick={() =>
                start(async () => {
                  await acceptSaveOffer("pause");
                  setStep("done");
                })
              }
            >
              <span className="font-semibold">Pause for a month</span>
              <span className="mt-1 block text-[13px] text-muted">
                No charges for 30 days. Your tracker and saved roles stay.
              </span>
            </button>
            <button
              type="button"
              disabled={pending}
              className={cx(card, "p-4 text-left hover:border-mint")}
              onClick={() =>
                start(async () => {
                  await acceptSaveOffer("discount");
                  setStep("done");
                })
              }
            >
              <span className="font-semibold">50% off your next payment</span>
              <span className="mt-1 block text-[13px] text-muted">
                Keep going for half the price, once.
              </span>
            </button>
          </div>
          <button
            type="button"
            className={cx(btn.link, "mt-4 text-[14px] text-coral")}
            disabled={pending}
            onClick={cancelNow}
          >
            No thanks, cancel my plan
          </button>
        </>
      )}
    </div>
  );
}
