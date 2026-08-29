Type: grilling
Status: resolved
Blocked by: 02, 04

## Question

Verrouiller l'architecture d'état client à partir de la décision acceptée (React hooks, sans Redux) et du sujet (composants fonctionnels encouragés, pas de `this`) :

- Le découpage reducer/context : état de la room de jeu vs pont socket vs plumbing d'entrées ; où passent les frontières de `useReducer`.
- L'hôte de la boucle de jeu : qui appelle le moteur pur à chaque tick et comment les mouvements y entrent.
- Le mapping action ↔ événement de protocole : quels événements du moteur envoient `move`/`lock`/`linesCleared`/`topOut`/spectre, contre la surface typée de 04-shared-protocol.
- Les états attente/spectateur exposés à l'UI depuis un store unique.
- Où vit le module moteur (`src/client/engine/`) et comment il reste pur.

Résolution → spec d'architecture + ADR recommandée captant « hooks plutôt que Redux » (surprenant à côté du texte du sujet, vrai trade-off, non trivial à inverser ensuite).

## Answer

Spec de l'architecture d'état client verrouillée (6 décisions acceptées, toutes recommandées) :

- **Store unique** : un seul `useReducer` détient tout l'état de session — `room`, `players`, `GameState` de l'engine (02), flags UI. Chaque action = une transition pure (engine) ou une ingestion d'événement réseau (04). `reducer.ts` + `engine.ts` exportés purs (aucune I/O) → testables isolément.
- **Hébergement** : un composant `GameSession` monte l'accumulateur rAF de gravité (cadence fixe ~1 case/500 ms, cf. 02) quand `status === running`, et la connexion socket ; cleanup au unmount (StrictMode-safe).
- **Pont socket** : module `socketBridge.ts` — `connectSocket(dispatch)` branche tous les `socket.on` de 04 (state/playerJoined/piece/penalty/spectrum/gameOver…) et renvoie un `emit` typé ; appelé depuis un useEffect unique de GameSession, pas de SocketContext global.
- **Moves locaux** : le client est autoritatif sur son champ — move/rotate/drop appliqués localement par l'engine, jamais envoyés au serveur. `move` reste typé dans le protocole (04) mais inutilisé côté client ; son handler serveur reste un no-op (léger commentaire à poser dans le squelette pour qu'on ne le « répare » pas). Le serveur ne distribue que pièces/pénalités/spectres/fin de manche.
- **Composition UI** : `GameProvider` racine + hooks sélecteurs (`useRoomState`, `useMyPlayer`, `useEngineState`) à valeurs memoïsées ; composants d'affichage purs qui n'émettent rien.
- **Découpe** : `src/client/store/engine.ts` (pur), `src/client/store/reducer.ts` (pur), `src/client/store/socketBridge.ts` (une seule face impure) ; ADR créée à `docs/adr/0001-hooks-over-redux.md`.