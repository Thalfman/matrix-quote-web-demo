import { SelectHTMLAttributes, forwardRef } from "react";

import { cn } from "@/lib/utils";

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  options: string[];
  placeholder?: string;
};

export const Select = forwardRef<HTMLSelectElement, Props>(function Select(
  { options, placeholder, className, ...rest },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cn(
        "w-full rounded-md border border-border dark:border-border-dark bg-surface dark:bg-surface-dark",
        "px-3 py-2 text-sm",
        "focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent",
        className,
      )}
      {...rest}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
});
