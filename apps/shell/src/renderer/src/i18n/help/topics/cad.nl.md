# AI-tekening

AI-tekening is een tabblad voor eenvoudige 3D-modellen en tekeningen. Open een tekening die iemand u stuurde en controleer de maten, bouw zelf of met hulp van AI een klein model, en zet een maatblad in een Hangul- of Word-document. Tekeningen worden opgeslagen als .ttukcad-bestanden en alle lengtes zijn in millimeters.

## Een tekening openen

- Voor een nieuwe tekening opent u op de startpagina **All apps** en drukt u op **AI-tekening**. Het tabblad begint als **Naamloze tekening**.
- Om een bestand te openen gebruikt u **Bestand › Openen…** (Ctrl+O) of sleept u het bestand naar het venster. AI-tekening opent .ttukcad-, DXF-, STL-, OBJ-, 3MF-, GLB- en PLY-bestanden.
- Een bestand dat geen .ttukcad is, opent als nieuwe naamloze tekening met de naam van dat bestand. Het originele bestand verandert nooit: bij opslaan wordt altijd om een nieuw .ttukcad-bestand gevraagd.
- DWG-, STEP-, IGES- en BREP-bestanden komen uit professionele CAD-programma's en kunnen niet worden gelezen. AI-tekening toont dan **Zo opent u dit bestand**: vraag de afzender om een DXF (voor een 2D-tekening) of een STL (voor een 3D-model).
- Een bestand groter dan 100 MB, of een model met meer dan 2 miljoen driehoeken, gaat niet open.

## Vormen plaatsen

- **Start › Vormen plaatsen** bevat de vier meest gebruikte vormen; **Meer** opent de galerij met alle 15: blok, cilinder, bol, kegel, piramide, wig, halve bol, buis, torus, driehoekig prisma, zeshoekig prisma, afgerond blok, sterprisma, dak en tekst.
- Een nieuwe vorm verschijnt in het midden van het werkvlak, de grondplaat waarop het model staat. Klik op een onderdeel om het te selecteren; met Shift-klik of Ctrl-klik voegt u meer onderdelen aan de selectie toe.
- **Beeld › Grepen** bepaalt wat de grepen op het geselecteerde onderdeel doen: **Verplaatsen**, **Draaien** of **Grootte**. Slepen springt per 1 mm en 15°; houd Alt ingedrukt tijdens het slepen om dat uit te zetten.
- Het paneel **Eigenschappen** rechts toont het geselecteerde onderdeel: naam, soort (massief of gat), grootte, positie (mm), draaiing (°) en kleur. Typ een getal om iets te wijzigen. **Verbergen** en **Vergrendelen** zetten een onderdeel uit de weg.
- **Beeld › Aanzichten** draait de camera naar **Boven**, **Voor** of **Zij**, en **Alles tonen** past het hele model in beeld. Sleep in het beeld om het te draaien en gebruik het muiswiel om in en uit te zoomen.
- De statusregel onderaan toont de grootte van het werkvlak, de uitlijnstap en het raster, en de breedte × diepte × hoogte van het geselecteerde onderdeel.

## Gaten, groepen en uitlijnen

- Een gat is een vorm die wegsnijdt. Selecteer een vorm en druk op **Gat** (of H) om er een gat van te maken; druk nog eens om hem weer massief te maken.
- Een gat snijdt alleen binnen een groep. Selecteer het gat en de massieve vormen waar het doorheen moet, en druk op **Groeperen** (Ctrl+G): de groep is de massieve vormen min de gaten. **Groep opheffen** (Ctrl+Shift+G) haalt hem weer uit elkaar.
- **Uitlijnen** zet de geselecteerde onderdelen op één lijn met het onderdeel dat u als eerste selecteerde: links, midden of rechts; voor, midden of achter; onder, midden of boven.
- Een cilinder van 80 mm doorsnede en een gatcilinder van 68 mm doorsnede die 5 mm omhoog staat, samen geselecteerd en gegroepeerd, geven bijvoorbeeld een beker met een bodem van 5 mm.

## Zelf tekenen en tekst

- **Zelf tekenen** tekent een eigen omtrek. Klik op het werkvlak om minstens 3 punten te zetten; **Punt ongedaan maken** haalt het laatste weg.
- Vul **Hoogte (mm)** in en druk op **Vorm sluiten**: de omtrek komt overeind als massieve vorm. **Annuleren** stopt zonder iets te maken.
- Lijnen die elkaar kruisen worden geweigerd. Maak punten ongedaan tot ze elkaar niet meer kruisen.
- **Tekst** vraagt welke woorden u wilt plaatsen en maakt er massieve letters van, in het lettertype dat bij GenOffice hoort.

## Meten en het maatblad

- **Meten** toont de afstand tussen twee punten waarop u klikt, de lengte van een lijn of de doorsnede van een cirkel. Punten springen naar hoeken, lijneinden en cirkelmiddelpunten. Esc wist de meting.
- **Maatblad** tekent het model van voren, van boven en van opzij op een A4-blad, met de totale breedte, diepte en hoogte, een passende schaal (1:1, 1:2, 1:5, 1:10 …) en een titelblok met naam, datum en schaal. Een tekening uit een DXF-bestand toont alleen het bovenaanzicht.
- In het blad zet **Afbeelding kopiëren** het op het klembord. Plak het in een Hangul-, Word- of PowerPoint-tabblad.
- **Naar Hangul sturen** opent een nieuw Hangul-document met het blad en een tabel van de onderdelen en hun maten. Als **Koreaanse documentfuncties** in Instellingen uit staat, heet de knop **Naar Word sturen** en maakt hij een Word-document.

## De AI-assistent

- Het AI-paneel naast de tekening plaatst vormen, wijzigt maten en posities, maakt gaten, groepeert, lijnt uit, stelt de grootte van het werkvlak in en vat het model samen. Enkele verzoeken om te proberen:
  - "Maak een pennenbak van 80 mm breed en 100 mm hoog, binnenin hol met een doorsnede van 68 mm"
  - "Maak van het werkvlak een kamer van 5 × 4 m en zet er vier bureaus in"
  - "Lijn de geselecteerde onderdelen links uit"
- Alles wat één verzoek veranderde, draait u terug met één keer **Ongedaan maken** (Ctrl+Z), hoeveel onderdelen het ook raakte.
- De AI krijgt uw verzoek en een samenvatting van het model (naam, soort, grootte en positie van elk onderdeel). Hij kan niet opslaan, openen, exporteren of versturen; dat blijft bij u.

## Opslaan en herstellen

- **Opslaan** (Ctrl+S) schrijft een .ttukcad-bestand. AI-tekening slaat alleen in dit formaat op; **Opslaan als…** (Ctrl+Shift+S) kiest een nieuwe naam of plaats.
- **Automatisch opslaan** bovenaan slaat elke 30 seconden op en zodra het venster de focus verliest, maar pas als de tekening een eigen bestand heeft.
- Als GenOffice onverwacht sluit, staat de tekening bij de volgende start in **Documenten met niet-opgeslagen inhoud**. Druk op **Herstellen** om hem terug te krijgen.

## Exporteren

- **Bestand › Exporteren als STL** en **Exporteren als OBJ** schrijven het model weg voor een 3D-printer of een ander programma. **Exporteren als afbeelding (PNG)** bewaart wat het beeld toont, op een lichte achtergrond.
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

- DWG-, STEP-, IGES- of BREP-bestanden rechtstreeks openen. Vraag in plaats daarvan om DXF of STL.
- Beperkingen, ontwerpgeschiedenis of samenstellingen zoals in professionele CAD-programma's. Elk onderdeel wordt bepaald door zijn eigen getallen.
- Afdrukken. Stuur het maatblad naar een Hangul- of Word-document en druk het daar af.
