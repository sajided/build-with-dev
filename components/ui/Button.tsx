import { ButtonHTMLAttributes, InputHTMLAttributes } from "react";

export function Button({
  className = "",
  variant = "default",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "neon";
}) {
  const base =
    "border-2 px-6 py-2 font-mono text-xs uppercase tracking-widest transition-colors disabled:opacity-40";
  const neon =
    variant === "neon"
      ? "border-[var(--neon)] text-[var(--neon)] bg-black hover:bg-[var(--neon)] hover:text-black"
      : "border-text text-text bg-bg hover:border-[var(--neon)] hover:text-[var(--neon)]";
  return (
    <button type="button" className={`${base} ${neon} ${className}`} {...props} />
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`brutalist-input ${props.className ?? ""}`} />;
}
