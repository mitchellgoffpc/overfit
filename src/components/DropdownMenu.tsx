import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { useEffect, useRef } from "react";
import { Link } from "wouter";

export interface DropdownMenuItem {
  readonly label: string;
  readonly href?: string;
  readonly icon?: IconDefinition;
  readonly destructive?: boolean;
  readonly onSelect?: () => void | Promise<void>;
}

export interface DropdownMenuSection {
  readonly items: DropdownMenuItem[];
}

interface DropdownMenuProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly trigger: ReactNode;
  readonly sections: DropdownMenuSection[];
  readonly className?: string;
  readonly menuClassName?: string;
  readonly itemClassName?: string;
  readonly style?: CSSProperties | undefined;
}

const defaultMenuClass = "absolute right-0 top-full z-20 mt-2 w-48 rounded-xl border border-brand-border bg-white py-2"
  + " shadow-[0_1rem_2rem_rgba(15,23,42,0.14)]";
const defaultItemClass = "flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-brand-text transition hover:bg-hover";

export default function DropdownMenu({
  open,
  onOpenChange,
  trigger,
  sections,
  className = "relative",
  menuClassName = defaultMenuClass,
  itemClassName = defaultItemClass,
  style
}: DropdownMenuProps): ReactElement {
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) { return; }

    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && event.target instanceof Node && !menuRef.current.contains(event.target)) { onOpenChange(false); }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { onOpenChange(false); }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onOpenChange, open]);

  const selectItem = (item: DropdownMenuItem) => {
    onOpenChange(false);
    if (item.onSelect) { void item.onSelect(); }
  };

  const renderItemContent = (item: DropdownMenuItem) => (
    <>
      {item.icon ? <FontAwesomeIcon icon={item.icon} className={item.destructive ? "w-3" : "w-3 text-brand-textMuted"} /> : null}
      <span>{item.label}</span>
    </>
  );

  const renderItem = (item: DropdownMenuItem) => {
    const itemClasses = `${itemClassName} ${item.destructive ? "text-signal-failed hover:bg-red-50" : ""}`;
    if (item.href) {
      return (
        <Link className={itemClasses} role="menuitem" href={item.href} onClick={() => { selectItem(item); }} key={item.label}>
          {renderItemContent(item)}
        </Link>
      );
    }
    return (
      <button className={itemClasses} role="menuitem" onClick={() => { selectItem(item); }} type="button" key={item.label}>
        {renderItemContent(item)}
      </button>
    );
  };

  return (
    <div className={className} ref={menuRef} style={style}>
      {trigger}
      {open ? (
        <div className={menuClassName} role="menu">
          {sections.map((section, index) => (
            <div key={section.items.map((item) => item.label).join(":")}>
              {index > 0 ? <div className="my-2 border-t border-brand-border" /> : null}
              {section.items.map(renderItem)}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
