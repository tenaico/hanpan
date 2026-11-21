# Rysunek AI

Rysunek AI to karta do prostych modeli 3D i rysunków. Otworzysz w niej rysunek, który ktoś ci przysłał, i sprawdzisz jego wymiary, zbudujesz mały model ręcznie albo z pomocą AI i wstawisz arkusz wymiarowy do dokumentu Hangul lub Word. Rysunki zapisują się jako pliki .ttukcad, a wszystkie długości są w milimetrach.

## Otwieranie rysunku

- Aby zacząć nowy rysunek, na stronie głównej otwórz **All apps** i naciśnij **Rysunek AI**. Karta startuje jako **Rysunek bez tytułu**.
- Aby otworzyć plik, użyj **Plik › Otwórz…** (Ctrl+O) albo przeciągnij plik na okno. Rysunek AI otwiera pliki .ttukcad, DXF, DWG, STL, OBJ, 3MF, GLB i PLY. Pliki DWG otwierają się od formatu AutoCAD R14 do formatu 2018.
- Plik w innym formacie niż .ttukcad otwiera się jako nowy rysunek bez tytułu, nazwany tak jak ten plik. Oryginalny plik nigdy się nie zmienia: przy zapisie program zawsze prosi o nowy plik .ttukcad.
- Pliki STEP, IGES i BREP to pliki 3D z profesjonalnych programów CAD i nie da się ich odczytać. Rysunek AI pokazuje wtedy okno **Jak otworzyć ten plik**: poproś nadawcę o plik STL (model 3D).
- Plik większy niż 100 MB albo model z ponad 2 milionami trójkątów się nie otworzy.

## Wstawianie kształtów

- W grupie **Narzędzia główne › Wstaw kształty** są cztery najczęściej używane kształty; **Więcej** otwiera galerię wszystkich 15: prostopadłościan, walec, kula, stożek, ostrosłup, klin, półkula, rura, torus, graniastosłup trójkątny, graniastosłup sześciokątny, zaokrąglony prostopadłościan, graniastosłup gwiaździsty, dach i tekst.
- Nowy kształt pojawia się na środku płyty roboczej, czyli podstawy, na której stoi model. Kliknij kształt, aby go zaznaczyć; kliknięcie z Shift albo z Ctrl dodaje kolejne kształty do zaznaczenia.
- **Widok › Uchwyty** określa, co robią uchwyty na zaznaczonym kształcie: **Przesuń**, **Obróć** albo **Rozmiar**. Przeciąganie przyciąga do 1 mm i 15°; przytrzymaj Alt podczas przeciągania, aby wyłączyć przyciąganie.
- Panel **Właściwości** po prawej pokazuje zaznaczony kształt: nazwę, rodzaj (bryła lub otwór), rozmiar, położenie (mm), obrót (°) i kolor. Wpisz liczbę, aby to zmienić. **Ukryj** i **Zablokuj** odsuwają kształt, żeby nie przeszkadzał.
- **Widok › Widoki** obraca kamerę na **Góra**, **Przód** albo **Bok**, a **Pokaż wszystko** mieści w oknie cały model. Przeciągnij w widoku, aby go obrócić, a kółkiem myszy przybliżaj i oddalaj.
- Pasek stanu na dole pokazuje rozmiar płyty roboczej, przyciąganie i siatkę oraz szerokość × głębokość × wysokość zaznaczonego kształtu.

## Otwory, grupy i wyrównywanie

- Otwór to kształt, który wycina. Zaznacz kształt i naciśnij **Otwór** (albo H), aby zrobić z niego otwór; naciśnij jeszcze raz, aby znów był bryłą.
- Otwór wycina tylko wewnątrz grupy. Zaznacz otwór i bryły, które ma przeciąć, a potem naciśnij **Grupuj** (Ctrl+G): grupa to bryły pomniejszone o otwory. **Rozgrupuj** (Ctrl+Shift+G) rozkłada ją z powrotem.
- **Wyrównaj** ustawia zaznaczone kształty równo z kształtem zaznaczonym jako pierwszy: do lewej, do środka lub do prawej; do przodu, do środka lub do tyłu; do dołu, do środka lub do góry.
- Na przykład walec o średnicy 80 mm i walec-otwór o średnicy 68 mm podniesiony o 5 mm, oba zaznaczone i zgrupowane, dają kubek z dnem grubości 5 mm.

## Własny kształt i tekst

- **Rysuj odręcznie** pozwala narysować własny obrys. Klikaj na płycie roboczej, aby postawić co najmniej 3 punkty; **Cofnij punkt** usuwa ostatni.
- Wpisz **Wysokość (mm)** i naciśnij **Zamknij kształt**: obrys podnosi się i staje się bryłą. **Anuluj** wychodzi, nic nie tworząc.
- Linie, które się przecinają, nie są przyjmowane. Cofaj punkty, aż linie przestaną się przecinać.
- **Tekst** pyta o słowa do wstawienia i zamienia je w bryłowe litery czcionką dołączoną do GenOffice.

## Edycja linii i tekstu otrzymanego rysunku

- Otwórz plik DXF albo DWG i naciśnij **Edytuj linie**. Kliknij linię, okrąg, łuk albo tekst rysunku, aby go zaznaczyć (zmieni kolor na kolor wyróżnienia); kliknięcie z Shift zaznacza kolejne.
- Na pasku poniżej **Usuń** (albo klawisz Delete) usuwa zaznaczenie, **Przesuń** przesuwa je o wpisane X i Y w mm, a gdy zaznaczony jest jeden tekst, wpisujesz nowe słowa i naciskasz **Zmień tekst**. Esc czyści zaznaczenie; ponowne naciśnięcie kończy edycję linii.
- Każdą zmianę cofniesz jednym **Cofnij** (Ctrl+Z). Zablokowany rysunek nie zostanie zmieniony.
- Możesz też poprosić asystenta AI, na przykład: „Usuń wszystko z warstwy wymiarów”, „Zmień tekst ‚Sala konferencyjna’ na ‚Duża sala konferencyjna’”, „Przesuń warstwę drzwi o 500 mm w prawo”.
- Wynik zapisuje się jako .ttukcad. Oryginalny plik DXF albo DWG nigdy się nie zmienia. Aby go odesłać, utwórz nowy plik poleceniem **Eksportuj DXF** albo **Eksportuj DWG**.

## Mierzenie i arkusz wymiarowy

- **Zmierz** pokazuje odległość między dwoma klikniętymi punktami, długość linii albo średnicę okręgu. Punkty przyciągają się do narożników, końców linii i środków okręgów. Esc czyści wynik.
- **Arkusz wymiarowy** rysuje model z przodu, z góry i z boku na arkuszu A4, z całkowitą szerokością, głębokością i wysokością, dopasowaną skalą (1:1, 1:2, 1:5, 1:10 …) i tabliczką z nazwą, datą i skalą. Rysunek z pliku DXF ma tylko widok z góry.
- Na arkuszu przycisk **Kopiuj obraz** kopiuje go do schowka. Wklej go na kartę Hangul, Word lub PowerPoint.
- **Wyślij do Hangul** otwiera nowy dokument Hangul z arkuszem i tabelą kształtów z ich wymiarami. Gdy w Ustawieniach wyłączone są **Funkcje dokumentów koreańskich**, przycisk ma nazwę **Wyślij do Worda** i tworzy dokument Word.

## Asystent AI

- Panel AI obok rysunku wstawia kształty, zmienia rozmiary i położenie, robi otwory, grupuje, wyrównuje, ustawia rozmiar płyty roboczej i podsumowuje model. Kilka próśb na początek:
  - „Zrób przybornik na długopisy o szerokości 80 mm i wysokości 100 mm, pusty w środku, z otworem o średnicy 68 mm”
  - „Zrób z płyty roboczej pokój 5 × 4 m i postaw cztery biurka”
  - „Wyrównaj zaznaczone kształty do lewej”
- Wszystko, co zmieniła jedna prośba, cofniesz jednym **Cofnij** (Ctrl+Z), niezależnie od liczby zmienionych kształtów.
- AI dostaje twoją prośbę i podsumowanie modelu (nazwę, rodzaj, rozmiar i położenie każdego kształtu). Nie może zapisywać, otwierać, eksportować ani wysyłać plików; to zostaje w twoich rękach.
- Aby dać AI kartę specyfikacji lub szkic, dołącz go przyciskiem spinacza pod polem wpisywania, przeciągnij na panel lub wklej obraz (Ctrl+V). AI czyta go i buduje według niego; plik nigdy nie trafia do rysunku, a prośba nadal cofa się jednym krokiem.

## Zapisywanie i odzyskiwanie

- **Zapisz** (Ctrl+S) zapisuje plik .ttukcad. Rysunek AI zapisuje tylko w tym formacie; **Zapisz jako…** (Ctrl+Shift+S) pozwala wybrać nową nazwę lub miejsce.
- **Autozapis** u góry zapisuje co 30 sekund i wtedy, gdy okno traci fokus, o ile rysunek ma już własny plik.
- Jeśli GenOffice niespodziewanie się zamknie, przy następnym uruchomieniu rysunek będzie na liście **Dokumenty z niezapisaną zawartością**. Naciśnij **Przywróć**, aby go odzyskać.

## Eksportowanie

- **Plik › Eksportuj STL** i **Eksportuj OBJ** zapisują model dla drukarki 3D albo innego programu. **Eksportuj obraz (PNG)** zapisuje to, co widać w widoku, na jasnym tle.
- **Eksportuj DXF** i **Eksportuj DWG** zapisują rysunek jako nowy plik w formacie AutoCAD 2018 (mm): linie, okręgi, łuki, teksty, warstwy i kolory bez zmian, a bryły jako ich obrys widziany z góry, na warstwie AI-DRAWING.
- Eksport nigdy nie zastępuje pliku, z którego pochodzi rysunek.

## Skróty klawiszowe

| Klawisze                 | Co robi                          |
| ------------------------ | -------------------------------- |
| Ctrl+Z                   | Cofnij                           |
| Ctrl+Y lub Ctrl+Shift+Z  | Ponów                            |
| Ctrl+S                   | Zapisz                           |
| Ctrl+A                   | Zaznacz wszystko                 |
| Delete                   | Usuń                             |
| Ctrl+D                   | Duplikuj                         |
| Ctrl+G                   | Grupuj                           |
| Ctrl+Shift+G             | Rozgrupuj                        |
| H                        | Otwór ↔ bryła                    |
| Strzałki                 | Przesuń o 1 mm (z Shift o 10 mm) |
| Alt podczas przeciągania | Wyłącz przyciąganie              |

**Pomoc › Skróty** pokazuje tę samą listę w karcie.

## Czego nie potrafi

- Bezpośrednio otwierać plików STEP, IGES ani BREP. Poproś zamiast tego o STL.
- Nadpisywać otrzymanego pliku DXF albo DWG: zginęłoby to, czego GenOffice nie odczytuje (kreskowania, atrybuty bloków, układy). Zamiast tego wyeksportuj nowy plik DXF albo DWG.
- Więzów, historii projektowania ani złożeń jak w profesjonalnych programach CAD. Każdy kształt jest ustawiany własnymi liczbami.
- Drukować. Wyślij arkusz wymiarowy do dokumentu Hangul lub Word i drukuj stamtąd.
