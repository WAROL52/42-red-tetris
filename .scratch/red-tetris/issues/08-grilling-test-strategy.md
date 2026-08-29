Type: grilling
Status: resolved
Blocked by: 02, 03

## Question

Verrouiller la stratégie de test à partir de la décision acceptée (vitest + @vitest/coverage-v8, gate aux seuils du sujet) :

- Fenêtre de couverture : `src/client` + `src/server`, points d'entrée exclus (confirmer la liste d'exclusion : `main.tsx`, `index.ts` serveur, éventuellement `app.ts`).
- Configuration du gate : statements/functions/lines = 70, branches = 50 ; `test:coverage` doit-il faire échouer le build.
- Liste cible des tests : fonctions pures du moteur (02), reducers/selectors (03), validation des payloads de protocole (04), classes du domaine serveur Player/Piece/Game/spectre (contre le `src/server/domain.ts` actuel), logique garbage/spectre (05).
- Scripts : `test`, `test:watch`, `test:coverage` ; local uniquement (pas de CI dans le périmètre).
- Compatibilité vitest + Vite 8 (alignement de version avec le Vite installé).

Résolution → spec de stratégie de test alimentant la spec de handoff.

## Answer

Stratégie de test verrouillée (5 décisions acceptées, toutes recommandées) :

- **Runner & gate** : `vitest` v4.1.11 + `@vitest/coverage-v8` v4.1.11 (peers : Vite ^8.0.0 — conforme au Vite 8.2.2 installé, Node 24 ok). Scripts `test`, `test:watch`, `test:coverage`. Seuils enforce en config : `statements 70, functions 70, lines 70, branches 50` — `test:coverage` rend un code de sortie non nul sous les seuils.
- **Périmètre mesuré** : tout `src/` testé et mesuré — engine, reducer/sélecteurs, `shared/validation`, `server/domain`, composants React (rendu léger via `@testing-library/react` + `jsdom`). Exclusions de couverture (adaptateurs/wiring) : `src/main.tsx`, `src/server/app.ts`, `src/server/index.ts`, `src/server/socket.ts`. Le prototype `.scratch/red-tetris/prototype/` est hors `src/` (intouché par la mesure).
- **Déterminisme** : `src/client/engine/seed.ts` (PRNG mulberry32 nu, `function seed(n: number): () => number`) ; le 7-bag et `makeGarbageRow` reçoivent un `rng: () => number` injectable — bout quantités rejoue des graines fixes, zéro flaky, cas SRS vérifiés à la position près.
- **Plan des suites (cascade)** : 1) `engine/engine.test.ts` en profondeur — cas SRS/wall-kicks de `srs.md` (JLSTZ/I/O, spawn JLSZTZ 3–5, I 3–6, O 4–5, rangées −2/−1), tick de gravité (accumulateur ~500 ms), lock une frame, hard/soft drop, clears 1/2/3/4, garbage incassables + n−1, spectre (h 0..20), top-out double condition (spawn-overlap / lock-out), fin solo (winner null) et multi ; plus `seed.test.ts`, `garbage.test.ts` 2) `shared/validation.test.ts` — gate join + gardes de portée (spectrum len/heights, count, action, index) 3) `server/domain.test.ts` — machine d'état waiting/running/finished, round++, élections host, restart depuis finished seul, topOut/eliminated/aliveCount, resets 4) `client/store/reducer.test.ts` — mapping des événements protocole (04) vers le store + sélecteurs 5) composants légers — board, bandeau spectateur, bouton host selon status.
- **Serveur réseau** : logique couverte via `server/domain` pur + gardes partagés ; `socket.ts` hors mesure (wiring), son comportement de protocole déjà validé par les smoke tests socket.io existants, réutilisés comme contrôles d'intégration manuels.
- **Dépendances à installer au build** : `vitest`, `@vitest/coverage-v8`, `@testing-library/react`, `jsdom` (+ `@testing-library/jest-dom` pour les assertions DOM). Config `vitest.config.ts` (environment jsdom par défaut pour les suites composants, node pour le pur).

→ Ferme le dernier ticket de la carte : le frontier est vide.