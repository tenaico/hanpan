import type { zh } from './zh'

export const pl = {
  untitled: 'Rysunek bez tytułu',
  saved: 'Zapisano',
  unsaved: 'Niezapisane',
  noWebGlTitle: 'Nie można wyświetlić widoku 3D',
  noWebGlBody:
    'Ten komputer nie mógł uruchomić WebGL, którego wymaga widok 3D. Rysunek nadal można otworzyć i zapisać, ale nie można go wyświetlić. Wypróbuj jedno z poniższych, a potem otwórz kartę ponownie:',
  noWebGlDriver: 'Zaktualizuj sterownik karty graficznej.',
  noWebGlAccel: 'Włącz akcelerację sprzętową w ustawieniach grafiki.',
  noticeNotOk:
    'Nie można otworzyć tego pliku jako rysunku. Może być uszkodzony lub utworzony w nowszej wersji. Otwarto pusty rysunek; przy zapisie pojawi się pytanie o nowy plik.',
  noticeTooLarge: 'Plik jest za duży, aby go otworzyć (limit: 100 MB). Otwarto pusty rysunek.',
  noticeUnreadable: 'Nie można odczytać tego pliku. Otwarto pusty rysunek.',
  noticeUnsupported:
    'Tego rodzaju pliku nie można tu otworzyć. Otwierane są pliki .ttukcad, .dxf, .stl, .obj, .3mf, .glb i .ply.',
  noticeImportFailed: 'Nie można odczytać kształtów z tego pliku. Otwarto pusty rysunek.',
  saveRefused:
    'Nie udało się zapisać rysunku. Zmiany nadal tu są; spróbuj ponownie lub użyj polecenia Zapisz jako.',
  saveFailed:
    'Podczas zapisywania rysunku wystąpił problem. Zmiany nadal tu są; spróbuj ponownie lub użyj polecenia Zapisz jako.',
  guideTitle: 'Jak otworzyć ten plik',
  guideBody: 'Pliki {ext} tworzą profesjonalne programy CAD i Rysunek AI nie potrafi ich odczytać.',
  guideAsk:
    'Poproś nadawcę, aby zapisał go ponownie jako DXF (rysunek 2D) lub STL (model 3D) i przesłał ten plik. Oba otwierają się tutaj.',
  exportEmpty: 'Nie ma nic do wyeksportowania. Pokaż co najmniej jeden kształt i spróbuj ponownie.',
  exportFailed: 'Nie udało się wyeksportować pliku. Spróbuj ponownie lub wybierz inny folder.',
  exportSourcePath: 'Eksport nie może zastąpić pliku źródłowego tego rysunku. Wybierz inną nazwę.',
  issueOpenMesh: 'Nie można obliczyć tej grupy: zawiera otwartą siatkę',
  issueTooLarge: 'Za dużo trójkątów do wyświetlenia (limit 2 miliony)',
  editLocked: 'Ta część jest zablokowana. Odblokuj ją, aby ją zmienić.',
  editNotScalable:
    'Rozmiaru tej części nie można zmienić uchwytem. Zaimportowane siatki, rysunki, grupy i tekst można tylko przesuwać i obracać.',
  editRefused: 'Nie można wprowadzić tej zmiany. Rysunek się nie zmienił.',
} satisfies Record<keyof typeof zh, string>
