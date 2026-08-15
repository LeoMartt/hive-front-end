import { useEffect, useRef, useState, type ReactNode } from "react";

interface DropdownRenderArgs {
  open: boolean;
  toggle: () => void;
}

interface DropdownProps {
  className?: string;
  menuClassName?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** When true (default), any click inside the menu closes it. Set to false for menus with checkboxes/inputs that shouldn't auto-close. */
  closeOnMenuClick?: boolean;
  /** Keeps the menu mounted (toggling an "open" class) instead of mount/unmount — needed for CSS transitions on open/close. */
  keepMounted?: boolean;
  toggle: (args: DropdownRenderArgs) => ReactNode;
  children: ReactNode;
}

export default function Dropdown({
  className,
  menuClassName,
  open: controlledOpen,
  onOpenChange,
  closeOnMenuClick = true,
  keepMounted = false,
  toggle,
  children,
}: DropdownProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const rootRef = useRef<HTMLDivElement>(null);

  function setOpen(next: boolean) {
    if (!isControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  }

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div className={className ? `dropdown ${className}` : "dropdown"} ref={rootRef}>
      {toggle({ open, toggle: () => setOpen(!open) })}
      {(keepMounted || open) && (
        <div
          className={[
            "dropdown-menu",
            menuClassName,
            keepMounted && open ? "open" : undefined,
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() => {
            if (closeOnMenuClick) setOpen(false);
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
