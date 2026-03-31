import type { CSSProperties, ReactElement } from "react";

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

  return (
    <div
      className={`relative grid place-items-center overflow-hidden rounded-full bg-brand-accentMuted font-semibold text-brand-accentStrong ${className}`}
      style={style}
    >
      {initials}
      <img
        key={avatarVersion}
        className="absolute inset-0 h-full w-full object-cover"
        src={src}
        alt={`${name} avatar`}
        onError={(event) => { event.currentTarget.style.display = "none"; }}
      />
    </div>
  );
}
