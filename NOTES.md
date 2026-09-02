# NOTES

## Préférences utilisateur
- Langue de conversation : **français**.
- Niveau : intermédiaire en JS/TS, notions React, peu de réseau.
- Format : parcours guidé séquentiel, leçon courte, exercice/quiz inclus.
- OS : Linux natif, `pnpm` dispo.

## Conventions d'enseignement (pour moi)
- Pas de commentaire dans le code que je propose sauf si demandé explicitement.
- Leçons en HTML standalone, beau typographie Tufte-like, ancrées dans ce projet précis.
- Assets partagés dans `./assets/` — un seul stylesheet pour l'instant, à enrichir.
- Chaque leçon : une seule idée maîtresse, quiz/exercice, lien vers une source primaire externe, lien vers la leçon suivante + vers les fichiers du projet (`file_path:line_number`).
- Toujours proposer une question de fin "ask the agent" pour aller plus loin.

## Décisions éditoriales pour ce cours
- Le cours **lit** le code, ne le modifie pas (sauf micro-exercice).
- Les leçons suivent l'ordre naturel du sujet : vue d'ensemble → moteur pur → protocole → store → serveur → assemblage.
- Deux parcours **reliés** :
  - **Architecture (0001–0006)** : vue large, où vivent les responsabilités.
  - **Algorithmes (0007–0015)** : détail pas-à-pas (pseudocode, invariants, complexité O(), edge cases) sur collision, rotation, wall-kicks, gravité/lock, clear, spectre, garbage, 7-bag, machine d'états serveur.
- Les références externes sont minimales et pointues (pas une anti-sèche Wikipedia).
- Préférence exprimée : « explication de l'algorithme en détail de façon progressive » → chaque algorithme = une leçon finement scopée, du plus simple au plus complexe.
