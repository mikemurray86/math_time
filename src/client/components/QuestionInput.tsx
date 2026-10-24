import type { Answer, InputSpec } from '../../shared/types.ts';
import { Fraction } from '../../shared/fraction.ts';
import { CoordinateGrid } from './CoordinateGrid.tsx';
import { OrderingInput } from './OrderingInput.tsx';
import { NumberInput } from './NumberInput.tsx';
import { MathExpr } from './MathText.tsx';
import { sounds } from '../sounds.ts';

export type Draft = { ids?: string[]; id?: string; value?: string; x?: string; y?: string };

export const initialDraft = (input: InputSpec): Draft =>
  input.kind === 'order' ? { ids: input.items.map((i) => i.id) } : input.kind === 'pair' || input.kind === 'plot' ? { x: '', y: '' } : input.kind === 'number' ? { value: '' } : {};

export function draftReady(input: InputSpec, d: Draft): boolean {
  switch (input.kind) {
    case 'order':
      return true;
    case 'choice':
      return !!d.id;
    case 'number':
      return !!Fraction.parse(d.value ?? '');
    case 'pair':
    case 'plot':
      return !!Fraction.parse(d.x ?? '') && !!Fraction.parse(d.y ?? '');
  }
}

export const draftToResponse = (input: InputSpec, d: Draft) =>
  input.kind === 'order' ? { ids: d.ids } : input.kind === 'choice' ? { id: d.id } : input.kind === 'number' ? { value: d.value } : { x: d.x, y: d.y };

export function QuestionInput({ input, draft, onChange, locked, reveal, onEnter }: {
  input: InputSpec;
  draft: Draft;
  onChange: (d: Draft) => void;
  locked: boolean;
  reveal?: Answer; // shown after the final wrong answer
  onEnter?: () => void;
}) {
  switch (input.kind) {
    case 'order':
      return (
        <OrderingInput
          items={input.items}
          order={draft.ids!}
          direction={input.direction}
          onChange={(ids) => onChange({ ids })}
          locked={locked}
          correctIds={reveal?.kind === 'order' ? reveal.ids : undefined}
        />
      );
    case 'choice':
      return (
        <div className="choice">
          <span className="choice-side"><MathExpr e={input.left} /></span>
          <span className="choice-slot">{input.options.find((o) => o.id === draft.id)?.label ?? '?'}</span>
          <span className="choice-side"><MathExpr e={input.right} /></span>
          <div className="choice-buttons">
            {input.options.map((o) => (
              <button
                key={o.id}
                type="button"
                className={`choice-btn ${draft.id === o.id ? 'selected' : ''} ${reveal?.kind === 'choice' && reveal.id === o.id ? 'reveal' : ''}`}
                disabled={locked}
                onClick={() => {
                  sounds.tap();
                  onChange({ id: o.id });
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      );
    case 'number':
      return (
        <div className="stack">
          {input.grid && <CoordinateGrid grid={input.grid} />}
          <NumberInput value={draft.value ?? ''} onChange={(value) => onChange({ value })} locked={locked} autoFocus={!input.grid} onEnter={onEnter} label="Your answer" />
        </div>
      );
    case 'pair':
      return (
        <div className="stack">
          <CoordinateGrid grid={input.grid} />
          <div className="pair">
            <span className="paren">(</span>
            <NumberInput value={draft.x ?? ''} onChange={(x) => onChange({ ...draft, x })} locked={locked} label="x" onEnter={onEnter} />
            <span className="paren">,</span>
            <NumberInput value={draft.y ?? ''} onChange={(y) => onChange({ ...draft, y })} locked={locked} label="y" onEnter={onEnter} />
            <span className="paren">)</span>
          </div>
        </div>
      );
    case 'plot':
      return (
        <CoordinateGrid
          grid={input.grid}
          value={draft.x ? { x: draft.x, y: draft.y! } : null}
          onChange={locked ? undefined : (p) => onChange(p)}
          extra={reveal?.kind === 'pair' ? [{ label: '✓', x: reveal.x, y: reveal.y, tone: 'correct' }] : []}
        />
      );
  }
}
