# 42 Red Tetris — Resources

## Knowledge

### Tetris / SRS (règles du jeu)
- [Tetris Wiki — Super Rotation System](https://tetris.wiki/Super_Rotation_System) — référence communautaire SRS, tables de kicks, rotations. Source primaire pour toute question sur la rotation/wall-kick.
- [Hard Drop — Tetris](https://harddrop.com/wiki/Tetris) — wiki technique, couvre 7-bag, hold, lock delay, top-out, etc.
- [SRS research asset local](../.scratch/red-tetris/research/srs.md) — extraction du SRS vérifiée sur 3 sources, celle qu'on utilise dans le projet. À lire en premier pour le moteur.

### React / useReducer
- [React docs — useReducer](https://react.dev/reference/react/useReducer) — référence officielle sur l'API `useReducer`. Quand on hésite entre useState et useReducer, on y revient.
- [React docs — Extracting State Logic into a Reducer](https://react.dev/learn/extracting-state-logic-into-a-reducer) — explique le pattern "reducer = transition pure + dispatch".
- [ADR local 0001-hooks-over-redux](../docs/adr/0001-hooks-over-redux.md) — pourquoi ce projet a choisi `useReducer` plutôt que Redux. Court et utile.

### Socket.IO
- [Socket.IO docs — Server API](https://socket.io/docs/v4/server-api/) — API serveur officielle. La lecture des types `ClientToServerEvents`/`ServerToClientEvents` devient limpide après.
- [Socket.IO docs — Rooms](https://socket.io/docs/v4/rooms/) — utile pour comprendre le multi-salles concurrentes.

### TypeScript strict
- [TS handbook — verbatimModuleSyntax](https://www.typescriptlang.org/tsconfig/#verbatimModuleSyntax) — explique pourquoi on importe les types avec `import type { ... }` dans ce projet.

## Wisdom (Communities)
- [r/tetris](https://reddit.com/r/tetris) — discussions de joueurs experts, utile pour comprendre pourquoi les règles Tetris sont ainsi (lock delay, gravity, SRS).
- [Stack Exchange — Game Development](https://gamedev.stackexchange.com/) — pour les questions précises d'algo de jeu.
- Slack/Discord 42 — pour relier ce projet à la communauté 42 locale si pertinent.

## Gaps
- Pas encore de référence curée pour le pattern "réseau + reducer React" spécifiquement. À ajouter si on trouve un article de qualité.
- Pas de communauté francophone Tetris identifiée. À laisser tel quel sauf demande explicite.
