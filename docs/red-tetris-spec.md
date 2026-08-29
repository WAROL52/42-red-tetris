# Spec red-tetris — handoff de build

Contrat transférable à partir duquel le build est exécuté. **Toutes les décisions sont verrouillées** : la carte wayfinder (`.scratch/red-tetris/map.md`) est close, frontier vide, plus aucun fog. Chaque zone renvoie au ticket qui en détient le détail — cette spec synthétise et pointe, elle ne redouble pas les réponses.

Conversation en français ; le sujet de référence est `./en.subject.pdf` (v5.2, chapitre V). Server 3000, Vite 5173 (proxy `/socket.io`).

## Destination

Un jeu Tetris réseau jouable **solo + multi** (Full-Stack JS/TS : React 19 + Vite 8 côté client, Hono + socket.io côté serveur), avec des tests unitaires au seuil du sujet (≥70 % statements/functions/lines, ≥50 % branches). Pas de scoring : le dernier survivor gagne. Le build s'exécute depuis cette spec, sans rouvrir de décision.

## Cadre imposé (chapitre V)

- Chaque joueur a son champ **10×20** ; **même séquence de pièces** pour tout un room, mêmes positions/coordonnées.
- Clear de lignes → les adversaires reçoivent **n−1 lignes « incassables »** en bas du champ.
- Champ mort : « ***une nouvelle pièce ne peut plus entrer*** » → top-out.
- Pas de `this` dans le code client ; plateau/pièces par **fonctions pures** ; serveur OOP par prototypes (`Player`, `Piece`, `Game`).
- **Pas de canvas, pas de SVG, pas de `<table>`** ; grid/flexbox uniquement.
- SPA ; join par URL `http://<host>:<port>/<room>/<player_name>` (router : BrowserRouter/MemoryRouter).
- Premier joineur = host, start/restart ; host parti → réélection ; **une fois démarré, plus de joins jusqu'à la manche suivante** ; fin quand un seul joueur reste ; solo jouable ; multi-salles concurrentes.
- Serveur : gestion jeu/joueurs, distribution des pièces, mises à jour de spectre, sert `index.html` + `bundle.js` + statiques.
- Pas de persistance. Pas de creds/clés/env dans le repo.

## 1. Moteur (règles pures) — `src/client/engine/`

Détail complet : [02-grilling-engine-spec](../.scratch/red-tetris/issues/02-grilling-engine-spec.md) ; tables SRS vérifiées : [srs.md](../.scratch/red-tetris/research/srs.md).

- SRS complet (rotations JLSTZ/I/O + wall-kicks), O = identité ; spawn sur rangées −2/−1 ne­gatives (I 3–6, O 4–5, JLSTZ 3–5) sur **plateau interne 22 rangées** (20 visibles + 2 buffer).
- API pure sur un `GameState` sérialisable : `createGame`/`spawn`/`tick`/`move`/`rotate`/`softDrop`/`hardDrop`/`clearLines`/`applyGarbage`/`spectrum`/`isTopOut`/`isGameOver`.
- Gravité : tick discret à cadence fixe (~1 case/500 ms), piloté par accumulateur rAF dans `GameSession` (cf. §3).
- Lock « une frame » : la pièce ne se fige qu'au tick suivant après contact.
- Top-out double condition : spawn-overlap **ou** lock-out (pièce qui ne peut plus entrer).
- Helpers : `makeGarbageRow(rng: () => number)` et `applyGarbage` (sémantique geler-puis-insérer : §4).
- Déterminisme : rng injectable (7-bag + garbage) via `seed.ts` (mulberry32) — [08](../.scratch/red-tetris/issues/08-grilling-test-strategy.md).

## 2. Protocole partagé — `src/shared/`

Détail : [04-grilling-shared-protocol](../.scratch/red-tetris/issues/04-grilling-shared-protocol.md) (+ raffinement de [07-prototype-routing-screens](../.scratch/red-tetris/issues/07-prototype-routing-screens.md)) ; à refonder dans `src/shared/protocol.ts` + `src/shared/validation.ts`, importé par les deux tsconfig (`verbatimModuleSyntax`-compatible, imports de types).

- C→S : `join {room, playerName}`, `leave`, `start`, `restart`, `move {action}`, `lock {spectrum}`, `linesCleared {count, spectrum}`, `spectrumHeartbeat {spectrum}`, `topOut` (payload vide).
- S→C : `state`, `playerJoined {room, player}`, `playerLeft {room, playerName}`, `playerEliminated {playerName}`, `host {playerName}`, `gameStarted {room, players, queue: PieceKind[3]}`, `piece {type, index, next: PieceKind[3]}`, `spectrum {playerName, spectrum}`, `penalty {lines}`, `gameOver {winner}`, `error {message}`.
- `PlayerPublic = { id, name, isHost, eliminated, spectrum }` (`id` = socket id, sert de key React ; `socketId`/`connected` supprimés).
- `MoveAction = 'left' | 'right' | 'rotate' | 'down' | 'harddrop'`.
- Validation partagée : gate join (motif `^\w-{1,24}$`) + gardes avant relay (`spectrum.length === 10`, hauteurs 0..20, `1 ≤ count ≤ 4`, `action` whitelisté, `index ≥ 0`).

## 3. Architecture d'état client — `src/client/store/`

Détail : [03-grilling-state-arch](../.scratch/red-tetris/issues/03-grilling-state-arch.md) ; ADR : [0001-hooks-over-redux](adr/0001-hooks-over-redux.md).

- **Un seul `useReducer`** détient l'état de session : room, players, `GameState` du moteur, flags UI. Actions = transition pure (engine) ou ingestion d'événement réseau.
- Découpe : `engine.ts` (pur) / `reducer.ts` (pur) / `socketBridge.ts` (`connectSocket(dispatch)` = seule face impure, branche tous les `socket.on` de §2 et renvoie un `emit` typé).
- `GameSession` (composant) monte l'accumulateur rAF de gravité **quand `status === running`** et la connexion socket ; cleanup au unmount (StrictMode-safe).
- `GameProvider` racine + hooks sélecteurs memoïsés (`useRoomState`, `useMyPlayer`, `useEngineState`) ; composants d'affichage purs qui n'émettent rien.
- **Moves autoritatifs côté client** : appliqués localement par le moteur, jamais envoyés au serveur. `move` reste typé dans le protocole mais inutilisé client-side ; son handler serveur reste un no-op commenté (ne pas « réparer »).

## 4. Garbage & spectre

Détail : [05-grilling-garbage-spectrum](../.scratch/red-tetris/issues/05-grilling-garbage-spectrum.md).

- `makeGarbageRow(rng)`: ligne de 10 cellules, **exactement un trou** par ligne (colon­ne aléatoire, rng injectable) → jamais complétable donc « incassable ».
- Réception de `penalty {lines}` → construire `lines` lignes → `applyGarbage(state, rows)` :
  - la pièce active est d'abord **verrouillée (lock forcé)** ;
  - les k lignes s'insèrent en **bas**, la pile remonte ; ce qui dépasse le haut du buffer 22 rangées est **perdu**.
- Serveur : n'accumule pas de pénalités (supprimer `Player.penalty`/`queuePenalty`) ; relaye `penalty {lines}` aux adversaires engagés seulement (`size > 1` — solo/dernier survivor : rien).
- Spectre : calculé sur la **zone visible 20 rangées** (hauteur par colonne 0..20).
- Heartbeat : `spectrumHeartbeat` toutes les **2 s** depuis `GameSession`, **gated** (si spectre inchangé, pas d'envoi — diff de 10 valeurs). `lock`, `linesCleared` et heartbeat sont tous relayés en `spectrum {playerName, spectrum}`.
- Solo : joue depuis l'état engine local ; pas de round-trip spectre.

## 5. Flow de manche serveur — `src/server/`

Détail : [06-grilling-round-flow](../.scratch/red-tetris/issues/06-grilling-round-flow.md).

- États `waiting | running | finished` + compteur `round` ; `eliminated: boolean` + `reset()` sur Player ; machines gardées : `start()` **depuis waiting seulement** (corriger le squelette : `!== 'running'` → `=== 'waiting'`).
- `topOut` → `eliminated` + broadcast `playerEliminated` ; dès qu'il ne reste **1 non-éliminé connecté** → `finished` + `round++` + `gameOver {winner}` (solo → `winner: null`) ; topOut reçus après `finished` ignorés.
- Admission : join rejeté **seulement si `running`** (waiting et finished admis — cohérent avec « plus de joins jusqu'à la manche suivante »).
- `restart` : **depuis `finished` seulement** (pas de kill de manche en cours) ; `awaitNewRound` remet boards/éliminés/counter à zéro.
- Host qui part en pleine manche : la manche continue (réélection déjà squelettée) ; règle unifiée : après **tout** départ OU topOut, si non-éliminés ≤ 1 → `finished` + `gameOver`.
- Registre multi-salles + nettoyage des rooms vides (dernier départ → disconnectSockets + suppression du Map) : inchangé.
- Refactor surface : `Game.round`/`aliveCount()`/`topOut()` ; handlers `topOut`, guards d'admission/`restart` ; suppression `queuePenalty`/`Player.penalty` ; **horizon `next`/`queue`** (§2) = `sequence.slice(counter, counter+3)`.

## 6. Routing & écrans

Détail : [07-prototype-routing-screens](../.scratch/red-tetris/issues/07-prototype-routing-screens.md) ; asset éprouvé : [routing-screens.html](../.scratch/red-tetris/prototype/routing-screens.html).

- `react-router-dom` (**BrowserRouter**, à installer) : `/` = `HomeScreen` (formulaire join room + playerName → navigue vers `/:room/:playerName`, garde d'admission réutilisée du §2) ; `/:room/:playerName` = **`GameScreen` unique** traversant lobby → running → over via le store (§3). Le SPA-fallback Hono sert déjà index.html sur ces chemins.
- Layout **« Coin arcade » + extras** : barre sup (room, pilule de statut, compteur, bouton hôte *Démarrer/En cours…/Rejouer* si `isHost`) · plateau personnel centré 10×20 **à anneau d'emphase** rouge · rail droit de spectres adverses (grisés + bandeau « Éliminé — spectateur» ; caché en solo) · panneau latéral **« Prochaines pièces »** (3 pièces depuis `piece.next`/`gameStarted.queue`) · bandeau d'actions bas contextuel (lobby/running/over + état de connexion).
- **Clavier (V.1.1 du sujet, corrigé ici)** :
  - `←` `→` : déplacer la pièce horizontalement
  - `↑` : rotation
  - `↓` : descente douce (soft drop)
  - `Espace` : chute (hard drop)
  - Écoute globale document, pas d'interception si un champ est focus (input/textarea/contenteditable).

  > Note de relecture : le prototype 07 mappait à tort `← → = rotation` ; on suit le sujet (la correction est consignée au ticket 07). Correspond aux `MoveAction` de §2.

## 7. Stratégie de test

Détail : [08-grilling-test-strategy](../.scratch/red-tetris/issues/08-grilling-test-strategy.md).

- Dépendances : `vitest` v4.1.11, `@vitest/coverage-v8`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`.
- Config `vitest.config.ts` : seuils **enforce** `statements/functions/lines 70` et `branches 50` ; `test:coverage` sort en erreur sous les seuils.
- Périmètre : tout `src/` (composants inclus) ; exclusions adaptateurs : `main.tsx`, `app.ts`, `index.ts`, `socket.ts`.
- Cascade : **engine en profondeur** (cas SRS de srs.md, spawn, tick, lock 1 frame, drops, clears 1–4, garbage + n−1, spectre, top-out double, fin solo/multi) → `shared/validation` → `server/domain` (machine d'état, élections, restart depuis finished, topOut/aliveCount) → `reducer` (mapping des événements §2) → composants légers.
- Smoke tests socket.io existants réutilisés comme contrôles d'intégration manuels (pas d'échec de gate dessus).

## Relecture croisée du chapitre V — conformité

| Exigence (V) | Sortie | Preuve |
| --- | --- | --- |
| Champ 10×20, même séquence, mêmes positions | ✅ | 02 (+ srs.md) |
| 10×20 & spectre en temps réel (hauteur max par colonne) | ✅ | 05 |
| n−1 lignes incassables en bas | ✅ | 05 |
| Fin : nouvelle pièce ne peut plus entrer (top-out) | ✅ | 02 (spawn-overlap / lock-out) |
| Vitesse constante ; immobilité au tick suivant | ✅ | 02 (une frame) |
| Inputs : ←→ déplacer, **↑ rotation**, ↓ soft drop, Espace hard drop | ✅ (corrigé) | §6 & 07 |
| Join par URL ; BrowserRouter ; host start/restart ; réélection ; plus de joins la manche démarrée ; fin = 1 survivant ; solo ; multi-salles | ✅ | 06, 07 |
| Serveur : jeu/joueurs, distribution pièces, spectre, HTTP statique | ✅ | 02, 04, 05, squelette (`src/server/`) |
| Responsabilités client/serveur + protocole explicites | ✅ | 04 (§2) |
| SPA ; fonctions pures côté client ; pas de `table`/canvas/SVG | ✅ | 03, 07 |
| Pas de scoring, pas de persistance | ✅ | hors périmètre (map) |
| Tests ≥70/70/70 + 50 branches, 4 métriques | ✅ | 08 (§7) |
| Pas de creds/env/secrets dans le repo | ✅ | aucun secret manipulé |

**Écarts trouvés en assemblant** : un seul — le mapping clavier (§6, corrigé). **Manques de la partie obligatoire** : aucun autre.

## Ordre de construction (checklist implémenteur)

1. **Dépendances** : `react-router-dom` ; `vitest`, `@vitest/coverage-v8`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` (dev). Retirer tout usage de `queuePenalty`/`Player.penalty`.
2. `src/shared/` — `protocol.ts` + `validation.ts` ; refondre les types de `src/server/socket.ts` (suppression `socketId`/`connected`, ajout `next`/`queue`/`topOut`/`playerEliminated`/`spectrumHeartbeat`).
3. `src/client/engine/` — `seed.ts`, `GameState` SRS + helpers ; **tests moteur d'abord** (cascade §7).
4. `src/client/store/` — `reducer.ts`, sélecteurs, `socketBridge.ts`, `GameProvider` + tests.
5. `src/server/` — refactor `domain.ts` (round/eliminated/aliveCount/topOut/start-guard/restart-guard) + handlers (topOut, heartbeat, horizon, admission) + tests domain.
6. Routing & écrans — `HomeScreen`, `GameScreen` + composants (board, rail, queue, bandeau), **clavier corrigé** (§6).
7. `GameSession` — accumulateur rAF + heartbeat 2 s gated + pont socket.
8. Tests restants (validation, reducer, composants) puis gate.
9. Relecture finale du chapitre V (tableau ci-dessus).

**Vérifications à chaque étape charnière** :
- `pnpm lint` — zéro erreur.
- `pnpm build` → `pnpm start` — render SPA + serveur 3000.
- `pnpm dev` — serveur 3000 + Vite 5173 (proxy `/socket.io`), join en double navigation : solo et multi-vue.
- `pnpm test:coverage` — **gate** (échec si sous 70/70/70 + 50 branches).

## Hors périmètre (ne pas implémenter)

Bonus du sujet (scoring, persistance de scores, modes de jeu), init git + packaging 42, CI/CD — voir [map](../.scratch/red-tetris/map.md) « Out of scope ».

## Index des artefacts

- Carte + toutes décisions : `.scratch/red-tetris/map.md` (index) et `.scratch/red-tetris/issues/01..09-*.md`
- Recherche SRS : `.scratch/red-tetris/research/srs.md`
- Prototype UI : `.scratch/red-tetris/prototype/routing-screens.html`
- ADR : `docs/adr/0001-hooks-over-redux.md`
- Glossaire : `CONTEXT.md`
- Sujet : `en.subject.pdf` (chapitre V)