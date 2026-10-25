# Math Time 🦊

A mobile-friendly math practice site for a 6th grader. A parent picks problem templates for a **question bank**. Each quiz gets fresh numbers at the same difficulty. Pip the fox, confetti, stars, streaks, badges and avatar unlocks keep it fun, and a PIN-protected parent area has the results.

## How it works

- **Generators** (`src/shared/generators/`) are problem templates. `generate(params, seed)` returns the prompt, the answer, a hint and a step-by-step explanation. It uses exact fractions, so `1.5`, `3/2` and `1 1/2` all count as right.
- **Bank entries** (managed at `/parent/bank`) are a generator plus a preset or fine-tuned parameters. The parameters fix the difficulty, for example "crosses an axis, halves, ±5". Only the numbers change.
- **Quizzes** are weighted by the entry's "how often" setting, and entries the child has been missing come up more often.
- **Review**: every question is stored with its seed, so the parent review rebuilds exactly what the child saw, along with their first and second tries.
- **Multiple children**: each child has their own question bank, stars, streak, badges, avatar and history. Children pick themselves on the "Who's practicing?" screen, using an optional picture code that a parent sets on the Kids page. The parent dashboard and bank have a child switcher.

Problem types, grouped into grade-level sets (`GRADE_SETS` in `src/server/seed.ts`). A new child's bank starts from their grade's set, and a parent can add another grade's set from the Bank page.

- **4th grade:** multi-digit multiplication, long division with remainders, place value and rounding, equivalent fractions, adding and subtracting with like denominators, whole number × fraction, decimals ↔ fractions, comparing positive fractions and decimals, rectangle area and perimeter, and factors, multiples and primes.
- **6th grade:** ordering and comparing numbers (negatives, fractions, decimals, `|x|`), plotting and reading coordinates (whole, ½, ¼, ⅓ or 0.1 steps), distance on a grid, and absolute-value expressions.

### Your own questions (no code)

In the Bank editor, the **Your own question** problem type lets a parent type a question, for example one from a recent test. The parent writes `{placeholders}` for the numbers, and each placeholder gets a range: whole, decimal or fraction. A placeholder can also be worked out from the others, or picked from a list of words such as names. The editor also has optional rules (`b < a`, `whole(a / b)`), one to four answer formulas, and a hint and worked steps. Formulas use exact fractions (`src/shared/formula.ts`, never `eval`). The whole template is saved in the bank entry's params, so editing it later never changes past quiz reviews. Saving is blocked, with a plain-language message, if the template can't produce good questions (`src/shared/generators/custom.ts`).

### Adding a problem type

1. Add `src/shared/generators/myThing.ts` exporting a `GeneratorDef`, with `fields` for the parent editor and a few `presets`.
2. Register it in `src/shared/registry.ts`.
3. `npm test` runs every generator's presets across 1,000 seeds automatically. Add constraint tests if the problem type has rules that must always hold.

## Development

Requires Node 24 or newer. The server runs TypeScript directly and uses the built-in `node:sqlite`.

```sh
npm install
npm run dev        # API on :8080 (parent PIN 1234), Vite on :5173 (also on your LAN for phone testing)
npm test
npm run typecheck
```

## Container

```sh
podman compose up --build                   # http://localhost:8080, data in ./data
podman build -t math-time -f Containerfile .
```

| Env var | Purpose |
|---|---|
| `PARENT_PIN` | PIN for `/parent` (required in production) |
| `SESSION_SECRET` | Signs the parent session cookie (required in production) |
| `DB_PATH` | SQLite file, default `/data/math.db` in the image |
| `PORT` | Default `8080` |

SQLite uses the rollback journal (not WAL) so the database is safe on NFS. Run exactly one replica.

## Deploying

GitHub Actions (`.github/workflows/image.yml`) tests the code, then pushes a multi-arch image to `ghcr.io/mikemurray86/math-time`. A `vX.Y.Z` tag publishes `X.Y.Z`. Make the package public, or add an image pull secret.

The cluster manifests live in `cluster-gitops/apps/base/math-time/` and serve the site at `https://math.amurrayca.internal`. To bump the image, edit the tag in `deployment.yaml`. To change the PIN, run `sops apps/base/math-time/secret.yaml`.
