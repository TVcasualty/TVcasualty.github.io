# Git History Archive

Everything that existed in this repository before the 2026 Bun + Hono rebuild is preserved. **148 commits across 5 branches**, none of it lost.

Created 2026-09-16, before any rebuild work began.

## Why this exists

The repo had five abandoned branches, last touched in 2021, with **independent (non-overlapping) histories**. Verified unique commit counts — commits reachable from that branch and no other:

| Branch | Tip | Date | Commits | Unique |
| --- | --- | --- | --- | --- |
| `master` | `2bbbfa97d` | 2021-03-12 | 19 | 15 |
| `gh-pages` | `f18e6bf12` | 2021-03-12 | 19 | 15 |
| `source` | `f27ede5a5` | 2021-02-24 | 103 | 58 |
| `notmaster` | `08c7a45d8` | 2021-02-25 | 5 | 4 |
| `light/dark` | `304b49beb` | 2020-09-30 | 52 | 7 |

Every branch holds commits found nowhere else, so nothing was redundant and everything was worth keeping. Critically, `gh-pages` was **not** an ancestor of `master` — deleting it would have made the only copy of the original source unreachable and eventually garbage-collected.

## Layer 1 — Annotated tags (primary)

Five annotated tags, each with a descriptive message explaining what that branch contained. Pushed to GitHub, so they survive this machine dying.

| Tag | Points at | What it preserves |
| --- | --- | --- |
| `archive/2021-gatsby-source` | `gh-pages` | **Most important.** The real 2021 Gatsby source — `src/pages/index.js`, `src/components/`, `src/assets/sass/main.scss`, `config.js`. Gatsby v2 on the `gatsby-starter-overflow` template. |
| `archive/2021-gatsby-master` | `master` | The compiled Gatsby output GitHub Pages served until 2026. Build artifacts only, no source. |
| `archive/2021-gatsby-cache` | `source` | An accidentally-committed Gatsby `.cache/`. Low value, but holds 58 unique commits. |
| `archive/2021-build-copy` | `notmaster` | Duplicate build output. Low value, kept for completeness. |
| `archive/2020-portfolio-lightdark` | `light/dark` | The pre-Gatsby hand-written portfolio with a light/dark toggle. Earliest version of the site. |

Annotated (not lightweight) tags were chosen deliberately: they're objects in their own right, carry a message, author and timestamp, and are not silently overwritten the way lightweight tags can be.

**Verified:** commits reachable from the 5 tags = 148. From the 5 branches = 148. Difference = 0. The tags fully cover all branch history, so the branches are now safely deletable.

## Layer 2 — Git bundle (offline, independent of GitHub)

```
~/backups/tvcasualty/tvcasualty.github.io-full-2026-09-16.bundle          234 MB
~/backups/tvcasualty/tvcasualty.github.io-full-2026-09-16.bundle.sha256
```

A `git bundle --all`: a single file containing the complete object database and all 13 refs. Depends on nothing — not GitHub, not this checkout.

SHA-256: `e4e0e9755027e4031a1dae3a913b04ead185f952a53779dc255cdfd976fe7c2a`

**Verified two ways.** `git bundle verify` reports *"The bundle records a complete history"*, and a real test clone from it restored all 148 commits, all 5 tags, and readable file contents from both `archive/2021-gatsby-source:src/pages/index.js` and `archive/2020-portfolio-lightdark:index.html`.

## Layer 3 — The branches themselves

`gh-pages`, `source`, `notmaster` and `light/dark` are still on GitHub, untouched. Now redundant given layers 1 and 2, but there's no cost to leaving them.

## How to recover

**Browse an archived version without changing anything:**

```sh
git show archive/2021-gatsby-source:src/pages/index.js
git ls-tree -r --name-only archive/2021-gatsby-source
```

**Check out an old version to look around:**

```sh
git switch --detach archive/2021-gatsby-source
git switch -                                    # back to where you were
```

**Restore a single file into the current tree:**

```sh
git checkout archive/2021-gatsby-source -- src/components/Header.js
```

**Recreate a branch from a tag:**

```sh
git switch -c recovered-2021-source archive/2021-gatsby-source
```

**Restore the entire repo from the bundle** (works with zero network access):

```sh
sha256sum -c ~/backups/tvcasualty/tvcasualty.github.io-full-2026-09-16.bundle.sha256
git clone ~/backups/tvcasualty/tvcasualty.github.io-full-2026-09-16.bundle recovered
```

## Rules

- **Never delete or move the `archive/*` tags.** They are the primary safety net.
- Deleting the stale branches is now safe, but pointless. Prefer leaving them.
- If you ever rewrite history to shrink the 237 MB `.git` (dominated by ~26 MB of project GIFs plus every webpack chunk ever committed), the tags pin the old objects — meaning a rewrite **will not** actually reduce clone size until the tags are also removed. Don't remove them for that reason alone; the bundle would become your only copy.
- Keep at least one copy of the bundle off this machine.

## Verification log (2026-09-16)

- Unique commit counts per branch computed against all other branches — all five non-zero.
- `git merge-base --is-ancestor origin/gh-pages origin/master` → false (independent history confirmed).
- Tag coverage: 148 commits from tags vs 148 from branches, 0 missing.
- `git push origin --tags` → all 5 tags created on GitHub.
- `git ls-remote --tags origin` → all 5 present and resolving to the correct commits.
- `git bundle verify` → *"okay"*, *"records a complete history"*, 13 refs.
- Test clone from the bundle → 148 commits, 5 tags, file contents readable.
