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
        "px-3 py-2 rounded-sm border hairline bg-surface",
        checked && "border-teal bg-tealSoft",
        className,
      )}
    >
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        className="accent-teal"
        {...rest}
      />
      <span className={cn("text-sm", checked ? "text-ink" : "text-muted")}>{label}</span>
    </label>
  );
});
