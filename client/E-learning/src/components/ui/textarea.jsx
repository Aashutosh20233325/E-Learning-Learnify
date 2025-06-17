import * as React from "react" // Ensure React is imported

import { cn } from "@/lib/utils" // Assuming cn utility is correctly configured

// THIS IS THE CRITICAL CHANGE: Wrap your component with React.forwardRef
const Textarea = React.forwardRef(
  ({ className, ...props }, ref) => { // 'ref' is the second argument
    return (
      <textarea
        data-slot="textarea"
        className={cn(
          "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref} // Pass the ref here to the underlying textarea DOM element
        {...props}
      />
    )
  }
)

Textarea.displayName = "Textarea" // Good practice for debugging

export { Textarea }