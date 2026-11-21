# Výkres AI

Výkres AI je karta pro jednoduché 3D modely a výkresy. Otevřete v ní výkres, který vám někdo poslal, a zkontrolujete jeho rozměry, postavíte malý model ručně nebo s pomocí AI a vložíte rozměrový výkres do dokumentu Hangul nebo Word. Výkresy se ukládají jako soubory .ttukcad a všechny délky jsou v milimetrech.

## Otevření výkresu

- Nový výkres začnete tak, že na úvodní stránce otevřete **All apps** a stisknete **Výkres AI**. Karta se otevře jako **Výkres bez názvu**.
- Soubor otevřete přes **Soubor › Otevřít…** (Ctrl+O) nebo ho přetáhněte do okna. Výkres AI otevírá soubory .ttukcad, DXF, DWG, STL, OBJ, 3MF, GLB a PLY. DWG otevře od formátu AutoCAD R14 po formát 2018.
- Soubor, který není .ttukcad, se otevře jako nový výkres bez názvu pojmenovaný podle souboru. Původní soubor se nikdy nezmění: při ukládání se vždy vytváří nový soubor .ttukcad.
- Soubory STEP, IGES a BREP jsou 3D soubory z profesionálních programů CAD a nelze je načíst. Výkres AI místo toho ukáže **Jak otevřít tento soubor**: požádejte odesílatele o STL (3D model).
- Soubor větší než 100 MB nebo model s více než 2 miliony trojúhelníků se neotevře.

## Vkládání tvarů

- Skupina **Domů › Vložit tvary** obsahuje čtyři nejpoužívanější tvary; **Další** otevře galerii všech 15: kvádr, válec, koule, kužel, jehlan, klín, polokoule, trubka, anuloid, trojboký hranol, šestiboký hranol, zaoblený kvádr, hvězdicový hranol, střecha a text.
- Nový tvar se objeví uprostřed pracovní desky, tedy podložky, na které model stojí. Klepnutím na tvar ho vyberete; klepnutí se Shift nebo s Ctrl přidá do výběru další tvary.
- **Zobrazení › Úchyty** určuje, co dělají úchyty na vybraném tvaru: **Posunout**, **Otočit** nebo **Velikost**. Při tažení se tvar přichytává po 1 mm a 15°; přichytávání vypnete tak, že při tažení držíte Alt.
- Panel **Vlastnosti** vpravo ukazuje vybraný tvar: název, druh (těleso nebo otvor), velikost, polohu (mm), otočení (°) a barvu. Hodnotu změníte zapsáním čísla. **Skrýt** a **Zamknout** tvar odklidí, aby nepřekážel.
- **Zobrazení › Pohledy** natočí kameru **Shora**, **Zepředu** nebo **Zboku** a **Zobrazit vše** vejde do okna celý model. Tažením v okně pohled otáčíte, kolečkem myši přibližujete a oddalujete.
- Stavový řádek dole ukazuje velikost pracovní desky, přichytávání a mřížku a také šířku × hloubku × výšku vybraného tvaru.

## Otvory, skupiny a zarovnání

- Otvor je tvar, který vyřezává. Vyberte tvar a stiskněte **Otvor** (nebo H), aby se z něj stal otvor; dalším stisknutím z něj bude zase těleso.
- Otvor vyřezává jen uvnitř skupiny. Vyberte otvor a tělesa, která má proříznout, a stiskněte **Seskupit** (Ctrl+G): skupina jsou tělesa bez otvorů. **Oddělit** (Ctrl+Shift+G) ji zase rozloží.
- **Zarovnat** srovná vybrané tvary podle tvaru, který jste vybrali jako první: vlevo, na střed nebo vpravo; dopředu, na střed nebo dozadu; dolů, na střed nebo nahoru.
- Například válec o průměru 80 mm a otvor ve tvaru válce o průměru 68 mm zvednutý o 5 mm, oba vybrané a seskupené, dají hrnek s dnem silným 5 mm.

## Vlastní obrys a text

- **Kreslit od ruky** nakreslí váš vlastní obrys. Klepáním na pracovní desku položte aspoň 3 body; **Vrátit bod** vezme zpět ten poslední.
- Zadejte **Výška (mm)** a stiskněte **Uzavřít tvar**: obrys se zvedne a stane se tělesem. **Zrušit** odejde, aniž by cokoli vytvořil.
- Čáry, které se navzájem kříží, nejsou přijaty. Vracejte body, dokud se čáry nepřestanou křížit.
- **Text** se zeptá na slova, která chcete umístit, a promění je v plná písmena písmem, které je součástí GenOffice.

## Úprava čar a textu výkresu, který jste dostali

- Otevřete DXF nebo DWG a stiskněte **Upravit čáry**. Klepnutím na čáru, kružnici, oblouk nebo text výkresu ho vyberete (zbarví se barvou zvýraznění); klepnutím se Shift vyberete další.
- Na liště dole **Smazat** (nebo klávesa Delete) odstraní výběr, **Posunout** ho posune o X a Y zadané v mm a když je vybraný jeden text, napíšete nová slova a stisknete **Změnit text**. Esc zruší výběr; dalším stisknutím úpravu čar ukončíte.
- Každou změnu vrátíte jedním **Zpět** (Ctrl+Z). Zamčený výkres se nezmění.
- Můžete také požádat asistenta AI, například: „Smaž všechno ve vrstvě kót“, „Změň text ‚Zasedačka‘ na ‚Velká zasedačka‘“, „Posuň vrstvu dveří o 500 mm doprava“.
- Výsledek se uloží jako .ttukcad. Původní soubor DXF nebo DWG se nikdy nezmění. Chcete-li ho poslat zpět, vytvořte nový soubor přes **Exportovat DXF** nebo **Exportovat DWG**.

## Měření a rozměrový výkres

- **Měřit** ukáže vzdálenost mezi dvěma body, na které klepnete, délku čáry nebo průměr kružnice. Body se přichytávají k rohům, koncům čar a středům kružnic. Esc údaj smaže.
- **Rozměrový výkres** nakreslí model zepředu, shora a zboku na list A4 s celkovou šířkou, hloubkou a výškou, vhodným měřítkem (1:1, 1:2, 1:5, 1:10 …) a popisovým polem s názvem, datem a měřítkem. Výkres ze souboru DXF ukazuje jen pohled shora.
- Na výkresu tlačítko **Kopírovat obrázek** vloží výkres do schránky. Vložte ho do karty Hangul, Word nebo PowerPoint.
- **Odeslat do Hangul** otevře nový dokument Hangul s výkresem a tabulkou tvarů a jejich rozměrů. Když je v Nastavení vypnutá volba **Funkce korejských dokumentů**, tlačítko se jmenuje **Odeslat do Wordu** a vytvoří dokument Word.

## Asistent AI

- Panel AI vedle výkresu vkládá tvary, mění velikosti a polohy, dělá otvory, seskupuje, zarovnává, nastavuje velikost pracovní desky a shrnuje model. Několik požadavků na vyzkoušení:
  - „Udělej stojánek na tužky široký 80 mm a vysoký 100 mm, uvnitř dutý, s otvorem o průměru 68 mm“
  - „Udělej z pracovní desky místnost 5 × 4 m a postav do ní čtyři stoly“
  - „Zarovnej vybrané tvary vlevo“
- Všechno, co změnil jeden požadavek, vrátíte jedním **Zpět** (Ctrl+Z), bez ohledu na to, kolika tvarů se týkal.
- AI dostane váš požadavek a shrnutí modelu (název, druh, velikost a polohu každého tvaru). Nemůže ukládat, otevírat, exportovat ani odesílat; to zůstává na vás.
- Chcete-li AI dát specifikaci nebo náčrt, přiložte je tlačítkem se sponkou pod polem pro zadání, přetáhněte je na panel nebo vložte obrázek (Ctrl+V). AI je přečte a postaví podle nich; soubor se nikdy nedostane do výkresu a požadavek se stále vrací jedním krokem zpět.

## Ukládání a obnovení

- **Uložit** (Ctrl+S) zapíše soubor .ttukcad. Výkres AI ukládá jen v tomto formátu; **Uložit jako…** (Ctrl+Shift+S) zvolí nový název nebo umístění.
- **Automatické ukládání** nahoře ukládá každých 30 sekund a vždy, když okno přestane být aktivní, jakmile má výkres vlastní soubor.
- Když se GenOffice nečekaně zavře, při dalším spuštění se výkres objeví v seznamu **Dokumenty s neuloženým obsahem**. Stiskněte **Obnovit** a máte ho zpět.

## Export

- **Soubor › Exportovat STL** a **Exportovat OBJ** uloží model pro 3D tiskárnu nebo jiný program. **Exportovat obrázek (PNG)** uloží to, co je vidět v okně, na světlém pozadí.
- **Exportovat DXF** a **Exportovat DWG** uloží výkres jako nový soubor ve formátu AutoCAD 2018 (mm): čáry, kružnice, oblouky, texty, hladiny a barvy beze změny a tělesa jako jejich obrys při pohledu shora, v hladině AI-DRAWING.
- Export nikdy nepřepíše soubor, ze kterého výkres pochází.

## Klávesové zkratky

| Klávesy                  | Co dělá                         |
| ------------------------ | ------------------------------- |
| Ctrl+Z                   | Zpět                            |
| Ctrl+Y nebo Ctrl+Shift+Z | Znovu                           |
| Ctrl+S                   | Uložit                          |
| Ctrl+A                   | Vybrat vše                      |
| Delete                   | Odstranit                       |
| Ctrl+D                   | Duplikovat                      |
| Ctrl+G                   | Seskupit                        |
| Ctrl+Shift+G             | Oddělit                         |
| H                        | Otvor ↔ těleso                  |
| Šipky                    | Posun o 1 mm (se Shift o 10 mm) |
| Alt při tažení           | Vypnout přichytávání            |

**Nápověda › Klávesové zkratky** ukáže stejný seznam přímo v kartě.

## Co neumí

- Přímo otevírat soubory STEP, IGES ani BREP. Požádejte místo nich o STL.
- Přepsat soubor DXF nebo DWG, který jste dostali: ztratilo by se to, co GenOffice nečte (šrafy, atributy bloků, rozvržení). Místo toho exportujte nový soubor DXF nebo DWG.
- Vazby, historii návrhu ani sestavy jako profesionální programy CAD. Každý tvar se nastavuje vlastními čísly.
- Tisknout. Pošlete rozměrový výkres do dokumentu Hangul nebo Word a tiskněte odtud.
