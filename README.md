# Math Time 🦊

A mobile-friendly math practice site for a 6th grader. A parent picks problem templates for a **question bank**. Each quiz gets fresh numbers at the same difficulty. Pip the fox, confetti, stars, streaks, badges and avatar unlocks keep it fun, and a PIN-protected parent area has the results.

## How it works

- **Generators** (`src/shared/generators/`) are problem templates. `generate(params, seed)` returns the prompt, the answer, a hint and a step-by-step explanation. It uses exact fractions, so `1.5`, `3/2` and `1 1/2` all count as right.
- **Bank entries** (managed at `/parent/bank`) are a generator plus a preset or fine-tuned parameters. The parameters fix the difficulty, for example "crosses an axis, halves, ±5". Only the numbers change.
- **Quizzes** are weighted by the entry's "how often" setting, and entries the child has been missing come up more often.
- **Review**: every question is stored with its seed, so the parent review rebuilds exactly what the child saw, along with their first and second tries.
- **Multiple children**: each child has their own question bank, stars, streak, badges, avatar and history. Children pick themselves on the "Who's practicing?" screen, using an optional picture code that a parent sets on the Kids page. The parent dashboard and bank have a child switcher.

Starter problem types: ordering numbers (negatives, fractions, improper fractions, mixed numbers, decimals, `|x|`), comparing two numbers, plotting points and reading coordinates (whole, ½, ¼, ⅓ or 0.1 steps, written as fractions, mixed numbers or decimals), distance between points on the same horizontal or vertical line, and absolute-value expressions.

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
