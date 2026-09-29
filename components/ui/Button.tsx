import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "outline";
interface Props extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: Variant }

const styles: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg hover:opacity-90",
  ghost: "hover:bg-card",
  outline: "border border-border hover:bg-card",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", className, type = "button", ...rest }, ref,
) {
  return (
    <button ref={ref} type={type}
      className={cn("inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition disabled:opacity-50 disabled:pointer-events-none", styles[variant], className)}
      {...rest} />
  );
});
