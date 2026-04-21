import { InputHTMLAttributes, forwardRef } from "react";

import { cn } from "@/lib/utils";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
};

export const Switch = forwardRef<HTMLInputElement, Props>(function Switch(
  { label, checked, className, ...rest },
  ref,
) {
  return (
    <label
      className={cn(
        "flex items-center gap-2 cursor-pointer select-none",
        "px-3 py-2 rounded-md border border-border dark:border-border-dark",
        checked && "border-accent bg-accent/5",
        className,
      )}
    >
      <input ref={ref} type="checkbox" checked={checked} className="accent-accent" {...rest} />
      <span className="text-sm">{label}</span>
    </label>
  );
});
