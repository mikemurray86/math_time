import { useId } from 'react';
import { Fraction } from '../../shared/fraction.ts';
import { toExpr } from '../../shared/expr.ts';
import { MathExpr } from './MathText.tsx';

/** Text box that understands 7, -2.5, 3/4 and 1 1/2, and shows how it read the answer. */
export function NumberInput({ value, onChange, label, locked, autoFocus, onEnter, wholeNumber }: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  locked?: boolean;
  autoFocus?: boolean;
  onEnter?: () => void;
  wholeNumber?: boolean; // answer is a whole number: simpler hint, no fraction/decimal keys
}) {
  const id = useId();
  const parsed = Fraction.parse(value);
  const showPreview = value.trim() !== '' && parsed && !/^-?\d+$/.test(value.trim());
  return (
    <div className="number-input">
      {label && <label htmlFor={id}>{label}</label>}
      <input
        id={id}
        value={value}
        disabled={locked}
        autoFocus={autoFocus}
        autoComplete="off"
        inputMode={wholeNumber ? 'numeric' : 'text'}
        enterKeyHint="done"
        placeholder={wholeNumber ? 'e.g. 12' : 'e.g. 7, −2.5, 3/4, 1 1/2'}
        aria-invalid={value.trim() !== '' && !parsed}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onEnter?.()}
      />
      <div className="number-preview" aria-live="polite">
        {value.trim() === '' ? null : parsed ? (
          showPreview && <>reads as <MathExpr e={toExpr(parsed, value.includes('.') ? 'decimal' : 'mixed')} /></>
        ) : (
          <span className="warn">Hmm, try a number like 2.5 or 5/2</span>
        )}
      </div>
      {!locked && !wholeNumber && (
        <div className="keypad-helpers">
          {['−', '/', '.', '␣'].map((k) => (
            <button
              key={k}
              type="button"
              className="chip"
              onClick={() => onChange(k === '−' ? (value.startsWith('-') ? value.slice(1) : `-${value}`) : value + (k === '␣' ? ' ' : k))}
              aria-label={{ '−': 'Toggle negative', '/': 'Fraction bar', '.': 'Decimal point', '␣': 'Space' }[k]}
            >
              {k}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
