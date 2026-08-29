Type: grilling
Status: resolved
Blocked by:

## Question

Verrouiller `src/shared/protocol.ts` — la surface d'événements typée unique importée par les deux faces (décision acceptée Q9), en affinant les événements actuels de `src/server/socket.ts` :

- La liste complète des événements dans les deux sens, incluant les nouveaux `topOut`, heartbeat de spectre, `gameOver {winner}`, handshake `restart`, `penalty`, et les existants `join`/`leave`/`start`/`move`/`lock`/`linesCleared`.
- La forme des payloads de chaque événement + le DTO public du joueur (name, isHost, eliminated, spectrum).
- Quels tsconfigs incluent `src/shared` (à la fois `tsconfig.app.json` et `tsconfig.server.json`) et les implications éventuelles de `verbatimModuleSyntax`.
- La posture de validation : faire confiance aux événements vs garde d'exécution sur les payloads de join (noms/rooms déjà validés côté serveur dans le squelette).

Bloque les tickets d'architecture d'état (03), garbage/spectre (05) et de flow de manche serveur (06).

## Answer

Spec du protocole partagé verrouillée (6 décisions acceptées, toutes recommandées). Refonte du squelette `socket.ts` (types), à installer par l'agent de build :

- **Événements finaux.** Client→serveur : `join {room, playerName}`, `leave`, `start`, `restart`, `move {action}`, `lock {spectrum}`, `linesCleared {count, spectrum}`, `spectrumHeartbeat {spectrum}`, `topOut`. Serveur→client : `state`, `playerJoined {room, player}`, `playerLeft {room, playerName}`, `playerEliminated {playerName}` (nouveau, diffusé immédiatement à la mort), `host {playerName}`, `gameStarted {room, players}`, `piece {type, index}`, `spectrum {playerName, spectrum}`, `penalty {lines}`, `gameOver {winner}`, `error {message}`.
- **DTO joueur** : `PlayerPublic = { id, name, isHost, eliminated, spectrum }` — `id` = socket id (sert de key React) ; `socketId` et `connected` du squelette sont supprimés (playerLeft/playerEliminated couvrent le départ et la mort ; `state` reflète les membres courants).
- **topOut** : payload vide ; le serveur marque éliminé et diffuse `playerEliminated`. Spectre final non consigné (écran de défaite = état gelé côté client).
- **Restart** : `restart` (host) → remise à zéro serveur → re-broadcast `gameStarted` = l'unique signal de début de manche ; pas d'ack dédié.
- **Emplacement** : un seul fichier `src/shared/protocol.ts` (types d'événements dans les deux sens, DTO, RoomState, MoveAction, PieceKind) ; `tsconfig.app.json` et `tsconfig.server.json` incluent `src/shared` ; `verbatimModuleSyntax` compatible (imports de types uniquement).
- **Validation** : `src/shared/validation.ts` partagé — gate de join (motif nom/room `^\w-{1,24}$`, déjà dans le squelette) réutilisée par le formulaire client AND le serveur ; gardes de portée avant relay : `spectrum.length === 10`, chaque hauteur `0..20`, `1 ≤ count ≤ 4`, `action ∈ {left,right,rotate,down,harddrop}`, `index ≥ 0`.

> Raffiné par [07-prototype-routing-screens](07-prototype-routing-screens.md) : `piece` porte un horizon `next: PieceKind[3]` et `gameStarted` porte `queue: PieceKind[3]` (file « Prochaines pièces » de l'écran).