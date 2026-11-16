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
    'Tego rodzaju pliku nie można tu otworzyć. Otwierane są pliki .ttukcad, .dxf, .stl i .obj.',
  noticeImportFailed: 'Nie można odczytać kształtów z tego pliku. Otwarto pusty rysunek.',
  saveRefused:
    'Nie udało się zapisać rysunku. Zmiany nadal tu są; spróbuj ponownie lub użyj polecenia Zapisz jako.',
  saveFailed:
    'Podczas zapisywania rysunku wystąpił problem. Zmiany nadal tu są; spróbuj ponownie lub użyj polecenia Zapisz jako.',
} satisfies Record<keyof typeof zh, string>
