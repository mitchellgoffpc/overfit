import { useEffect, useState } from "react";
import type { CSSProperties, ReactElement } from "react";

import { getInitials } from "helpers";
import { useAccountsStore } from "stores/accounts";
import { API_BASE } from "types";

interface AvatarProps {
  readonly handle: string;
  readonly name: string;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly onHasImageChange?: (hasImage: boolean) => void;
}

export default function Avatar({ handle, name, className = "", style, onHasImageChange }: AvatarProps): ReactElement {
  const initials = getInitials(name);
  const avatarVersion = useAccountsStore((state) => state.avatarVersion);
  const src = `${API_BASE}/accounts/${encodeURIComponent(handle)}/avatar?v=${avatarVersion.toString()}`;
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const image = new Image();
    image.src = src;
    image.onload = () => {
      if (!cancelled) {
        setLoadedSrc(src);
        onHasImageChange?.(true);
      }
    };
    image.onerror = () => {
      if (!cancelled) {
        setLoadedSrc(null);
        onHasImageChange?.(false);
      }
    };
    return () => {
      cancelled = true;
      image.onload = null;
      image.onerror = null;
    };
  }, [onHasImageChange, src]);

  return (
    <div
      className={`relative grid place-items-center overflow-hidden rounded-full bg-brand-accentMuted font-semibold text-brand-accentStrong ${className}`}
      style={style}
      role="img"
      aria-label={`${name} avatar`}
    >
      {initials}
      {loadedSrc === src ? <img className="absolute inset-0 h-full w-full object-cover" src={src} alt="" aria-hidden="true" /> : null}
    </div>
  );
}
