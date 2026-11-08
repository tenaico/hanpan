# Skróty klawiszowe

Każdy edytor ma własne przypisania klawiszy i tylko kilka z nich działa wszędzie. Ta strona to pełna lista pogrupowana według aplikacji, z układem macOS oraz Windows / Linux obok siebie.

## Przeczytaj najpierw

### Wszędzie w Hanpan (karty i okna)

| Czynność                                                                                 | Windows / Linux                | macOS                          |
| ---------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------ |
| Następna karta / poprzednia karta                                                        | Ctrl+Tab / Ctrl+Shift+Tab      | ⌃Tab / ⌃⇧Tab                   |
| Zamknij bieżącą kartę (na stronie głównej: okno, z pytaniem, jeśli są otwarte dokumenty) | Ctrl+W                         | ⌘W                             |
| Otwórz Ustawienia — na stronie głównej                                                   | Ctrl+,                         | ⌘,                             |
| Otwórz Podręcznik użytkownika                                                            | F1                             | F1                             |
| Wybierz kartę na pasku kart — gdy karta ma fokus                                         | ← / →, Enter, Delete (zamknij) | ← / →, Enter, Delete (zamknij) |

### Każdy edytor

**Od tego miejsca klawisze należą do edytora, który jest przed tobą, i zmieniają się wraz z przełączaniem kart.**

| Czynność                                                    | Windows / Linux | macOS |
| ----------------------------------------------------------- | --------------- | ----- |
| Otwórz Podręcznik użytkownika — działa wszędzie w aplikacji | F1              | F1    |
| Zwiń / rozwiń wstążkę — każdy edytor                        | Ctrl+F1         | ⌥⌘R   |
| Kompaktowa wstążka — tylko Docs                             | Ctrl+Alt+K      | ⌥⌘K   |
| Otwórz arkusz Skrótów klawiszowych — tylko Word             | Ctrl+/          | ⌘/    |

- **F1 otwiera ten podręcznik**, a nie arkusz skrótów. Należy do menu aplikacji, więc działa z poziomu Word, Sheets, Slides, PDF czy karty Home.
- **Przełącznik wstążki to `Ctrl+F1`, albo `⌥⌘R` na macOS.** Samo `F1` nic nie robi — F1 to podręcznik, a klawisz wstążki celowo go nie współdzieli. `Ctrl+F1` jest akceptowany także na macOS, ale `⌥⌘R` to klawisz używany przez Office dla Maca.
- **Arkusz Skrótów klawiszowych należy wyłącznie do Worda** (`⌘/`). Wypisuje dokładnie tabelę Worda poniżej. Żaden inny edytor go nie ma.

![Arkusz Skrótów klawiszowych w Wordzie: czynność po lewej, skrót po prawej, pogrupowane według Plik, Edycja, Formatowanie tekstu, Formatowanie akapitu, Wstawianie, Sprawdzanie i narzędzia, Widok](img/word-shortcuts.png)

- **`⌘O`, `⌘S` i `⌘P` są zaimplementowane osobno w każdym edytorze** i nie gedragen się dokładnie tak samo. `⌘P` w Wordzie najpierw tworzy podgląd wydruku, tak aby jedna wydrukowana strona odpowiadała jednej stronie na ekranie; w PDF otwiera okno drukowania PDF; Sheets i Slides znów mają własne.
- **Reszta jest zależna od aplikacji.** Gdy aktywna jest karta Word, `⌘B` to pogrubienie Worda. Gdy aktywny jest Slides, `⌘B` to pogrubienie Slides, a menu, do którego należy, nie jest tym, do którego jesteś przyzwyczajony. Tam, gdzie przypisanie działa tylko z zaznaczeniem lub w określonym panelu, kolumna Czynność to zaznacza.

## Tryb prezentacji

- **Start**: F5 w Word, PDF, Mindmap, HTML i Markdown. W arkuszu Ctrl+F5 (od A1) lub Shift+F5 (od aktywnej komórki). W dokumencie HWP Ctrl+F5 (tam F5 zaznacza komórki tabeli).
- **Inne wejścia**: w Word Ctrl+F5 i Shift+F5 otwierają widok czytania bez pełnego ekranu; w PDF zaczynają od bieżącej strony; w HTML prezentują w karcie.
- **Zakończenie**: Esc lub F5. F11 to pełny ekran okna i nie zmienia widoku dokumentu.

## Konwencje

- Kolumna macOS używa znanych symboli: `⌘` Command, `⌥` Option, `⇧` Shift, `⌃` Control.
- Kolumna Windows / Linux wypisuje je w pełni: `Ctrl`, `Alt`, `Shift`.
- Tam, gdzie GenOffice naprawdę potrzebuje innych klawiszy na dwóch platformach, tabela to pokazuje. Typowe przypadki to `⌃H` dla Znajdź i zamień (na macOS `⌘H` należy do Ukryj), `⌥⌘G` dla Przejdź do oraz klawisz zamykania w Slides.
- Skrót działający tylko z zaznaczeniem zapisano w kolumnie Czynność zamiast dawać mu osobną kolumnę, dzięki czemu tabela ma zawsze trzy kolumny.

## Word

Word ma pełny pasek menu, więc poniższe skróty pliku i formatowania działają zawsze, gdy karta Word ma fokus, niezależnie od otwartego dokumentu. Skróty edycji wymagają wczytanego, edytowalnego dokumentu z kursorem w tekście; nie działają, gdy piszesz w polu wyszukiwania, w wierszu polecenia AI ani w innym polu.

### Plik

| Czynność        | Windows / Linux | macOS |
| --------------- | --------------- | ----- |
| Nowy            | Ctrl+N          | ⌘N    |
| Nowe okno       | Ctrl+Shift+N    | ⇧⌘N   |
| Otwórz…         | Ctrl+O          | ⌘O    |
| Zapisz          | Ctrl+S          | ⌘S    |
| Zapisz jako…    | Ctrl+Shift+S    | ⇧⌘S   |
| Drukuj          | Ctrl+P          | ⌘P    |
| Zamknij (karta) | Ctrl+W          | ⌘W    |

⌘P to nie jest drukowanie przeglądarki. Word najpierw układa podgląd wydruku, tak aby jedna wydrukowana strona była dokładnie jedną stroną na ekranie, a potem otwiera własne okno drukowania.

### Edycja

| Czynność                | Windows / Linux | macOS |
| ----------------------- | --------------- | ----- |
| Cofnij                  | Ctrl+Z          | ⌘Z    |
| Ponów                   | Ctrl+Shift+Z    | ⇧⌘Z   |
| Wytnij                  | Ctrl+X          | ⌘X    |
| Kopiuj                  | Ctrl+C          | ⌘C    |
| Wklej                   | Ctrl+V          | ⌘V    |
| Wklej jako czysty tekst | Ctrl+Shift+V    | ⌥⇧⌘V  |
| Zaznacz wszystko        | Ctrl+A          | ⌘A    |
| Znajdź                  | Ctrl+F          | ⌘F    |
| Zamień                  | Ctrl+H          | ⌃H    |
| Przejdź do              | Ctrl+G          | ⌥⌘G   |
| Skróty klawiszowe       | Ctrl+/          | ⌘/    |

Zamień to na obu platformach Ctrl+H, ponieważ ⌘H ukrywa okno w macOS i nigdy nie trafia do Worda. Przejdź do stosuje podział samego Worda: ⌥⌘G na Macu, dzięki czemu ⇧⌘G zostaje wolny dla Liczby słów.

### Formatowanie tekstu

| Czynność                                    | Windows / Linux       | macOS    |
| ------------------------------------------- | --------------------- | -------- |
| Pogrubienie                                 | Ctrl+B                | ⌘B       |
| Pochylenie                                  | Ctrl+I                | ⌘I       |
| Podkreślenie                                | Ctrl+U                | ⌘U       |
| Czcionka… (okno dialogowe)                  | Ctrl+D                | ⌘D       |
| Zwiększ rozmiar czcionki                    | Ctrl+Shift+.          | ⇧⌘.      |
| Zmniejsz rozmiar czcionki                   | Ctrl+Shift+,          | ⇧⌘,      |
| Zwiększ rozmiar czcionki o 1 pt             | Ctrl+]                | ⌘]       |
| Zmniejsz rozmiar czcionki o 1 pt            | Ctrl+[                | ⌘[       |
| Superskrypt                                 | Ctrl+Shift+= / Ctrl+. | ⇧⌘= / ⌘. |
| Podskrypt                                   | Ctrl+,                | ⌘,       |
| Zmień wielkość liter                        | Shift+F3              | ⇧F3      |
| Kopiuj formatowanie (z zaznaczonym tekstem) | Ctrl+Shift+C          | ⇧⌘C      |
| Wklej formatowanie (po Kopiuj formatowanie) | Ctrl+Alt+Shift+V      | ⇧⌘V      |
| Wyczyść całe formatowanie                   | Ctrl+Space            | ⌃␣       |

Dwa skróty malarza formatów to jedyne miejsce, w którym klawisz Windows nie jest zwykłą zmianą nazwy: Wklej formatowanie zawiera Alt, bo Ctrl+Shift+V tam już wkleja i dopasowuje styl.

### Formatowanie akapitu

| Czynność                                     | Windows / Linux | macOS |
| -------------------------------------------- | --------------- | ----- |
| Wyrównaj do lewej                            | Ctrl+L          | ⌘L    |
| Wyśrodkuj                                    | Ctrl+E          | ⌘E    |
| Wyrównaj do prawej                           | Ctrl+R          | ⌘R    |
| Wyjustuj                                     | Ctrl+J          | ⌘J    |
| Odstęp wiersza 1,0                           | Ctrl+1          | ⌘1    |
| Odstęp wiersza 1,5                           | Ctrl+5          | ⌘5    |
| Odstęp wiersza 2,0                           | Ctrl+2          | ⌘2    |
| Zwiększ wcięcie                              | Ctrl+M          | ⌃M    |
| Zmniejsz wcięcie                             | Ctrl+Shift+M    | ⌃⇧M   |
| Wcięcie wiszące                              | Ctrl+T          | ⌘T    |
| Usuń wcięcie wiszące                         | Ctrl+Shift+T    | ⇧⌘T   |
| Wyczyść formatowanie akapitu                 | Ctrl+Q          | ⌃Q    |
| Normalny (styl)                              | Ctrl+Alt+0      | ⌥⌘0   |
| Nagłówek 1 (styl)                            | Ctrl+Alt+1      | ⌥⌘1   |
| Nagłówek 2 (styl)                            | Ctrl+Alt+2      | ⌥⌘2   |
| Nagłówek 3 (styl)                            | Ctrl+Alt+3      | ⌥⌘3   |
| Akapit… (okno dialogowe)                     | Ctrl+Alt+M      | ⌥⌘M   |
| Przesuń akapit w górę                        | Alt+Shift+↑     | ⌥⇧↑   |
| Przesuń akapit w dół                         | Alt+Shift+↓     | ⌥⇧↓   |
| Obniż element listy (na początku elementu)   | Tab             | Tab   |
| Podnieś element listy (na początku elementu) | Shift+Tab       | ⇧Tab  |

Wcięcie, wcięcie wiszące i Wyczyść formatowanie akapitu działają na obu platformach tylko przez Ctrl: ⌘M minimalizuje okno, a ⌘Q kończy pracę, więc skrót z Command byłby po cichu zmianą w tekście tuż przed zamknięciem. Tab zmienia poziom listy tylko wtedy, gdy kursor znajduje się na początku elementu lub obejmuje kilka elementów; w środku tekstu wstawia znak tabulacji, a ⇧Tab zawsze podnosi poziom.

### Wstawianie

| Czynność                 | Windows / Linux  | macOS |
| ------------------------ | ---------------- | ----- |
| Podział strony           | Ctrl+Enter       | ⌘⏎    |
| Podział kolumny          | Ctrl+Shift+Enter | ⇧⌘⏎   |
| Podział wiersza          | Shift+Enter      | ⇧⏎    |
| Wstaw odnośnik…          | Ctrl+K           | ⌘K    |
| Nowy komentarz           | Ctrl+Alt+A       | ⌥⌘A   |
| Wstaw przypis dolny      | Ctrl+Alt+F       | ⌥⌘F   |
| Wstaw przypis końcowy    | Ctrl+Alt+D       | ⌥⌘E   |
| Data (pole)              | Alt+Shift+D      | ⌥⇧D   |
| Godzina (pole)           | Alt+Shift+T      | ⌥⇧T   |
| Spacja nierozdzielająca  | Ctrl+Shift+Space | ⇧⌘␣   |
| Łącznik nierozdzielający | Ctrl+Shift+-     | ⇧⌘-   |

Wstaw przypis końcowy to prawdziwy podział platform, a nie zmiana nazwy: Word używa ⌥⌘E na Macu, bo ⌥⌘D tam należy do Docka.

### Sprawdzanie i narzędzia

| Czynność                     | Windows / Linux | macOS |
| ---------------------------- | --------------- | ----- |
| Śledź zmiany                 | Ctrl+Shift+E    | ⇧⌘E   |
| Liczba słów                  | Ctrl+Shift+G    | ⇧⌘G   |
| Sprawdź pisownię i gramatykę | F7              | F7    |
| Aktualizuj pole              | F9              | F9    |
| Pokaż / ukryj kody pól       | Alt+F9          | ⌥F9   |

F7 uruchamia sprawdzanie przez AI, a F9 aktualizuje pola; oba wymagają wczytanego dokumentu. Gdy ograniczenie edycji włączy Śledź zmiany, nie da się go już wyłączyć.

### Widok

| Czynność                         | Windows / Linux | macOS |
| -------------------------------- | --------------- | ----- |
| Powiększ                         | Ctrl+=          | ⌘=    |
| Pomniejsz                        | Ctrl+-          | ⌘-    |
| Powiększ do 100%                 | Ctrl+0          | ⌘0    |
| Pokaż / ukryj znaki formatowania | Ctrl+Shift+8    | ⌘8    |

Skrót znaków formatowania stosuje podział samego Worda: ⌘8 wobec Ctrl+Shift+8. Zoom obsługuje Word tylko przez trzy powyższe skróty menu — ⌘+ tutaj nic nie robi.

F1 otwiera **Podręcznik użytkownika**, a nie tę listę. Arkusz skrótów to ⌘/ lub Ctrl+/, a to pozycja menu Worda, więc pojawia się tylko przy aktywnej karcie Word.

## Sheets

GenOffice Sheets otwiera i zapisuje skoroszyty .xlsx. Większość poniższych skrótów to skróty typowe dla programów arkuszy kalkulacyjnych, więc wiele z nich pewnie już znasz.

> **Edycja ma pierwszeństwo.** Prawie każdy skrót w Sheets jest ignorowany, gdy edytujesz komórkę lub piszesz w **pasku formuły**, aby wpisywanie, przesuwanie kursora i Backspace zachowały swoje zwykłe znaczenie przy edycji tekstu. Jeśli klawisz robi wrażenie, że nic nie robi, sprawdź, czy nie jesteś w trakcie edycji: najpierw naciśnij Esc albo Enter, a potem spróbuj ponownie. Polecenia działające na zaznaczeniu również nic nie robią, gdy otwarte jest okno dialogowe. Tam, gdzie skrót jest wyjątkiem od tej reguły, tabela to zaznacza.

Dwie konwencje są swoiste dla Sheets. `⌘` i `⌃` zajmują to samo miejsce modyfikatora — oba są akceptowane na każdej platformie, więc `⌘1` i `Ctrl+1` to ten sam skrót. **Pusta komórka w kolumnie Windows / Linux oznacza, że skrót istnieje tylko w macOS.**

### Nawigacja

| Czynność                                                     | Windows / Linux | macOS      |
| ------------------------------------------------------------ | --------------- | ---------- |
| Następny arkusz                                              | Ctrl+PgDn       | ⌘PgDn      |
| Poprzedni arkusz                                             | Ctrl+PgUp       | ⌘PgUp      |
| Następny arkusz (zgodnie z Excelem dla Maca)                 |                 | ⌥→         |
| Poprzedni arkusz (zgodnie z Excelem dla Maca)                |                 | ⌥←         |
| Przejdź do pierwszej komórki niezamrożonej                   | Ctrl+Home       | ⌘Home      |
| Przejdź do ostatniej użytej komórki (treść lub formatowanie) | Ctrl+End        | ⌘End       |
| Okno Przejdź do                                              | Ctrl+G, F5      | ⌘G, F5     |
| Wstaw nowy arkusz                                            | Shift+F11       | ⇧F11       |
| Przesuń aktywną komórkę o ekran w dół (i przewiń)            | Page Down       | Page Down  |
| Przesuń aktywną komórkę o ekran w górę (i przewiń)           | Page Up         | Page Up    |
| Przesuń aktywną komórkę o ekran w prawo (i przewiń)          | Alt+Page Down   | ⌥Page Down |
| Przesuń aktywną komórkę o ekran w lewo (i przewiń)           | Alt+Page Up     | ⌥Page Up   |

### Zaznaczanie

| Czynność                                                                            | Windows / Linux                                     | macOS           |
| ----------------------------------------------------------------------------------- | --------------------------------------------------- | --------------- |
| Zaznacz całą kolumnę aktywnej komórki                                               | Ctrl+Space                                          | ⌃Space          |
| Zaznacz cały wiersz aktywnej komórki                                                | Shift+Space                                         | ⇧Space          |
| Przejdź do krawędzi bloku danych — dowolna z czterech strzałek                      | Ctrl+↑ Ctrl+↓ Ctrl+← Ctrl+→                         | ⌘↑ ⌘↓ ⌘← ⌘→     |
| Rozszerz zaznaczenie do krawędzi bloku danych; naciśnij ponownie, aby je zmniejszyć | Ctrl+Shift+↑ Ctrl+Shift+↓ Ctrl+Shift+← Ctrl+Shift+→ | ⌘⇧↑ ⌘⇧↓ ⌘⇧← ⌘⇧→ |
| Przejdź do pierwszej kolumny bieżącego wiersza                                      | Home                                                | Home            |

### Edycja

| Czynność                                                                                                        | Windows / Linux      | macOS                     |
| --------------------------------------------------------------------------------------------------------------- | -------------------- | ------------------------- |
| Wypełnij całe zaznaczenie bieżącym wpisem                                                                       | Ctrl+Enter           | ⌃⏎ lub ⌘⏎                 |
| Rozpocznij nowy wiersz w komórce                                                                                | Alt+Enter            | ⌥⏎, lub ⌃⌥⏎ / ⌘⌥⏎ na Macu |
| Edytuj aktywną komórkę w miejscu                                                                                | F2                   | F2                        |
| Pogrubienie                                                                                                     | Ctrl+B               | ⌘B                        |
| Pochylenie                                                                                                      | Ctrl+I               | ⌘I                        |
| Podkreślenie                                                                                                    | Ctrl+U               | ⌘U                        |
| Znajdź                                                                                                          | Ctrl+F               | ⌘F                        |
| Wypełnij w prawo od lewej zaznaczonej kolumny                                                                   | Ctrl+R               | ⌘R                        |
| Przełącz odwołanie w formule między względne a bezwzględne                                                      | F4                   | F4                        |
| Przełącz odwołanie w formule między względne a bezwzględne (zgodnie z Excelem dla Maca, podczas edycji komórki) |                      | ⌘T                        |
| Kopiuj                                                                                                          | Ctrl+C               | ⌘C                        |
| Wytnij                                                                                                          | Ctrl+X               | ⌘X                        |
| Wklej                                                                                                           | Ctrl+V               | ⌘V                        |
| Wklej tylko wartości                                                                                            | Ctrl+Shift+V         | ⌘⇧V                       |
| Szybkie wypełnienie na podstawie wzorca powyżej                                                                 | Ctrl+E               | ⌘E                        |
| Cofnij                                                                                                          | Ctrl+Z               | ⌘Z                        |
| Ponów                                                                                                           | Ctrl+Shift+Z         | ⇧⌘Z                       |
| Zaznacz cały arkusz                                                                                             | Ctrl+A               | ⌘A                        |
| Wstaw dzisiejszą datę                                                                                           | Ctrl+;               | ⌘;                        |
| Wstaw bieżący czas                                                                                              | Ctrl+Shift+;         | ⌘⇧;                       |
| Wyczyść zawartość wszystkich zaznaczonych komórek                                                               | Backspace lub Delete | ⌫ lub ⌦                   |

AutoSum działa tylko w macOS. Naciśnij ⌘⇧T.

### Formatowanie

| Czynność                                                         | Windows / Linux | macOS |
| ---------------------------------------------------------------- | --------------- | ----- |
| Okno Formatuj komórki                                            | Ctrl+1          | ⌘1    |
| Przekreślenie (z zaznaczonymi komórkami)                         | Ctrl+5          | ⌘5    |
| Zwiększ rozmiar czcionki (z zaznaczonymi komórkami)              | Ctrl+Shift+.    | ⌘⇧.   |
| Zmniejsz rozmiar czcionki (z zaznaczonymi komórkami)             | Ctrl+Shift+,    | ⌘⇧,   |
| Format liczby: Ogólny                                            | Ctrl+Shift+`    | ⌘⇧`   |
| Format liczby: liczba z dwoma miejscami po przecinku             | Ctrl+Shift+1    | ⌘⇧1   |
| Format liczby: czas `h:mm AM/PM`                                 | Ctrl+Shift+2    | ⌘⇧2   |
| Format liczby: data `d-mmm-yy`                                   | Ctrl+Shift+3    | ⌘⇧3   |
| Format liczby: waluta                                            | Ctrl+Shift+4    | ⌘⇧4   |
| Format liczby: procent                                           | Ctrl+Shift+5    | ⌘⇧5   |
| Format liczby: naukowy                                           | Ctrl+Shift+6    | ⌘⇧6   |
| Wszystkie obramowania (z zaznaczonymi komórkami)                 | Ctrl+Shift+7    | ⌘⇧7   |
| Bez obramowań (z zaznaczonymi komórkami)                         | Ctrl+Shift+-    | ⌘⇧-   |
| Anuluj Malarz formatów (tylko gdy Malarz formatów jest włączony) | Esc             | Esc   |

### Wstawianie i usuwanie

| Czynność                                                                                              | Windows / Linux                          | macOS                                 |
| ----------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------- |
| Wstaw komórki — całe wiersze lub kolumny wstawiają się od razu, wszystko inne otwiera okno Wstawianie | Ctrl+Shift+=                             | ⌘⇧=                                   |
| Wstaw komórki — `+` na klawiaturze numerycznej, to samo okno                                          | Ctrl oraz `+` na klawiaturze numerycznej | ⌘ oraz `+` na klawiaturze numerycznej |
| Usuń komórki — całe wiersze lub kolumny usuwają się od razu, wszystko inne otwiera okno Usuwanie      | Ctrl+-                                   | ⌘-                                    |
| Usuń komórki — `-` na klawiaturze numerycznej, to samo okno                                           | Ctrl oraz `-` na klawiaturze numerycznej | ⌘ oraz `-` na klawiaturze numerycznej |
| Ukryj zaznaczone wiersze                                                                              | Ctrl+9                                   | ⌘9                                    |
| Pokaż ukryte wiersze w zaznaczeniu                                                                    | Ctrl+Shift+9                             | ⌘⇧9                                   |
| Ukryj zaznaczone kolumny                                                                              | Ctrl+0                                   | ⌘0                                    |
| Pokaż ukryte kolumny w zaznaczeniu                                                                    | Ctrl+Shift+0                             | ⌘⇧0                                   |

### Dane i sprawdzanie

| Czynność                                              | Windows / Linux | macOS |
| ----------------------------------------------------- | --------------- | ----- |
| Okno Wstaw funkcję                                    | Shift+F3        | ⇧F3   |
| Menedżer nazw                                         | Ctrl+F3         | ⌃F3   |
| Dodaj lub edytuj notatkę na aktywnej komórce          | Shift+F2        | ⇧F2   |
| Wstaw hiperłącze                                      | Ctrl+K          | ⌘K    |
| Prześledź poprzedniki (komórka musi zawierać formułę) | Ctrl+[          | ⌘[    |
| Prześledź następne                                    | Ctrl+]          | ⌘]    |
| Grupuj zaznaczone wiersze                             | Alt+Shift+→     | ⌥⇧→   |
| Rozgrupuj zaznaczone wiersze                          | Alt+Shift+←     | ⌥⇧←   |
| Przelicz cały skoroszyt                               | F9              | F9    |
| Przelicz tylko aktywny arkusz                         | Shift+F9        | ⇧F9   |
| Włącz lub wyłącz filtr w zaznaczonym zakresie         |                 | ⌘⇧F   |

Skrót filtru Excela, Ctrl+Shift+L, nie działa w Windows ani Linux. Naciśnij ⌘⇧F w macOS albo użyj polecenia filtru na wstążce na dowolnej platformie.

### Okno

| Czynność                                                        | Windows / Linux    | macOS           |
| --------------------------------------------------------------- | ------------------ | --------------- |
| Zapisz skoroszyt                                                | Ctrl+S             | ⌘S              |
| Zapisz jako                                                     | Ctrl+Shift+S       | ⇧⌘S             |
| Otwórz skoroszyt                                                | Ctrl+O             | ⌘O              |
| Drukuj                                                          | Ctrl+P             | ⌘P              |
| Zamknij skoroszyt (macOS) / Zakończ aplikację (Windows i Linux) | Ctrl+Q             | ⌘W              |
| Otwórz Podręcznik użytkownika                                   | F1                 | F1              |
| Powiększ                                                        | Ctrl+=             | ⌘=              |
| Zoom kółkiem myszy                                              | Ctrl + przewijanie | ⌘ + przewijanie |
| Pokaż lub ukryj formuły w komórkach                             | Ctrl+`             | ⌘`              |
| Rozwiń lub zwiń pasek formuły                                   | Ctrl+Shift+U       | ⌘⇧U             |

## Slides

GenOffice Slides to edytor prezentacji w stylu PowerPointa. Większość klawiszy robi to samo niezależnie od miejsca, ale kilka zmienia znaczenie zależnie od fokusu — w polu tekstowym albo gdy **panel miniatur**, **panel konspektu** lub **sortowanie slajdów** ma fokus klawiatury. Takie przypadki są oznaczone w kolumnie Czynność.

### Plik i aplikacja

| Czynność                   | Windows / Linux | macOS |
| -------------------------- | --------------- | ----- |
| Zapisz                     | Ctrl+S          | ⌘S    |
| Zapisz jako                | Ctrl+Shift+S    | ⇧⌘S   |
| Otwórz                     | Ctrl+O          | ⌘O    |
| Zamknij bieżącą kartę      | Ctrl+Q          | ⌘W    |
| Drukuj                     | Ctrl+P          | ⌘P    |
| Cofnij                     | Ctrl+Z          | ⌘Z    |
| Ponów                      | Ctrl+Shift+Z    | ⇧⌘Z   |
| Ponów (skrót alternatywny) | Ctrl+Y          | ⌘Y    |

Zamykanie karty to jedyne miejsce, w którym obie platformy dzielą się całkowicie: ⌘W w macOS, a w Windows i Linux Ctrl+Q, który kończy całą aplikację, a nie kartę.

### Edycja

| Czynność                                                   | Windows / Linux | macOS  |
| ---------------------------------------------------------- | --------------- | ------ |
| Nowy slajd                                                 | Ctrl+M          | ⇧⌘N    |
| Znajdź (nie podczas edycji tekstu w kształcie)             | Ctrl+F          | ⌘F     |
| Opisz zaznaczenie za pomocą AI (z zaznaczonymi kształtami) | Ctrl+K          | ⌘K     |
| Powiększ                                                   | Ctrl+=          | ⌘=     |
| Pomniejsz                                                  | Ctrl+-          | ⌘-     |
| Rozmiar rzeczywisty (100%)                                 | Ctrl+0          | ⌘0     |
| Zaznacz wszystko                                           | Ctrl+A          | ⌘A     |
| Przechodź po zaznaczeniu kształtów do przodu / do tyłu     | Tab / Shift+Tab | ⇥ / ⇧⇥ |

Nowy slajd to drugi podział platform. Każda platforma ma własny klawisz, a drugi nic nie robi: ⇧⌘N w macOS, Ctrl+M w Windows i Linux. ⌘M nie może tego zrobić w macOS, bo jest systemowym skrótem Minimalizuj.

Zaznacz wszystko zależy od fokusu: przy fokusie na panel miniatur, panelu konspektu lub sortowaniu slajdów zaznacza wszystkie slajdy, a wszędzie indziej wszystkie elementy bieżącego slajdu. Tab przechodzi po kształtach slajdu i tylko wtedy, gdy fokus ma sama plansza slajdu.

### Formatowanie tekstu

Działają na tekst zaznaczonego kształtu albo na akapit kursora, gdy jesteś w polu tekstowym.

| Czynność                            | Windows / Linux | macOS |
| ----------------------------------- | --------------- | ----- |
| Pogrubienie                         | Ctrl+B          | ⌘B    |
| Pochylenie                          | Ctrl+I          | ⌘I    |
| Podkreślenie                        | Ctrl+U          | ⌘U    |
| Wyrównaj do lewej                   | Ctrl+L          | ⌘L    |
| Wyśrodkuj                           | Ctrl+E          | ⌘E    |
| Wyrównaj do prawej                  | Ctrl+R          | ⌘R    |
| Wyjustuj                            | Ctrl+J          | ⌘J    |
| Zwiększ rozmiar czcionki o 1 pt     | Ctrl+]          | ⌘]    |
| Zmniejsz rozmiar czcionki o 1 pt    | Ctrl+[          | ⌘[    |
| Następny rozmiar czcionki na skali  | Ctrl+Shift+>    | ⇧⌘>   |
| Poprzedni rozmiar czcionki na skali | Ctrl+Shift+<    | ⇧⌘<   |

Klawisze skali czcionki przyjmują też klawisze . i , z wciśniętym Shift, w układach klawiatury, które zgłaszają je zamiast klawiszy interpunkcyjnych.

### Schowek i obiekty

| Czynność                                             | Windows / Linux    | macOS       |
| ---------------------------------------------------- | ------------------ | ----------- |
| Kopiuj                                               | Ctrl+C             | ⌘C          |
| Wytnij                                               | Ctrl+X             | ⌘X          |
| Wklej                                                | Ctrl+V             | ⌘V          |
| Wklej tylko format                                   | Ctrl+Shift+V       | ⇧⌘V         |
| Kopiuj tylko format (z zaznaczonymi kształtami)      | Ctrl+Shift+C       | ⇧⌘C         |
| Duplikuj w miejscu (z zaznaczonymi kształtami)       | Ctrl+D             | ⌘D          |
| Grupuj zaznaczenie (z zaznaczonymi kształtami)       | Ctrl+G             | ⌘G          |
| Rozgrupuj zaznaczenie (z zaznaczonymi kształtami)    | Ctrl+Shift+G       | ⇧⌘G         |
| Usuń zaznaczenie (z zaznaczonymi kształtami)         | Backspace / Delete | ⌫ / Delete  |
| Usuń zaznaczony wierzchołek (w trybie Edytuj punkty) | Backspace / Delete | ⌫ / Delete  |
| Przesuń zaznaczenie (z zaznaczonymi kształtami)      | Arrow keys         | ↑ ↓ ← →     |
| Przesuń o jeden piksel ekranu                        | Ctrl+Arrow keys    | ⌘↑ ⌘↓ ⌘← ⌘→ |
| Zmień rozmiar względem środka                        | Shift+Arrow keys   | ⇧↑ ⇧↓ ⇧← ⇧→ |

W polu tekstowym kopiowanie, wycinanie i wklejanie dotyczą tekstu, a nie kształtu. Shift ze strzałkami zmienia rozmiar każdego kształtu wokół jego środka, nie rusza łączników i zatwierdza zaznaczenie wielokrotne jako jeden krok Cofnij.

### Slajdy — fokus na panel miniatur, panelu konspektu lub sortowaniu

Polecenia na poziomie slajdu w rodzaju PowerPointa działają tylko wtedy, gdy fokus klawiatury ma jeden z tych trzech paneli.

| Czynność                                               | Windows / Linux                                 | macOS                           |
| ------------------------------------------------------ | ----------------------------------------------- | ------------------------------- |
| Poprzedni / następny slajd                             | ArrowUp / ArrowDown (także Page Up / Page Down) | ↑ ↓ (także Page Up / Page Down) |
| Pierwszy / ostatni slajd                               | Home / End                                      | Home / End                      |
| Rozszerz zaznaczenie do pierwszego / ostatniego slajdu | Shift+Home / Shift+End                          | ⇧Home / ⇧End                    |
| Zaznacz wszystkie slajdy                               | Ctrl+A                                          | ⌘A                              |
| Usuń zaznaczone slajdy                                 | Backspace / Delete                              | ⌫ / Delete                      |
| Kopiuj slajdy                                          | Ctrl+C                                          | ⌘C                              |
| Wytnij slajdy                                          | Ctrl+X                                          | ⌘X                              |

Poruszanie się między slajdami strzałkami to wyjątek — działa także z planszy, bez niczego zaznaczonego. Usuwanie slajdów nie działa, gdy aktywne jest narzędzie pióra ani w **trybie czytania**.

### W polu tekstowym

| Czynność                                                        | Windows / Linux                       | macOS                             |
| --------------------------------------------------------------- | ------------------------------------- | --------------------------------- |
| Rozpocznij edycję tekstu w zaznaczonym kształcie tekstowym      | dowolny znak do wydruku, Enter lub F2 | dowolny znak do wydruku, ⏎ lub F2 |
| Zatwierdź tekst i zaznacz kształt ponownie                      | Esc lub F2                            | Esc lub F2                        |
| Zatwierdź tekst i zaznacz kształt ponownie (skrót alternatywny) | Ctrl+⏎                                | ⌘⏎                                |
| Przejdź do następnego symbolu zastępczego                       | Ctrl+⏎                                | ⌃⏎                                |
| Obniż / podnieś poziom listy                                    | Tab / Shift+Tab                       | ⇥ / ⇧⇥                            |
| Następna / poprzednia komórka tabeli                            | Tab / Shift+Tab                       | ⇥ / ⇧⇥                            |
| Miękki podział wiersza                                          | Shift+⏎                               | ⇧⏎                                |

Tab znaczy dwie różne rzeczy: następną komórkę w tabeli oraz obniżenie poziomu listy w kształcie tekstowym.

### Pokaz slajdów

| Czynność                       | Windows / Linux                      | macOS             |
| ------------------------------ | ------------------------------------ | ----------------- |
| Rozpocznij od początku         | F5                                   | F5                |
| Rozpocznij od bieżącego slajdu | ⇧F5                                  | ⇧F5 lub ⌘⏎        |
| Następny slajd                 | Right, Down, Space, Enter, Page Down | → ↓ ␣ ⏎ Page Down |
| Poprzedni slajd                | Left, Up, Page Up                    | ← ↑ Page Up       |
| Pierwszy slajd                 | Home                                 | Home              |
| Ostatni slajd                  | End                                  | End               |
| Przejdź do slajdu N            | wpisz N, potem Enter                 | wpisz N, potem ⏎  |
| Czarny ekran                   | B lub .                              | B lub .           |
| Biały ekran                    | W lub ,                              | W lub ,           |
| Przywróć po zaciemnieniu       | dowolny klawisz                      | dowolny klawisz   |
| Zakończ pokaz                  | Esc                                  | Esc               |

Rozpoczynanie od bieżącego slajdu działa w macOS zarówno przez ⌘⏎, jak i przez ⇧F5. W Windows ten sam klawisz pozostaje zarezerwowany do przechodzenia między symbolami zastępczymi.

### Tryb czytania

| Czynność               | Windows / Linux                      | macOS             |
| ---------------------- | ------------------------------------ | ----------------- |
| Następny slajd         | Right, Down, Space, Enter, Page Down | → ↓ ␣ ⏎ Page Down |
| Poprzedni slajd        | Left, Up, Page Up                    | ← ↑ Page Up       |
| Wyjdź z trybu czytania | Esc                                  | Esc               |

Naciśnij **Esc**, aby wycofać się z czegokolwiek, w czym jesteś — kadrowania, rysowanego kształtu, **Edytuj punkty**, grupy, pióra, zakreślacza lub gumki, odtwarzacza albo **trybu czytania** — i aby wyczyścić zaznaczenie.

Jeszcze dwa to modyfikatory, a nie skróty: przytrzymaj **Shift** podczas rysowania, aby zachować proporcje nowego kształtu, i przytrzymaj **Shift** podczas obracania, aby przeskakiwać co 15°.

## PDF

PDF nie ma własnego menu, więc każdy skrót poniżej podąża za aktywną kartą i działa tylko wtedy, gdy karta PDF jest na wierzchu.

### Plik i edycja

| Czynność                     | Windows / Linux | macOS |
| ---------------------------- | --------------- | ----- |
| Zapisz                       | Ctrl+S          | ⌘S    |
| Cofnij                       | Ctrl+Z          | ⌘Z    |
| Ponów                        | Ctrl+Shift+Z    | ⇧⌘Z   |
| Znajdź (otwórz wyszukiwanie) | Ctrl+F          | ⌘F    |
| Drukuj                       | Ctrl+P          | ⌘P    |

Cofnij i Ponów przechodzą po historii dokumentu; gdy kursor znajduje się w polu tekstowym, zostawiają ⌘Z temu polu. ⌘P otwiera to samo okno drukowania w aplikacji co przycisk Drukuj na pasku narzędzi.

### Widok

| Czynność            | Windows / Linux          | macOS                 |
| ------------------- | ------------------------ | --------------------- |
| Powiększ            | Ctrl+=                   | ⌘=                    |
| Pomniejsz           | Ctrl+-                   | ⌘-                    |
| Dopasuj szerokość   | Ctrl+0                   | ⌘0                    |
| Powiększanie ciągłe | Ctrl + kółko przewijania | ⌘ + kółko przewijania |

Powiększ reaguje też na ⌘+ i Ctrl++.

### Nawigacja po stronach

| Czynność                     | Windows / Linux    | macOS              |
| ---------------------------- | ------------------ | ------------------ |
| Następna strona              | →                  | →                  |
| Poprzednia strona            | ←                  | ←                  |
| Przewiń o jeden ekran w dół  | PageDown lub Space | PageDown lub Space |
| Przewiń o jeden ekran w górę | PageUp             | PageUp             |
| Przewiń w dół                | ↓                  | ↓                  |
| Przewiń w górę               | ↑                  | ↑                  |
| Przejdź do pierwszej strony  | Home               | Home               |
| Przejdź do ostatniej strony  | End                | End                |

Te klawisze nie mają modyfikatora, więc obie platformy wyglądają tak samo. ↓ i ↑ to jedyny wiersz, który zmienia się zależnie od fokusu: w dokumencie przesuwają stronę, a przy fokusie w panelu miniatur przeskakują o całą stronę. Nic nie robią, gdy piszesz w polu.

### Zaznaczanie i edycja

| Czynność                  | Windows / Linux      | macOS                |
| ------------------------- | -------------------- | -------------------- |
| Usuń zaznaczoną adnotację | Delete lub Backspace | Delete lub Backspace |

Działa tylko wtedy, gdy zaznaczono adnotację, pieczec, zaciemnienie lub obraz.

### Pasek miniatur

| Działanie                   | Windows / Linux      | macOS                |
| --------------------------- | -------------------- | -------------------- |
| Wybieranie stron pojedynczo | Ctrl + kliknięcie    | ⌘ + kliknięcie       |
| Wybieranie ciągu stron      | Shift + kliknięcie   | ⇧ + kliknięcie       |
| Wybieranie wszystkich stron | Ctrl+A               | ⌘A                   |
| Usuwanie wybranych stron    | Delete lub Backspace | Delete lub Backspace |

Wybrane strony są zabarwione. Kliknięcie prawym przyciskiem jednej z nich lub karta Strona obraca, usuwa albo wyodrębnia je razem; przeciągnięcie jednej przenosi wszystkie. Escape lub zwykłe kliknięcie strony usuwa wybór. ⌘A i Delete działają, gdy pasek ma fokus.

### Escape i okna dialogowe

| Czynność                         | Windows / Linux | macOS  |
| -------------------------------- | --------------- | ------ |
| Anuluj najwyższy stan            | Escape          | Escape |
| Potwierdź otwarte okno dialogowe | Enter           | Enter  |

Escape cofa jedną warstwę naraz — najpierw otwarte okno dialogowe, potem wyskakujące okno AI, szkic tekstu, panel wyszukiwania, a na końcu samo zaznaczenie. Gdy kursor jest w polu wyszukiwania, Enter i ⇧Enter przechodzą do następnego i poprzedniego dopasowania, a Escape zamyka panel; gdy kursor jest w nowej notatce tekstowej, ⌘⏎ ją zatwierdza.

## Markdown

GenOffice Markdown edytuje Markdown z podglądem na żywo obok.

### Plik i widok

| Czynność                   | Windows / Linux   | macOS     |
| -------------------------- | ----------------- | --------- |
| Zapisz                     | Ctrl+S            | ⌘S        |
| Zapisz jako                | Ctrl+Shift+S      | ⇧⌘S       |
| Drukuj                     | Ctrl+P            | ⌘P        |
| Znajdź                     | Ctrl+F            | ⌘F        |
| Przełącz źródło / podgląd  | Ctrl+E            | ⌘E        |
| Powiększ                   | Ctrl+= lub Ctrl++ | ⌘= lub ⌘+ |
| Pomniejsz                  | Ctrl+-            | ⌘-        |
| Rozmiar rzeczywisty (100%) | Ctrl+0            | ⌘0        |

Pomniejsz działa też przez ⌘_ i Ctrl+_. Zoom działa także przy ściskaniu trackpada albo przytrzymaniu ⌘ lub Ctrl i przewijaniu nad dokumentem.

### Bloki

| Czynność                                                     | Windows / Linux      | macOS |
| ------------------------------------------------------------ | -------------------- | ----- |
| Duplikuj zaznaczone bloki                                    | Ctrl+D               | ⌘D    |
| Usuń zaznaczone bloki                                        | Ctrl+Shift+Backspace | ⇧⌘⌫   |
| Przesuń zaznaczony blok w górę                               | Ctrl+Shift+ArrowUp   | ⇧⌘↑   |
| Przesuń zaznaczony blok w dół                                | Ctrl+Shift+ArrowDown | ⇧⌘↓   |
| Wstaw odnośnik na zaznaczeniu                                | Ctrl+K               | ⌘K    |
| Usuń odnośnik (naciśnij ponownie, gdy odnośnik jest aktywny) | Ctrl+K               | ⌘K    |

### W bloku matematycznym

Działają tylko, gdy otwarty jest pływający edytor LaTeX.

| Czynność                        | Windows / Linux | macOS |
| ------------------------------- | --------------- | ----- |
| Zastosuj wzór                   | Ctrl+⏎          | ⌘⏎    |
| Zamknij edytor bez zastosowania | Esc             | Esc   |

Zastosowanie pustego wzoru usuwa zamiast tego blok. Edytor zamyka się także przy każdej zmianie w dokumencie, a kliknięcie poza nim go odrzuca.

## HTML

GenOffice HTML pokazuje edytor kodu obok podglądu na żywo. Klawisze działające na elemencie strony działają tylko wtedy, gdy sam podgląd ma fokus klawiatury.

### Plik i widok źródła

| Czynność                                      | Windows / Linux   | macOS     |
| --------------------------------------------- | ----------------- | --------- |
| Zapisz                                        | Ctrl+S            | ⌘S        |
| Zapisz jako                                   | Ctrl+Shift+S      | ⇧⌘S       |
| Przełączaj widok (edycja / podział / podgląd) | Ctrl+\            | ⌘\        |
| Znajdź                                        | Ctrl+F            | ⌘F        |
| Powiększ                                      | Ctrl+= lub Ctrl++ | ⌘= lub ⌘+ |
| Pomniejsz                                     | Ctrl+-            | ⌘-        |
| Rozmiar rzeczywisty (100%)                    | Ctrl+0            | ⌘0        |

Pomniejsz działa też przez ⌘_ i Ctrl+_.

### Formatowanie i historia

| Czynność                   | Windows / Linux | macOS |
| -------------------------- | --------------- | ----- |
| Pogrubienie                | Ctrl+B          | ⌘B    |
| Pochylenie                 | Ctrl+I          | ⌘I    |
| Cofnij                     | Ctrl+Z          | ⌘Z    |
| Ponów                      | Ctrl+Shift+Z    | ⇧⌘Z   |
| Ponów (skrót alternatywny) | Ctrl+Y          | ⌘Y    |

W edytorze kodu lub polu formularza własne klawisze edycji pola przejmują kontrolę.

### W ramce podglądu, z zaznaczonym elementem

| Czynność                           | Windows / Linux    | macOS      |
| ---------------------------------- | ------------------ | ---------- |
| Zapytaj AI o element               | Ctrl+K             | ⌘K         |
| Usuń element                       | Backspace / Delete | ⌫ / Delete |
| Poprzedni rodzeństwo               | ArrowUp            | ↑          |
| Następne rodzeństwo                | ArrowDown          | ↓          |
| Zaznacz element nadrzędny          | ArrowLeft          | ←          |
| Zaznacz pierwsze dziecko           | ArrowRight         | →          |
| Przesuń element wyżej w dokumencie | Alt+ArrowUp        | ⌥↑         |
| Przesuń element niżej w dokumencie | Alt+ArrowDown      | ⌥↓         |
| Zniech zaznaczenie                 | Esc                | Esc        |

Każdy z nich wymaga już zaznaczonego elementu; gdy nic nie jest zaznaczone, klawisz nic nie robi.

### W ramce podglądu, przy edycji tekstu w miejscu

| Czynność                              | Windows / Linux | macOS |
| ------------------------------------- | --------------- | ----- |
| Zatwierdź edycję                      | Esc             | Esc   |
| Zatwierdź edycję (skrót alternatywny) | Ctrl+⏎          | ⌘⏎    |
| Pogrub zaznaczony zakres              | Ctrl+B          | ⌘B    |
| Pochyl zaznaczony zakres              | Ctrl+I          | ⌘I    |

Zatwierdzenie zachowuje wpisane i przywraca element do stanu zaznaczonego.

## HWP/HWPX

Te klawisze działają, gdy karta HWP/HWPX jest na wierzchu, a dokument ma fokus. Dwie kolumny pokazują, jak je nacisnąć w systemie macOS i Windows / Linux.

### Plik

| Czynność      | Windows / Linux      | macOS |
| ------------- | -------------------- | ----- |
| Nowy dokument | Alt+N                |       |
| Otwórz…       | Ctrl+O / Alt+O       | ⌘O    |
| Zapisz        | Ctrl+S / Alt+S       | ⌘S    |
| Zapisz jako…  | Ctrl+Shift+S / Alt+V | ⇧⌘S   |
| Drukuj        | Ctrl+P / Alt+P       | ⌘P    |

### Edycja

| Czynność            | Windows / Linux              | macOS       |
| ------------------- | ---------------------------- | ----------- |
| Cofnij              | Ctrl+Z                       | ⌃Z          |
| Ponów               | Ctrl+Shift+Z                 | ⌃⇧Z         |
| Usuń wiersz         | Ctrl+Y                       | ⌃Y          |
| Wytnij              | Ctrl+X                       | ⌃X          |
| Kopiuj              | Ctrl+C                       | ⌃C          |
| Wklej               | Ctrl+V                       | ⌃V          |
| Usuń                | Ctrl+E                       | ⌃E          |
| Zaznacz wszystko    | Ctrl+A                       | ⌃A          |
| Kopiuj formatowanie | Alt+C                        | ⌥C          |
| Znajdź              | Ctrl+F / Ctrl+Q, F           | ⌃F / ⌃Q, F  |
| Znajdź i zamień     | Ctrl+H / Ctrl+F2 / Ctrl+Q, A | ⌃F2 / ⌃Q, A |
| Znajdź następny     | Ctrl+L                       | ⌃L          |
| Znajdź wstecz       | Ctrl+Q, L                    | ⌃Q, L       |
| Przejdź do          | Alt+G                        | ⌥G          |
| Porównaj dokumenty  | Alt+Shift+V                  | ⌥⇧V         |

### Znak

| Czynność                        | Windows / Linux      | macOS    |
| ------------------------------- | -------------------- | -------- |
| Pogrubienie                     | Ctrl+B / Alt+Shift+B | ⌃B / ⌥⇧B |
| Kursywa                         | Ctrl+I / Alt+Shift+I | ⌃I / ⌥⇧I |
| Podkreślenie                    | Ctrl+U / Alt+Shift+U | ⌃U / ⌥⇧U |
| Format normalny                 | Alt+Shift+C          | ⌥⇧C      |
| Indeks górny                    | Alt+Shift+P          | ⌥⇧P      |
| Indeks dolny                    | Alt+Shift+S          | ⌥⇧S      |
| Format znaku…                   | Alt+L                | ⌥L       |
| Zwiększ rozmiar czcionki        | Alt+Shift+E / Ctrl+] | ⌥⇧E / ⌃] |
| Zmniejsz rozmiar czcionki       | Alt+Shift+R / Ctrl+[ | ⌥⇧R / ⌃[ |
| Zwiększ szerokość znaków        | Alt+Shift+K          | ⌥⇧K      |
| Zmniejsz szerokość znaków       | Alt+Shift+J          | ⌥⇧J      |
| Zwiększ odstępy między znakami  | Alt+Shift+W          | ⌥⇧W      |
| Zmniejsz odstępy między znakami | Alt+Shift+N          | ⌥⇧N      |
| Tekst czarny                    | Ctrl+M, K            | ⌃M, K    |
| Tekst czerwony                  | Ctrl+M, R            | ⌃M, R    |
| Tekst niebieski                 | Ctrl+M, B            | ⌃M, B    |
| Tekst śliwkowy                  | Ctrl+M, D            | ⌃M, D    |
| Tekst zielony                   | Ctrl+M, G            | ⌃M, G    |
| Tekst żółty                     | Ctrl+M, Y            | ⌃M, Y    |
| Tekst turkusowy                 | Ctrl+M, C            | ⌃M, C    |
| Tekst biały                     | Ctrl+M, W            | ⌃M, W    |

### Akapit

| Czynność                                    | Windows / Linux | macOS   |
| ------------------------------------------- | --------------- | ------- |
| Wyrównaj do lewej                           | Ctrl+Shift+L    | ⌃⇧L     |
| Wyśrodkuj                                   | Ctrl+Shift+C    | ⌃⇧C     |
| Wyrównaj do prawej                          | Ctrl+Shift+R    | ⌃⇧R     |
| Wyjustuj                                    | Ctrl+Shift+M    | ⌃⇧M     |
| Rozłóż                                      | Ctrl+Shift+T    | ⌃⇧T     |
| Zwiększ odstęp między wierszami             | Alt+Shift+Z     | ⌥⇧Z     |
| Zmniejsz odstęp między wierszami            | Alt+Shift+A     | ⌥⇧A     |
| Format akapitu…                             | Alt+T           | ⌥T      |
| Styl…                                       | F6              | F6      |
| Zastosuj style od pierwszego do dziesiątego | Ctrl+1 … Ctrl+0 | ⌃1 … ⌃0 |
| Format numeracji akapitów                   | Ctrl+K, N       | ⌃K, N   |

### Wstawianie

| Czynność                               | Windows / Linux    | macOS       |
| -------------------------------------- | ------------------ | ----------- |
| Wstaw tabelę                           | Ctrl+N, T          | ⌃N, T       |
| Przypis dolny                          | Ctrl+N, N          | ⌃N, N       |
| Przypis końcowy                        | Ctrl+N, E          | ⌃N, E       |
| Nagłówek                               | Ctrl+N, H          | ⌃N, H       |
| Numer strony                           | Ctrl+N, P          | ⌃N, P       |
| Wstaw obraz                            | Ctrl+N, I          | ⌃N, I       |
| Pole tekstowe                          | Ctrl+N, B          | ⌃N, B       |
| Równanie                               | Ctrl+N, M          | ⌃N, M       |
| Wstaw podpis                           | Ctrl+N, C          | ⌃N, C       |
| Hiperłącze                             | Ctrl+K, H          | ⌃K, H       |
| Zakładka                               | Ctrl+K, B          | ⌃K, B       |
| Wstaw pole                             | Ctrl+K, E          | ⌃K, E       |
| Tekst daty/godziny                     | Ctrl+K, D          | ⌃K, D       |
| Edytuj obiekt, pole lub tabelę/komórkę | Ctrl+N, K          | ⌃N, K       |
| Symbole                                | Ctrl+F10 / Alt+F10 | ⌃F10 / ⌥F10 |

### Tabela

| Czynność             | Windows / Linux        | macOS        |
| -------------------- | ---------------------- | ------------ |
| Dodaj wiersz/kolumnę | Alt+Enter / Alt+Insert | ⌥⏎ / ⌥Insert |
| Usuń wiersz/kolumnę  | Alt+Delete             | ⌥⌫           |
| Podziel komórkę      | F5 → S                 | F5 → S       |
| Scal komórki         | F5 → M                 | F5 → M       |
| Suma bloku           | F5 → Ctrl+Shift+S      | F5 → ⇧⌘S     |
| Średnia bloku        | F5 → Ctrl+Shift+A      | F5 → ⌃⇧A     |
| Iloczyn bloku        | F5 → Ctrl+Shift+P      | F5 → ⌃⇧P     |
| Podziel tabelę       | Ctrl+N, A              | ⌃N, A        |
| Połącz tabele        | Ctrl+N, Z              | ⌃N, Z        |
| Formuła obliczeniowa | Ctrl+N, F              | ⌃N, F        |

### Obliczenia tabeli

Działają tylko wtedy, gdy kursor znajduje się w pustej komórce tabeli. Osobne klawisze liczą na podstawie komórek po lewej i komórek powyżej.

| Czynność        | Windows / Linux | macOS |
| --------------- | --------------- | ----- |
| Suma z lewej    | Ctrl+Shift+H    | ⇧⌘H   |
| Suma z góry     | Ctrl+Shift+V    | ⌃⇧V   |
| Średnia z lewej | Ctrl+Shift+J    | ⌃⇧J   |
| Średnia z góry  | Ctrl+Shift+B    | ⌃⇧B   |
| Iloczyn z lewej | Ctrl+Shift+K    | ⌃⇧K   |
| Iloczyn z góry  | Ctrl+Shift+N    | ⌃⇧N   |

### Strona

| Czynność                | Windows / Linux  | macOS |
| ----------------------- | ---------------- | ----- |
| Ustawienia strony       | F7               | F7    |
| Podział strony          | Ctrl+Enter       | ⌃⏎    |
| Podział kolumny         | Ctrl+Shift+Enter | ⌃⇧⏎   |
| Podział ustawień kolumn | Ctrl+Alt+Enter   | ⌃⌥⏎   |
| Ustawienia sekcji       | Ctrl+N, G        | ⌃N, G |
| Ukryj stronę            | Ctrl+N, S        | ⌃N, S |

### Widok

| Czynność                             | Windows / Linux | macOS |
| ------------------------------------ | --------------- | ----- |
| Powiększ                             | Ctrl+=          | ⌃=    |
| Pomniejsz                            | Ctrl+-          | ⌃-    |
| Dopasuj do strony                    | Ctrl+G, P       | ⌃G, P |
| Dopasuj do szerokości                | Ctrl+G, W       | ⌃G, W |
| Powiększ do 100%                     | Ctrl+G, Q       | ⌃G, Q |
| Zwiń lub rozwiń przybornik           | Ctrl+F1         | ⌃F1   |
| Pokaż lub ukryj znaczniki akapitu    | Ctrl+G, T       | ⌃G, T |
| Pokaż lub ukryj znaczniki sterujące  | Ctrl+G, C       | ⌃G, C |
| Przejdź do karty Start (poza tabelą) | Ctrl+Shift+H    | ⇧⌘H   |

Klawisz zapisany jako `Ctrl+N,T` oznacza: naciśnij Ctrl+N, puść, a następnie naciśnij T. `F5 → S` oznacza zaznaczenie bloku komórek za pomocą F5 i naciśnięcie S. `Ctrl+1 … Ctrl+0` oznaczają style od pierwszego do dziesiątego w dokumencie; `Ctrl+Alt+1 … Ctrl+Alt+0` stosują te same style. Gdy zaznaczony jest blok komórek, `Ctrl+Shift+S` (w macOS `⇧⌘S`) oznacza sumę bloku; poza nim ten klawisz zapisuje jako.
