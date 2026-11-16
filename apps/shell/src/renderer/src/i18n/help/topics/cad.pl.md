# Rysunek AI

Rysunek AI to karta do prostych modeli 3D i rysunków. Otworzysz w niej rysunek, który ktoś ci przysłał, i sprawdzisz jego wymiary, zbudujesz mały model ręcznie albo z pomocą AI i wstawisz arkusz wymiarowy do dokumentu Hangul lub Word. Rysunki zapisują się jako pliki .ttukcad, a wszystkie długości są w milimetrach.

## Otwieranie rysunku

- Aby zacząć nowy rysunek, na stronie głównej otwórz **All apps** i naciśnij **Rysunek AI**. Karta startuje jako **Rysunek bez tytułu**.
- Aby otworzyć plik, użyj **Plik › Otwórz…** (Ctrl+O) albo przeciągnij plik na okno. Rysunek AI otwiera pliki .ttukcad, DXF, STL, OBJ, 3MF, GLB i PLY.
- Plik w innym formacie niż .ttukcad otwiera się jako nowy rysunek bez tytułu, nazwany tak jak ten plik. Oryginalny plik nigdy się nie zmienia: przy zapisie program zawsze prosi o nowy plik .ttukcad.
- Pliki DWG, STEP, IGES i BREP pochodzą z profesjonalnych programów CAD i nie da się ich odczytać. Rysunek AI pokazuje wtedy okno **Jak otworzyć ten plik**: poproś nadawcę o plik DXF (dla rysunku 2D) albo STL (dla modelu 3D).
- Plik większy niż 100 MB albo model z ponad 2 milionami trójkątów się nie otworzy.

## Wstawianie kształtów

- W grupie **Narzędzia główne › Wstaw kształty** są cztery najczęściej używane kształty; **Więcej** otwiera galerię wszystkich 15: prostopadłościan, walec, kula, stożek, ostrosłup, klin, półkula, rura, torus, graniastosłup trójkątny, graniastosłup sześciokątny, zaokrąglony prostopadłościan, graniastosłup gwiaździsty, dach i tekst.
- Nowy kształt pojawia się na środku płyty roboczej, czyli podstawy, na której stoi model. Kliknij część, aby ją zaznaczyć; kliknięcie z Shift albo z Ctrl dodaje kolejne części do zaznaczenia.
- **Widok › Uchwyty** określa, co robią uchwyty na zaznaczonej części: **Przesuń**, **Obróć** albo **Rozmiar**. Przeciąganie przyciąga do 1 mm i 15°; przytrzymaj Alt podczas przeciągania, aby wyłączyć przyciąganie.
- Panel **Właściwości** po prawej pokazuje zaznaczoną część: nazwę, rodzaj (bryła lub otwór), rozmiar, położenie (mm), obrót (°) i kolor. Wpisz liczbę, aby to zmienić. **Ukryj** i **Zablokuj** odsuwają część, żeby nie przeszkadzała.
- **Widok › Widoki** obraca kamerę na **Góra**, **Przód** albo **Bok**, a **Pokaż wszystko** mieści w oknie cały model. Przeciągnij w widoku, aby go obrócić, a kółkiem myszy przybliżaj i oddalaj.
- Pasek stanu na dole pokazuje rozmiar płyty roboczej, przyciąganie i siatkę oraz szerokość × głębokość × wysokość zaznaczonej części.

## Otwory, grupy i wyrównywanie

- Otwór to kształt, który wycina. Zaznacz kształt i naciśnij **Otwór** (albo H), aby zrobić z niego otwór; naciśnij jeszcze raz, aby znów był bryłą.
- Otwór wycina tylko wewnątrz grupy. Zaznacz otwór i bryły, które ma przeciąć, a potem naciśnij **Grupuj** (Ctrl+G): grupa to bryły pomniejszone o otwory. **Rozgrupuj** (Ctrl+Shift+G) rozkłada ją z powrotem.
- **Wyrównaj** ustawia zaznaczone części równo z częścią zaznaczoną jako pierwsza: do lewej, do środka lub do prawej; do przodu, do środka lub do tyłu; do dołu, do środka lub do góry.
- Na przykład walec o średnicy 80 mm i walec-otwór o średnicy 68 mm podniesiony o 5 mm, oba zaznaczone i zgrupowane, dają kubek z dnem grubości 5 mm.

## Własny kształt i tekst

- **Rysuj odręcznie** pozwala narysować własny obrys. Klikaj na płycie roboczej, aby postawić co najmniej 3 punkty; **Cofnij punkt** usuwa ostatni.
- Wpisz **Wysokość (mm)** i naciśnij **Zamknij kształt**: obrys podnosi się i staje się bryłą. **Anuluj** wychodzi, nic nie tworząc.
- Linie, które się przecinają, nie są przyjmowane. Cofaj punkty, aż linie przestaną się przecinać.
- **Tekst** pyta o słowa do wstawienia i zamienia je w bryłowe litery czcionką dołączoną do GenOffice.

## Mierzenie i arkusz wymiarowy

- **Zmierz** pokazuje odległość między dwoma klikniętymi punktami, długość linii albo średnicę okręgu. Punkty przyciągają się do narożników, końców linii i środków okręgów. Esc czyści wynik.
- **Arkusz wymiarowy** rysuje model z przodu, z góry i z boku na arkuszu A4, z całkowitą szerokością, głębokością i wysokością, dopasowaną skalą (1:1, 1:2, 1:5, 1:10 …) i tabliczką z nazwą, datą i skalą. Rysunek z pliku DXF ma tylko widok z góry.
- Na arkuszu przycisk **Kopiuj obraz** kopiuje go do schowka. Wklej go na kartę Hangul, Word lub PowerPoint.
- **Wyślij do Hangul** otwiera nowy dokument Hangul z arkuszem i tabelą części z ich wymiarami. Gdy w Ustawieniach wyłączone są **Funkcje dokumentów koreańskich**, przycisk ma nazwę **Wyślij do Worda** i tworzy dokument Word.

## Asystent AI

- Panel AI obok rysunku wstawia kształty, zmienia rozmiary i położenie, robi otwory, grupuje, wyrównuje, ustawia rozmiar płyty roboczej i podsumowuje model. Kilka próśb na początek:
  - „Zrób przybornik na długopisy o szerokości 80 mm i wysokości 100 mm, pusty w środku, z otworem o średnicy 68 mm”
  - „Zrób z płyty roboczej pokój 5 × 4 m i postaw cztery biurka”
  - „Wyrównaj zaznaczone części do lewej”
- Wszystko, co zmieniła jedna prośba, cofniesz jednym **Cofnij** (Ctrl+Z), niezależnie od liczby zmienionych części.
- AI dostaje twoją prośbę i podsumowanie modelu (nazwę, rodzaj, rozmiar i położenie każdej części). Nie może zapisywać, otwierać, eksportować ani wysyłać plików; to zostaje w twoich rękach.

## Zapisywanie i odzyskiwanie

- **Zapisz** (Ctrl+S) zapisuje plik .ttukcad. Rysunek AI zapisuje tylko w tym formacie; **Zapisz jako…** (Ctrl+Shift+S) pozwala wybrać nową nazwę lub miejsce.
- **Autozapis** u góry zapisuje co 30 sekund i wtedy, gdy okno traci fokus, o ile rysunek ma już własny plik.
- Jeśli GenOffice niespodziewanie się zamknie, przy następnym uruchomieniu rysunek będzie na liście **Dokumenty z niezapisaną zawartością**. Naciśnij **Przywróć**, aby go odzyskać.

## Eksportowanie

- **Plik › Eksportuj STL** i **Eksportuj OBJ** zapisują model dla drukarki 3D albo innego programu. **Eksportuj obraz (PNG)** zapisuje to, co widać w widoku, na jasnym tle.
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

- Bezpośrednio otwierać plików DWG, STEP, IGES ani BREP. Poproś zamiast tego o DXF albo STL.
- Więzów, historii projektowania ani złożeń jak w profesjonalnych programach CAD. Każda część jest ustawiana własnymi liczbami.
- Drukować. Wyślij arkusz wymiarowy do dokumentu Hangul lub Word i drukuj stamtąd.
