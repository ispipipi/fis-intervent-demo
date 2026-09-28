import { CurrencyCode } from "../types/domain";
import { currency } from "../lib/business";
import { Field } from "./appShared";

export function MethodInputs({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="panel">
      <h3 className="mb-4 font-semibold">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export function NumberField({ label, value, disabled, onChange }: { label: string; value?: number; disabled?: boolean; onChange: (value: string) => void }) {
  return (
    <Field label={label}>
      <input className="input" disabled={disabled} type="number" value={value ?? ""} onChange={(event) => onChange(event.target.value)} />
    </Field>
  );
}

export function FinalClaim({ value, signedValue, moneda }: { value?: number; signedValue?: number; moneda: CurrencyCode }) {
  return (
    <div className="final-claim">
      <span>Monto final a reclamar</span>
      <strong>{currency(value, moneda)}</strong>
      {signedValue !== undefined && signedValue < 0 && <small>Resultado matemático: {currency(signedValue, moneda)} · Sin pérdida compensable</small>}
    </div>
  );
}
