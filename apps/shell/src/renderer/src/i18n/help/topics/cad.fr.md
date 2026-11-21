# Dessin IA

Dessin IA est un onglet pour les modèles 3D et les plans simples. Ouvrez un plan qu'on vous a envoyé et vérifiez ses mesures, construisez un petit modèle vous-même ou en le demandant à l'IA, puis insérez un plan coté dans un document Hangul ou Word. Les dessins sont enregistrés en fichiers .ttukcad, et toutes les longueurs sont en millimètres.

## Ouvrir un dessin

- Pour un nouveau dessin, allez sur l'accueil, ouvrez **All apps** et appuyez sur **Dessin IA**. L'onglet s'ouvre sous le nom **Dessin sans titre**.
- Pour ouvrir un fichier, utilisez **Fichier › Ouvrir…** (Ctrl+O) ou glissez le fichier sur la fenêtre. Dessin IA ouvre les fichiers .ttukcad, DXF, DWG, STL, OBJ, 3MF, GLB et PLY. Les DWG s'ouvrent du format AutoCAD R14 au format 2018.
- Un fichier autre que .ttukcad s'ouvre comme un nouveau dessin sans titre qui porte le nom du fichier. Le fichier d'origine n'est jamais modifié : l'enregistrement demande toujours un nouveau fichier .ttukcad.
- Les fichiers STEP, IGES et BREP sont des fichiers 3D de logiciels de CAO professionnels et ne peuvent pas être lus. Dessin IA affiche alors **Comment ouvrir ce fichier** : demandez à l'expéditeur un STL (un modèle 3D).
- Un fichier de plus de 100 Mo, ou un modèle de plus de 2 millions de triangles, ne s'ouvre pas.

## Placer des formes

- **Accueil › Placer des formes** contient les quatre formes les plus utilisées ; **Plus** ouvre la galerie des 15 formes : pavé, cylindre, sphère, cône, pyramide, coin, demi-sphère, tube, tore, prisme triangulaire, prisme hexagonal, pavé arrondi, prisme étoilé, toit et texte.
- Une nouvelle forme apparaît au centre du plan de travail, la plaque sur laquelle repose le modèle. Cliquez sur une forme pour la sélectionner ; Shift+clic ou Ctrl+clic ajoute d'autres formes à la sélection.
- **Affichage › Poignées** choisit l'effet des poignées de la forme sélectionnée : **Déplacer**, **Pivoter** ou **Taille**. En glissant, la forme avance par pas de 1 mm et de 15° ; maintenez Alt pendant le glissement pour couper l'aimantation.
- Le panneau **Propriétés** à droite montre la forme sélectionnée : nom, type (plein ou trou), dimensions, emplacement (mm), rotation (°) et couleur. Tapez un nombre pour le modifier. **Masquer** et **Verrouiller** mettent une forme de côté pour qu'elle ne gêne pas.
- **Affichage › Vues** tourne la caméra vers **Dessus**, **Face** ou **Côté**, et **Tout afficher** cadre le modèle entier. Faites glisser dans la vue pour la faire tourner, et utilisez la molette de la souris pour zoomer.
- La barre d'état en bas indique la taille du plan de travail, le pas d'aimantation et la grille, ainsi que la largeur × profondeur × hauteur de la forme sélectionnée.

## Trous, groupes et alignement

- Un trou est une forme qui découpe. Sélectionnez une forme et appuyez sur **Trou** (ou H) pour en faire un trou ; appuyez à nouveau pour la rendre pleine.
- Un trou ne découpe qu'à l'intérieur d'un groupe. Sélectionnez le trou et les formes pleines qu'il doit découper, puis appuyez sur **Grouper** (Ctrl+G) : le groupe correspond aux formes pleines moins les trous. **Dissocier** (Ctrl+Shift+G) le défait.
- **Aligner** range les formes sélectionnées sur la forme sélectionnée en premier : à gauche, au centre ou à droite ; à l'avant, au centre ou à l'arrière ; en bas, au centre ou en haut.
- Exemple : un cylindre de 80 mm de diamètre et un cylindre-trou de 68 mm de diamètre surélevé de 5 mm, sélectionnés ensemble puis groupés, donnent un gobelet avec un fond de 5 mm.

## Dessin libre et texte

- **Dessin libre** trace un contour de votre choix. Cliquez sur le plan de travail pour poser au moins 3 points ; **Annuler le point** retire le dernier.
- Saisissez la **Hauteur (mm)** et appuyez sur **Fermer la forme** : le contour se dresse en volume plein. **Annuler** quitte sans rien créer.
- Les lignes qui se croisent sont refusées. Annulez des points jusqu'à ce qu'elles ne se croisent plus.
- **Texte** demande les mots à placer et les transforme en lettres pleines, avec la police fournie avec GenOffice.

## Modifier les lignes et le texte d'un plan reçu

- Ouvrez un DXF ou un DWG et appuyez sur **Modifier les lignes**. Cliquez sur une ligne, un cercle, un arc ou un texte du plan pour le sélectionner (il prend la couleur de surbrillance) ; Shift+clic en sélectionne d'autres.
- Dans la barre du bas, **Supprimer** (ou la touche Delete) efface la sélection, **Déplacer** la décale des X et Y saisis en mm et, avec un seul texte sélectionné, vous tapez les nouveaux mots puis appuyez sur **Changer le texte**. Esc efface la sélection ; un second appui termine Modifier les lignes.
- Chaque modification revient en arrière avec un seul **Annuler** (Ctrl+Z). Un plan verrouillé n'est pas modifié.
- Vous pouvez aussi le demander à l'assistant IA, par exemple : « Supprime tout ce qui est sur le calque des cotes », « Remplace le texte « Salle de réunion » par « Grande salle de réunion » », « Déplace le calque des portes de 500 mm vers la droite ».
- Le résultat est enregistré en .ttukcad. Le fichier DXF ou DWG d'origine n'est jamais modifié.

## Mesurer et plan coté

- **Mesurer** affiche la distance entre deux points sur lesquels vous cliquez, la longueur d'une ligne ou le diamètre d'un cercle. Les points s'accrochent aux coins, aux extrémités des lignes et aux centres des cercles. Esc efface la mesure.
- **Plan coté** dessine le modèle de face, de dessus et de côté sur une feuille A4, avec la largeur, la profondeur et la hauteur totales, une échelle adaptée (1:1, 1:2, 1:5, 1:10 …) et un cartouche avec le nom, la date et l'échelle. Un dessin issu d'un fichier DXF ne montre que la vue de dessus.
- Dans le plan coté, **Copier l'image** le place dans le presse-papiers. Collez-le dans un onglet Hangul, Word ou PowerPoint.
- **Envoyer vers Hangul** ouvre un nouveau document Hangul avec le plan et un tableau des formes et de leurs dimensions. Si **Fonctions de documents coréens** est désactivé dans les paramètres, le bouton devient **Envoyer vers Word** et crée un document Word à la place.

## L'assistant IA

- Le panneau IA à côté du dessin place des formes, change les dimensions et les positions, crée des trous, groupe, aligne, règle la taille du plan de travail et résume le modèle. Quelques demandes à essayer :
  - « Fais un pot à crayons de 80 mm de large et 100 mm de haut, creux à l'intérieur avec un diamètre de 68 mm »
  - « Fais du plan de travail une pièce de 5 × 4 m et places-y quatre bureaux »
  - « Aligne les formes sélectionnées à gauche »
- Tout ce qu'une demande a modifié revient en arrière avec un seul **Annuler** (Ctrl+Z), quel que soit le nombre de formes touchées.
- L'IA reçoit votre demande et un résumé du modèle (nom, type, dimensions et emplacement de chaque forme). Elle ne peut ni enregistrer, ni ouvrir, ni exporter, ni envoyer : ces actions restent entre vos mains.
- Pour donner à l'IA une fiche technique ou un croquis, joignez-le avec le trombone sous la zone de saisie, faites-le glisser sur le panneau ou collez une image (Ctrl+V). L'IA le lit et construit d'après lui ; le fichier n'entre jamais dans le dessin, et la demande reste une seule annulation.

## Enregistrer et récupérer

- **Enregistrer** (Ctrl+S) écrit un fichier .ttukcad. Dessin IA n'enregistre que dans ce format ; **Enregistrer sous…** (Ctrl+Shift+S) choisit un nouveau nom ou un autre emplacement.
- **Enregistrement auto**, en haut, enregistre toutes les 30 secondes et chaque fois que la fenêtre perd le focus, dès que le dessin a son propre fichier.
- Si GenOffice se ferme de façon inattendue, au démarrage suivant le dessin apparaît dans **Documents avec du contenu non enregistré**. Appuyez sur **Restaurer** pour le récupérer.

## Exporter

- **Fichier › Exporter en STL** et **Exporter en OBJ** enregistrent le modèle pour une imprimante 3D ou un autre logiciel. **Exporter une image (PNG)** enregistre ce que montre la vue, sur un fond clair.
- Un export ne remplace jamais le fichier d'origine du dessin.

## Raccourcis clavier

| Touches                   | Action                            |
| ------------------------- | --------------------------------- |
| Ctrl+Z                    | Annuler                           |
| Ctrl+Y ou Ctrl+Shift+Z    | Rétablir                          |
| Ctrl+S                    | Enregistrer                       |
| Ctrl+A                    | Tout sélectionner                 |
| Delete                    | Supprimer                         |
| Ctrl+D                    | Dupliquer                         |
| Ctrl+G                    | Grouper                           |
| Ctrl+Shift+G              | Dissocier                         |
| H                         | Trou ↔ plein                      |
| Touches fléchées          | Déplacer de 1 mm (10 mm avec Maj) |
| Alt pendant le glissement | Couper l'aimantation              |

**Aide › Raccourcis** affiche la même liste dans l'onglet.

## Ce qu'il ne sait pas faire

- Ouvrir directement les fichiers STEP, IGES ou BREP. Demandez plutôt un STL.
- Réenregistrer en DXF ou DWG. Un plan modifié est enregistré en .ttukcad.
- Contraintes, historique de conception ou assemblages comme dans les logiciels de CAO professionnels. Chaque forme est définie par ses propres valeurs.
- Imprimer. Envoyez le plan coté vers un document Hangul ou Word et imprimez depuis celui-ci.
