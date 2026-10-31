import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api.ts';
import { AVATAR_ITEMS, BADGES, DEFAULT_AVATAR, SEASONS, helperName, type Avatar, type Slot } from '../../../shared/rewards.ts';
import { AvatarView } from '../../components/AvatarView.tsx';
import { Helper } from '../../components/Mascot.tsx';
import { fmtDuration, fmtWhen, level, pct } from './format.ts';
import { useParent } from './ParentLayout.tsx';

interface Dash {
  quizzes: { id: number; finished_at: string; local_date: string; score: number; total: number; stars_earned: number; time_ms: number | null }[];
  entryStats: { id: number; label: string; skill: string; enabled: number; attempts: number; first_right: number | null; final_right: number | null; avg_ms: number | null }[];
  kid: { id: number; name: string; stars: number; streak: number; bestStreak: number; avatar: Avatar };
  badges: { code: string; earned_at: string }[];
  purchases: { item_id: string; bought_at: string }[];
  challenge: import('../../api.ts').ChallengeInfo;
}

const SLOT_NAMES: Record<Slot, string> = {
  color: 'Avatar color',
  hat: 'Avatar hat',
  face: 'Avatar face',
  extra: 'Avatar extra',
  helper: 'Math helper',
  helperFur: 'Helper fur',
  helperHat: 'Helper hat',
  helperExtra: 'Helper extra',
  mode: 'Celebration mode',
};

function Purchases({ kid, purchases }: Pick<Dash, 'kid' | 'purchases'>) {
  const avatar = { ...DEFAULT_AVATAR, ...kid.avatar };
  const rows = purchases.flatMap((p) => {
    const item = AVATAR_ITEMS.find((i) => i.id === p.item_id);
    return item ? [{ ...p, item, season: SEASONS.find((s) => s.id === item.season) }] : [];
  });
  const spent = rows.reduce((s, r) => s + r.item.stars, 0);
  return (
    <section className="card">
      <h2>{kid.name}’s Star Store</h2>
      <div className="store-looks">
        <figure><AvatarView avatar={avatar} size={90} /><figcaption>{kid.name}</figcaption></figure>
        <figure><Helper look={avatar} size={90} /><figcaption>{helperName(avatar)}</figcaption></figure>
      </div>
      {rows.length === 0 ? (
        <p className="muted">Nothing bought yet. {kid.name} has ⭐ {kid.stars} to spend.</p>
      ) : (
        <>
          <p className="muted">{rows.length} item{rows.length > 1 ? 's' : ''} bought for ⭐ {spent} in all, with ⭐ {kid.stars} left to spend.</p>
          <table className="table">
            <thead><tr><th>Item</th><th>Type</th><th>Price</th><th>Bought</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.item.id}>
                  <td>{r.item.label}{r.season && <span title={`${r.season.label} set`}> {r.season.emoji}</span>}</td>
                  <td>{SLOT_NAMES[r.item.slot]}</td>
                  <td>⭐ {r.item.stars}</td>
                  <td>{fmtWhen(r.bought_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}

function ScoreChart({ quizzes }: { quizzes: Dash['quizzes'] }) {
  const data = [...quizzes].slice(0, 20).reverse();
  if (data.length < 2) return <p className="muted">The chart appears after a couple of quizzes.</p>;
  const W = 600, H = 160, P = 24;
  const x = (i: number) => P + (i * (W - 2 * P)) / (data.length - 1);
  const y = (v: number) => H - P - (v / 100) * (H - 2 * P);
  const pts = data.map((q, i) => [x(i), y((q.score / q.total) * 100)] as const);
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="First-try score for recent quizzes">
      {[0, 50, 100].map((v) => (
        <g key={v}>
          <line x1={P} x2={W - P} y1={y(v)} y2={y(v)} className="chart-grid" />
          <text x={P - 6} y={y(v) + 4} textAnchor="end" className="chart-label">{v}%</text>
        </g>
      ))}
      <polyline points={pts.map((p) => p.join(',')).join(' ')} className="chart-line" />
      {pts.map(([px, py], i) => (
        <circle key={i} cx={px} cy={py} r={4} className="chart-dot">
          <title>{`${data[i].local_date}: ${data[i].score}/${data[i].total}`}</title>
        </circle>
      ))}
    </svg>
  );
}

export function Dashboard() {
  const { kid } = useParent();
  const [d, setD] = useState<Dash | null>(null);
  useEffect(() => {
    if (kid) api<Dash>('GET', `/api/parent/dashboard?kid=${kid.id}`).then(setD);
  }, [kid?.id]);
  if (!d || d.kid.id !== kid?.id) return <div className="loading">Loading…</div>;

  const weekAgo = Date.now() - 7 * 86_400_000;
  const thisWeek = d.quizzes.filter((q) => Date.parse(`${q.finished_at.replace(' ', 'T')}Z`) > weekAgo);
  const avg = (qs: Dash['quizzes']) => pct(qs.reduce((s, q) => s + q.score, 0), qs.reduce((s, q) => s + q.total, 0));
  const weekAvg = avg(thisWeek);

  const skills = new Map<string, { attempts: number; right: number }>();
  for (const e of d.entryStats) {
    const s = skills.get(e.skill) ?? { attempts: 0, right: 0 };
    s.attempts += e.attempts;
    s.right += e.first_right ?? 0;
    skills.set(e.skill, s);
  }
  const needsWork = d.entryStats
    .filter((e) => e.attempts >= 3)
    .map((e) => ({ ...e, p: pct(e.first_right ?? 0, e.attempts)! }))
    .filter((e) => e.p < 70)
    .sort((a, b) => a.p - b.p);

  return (
    <div className="parent-body">
      <section className="tiles">
        <div className="tile"><span className="tile-num">{thisWeek.length}</span><span>quizzes this week</span></div>
        <div className="tile"><span className={`tile-num lvl-${level(weekAvg)}`}>{weekAvg ?? '—'}{weekAvg !== null && '%'}</span><span>first-try score this week</span></div>
        <div className="tile"><span className="tile-num">🔥 {d.kid.streak}</span><span>day streak (best {d.kid.bestStreak})</span></div>
        <div className="tile"><span className="tile-num">⭐ {d.kid.stars}</span><span>stars · {d.badges.length}/{BADGES.length} badges</span></div>
        <div className="tile">
          <span className={`tile-num lvl-${level(d.challenge.mastery.pct)}`}>{d.challenge.mastery.pct}%</span>
          <span>
            mastered ({d.challenge.mastery.mastered} of {d.challenge.mastery.total} question types)
            {d.challenge.nextGrade && (d.challenge.auto ? ` · ${d.challenge.nextGrade} challenges on` : ` · ${d.challenge.nextGrade} challenges start at 90%`)}
          </span>
        </div>
      </section>

      <section className="card">
        <h2>Score trend</h2>
        <ScoreChart quizzes={d.quizzes} />
      </section>

      {needsWork.length > 0 && (
        <section className="card attention">
          <h2>Needs more practice</h2>
          <ul>
            {needsWork.map((e) => <li key={e.id}><strong>{e.label}</strong>: {e.p}% right on the first try ({e.attempts} tries, last 30 days)</li>)}
          </ul>
        </section>
      )}

      <section className="card">
        <h2>Skills, last 30 days</h2>
        <div className="skill-summary">
          {[...skills].map(([skill, s]) => {
            const p = pct(s.right, s.attempts);
            return (
              <div key={skill} className="skill-row">
                <span className="skill-name">{skill}</span>
                <span className="bar"><span className={`bar-fill lvl-${level(p)}`} style={{ width: `${p ?? 0}%` }} /></span>
                <span className="skill-pct">{p === null ? 'no data' : `${p}%`}</span>
              </div>
            );
          })}
        </div>
        <table className="table">
          <thead><tr><th>Question type</th><th>Tries</th><th>1st try</th><th>After retry</th><th>Avg time</th></tr></thead>
          <tbody>
            {d.entryStats.map((e) => {
              const p1 = pct(e.first_right ?? 0, e.attempts);
              return (
                <tr key={e.id} className={e.enabled ? '' : 'disabled'}>
                  <td>{e.label}</td>
                  <td>{e.attempts}</td>
                  <td className={`lvl-${level(p1)}`}>{p1 === null ? '—' : `${p1}%`}</td>
                  <td>{e.attempts ? `${pct(e.final_right ?? 0, e.attempts)}%` : '—'}</td>
                  <td>{fmtDuration(e.avg_ms)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <Purchases kid={d.kid} purchases={d.purchases} />

      <section className="card">
        <h2>{d.kid.name}’s quiz history</h2>
        {d.quizzes.length === 0 ? (
          <p className="muted">No quizzes yet.</p>
        ) : (
          <table className="table">
            <thead><tr><th>When</th><th>Score</th><th>Stars</th><th>Time</th><th /></tr></thead>
            <tbody>
              {d.quizzes.map((q) => {
                const p = pct(q.score, q.total);
                return (
                  <tr key={q.id}>
                    <td>{fmtWhen(q.finished_at)}</td>
                    <td className={`lvl-${level(p)}`}>{q.score}/{q.total} ({p}%)</td>
                    <td>⭐ {q.stars_earned}</td>
                    <td>{fmtDuration(q.time_ms)}</td>
                    <td><Link to={`/parent/quiz/${q.id}`}>Review →</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
