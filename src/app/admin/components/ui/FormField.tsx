import { ReactNode } from "react";

export type FieldA11y = {
  id: string;
  "aria-invalid": boolean;
  "aria-describedby"?: string;
};

type FormFieldProps = {
  id: string;
  label: string;
  error?: string | null;
  hint?: string;
  footer?: ReactNode; // extra content under the input (e.g. a strength meter)
  children: (a11y: FieldA11y) => ReactNode;
};

// Label + input + error/hint, with the aria wiring done for you:
//   <FormField id="email" label="Email address" error={errors.email}>
//     {(a11y) => <Input {...a11y} value={...} onChange={...} />}
//   </FormField>
export function FormField({ id, label, error, hint, footer, children }: FormFieldProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-500"
      >
        {label}
      </label>
      {children({ id, "aria-invalid": Boolean(error), "aria-describedby": describedBy })}
      {footer}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs text-rose-400">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-slate-500">
          {hint}
        </p>
      )}
    </div>
  );
}
