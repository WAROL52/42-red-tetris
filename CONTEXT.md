# CONTEXT

Glossary for 42-red-tetris. Implementation-agnostic; see `docs/red-tetris-spec.md` and the wayfinder map under `.scratch/red-tetris/` for decisions.

## Terms

- **player** — a connected participant in a room. Identified by their chosen `player_name` and their socket id. Client-side code never uses `this`.
- **room** — a named game instance referenced by URL as `/<room>/<player_name>`; multiple rooms run concurrently.
- **game** — the object (server-side, prototype-based) holding a room's players, shared piece sequence and round state. Server-domain classes: Player, Piece, Game.
- **host** — the first player to join a room; starts/restarts a round and is re-elected (to the next player) when they leave.
- **piece** — a tetrimino of shape I/O/T/S/Z/J/L falling on a player's field. All players of a room receive the same sequence of pieces, in the same order.
- **field** — a player's 10×20 board of parked blocks; represented proposalally by pure functions on the client. The **board** is the same concept (term used interchangeably with field in the subject).
- **rule set** — the pure, functional engine (SRS rotation with wall-kicks, constant gravity, one-frame lock) that simulates a single field; deliberately stateless and shared-piece-seeded.
- **locked piece** — a piece that has come to rest and been merged into the field.
- **cleared lines** — rows completed by a player's lock; each clears n−1 penalty rows toward opponents.
- **garbage row** — an indestructible penalty row (full of blocks except one random hole, so it can never be cleared) inserted at the bottom of an opponent's field, pushing the stack up.
- **spectrum** — a compact per-column height view of a player's field, relayed in real time so opponents see it update live.
- **top-out** — a player's failure: the field has room for no new piece. The client detects it and reports it; a round ends when one player remains.
- **round** — a single playthrough from start to game-over inside a room; the host restarts the next round.

## Vocabulary already fixed by the subject

- no `<table>`; grid/flexbox layouts only; no canvas; no SVG.
- unit-test thresholds: ≥70% of statements/functions/lines, ≥50% of branches.