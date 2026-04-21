import { InputHTMLAttributes, forwardRef } from "react";

import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full rounded-md border border-border dark:border-border-dark bg-transparent",
          "px-3 py-2 text-sm",
          "focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent",
          "disabled:opacity-50",
          className,
        )}
        {...rest}
      />
    );
  },
);
