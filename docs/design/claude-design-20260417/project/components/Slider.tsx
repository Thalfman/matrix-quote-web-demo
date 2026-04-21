import { InputHTMLAttributes, forwardRef } from "react";

import { cn } from "@/lib/utils";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  unit?: string;
};

export const Slider = forwardRef<HTMLInputElement, Props>(function Slider(
  { className, value, unit, min = 1, max = 5, step = 1, ...rest },
  ref,
) {
  return (
    <div className="flex items-center gap-3">
      <input
        ref={ref}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        className={cn("flex-1 accent-accent", className)}
        {...rest}
      />
      <span className="numeric text-sm tabular-nums min-w-[3ch] text-right">
        {value}
        {unit ?? ""}
      </span>
    </div>
  );
});
