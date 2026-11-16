import type { zh } from './zh'

export const nl = {
  untitled: 'Naamloze tekening',
  saved: 'Opgeslagen',
  unsaved: 'Niet opgeslagen',
  noWebGlTitle: 'De 3D-weergave kan niet worden getoond',
  noWebGlBody:
    'Deze pc kon WebGL, dat de 3D-weergave nodig heeft, niet starten. De tekening kan nog steeds worden geopend en opgeslagen, maar niet worden getoond. Probeer een van deze oplossingen en open het tabblad opnieuw:',
  noWebGlDriver: 'Werk het stuurprogramma van de grafische kaart bij.',
  noWebGlAccel: 'Schakel hardwareversnelling in bij de grafische instellingen.',
  noticeNotOk:
    'Dit bestand kon niet als tekening worden geopend. Het is mogelijk beschadigd of gemaakt met een nieuwere versie. Er is een lege tekening geopend; bij opslaan wordt om een nieuw bestand gevraagd.',
  noticeTooLarge:
    'Dit bestand is te groot om te openen (limiet: 100 MB). Er is een lege tekening geopend.',
  noticeUnreadable: 'Dit bestand kon niet worden gelezen. Er is een lege tekening geopend.',
  noticeUnsupported:
    'Dit soort bestand kan hier niet worden geopend. Geopend worden .ttukcad-, .dxf-, .stl- en .obj-bestanden.',
  noticeImportFailed:
    'De vormen in dit bestand konden niet worden gelezen. Er is een lege tekening geopend.',
  saveRefused:
    'De tekening kon niet worden opgeslagen. Uw wijzigingen staan er nog; probeer het opnieuw of gebruik Opslaan als.',
  saveFailed:
    'Er ging iets mis bij het opslaan van de tekening. Uw wijzigingen staan er nog; probeer het opnieuw of gebruik Opslaan als.',
} satisfies Record<keyof typeof zh, string>
