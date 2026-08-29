Type: grilling
Status: resolved
Blocked by: 01

## Question

Verrouiller le contrat du moteur que le client utilisera, étant données la décision acceptée (SRS avec wall-kicks) et le sujet (formes de tétrominos originales, gravité à vitesse constante, verrouillage une frame après contact avec la pile) :

- Quel comportement exact de kicks/rotation embarque réellement 01-research-srs-spawn : SRS complet avec kicks du I, ou un sous-ensemble réduit ?
- Les valeurs par défaut de spawn par pièce, et la règle de spawn quand une nouvelle pièce chevauche immédiatement (chemin de game-over).
- La sémantique du lock en une frame + la gravité à vitesse constante sur un plateau 10×20 ; la source du tick de gravité (rAF vs interval).
- La surface d'API pure-fonctions que le module moteur (`src/client/engine/`) expose — représentation du plateau, et fonctions pures « step »/« move »/« rotate »/« hardDrop »/« lock »/« clearLines »/« topOut » — et comment les lignes garbage entrent dans le modèle pur.
- Les critères d'acceptation sur lesquels le moteur sera testé (alimente le ticket de stratégie de test).

Résolution → consigner la spec du moteur ; créer une ADR seulement si un trade-off réellement difficile à inverser émerge.

## Answer

Spec du moteur verrouillée (8 décisions acceptées, toutes correspondant aux recommandations) :

- **SRS complet** : tables JLSTZ + I + O = identité de 01-research-srs-spawn ; résolution test-par-test, premier légal gagne, aucun test sauté. Conformité testée directement contre l'asset.
- **Top-out** : mort dès que (a) le spawn chevauche la pile, ou (b) un verrou pose des cellules au-dessus de la rangée visible 0. Les deux, comme le Guideline.
- **Gravité** : pas discret « descendre d'une case » exposé par le moteur ; le client monte la cadence (ex. 1 case / 500 ms) via accumulateur rAF. Vitesse constante, sans accélération.
- **Lock « une frame »** : verrou si grounded au moment où le tick doit descendre ; la pièce peut être ajustée pendant la frame où elle touche, se verrouille à la suivante (simplification assumée vs le lock delay Guideline 0,5 s — à signaler docs/tests).
- **Garbage** : appliquées immédiatement à réception ; insertion en bas avec remontée de la pile ; les lignes qui dépassent en haut sont perdues. Le trou est décidé par l'appelant (moteur pur, tests par replay) : l'appelant fournit les données de lignes.
- **Plateau** : 22 rangées internes (20 visibles + 2 de buffer) ; spawn des minos sur les rangées −2/−1 ; colonnes de spawn 0-indexées : I 3-6, O 4-5, JLSTZ 3-5. 7-bag : la séquence vit côté serveur (déjà squelettée), le moteur reçoit seulement le type : `spawn(state, nextType)`.
- **API** : module `src/client/engine/` sans aucun import React ; un `GameState` sérialisable unique + fonctions pures : `createGame`, `spawn(state, type)`, `tick(state)`, `move(state, dx)`, `rotate(state, dir)`, `softDrop(state)`, `hardDrop(state)`, `clearLines` (automatique après verrou), `applyGarbage(state, rows)`, `spectrum(state)`, `isTopOut(state)`, `isGameOver(state)`.
- **Critères d'acceptation** (pour 08-test-strategy) : conformité SRS contre l'asset, positions de spawn, verrou « une frame », clear n-1 + application garbage, top-out (les deux conditions), spectre, invariants (aucune cellule hors du champ, lignes pleines après insertion).

Aucune ADR justifiée : les choix sont à faible coût d'inversion et le vocabulaire du domaine (`règle set`, `top-out`, `garbage`, `spectre`) est déjà dans `CONTEXT.md`.