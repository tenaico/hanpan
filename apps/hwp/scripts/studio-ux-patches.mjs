/**
 * Build patches from the 0.17 UI/UX review v2 (hwp-design): studio behaviour a Hangul user
 * expects that the studio's own code leaves out. Same rules as rhwp-patches.mjs: every edit is
 * found exactly once (or `count` times) in the upstream source, so an rhwp upgrade that changes
 * the code stops the build instead of dropping the fix.
 *
 * studio-format-caret (#3)
 *   Format > Character Shape (the toolbar's 글자 모양, Alt+L) opened only over a block. As in
 *   Hangul it opens with a caret too and works on the word the caret is in; between words (and
 *   in a cell block, header or note) the choice goes the way of the toolbar's font box. Format >
 *   Bullet Shape pressed the toolbar's bullet button, which does nothing while the toolbar has
 *   scrolled it away; it opens Hangul's 문단 번호/글머리표 dialog on its bullet tab instead, for
 *   the caret's paragraph.
 *
 * studio-history-ux (#4, #10)
 *   Edit > 문서 이력 관리: a note while nothing is saved, the delete and compare buttons off
 *   until an entry is chosen, and Esc closes it (it is a floating panel, not a ModalDialog).
 *
 * studio-para-shape-esc, studio-table-grid-esc (#10)
 *   The paragraph shape dialog and the table grid picker listen for Esc on themselves but never
 *   took the focus, so Esc went to the document. They take it when they open.
 *
 * studio-saved-name (#7)
 *   After Save As the tab had the new name but the editor's status bar kept the old one.
 *
 * studio-options-no-pdf (#5)
 *   Tools > Preferences offered the browser print guide for PDFs; the app writes PDFs itself.
 *
 * studio-page-border-ux (#25)
 *   쪽 테두리/배경: the line controls are off while 테두리 사용 안 함 is on, and 굵기 has its own row.
 *
 * studio-equation-labels (#28)
 *   수식: the cases and lim buttons are named in the UI language, the HWP/LaTeX badge says it is
 *   the syntax switch, and the input says it is the input.
 *
 * studio-about-licenses (#6)
 *   File > About listed rhwp's crates, sent the reader to THIRD_PARTY_LICENSES.md (which the app
 *   cannot open) and ended with rhwp's copyright line. One line and a button now open the app's
 *   own open-source licence list, which carries all of that. The list stays in the source, moved
 *   into a method nobody calls, so the patch keeps the file's text otherwise as it is.
 */
import { OPEN_LICENSES_EVENT } from '../studio-plugin/agent-plugin.mjs'
import { HANCOM_KEYS_MODULE } from '../studio-plugin/hancom-keys.mjs'

/** A file of the studio's source, by its path under src/. */
const studioFile = (path) =>
  new RegExp(
    String.raw`[\\/]rhwp-studio[\\/]src[\\/]` +
      path.split('/').join(String.raw`[\\/]`) +
      String.raw`\.ts$`,
  )

export const UX_PATCHES = {
  'studio-format-caret': {
    file: studioFile('command/commands/format'),
    edits: [
      {
        find: "import { t } from '../../i18n/index.ts';",
        replace: [
          "import { t } from '../../i18n/index.ts';",
          `import { charShapeTarget } from '${HANCOM_KEYS_MODULE}';`,
        ].join('\n'),
      },
      {
        find: [
          '      const savedSel = ih.getSelection();',
          '      if (!savedSel) return;',
          '      const dialog = new CharShapeDialog(services.wasm, services.eventBus);',
        ].join('\n'),
        replace: [
          '      // Hangul: with no block the dialog works on the word at the caret',
          '      const savedSel = charShapeTarget(ih);',
          '      const dialog = new CharShapeDialog(services.wasm, services.eventBus);',
        ].join('\n'),
      },
      {
        find: '        ih.applyCharPropsToRange(savedSel.start, savedSel.end, mods);',
        replace: [
          '        if (savedSel) ih.applyCharPropsToRange(savedSel.start, savedSel.end, mods);',
          "        else services.eventBus.emit('format-char', mods);",
        ].join('\n'),
      },
      {
        find: [
          "    id: 'format:para-num-shape',",
          '    opensDialog: true,',
          "    label: t('command.format.paraNumShape.label'),",
          '    canExecute: (ctx) => ctx.hasDocument,',
          '    execute(services) {',
        ].join('\n'),
        replace: [
          "    id: 'format:para-num-shape',",
          '    opensDialog: true,',
          "    label: t('command.format.paraNumShape.label'),",
          '    canExecute: (ctx) => ctx.hasDocument,',
          '    execute(services, params) {',
        ].join('\n'),
      },
      {
        find: "      dialog.currentHeadType = props.headType ?? 'None';",
        replace:
          "      dialog.currentHeadType = params?.tab === 'bullet' ? 'Bullet' : (props.headType ?? 'None');",
      },
      {
        find: [
          "    id: 'format:bullet-shape',",
          "    label: t('command.format.bulletShape.label'),",
          '    canExecute: (ctx) => ctx.hasDocument,',
          '    execute(services) {',
          '      // 글머리표 버튼의 팝업을 프로그래밍적으로 열기',
          "      const btn = document.getElementById('tb-bullet');",
          "      if (btn) btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));",
          '    },',
        ].join('\n'),
        replace: [
          "    id: 'format:bullet-shape',",
          '    opensDialog: true,',
          "    label: t('command.format.bulletShape.label'),",
          '    canExecute: (ctx) => ctx.hasDocument,',
          '    execute(services) {',
          "      // Hangul's 글머리표 모양: the numbering dialog on its bullet tab, for the caret's paragraph",
          "      formatCommands.find((c) => c.id === 'format:para-num-shape')?.execute(services, { tab: 'bullet' });",
          '    },',
        ].join('\n'),
      },
    ],
  },

  'studio-history-ux': {
    file: studioFile('ui/history-dialog'),
    edits: [
      {
        find: [
          '  private selectedId: string | null = null;',
          '  private entries: DocHistoryEntryMeta[] = [];',
        ].join('\n'),
        replace: [
          '  private selectedId: string | null = null;',
          '  private entries: DocHistoryEntryMeta[] = [];',
          '  /** the buttons that act on the chosen entry, and the one that deletes every entry */',
          '  private chosenButtons: HTMLButtonElement[] = [];',
          '  private clearAllButton: HTMLButtonElement | null = null;',
          "  /** Esc closes the dialog, as it closes the editor's other dialogs */",
          '  private readonly onEscape = (e: KeyboardEvent): void => {',
          "    if (e.key !== 'Escape') return;",
          '    e.preventDefault();',
          '    e.stopPropagation();',
          '    this.hide();',
          '  };',
        ].join('\n'),
      },
      {
        find: ['    document.body.appendChild(this.wrap);', '    void this.refreshList();'].join(
          '\n',
        ),
        replace: [
          '    document.body.appendChild(this.wrap);',
          "    document.addEventListener('keydown', this.onEscape, true);",
          '    void this.refreshList();',
        ].join('\n'),
      },
      {
        find: ['    this._open = false;', '    this.wrap?.remove();'].join('\n'),
        replace: [
          '    this._open = false;',
          "    document.removeEventListener('keydown', this.onEscape, true);",
          '    this.wrap?.remove();',
        ].join('\n'),
      },
      {
        find: '    actions.append(delBtn, clrBtn, cmpBtn);',
        replace: [
          '    actions.append(delBtn, clrBtn, cmpBtn);',
          '    this.chosenButtons = [delBtn, cmpBtn];',
          '    this.clearAllButton = clrBtn;',
          '    this.syncButtons();',
        ].join('\n'),
      },
      {
        find: ["        li.classList.add('selected');", '      });'].join('\n'),
        replace: [
          "        li.classList.add('selected');",
          '        this.syncButtons();',
          '      });',
        ].join('\n'),
      },
      {
        find: [
          '    if (!this.entries.find((x) => x.id === this.selectedId)) this.selectedId = null;',
          '  }',
        ].join('\n'),
        replace: [
          '    if (!this.entries.find((x) => x.id === this.selectedId)) this.selectedId = null;',
          '    if (this.entries.length === 0) {',
          "      const empty = document.createElement('li');",
          "      empty.className = 'history-empty';",
          "      empty.textContent = t('hanpan.history.empty');",
          '      this.listEl.appendChild(empty);',
          '    }',
          '    this.syncButtons();',
          '  }',
          '',
          '  /** Delete and compare need a chosen entry; deleting all needs one at least. */',
          '  private syncButtons(): void {',
          '    for (const btn of this.chosenButtons) btn.disabled = !this.selectedId;',
          '    if (this.clearAllButton) this.clearAllButton.disabled = this.entries.length === 0;',
          '  }',
        ].join('\n'),
      },
    ],
  },

  'studio-para-shape-esc': {
    file: studioFile('ui/para-shape-dialog'),
    edits: [
      {
        find: [
          '    this.switchTab(0);',
          '    document.body.appendChild(this.overlay);',
          '  }',
        ].join('\n'),
        replace: [
          '    this.switchTab(0);',
          '    document.body.appendChild(this.overlay);',
          "    // the dialog's Esc handler hears keys from inside it only: take the focus, as 글자 모양 does",
          '    this.dialog.tabIndex = -1;',
          '    setTimeout(() => this.dialog.focus({ preventScroll: true }), 0);',
          '  }',
        ].join('\n'),
      },
    ],
  },

  'studio-table-grid-esc': {
    file: studioFile('ui/table-create-dialog'),
    edits: [
      {
        find: '    document.body.appendChild(this.popup);',
        replace: [
          '    document.body.appendChild(this.popup);',
          '    // its Esc handler hears keys from inside it only; the menu that opened it gives the focus back first',
          '    setTimeout(() => this.popup.focus({ preventScroll: true }), 0);',
        ].join('\n'),
      },
    ],
  },

  'studio-saved-name': {
    file: /[\\/]rhwp-studio[\\/]src[\\/]main\.ts$/,
    edits: [
      {
        find: "  if (fileName) wasm.fileName = fileName;\n  documentState.markClean('host-save');",
        replace: [
          '  if (fileName) {',
          '    wasm.fileName = fileName;',
          '    // the status bar named the file the document was opened as, after Save As too',
          "    sbMessage().textContent = t('ui.sbMessage.filePages', { p1: wasm.fileName, p2: wasm.pageCount });",
          '  }',
          "  documentState.markClean('host-save');",
        ].join('\n'),
      },
    ],
  },

  'studio-about-licenses': {
    file: studioFile('ui/about-dialog'),
    edits: [
      {
        find: [
          '    // 오픈소스 라이선스',
          "    const licenseTitle = document.createElement('div');",
        ].join('\n'),
        replace: [
          "    // the licences are in the app's own list (Settings > About), rhwp's crates included",
          "    const licenseNote = document.createElement('div');",
          "    licenseNote.className = 'about-license-note';",
          "    licenseNote.textContent = t('hanpan.about.licenses');",
          '    body.appendChild(licenseNote);',
          "    const licenseButton = document.createElement('button');",
          "    licenseButton.type = 'button';",
          "    licenseButton.className = 'dialog-btn about-license-btn';",
          "    licenseButton.textContent = t('hanpan.about.licensesButton');",
          "    licenseButton.addEventListener('click', () =>",
          `      window.dispatchEvent(new CustomEvent('${OPEN_LICENSES_EVENT}')),`,
          '    );',
          '    body.appendChild(licenseButton);',
          '',
          '    return body;',
          '  }',
          '',
          "  /** rhwp's own licence list and copyright line, left out above. */",
          '  private rhwpLicenseList(body: HTMLElement): void {',
          "    const licenseTitle = document.createElement('div');",
        ].join('\n'),
      },
      {
        find: [
          "    copyright.textContent = '\\u00A9 2026 rhwp: Edward Kim';",
          '    body.appendChild(copyright);',
          '',
          '    return body;',
          '  }',
        ].join('\n'),
        replace: [
          "    copyright.textContent = '\\u00A9 2026 rhwp: Edward Kim';",
          '    body.appendChild(copyright);',
          '  }',
        ].join('\n'),
      },
    ],
  },

  'studio-page-border-ux': {
    file: studioFile('ui/page-border-dialog'),
    edits: [
      {
        find: "    lineRow.append(this.label(t('dialog.pageBorder.label.label')), this.buildLineTypeSelect(), this.label(t('dialog.pageBorder.label.label.x4482fe')), this.buildLineWidthSelect());",
        replace: [
          "    lineRow.append(this.label(t('dialog.pageBorder.label.label')), this.buildLineTypeSelect());",
          '    // 굵기 on its own row: beside 종류 it wrapped and left its label at the end of the line',
          '    const widthRow = this.row();',
          "    widthRow.append(this.label(t('dialog.pageBorder.label.label.x4482fe')), this.buildLineWidthSelect());",
        ].join('\n'),
      },
      {
        find: '    controls.append(lineRow, colorRow,',
        replace: '    controls.append(lineRow, widthRow, colorRow,',
      },
      {
        find: "    this.lineColorInput.value = firstBorder.color || '#000000';\n",
        replace: [
          "    this.lineColorInput.value = firstBorder.color || '#000000';",
          '    this.syncBorderControls();',
          '',
        ].join('\n'),
      },
      {
        find: [
          '  private handleBorderNoneChange(): void {',
          '    if (this.borderNoneCheck.checked) {',
          '      this.clearAllSides();',
          '    }',
        ].join('\n'),
        replace: [
          "  /** With 테두리 사용 안 함 on, the line's kind, width and colour change nothing: they are off. */",
          '  private syncBorderControls(): void {',
          '    const off = this.borderNoneCheck.checked;',
          '    this.lineTypeSelect.disabled = off;',
          '    this.lineWidthSelect.disabled = off;',
          '    this.lineColorInput.disabled = off;',
          '  }',
          '',
          '  private handleBorderNoneChange(): void {',
          '    this.syncBorderControls();',
          '    if (this.borderNoneCheck.checked) {',
          '      this.clearAllSides();',
          '    }',
        ].join('\n'),
      },
      {
        find: [
          '    this.borderNoneCheck.checked = !ALL_SIDES.some(side => this.isSideActive(side));',
          '  }',
        ].join('\n'),
        replace: [
          '    this.borderNoneCheck.checked = !ALL_SIDES.some(side => this.isSideActive(side));',
          '    this.syncBorderControls();',
          '  }',
        ].join('\n'),
      },
    ],
  },

  'studio-equation-labels': {
    file: studioFile('ui/equation-editor-dialog'),
    edits: [
      {
        find: "    { label: 'cases', hwp:",
        replace: "    { label: i18nText('hanpan.equation.cases'), hwp:",
      },
      {
        find: "    { label: 'lim', hwp:",
        replace: "    { label: i18nText('hanpan.equation.lim'), hwp:",
      },
      {
        find: "    this.modeBtn.className = 'eq-mode-btn';",
        replace: [
          "    this.modeBtn.className = 'eq-mode-btn';",
          '    // the HWP/LaTeX badge is the syntax switch; say so',
          "    this.modeBtn.title = i18nText('hanpan.equation.modeTip');",
        ].join('\n'),
      },
      {
        find: '    this.scriptArea.spellcheck = false;',
        replace: [
          '    this.scriptArea.spellcheck = false;',
          "    this.scriptArea.placeholder = i18nText('hanpan.equation.inputHint');",
        ].join('\n'),
      },
    ],
  },

  'studio-options-no-pdf': {
    file: studioFile('ui/options-dialog'),
    edits: [
      {
        find: ['    panel.appendChild(pdfSection);', '', '    return panel;'].join('\n'),
        replace: [
          '    // the app writes PDFs itself: the browser print guide this section switches never shows',
          '    void pdfSection;',
          '',
          '    return panel;',
        ].join('\n'),
      },
    ],
  },
}
