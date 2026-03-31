import type { ReactElement } from "react";

interface MediaPreviewProps {
  readonly type: "image" | "video" | "audio";
  readonly src: string;
  readonly alt: string;
  readonly caption?: string | undefined;
  readonly mediaClassName?: string;
}

export default function MediaPreview({ type, src, alt, caption, mediaClassName }: MediaPreviewProps): ReactElement {
  return (
    <>
      {type === "image" ? (
        <img src={src} alt={alt} className={`w-full rounded-lg ${mediaClassName ?? ""}`} />
      ) : type === "video" ? (
        <video src={src} controls className={`w-full rounded-lg ${mediaClassName ?? ""}`} />
      ) : (
        <audio src={src} controls className={`w-full ${mediaClassName ?? ""}`} />
      )}
      {caption ? <p className="mt-1.5 text-center text-[0.75rem] text-brand-textMuted">{caption}</p> : null}
    </>
  );
}
