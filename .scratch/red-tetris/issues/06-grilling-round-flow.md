Type: grilling
Status: resolved
Blocked by: 04

## Question

Verrouiller le cycle de vie de la manche côté serveur à partir de la décision acceptée (le client détecte le top-out → événement `topOut` → le serveur marque éliminé ; la partie se termine quand il reste un survivant ; le host relance entre les manches) :

- Traitement de `topOut` : marquer le joueur éliminé, broadcaster, et terminer la manche quand il reste 1 survivant (solo : terminer sur le top-out).
- Surface de refactor dans le squelette : quels événements de `src/server/socket.ts` changent et ce dont a besoin `domain.ts` (flag eliminated sur Player, machine d'état de manche du Game waiting→running→finished→waiting, `restart` du host, admission des joins entre les manches).
- Le registre multi-parties + le nettoyage des rooms vides (déjà squeletté) — confirmer.
- Cas limites : le host part en pleine manche (réélection déjà squelettée) + la partie continue-t-elle ; tous sauf un partent ; restart pendant que des joueurs sont en plein plateau.

Résolution → spec du flow de manche ; réconcilier avec les implémentations existantes dans `src/server/`.

## Answer

Spec du cycle de vie de manche verrouillée (5 décisions acceptées, toutes recommandées) :

- **Modèle** : 3 états `waiting | running | finished` conservés ; ajout de `round: number` sur Game (incrémenté à chaque finish) et `eliminated: boolean` sur Player avec `reset()` (plateau + eliminated). `finished` = manche finie, restart du host en attente, visible dans le state.
- **topOut** : `topOut` (payload vide, 04) → `player.eliminated = true` + broadcast `playerEliminated {playerName}` ; dès qu'il ne reste qu'1 non-éliminé connecté → `finished` + `round++` + `gameOver {winner}`. Solo : topOut du seul joueur → `finished` + `gameOver {winner: null}`. Les topOut après `finished` sont ignorés (garde de statut).
- **Admission** : join rejeté **seulement si `running`** (admission en `waiting` ET `finished`). Au restart, les entrants partent plateau vierge. Résout le fog reconnect : un socket retombé en pleine manche ne peut pas revenir → il revient entre les manches, joueur neuf.
- **Restart** : uniquement depuis `finished` — pas de kill de manche en cours. `awaitNewRound` remet plates/éliminés/counter à zéro (round non remis à zéro).
- **Host qui part en pleine manche** : la manche continue, réélection du host suivant (déjà squeletté). Règle d'or unifiée : après **tout** départ OU topOut, si les non-éliminés ≤ 1 → `finished` + `gameOver {winner}` — corrige le cas que le squelette rate (host part, il reste 1 survivant parmi plusieurs joueurs non-déconnectés).
- **Registry multi-parties + nettoyage rooms vides** : confirmés sans changement (dernier départ → disconnectSockets + suppression du Map).
- **Surface de refactor** dans `src/server/` : `domain.ts` — `Player.eliminated`, `Player.reset()`, `Game.round`, `Game.aliveCount()`, `Game.topOut(socketId)`, garde `start()` corrigée (de waiting seulement, pas `!== running`) ; `socket.ts` — handler `topOut`, garde d'admission `status === 'running'` pour rejeter, handler `restart` ne répond que depuis `finished` ; suppression de `queuePenalty`/`Player.penalty` (voir décision de 05-grilling-garbage-spectrum).

→ Sans ticket supplémentaire. Deux fog dégradés : « reconnect semantics » (spécifié par l'admission entre manches) et « miroir autoritaire serveur pour spectateurs en retard » — caducs, les joins n'étant acceptés qu'hors running : aucun spectateur en retard n'existe ; le snapshot du state à l'arrivée porte déjà le spectre de chaque joueur.