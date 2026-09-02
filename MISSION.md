# Mission: 42 Red Tetris — Comprendre l'architecture de A à Z

## Why
Maîtriser l'architecture complète du projet **42-red-tetris** pour pouvoir lire, modifier et étendre n'importe quelle partie — moteur de jeu, protocole réseau, état client, domaine serveur — sans se perdre dans le code. C'est un projet de groupe 42 avec une spec stricte (chapitre V) que je veux comprendre de l'intérieur.

## Success looks like
- Je peux expliquer où vit chaque responsabilité (engine pur, store React, server OOP, protocole partagé) et pourquoi cette découpe.
- Je sais tracer le parcours d'une touche pressée → action réseau → réaction serveur → mise à jour de tous les écrans.
- Je peux lire les fichiers `engine.ts`, `reducer.ts`, `socket.ts`, `domain.ts` et comprendre chaque fonction sans devoir tout débugger.
- Je sais où ajouter une feature (nouveau mode, nouveau type de pièce, nouveau type d'événement) sans casser la pureté ni les seuils de tests.
- Je peux défendre oralement les choix d'architecture (pourquoi pas Redux, pourquoi des prototypes côté serveur, pourquoi `useReducer` seul).
- Je peux expliquer en détail <em>chaque algorithme</em> du projet (collision, rotation, wall-kicks, gravité/lock, clear, garbage, spectre, 7-bag, machine d'états) avec sandbox : pseudocode, invariants, complexité, edge cases.

## Constraints
- Niveau intermédiaire : JS/TS à l'aise, notions de React, peu ou pas de réseau.
- Linux natif, `pnpm` installé.
- On lit le code tel qu'il est — pas de refactor en cours de leçon.
- Pas de scoring / bonus du sujet : focus partie obligatoire.
- Une leçon = un concept serré, faisable en moins de 15 minutes, avec un mini-exercice ou quiz.
- Deux parcours imbriqués : **architecture** (0001–0006, vue large) et **algorithmes** (0007–0015, détail pas-à-pas avec complexité O()). Chacun relié à l'autre.

## Out of scope
- Implémenter de nouvelles features (mode versus, etc.) — c'est un cours d'architecture, pas un sprint d'implémentation.
- Comparer Tetris à d'autres jeux (Snake, Pong) — on reste focus.
- Réécrire le projet avec une autre stack (Zustand, Solid, etc.).
- Optimisations perf / web worker / SSR — hors mission.
