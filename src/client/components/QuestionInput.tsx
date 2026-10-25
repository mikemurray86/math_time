import type { Answer, InputSpec, RectSpec } from '../../shared/types.ts';
import { Fraction } from '../../shared/fraction.ts';
import { CoordinateGrid } from './CoordinateGrid.tsx';
import { OrderingInput } from './OrderingInput.tsx';
import { NumberInput } from './NumberInput.tsx';
import { MathExpr } from './MathText.tsx';
import { sounds } from '../sounds.ts';

export type Draft = { ids?: string[]; id?: string; value?: string; x?: string; y?: string; values?: string[] };

export const initialDraft = (input: InputSpec): Draft =>
  input.kind === 'order'
    ? { ids: input.items.map((i) => i.id) }
    : input.kind === 'pair' || input.kind === 'plot'
      ? { x: '', y: '' }
      : input.kind === 'number'
        ? { value: '' }
        : input.kind === 'multi'
          ? { values: input.fields.map(() => '') }
          : {};

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
    case 'multi':
      return (d.values ?? []).every((v) => !!Fraction.parse(v));
  }
}

export const draftToResponse = (input: InputSpec, d: Draft) =>
  input.kind === 'order'
    ? { ids: d.ids }
    : input.kind === 'choice'
      ? { id: d.id }
      : input.kind === 'number'
        ? { value: d.value }
        : input.kind === 'multi'
          ? { values: d.values }
          : { x: d.x, y: d.y };

/** A labeled rectangle for area and perimeter questions, drawn to scale. */
export function RectFigure({ rect }: { rect: RectSpec }) {
  const max = Math.max(rect.w, rect.h);
  const W = 70 + (rect.w / max) * 200;
  const H = 30 + (rect.h / max) * 140;
  return (
    <svg className="rect-figure" viewBox={`0 0 ${W + 90} ${H + 60}`} role="img" aria-label={`Rectangle, ${rect.wLabel} by ${rect.hLabel}`}>
      <rect x={20} y={20} width={W} height={H} rx={4} className="rect-shape" />
      <text x={20 + W / 2} y={H + 48} textAnchor="middle" className="rect-label">{rect.wLabel}</text>
      <text x={W + 30} y={20 + H / 2 + 6} className="rect-label">{rect.hLabel}</text>
    </svg>
  );
}

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
      if (!input.left || !input.right) {
        return (
          <div className="choice-list">
            {input.options.map((o) => (
              <button
                key={o.id}
                type="button"
                className={`choice-btn wide ${draft.id === o.id ? 'selected' : ''} ${reveal?.kind === 'choice' && reveal.id === o.id ? 'reveal' : ''}`}
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
        );
      }
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
          {input.rect && <RectFigure rect={input.rect} />}
          <NumberInput value={draft.value ?? ''} onChange={(value) => onChange({ value })} locked={locked} autoFocus={!input.grid && !input.rect} onEnter={onEnter} label="Your answer" />
        </div>
      );
    case 'multi':
      return (
        <div className="multi">
          {input.fields.map((label, i) => (
            <NumberInput
              key={label}
              label={label}
              value={draft.values?.[i] ?? ''}
              onChange={(v) => onChange({ values: (draft.values ?? input.fields.map(() => '')).map((old, j) => (j === i ? v : old)) })}
              locked={locked}
              autoFocus={i === 0}
              onEnter={onEnter}
              wholeNumber
            />
          ))}
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
