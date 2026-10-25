import type { Expr, Rich } from '../../shared/expr.ts';
import { groupDigits, isNegativeLiteral } from '../../shared/expr.ts';

const MINUS = '−';

function Frac({ n, d }: { n: number; d: number }) {
  return (
    <span className="frac">
      <span className="frac-n">{n}</span>
      <span className="frac-d">{d}</span>
    </span>
  );
}

export function MathExpr({ e }: { e: Expr }) {
  switch (e.t) {
    case 'int':
      return <span className="num">{e.v < 0 ? MINUS : ''}{groupDigits(e.v)}</span>;
    case 'dec':
      return <span className="num">{e.text.replace('-', MINUS)}</span>;
    case 'frac':
      return (
        <span className="num">
          {e.neg && MINUS}
          <Frac n={e.n} d={e.d} />
        </span>
      );
    case 'mixed':
      return (
        <span className="num">
          {e.neg && MINUS}
          {e.w}
          <Frac n={e.n} d={e.d} />
        </span>
      );
    case 'abs':
      return (
        <span className="abs">
          <MathExpr e={e.e} />
        </span>
      );
    case 'neg':
      return (
        <span className="num">
          {MINUS}
          <MathExpr e={e.e} />
        </span>
      );
    case 'op': {
      const paren = isNegativeLiteral(e.r);
      return (
        <span className="num">
          <MathExpr e={e.l} />
          <span className="op">{e.op === '-' ? MINUS : e.op}</span>
          {paren && '('}
          <MathExpr e={e.r} />
          {paren && ')'}
        </span>
      );
    }
  }
}

export function MathText({ r, className }: { r: Rich; className?: string }) {
  return (
    <span className={className}>
      {r.map((p, i) => (typeof p === 'string' ? <span key={i} className="txt">{p}</span> : <MathExpr key={i} e={p} />))}
    </span>
  );
}
