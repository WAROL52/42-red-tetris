Type: grilling
Status: resolved
Blocked by: 04

## Question

Verrouiller le plumbing garbage & spectre à partir des décisions acceptées (garbage rows avec un trou aléatoire, poussées depuis le bas ; spectre = relay sur changement + heartbeat) :

- Génération des garbage : lignes à trou aléatoire, combien de lignes sont poussées pour un clear de n-1, insertion en bas avec remontée de la pile et perte des lignes qui dépassent en haut — et où cela vit en tant que fonction pure du moteur.
- Le comportement `queuePenalty` côté serveur déjà squeletté dans `domain.ts`, et la forme du broadcast `penalty` (selon le contrat de 04).
- La cadence des poussées de spectre + le heartbeat (throttle/batching) et le contrat exact du payload `spectrum` contre 04.
- Le mode solo : ce que voit le joueur (son propre spectre uniquement ; pas d'adversaires).

Résolution → spec spectre/garbage consommée par le prototype routing/écrans et la stratégie de test.

## Answer

Spec du plumbing garbage & spectre verrouillée (5 décisions acceptées, toutes recommandées) :

- **Génération** : `makeGarbageRow(rng: () => number)` — ligne de 10 cellules avec exactement un trou à colonne tirée aléatoirement (rng injectable → tests déterministes). Chaque ligne est incomplétable => « incassable ». Le receveur construit `lines` lignes (n-1 du clear adverse, via `penalty {lines}`) et appelle `applyGarbage(state, rows)` (fonction pure de l'engine, 02).
- **insertion** : la pièce active est d'abord verrouillée (lock forcé), puis les k lignes s'insèrent en bas avec remontée de la pile ; celles qui dépassent le haut du buffer interne (22 rangées) sont perdues. Déterministe, aucun chevauchement de pièce active.
- **Serveur** : suppression du cumul `Player.penalty`/`queuePenalty` du squelette (rien ne le consomme) ; le serveur ne fait qu'émettre `penalty {lines}` aux adversaires concernés (garde `players.size > 1` déjà présente) — ligne, pas de broadcast quand il n'y a pas d'adversaire (solo et last-remaining).
- **Heartbeat** : `spectrumHeartbeat {spectrum}` toutes les 2 s depuis GameSession, mais gated — seulement si le spectre a changé depuis le dernier envoi (diff de 10 valeurs). `lock` et `linesCleared` portent aussi le spectre (04) ; les trois chemins sont relayés par le serveur en `spectrum {playerName, spectrum}` vers le room.
- **Hauteurs** : spectre calculé sur la **zone visible seule** (20 rangées), hauteurs 0..20 par colonne — cohérent avec la garde de validation de 04.
- **Solo** : aucun adversaire → aucune émission de pénalité ni de spectre adverse ; le joueur rend son propre plateau directement depuis l'état engine local (pas de round-trip réseau).

→ Nouveau ticket : fermée ; sans ticket supplémentaire. Le fog « cadence du heartbeat » (rate limits, batching) de la carte est dégradé — désormais spécifié ici.