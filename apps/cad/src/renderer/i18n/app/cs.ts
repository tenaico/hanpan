import type { zh } from './zh'

export const cs = {
  untitled: 'Výkres bez názvu',
  saved: 'Uloženo',
  unsaved: 'Neuloženo',
  noWebGlTitle: '3D zobrazení nelze zobrazit',
  noWebGlBody:
    'Tento počítač nedokázal spustit WebGL, které 3D zobrazení potřebuje. Výkres lze stále otevřít a uložit, ale nelze ho zobrazit. Zkuste jednu z těchto možností a pak kartu otevřete znovu:',
  noWebGlDriver: 'Aktualizujte ovladač grafické karty.',
  noWebGlAccel: 'Zapněte hardwarovou akceleraci v nastavení grafiky.',
  noticeNotOk:
    'Tento soubor nelze otevřít jako výkres. Může být poškozený nebo vytvořený novější verzí. Je otevřen prázdný výkres; při uložení se zobrazí dotaz na nový soubor.',
  noticeTooLarge: 'Soubor je příliš velký na otevření (limit: 100 MB). Je otevřen prázdný výkres.',
  noticeUnreadable: 'Tento soubor nelze přečíst. Je otevřen prázdný výkres.',
  noticeUnsupported:
    'Tento druh souboru zde nelze otevřít. Otevírají se soubory .ttukcad, .dxf, .stl a .obj.',
  noticeImportFailed: 'Tvary v tomto souboru nelze přečíst. Je otevřen prázdný výkres.',
  saveRefused:
    'Výkres se nepodařilo uložit. Vaše změny tu stále jsou; zkuste to znovu nebo použijte Uložit jako.',
  saveFailed:
    'Při ukládání výkresu nastala chyba. Vaše změny tu stále jsou; zkuste to znovu nebo použijte Uložit jako.',
} satisfies Record<keyof typeof zh, string>
