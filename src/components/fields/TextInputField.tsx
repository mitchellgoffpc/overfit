import type { CSSProperties, InputHTMLAttributes, ReactElement } from "react";

import { RULED_LINE, RULED_LINE_HEIGHT } from "helpers";

interface TextInputFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "style"> {
  readonly label: string;
  readonly hint?: string;
  readonly className?: string;
  readonly inputClassName?: string;
  readonly inputStyle?: CSSProperties;
}

const textInputHeight = RULED_LINE_HEIGHT * 1.25;
const textInputOffset = (textInputHeight - RULED_LINE_HEIGHT) / 2;
const defaultInputClassName = "w-full rounded-[0.625rem] border border-brand-borderMuted bg-white px-3 text-sm text-brand-text"
  + " outline-none transition focus:border-brand-accent";
const defaultInputStyle: CSSProperties = {
  backgroundColor: "white",
  height: `${String(textInputHeight)}rem`,
  marginTop: `-${String(textInputOffset)}rem`,
  marginBottom: `-${String(textInputOffset)}rem`,
};

export default function TextInputField({
  label,
  hint,
  className = "flex flex-col text-sm text-brand-text",
  inputClassName = "",
  inputStyle,
  ...inputProps
}: TextInputFieldProps): ReactElement {
  return (
    <label className={className}>
      <span className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-brand-textMuted" style={{ lineHeight: RULED_LINE }}>{label}</span>
      <input className={`${defaultInputClassName} ${inputClassName}`.trim()} style={{ ...defaultInputStyle, ...inputStyle }} {...inputProps} />
      <span className="text-[0.6875rem] text-brand-textMuted" style={{ lineHeight: RULED_LINE, minHeight: RULED_LINE }}>{hint ?? ""}</span>
    </label>
  );
}
