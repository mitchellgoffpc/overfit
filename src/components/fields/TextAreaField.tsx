import type { CSSProperties, ReactElement, TextareaHTMLAttributes } from "react";

import { RULED_LINE, RULED_LINE_HEIGHT } from "helpers";

interface TextAreaFieldProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className" | "style"> {
  readonly label: string;
  readonly hint?: string;
  readonly className?: string;
  readonly textareaClassName?: string;
  readonly textareaStyle?: CSSProperties;
  readonly reserveHintSpace?: boolean;
}

const defaultTextAreaClassName = "w-full rounded-[0.625rem] border border-brand-borderMuted bg-white px-3 py-2.5 text-sm"
  + " text-brand-text outline-none transition focus:border-brand-accent";
const defaultTextAreaStyle: CSSProperties = {
  marginTop: `-${String(RULED_LINE_HEIGHT / 8)}rem`,
  marginBottom: `-${String(RULED_LINE_HEIGHT / 8)}rem`,
  minHeight: `${String(RULED_LINE_HEIGHT * 2.25)}rem`,
  backgroundColor: "white",
};

export default function TextAreaField({
  label,
  hint,
  className = "flex flex-col text-sm text-brand-text",
  textareaClassName = "",
  textareaStyle,
  reserveHintSpace = false,
  ...textareaProps
}: TextAreaFieldProps): ReactElement {
  return (
    <label className={className}>
      <span className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-brand-textMuted" style={{ lineHeight: RULED_LINE }}>{label}</span>
      <textarea
        className={`${defaultTextAreaClassName} ${textareaClassName}`.trim()}
        style={{ ...defaultTextAreaStyle, ...textareaStyle }}
        {...textareaProps}
      />
      {hint || reserveHintSpace ? (
        <span className="text-[0.6875rem] text-brand-textMuted" style={{ lineHeight: RULED_LINE, minHeight: RULED_LINE }}>{hint ?? ""}</span>
      ) : null}
    </label>
  );
}
