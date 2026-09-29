import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "outline";
interface Props extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: Variant }

const styles: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg hover:opacity-90 shadow-sm shadow-accent/20 hover:shadow-accent/40 active:scale-95",
  ghost: "hover:bg-card active:scale-95",
  outline: "border border-border/50 bg-card/20 hover:bg-card hover:border-border active:scale-95 shadow-sm",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", className, type = "button", ...rest }, ref,
) {
  return (
    <button ref={ref} type={type}
      className={cn("inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none", styles[variant], className)}
      {...rest} />
  );
});
