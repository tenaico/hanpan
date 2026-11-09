# L’écran d’accueil : où vivent vos fichiers

L'accueil est la page de départ de GenOffice : une barre latérale de navigation à gauche et un tableau de cartes à droite. Saisissez un sujet dans la carte **Démarrer** pour ouvrir une carte mentale, et rouvrez vos documents récents depuis la carte **Reprendre** ; son bouton **All N** mène à la liste complète **Récents**. Sur les écrans en coréen, une autre carte affiche la prévision du jour de Trend Radar ; cliquer sur un domaine ouvre Trend Radar dans votre navigateur.

## Navigation dans la barre latérale

- **Accueil** : le tableau de cartes. L'application démarre ici.
- **Récents** : les fichiers que vous avez ouverts récemment. Chaque ligne est datée — aujourd’hui, hier ou la date.
- **Favoris** : les fichiers que vous avez mis en favori. Survolez une ligne et cliquez sur l’étoile pour l’ajouter ou le retirer. **Déplacer vers un groupe** dans le menu ⋯ range les fichiers étoilés dans des groupes nommés ; la vue Étoilés filtre par groupe.
- **Guide de l’utilisateur** : ouvre ce manuel.
- **Ask AI** : le panneau de base de connaissances — posez des questions et recevez des réponses citées depuis vos fichiers étoilés (voir ci-dessous).
- **Dossiers** : les répertoires que vous ajoutez à la barre latérale avec **Ajouter un dossier…**, ou que vous y faites glisser depuis le gestionnaire de fichiers. Chacun devient une racine que vous pouvez ouvrir, dans laquelle créer des sous-dossiers, renommer et retirer ; une racine qui devient indisponible est signalée comme telle et peut être retirée de la liste. **Nouveau dossier** en crée un autre.
- **La ligne tout en bas** : indique si une IA est connectée — **Connecter l’IA**, ou le nom de l’abonnement connecté — et ouvre les Paramètres.

Il n’y a pas d’entrée Corbeille ici. Les fichiers supprimés vont dans la corbeille du système, et les restaurer relève de l’OS.

## La liste des fichiers

Chaque ligne affiche une icône, le nom du fichier, la date de modification et autres informations. Le **menu ⋯** de la ligne propose :

- **Ouvrir**, et **Afficher dans le dossier** pour localiser le fichier dans votre gestionnaire de fichiers.
- **Copier le chemin**.
- **Déplacer vers un dossier…** : ouvre un sélecteur de dossier et déplace réellement le fichier ; si la destination contient déjà un fichier de ce nom, vous pouvez ignorer, écraser ou renommer.
- **Renommer** : sur place, l’extension est conservée automatiquement.
- **Ajouter aux favoris / Retirer des favoris** — les favoris survivent aux redémarrages et suivent le fichier quand vous le renommez.
- **Dupliquer** : crée une copie dans le même dossier.
- **Supprimer** : déplace le fichier vers la corbeille du système — ce n’est pas une suppression définitive.
- **Retirer de la liste**, dans la vue **Récents** de premier niveau, pour faire disparaître une entrée sans toucher au fichier.

### Plusieurs fichiers à la fois

Cochez la case d’une ligne, ou faites ⌘/ctrl-clic, pour composer une sélection ; la case d’en-tête sélectionne tout ce qui est actuellement listé, et une barre au-dessus de la liste indique (**{n} sélectionné(s)**) combien sont sélectionnés et offre **Déplacer vers un dossier…** ainsi que **Supprimer les fichiers** pour l’ensemble. Vous pouvez aussi faire glisser une multi-sélection sur un dossier de la barre latérale.

## Recherche

Tapez dans la zone de recherche en haut du tableau : les résultats prennent la place du tableau ; effacez la recherche ou appuyez sur Échap pour revenir au tableau. Elle porte sur deux choses à la fois :

- **Les noms de fichiers** : filtrage rapide par nom.
- **Le contenu des fichiers** : GenOffice indexe vos fichiers en arrière-plan (le texte des .docx/odt/xlsx/pptx/pdf/md/html), si bien que chercher dans le corps du texte trouve aussi des fichiers. La portée et les interrupteurs se règlent dans les paramètres de recherche.

## Personnaliser l'accueil

Cliquez sur **Personnaliser l'accueil** à droite de la ligne du haut du tableau pour modifier les cartes. Les changements sont enregistrés aussitôt ; cliquez sur **Terminé** ou appuyez sur Échap quand vous avez fini.

- Faites glisser une carte pour la déplacer, et son coin inférieur droit pour la redimensionner ; le menu **⋯** de la carte permet aussi de choisir une taille. Dans la carte **Nouveau**, faites glisser les applications pour les réordonner, ou cliquez sur × pour en retirer une de l'accueil.
- **Ajouter une carte** ajoute une note rapide, les favoris, une vue de dossier, une horloge ou un raccourci, et fait revenir les cartes retirées. L'accueil peut contenir jusqu'à 24 cartes.
- **Disposition par défaut** rétablit l'ordre et la taille des cartes par défaut, ainsi que les applications affichées sur l'accueil. Les cartes que vous avez ajoutées restent en place.
- **Ranger en liste** affiche les cartes et les applications dans une liste, où vous pouvez les réordonner avec ↑↓, les ajouter ou les retirer et choisir leur taille sans souris.

## Nouveau et All apps

La carte **Nouveau** contient les applications épinglées à l'accueil. Cliquer sur une application crée un fichier de ce type et ouvre son éditeur — commencez à écrire tout de suite, ou laissez l'IA rédiger un brouillon (chaque éditeur a un **bouton IA** dans son ruban, et **Demander à l’IA** dans le menu contextuel de sélection). La dernière case, **All apps**, liste toutes les applications par groupe : cherchez par nom ou par usage, ouvrez l'une des trois **Recently used apps**, ou utilisez le bouton d'épingle d'une application pour l'épingler à l'accueil ou l'en retirer. Les applications arrivées avec une nouvelle version portent le badge **New**.

Le nouveau fichier atterrit dans le dossier actuellement sélectionné dans la barre latérale ; sans sélection, il va dans le dossier par défaut.

Ce que fait chaque application :

- **AI Docs** (.docx) : un document texte vierge dans l’éditeur Docs. Le fichier n’est écrit sur le disque qu’à la **première sauvegarde** ; les nouveaux documents s’ouvrent avec le panneau IA déplié (désactivez-le dans Paramètres → « Ouvrir le panneau IA dans les nouveaux documents »).
- **AI Sheets** (.xlsx) : un tableur vierge dans l’éditeur Sheets. Tant que vous n’avez pas enregistré, aucun fichier n’existe sur le disque — le nom est réservé pour la première sauvegarde ; après la première génération par l’IA, le fichier peut aussi être renommé automatiquement d’après son contenu.
- **AI Slides** (.pptx) : une présentation vierge dans l’éditeur Slides.
- **AI Markdown** (.md) : un document Markdown vierge dans l’éditeur Markdown.
- **AI HTML** (.html) : une page web vierge dans l’éditeur HTML.
- **AI PDF** (.pdf) : différent des autres — il crée **immédiatement** un vrai PDF vierge d’une seule page dans le dossier cible et l’ouvre comme un fichier ordinaire (l’éditeur PDF travaille sur de vrais fichiers). Pratique pour annoter, caviarder ou ajouter du texte ; le fichier peut être renommé automatiquement d’après son contenu à la première sauvegarde.
- **Ouvrir un fichier local** : un sélecteur de fichiers du système pour Word (.docx/.doc/.odt), Excel (.xlsx/.xlsm/.xls/.csv/.tsv), PowerPoint (.pptx/.ppt), PDF, Markdown (.md/.markdown) et pages web (.html/.htm). La sélection multiple fonctionne ; chaque fichier obtient son propre onglet. Les fichiers texte (.txt, .json) s'ouvrent aussi ici — ils arrivent dans la vue source de l'éditeur Markdown.

> Astuce : Fichier ▸ Nouveau dans la barre de menus crée les mêmes types de documents (⌘N/Ctrl+N crée un document texte par défaut) ; faire glisser un fichier dans la fenêtre l’ouvre.

## Interrogez votre base de connaissances

- Étoilez d'abord des fichiers (tout type que l'app lit) ; l'en-tête du panneau compte le corpus, et une base vide vous invite à aller étoiler.
- Les réponses citent leurs fichiers d'origine ; cliquez une citation pour ouvrir le fichier dans son éditeur.
- Nécessite une IA connectée ; voir [Connexion par abonnement](help://subscription). La conversation ne vit qu'en mémoire — fermer l'app y met fin.
- La recherche tourne sur l'index de fichiers local, comme la recherche de l'accueil ; les fichiers disparus sortent silencieusement du corpus.
- Les groupes n'organisent que la liste Étoilés — la base de connaissances couvre toujours tous les fichiers étoilés.
