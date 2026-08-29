# SRS — Super Rotation System (research asset)

Authoritative wall-kick / rotation data for the Guideline's SRS, verified against
two+ independent sources (see **Sources**). Formatted so the tables transpose
directly into TypeScript data structures.

## Conventions used in this file

- **Grids** are drawn with row 0 at the *top*, one character = one cell; `.` =
  empty, the piece letter = filled. `x`/`c` = column axis (0 = left),
  `y`/`r` = row axis (0 = top).
- **Kick / offset coordinates** follow the Tetris Guideline convention:
  `[x, y]` with **positive `x` = right, positive `y` = UP** (y grows opposite to
  the row index of the grids above).
- **State naming.** Guideline names `0/R/2/L` (spawn, CW, 180°, CCW). This repo's
  ticket uses `0/1/2/3` with `0 = spawn, 1 = CW, 2 = 180, 3 = CCW`. Mapping:
  `0 ↔ 0`, `1 ↔ R`, `2 ↔ 2`, `3 ↔ L`. "0->1" below means "spawn -> CW".
- **Kick resolution.** Each transition lists 5 candidate offsets, tried **in
  order**; the first offset that lets the piece occupy a legal position **wins**.
  If all 5 fail, the rotation is cancelled (piece stays put).
- All tetrominoes share one piece sequence per room; these rules are per-field
  (pure, stateless) and independent of the sequence.

## 1. Rotation states

All pieces rotating about the center of their bounding square (pure rotation; the
wall-kick tables below supply the compensating offsets).

### JLSTZ — 3×3 bounding square

Spawn (state 0) is the *floating* state: the piece sits in the **top two rows** of
the box, so the box hangs one empty row below the piece (this is why a
non-rotated piece resting on flat ground cannot be rotated without a kick).

```
        state 0 (spawn)   state 1 (CW)     state 2 (180°)    state 3 (CCW)
J       J..               .JJ              ...               .J.
        JJJ               .J.              JJJ               .J.
        ...               .J.              ..J               JJ.

L       ..L               .L.              ...               LL.
        LLL               .L.              LLL               .L.
        ...               .LL              L..               .L.

S       .SS               .S.              ...               S..
        SS.               .SS              .SS               SS.
        ...               ..S              SS.               .S.

T       .T.               .T.              ...               .T.
        TTT               .TT              TTT               TT.
        ...               .T.              .T.               .T.

Z       ZZ.               ..Z              ...               .Z.
        .ZZ               .ZZ              ZZ.               ZZ.
        ...               Z..              .ZZ               Z..
```

Mino coordinates `(r, c)` within the 3×3 box (0,0 = top-left):

| piece | 0 (spawn)   | 1 (CW)       | 2 (180°)    | 3 (CCW)      |
|-------|-------------|--------------|-------------|--------------|
| J     | (0,0)(1,0)(1,1)(1,2) | (0,1)(0,2)(1,1)(2,1) | (1,0)(1,1)(1,2)(2,2) | (0,1)(1,1)(2,0)(2,1) |
| L     | (0,2)(1,0)(1,1)(1,2) | (0,1)(1,1)(2,1)(2,2) | (1,0)(1,1)(1,2)(2,0) | (0,0)(0,1)(1,1)(2,1) |
| S     | (0,1)(0,2)(1,0)(1,1) | (0,1)(1,1)(1,2)(2,2) | (1,1)(1,2)(2,0)(2,1) | (0,0)(1,0)(1,1)(2,1) |
| T     | (0,1)(1,0)(1,1)(1,2) | (0,1)(1,1)(1,2)(2,1) | (1,0)(1,1)(1,2)(2,1) | (0,1)(1,0)(1,1)(2,1) |
| Z     | (0,0)(0,1)(1,1)(1,2) | (0,2)(1,1)(1,2)(2,0) | (1,0)(1,1)(2,1)(2,2) | (0,1)(1,0)(1,1)(2,0) |

### I — 4×4 bounding square

Spawn (state 0) is the *upper horizontal* orientation, in the **top-middle row** of
the 4×4 box (so the box hangs below the piece). Note the vertical states land in
**different columns** (col 1 for CW, col 2 for CCW) — this is the asymmetry whose
compensation lives in the I kick table.

```
        state 0 (spawn)   state 1 (CW)     state 2 (180°)    state 3 (CCW)
I       ....              .I..             ....              ..I.
        IIII              .I..             ....              ..I.
        ....              .I..             IIII              ..I.
        ....              .I..             ....              ..I.
```

Mino coordinates `(r, c)` within the 4×4 box:

| piece | 0 (spawn)              | 1 (CW)            | 2 (180°)           | 3 (CCW)            |
|-------|------------------------|-------------------|--------------------|--------------------|
| I     | (1,0)(1,1)(1,2)(1,3)   | (0,1)(1,1)(2,1)(3,1) | (2,0)(2,1)(2,2)(2,3) | (0,2)(1,2)(2,2)(3,2) |

### O — 2×2 bounding square

All four states occupy the whole box; rotation is the identity on screen.

```
        state 0 (spawn)   state 1 (CW)     state 2 (180°)    state 3 (CCW)
O       OO                OO               OO                OO
        OO                OO               OO                OO
```

## 2. Wall kicks

Kicks are the difference between the *true-rotation* offsets of the old and new
states. One table per piece, `[x, y]`, **positive y = UP**.

### JLSTZ kick table

| transition | test 1 `(x, y)` | test 2 | test 3 | test 4 | test 5 |
|------------|-----------------|--------|--------|--------|--------|
| 0 -> 1     | (0, 0)          | (-1, 0) | (-1, +1) | (0, -2) | (-1, -2) |
| 1 -> 0     | (0, 0)          | (+1, 0) | (+1, -1) | (0, +2) | (+1, +2) |
| 1 -> 2     | (0, 0)          | (+1, 0) | (+1, -1) | (0, +2) | (+1, +2) |
| 2 -> 1     | (0, 0)          | (-1, 0) | (-1, +1) | (0, -2) | (-1, -2) |
| 2 -> 3     | (0, 0)          | (+1, 0) | (+1, +1) | (0, -2) | (+1, -2) |
| 3 -> 2     | (0, 0)          | (-1, 0) | (-1, -1) | (0, +2) | (-1, +2) |
| 3 -> 0     | (0, 0)          | (-1, 0) | (-1, -1) | (0, +2) | (-1, +2) |
| 0 -> 3     | (0, 0)          | (+1, 0) | (+1, +1) | (0, -2) | (+1, -2) |

### I kick table

| transition | test 1 `(x, y)` | test 2 | test 3 | test 4 | test 5 |
|------------|-----------------|--------|--------|--------|--------|
| 0 -> 1     | (0, 0)          | (-2, 0) | (+1, 0) | (-2, -1) | (+1, +2) |
| 1 -> 0     | (0, 0)          | (+2, 0) | (-1, 0) | (+2, +1) | (-1, -2) |
| 1 -> 2     | (0, 0)          | (-1, 0) | (+2, 0) | (-1, +2) | (+2, -1) |
| 2 -> 1     | (0, 0)          | (+1, 0) | (-2, 0) | (+1, -2) | (-2, +1) |
| 2 -> 3     | (0, 0)          | (+2, 0) | (-1, 0) | (+2, +1) | (-1, -2) |
| 3 -> 2     | (0, 0)          | (-2, 0) | (+1, 0) | (-2, -1) | (+1, +2) |
| 3 -> 0     | (0, 0)          | (+1, 0) | (-2, 0) | (+1, -2) | (-2, +1) |
| 0 -> 3     | (0, 0)          | (-1, 0) | (+2, 0) | (-1, +2) | (+2, -1) |

### O piece

**No kicks.** Rotating O is the identity; it never needs a candidate test.

> **Ticket note — "the +1 and −1 offsets in y for the 0->1 first rotation".**
> The JLSTZ 0->1 row above contains **no ±1-y pair** — its tests are
> `(0,0),(-1,0),(-1,+1),(0,-2),(-1,-2)`. The requested "+1/−1 in y" pair is the
> **O piece's own offset data**: from the O true-rotation offsets below, the
> derived translations are `0->1: (0,+1)` and `1->0: (0,-1)` (plus identical
> ±1-x terms for the sideways rows). For O they are never exercised (rotation
> never fails); in code, translating O is a no-op equal to the identity. Test
> order for every transition: **test 1 wins if legal, else test 2, … test 5; no
> test may be skipped.**

## 3. True-rotation offsets (reference)

The kick tables are pairwise differences of these per-state offset lists
(offset index `k` = 0..4 rows above). Storing these plus the difference rule is
equivalent to storing the tables; keep both for testability.

### JLSTZ offsets

| state | k=0 | k=1 | k=2 | k=3 | k=4 |
|-------|-----|-----|-----|-----|-----|
| 0     | (0, 0) | (0, 0) | (0, 0) | (0, 0) | (0, 0) |
| 1     | (0, 0) | (+1, 0) | (+1, -1) | (0, +2) | (+1, +2) |
| 2     | (0, 0) | (0, 0) | (0, 0) | (0, 0) | (0, 0) |
| 3     | (0, 0) | (-1, 0) | (-1, -1) | (0, +2) | (-1, +2) |

### I offsets

| state | k=0 | k=1 | k=2 | k=3 | k=4 |
|-------|-----|-----|-----|-----|-----|
| 0     | (0, 0) | (-1, 0) | (+2, 0) | (-1, 0) | (+2, 0) |
| 1     | (-1, 0) | (0, 0) | (0, 0) | (0, +1) | (0, -2) |
| 2     | (-1, +1) | (+1, +1) | (-2, +1) | (+1, 0) | (-2, 0) |
| 3     | (0, +1) | (0, +1) | (0, +1) | (0, -1) | (0, +2) |

### O offsets

| state | offset |
|-------|--------|
| 0     | (0, 0) |
| 1     | (0, -1) |
| 2     | (-1, -1) |
| 3     | (-1, 0) |

## 4. Spawn position and piece sequence

### Spawn (SRS / Guideline)

All pieces spawn fully inside the (invisible) buffer above the 20 visible rows,
in their state-0 orientation above (§1). Columns are **0-indexed**, field is
**10 wide**:

| piece | 0-indexed columns occupied | placement |
|-------|----------------------------|-----------|
| I     | 3, 4, 5, 6                 | centered   |
| O     | 4, 5                        | centered   |
| J, L, S, T, Z | 3, 4, 5              | left-middle, "rounded to the left" |

> **Ticket note.** The ticket's "centered columns 3–4" phrasing for JLSTZ is
> imprecise: the 3-wide pieces occupy columns **3, 4 and 5** (box centre sits
> between columns 4 and 5, so the stack leans left).

**Rows.** Guideline convention varies by game: the classic (Tetris Worlds era)
spawns JLSTZ minos on the hidden rows **21–22 counting from the bottom**
(rows 21 = flat side, 22 = nub; I occupies row 22); many later games spawn one
row lower (On The Run 2015+: rows 20–21; tetris.com: in-field). Recommended for
this project (20 visible rows, rows 0–19 from the top, spawn buffer above):
place the **state-0 box** so its minos sit at **rows −2 … −1** relative to the
visible top row (JLSTZ: nub row −2, flat row −1; I/O: single row −2/−1), which
reproduces the older, conservative guidelines. Whatever a game chooses, the kick
tables above are unchanged — only the box's rest position differs.

### Randomizer: 7-bag (Guideline standard)

- One bag = one of each of the 7 pieces (I, J, L, O, S, T, Z), shuffled uniformly
  (5,040 possible orders).
- Bags are dealt **in order, one piece at a time**; a new bag is shuffled after
  each bag empties.
- Consequences (used by players, verify in tests): at most **12 pieces** between
  two I's; at most **4 consecutive S or Z** in a row.
- Whole-room property: all players of a room receive the **same sequence**, in
  the same order.

## 5. Guideline notes relevant to "constant speed, no scoring"

- **Hard drop**: `Up` in Guideline → piece falls and **locks instantly** at the
  bottom. It is the *locking* drop; it ends the piece's lock-clock immediately.
- **Soft drop**: `Down` in Guideline → moves the piece down **1 cell per tick**,
  **non-locking** (does not itself lock the piece). Gravity here is described at
  1G = 1 cell/frame; this project's "constant speed" is a deliberate variant.
- **Lock delay**: the Guideline value is **0.5 s** with **move reset** (each
  move/drop resets the clock up to a cap). This project's "lock one frame after
  touching the pile" is a **simplification, not Guideline** — note it explicitly
  in docs/tests so nobody "fixes" it later.
- **Playfield**: 10 columns wide; ≥20 visible rows plus the hidden buffer above
  (total ≥22 rows in SRS terms).
- **Colors** (Guideline): I cyan, O yellow, T purple, S green, Z red, J blue,
  L orange.
- **Top-out** = the spawned piece cannot fit / piece locks out of the field.

## Sources

Consulted (in order):

1. https://tetris.wiki/Super_Rotation_System (live, latest — primary)
2. https://harddrop.com/wiki/SRS (live — primary)
3. https://tetris.wiki/Tetris_Guideline (live — primary)
4. https://tetris.wiki/Random_Generator (live, 7-bag)
5. https://tetris.wiki/Tetromino (live, basic orientation vocabulary)
6. https://tetris.wiki/Hard_drop → https://tetris.wiki/Drop (live, gravity/drop)
7. https://tetris.wiki/Lock_delay (live, lock mechanics)
8. https://web.archive.org/web/2024id_/https://tetrisconcept.net/wiki/SRS
   (archived decree, 2020 revision — primary; live host times out)
9. https://harddrop.com/wiki/Tetris_Guideline (excerpt via search — colors, spawn)

Cross-check status: the JLSTZ and I kick tables are **bit-identical** across 1, 2
and 8 (three independent snapshots spanning 2020–2026); no discrepancies found.
Rotation-state grids were reconstructed from the two articles' explicit textual
rules (§1: spawn in top two rows / top-middle row, rotation about box centre) and
match the ASCII example in source 1 (J spawn). Discrepancies worth flagging:
spawn *row* varies by game (see §4) and Arika's SRS ("SRS–" variants) changes the
I table — neither applies to the Guideline SRS this project targets.