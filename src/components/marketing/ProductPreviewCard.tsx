import React from 'react';
import { MapPin, Navigation, CheckCircle2, Clock } from 'lucide-react';

interface FarePreviewProps {
  from: string;
  to: string;
  fare: string;
  eta: string;
}

/**
 * A small, honestly-illustrative preview of what booking a ride looks like
 * in the app: round, plausible numbers, not a claim about real trip data.
 * Built from real UI primitives in the site's own token system, not a
 * screenshot or a fabricated dashboard.
 */
export function FarePreviewCard({ from, to, fare, eta }: FarePreviewProps) {
  return (
    <div className="w-full max-w-sm rounded-2xl border border-mkt-border bg-mkt-bg-raised p-5">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="flex size-2 shrink-0 items-center justify-center">
            <span className="size-2 rounded-full bg-mkt-accent" />
          </span>
          <span className="text-sm text-mkt-fg">{from}</span>
        </div>
        <div className="ml-[3px] h-4 w-px bg-mkt-border" />
        <div className="flex items-center gap-3">
          <MapPin className="size-2.5 shrink-0 text-mkt-fg-faint" />
          <span className="text-sm text-mkt-fg">{to}</span>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-mkt-border pt-4">
        <div>
          <p className="text-xs text-mkt-fg-faint">Estimated fare</p>
          <p className="text-lg font-semibold text-mkt-fg">{fare}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-mkt-fg-faint">Rider arriving</p>
          <p className="text-lg font-semibold text-mkt-accent">{eta}</p>
        </div>
      </div>
    </div>
  );
}

interface TrackingPreviewProps {
  status: string;
  courier: string;
  step: 1 | 2 | 3;
}

const TRACKING_STEPS = ['Preparing', 'On the way', 'Delivered'];

/**
 * A small, illustrative order-tracking preview (food, pharmacy, or package
 * delivery all share this pattern in the real app). Same honesty rule as
 * FarePreviewCard: a UI pattern demonstration, not a claimed live order.
 */
export function TrackingPreviewCard({ status, courier, step }: TrackingPreviewProps) {
  return (
    <div className="w-full max-w-sm rounded-2xl border border-mkt-border bg-mkt-bg-raised p-5">
      <div className="flex items-center gap-2.5">
        <Navigation className="size-4 text-mkt-accent" />
        <p className="text-sm font-medium text-mkt-fg">{status}</p>
      </div>

      <div className="mt-5 flex items-center">
        {TRACKING_STEPS.map((label, i) => {
          const done = i < step;
          const active = i === step - 1;
          return (
            <React.Fragment key={label}>
              <div className="flex flex-col items-center gap-1.5">
                <span
                  className={`flex size-6 items-center justify-center rounded-full border ${
                    done || active
                      ? 'border-mkt-accent bg-mkt-accent/10 text-mkt-accent'
                      : 'border-mkt-border text-mkt-fg-faint'
                  }`}
                >
                  {done && !active ? <CheckCircle2 className="size-3.5" /> : <Clock className="size-3.5" />}
                </span>
                <span className="text-[10px] text-mkt-fg-faint">{label}</span>
              </div>
              {i < TRACKING_STEPS.length - 1 && (
                <div
                  className={`mx-1.5 mb-4 h-px flex-1 ${i < step - 1 ? 'bg-mkt-accent' : 'bg-mkt-border'}`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      <p className="mt-4 border-t border-mkt-border pt-3 text-xs text-mkt-fg-muted">{courier}</p>
    </div>
  );
}
