Type: prototype
Status: resolved
Blocked by: 03, 04

## Question

Verrouiller routing & écrans à partir de la décision acceptée (BrowserRouter ; `/` formulaire de join ; `/:room/:playerName` écran unique traversant lobby → running → over, le joueur éliminé devient spectateur) :

- Routes BrowserRouter : `/` (formulaire de join : nom + room, construit l'URL) et `/:room/:playerName` (écran de jeu unique ; états internes mappés au store de 03-grilling-state-arch et aux événements de 04-shared-protocol).
- Prototype UI grossier à réagir : champs du formulaire Home, layout de l'écran de jeu (propre plateau, spectres des adversaires, affordance de démarrage du host, bandeau mort/spectateur) — grid/flexbox uniquement, pas de canvas, pas de SVG, pas de `<table>`.
- Comment les états attente, running et over se rendent, et les incidences solo (pas d'adversaires).

Résolution → lier l'asset de prototype (ex. sous `.scratch/red-tetris/prototype/`) ; la spec écran/interaction convenue est la réponse.

## Answer

Asset de prototype : [routing-screens.html](.scratch/red-tetris/prototype/routing-screens.html) — 3 variantes switchables `?variant=A|B|C` (flèches ← →), grid/flexbox seul, sans lib. Variante retenue : **A « Coin arcade » + extras de B et C** (+ file des pièces approuvée via un horizon serveur).

Spec routing & écrans verrouillée :

- **Routing** (`react-router-dom`, BrowserRouter) : `/` = écran Home avec formulaire de join (champs room + playerName, construction de l'URL `/:room/:playerName`, garde d'admission réutilisant `src/shared/validation.ts` de 04) ; `/:room/:playerName` = **écran unique** traversant lobby → running → over, mappé au store de 03 et aux événements de 04. Un seul composant `GameScreen` ; états pilotés par `status` du store (pill waiting/running/finished).
- **Layout « Coin arcade » (A) + extras** :
  - Barre supérieure : nom du room + pilule de statut (« En attente » / « En cours » / « Terminée ») + compteur de joueurs + bouton hôte (visible si `isHost`) — *Démarrer la manche* (waiting) / *En cours…* désactivé (running) / *Rejouer* (finished).
  - Centre : plateau personnel 10×20 (grid) auréolé d'un **anneau d'emphase** (accent rouge, motif C) ; bandeau overlay auto-coté quand éliminé (« Éliminé — spectateur »).
  - Rail droit : spectres adverses empilés verticalement (skylines 10 colonnes depuis `PlayerPublic.spectrum`), éliminé grisé + tag « éliminé » ; **caché en solo** (pas d'adversaires).
  - Panneau latéral (extra B) : « Prochaines pièces » (3 pièces) alimenté par l'horizon serveur (raffinement protocole : `piece { type, index, next: PieceKind[3] }` et `gameStarted` porte `queue: PieceKind[3]` — le serveur reste l'unique source de séquence, Game tranche `sequence.slice(counter, counter+3)`).
  - Bandeau d'actions bas (extra B) : ligne de statut contextuel (lobby : « Le host peut lancer la manche. » / running : « Tapez vos directions pour guider la pièce. » / over : « Manche terminée — le vainqueur est {winner}. ») + état de connexion.
  - Clavier : `←` `→` rotation, `↓` descente, `Espace` chute — global sur document, pas d'interception quand un champ est focus (03). Solo : même écran, sans rail ni pénalités (05).

→ Nouveau ticket : aucun. Le dernier fog « UI styling détaillé de l'écran de jeu et du strip spectateur » est dégradé — spécifié ici. `react-router-dom` à installer au build.

> Corrigé par la relecture du chapitre V (assemblage de la spec, ticket 09) : le mapping clavier suit le sujet — `←` `→` = déplacer horizontalement, `↑` = rotation, `↓` = soft drop, `Espace` = hard drop (le mappage « ← → rotation » initial était une erreur face au V.1.1).