# Obrazovka domovské stránky: kde žijí vaše soubory

Domovská stránka je úvodní stránka GenOffice: vlevo navigační postranní panel, vpravo nástěnka z karet. Zadáním tématu do karty **Začít** otevřete myšlenkovou mapu a z karty **Pokračovat** znovu otevřete nedávné dokumenty; její tlačítko **All N** vede na úplný seznam **Nedávné**. Na obrazovkách v korejštině je ještě karta s dnešní předpovědí ze služby Trend Radar; kliknutím na oblast otevřete Trend Radar v prohlížeči.

## Navigace v postranním panelu

- **Domů**: nástěnka z karet. Aplikace začíná zde.
- **Nedávné**: soubory, které jste nedávno otevřeli. Každý řádek nese svůj čas — dnes, včera nebo datum.
- **Oblíbené**: soubory, které jste si označili hvězdičkou. Přejděte na řádek souboru a klikněte na hvězdičku, abyste jej přidali nebo odebrali. **Přesunout do skupiny** v nabídce ⋯ třídí soubory s hvězdičkou do pojmenovaných skupin; zobrazení S hvězdičkou se podle nich filtruje.
- **Uživatelská příručka**: otevře tuto příručku.
- **Ask AI**: panel znalostní báze — ptejte se a dostávejte odpovědi s citacemi z vašich souborů s hvězdičkou (viz níže).
- **Složky**: adresáře, které do postranního panelu přidáte tlačítkem **Přidat složku…** nebo do něj přetáhnete ze správce souborů. Každý se stane kořenem, který můžete otevřít, vytvořit v něm podsložky, přejmenovat a odebrat; ten, který se stane nedostupným, se zobrazí jako nedostupný a lze ho ze seznamu sundat. **Nová složka** vytvoří další.
- **Řádek dole**: ukazuje, zda je AI připojena — **Připojit AI**, nebo název připojeného předplatného — a otevírá Nastavení.

Zde není žádná položka Koš. Odstraněné soubory putují do systémového koše a jejich obnova je věcí operačního systému.

## Seznam souborů

Každý řádek zobrazuje ikonu, název souboru, čas změny a další údaje. Nabídka **⋯** na řádku obsahuje:

- **Otevřít**, a dále **Zobrazit ve složce**, abyste soubor našli ve správci souborů.
- **Kopírovat cestu**.
- **Přesunout do složky…**: otevře výběr složky a soubor skutečně přesune; pokud je v cíli už soubor se stejným názvem, můžete přeskočit, přepsat nebo přejmenovat.
- **Přejmenovat**: přejmenování na místě, přípona se zachová automaticky.
- **Přidat k oblíbeným / Odebrat z oblíbených** — hvězdičky přežijou restart a sledují soubor i po jeho přejmenování.
- **Duplikovat**: vytvoří kopii ve stejné složce.
- **Odstranit**: přesune soubor do systémového koše — nejde o trvalé smazání.
- **Odebrat ze seznamu**, v hlavním zobrazení **Nedávné**, aby položka zmizela, aniž by se souboru něco stalo.

### Více souborů najednou

Zaškrtněte pole u řádku nebo klepněte s ⌘/ctrl, abyste vytvořili výběr; pole v záhlaví vybere vše, co je právě vypsáno, a lišta nad seznamem hlásí (**Vybráno: {n}**), kolik je vybráno, a nabízí **Přesunout do složky…** a **Odstranit soubory** pro celou sadu. Výběr více souborů můžete také přetáhnout na složku v postranním panelu.

## Vyhledávání

Napište dotaz do vyhledávacího pole v horním řádku nástěnky a výsledky se zobrazí místo nástěnky; vymazáním dotazu nebo klávesou Esc se vrátíte na nástěnku. Hledá se současně ve dvou věcech:

- **Názvy souborů**: rychlé filtrování podle názvu.
- **Obsah souborů**: GenOffice na pozadí indexuje vaše soubory (text uvnitř docx/odt/xlsx/pptx/pdf/md/html), takže hledáním v textu najdete i soubory. Rozsah a přepínače se nastavují v nastavení vyhledávání.

## Přizpůsobit domovskou stránku

Kliknutím na **Přizpůsobit domovskou stránku** vpravo v horním řádku nástěnky můžete měnit karty. Změny se ukládají hned; nakonec klikněte na **Hotovo** nebo stiskněte Esc.

- Přetažením karty ji přesunete a přetažením jejího pravého dolního rohu změníte velikost; velikost lze vybrat i v nabídce karty **⋯**. V kartě **Nový** přetažením aplikací změníte jejich pořadí a kliknutím na × aplikaci z domovské stránky odeberete.
- **Přidat kartu** přidá rychlou poznámku, oblíbené, zobrazení složky, hodiny nebo zástupce a vrátí odebrané karty. Domovská stránka pojme až 24 karet.
- **Výchozí rozložení** vrátí pořadí a velikost výchozích karet a aplikace zobrazené na domovské stránce do původního stavu. Karty, které jste přidali, zůstanou.
- **Uspořádat do seznamu** zobrazí karty a aplikace v seznamu, kde je bez myši přeuspořádáte klávesami ↑↓, přidáte nebo odeberete a vyberete jejich velikost.

## Nový a All apps

Karta **Nový** obsahuje aplikace připnuté na domovskou stránku. Kliknutím na aplikaci vytvoříte soubor daného typu a otevřete jeho editor — hned začněte psát, nebo nechte AI napsat koncept (každý editor má na pásku **tlačítko AI** a v kontextové nabídce výběru **Zeptat se AI**). Poslední pole, **All apps**, zobrazí všechny aplikace podle skupin: hledejte podle názvu nebo účelu, otevřete jednu ze tří **Recently used apps** nebo tlačítkem připnutí aplikaci připněte na domovskou stránku či ji odeberte. Aplikace, které přibyly v nové verzi, nesou označení **New**.

Nový soubor se uloží do složky právě vybrané v postranním panelu; pokud není vybrána žádná, dostane se do výchozí složky.

Co dělá jednotlivá aplikace:

- **AI Docs** (.docx): prázdný textový dokument v editoru Docs. Soubor se na disk zapíše až při **prvním uložení**; nové dokumenty se otevírají s rozbaleným panelem AI (vypnout to lze v Nastavení → „Otevírat panel AI v nových dokumentech“).
- **AI Sheets** (.xlsx): prázdný list v editoru Sheets. Dokud neuložíte, na disku žádný soubor není — název je rezervován pro první uložení; po prvním vygenerování pomocí AI lze soubor také automaticky přejmenovat podle jeho obsahu.
- **AI Slides** (.pptx): prázdná prezentace v editoru Slides.
- **AI Markdown** (.md): prázdný dokument Markdown v editoru Markdown.
- **AI HTML** (.html): prázdná webová stránka v editoru HTML.
- **AI PDF** (.pdf): ostatní se liší — **okamžitě** vytvoří skutečný prázdný jednostránkový PDF v cílové složce a otevře ho jako běžný soubor (editor PDF pracuje se skutečnými soubory). Hodí se pro poznámky, začernění nebo přidávání textu; při prvním uložení lze soubor automaticky přejmenovat podle jeho obsahu.
- **Otevřít místní soubor**: systémový výběr souborů pro Word (.docx/.doc/.odt), Excel (.xlsx/.xlsm/.xls/.csv/.tsv), PowerPoint (.pptx/.ppt), PDF, Markdown (.md/.markdown) a webové stránky (.html/.htm). Lze vybrat více souborů; každý dostane vlastní kartu. Textové soubory (.txt, .json) se tu také otevírají — přistanou v zobrazení zdroje editoru Markdown.

> Tip: Soubor ▸ Nový v pruhu nabídek vytvoří stejné typy dokumentů (⌘N/Ctrl+N ve výchozím stavu vytvoří textový dokument); přetažení souboru do okna ho otevře.

## Zeptejte se své znalostní báze

- Nejdřív dejte souborům hvězdičku (jakýkoli typ, který aplikace čte); hlavička panelu počítá korpus a prázdná báze vás vyzve, něco si označit.
- Odpovědi citují zdrojové soubory; kliknutí na citaci otevře soubor v jeho editoru.
- Vyžaduje připojenou AI; viz [Připojení předplatného](help://subscription). Konverzace žije jen v paměti — zavření aplikace ji ukončí.
- Hledání běží na lokálním indexu souborů jako na Domově; zmizelé soubory z korpusu tiše vypadnou.
- Skupiny organizují jen seznam S hvězdičkou — znalostní báze vždy zahrnuje všechny soubory s hvězdičkou.
