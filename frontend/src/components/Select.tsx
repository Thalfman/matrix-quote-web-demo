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
        "w-full rounded-sm border hairline bg-surface",
        "px-3 py-2 text-sm",
        "focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal",
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
