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
    'Tento druh souboru zde nelze otevřít. Otevírají se soubory .ttukcad, .dxf, .stl, .obj, .3mf, .glb a .ply.',
  noticeImportFailed: 'Tvary v tomto souboru nelze přečíst. Je otevřen prázdný výkres.',
  saveRefused:
    'Výkres se nepodařilo uložit. Vaše změny tu stále jsou; zkuste to znovu nebo použijte Uložit jako.',
  saveFailed:
    'Při ukládání výkresu nastala chyba. Vaše změny tu stále jsou; zkuste to znovu nebo použijte Uložit jako.',
  guideTitle: 'Jak otevřít tento soubor',
  guideBody: 'Soubory {ext} vytvářejí profesionální programy CAD a Výkres AI je nedokáže přečíst.',
  guideAsk:
    'Požádejte odesílatele, aby ho znovu uložil jako DXF (pro 2D výkres) nebo STL (pro 3D model) a poslal vám tento soubor. Oba se tu otevřou.',
  exportEmpty: 'Není co exportovat. Zobrazte alespoň jeden tvar a zkuste to znovu.',
  exportFailed: 'Soubor se nepodařilo exportovat. Zkuste to znovu nebo vyberte jinou složku.',
  exportSourcePath: 'Export nemůže nahradit zdrojový soubor tohoto výkresu. Zvolte jiný název.',
  issueOpenMesh: 'Tuto skupinu nelze spočítat: obsahuje otevřenou síť',
  issueTooLarge: 'Příliš mnoho trojúhelníků k zobrazení (limit 2 miliony)',
  editLocked: 'Tento díl je zamčený. Chcete-li ho změnit, odemkněte ho.',
  editNotScalable:
    'Velikost tohoto dílu nelze měnit úchytem. Importované sítě, výkresy, skupiny a text lze jen přesouvat a otáčet.',
  editRefused: 'Tuto změnu nelze provést. Výkres zůstal beze změny.',
} satisfies Record<keyof typeof zh, string>
