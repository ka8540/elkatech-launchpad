import * as React from "react";

import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground caret-accent [-webkit-text-fill-color:hsl(var(--foreground))] ring-offset-background placeholder:text-muted-foreground placeholder:opacity-100 placeholder:[-webkit-text-fill-color:hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&[readonly]]:cursor-default [&[readonly]]:bg-muted/50 [&[readonly]]:text-muted-foreground [&[readonly]]:[-webkit-text-fill-color:hsl(var(--muted-foreground))] disabled:cursor-not-allowed disabled:text-muted-foreground disabled:opacity-50 disabled:[-webkit-text-fill-color:hsl(var(--muted-foreground))]",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
