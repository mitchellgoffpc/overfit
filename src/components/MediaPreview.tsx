import type { ReactElement } from "react";

interface MediaPreviewProps {
  readonly type: "image" | "video" | "audio";
  readonly src: string;
  readonly alt: string;
  readonly caption?: string | undefined;
}

export default function MediaPreview({ type, src, alt, caption }: MediaPreviewProps): ReactElement {
  return (
    <>
      {type === "image" ? (
        <img src={src} alt={alt} className="w-full rounded-lg" />
      ) : type === "video" ? (
        <video src={src} controls className="w-full rounded-lg" />
      ) : (
        <audio src={src} controls className="w-full" />
      )}
      {caption ? <p className="mt-1.5 text-center text-[0.75rem] text-brand-textMuted">{caption}</p> : null}
    </>
  );
}
