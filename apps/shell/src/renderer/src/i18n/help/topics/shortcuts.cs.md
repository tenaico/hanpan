# Klávesové zkratky

Každý editor má vlastní přiřazení kláves a funguje všude jen několik z nich. Tato strana je úplný seznam, rozdělený podle aplikace, s chordem pro macOS a pro Windows / Linux vedle sebe.

## Přečtěte si nejprve

### Kdekoli v Hanpan (panely a okna)

| Akce                                                                                  | Windows / Linux               | macOS                         |
| ------------------------------------------------------------------------------------- | ----------------------------- | ----------------------------- |
| Další panel / předchozí panel                                                         | Ctrl+Tab / Ctrl+Shift+Tab     | ⌃Tab / ⌃⇧Tab                  |
| Zavřít aktuální panel (na kartě Domů: okno, s dotazem, pokud jsou otevřené dokumenty) | Ctrl+W                        | ⌘W                            |
| Otevřít Nastavení — na kartě Domů                                                     | Ctrl+,                        | ⌘,                            |
| Otevřít uživatelskou příručku                                                         | F1                            | F1                            |
| Vybrat panel v pruhu karet — když má panel fokus                                      | ← / →, Enter, Delete (zavřít) | ← / →, Enter, Delete (zavřít) |

### Každý editor

**Odtud dál patří klávesy editoru, který je před vámi, a mění se při přepnutí panelů.**

| Akce                                                       | Windows / Linux | macOS |
| ---------------------------------------------------------- | --------------- | ----- |
| Otevřít uživatelskou příručku — funguje kdekoli v aplikaci | F1              | F1    |
| Složit / rozbalit pás — každý editor                       | Ctrl+F1         | ⌥⌘R   |
| Kompaktní pás — jen Docs                                   | Ctrl+Alt+K      | ⌥⌘K   |
| Otevřít list Klávesové zkratky — pouze Word                | Ctrl+/          | ⌘/    |

- **F1 otevírá tuto příručku**, ne list zkratek. Patří do menu aplikace, takže funguje z Wordu, Sheets, Slides, PDF i panelu Home.
- **Přepínač pásu je `Ctrl+F1`, nebo `⌥⌘R` na macOS.** Samotné `F1` nic neudělá — F1 je příručka a klávesa pásu ji záměrně nesdílí. `Ctrl+F1` se na macOS také přijímá, ale `⌥⌘R` je klávesa, kterou používá Office pro Mac.
- **List Klávesové zkratky existuje jen ve Wordu** (`⌘/`). Vypisuje přesně tabulku Wordu níže. Jiný editor ho nemá.

![List Klávesové zkratky ve Wordu: akce vlevo, klávesová zkratka vpravo, seskupeno podle Soubor, Úpravy, Formátování textu, Formátování odstavce, Vkládání, Kontrola a nástroje, Zobrazení](img/word-shortcuts.png)

- **`⌘O`, `⌘S` a `⌘P` jsou v každém editoru implementované samostatně** a nechovají se úplně stejně. `⌘P` ve Wordu nejdřív sestaví náhled tisku, aby jeden vytištěný list odpovídal jedné stránce na obrazovce; v PDF otevře tiskové dialogové okno PDF; Sheets a Slides mají zase vlastní.
- **Zbytek je per aplikace.** Když je aktivní panel Wordu, `⌘B` je tučné písmo Wordu. Když je aktivní Slides, `⌘B` je tučné písmo Slides a menu, do kterého patří, není to, na které jste zvyklí. Tam, kde přiřazení funguje jen s výběrem nebo v konkrétním podokně, uvádí to sloupec Akce.

## Režim prezentace

- **Spuštění**: F5 ve Word, PDF, Mindmap, HTML a Markdown. V tabulce Ctrl+F5 (od A1) nebo Shift+F5 (od aktivní buňky). V dokumentech HWP Ctrl+F5 (F5 tam vybírá buňky tabulky).
- **Další vstupy**: ve Word otevřou Ctrl+F5 a Shift+F5 režim čtení bez celé obrazovky; v PDF začnou na aktuální stránce; v HTML prezentují na kartě.
- **Ukončení**: Esc nebo F5. F11 je celá obrazovka okna a nemění zobrazení dokumentu.

## Konvence

- Sloupec macOS používá známé symboly: `⌘` Command, `⌥` Option, `⇧` Shift, `⌃` Control.
- Sloupec Windows / Linux je vypisuje slovy: `Ctrl`, `Alt`, `Shift`.
- Tam, kde GenOffice na dvou platformách skutečně potřebuje různé klávesy, tabulka to ukazuje. Běžné případy jsou `⌃H` pro Najít a nahradit (macOS má `⌘H` pro Skrýt), `⌥⌘G` pro Přejít na a klávesa zavírání v Slides.
- Chord, který funguje jen s výběrem, je zapsaný ve sloupci Akce, ne v samostatném sloupci, aby tabulka měla pořád tři sloupce.

## Word

Word má plnou lištu nabídky, takže níže uvedené zkratky souboru a formátování fungují vždy, když je aktivní panel Wordu, ať je otevřený jakýkoli dokument. Zkratky úprav vyžadují načtený editovatelný dokument s kurzorem v textu; neselhávají, když píšete do vyhledávacího pole, do promptu AI ani do jiného pole.

### Soubor

| Akce           | Windows / Linux | macOS |
| -------------- | --------------- | ----- |
| Nový           | Ctrl+N          | ⌘N    |
| Nové okno      | Ctrl+Shift+N    | ⇧⌘N   |
| Otevřít…       | Ctrl+O          | ⌘O    |
| Uložit         | Ctrl+S          | ⌘S    |
| Uložit jako…   | Ctrl+Shift+S    | ⇧⌘S   |
| Tisk           | Ctrl+P          | ⌘P    |
| Zavřít (panel) | Ctrl+W          | ⌘W    |

⌘P není tisk prohlížeče. Word nejdřív sestaví náhled tisku, takže jeden vytištěný list je přesně jedna stránka na obrazovce, a pak otevře vlastní tiskové dialogové okno.

### Úpravy

| Akce                    | Windows / Linux | macOS |
| ----------------------- | --------------- | ----- |
| Zpět                    | Ctrl+Z          | ⌘Z    |
| Znovu                   | Ctrl+Shift+Z    | ⇧⌘Z   |
| Vyjmout                 | Ctrl+X          | ⌘X    |
| Kopírovat               | Ctrl+C          | ⌘C    |
| Vložit                  | Ctrl+V          | ⌘V    |
| Vložit jako prostý text | Ctrl+Shift+V    | ⌥⇧⌘V  |
| Vybrat vše              | Ctrl+A          | ⌘A    |
| Najít                   | Ctrl+F          | ⌘F    |
| Nahradit                | Ctrl+H          | ⌃H    |
| Přejít na               | Ctrl+G          | ⌥⌘G   |
| Klávesové zkratky       | Ctrl+/          | ⌘/    |

Nahradit je na obou platformách Ctrl+H, protože ⌘H na macOS skrývá okno a nikdy se nedostane do Wordu. Přejít na kopíruje vlastní rozdělení Wordu: ⌥⌘G na Macu, aby ⇧⌘G zůstal volný pro Počet slov.

### Formátování textu

| Akce                                          | Windows / Linux       | macOS    |
| --------------------------------------------- | --------------------- | -------- |
| Tučné                                         | Ctrl+B                | ⌘B       |
| Kurzíva                                       | Ctrl+I                | ⌘I       |
| Podtržení                                     | Ctrl+U                | ⌘U       |
| Písmo… (dialogové okno)                       | Ctrl+D                | ⌘D       |
| Zvětšit velikost písma                        | Ctrl+Shift+.          | ⇧⌘.      |
| Zmenšit velikost písma                        | Ctrl+Shift+,          | ⇧⌘,      |
| Zvětšit velikost písma o 1 pt                 | Ctrl+]                | ⌘]       |
| Zmenšit velikost písma o 1 pt                 | Ctrl+[                | ⌘[       |
| Horní index                                   | Ctrl+Shift+= / Ctrl+. | ⇧⌘= / ⌘. |
| Dolní index                                   | Ctrl+,                | ⌘,       |
| Změnit velikost písmen                        | Shift+F3              | ⇧F3      |
| Kopírovat formátování (s vybraným textem)     | Ctrl+Shift+C          | ⇧⌘C      |
| Vložit formátování (po Kopírovat formátování) | Ctrl+Alt+Shift+V      | ⇧⌘V      |
| Vymazat veškeré formátování                   | Ctrl+Space            | ⌃␣       |

Dvě zkratky malíře formátování jsou jediné místo, kde klávesa Windows není prosté přejmenování: Vložit formátování má Alt, protože Ctrl+Shift+V tam už vkládá a přebírá styl.

### Formátování odstavce

| Akce                                                | Windows / Linux | macOS |
| --------------------------------------------------- | --------------- | ----- |
| Zarovnat doleva                                     | Ctrl+L          | ⌘L    |
| Vycentrovat                                         | Ctrl+E          | ⌘E    |
| Zarovnat doprava                                    | Ctrl+R          | ⌘R    |
| Zarovnat přes šířku                                 | Ctrl+J          | ⌘J    |
| Řádkování 1,0                                       | Ctrl+1          | ⌘1    |
| Řádkování 1,5                                       | Ctrl+5          | ⌘5    |
| Řádkování 2,0                                       | Ctrl+2          | ⌘2    |
| Zvětšit odsazení                                    | Ctrl+M          | ⌃M    |
| Zmenšit odsazení                                    | Ctrl+Shift+M    | ⌃⇧M   |
| Převislé odsazení                                   | Ctrl+T          | ⌘T    |
| Odebrat převislé odsazení                           | Ctrl+Shift+T    | ⇧⌘T   |
| Vymazat formátování odstavce                        | Ctrl+Q          | ⌃Q    |
| Normální (styl)                                     | Ctrl+Alt+0      | ⌥⌘0   |
| Nadpis 1 (styl)                                     | Ctrl+Alt+1      | ⌥⌘1   |
| Nadpis 2 (styl)                                     | Ctrl+Alt+2      | ⌥⌘2   |
| Nadpis 3 (styl)                                     | Ctrl+Alt+3      | ⌥⌘3   |
| Odstavec… (dialogové okno)                          | Ctrl+Alt+M      | ⌥⌘M   |
| Přesunout odstavec nahoru                           | Alt+Shift+↑     | ⌥⇧↑   |
| Přesunout odstavec dolů                             | Alt+Shift+↓     | ⌥⇧↓   |
| Přesunout položku seznamu níže (na začátku položky) | Tab             | Tab   |
| Přesunout položku seznamu výše (na začátku položky) | Shift+Tab       | ⇧Tab  |

Odsazení, převislé odsazení a Vymazat formátování odstavce fungují na obou platformách jen přes Ctrl: ⌘M okno minimalizuje a ⌘Q ukončí aplikaci, takže chord s Command by byl tichou úpravou při ukončování. Tab změní úroveň seznamu jen tehdy, když je kurzor na začátku položky nebo přesahuje několik položek; uvnitř textu vloží tabulátorový znak a ⇧Tab vždy zvedne úroveň.

### Vkládání

| Akce                      | Windows / Linux  | macOS |
| ------------------------- | ---------------- | ----- |
| Zlom stránky              | Ctrl+Enter       | ⌘⏎    |
| Zlom sloupce              | Ctrl+Shift+Enter | ⇧⌘⏎   |
| Zlom řádku                | Shift+Enter      | ⇧⏎    |
| Odkaz…                    | Ctrl+K           | ⌘K    |
| Nový komentář             | Ctrl+Alt+A       | ⌥⌘A   |
| Vložit poznámku pod čarou | Ctrl+Alt+F       | ⌥⌘F   |
| Vložit poznámku na konec  | Ctrl+Alt+D       | ⌥⌘E   |
| Datum (pole)              | Alt+Shift+D      | ⌥⇧D   |
| Čas (pole)                | Alt+Shift+T      | ⌥⇧T   |
| Nedělitelná mezera        | Ctrl+Shift+Space | ⇧⌘␣   |
| Nedělitelná spojovník     | Ctrl+Shift+-     | ⇧⌘-   |

Vložit poznámku na konec je skutečné rozdělení platforem, ne přejmenování: Word na Macu používá ⌥⌘E, protože ⌥⌘D tam patří do Docku.

### Kontrola a nástroje

| Akce               | Windows / Linux | macOS |
| ------------------ | --------------- | ----- |
| Sledovat změny     | Ctrl+Shift+E    | ⇧⌘E   |
| Počet slov         | Ctrl+Shift+G    | ⇧⌘G   |
| Zkontrolovat       | F7              | F7    |
| Aktualizovat pole  | F9              | F9    |
| Přepnout kódy polí | Alt+F9          | ⌥F9   |

F7 spouští kontrolu pomocí AI a F9 aktualizuje pole; obojí potřebuje načtený dokument. Jakmile omezení úprav zapne Sledovat změny, už se nedá vypnout.

### Zobrazení

| Akce                              | Windows / Linux | macOS |
| --------------------------------- | --------------- | ----- |
| Přiblížit                         | Ctrl+=          | ⌘=    |
| Oddálit                           | Ctrl+-          | ⌘-    |
| Přiblížit na 100%                 | Ctrl+0          | ⌘0    |
| Zobrazit/skrýt značky formátování | Ctrl+Shift+8    | ⌘8    |

Zkratka značek formátování kopíruje vlastní rozdělení Wordu, ⌘8 proti Ctrl+Shift+8. Word řídí přiblížení jen třemi výše uvedenými klávesami menu — ⌘+ tu nic neudělá.

F1 otevírá **uživatelskou příručku**, ne tento seznam. List zkratek je ⌘/ nebo Ctrl+/, a to je položka menu Wordu, takže se objeví jen při aktivním panelu Wordu.

## Sheets

GenOffice Sheets otevírá a ukládá sešity .xlsx. Většina zkratek níže je stejná jako v běžných tabulkových programech, takže mnohé už nejspíš znáte.

> **Úpravy mají přednost.** Téměř každá zkratka v Sheets se během úpravy buňky nebo psaní do **řádku vzorců** ignoruje, aby psaní, pohyb kurzoru a Backspace si zachovaly svůj obvyklý význam při úpravě textu. Pokud klávesa jako by nic nedělala, zkontrolujte, jestli právě neupravujete: nejdřív stiskněte Esc nebo Enter a pak to zkuste znovu. Příkazy působící na výběr také nic nedělají, dokud je otevřené dialogové okno. Tam, kde je chord výjimkou z tohoto pravidla, uvádí to tabulka.

Dvě konvence jsou specifické pro Sheets. `⌘` a `⌃` jsou stejná pozice modifikátoru — obě se na každé platformě přijímají, takže `⌘1` a `Ctrl+1` jsou stejný chord. **Prázdná buňka ve sloupci Windows / Linux znamená, že chord existuje jen na macOS.**

### Navigace

| Akce                                                              | Windows / Linux | macOS      |
| ----------------------------------------------------------------- | --------------- | ---------- |
| Další list                                                        | Ctrl+PgDn       | ⌘PgDn      |
| Předchozí list                                                    | Ctrl+PgUp       | ⌘PgUp      |
| Další list (v souladu s Excelem pro Mac)                          |                 | ⌥→         |
| Předchozí list (v souladu s Excelem pro Mac)                      |                 | ⌥←         |
| Přejít na první nezmrazenou buňku                                 | Ctrl+Home       | ⌘Home      |
| Přejít na poslední použitou buňku (obsah nebo formátování)        | Ctrl+End        | ⌘End       |
| Dialogové okno Přejít na                                          | Ctrl+G, F5      | ⌘G, F5     |
| Vložit nový list                                                  | Shift+F11       | ⇧F11       |
| Posunout aktivní buňku o obrazovku dolů (a posunout zobrazení)    | Page Down       | Page Down  |
| Posunout aktivní buňku o obrazovku nahoru (a posunout zobrazení)  | Page Up         | Page Up    |
| Posunout aktivní buňku o obrazovku doprava (a posunout zobrazení) | Alt+Page Down   | ⌥Page Down |
| Posunout aktivní buňku o obrazovku doleva (a posunout zobrazení)  | Alt+Page Up     | ⌥Page Up   |

### Výběr

| Akce                                                              | Windows / Linux                                     | macOS           |
| ----------------------------------------------------------------- | --------------------------------------------------- | --------------- |
| Vybrat celý sloupec aktivní buňky                                 | Ctrl+Space                                          | ⌃Space          |
| Vybrat celý řádek aktivní buňky                                   | Shift+Space                                         | ⇧Space          |
| Přejít na okraj bloku dat — kterákoli ze čtyř šipek               | Ctrl+↑ Ctrl+↓ Ctrl+← Ctrl+→                         | ⌘↑ ⌘↓ ⌘← ⌘→     |
| Roztáhnout výběr k okraji bloku dat; stisknutím znovu ho zmenšíte | Ctrl+Shift+↑ Ctrl+Shift+↓ Ctrl+Shift+← Ctrl+Shift+→ | ⌘⇧↑ ⌘⇧↓ ⌘⇧← ⌘⇧→ |
| Přejít na první sloupec aktuálního řádku                          | Home                                                | Home            |

### Úpravy

| Akce                                                                                                | Windows / Linux       | macOS                      |
| --------------------------------------------------------------------------------------------------- | --------------------- | -------------------------- |
| Vyplnit celý výběr aktuálním zadáním                                                                | Ctrl+Enter            | ⌃⏎ nebo ⌘⏎                 |
| Začít nový řádek v buňce                                                                            | Alt+Enter             | ⌥⏎, nebo ⌃⌥⏎ / ⌘⌥⏎ na Macu |
| Upravit aktivní buňku na místě                                                                      | F2                    | F2                         |
| Tučné                                                                                               | Ctrl+B                | ⌘B                         |
| Kurzíva                                                                                             | Ctrl+I                | ⌘I                         |
| Podtržení                                                                                           | Ctrl+U                | ⌘U                         |
| Najít                                                                                               | Ctrl+F                | ⌘F                         |
| Vyplnit doprava z nejlevějšího vybraného sloupce                                                    | Ctrl+R                | ⌘R                         |
| Přepnout odkaz ve vzorci mezi relativní a absolutní                                                 | F4                    | F4                         |
| Přepnout odkaz ve vzorci mezi relativní a absolutní (v souladu s Excelem pro Mac, při úpravě buňky) |                       | ⌘T                         |
| Kopírovat                                                                                           | Ctrl+C                | ⌘C                         |
| Vyjmout                                                                                             | Ctrl+X                | ⌘X                         |
| Vložit                                                                                              | Ctrl+V                | ⌘V                         |
| Vložit pouze hodnoty                                                                                | Ctrl+Shift+V          | ⌘⇧V                        |
| Rychlé vyplnění podle vzoru nad                                                                     | Ctrl+E                | ⌘E                         |
| Zpět                                                                                                | Ctrl+Z                | ⌘Z                         |
| Znovu                                                                                               | Ctrl+Shift+Z          | ⇧⌘Z                        |
| Vybrat celý list                                                                                    | Ctrl+A                | ⌘A                         |
| Vložit dnešní datum                                                                                 | Ctrl+;                | ⌘;                         |
| Vložit aktuální čas                                                                                 | Ctrl+Shift+;          | ⌘⇧;                        |
| Vymazat obsah všech vybraných buněk                                                                 | Backspace nebo Delete | ⌫ nebo ⌦                   |

AutoSum existuje jen na macOS. Stiskněte ⌘⇧T.

### Formátování

| Akce                                                              | Windows / Linux | macOS |
| ----------------------------------------------------------------- | --------------- | ----- |
| Dialogové okno Formát buněk                                       | Ctrl+1          | ⌘1    |
| Přeškrtnutí (s vybranými buňkami)                                 | Ctrl+5          | ⌘5    |
| Zvětšit velikost písma (s vybranými buňkami)                      | Ctrl+Shift+.    | ⌘⇧.   |
| Zmenšit velikost písma (s vybranými buňkami)                      | Ctrl+Shift+,    | ⌘⇧,   |
| Formát čísla: Obecný                                              | Ctrl+Shift+`    | ⌘⇧`   |
| Formát čísla: číslo se dvěma desetinnými místy                    | Ctrl+Shift+1    | ⌘⇧1   |
| Formát čísla: čas `h:mm AM/PM`                                    | Ctrl+Shift+2    | ⌘⇧2   |
| Formát čísla: datum `d-mmm-yy`                                    | Ctrl+Shift+3    | ⌘⇧3   |
| Formát čísla: měna                                                | Ctrl+Shift+4    | ⌘⇧4   |
| Formát čísla: procenta                                            | Ctrl+Shift+5    | ⌘⇧5   |
| Formát čísla: vědecký                                             | Ctrl+Shift+6    | ⌘⇧6   |
| Všechny okraje (s vybranými buňkami)                              | Ctrl+Shift+7    | ⌘⇧7   |
| Bez okrajů (s vybranými buňkami)                                  | Ctrl+Shift+-    | ⌘⇧-   |
| Zrušit malíře formátování (jen když je malíř formátování zapnutý) | Esc             | Esc   |

### Vkládání a mazání

| Akce                                                                                                       | Windows / Linux                           | macOS                                  |
| ---------------------------------------------------------------------------------------------------------- | ----------------------------------------- | -------------------------------------- |
| Vložit buňky — celé řádky nebo sloupce se vloží přímo, cokoli jiného otevře dialogové okno Vložit          | Ctrl+Shift+=                              | ⌘⇧=                                    |
| Vložit buňky — `+` na číselné klávesnici, stejné dialogové okno                                            | Ctrl společně s `+` na číselné klávesnici | ⌘ společně s `+` na číselné klávesnici |
| Odstranit buňky — celé řádky nebo sloupce se odstraní přímo, cokoli jiného otevře dialogové okno Odstranit | Ctrl+-                                    | ⌘-                                     |
| Odstranit buňky — `-` na číselné klávesnici, stejné dialogové okno                                         | Ctrl společně s `-` na číselné klávesnici | ⌘ společně s `-` na číselné klávesnici |
| Skrýt vybrané řádky                                                                                        | Ctrl+9                                    | ⌘9                                     |
| Zobrazit skryté řádky ve výběru                                                                            | Ctrl+Shift+9                              | ⌘⇧9                                    |
| Skrýt vybrané sloupce                                                                                      | Ctrl+0                                    | ⌘0                                     |
| Zobrazit skryté sloupce ve výběru                                                                          | Ctrl+Shift+0                              | ⌘⇧0                                    |

### Data a kontrola

| Akce                                              | Windows / Linux | macOS |
| ------------------------------------------------- | --------------- | ----- |
| Dialogové okno Vložit funkci                      | Shift+F3        | ⇧F3   |
| Správce názvů                                     | Ctrl+F3         | ⌃F3   |
| Přidat nebo upravit poznámku k aktivní buňce      | Shift+F2        | ⇧F2   |
| Vložit hypertextový odkaz                         | Ctrl+K          | ⌘K    |
| sledovat předchůdce (buňka musí obsahovat vzorec) | Ctrl+[          | ⌘[    |
| Sledovat následující                              | Ctrl+]          | ⌘]    |
| Skupovat vybrané řádky                            | Alt+Shift+→     | ⌥⇧→   |
| Zrušit skupování vybraných řádků                  | Alt+Shift+←     | ⌥⇧←   |
| Přepočítat celý sešit                             | F9              | F9    |
| Přepočítat jen aktivní list                       | Shift+F9        | ⇧F9   |
| Zapnout nebo vypnout filtr v označeném rozsahu    |                 | ⌘⇧F   |

Zkratka filtru Excelu, Ctrl+Shift+L, na Windows ani Linuxu nedělá nic. Na macOS stiskněte ⌘⇧F, nebo na jakékoli platformě použijte příkaz filtru na pásu.

### Okno

| Akce                                                      | Windows / Linux  | macOS         |
| --------------------------------------------------------- | ---------------- | ------------- |
| Uložit sešit                                              | Ctrl+S           | ⌘S            |
| Uložit jako                                               | Ctrl+Shift+S     | ⇧⌘S           |
| Otevřít sešit                                             | Ctrl+O           | ⌘O            |
| Tisk                                                      | Ctrl+P           | ⌘P            |
| Zavřít sešit (macOS) / Ukončit aplikaci (Windows a Linux) | Ctrl+Q           | ⌘W            |
| Otevřít uživatelskou příručku                             | F1               | F1            |
| Přiblížit                                                 | Ctrl+=           | ⌘=            |
| Přiblížení kolečkem myši                                  | Ctrl + posouvání | ⌘ + posouvání |
| Zobrazit nebo skrýt vzorce v buňkách                      | Ctrl+`           | ⌘`            |
| Rozbalit nebo sbalit řádek vzorců                         | Ctrl+Shift+U     | ⌘⇧U           |

## Slides

GenOffice Slides je editor prezentací ve stylu PowerPointu. Většina kláves dělá všude to samé, ale pár z nich mění význam podle fokusu — uvnitř textového pole, nebo když má fokus klávesnice **panel náhledů**, **panel osnovy** nebo **třídění snímků**. Tyto případy jsou ve sloupci Akce označené.

### Soubor a aplikace

| Akce                       | Windows / Linux | macOS |
| -------------------------- | --------------- | ----- |
| Uložit                     | Ctrl+S          | ⌘S    |
| Uložit jako                | Ctrl+Shift+S    | ⇧⌘S   |
| Otevřít                    | Ctrl+O          | ⌘O    |
| Zavřít aktuální panel      | Ctrl+Q          | ⌘W    |
| Tisk                       | Ctrl+P          | ⌘P    |
| Zpět                       | Ctrl+Z          | ⌘Z    |
| Znovu                      | Ctrl+Shift+Z    | ⇧⌘Z   |
| Znovu (alternativní chord) | Ctrl+Y          | ⌘Y    |

Zavírání panelu je jediné místo, kde se dvě platformy zcela rozdělí: ⌘W na macOS a na Windows a Linuxu Ctrl+Q, který ukončí celou aplikaci, ne panel.

### Úpravy

| Akce                                         | Windows / Linux | macOS  |
| -------------------------------------------- | --------------- | ------ |
| Nový snímek                                  | Ctrl+M          | ⇧⌘N    |
| Najít (ne při úpravě textu v tvaru)          | Ctrl+F          | ⌘F     |
| Opatrnit výběr pomocí AI (s vybranými tvary) | Ctrl+K          | ⌘K     |
| Přiblížit                                    | Ctrl+=          | ⌘=     |
| Oddálit                                      | Ctrl+-          | ⌘-     |
| Skutečná velikost (100%)                     | Ctrl+0          | ⌘0     |
| Vybrat vše                                   | Ctrl+A          | ⌘A     |
| Přecházet výběrem tvarů vpřed / vzad         | Tab / Shift+Tab | ⇥ / ⇧⇥ |

Nový snímek je druhé rozdělení platforem. Každá platforma má vlastní klávesu a druhá nic nedělá: ⇧⌘N na macOS, Ctrl+M na Windows a Linuxu. ⌘M to na macOS nemůže udělat, protože je to systémová klávesa Minimalizovat.

Vybrat vše sleduje fokus: s fokusem na panel náhledů, panel osnovy nebo třídění snímků vybere všechny snímky, všude jinde všechny prvky aktuálního snímku. Tab prochází tvary na snímku, a to jen když má fokus samotné plátno snímku.

### Formátování textu

Ty působí na text vybraného tvaru, nebo na odstavec s kurzorem, když jste uvnitř textového pole.

| Akce                                  | Windows / Linux | macOS |
| ------------------------------------- | --------------- | ----- |
| Tučné                                 | Ctrl+B          | ⌘B    |
| Kurzíva                               | Ctrl+I          | ⌘I    |
| Podtržení                             | Ctrl+U          | ⌘U    |
| Zarovnat doleva                       | Ctrl+L          | ⌘L    |
| Vycentrovat                           | Ctrl+E          | ⌘E    |
| Zarovnat doprava                      | Ctrl+R          | ⌘R    |
| Zarovnat přes šířku                   | Ctrl+J          | ⌘J    |
| Zvětšit velikost písma o 1 pt         | Ctrl+]          | ⌘]    |
| Zmenšit velikost písma o 1 pt         | Ctrl+[          | ⌘[    |
| Písmo na další velikost v žebříku     | Ctrl+Shift+>    | ⇧⌘>   |
| Písmo na předchozí velikost v žebříku | Ctrl+Shift+<    | ⇧⌘<   |

Klávesy žebříku písma berou také klávesy . a , s drženým Shift, pro rozvržení klávesnice, které je hlásí místo kláves s interpunkcí.

### Schránka a objekty

| Akce                                            | Windows / Linux    | macOS       |
| ----------------------------------------------- | ------------------ | ----------- |
| Kopírovat                                       | Ctrl+C             | ⌘C          |
| Vyjmout                                         | Ctrl+X             | ⌘X          |
| Vložit                                          | Ctrl+V             | ⌘V          |
| Vložit pouze formát                             | Ctrl+Shift+V       | ⇧⌘V         |
| Kopírovat pouze formát (s vybranými tvary)      | Ctrl+Shift+C       | ⇧⌘C         |
| Duplikovat na místě (s vybranými tvary)         | Ctrl+D             | ⌘D          |
| Skupovat výběr (s vybranými tvary)              | Ctrl+G             | ⌘G          |
| Zrušit skupování výběru (s vybranými tvary)     | Ctrl+Shift+G       | ⇧⌘G         |
| Odstranit výběr (s vybranými tvary)             | Backspace / Delete | ⌫ / Delete  |
| Odstranit vybraný vrchol (v režimu Úprava bodů) | Backspace / Delete | ⌫ / Delete  |
| Posunout výběr (s vybranými tvary)              | Arrow keys         | ↑ ↓ ← →     |
| Posunout o jeden pixel obrazovky                | Ctrl+Arrow keys    | ⌘↑ ⌘↓ ⌘← ⌘→ |
| Změnit velikost kolem středu                    | Shift+Arrow keys   | ⇧↑ ⇧↓ ⇧← ⇧→ |

Uvnitř textového pole fungují kopírovat, vyjmout a vložit na text, ne na tvar. Shift se šipkami mění velikost každého tvaru kolem jeho vlastního středu, Spojovatele nechává být a vícenásobný výběr potvrzuje jako jeden krok Zpět.

### Snímky — fokus na panelu náhledů, panelu osnovy nebo třídění

Příkazy na úrovni snímku typu PowerPointu fungují jen tehdy, když má fokus klávesnice některé ze těchto tří podoken.

| Akce                                        | Windows / Linux                                | macOS                          |
| ------------------------------------------- | ---------------------------------------------- | ------------------------------ |
| Předchozí / další snímek                    | ArrowUp / ArrowDown (také Page Up / Page Down) | ↑ ↓ (také Page Up / Page Down) |
| První / poslední snímek                     | Home / End                                     | Home / End                     |
| Roztáhnout výběr na první / poslední snímek | Shift+Home / Shift+End                         | ⇧Home / ⇧End                   |
| Vybrat všechny snímky                       | Ctrl+A                                         | ⌘A                             |
| Odstranit vybrané snímky                    | Backspace / Delete                             | ⌫ / Delete                     |
| Kopírovat snímky                            | Ctrl+C                                         | ⌘C                             |
| Vyjmout snímky                              | Ctrl+X                                         | ⌘X                             |

Pohyb mezi snímky šipkami je výjimka — funguje i z plátna, bez jakékoli vybrané položky. Odstraňování snímků neplatí, když je aktivní pero ani v **režimu čtení**.

### Uvnitř textového pole

| Akce                                                   | Windows / Linux                           | macOS                                 |
| ------------------------------------------------------ | ----------------------------------------- | ------------------------------------- |
| Začít úpravu textu ve vybraném textovém tvaru          | libovolný tisknutelný znak, Enter nebo F2 | libovolný tisknutelný znak, ⏎ nebo F2 |
| Potvrdit text a znovu vybrat tvar                      | Esc nebo F2                               | Esc nebo F2                           |
| Potvrdit text a znovu vybrat tvar (alternativní chord) | Ctrl+⏎                                    | ⌘⏎                                    |
| Přejít na další zástupný symbol                        | Ctrl+⏎                                    | ⌃⏎                                    |
| Přesunout úroveň seznamu níže / výše                   | Tab / Shift+Tab                           | ⇥ / ⇧⇥                                |
| Další / předchozí buňka tabulky                        | Tab / Shift+Tab                           | ⇥ / ⇧⇥                                |
| Měkký zlom řádku                                       | Shift+⏎                                   | ⇧⏎                                    |

Tab znamená dvě různé věci: další buňku v tabulce a přesunutí úrovně seznamu níže v textovém tvaru.

### Prezentace

| Akce                          | Windows / Linux                      | macOS             |
| ----------------------------- | ------------------------------------ | ----------------- |
| Spustit od začátku            | F5                                   | F5                |
| Spustit od aktuálního snímku  | ⇧F5                                  | ⇧F5 nebo ⌘⏎       |
| Další snímek                  | Right, Down, Space, Enter, Page Down | → ↓ ␣ ⏎ Page Down |
| Předchozí snímek              | Left, Up, Page Up                    | ← ↑ Page Up       |
| První snímek                  | Home                                 | Home              |
| Poslední snímek               | End                                  | End               |
| Přejít na snímek N            | napište N, pak Enter                 | napište N, pak ⏎  |
| Černá obrazovka               | B nebo .                             | B nebo .          |
| Bílá obrazovka                | W nebo ,                             | W nebo ,          |
| Obnovit po zhasnutí obrazovky | libovolná klávesa                    | libovolná klávesa |
| Ukončit prezentaci            | Esc                                  | Esc               |

Spuštění od aktuálního snímku bere na macOS ⌘⏎ i ⇧F5. Ve Windows zůstává stejná klávesa vyhrazena pro pohyb mezi zástupnými symboly.

### Režim čtení

| Akce                | Windows / Linux                      | macOS             |
| ------------------- | ------------------------------------ | ----------------- |
| Další snímek        | Right, Down, Space, Enter, Page Down | → ↓ ␣ ⏎ Page Down |
| Předchozí snímek    | Left, Up, Page Up                    | ← ↑ Page Up       |
| Ukončit režim čtení | Esc                                  | Esc               |

Stiskněte **Esc**, abyste se dostali ven z čehokoli, v čem právě jste — výřezu, tvaru, který kreslíte, **Úpravy bodů**, skupiny, pera, zvýrazňovače nebo gumy, přehrávače nebo **režimu čtení** — a abyste zrušili výběr.

Dvě další jsou modifikátory, ne chody: při kreslení držte **Shift**, abyste zachovali proporce nového tvaru, a při otáčení držte **Shift**, abyste přitahovali po krocích 15°.

## PDF

PDF nemá vlastní menu, takže každý chord níže sleduje aktivní panel a funguje jen tehdy, když je vpředu panel PDF.

### Soubor a úpravy

| Akce                    | Windows / Linux | macOS |
| ----------------------- | --------------- | ----- |
| Uložit                  | Ctrl+S          | ⌘S    |
| Zpět                    | Ctrl+Z          | ⌘Z    |
| Znovu                   | Ctrl+Shift+Z    | ⇧⌘Z   |
| Najít (otevřít hledání) | Ctrl+F          | ⌘F    |
| Tisk                    | Ctrl+P          | ⌘P    |

Zpět a Znovu procházejí historií dokumentu; když je kurzor v textovém poli, nechají ⌘Z tomu poli. ⌘P otevírá stejné dialogové okno tisku v aplikaci jako tlačítko Tisk na panelu nástrojů.

### Zobrazení

| Akce                 | Windows / Linux     | macOS            |
| -------------------- | ------------------- | ---------------- |
| Přiblížit            | Ctrl+=              | ⌘=               |
| Oddálit              | Ctrl+-              | ⌘-               |
| Přizpůsobit šířce    | Ctrl+0              | ⌘0               |
| Plynulé přiblížování | Ctrl + kolečko myši | ⌘ + kolečko myši |

Přiblížit reagují také ⌘+ a Ctrl++.

### Pohyb po stránkách

| Akce                        | Windows / Linux     | macOS               |
| --------------------------- | ------------------- | ------------------- |
| Další strana                | →                   | →                   |
| Předchozí strana            | ←                   | ←                   |
| Posunout o obrazovku dolů   | PageDown nebo Space | PageDown nebo Space |
| Posunout o obrazovku nahoru | PageUp              | PageUp              |
| Posunout dolů               | ↓                   | ↓                   |
| Posunout nahoru             | ↑                   | ↑                   |
| Přejít na první stránku     | Home                | Home                |
| Přejít na poslední stránku  | End                 | End                 |

Ty nemají modifikátor, takže obě platformy vypadají stejně. ↓ a ↑ jsou jediný řádek, který se mění s fokusem: v dokumentu posouvají stránku, ale s fokusem v postranním panelu náhledů přeskakují o celou stránku. Nic nedělají, když píšete do pole.

### Výběr a úpravy

| Akce                        | Windows / Linux       | macOS                 |
| --------------------------- | --------------------- | --------------------- |
| Odstranit vybranou poznámku | Delete nebo Backspace | Delete nebo Backspace |

Funguje jen tehdy, když je vybrána poznámka, razítko, redakce nebo obrázek.

### Panel miniatur

| Akce                          | Windows / Linux       | macOS                 |
| ----------------------------- | --------------------- | --------------------- |
| Vybírat stránky po jedné      | Ctrl + kliknutí       | ⌘ + kliknutí          |
| Vybrat souvislou řadu stránek | Shift + kliknutí      | ⇧ + kliknutí          |
| Vybrat všechny stránky        | Ctrl+A                | ⌘A                    |
| Odstranit vybrané stránky     | Delete nebo Backspace | Delete nebo Backspace |

Vybrané stránky jsou podbarvené. Kliknutím pravým tlačítkem na jednu z nich nebo kartou Stránka je společně otočíte, odstraníte nebo extrahujete; přetažením jedné přesunete všechny. Escape nebo obyčejné kliknutí na stránku výběr zruší. ⌘A a Delete fungují, když má panel fokus.

### Escape a dialogová okna

| Akce                             | Windows / Linux | macOS  |
| -------------------------------- | --------------- | ------ |
| Zrušit nejvyšší stav             | Escape          | Escape |
| Potvrdit otevřené dialogové okno | Enter           | Enter  |

Escape rozvinuje jednu vrstvu po druhé — nejdřív otevřené dialogové okno, pak překryv AI, koncept textu, panel hledání a nakonec samotný výběr. Když je kurzor ve vyhledávacím poli, Enter a ⇧Enter přecházejí na další a předchozí shodu a Escape zavírá panel; když je kurzor v nové textové poznámce, ⌘⏎ ji potvrzuje.

## Markdown

GenOffice Markdown upravuje Markdown s živým náhledem vedle sebe.

### Soubor a zobrazení

| Akce                     | Windows / Linux    | macOS      |
| ------------------------ | ------------------ | ---------- |
| Uložit                   | Ctrl+S             | ⌘S         |
| Uložit jako              | Ctrl+Shift+S       | ⇧⌘S        |
| Tisk                     | Ctrl+P             | ⌘P         |
| Najít                    | Ctrl+F             | ⌘F         |
| Přepnout zdroj / náhled  | Ctrl+E             | ⌘E         |
| Přiblížit                | Ctrl+= nebo Ctrl++ | ⌘= nebo ⌘+ |
| Oddálit                  | Ctrl+-             | ⌘-         |
| Skutečná velikost (100%) | Ctrl+0             | ⌘0         |

Oddálit bere také ⌘_ a Ctrl+_. Přibližuje také sevření trackpadu, nebo držení ⌘ nebo Ctrl a posouvání nad dokumentem.

### Bloky

| Akce                                                   | Windows / Linux      | macOS |
| ------------------------------------------------------ | -------------------- | ----- |
| Duplikovat vybrané bloky                               | Ctrl+D               | ⌘D    |
| Odstranit vybrané bloky                                | Ctrl+Shift+Backspace | ⇧⌘⌫   |
| Posunout vybraný blok nahoru                           | Ctrl+Shift+ArrowUp   | ⇧⌘↑   |
| Posunout vybraný blok dolů                             | Ctrl+Shift+ArrowDown | ⇧⌘↓   |
| Vložit odkaz na výběr                                  | Ctrl+K               | ⌘K    |
| Odebrat odkaz (stiskněte znovu, když je odkaz aktivní) | Ctrl+K               | ⌘K    |

### Uvnitř matematického bloku

Ty platí jen, když je otevřen plovoucí editor LaTeX.

| Akce                      | Windows / Linux | macOS |
| ------------------------- | --------------- | ----- |
| Použít vzorec             | Ctrl+⏎          | ⌘⏎    |
| Zavřít editor bez použití | Esc             | Esc   |

Použití prázdného vzorce místo toho smaže blok. Editor se také zavře při jakékoli změně dokumentu a kliknutím mimo se zavře.

## HTML

GenOffice HTML zobrazuje editor kódu vedle živého náhledu. Klávesy, které působí na prvek stránky, fungují jen tehdy, když má samotný náhled fokus klávesnice.

### Soubor a zobrazení zdroje

| Akce                                             | Windows / Linux    | macOS      |
| ------------------------------------------------ | ------------------ | ---------- |
| Uložit                                           | Ctrl+S             | ⌘S         |
| Uložit jako                                      | Ctrl+Shift+S       | ⇧⌘S        |
| Přepínat zobrazení (úpravy / rozdělení / náhled) | Ctrl+\             | ⌘\         |
| Najít                                            | Ctrl+F             | ⌘F         |
| Přiblížit                                        | Ctrl+= nebo Ctrl++ | ⌘= nebo ⌘+ |
| Oddálit                                          | Ctrl+-             | ⌘-         |
| Skutečná velikost (100%)                         | Ctrl+0             | ⌘0         |

Oddálit bere také ⌘_ a Ctrl+_.

### Formátování a historie

| Akce                       | Windows / Linux | macOS |
| -------------------------- | --------------- | ----- |
| Tučné                      | Ctrl+B          | ⌘B    |
| Kurzíva                    | Ctrl+I          | ⌘I    |
| Zpět                       | Ctrl+Z          | ⌘Z    |
| Znovu                      | Ctrl+Shift+Z    | ⇧⌘Z   |
| Znovu (alternativní chord) | Ctrl+Y          | ⌘Y    |

Uvnitř editoru kódu nebo formulářového pole přebírají vlastní klávesy úprav daného pole.

### V rámci náhledu, s vybraným prvkem

| Akce                           | Windows / Linux    | macOS      |
| ------------------------------ | ------------------ | ---------- |
| Zeptej se AI na prvek          | Ctrl+K             | ⌘K         |
| Odstranit prvek                | Backspace / Delete | ⌫ / Delete |
| Předchozí sourozenec           | ArrowUp            | ↑          |
| Následující sourozenec         | ArrowDown          | ↓          |
| Vybrat nadřazený prvek         | ArrowLeft          | ←          |
| Vybrat prvního potomka         | ArrowRight         | →          |
| Posunout prvek výš v dokumentu | Alt+ArrowUp        | ⌥↑         |
| Posunout prvek níž v dokumentu | Alt+ArrowDown      | ⌥↓         |
| Zrušit výběr                   | Esc                | Esc        |

Každá z nich potřebuje už vybraný prvek; když nic není vybráno, klávesa nedělá nic.

### V rámci náhledu, při úpravě textu na místě

| Akce                                 | Windows / Linux | macOS |
| ------------------------------------ | --------------- | ----- |
| Potvrdit úpravu                      | Esc             | Esc   |
| Potvrdit úpravu (alternativní chord) | Ctrl+⏎          | ⌘⏎    |
| Ztučnit vybraný rozsah               | Ctrl+B          | ⌘B    |
| Nastavit kurzívu vybranému rozsahu   | Ctrl+I          | ⌘I    |

Potvrzení zachová to, co jste napsali, a vrátí prvek do vybrané polohy.

## HWP/HWPX

Tyto klávesy fungují, když je karta HWP/HWPX vpředu a dokument má fokus. Dva sloupce ukazují, jak je stisknout v macOS a ve Windows / Linux.

### Soubor

| Akce          | Windows / Linux      | macOS |
| ------------- | -------------------- | ----- |
| Nový dokument | Alt+N                |       |
| Otevřít…      | Ctrl+O / Alt+O       | ⌘O    |
| Uložit        | Ctrl+S / Alt+S       | ⌘S    |
| Uložit jako…  | Ctrl+Shift+S / Alt+V | ⇧⌘S   |
| Tisk          | Ctrl+P / Alt+P       | ⌘P    |

### Úpravy

| Akce                  | Windows / Linux              | macOS       |
| --------------------- | ---------------------------- | ----------- |
| Zpět                  | Ctrl+Z                       | ⌃Z          |
| Znovu                 | Ctrl+Shift+Z                 | ⌃⇧Z         |
| Odstranit řádek       | Ctrl+Y                       | ⌃Y          |
| Vyjmout               | Ctrl+X                       | ⌃X          |
| Kopírovat             | Ctrl+C                       | ⌃C          |
| Vložit                | Ctrl+V                       | ⌃V          |
| Odstranit             | Ctrl+E                       | ⌃E          |
| Vybrat vše            | Ctrl+A                       | ⌃A          |
| Kopírovat formátování | Alt+C                        | ⌥C          |
| Najít                 | Ctrl+F / Ctrl+Q, F           | ⌃F / ⌃Q, F  |
| Najít a nahradit      | Ctrl+H / Ctrl+F2 / Ctrl+Q, A | ⌃F2 / ⌃Q, A |
| Najít další           | Ctrl+L                       | ⌃L          |
| Hledat zpět           | Ctrl+Q, L                    | ⌃Q, L       |
| Přejít na             | Alt+G                        | ⌥G          |
| Porovnat dokumenty    | Alt+Shift+V                  | ⌥⇧V         |

### Znak

| Akce                      | Windows / Linux      | macOS    |
| ------------------------- | -------------------- | -------- |
| Tučné                     | Ctrl+B / Alt+Shift+B | ⌃B / ⌥⇧B |
| Kurzíva                   | Ctrl+I / Alt+Shift+I | ⌃I / ⌥⇧I |
| Podtržení                 | Ctrl+U / Alt+Shift+U | ⌃U / ⌥⇧U |
| Normální formát           | Alt+Shift+C          | ⌥⇧C      |
| Horní index               | Alt+Shift+P          | ⌥⇧P      |
| Dolní index               | Alt+Shift+S          | ⌥⇧S      |
| Formát znaku…             | Alt+L                | ⌥L       |
| Zvětšit velikost písma    | Alt+Shift+E / Ctrl+] | ⌥⇧E / ⌃] |
| Zmenšit velikost písma    | Alt+Shift+R / Ctrl+[ | ⌥⇧R / ⌃[ |
| Zvětšit šířku znaků       | Alt+Shift+K          | ⌥⇧K      |
| Zmenšit šířku znaků       | Alt+Shift+J          | ⌥⇧J      |
| Zvětšit mezery mezi znaky | Alt+Shift+W          | ⌥⇧W      |
| Zmenšit mezery mezi znaky | Alt+Shift+N          | ⌥⇧N      |
| Černý text                | Ctrl+M, K            | ⌃M, K    |
| Červený text              | Ctrl+M, R            | ⌃M, R    |
| Modrý text                | Ctrl+M, B            | ⌃M, B    |
| Švestkový text            | Ctrl+M, D            | ⌃M, D    |
| Zelený text               | Ctrl+M, G            | ⌃M, G    |
| Žlutý text                | Ctrl+M, Y            | ⌃M, Y    |
| Tyrkysový text            | Ctrl+M, C            | ⌃M, C    |
| Bílý text                 | Ctrl+M, W            | ⌃M, W    |

### Odstavec

| Akce                        | Windows / Linux | macOS   |
| --------------------------- | --------------- | ------- |
| Zarovnat doleva             | Ctrl+Shift+L    | ⌃⇧L     |
| Na střed                    | Ctrl+Shift+C    | ⌃⇧C     |
| Zarovnat doprava            | Ctrl+Shift+R    | ⌃⇧R     |
| Zarovnat přes šířku         | Ctrl+Shift+M    | ⌃⇧M     |
| Rozdělit                    | Ctrl+Shift+T    | ⌃⇧T     |
| Zvětšit řádkování           | Alt+Shift+Z     | ⌥⇧Z     |
| Zmenšit řádkování           | Alt+Shift+A     | ⌥⇧A     |
| Formát odstavce…            | Alt+T           | ⌥T      |
| Styl…                       | F6              | F6      |
| Použít první až desátý styl | Ctrl+1 … Ctrl+0 | ⌃1 … ⌃0 |
| Formát číslování odstavců   | Ctrl+K, N       | ⌃K, N   |

### Vložení

| Akce                                    | Windows / Linux    | macOS       |
| --------------------------------------- | ------------------ | ----------- |
| Vložit tabulku                          | Ctrl+N, T          | ⌃N, T       |
| Poznámka pod čarou                      | Ctrl+N, N          | ⌃N, N       |
| Poznámka na konci                       | Ctrl+N, E          | ⌃N, E       |
| Záhlaví                                 | Ctrl+N, H          | ⌃N, H       |
| Číslo stránky                           | Ctrl+N, P          | ⌃N, P       |
| Vložit obrázek                          | Ctrl+N, I          | ⌃N, I       |
| Textové pole                            | Ctrl+N, B          | ⌃N, B       |
| Rovnice                                 | Ctrl+N, M          | ⌃N, M       |
| Vložit popisek                          | Ctrl+N, C          | ⌃N, C       |
| Hypertextový odkaz                      | Ctrl+K, H          | ⌃K, H       |
| Záložka                                 | Ctrl+K, B          | ⌃K, B       |
| Vložit pole                             | Ctrl+K, E          | ⌃K, E       |
| Řetězec data a času                     | Ctrl+K, D          | ⌃K, D       |
| Upravit objekt, pole nebo tabulku/buňku | Ctrl+N, K          | ⌃N, K       |
| Symboly                                 | Ctrl+F10 / Alt+F10 | ⌃F10 / ⌥F10 |

### Tabulka

| Akce                    | Windows / Linux        | macOS        |
| ----------------------- | ---------------------- | ------------ |
| Přidat řádek/sloupec    | Alt+Enter / Alt+Insert | ⌥⏎ / ⌥Insert |
| Odstranit řádek/sloupec | Alt+Delete             | ⌥⌫           |
| Rozdělit buňku          | F5 → S                 | F5 → S       |
| Sloučit buňky           | F5 → M                 | F5 → M       |
| Součet bloku            | F5 → Ctrl+Shift+S      | F5 → ⇧⌘S     |
| Průměr bloku            | F5 → Ctrl+Shift+A      | F5 → ⌃⇧A     |
| Součin bloku            | F5 → Ctrl+Shift+P      | F5 → ⌃⇧P     |
| Rozdělit tabulku        | Ctrl+N, A              | ⌃N, A        |
| Spojit tabulky          | Ctrl+N, Z              | ⌃N, Z        |
| Výpočtový vzorec        | Ctrl+N, F              | ⌃N, F        |

### Výpočty v tabulce

Fungují jen tehdy, když je kurzor v prázdné buňce tabulky. Samostatné klávesy počítají z buněk vlevo a z buněk nad.

| Akce          | Windows / Linux | macOS |
| ------------- | --------------- | ----- |
| Součet vlevo  | Ctrl+Shift+H    | ⇧⌘H   |
| Součet nahoře | Ctrl+Shift+V    | ⌃⇧V   |
| Průměr vlevo  | Ctrl+Shift+J    | ⌃⇧J   |
| Průměr nahoře | Ctrl+Shift+B    | ⌃⇧B   |
| Součin vlevo  | Ctrl+Shift+K    | ⌃⇧K   |
| Součin nahoře | Ctrl+Shift+N    | ⌃⇧N   |

### Stránka

| Akce                   | Windows / Linux  | macOS |
| ---------------------- | ---------------- | ----- |
| Nastavení stránky      | F7               | F7    |
| Zlom stránky           | Ctrl+Enter       | ⌃⏎    |
| Zlom sloupce           | Ctrl+Shift+Enter | ⌃⇧⏎   |
| Zlom nastavení sloupců | Ctrl+Alt+Enter   | ⌃⌥⏎   |
| Nastavení oddílu       | Ctrl+N, G        | ⌃N, G |
| Skrýt stránku          | Ctrl+N, S        | ⌃N, S |

### Zobrazení

| Akce                                | Windows / Linux | macOS |
| ----------------------------------- | --------------- | ----- |
| Přiblížit                           | Ctrl+=          | ⌃=    |
| Oddálit                             | Ctrl+-          | ⌃-    |
| Přizpůsobit stránce                 | Ctrl+G, P       | ⌃G, P |
| Přizpůsobit šířce                   | Ctrl+G, W       | ⌃G, W |
| Přiblížit na 100 %                  | Ctrl+G, Q       | ⌃G, Q |
| Sbalit nebo rozbalit sadu nástrojů  | Ctrl+F1         | ⌃F1   |
| Zobrazit nebo skrýt značky odstavců | Ctrl+G, T       | ⌃G, T |
| Zobrazit nebo skrýt řídicí značky   | Ctrl+G, C       | ⌃G, C |
| Přejít na kartu Domů (mimo tabulku) | Ctrl+Shift+H    | ⇧⌘H   |

Klávesa zapsaná jako `Ctrl+N,T` znamená: stiskněte Ctrl+N, uvolněte a potom stiskněte T. `F5 → S` znamená vybrat blok buněk klávesou F5 a potom stisknout S. `Ctrl+1 … Ctrl+0` označují první až desátý styl dokumentu; `Ctrl+Alt+1 … Ctrl+Alt+0` použijí stejné styly. Když je vybraný blok buněk, `Ctrl+Shift+S` (v macOS `⇧⌘S`) je součet bloku; jinde tato klávesa ukládá jako.
