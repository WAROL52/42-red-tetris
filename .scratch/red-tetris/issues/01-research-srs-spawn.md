Type: research
Status: resolved
Blocked by:

## Question

Rassembler les faits SRS (Super Rotation System) autoritaires dont dépend le ticket du moteur, à partir d'une source de confiance (Tetris Guideline / hard drop wiki) :

- Les orientations de frame SRS exactes (0-3) pour les 7 tétrominos : J/L/S/T/Z partagent un même jeu, I a le sien, O est l'identité.
- Les données de wall-kick : la table de kicks J/L/S/T/Z et la table du I (kicks de base + décalages pour 0→1, 1→0, 1→2, 2→1, 2→3, 3→2, 3→0, 0→3), y compris la nuance d'ordre des candidats « ±1 et ±2 » à la première rotation.
- La position de spawn standard sur un plateau de largeur 10 pour chaque pièce (rotation de spawn + colonne de spawn), et le contrat du randomizer 7-bag standard.
- Les notes du guideline sur le soft/hard drop et les line clears qui affectent les règles que le moteur doit honorer (le sujet impose une vitesse constante : pas d'accélération).

Consigner les résultats dans un asset markdown à `.scratch/red-tetris/research/srs.md`, et résumer dans le commentaire de résolution (appendre `## Answer`, passer `Status: resolved`).

## Answer

Asset écrit : `.scratch/red-tetris/research/srs.md`. Vérifié sur tetris.wiki, harddrop et le décret tetrisconcept archivé (2020-2026) — tables de kicks identiques au bit près sur les trois ; aucune divergence.

- **États de rotation JLSTZ (0/spawn flottant-ouvert, 1/CW, 2/180, 3/CCW)** + **états I (0 = horizontale haute, la verticale retombe sur des colonnes différentes selon la rotation)** + **O = identité** — grilles complètes en coordonnées de minos et frames ASCII dans l'asset (§1).
- **Table de wall-kicks JLSTZ** et **table de kicks I** (5 tests × 8 transitions, `[x,y]`, +y = HAUT), le premier légal gagne, aucun test sauté (§2). Correction apportée à ce ticket : la « paire ±1-y du 0->1 » est en fait l'offset **O** de données, pas un test JLSTZ ; le 0->1 JLSTZ est `(0,0),(-1,0),(-1,+1),(0,-2),(-1,-2)`.
- **Spawn** (largeur 10, 0-indexé) : I aux colonnes 3-6, O à 4-5, JLSTZ à 3-5 (penche à gauche) — correction : pas « 3-4 » ; lignes de buffer −2/−1 suggérées pour 20 lignes visibles (§4).
- **Randomizer 7-bag** : shuffle uniforme, ≤12 pièces entre deux I, séquence S/Z longue de ≤4, une séquence partagée par room.
- **Notes du guideline** : hard drop verrouille instantanément ; soft drop = 1 cellule/tick non-verrouillante ; le lock delay du guideline est de 0,5 s réarmé à chaque mouvement (le « lock en une frame » de ce projet est une simplification assumée — à signaler docs/tests) ; couleurs I/O/T/S/Z/J/L = cyan/jaune/violet/vert/rouge/bleu/orange ; top-out = spawn impossible ou verrou hors du champ.
- Variants exclus (non applicables) : SRS d'Arika (SRS–), différences de lignes de spawn entre jeux.