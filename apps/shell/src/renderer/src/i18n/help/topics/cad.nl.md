# AI-tekening

AI-tekening is een tabblad voor eenvoudige 3D-modellen en tekeningen. Open een tekening die iemand u stuurde en controleer de maten, bouw zelf of met hulp van AI een klein model, en zet een maatblad in een Hangul- of Word-document. Tekeningen worden opgeslagen als .ttukcad-bestanden en alle lengtes zijn in millimeters.

## Een tekening openen

- Voor een nieuwe tekening opent u op de startpagina **All apps** en drukt u op **AI-tekening**. Het tabblad begint als **Naamloze tekening**.
- Om een bestand te openen gebruikt u **Bestand › Openen…** (Ctrl+O) of sleept u het bestand naar het venster. AI-tekening opent .ttukcad-, DXF-, DWG-, STL-, OBJ-, 3MF-, GLB- en PLY-bestanden. DWG opent van het AutoCAD R14-formaat tot en met het 2018-formaat.
- Een bestand dat geen .ttukcad is, opent als nieuwe naamloze tekening met de naam van dat bestand. Het originele bestand verandert nooit: bij opslaan wordt altijd om een nieuw .ttukcad-bestand gevraagd.
- STEP-, IGES- en BREP-bestanden zijn 3D-bestanden uit professionele CAD-programma's en kunnen niet worden gelezen. AI-tekening toont dan **Zo opent u dit bestand**: vraag de afzender om een STL (een 3D-model).
- Een bestand groter dan 100 MB, of een model met meer dan 2 miljoen driehoeken, gaat niet open.

## Vormen plaatsen

- **Start › Vormen plaatsen** bevat de vier meest gebruikte vormen; **Meer** opent de galerij met alle 15: blok, cilinder, bol, kegel, piramide, wig, halve bol, buis, torus, driehoekig prisma, zeshoekig prisma, afgerond blok, sterprisma, dak en tekst.
- Een nieuwe vorm verschijnt in het midden van het werkvlak, de grondplaat waarop het model staat. Klik op een vorm om hem te selecteren; met Shift-klik of Ctrl-klik voegt u meer vormen aan de selectie toe.
- **Beeld › Grepen** bepaalt wat de grepen op de geselecteerde vorm doen: **Verplaatsen**, **Draaien** of **Grootte**. Slepen springt per 1 mm en 15°; houd Alt ingedrukt tijdens het slepen om dat uit te zetten.
- Het paneel **Eigenschappen** rechts toont de geselecteerde vorm: naam, soort (massief of gat), grootte, positie (mm), draaiing (°) en kleur. Typ een getal om iets te wijzigen. **Verbergen** en **Vergrendelen** zetten een vorm uit de weg.
- **Beeld › Aanzichten** draait de camera naar **Boven**, **Voor** of **Zij**, en **Alles tonen** past het hele model in beeld. Sleep in het beeld om het te draaien en gebruik het muiswiel om in en uit te zoomen.
- De statusregel onderaan toont de grootte van het werkvlak, de snapstap en het raster, en de breedte × diepte × hoogte van de geselecteerde vorm.

## Gaten, groepen en uitlijnen

- Een gat is een vorm die wegsnijdt. Selecteer een vorm en druk op **Gat** (of H) om er een gat van te maken; druk nog eens om hem weer massief te maken.
- Een gat snijdt alleen binnen een groep. Selecteer het gat en de massieve vormen waar het doorheen moet, en druk op **Groeperen** (Ctrl+G): de groep is de massieve vormen min de gaten. **Groep opheffen** (Ctrl+Shift+G) haalt hem weer uit elkaar.
- **Uitlijnen** zet de geselecteerde vormen op één lijn met de vorm die u als eerste selecteerde: links, midden of rechts; voor, midden of achter; onder, midden of boven.
- Een cilinder van 80 mm doorsnede en een gatcilinder van 68 mm doorsnede die 5 mm omhoog staat, samen geselecteerd en gegroepeerd, geven bijvoorbeeld een beker met een bodem van 5 mm.

## Zelf tekenen en tekst

- **Zelf tekenen** tekent een eigen omtrek. Klik op het werkvlak om minstens 3 punten te zetten; **Punt ongedaan maken** haalt het laatste weg.
- Vul **Hoogte (mm)** in en druk op **Vorm sluiten**: de omtrek komt overeind als massieve vorm. **Annuleren** stopt zonder iets te maken.
- Lijnen die elkaar kruisen worden geweigerd. Maak punten ongedaan tot ze elkaar niet meer kruisen.
- **Tekst** vraagt welke woorden u wilt plaatsen en maakt er massieve letters van, in het lettertype dat bij GenOffice hoort.

## De lijnen en tekst van een ontvangen tekening bewerken

- Open een DXF of DWG en druk op **Lijnen bewerken**. Klik op een lijn, cirkel, boog of tekst van de tekening om die te kiezen (hij krijgt de markeerkleur); met Shift-klik kiest u er meer.
- In de balk eronder verwijdert **Verwijderen** (of de Delete-toets) de keuze, verschuift **Verplaatsen** die met de X en Y die u in mm invult, en met één tekst gekozen typt u de nieuwe woorden en drukt u op **Tekst wijzigen**. Esc wist de keuze; nog een keer drukken beëindigt Lijnen bewerken.
- Elke wijziging draait u terug met één keer **Ongedaan maken** (Ctrl+Z). Een vergrendelde tekening wordt niet gewijzigd.
- U kunt het ook aan de AI-assistent vragen, bijvoorbeeld: "Verwijder alles op de maatvoeringslaag", "Verander de tekst 'Vergaderzaal' in 'Grote vergaderzaal'", "Verplaats de deurenlaag 500 mm naar rechts".
- Het resultaat wordt opgeslagen als .ttukcad. Het oorspronkelijke DXF- of DWG-bestand wordt nooit gewijzigd. Om haar terug te sturen, maakt u een nieuw bestand met **Exporteren als DXF** of **Exporteren als DWG**.

## Meten en het maatblad

- **Meten** toont de afstand tussen twee punten waarop u klikt, de lengte van een lijn of de doorsnede van een cirkel. Punten springen naar hoeken, lijneinden en cirkelmiddelpunten. Esc wist de meting.
- **Maatblad** tekent het model van voren, van boven en van opzij op een A4-blad, met de totale breedte, diepte en hoogte, een passende schaal (1:1, 1:2, 1:5, 1:10 …) en een titelblok met naam, datum en schaal. Een tekening uit een DXF-bestand toont alleen het bovenaanzicht.
- In het blad zet **Afbeelding kopiëren** het op het klembord. Plak het in een Hangul-, Word- of PowerPoint-tabblad.
- **Naar Hangul sturen** opent een nieuw Hangul-document met het blad en een tabel van de vormen en hun maten. Als **Koreaanse documentfuncties** in Instellingen uit staat, heet de knop **Naar Word sturen** en maakt hij een Word-document.

## De AI-assistent

- Het AI-paneel naast de tekening plaatst vormen, wijzigt maten en posities, maakt gaten, groepeert, lijnt uit, stelt de grootte van het werkvlak in en vat het model samen. Enkele verzoeken om te proberen:
  - "Maak een pennenbak van 80 mm breed en 100 mm hoog, binnenin hol met een doorsnede van 68 mm"
  - "Maak van het werkvlak een kamer van 5 × 4 m en zet er vier bureaus in"
  - "Lijn de geselecteerde vormen links uit"
- Alles wat één verzoek veranderde, draait u terug met één keer **Ongedaan maken** (Ctrl+Z), hoeveel vormen het ook raakte.
- De AI krijgt uw verzoek en een samenvatting van het model (naam, soort, grootte en positie van elke vorm). Hij kan niet opslaan, openen, exporteren of versturen; dat blijft bij u.
- Wilt u de AI een specificatieblad of schets geven, voeg die dan toe met de paperclipknop onder het invoerveld, sleep hem naar het paneel of plak een afbeelding (Ctrl+V). De AI leest hem en bouwt ernaar; het bestand komt nooit in de tekening en het verzoek blijft één keer ongedaan maken.

## Opslaan en herstellen

- **Opslaan** (Ctrl+S) schrijft een .ttukcad-bestand. AI-tekening slaat alleen in dit formaat op; **Opslaan als…** (Ctrl+Shift+S) kiest een nieuwe naam of plaats.
- **Automatisch opslaan** bovenaan slaat elke 30 seconden op en zodra het venster de focus verliest, maar pas als de tekening een eigen bestand heeft.
- Als GenOffice onverwacht sluit, staat de tekening bij de volgende start in **Documenten met niet-opgeslagen inhoud**. Druk op **Herstellen** om hem terug te krijgen.

## Exporteren

- **Bestand › Exporteren als STL** en **Exporteren als OBJ** schrijven het model weg voor een 3D-printer of een ander programma. **Exporteren als afbeelding (PNG)** bewaart wat het beeld toont, op een lichte achtergrond.
- **Exporteren als DXF** en **Exporteren als DWG** schrijven de tekening weg als nieuw bestand in het AutoCAD 2018-formaat (mm): lijnen, cirkels, bogen, tekst, lagen en kleuren zoals ze zijn, en volumes als hun omtrek van bovenaf gezien, op de laag AI-DRAWING.
- Een export vervangt nooit het bestand waar de tekening vandaan kwam.

## Sneltoetsen

| Toetsen                | Wat het doet                       |
| ---------------------- | ---------------------------------- |
| Ctrl+Z                 | Ongedaan maken                     |
| Ctrl+Y of Ctrl+Shift+Z | Opnieuw                            |
| Ctrl+S                 | Opslaan                            |
| Ctrl+A                 | Alles selecteren                   |
| Delete                 | Verwijderen                        |
| Ctrl+D                 | Dupliceren                         |
| Ctrl+G                 | Groeperen                          |
| Ctrl+Shift+G           | Groep opheffen                     |
| H                      | Gat ↔ massief                      |
| Pijltoetsen            | 1 mm verplaatsen (met Shift 10 mm) |
| Alt tijdens slepen     | Springen op raster uitzetten       |

**Help › Sneltoetsen** toont dezelfde lijst in het tabblad.

## Wat het niet kan

- STEP-, IGES- of BREP-bestanden rechtstreeks openen. Vraag in plaats daarvan om STL.
- Het ontvangen DXF- of DWG-bestand overschrijven: wat GenOffice niet leest (arceringen, blokattributen, lay-outs) zou verloren gaan. Exporteer in plaats daarvan een nieuw DXF- of DWG-bestand.
- Beperkingen, ontwerpgeschiedenis of samenstellingen zoals in professionele CAD-programma's. Elke vorm wordt bepaald door zijn eigen getallen.
- Afdrukken. Stuur het maatblad naar een Hangul- of Word-document en druk het daar af.
