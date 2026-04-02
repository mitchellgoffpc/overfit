import type { CSSProperties, InputHTMLAttributes, KeyboardEvent, ReactElement } from "react";

import { RULED_LINE, RULED_LINE_HEIGHT } from "helpers";
import { accentButtonClass } from "pages/settings/styles";

interface TextInputFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "style"> {
  readonly label: string;
  readonly hint?: string;
  readonly className?: string;
  readonly inputClassName?: string;
  readonly inputStyle?: CSSProperties;
  readonly submitLabel?: string;
  readonly submittingLabel?: string;
  readonly onSubmit?: () => void;
  readonly isSubmitting?: boolean;
  readonly submitDisabled?: boolean;
  readonly submitButtonClassName?: string;
  readonly submitButtonStyle?: CSSProperties;
}

const textInputHeight = RULED_LINE_HEIGHT * 1.25;
const textInputOffset = (textInputHeight - RULED_LINE_HEIGHT) / 2;
const defaultInputClassName = "w-full rounded-[0.625rem] border border-brand-borderMuted bg-white px-3 text-sm text-brand-text"
  + " outline-none transition focus:border-brand-accent";
const defaultInputStyle: CSSProperties = {
  backgroundColor: "white",
  height: `${String(textInputHeight)}rem`,
};
const defaultInputRowStyle: CSSProperties = { marginTop: `-${String(textInputOffset)}rem`, marginBottom: `-${String(textInputOffset)}rem` };
const defaultSubmitButtonStyle: CSSProperties = { height: `${String(textInputHeight)}rem` };

export default function TextInputField({
  label,
  hint,
  className = "flex flex-col text-sm text-brand-text",
  inputClassName = "",
  inputStyle,
  submitLabel,
  submittingLabel,
  onSubmit,
  isSubmitting = false,
  submitDisabled = false,
  submitButtonClassName = accentButtonClass,
  submitButtonStyle,
  onKeyDown,
  ...inputProps
}: TextInputFieldProps): ReactElement {
  const hasSubmitAction = Boolean(onSubmit && submitLabel);
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || event.key !== "Enter" || !hasSubmitAction || isSubmitting || submitDisabled) { return; }
    event.preventDefault();
    onSubmit?.();
  };

  return (
    <label className={className}>
      <span className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-brand-textMuted" style={{ lineHeight: RULED_LINE }}>{label}</span>
      <div className={hasSubmitAction ? "flex items-center gap-2" : ""} style={defaultInputRowStyle}>
        <input
          className={`${defaultInputClassName}${hasSubmitAction ? " flex-1" : ""} ${inputClassName}`.trim()}
          style={{ ...defaultInputStyle, ...inputStyle }}
          onKeyDown={handleKeyDown}
          {...inputProps}
        />
        {hasSubmitAction ? (
          <button
            type="button"
            className={submitButtonClassName}
            style={{ ...defaultSubmitButtonStyle, ...submitButtonStyle }}
            onClick={onSubmit}
            disabled={isSubmitting || submitDisabled}
          >
            {isSubmitting ? submittingLabel ?? submitLabel : submitLabel}
          </button>
        ) : null}
      </div>
      <span className="text-[0.6875rem] text-brand-textMuted" style={{ lineHeight: RULED_LINE, minHeight: RULED_LINE }}>{hint ?? ""}</span>
    </label>
  );
}
