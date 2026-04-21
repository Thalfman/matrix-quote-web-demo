import { InputHTMLAttributes, forwardRef } from "react";

import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full rounded-sm border hairline bg-surface",
          "px-3 py-2 text-sm",
          "focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal",
          "disabled:opacity-50",
          className,
        )}
        {...rest}
      />
    );
  },
);
