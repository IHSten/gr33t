import type { ButtonHTMLAttributes } from "react";
import { Link, type LinkProps } from "react-router-dom";
import "./Button.css";

type Variant = "default" | "danger";
type Size = "md" | "lg";

function buttonClass(variant: Variant, size: Size, extra?: string): string {
  return [
    "btn",
    variant === "danger" && "btn-danger",
    size === "lg" && "btn-lg",
    extra,
  ]
    .filter(Boolean)
    .join(" ");
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export function Button({
  variant = "default",
  size = "md",
  type = "button",
  className,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClass(variant, size, className)}
      {...rest}
    />
  );
}

type ButtonLinkProps = LinkProps & {
  variant?: Variant;
  size?: Size;
};

export function ButtonLink({
  variant = "default",
  size = "md",
  className,
  ...rest
}: ButtonLinkProps) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />;
}
