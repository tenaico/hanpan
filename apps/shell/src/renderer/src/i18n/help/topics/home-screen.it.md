# La schermata Home: dove si trovano i tuoi file

La Home è la pagina iniziale di GenOffice: una barra laterale di navigazione a sinistra e una bacheca di schede a destra. Scrivi un argomento nella scheda **Inizia** per aprire una mappa mentale, e riapri i documenti recenti dalla scheda **Continua**; il suo pulsante **All N** porta all'elenco completo dei **Recenti**. Sugli schermi in coreano un'altra scheda mostra la previsione di oggi di Trend Radar; facendo clic su un ambito si apre Trend Radar nel browser.

## Navigazione laterale

- **Home**: la bacheca di schede. L'app parte da qui.
- **Recenti**: i file che hai aperto di recente. Ogni riga è datata — oggi, ieri o la data.
- **Preferiti**: i file che hai messo tra i preferiti. Passa il puntatore su una riga di file e fai clic sulla stella per aggiungerlo o rimuoverlo. **Sposta nel gruppo** nel menu ⋯ ordina i preferiti in gruppi con nome; la vista Preferiti filtra per gruppo.
- **Guida dell’utente**: apre questa guida.
- **Ask AI**: il pannello della base di conoscenza — poni domande e ottieni risposte citate dai tuoi file preferiti (vedi sotto).
- **Cartelle**: le directory che aggiungi alla barra laterale con **Aggiungi cartella…**, oppure che ci trascini dal gestore di file. Ognuna diventa una radice che puoi aprire, riempire di sottocartelle, rinominare e rimuovere; una radice che va offline viene mostrata come non disponibile e può essere tolta dall'elenco. **Nuova cartella** ne crea un'altra.
- **La riga in fondo**: mostra se l'IA è collegata — **Collega l’IA**, oppure il nome dell'abbonamento collegato — e apre le Impostazioni.

Qui non c’è alcuna voce Cestino. I file eliminati finiscono nel cestino di sistema, e recuperarli è compito del sistema operativo.

## L'elenco dei file

Ogni riga mostra un'icona, il nome del file, la data di modifica e altro. Il **⋯ menu** della riga offre:

- **Apri** e **Mostra nella cartella** per individuare il file nel gestore di file.
- **Copia percorso**.
- **Sposta nella cartella…**: apre un selettore di cartelle e sposta davvero il file; se la destinazione contiene già un file con lo stesso nome, puoi saltare, sovrascrivere o rinominare.
- **Rinomina**: rinomina direttamente lì, con l'estensione conservata automaticamente.
- **Aggiungi ai preferiti / Rimuovi dai preferiti** — i preferiti sopravvivono al riavvio e seguono il file quando lo rinomini.
- **Duplica**: crea una copia nella stessa cartella.
- **Elimina**: sposta il file nel cestino di sistema — non è un'eliminazione definitiva.
- **Rimuovi dall'elenco**, nella vista **Recenti** di primo livello, per far sparire una voce senza toccare il file.

### Più file insieme

Spunta la casella di una riga, o fai ⌘/ctrl-clic, per comporre una selezione; la casella dell'intestazione seleziona tutto ciò che è attualmente elencato, e una barra sopra l'elenco indica (**{n} selezionati**) quanti sono selezionati e offre **Sposta nella cartella…** ed **Elimina file** per tutto l'insieme. Puoi anche trascinare una selezione multipla su una cartella nella barra laterale.

## Ricerca

Scrivi nella casella di ricerca nella riga in alto della bacheca e i risultati prendono il posto della bacheca; cancella la ricerca o premi Esc per tornare alla bacheca. La ricerca cerca due cose insieme:

- **Nomi dei file**: filtro rapido per nome.
- **Contenuto dei file**: GenOffice indicizza i tuoi file in background (il testo dentro docx/odt/xlsx/pptx/pdf/md/html), così cercando nel corpo del testo trovi file. L'ambito e le opzioni si impostano nelle impostazioni di ricerca.

## Personalizza la home

Fai clic su **Personalizza la home**, a destra nella riga in alto della bacheca, per cambiare le schede. Le modifiche vengono salvate subito; quando hai finito fai clic su **Fine** o premi Esc.

- Trascina una scheda per spostarla e il suo angolo in basso a destra per ridimensionarla; anche il menu **⋯** della scheda permette di scegliere una dimensione. Nella scheda **Nuovo** trascina le app per riordinarle, oppure fai clic su × per toglierne una dalla home.
- **Aggiungi scheda** aggiunge una nota rapida, i preferiti, una vista cartella, un orologio o un collegamento, e riporta le schede che hai tolto. La home può contenere fino a 24 schede.
- **Disposizione predefinita** riporta allo stato iniziale l'ordine e le dimensioni delle schede predefinite e le app mostrate nella home. Le schede che hai aggiunto restano.
- **Disponi come elenco** mostra schede e app in un elenco, dove puoi riordinarle con ↑↓, aggiungerle o toglierle e sceglierne la dimensione senza mouse.

## Nuovo e All apps

La scheda **Nuovo** contiene le app che hai fissato nella home. Facendo clic su un'app si crea un file di quel tipo e si apre il suo editor: inizia subito a scrivere o lascia che l'IA prepari una bozza (ogni editor ha un **pulsante AI** nella barra multifunzione e **Chiedi all'IA** nel menu contestuale della selezione). L'ultima casella, **All apps**, elenca tutte le app per gruppo: cerca per nome o per ciò che fa, apri una delle tre **Recently used apps** o usa il pulsante di fissaggio di un'app per fissarla nella home o toglierla. Le app arrivate con una nuova versione hanno il contrassegno **New**.

Il nuovo file viene creato nella cartella attualmente selezionata nella barra laterale; se non è selezionata alcuna, va nella cartella predefinita.

Che cosa fa ogni app:

- **AI Docs** (.docx): un documento di testo vuoto nell'editor Docs. Il file viene scritto su disco solo al **primo salvataggio**; i nuovi documenti si aprono con il pannello IA espanso (puoi disattivarlo in Impostazioni → «Apri il pannello IA nei nuovi documenti»).
- **AI Sheets** (.xlsx): un foglio di calcolo vuoto nell'editor Sheets. Finché non salvi, su disco non esiste alcun file — il nome è prenotato per il primo salvataggio; dopo la prima generazione con l'IA il file può anche essere rinominato automaticamente in base al suo contenuto.
- **AI Slides** (.pptx): una presentazione vuota nell'editor Slides.
- **AI Markdown** (.md): un documento Markdown vuoto nell'editor Markdown.
- **AI HTML** (.html): una pagina web vuota nell'editor HTML.
- **AI PDF** (.pdf): diverso dagli altri — crea **immediatamente** un vero PDF vuoto di una sola pagina nella cartella di destinazione e lo apre come file normale (l'editor PDF lavora su file reali). Utile per annotare, oscurare o aggiungere testo; al primo salvataggio il file può essere rinominato automaticamente in base al suo contenuto.
- **Apri file locale**: un selettore di file di sistema per Word (.docx/.doc/.odt), Excel (.xlsx/.xlsm/.xls/.csv/.tsv), PowerPoint (.pptx/.ppt), PDF, Markdown (.md/.markdown) e pagine web (.html/.htm). È possibile selezionare più file; ogni file ottiene la propria scheda. Anche i file di testo (.txt, .json) si aprono da qui — atterrano nella vista sorgente dell'editor Markdown.

> Suggerimento: File ▸ Nuovo nella barra dei menu crea gli stessi tipi di documento (⌘N/Ctrl+N crea per impostazione predefinita un documento di testo); trascinando un file nella finestra lo si apre.

## Chiedi alla tua base di conoscenza

- Preferisci prima dei file (qualsiasi tipo che l'app legga); l'intestazione del pannello conta il corpus, e una base vuota ti invita a preferire qualcosa.
- Le risposte citano i file di provenienza; clicca una citazione per aprire il file nel suo editor.
- Richiede un'IA collegata; vedi [Connessione con abbonamento](help://subscription). La conversazione vive solo in memoria — chiudere l'app la termina.
- La ricerca gira sull'indice locale dei file, come quella della Home; i file spariti escono dal corpus in silenzio.
- I gruppi ordinano solo l'elenco Preferiti — la base di conoscenza abbraccia sempre tutti i file preferiti.
