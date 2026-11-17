# Disegno IA

Disegno IA è una scheda per modelli 3D e disegni semplici. Apri un disegno che ti hanno mandato e controlla le misure, costruisci un piccolo modello a mano o chiedendolo all'IA, e inserisci una tavola quotata in un documento Hangul o Word. I disegni vengono salvati come file .ttukcad, e tutte le lunghezze sono in millimetri.

## Aprire un disegno

- Per un nuovo disegno vai nella home, apri **All apps** e premi **Disegno IA**. La scheda si apre come **Disegno senza titolo**.
- Per aprire un file usa **File › Apri…** (Ctrl+O) oppure trascina il file sulla finestra. Disegno IA apre file .ttukcad, DXF, STL, OBJ, 3MF, GLB e PLY.
- Un file che non è .ttukcad si apre come nuovo disegno senza titolo con il nome del file. Il file originale non viene mai modificato: quando salvi viene sempre chiesto un nuovo file .ttukcad.
- I file DWG, STEP, IGES e BREP vengono da programmi CAD professionali e non si possono leggere. Al loro posto Disegno IA mostra **Come aprire questo file**: chiedi a chi te l'ha mandato un DXF (per un disegno 2D) o un STL (per un modello 3D).
- Un file oltre 100 MB, o un modello con più di 2 milioni di triangoli, non si apre.

## Inserire le forme

- **Home › Inserisci forme** contiene le quattro forme più usate; **Altro** apre la raccolta di tutte e 15: parallelepipedo, cilindro, sfera, cono, piramide, cuneo, semisfera, tubo, toro, prisma triangolare, prisma esagonale, parallelepipedo arrotondato, prisma a stella, tetto e testo.
- Una nuova forma compare al centro del piano di lavoro, la base su cui poggia il modello. Fai clic su una forma per selezionarla; Shift+clic o Ctrl+clic aggiunge altre forme alla selezione.
- **Visualizza › Maniglie** sceglie cosa fanno le maniglie della forma selezionata: **Sposta**, **Ruota** o **Dimensione**. Mentre trascini, la forma si muove a scatti di 1 mm e 15°; tieni premuto Alt durante il trascinamento per disattivare l'aggancio.
- Il pannello **Proprietà** a destra mostra la forma selezionata: nome, tipo (pieno o foro), dimensioni, posizione (mm), rotazione (°) e colore. Scrivi un numero per cambiarlo. **Nascondi** e **Blocca** tolgono di mezzo una forma.
- **Visualizza › Viste** gira la telecamera su **Alto**, **Fronte** o **Lato**, e **Mostra tutto** inquadra l'intero modello. Trascina nella vista per ruotarla e usa la rotellina del mouse per lo zoom.
- La barra di stato in basso mostra la dimensione del piano di lavoro, l'aggancio e la griglia, e larghezza × profondità × altezza della forma selezionata.

## Fori, gruppi e allineamento

- Un foro è una forma che taglia. Seleziona una forma e premi **Foro** (o H) per trasformarla in foro; premi di nuovo per renderla piena.
- Un foro taglia solo dentro un gruppo. Seleziona il foro e le forme piene che deve tagliare, poi premi **Raggruppa** (Ctrl+G): il gruppo è il risultato delle forme piene meno i fori. **Separa** (Ctrl+Shift+G) lo scompone.
- **Allinea** mette in fila le forme selezionate rispetto alla prima forma che hai selezionato: sinistra, centro o destra; davanti, centro o dietro; in basso, centro o in alto.
- Per esempio, un cilindro di 80 mm di diametro e un cilindro foro di 68 mm di diametro sollevato di 5 mm, selezionati insieme e raggruppati, formano un bicchiere con il fondo di 5 mm.

## Disegno libero e testo

- **Disegno libero** traccia un contorno a tua scelta. Fai clic sul piano di lavoro per mettere almeno 3 punti; **Annulla punto** toglie l'ultimo.
- Inserisci l'**Altezza (mm)** e premi **Chiudi forma**: il contorno si alza e diventa una forma piena. **Annulla** esce senza creare niente.
- Le linee che si incrociano non sono accettate. Annulla punti finché non si incrociano più.
- **Testo** chiede le parole da inserire e le trasforma in lettere piene, con il carattere fornito insieme a GenOffice.

## Misurare e la tavola quotata

- **Misura** mostra la distanza tra due punti su cui fai clic, la lunghezza di una linea o il diametro di un cerchio. I punti si agganciano ad angoli, estremità delle linee e centri dei cerchi. Esc cancella la misura.
- **Tavola quotata** disegna il modello di fronte, dall'alto e di lato su un foglio A4, con larghezza, profondità e altezza totali, una scala adatta (1:1, 1:2, 1:5, 1:10 …) e un cartiglio con nome, data e scala. Un disegno arrivato da un file DXF mostra solo la vista dall'alto.
- Nella tavola, **Copia immagine** la mette negli appunti. Incollala in una scheda Hangul, Word o PowerPoint.
- **Invia a Hangul** apre un nuovo documento Hangul con la tavola e una tabella delle forme con le loro dimensioni. Se **Funzioni per documenti coreani** è disattivato nelle impostazioni, il pulsante diventa **Invia a Word** e crea invece un documento Word.

## L'assistente IA

- Il pannello IA accanto al disegno inserisce forme, cambia dimensioni e posizioni, crea fori, raggruppa, allinea, imposta la dimensione del piano di lavoro e riassume il modello. Alcune richieste da provare:
  - «Fai un portamatite largo 80 mm e alto 100 mm, vuoto dentro con un diametro di 68 mm»
  - «Trasforma il piano di lavoro in una stanza di 5 × 4 m e metti quattro scrivanie»
  - «Allinea a sinistra le forme selezionate»
- Tutto quello che una richiesta ha cambiato torna indietro con un solo **Annulla** (Ctrl+Z), anche se ha toccato molte forme.
- L'IA riceve la tua richiesta e un riepilogo del modello (nome, tipo, dimensioni e posizione di ogni forma). Non può salvare, aprire, esportare o inviare: queste cose restano a te.

## Salvare e recuperare

- **Salva** (Ctrl+S) scrive un file .ttukcad. Disegno IA salva solo in questo formato; **Salva con nome…** (Ctrl+Shift+S) sceglie un nuovo nome o una nuova posizione.
- **Salvataggio automatico**, in alto, salva ogni 30 secondi e ogni volta che la finestra perde il focus, appena il disegno ha un suo file.
- Se GenOffice si chiude all'improvviso, all'avvio successivo il disegno compare in **Documenti con contenuto non salvato**. Premi **Ripristina** per recuperarlo.

## Esportare

- **File › Esporta STL** ed **Esporta OBJ** scrivono il modello per una stampante 3D o un altro programma. **Esporta immagine (PNG)** salva quello che mostra la vista, su sfondo chiaro.
- Un'esportazione non sostituisce mai il file da cui viene il disegno.

## Scorciatoie da tastiera

| Tasti                 | Cosa fa                           |
| --------------------- | --------------------------------- |
| Ctrl+Z                | Annulla                           |
| Ctrl+Y o Ctrl+Shift+Z | Ripeti                            |
| Ctrl+S                | Salva                             |
| Ctrl+A                | Seleziona tutto                   |
| Delete                | Elimina                           |
| Ctrl+D                | Duplica                           |
| Ctrl+G                | Raggruppa                         |
| Ctrl+Shift+G          | Separa                            |
| H                     | Foro ↔ pieno                      |
| Tasti freccia         | Sposta di 1 mm (con Maiusc 10 mm) |
| Alt mentre trascini   | Disattiva l'aggancio              |

**Guida › Scorciatoie** mostra lo stesso elenco dentro la scheda.

## Cosa non sa fare

- Aprire direttamente file DWG, STEP, IGES o BREP. Chiedi invece un DXF o un STL.
- Vincoli, cronologia di progetto o assiemi come nei programmi CAD professionali. Ogni forma è definita dai suoi numeri.
- Stampare. Invia la tavola quotata a un documento Hangul o Word e stampa da lì.
