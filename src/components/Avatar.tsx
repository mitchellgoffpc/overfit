import { useEffect, useState, type CSSProperties, type ReactElement } from "react";

import { getInitials } from "helpers";
import { useAccountsStore } from "stores/accounts";
import { API_BASE } from "types";

interface AvatarProps {
  readonly handle: string;
  readonly name: string;
  readonly className?: string;
  readonly style?: CSSProperties;
}

export default function Avatar({ handle, name, className = "", style }: AvatarProps): ReactElement {
  const initials = getInitials(name);
  const avatarVersion = useAccountsStore((state) => state.avatarVersion);
  const src = `${API_BASE}/accounts/${encodeURIComponent(handle)}/avatar?v=${avatarVersion.toString()}`;
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoaded(false);
    const image = new Image();
    image.src = src;
    image.onload = () => { if (!cancelled) setIsLoaded(true); };
    image.onerror = () => { if (!cancelled) setIsLoaded(false); };
    return () => {
      cancelled = true;
      image.onload = null;
      image.onerror = null;
    };
  }, [src]);

  return (
    <div
      className={`relative grid place-items-center overflow-hidden rounded-full bg-brand-accentMuted font-semibold text-brand-accentStrong ${className}`}
      style={style}
      role="img"
      aria-label={`${name} avatar`}
    >
      {initials}
      {isLoaded ? <img className="absolute inset-0 h-full w-full object-cover" src={src} alt="" aria-hidden="true" /> : null}
    </div>
  );
}
