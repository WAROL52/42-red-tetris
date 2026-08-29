Type: task
Status: resolved
Blocked by: 02, 03, 04, 05, 06, 07, 08

## Question

Assembler la spec de handoff consolidée une fois les tickets de décision résolus :

- `docs/red-tetris-spec.md` : récap de destination ; décisions verrouillées par zone (règles du moteur / architecture d'état / protocole partagé / garbage & spectre / flow de manche / routing & écrans / stratégie de test) ; liens vers chaque ticket et l'asset de recherche (01) ; et une checklist d'ordre de construction pour l'agent implémenteur (étapes + vérifications : `pnpm dev`, `pnpm build && pnpm start`, gate `test:coverage`) plus la relecture croisée du chapitre V du sujet.
- Signaler tout manque de la partie obligatoire découvert en assemblant les décisions.

Résolution → le fichier de spec est écrit ; la destination de la carte (« le moyen est clair ») est atteinte dès que chaque ticket de décision et celui-ci sont fermés.

## Answer

Spec consolidée écrite : `docs/red-tetris-spec.md` — récap de destination ; décisions verrouillées par zone (moteur / protocole / architecture d'état / garbage & spectre / flow de manche / routing & écrans / stratégie de test), chacune liant son ticket (et `srs.md`, le prototype, l'ADR) sans redoubler les réponses ; relecture croisée du chapitre V sous forme de tableau de conformité ; ordre de construction en checklist avec commandes de vérification (`pnpm lint`, `pnpm build && pnpm start`, `pnpm dev`, gate `pnpm test:coverage`) ; hors périmètre pointé vers la map.

**Écart découvert en assemblant** : le mapping clavier de 07 contredisait le V.1.1 du sujet (il mappait `← →` = rotation alors que le sujet impose `↑` = rotation, `← →` = déplacement, `↓` = soft drop, `Espace` = hard drop). Corrigé dans la spec (§6) et contresigné au ticket 07.

**Manques de la partie obligatoire** : aucun autre — le tableau de conformité couvre tout le chapitre V (champ 10×20, même séquence/positions, n−1 lignes incassables, spectre temps réel, top-out, vitesse constante + lock 1 frame, inputs, URL join, host/réélection, joins en-manche interdits, fin à 1 survivant, solo, multi-salles, responsabilités client/serveur + protocole, SPA, fonctions pures, pas de table/canvas/SVG, pas de scoring/persistance, seuils de test, pas de secrets).

→ La carte est entièrement close (tickets 01–09 résolus) ; la destination « le moyen est clair » est atteinte. Le build s'exécute depuis `docs/red-tetris-spec.md`.