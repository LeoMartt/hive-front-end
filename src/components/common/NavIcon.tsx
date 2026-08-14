import type { ReactNode } from "react";

interface NavIconProps {
  className?: string;
  children: ReactNode;
}

export default function NavIcon({ className, children }: NavIconProps) {
  return (
    <svg
      className={className ? `nav-icon ${className}` : "nav-icon"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}
