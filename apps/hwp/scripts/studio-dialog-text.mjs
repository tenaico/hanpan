/**
 * The studio's dialogs write some of their text in Korean straight into the markup instead of
 * asking the catalogs (문서 비교·이력, 수식·차트 데이터, 쪽 테두리 …), so an English or Vietnamese
 * tab showed Korean there. These patches make them ask for keys of the app's own
 * (`hanpan.*`, words in studio-plugin/studio-locales/dialog-strings.mjs), one patch per file.
 *
 * Korean that stays is data, not interface text: the diff engine's markers and titles the
 * compare views match on, font names, the Korean outline numbering preset. The studio-locales
 * test lists each with its reason.
 *
 * Each edit is found exactly once (or exactly `count` times) in the upstream source, so an
 * rhwp upgrade that changes a dialog stops the build instead of leaving Korean behind.
 */

/** A patch for one studio UI file that imports the studio's `t` as `alias`. */
function dialog(stem, alias, build) {
  /** `alias('key', params)` */
  const call = (key, params) => `${alias}('${key}'${params ? `, ${params}` : ''})`
  /** the same call inside a template literal */
  const hole = (key, params) => '${' + call(key, params) + '}'
  /** a quoted literal that appears once, asked for by key */
  const lit = (text, key, params) => ({ find: `'${text}'`, replace: call(key, params) })
  return {
    [`studio-text-${stem}`]: {
      file: new RegExp(String.raw`[\\/]rhwp-studio[\\/]src[\\/]ui[\\/]` + stem + String.raw`\.ts$`),
      edits: build({ call, hole, lit }),
    },
  }
}

/** The value rendering the compare dialog and the history dialog share (same code in both). */
function diffValueEdits({ call, hole }) {
  return [
    {
      find: '<div class="compare-result-kv-head">텍스트 변경</div><div class="compare-result-kv-line"><span class="k">기존</span><span class="v">${this.escape(l)}</span></div><div class="compare-result-kv-line"><span class="k">변경</span>',
      replace: `<div class="compare-result-kv-head">${hole('hanpan.diff.textChanged')}</div><div class="compare-result-kv-line"><span class="k">${hole('hanpan.diff.before')}</span><span class="v">\${this.escape(l)}</span></div><div class="compare-result-kv-line"><span class="k">${hole('hanpan.diff.after')}</span>`,
    },
    ...[
      ['r', '행', 'row'],
      ['c', '열', 'col'],
      ['tprev', '텍스트', 'text'],
      ['cprev', '셀 텍스트', 'cellText'],
      ['txt', '텍스트 해시', 'textHash'],
      ['props', '속성 해시', 'propsHash'],
      ['box', '크기', 'size'],
      ['sig', '시그니처', 'signature'],
      ['crop', '자르기', 'crop'],
      ['effect', '효과', 'effect'],
      ['bc', '밝기/대비', 'brightnessContrast'],
      ['rot', '회전', 'rotation'],
      ['flip', '대칭', 'flip'],
      ['wrap', '본문배치', 'wrap'],
      ['rel', '기준', 'relTo'],
      ['pix', '시각 내용', 'visual'],
    ].map(([field, text, key]) => ({
      find: `      ${field}: '${text}',`,
      replace: `      ${field}: ${call(`hanpan.diff.field.${key}`)},`,
    })),
    {
      find: '`<div class="compare-result-kv">변경값:<br/>변경 셀 ${changedCells}개 (셀 미리보기 범위를 벗어나거나 텍스트가 길어 일부 생략됨)</div>`',
      replace: `\`<div class="compare-result-kv">${hole('hanpan.diff.changes')}<br/>${hole('hanpan.diff.changedCells', '{ count: changedCells }')}</div>\``,
    },
    {
      find: "const lp = left.props ?? '(없음)';",
      replace: `const lp = left.props ?? ${call('hanpan.diff.none')};`,
    },
    {
      find: "const rp = right.props ?? '(없음)';",
      replace: `const rp = right.props ?? ${call('hanpan.diff.none')};`,
    },
    {
      find: '`<div class="compare-result-kv">변경값:<br/>속성 해시: ${this.escape(lp)} → ${this.escape(rp)}</div>`',
      replace: `\`<div class="compare-result-kv">${hole('hanpan.diff.changes')}<br/>${hole('hanpan.diff.propsHashChange', '{ before: this.escape(lp), after: this.escape(rp) }')}</div>\``,
    },
    {
      find: '\'<div class="compare-result-kv">변경값:<br/>속성 값 변경</div>\'',
      replace: `\`<div class="compare-result-kv">${hole('hanpan.diff.changes')}<br/>${hole('hanpan.diff.propsChanged')}</div>\``,
    },
    {
      find: '`<div class="compare-result-kv">변경값:<br/>${body}</div>`',
      replace: `\`<div class="compare-result-kv">${hole('hanpan.diff.changes')}<br/>\${body}</div>\``,
    },
    {
      // the engine's marker is compared; what is shown is in the UI language
      find: "if (value === '(없음)') return value;",
      replace: `if (value === '(없음)') return ${call('hanpan.diff.none')};`,
    },
    {
      find: 'return `좌${nums[0]}, 상${nums[1]}, 우${nums[2]}, 하${nums[3]}`;',
      replace: `return ${call('hanpan.diff.cropValue', '{ left: nums[0], top: nums[1], right: nums[2], bottom: nums[3] }')};`,
    },
    {
      find: "return normalized || '(없음)';",
      replace: `return normalized || ${call('hanpan.diff.none')};`,
    },
    {
      find: "if (key === 'rot') return `${value}도`;",
      replace: `if (key === 'rot') return ${call('hanpan.diff.degrees', '{ value }')};`,
    },
    {
      find: 'return `밝기 ${b}, 대비 ${c}`;',
      replace: `return ${call('hanpan.diff.brightnessContrast', '{ brightness: b, contrast: c }')};`,
    },
    {
      find: "if (value === '10') return '가로';",
      replace: `if (value === '10') return ${call('hanpan.diff.flipHorizontal')};`,
    },
    {
      find: "if (value === '01') return '세로';",
      replace: `if (value === '01') return ${call('hanpan.diff.flipVertical')};`,
    },
    {
      find: "if (value === '11') return '가로+세로';",
      replace: `if (value === '11') return ${call('hanpan.diff.flipBoth')};`,
    },
    {
      find: "if (value === '00') return '없음';",
      replace: `if (value === '00') return ${call('hanpan.diff.flipNone')};`,
    },
    {
      find: "map.set(cell, text || '(빈값)');",
      replace: `map.set(cell, text || ${call('hanpan.diff.empty')});`,
    },
    ...[
      ['table', '표'],
      ['shape', '도형'],
      ['image', '이미지'],
      ['chart', '그래프'],
      ['text', '텍스트'],
    ].map(([kind, text]) => ({
      find: `if (kind === '${kind}') return '${text}';`,
      replace: `if (kind === '${kind}') return ${call(`hanpan.diff.kind.${kind}`)};`,
    })),
    { find: "    return '메타';", replace: `    return ${call('hanpan.diff.kind.meta')};` },
  ]
}

const DIALOG_PATCHES = {
  ...dialog('bookmark-dialog', 't', ({ call, lit }) => [
    {
      find: 'this.nameInput.value = `책갈피${count}`;',
      replace: `this.nameInput.value = ${call('hanpan.bookmark.defaultName', '{ count }')};`,
    },
    lit('새 책갈피 이름:', 'hanpan.bookmark.renamePrompt'),
  ]),
  ...dialog('cell-border-bg-dialog', 'i18nText', ({ lit }) => [
    lit('단순 역대각선', 'hanpan.cellBorder.backSlashCenter'),
    lit('아래쪽 분기 역대각선', 'hanpan.cellBorder.backSlashCenterBelow'),
    lit('전체 분기 역대각선', 'hanpan.cellBorder.backSlashAll'),
    lit('단순 대각선', 'hanpan.cellBorder.slashCenter'),
    lit('아래쪽 분기 대각선', 'hanpan.cellBorder.slashCenterBelow'),
    lit('전체 분기 대각선', 'hanpan.cellBorder.slashAll'),
    lit('대각선 해제', 'hanpan.cellBorder.clearSlash'),
    lit('역대각선 해제', 'hanpan.cellBorder.clearBackSlash'),
  ]),
  ...dialog('char-shape-dialog', 'i18nText', ({ call, lit }) => [
    lit('웹 글꼴', 'hanpan.font.webGroup'),
    lit('로컬 글꼴', 'hanpan.font.localGroup'),
    {
      find: "['없음', '실선', '점선', '굵은 선', '파선', '일점쇄선', '이점쇄선'].forEach",
      replace: `[${['none', 'solid', 'dotted', 'thick', 'dashed', 'dashDot', 'dashDotDot']
        .map((key) => call(`hanpan.line.${key}`))
        .join(', ')}].forEach`,
    },
  ]),
  ...dialog('chart-data-dialog', 't', ({ lit }) => [
    lit(
      '원본이 빈 값(결측)이라 이 자리는 고칠 수 없습니다 — 행을 새로 넣으면 값을 쓸 수 있습니다.',
      'hanpan.chartData.emptyCell',
    ),
    lit('원본에 이 계열의 값이 없던 자리입니다.', 'hanpan.chartData.absentCell'),
    lit('이 계열은 이름 칸(c:tx)이 없어 이름을 넣을 자리가 없습니다.', 'hanpan.chartData.noName'),
    lit('셀을 우클릭하면 행·계열을 넣거나 지울 수 있습니다.', 'hanpan.chartData.gridNote'),
    lit(
      '원형 차트는 첫 계열만 그리므로, 추가한 계열은 화면에 나타나지 않습니다.',
      'hanpan.chartData.pieExtraSeries',
    ),
    lit(
      '주식형 캔들은 첫·끝 계열을 몸통으로 삼습니다 — 양끝을 바꾸면 그림이 깨집니다.',
      'hanpan.chartData.candle',
    ),
    lit('다층 카테고리 차트는 행 구조를 바꿀 수 없습니다.', 'hanpan.chartData.multiLevelRows'),
    lit('계열마다 라벨이 달라 행 구조를 바꿀 수 없습니다.', 'hanpan.chartData.labelsDifferRows'),
    lit('마지막 행은 지울 수 없습니다.', 'hanpan.chartData.lastRow'),
    lit('마지막 계열은 지울 수 없습니다.', 'hanpan.chartData.lastSeries'),
  ]),
  ...dialog('compare-dialog', 'i18nText', (helpers) => [
    {
      find: "title.innerHTML = '<span>문서 비교</span>';",
      replace: `title.innerHTML = \`<span>${helpers.hole('hanpan.compare.title')}</span>\`;`,
    },
    helpers.lit('오른쪽 문서 로드 실패', 'hanpan.compare.rightLoadFailed'),
    helpers.lit('오른쪽 문서 로드 타임아웃', 'hanpan.compare.rightLoadTimeout'),
    {
      find: "if (!t) return '(없음)';",
      replace: `if (!t) return ${helpers.call('hanpan.diff.none')};`,
    },
    ...diffValueEdits(helpers),
  ]),
  ...dialog('history-dialog', 't', (helpers) => [
    {
      find: "title.innerHTML = '<span>문서 이력 관리</span>';",
      replace: `title.innerHTML = \`<span>${helpers.hole('hanpan.history.title')}</span>\`;`,
    },
    {
      find: "if (!trimmed) return '(없음)';",
      replace: `if (!trimmed) return ${helpers.call('hanpan.diff.none')};`,
    },
    ...diffValueEdits(helpers),
  ]),
  ...dialog('compare-result-window', 't', ({ call }) => [
    {
      find: "item.leftPreview || '(없음)')",
      replace: `item.leftPreview || ${call('hanpan.diff.none')})`,
      count: 2,
    },
    {
      find: "item.rightPreview || '(없음)')",
      replace: `item.rightPreview || ${call('hanpan.diff.none')})`,
      count: 2,
    },
    {
      find: "return { left: '(셀 텍스트 동일)', right: '(셀 텍스트 동일)' };",
      replace: `return { left: ${call('hanpan.diff.cellsUnchanged')}, right: ${call('hanpan.diff.cellsUnchanged')} };`,
    },
    {
      // the engine's empty marker shows in the UI language
      find: "if (!raw) return '(없음)';",
      replace: `if (!raw || raw === '(없음)') return ${call('hanpan.diff.none')};`,
    },
    {
      find: "${cell.replace(/^r(\\d+)c(\\d+)$/i, '$1행$2열')}",
      replace: '${cell.replace(/^r(\\d+)c(\\d+)$/i, ' + call('hanpan.diff.cellAddress') + ')}',
    },
    {
      find: 'lines.push(`... 외 ${cells.length - 5}개 셀`);',
      replace: `lines.push(${call('hanpan.diff.moreCells', '{ count: cells.length - 5 }')});`,
    },
    {
      find: "push('회전', kv.rot ? `${kv.rot}도` : undefined);",
      replace: `push(${call('hanpan.diff.field.rotation')}, kv.rot ? ${call('hanpan.diff.degrees', '{ value: kv.rot }')} : undefined);`,
    },
    ...[
      ['셀 텍스트', 'cellText'],
      ['행', 'row'],
      ['열', 'col'],
      ['크기', 'size'],
      ['텍스트', 'text'],
      ['자르기', 'crop'],
      ['효과', 'effect'],
      ['밝기/대비', 'brightnessContrast'],
      ['대칭', 'flip'],
      ['배치', 'layout'],
      ['기준', 'relTo'],
    ].map(([text, key]) => ({
      find: `push('${text}',`,
      replace: `push(${call(`hanpan.diff.field.${key}`)},`,
    })),
  ]),
  ...dialog('equation-props-dialog', 't', ({ call, lit }) => [
    lit('글자처럼 취급', 'hanpan.equationProps.treatAsChar'),
    {
      find: "if (!this.props?.hasCaption) return '없음';",
      replace: `if (!this.props?.hasCaption) return ${call('hanpan.caption.none')};`,
    },
    { find: "return '위';", replace: `return ${call('hanpan.caption.top')};` },
    { find: "return '아래';", replace: `return ${call('hanpan.caption.bottom')};` },
    { find: "return '왼쪽';", replace: `return ${call('hanpan.caption.left')};` },
    { find: "return '오른쪽';", replace: `return ${call('hanpan.caption.right')};` },
    {
      find: "default:\n        return '없음';",
      replace: `default:\n        return ${call('hanpan.caption.none')};`,
    },
  ]),
  ...dialog('field-insert-dialog', 't', ({ call }) => [
    {
      // set when the dialog is built and again when it is reused
      find: "this.guideInput.value = '입력하세요';",
      replace: `this.guideInput.value = ${call('hanpan.field.defaultGuide')};`,
      count: 2,
    },
  ]),
  ...dialog('font-set-edit-dialog', 't', ({ lit }) => [
    lit('웹 글꼴', 'hanpan.font.webGroup'),
    lit('로컬 글꼴', 'hanpan.font.localGroup'),
  ]),
  ...dialog('formula-dialog', 't', ({ call }) =>
    [
      ['합계', 'sum'],
      ['평균', 'average'],
      ['곱', 'product'],
      ['최소값', 'min'],
      ['최대값', 'max'],
      ['개수', 'count'],
      ['절대값', 'abs'],
      ['제곱근', 'sqrt'],
      ['반올림', 'round'],
      ['올림', 'ceiling'],
      ['내림', 'floor'],
      ['절삭', 'trunc'],
      ['나머지', 'mod'],
      ['조건', 'if'],
      ['정수', 'int'],
      ['부호', 'sign'],
      ['e 거듭제곱', 'exp'],
      ['자연로그', 'log'],
      ['상용로그', 'log10'],
      ['사인', 'sin'],
      ['코사인', 'cos'],
      ['탄젠트', 'tan'],
    ].map(([text, key]) => ({
      find: `desc: '${text}' }`,
      replace: `desc: ${call(`hanpan.formula.${key}`)} }`,
    })),
  ),
  ...dialog('hml-import-warning-message', 'i18nText', ({ call }) => [
    {
      find: "import type { HmlOpenMetadata } from '../core/wasm-bridge.ts';",
      replace: [
        "import type { HmlOpenMetadata } from '../core/wasm-bridge.ts';",
        "import { t as i18nText } from '../i18n/index.ts';",
      ].join('\n'),
    },
    {
      find: '`HML${version} 문서를 열었습니다. HML로 의미를 보존해 저장할 수 있지만 원본 바이트와 동일하지는 않습니다.`',
      replace: call('hanpan.hml.openedSavable', '{ version }'),
    },
    {
      find: '`HML${version} 문서를 열었습니다. 보존할 수 없는 요소가 있어 HML로는 저장할 수 없습니다. HWP 또는 HWPX로 저장하세요.`',
      replace: call('hanpan.hml.openedNotSavable', '{ version }'),
    },
    {
      find: '`지원하지 않거나 변환된 요소 ${metadata.warnings.length}건이 있습니다.`',
      replace: call('hanpan.hml.unsupported', '{ count: metadata.warnings.length }'),
    },
    {
      find: '`그 외 ${metadata.warnings.length - MAX_WARNING_PATHS}건`',
      replace: call('hanpan.hml.more', '{ count: metadata.warnings.length - MAX_WARNING_PATHS }'),
    },
  ]),
  ...dialog('hml-save-format-message', 'i18nText', ({ call, hole }) => [
    {
      find: "} from '../core/hml-save-capability.ts';",
      replace: [
        "} from '../core/hml-save-capability.ts';",
        "import { t as i18nText } from '../i18n/index.ts';",
      ].join('\n'),
    },
    {
      find: "'HML로 의미를 보존해 저장할 수 있지만 원본 바이트와 동일하지는 않습니다.\\n저장할 형식을 선택하세요.'",
      replace: call('hanpan.hml.saveKeepsMeaning'),
    },
    {
      find: "`${capability.diagnostic ?? 'HML 저장을 사용할 수 없습니다.'}\\nHWP 또는 HWPX로 저장할 수 있습니다.`",
      replace: `\`\${capability.diagnostic ?? ${call('hanpan.hml.saveUnavailable')}}\\n${hole('hanpan.hml.canSaveHwp')}\``,
    },
    {
      find: '`그 외 ${blockers.length - MAX_BLOCKER_PATHS}건`',
      replace: call('hanpan.hml.more', '{ count: blockers.length - MAX_BLOCKER_PATHS }'),
    },
  ]),
  ...dialog('hyperlink-dialog', 't', ({ call, lit }) => [
    lit(
      'http:// 또는 https://로 시작하는 웹 주소를 입력해 주세요.',
      'hanpan.hyperlink.needWebAddress',
    ),
    lit(
      '팝업이 차단되었습니다. 이 사이트의 팝업을 허용해 주세요.',
      'hanpan.hyperlink.popupBlocked',
    ),
    {
      find: "this.initial.existing ? '하이퍼링크 고치기' : '하이퍼링크'",
      replace: `this.initial.existing ? ${call('hanpan.hyperlink.editLabel')} : ${call('hanpan.hyperlink.label')}`,
    },
  ]),
  ...dialog('options-dialog', 'i18nText', ({ call, lit }) => [
    {
      find: 'return `저장소 접근 실패: ${state.lastError}`;',
      replace: `return ${call('hanpan.options.storageFailed', '{ error: state.lastError }')};`,
    },
    {
      find: 'return `문서별 확인 결과 저장됨: 사용 가능 ${state.count}개 / 확인한 글꼴 ${state.checkedFamilies.length}개${dateSuffix}`;',
      replace: `return ${call('hanpan.options.probeStored', '{ count: state.count, checked: state.checkedFamilies.length, date: dateSuffix }')};`,
    },
    {
      find: 'return `로컬 글꼴 결과 저장됨: 사용 가능 ${state.count}개 / 문서 후보 ${state.checkedFamilies.length}개 / 열거 누락 확인 ${state.probedFamilies.length}개${dateSuffix}`;',
      replace: `return ${call('hanpan.options.localStored', '{ count: state.count, checked: state.checkedFamilies.length, probed: state.probedFamilies.length, date: dateSuffix }')};`,
    },
    {
      find: 'return `로컬 글꼴 열거 결과 저장됨: ${state.count}개 · 문서별 누락 후보는 문서를 열 때 추가 확인${dateSuffix}`;',
      replace: `return ${call('hanpan.options.listStored', '{ count: state.count, date: dateSuffix }')};`,
    },
    lit(
      '로컬 글꼴 접근 권한이 허용되지 않았습니다. 브라우저 권한 설정에서 허용한 뒤 다시 시도해 주세요.',
      'hanpan.options.permissionDenied',
    ),
    lit(
      '글꼴 감지에 실패했습니다. 웹 대체 글꼴로 계속 사용할 수 있습니다.',
      'hanpan.options.detectFailed',
    ),
  ]),
  ...dialog('page-border-dialog', 't', ({ call }) => [
    ...[
      ['위쪽', 'sideTop'],
      ['왼쪽', 'sideLeft'],
      ['오른쪽', 'sideRight'],
      ['아래쪽', 'sideBottom'],
      ['모두', 'sideAll'],
    ].map(([text, key]) => ({
      find: `this.sideButton('${text}',`,
      replace: `this.sideButton(${call(`hanpan.pageBorder.${key}`)},`,
    })),
    ...[
      ['0', '무늬 없음', 'pageBorder.patternNone'],
      ['1', '가로선', 'pageBorder.patternHorizontal'],
      ['2', '세로선', 'pageBorder.patternVertical'],
      ['3', '대각선', 'pageBorder.patternDiagonal'],
      ['4', '격자', 'pageBorder.patternGrid'],
      ['0', '없음', 'line.none'],
      ['1', '실선', 'line.solid'],
      ['2', '파선', 'line.dashed'],
      ['3', '점선', 'line.dotted'],
      ['4', '일점 쇄선', 'line.dashDotSpaced'],
      ['5', '이점 쇄선', 'line.dashDotDotSpaced'],
      ['6', '긴 파선', 'line.longDash'],
      ['8', '이중선', 'line.double'],
      ['12', '물결선', 'line.wavy'],
    ].map(([value, text, key]) => ({
      find: `['${value}', '${text}'],`,
      replace: `['${value}', ${call(`hanpan.${key}`)}],`,
    })),
  ]),
  ...dialog('style-dialog', 't', ({ call }) => [
    {
      find: '`왼쪽 여백: ${ml} pt&nbsp;&nbsp;&nbsp;첫 줄: ${firstLine}`,',
      replace: `${call('hanpan.style.leftMargin', '{ margin: ml, firstLine }')},`,
    },
    {
      find: '`오른쪽 여백: ${mr} pt&nbsp;&nbsp;&nbsp;정렬 방식: ${align}`,',
      replace: `${call('hanpan.style.rightMargin', '{ margin: mr, align }')},`,
    },
    {
      find: '`줄 간격: ${lsStr}`,',
      replace: `${call('hanpan.style.lineSpacing', '{ value: lsStr }')},`,
    },
    {
      find: '`다음 스타일: ${nextStyleName}`,',
      replace: `${call('hanpan.style.nextStyle', '{ name: nextStyleName }')},`,
    },
    { find: '`글꼴: ${font}`,', replace: `${call('hanpan.style.font', '{ font }')},` },
    { find: '`크기: ${size} pt`,', replace: `${call('hanpan.style.size', '{ size }')},` },
    {
      find: '`장평: ${ratio}%&nbsp;&nbsp;자간: ${spacing}%`,',
      replace: `${call('hanpan.style.widthSpacing', '{ ratio, spacing }')},`,
    },
  ]),
  ...dialog('style-edit-dialog', 't', ({ lit }) => [lit('새 스타일', 'hanpan.style.newName')]),
  ...dialog('table-cell-props-dialog', 'i18nText', ({ call }) => [
    {
      find: "['위쪽', '가운데', '아래쪽'].map(",
      replace: `[${call('hanpan.cell.vAlignTop')}, ${call('hanpan.cell.vAlignCenter')}, ${call('hanpan.cell.vAlignBottom')}].map(`,
    },
    {
      find: "['가로쓰기', '세로쓰기'].map(",
      replace: `[${call('hanpan.cell.textHorizontal')}, ${call('hanpan.cell.textVertical')}].map(`,
    },
    {
      find: "['선형', '방사형', '원뿔형', '사각형']",
      replace: `[${['Linear', 'Radial', 'Conical', 'Square']
        .map((key) => call(`hanpan.cell.gradient${key}`))
        .join(', ')}]`,
    },
  ]),
  ...dialog('table-row-column-dialog', 't', ({ call, lit }) => [
    lit('위쪽에 줄 추가하기', 'hanpan.tableRowColumn.rowAbove'),
    lit('아래쪽에 줄 추가하기', 'hanpan.tableRowColumn.rowBelow'),
    lit('왼쪽에 칸 추가하기', 'hanpan.tableRowColumn.colLeft'),
    lit('오른쪽에 칸 추가하기', 'hanpan.tableRowColumn.colRight'),
    { find: "'row', '줄',", replace: `'row', ${call('hanpan.tableRowColumn.rows')},` },
    { find: "'col', '칸',", replace: `'col', ${call('hanpan.tableRowColumn.cols')},` },
  ]),
  ...dialog('toolbar', 't', ({ call }) => [
    {
      // found again by a mark of its own, not by its (now translated) label
      find: `this.fontName.querySelectorAll('optgroup[label="대표 글꼴"]')`,
      replace: `this.fontName.querySelectorAll('optgroup[data-hanpan-font-sets]')`,
    },
    {
      find: "group.label = '대표 글꼴';",
      replace: `group.label = ${call('hanpan.font.fontSetGroup')}; group.dataset.hanpanFontSets = '';`,
    },
  ]),
}

/** The module the studio build aliases to studio-plugin/studio-locales.mjs. */
export const STUDIO_LOCALES_MODULE = '@ieum/studio-locales'

/** An edit that puts an import at the top of a file. */
const importing = (line) => ({ prepend: line })

/**
 * Display patches for UI files whose text is data: the style names a document stores and
 * the titles the diff engine writes keep their stored form and are shown in the UI language.
 */
const DISPLAY_PATCHES = {
  'studio-display-style-dialog': {
    file: /[\\/]rhwp-studio[\\/]src[\\/]ui[\\/]style-dialog\.ts$/,
    edits: [
      importing("import { getLocale } from '@/i18n/core.ts';"),
      importing(`import { styleDisplayName } from '${STUDIO_LOCALES_MODULE}';`),
      {
        find: 'name.textContent = s.name;',
        replace: 'name.textContent = styleDisplayName(s, getLocale());',
      },
      {
        find: "const nextStyleName = nextStyle?.name ?? style?.name ?? '';",
        replace: 'const nextStyleName = styleDisplayName(nextStyle ?? style, getLocale());',
      },
      { find: '{ p1: style.name }', replace: '{ p1: styleDisplayName(style, getLocale()) }' },
      {
        find: "this.currentStyleLabel.textContent = this.styles.find(s => s.id === this.selectedId)?.name ?? '';",
        replace:
          'this.currentStyleLabel.textContent = styleDisplayName(this.styles.find(s => s.id === this.selectedId), getLocale());',
      },
      {
        find: "this.currentStyleLabel.textContent = style?.name ?? '';",
        replace: 'this.currentStyleLabel.textContent = styleDisplayName(style, getLocale());',
      },
    ],
  },
  'studio-display-numbering-dialog': {
    file: /[\\/]rhwp-studio[\\/]src[\\/]ui[\\/]numbering-dialog\.ts$/,
    edits: [
      importing("import { getLocale } from '@/i18n/core.ts';"),
      {
        find: 'cell.title = preset.name;',
        replace: "cell.title = getLocale() === 'ko' ? preset.name : preset.nameEn;",
      },
    ],
  },
  ...Object.fromEntries(
    ['compare-dialog', 'history-dialog'].map((stem) => [
      `studio-display-${stem}`,
      {
        file: new RegExp(
          String.raw`[\\/]rhwp-studio[\\/]src[\\/]ui[\\/]` + stem + String.raw`\.ts$`,
        ),
        edits: [
          importing("import { getLocale } from '@/i18n/core.ts';"),
          importing(`import { diffTitleText } from '${STUDIO_LOCALES_MODULE}';`),
          {
            find: '${this.escape(item.title)}',
            replace: '${this.escape(diffTitleText(item.title, getLocale()))}',
          },
        ],
      },
    ]),
  ),
  'studio-display-history-dates': {
    file: /[\\/]rhwp-studio[\\/]src[\\/]ui[\\/]history-dialog\.ts$/,
    edits: [
      // the saved-history list and a snapshot's default note: dates in the UI language
      {
        find: "toLocaleString('ko-KR')",
        replace: "toLocaleString(t('hanpan.localeTag'))",
        count: 2,
      },
    ],
  },
  'studio-display-compare-result-window': {
    file: /[\\/]rhwp-studio[\\/]src[\\/]ui[\\/]compare-result-window\.ts$/,
    edits: [
      importing("import { getLocale } from '@/i18n/core.ts';"),
      importing(`import { diffTitleText } from '${STUDIO_LOCALES_MODULE}';`),
      {
        find: '[${item.kind}] ${item.title}',
        replace: '[${item.kind}] ${diffTitleText(item.title, getLocale())}',
        count: 2,
      },
    ],
  },
}

/** A patch for a studio file outside src/ui (`path` from src, no extension); it imports `hanpanText`. */
function source(path, build) {
  const call = (key, params) => `hanpanText('${key}'${params ? `, ${params}` : ''})`
  const lit = (text, key, params, count) => ({
    find: `'${text}'`,
    replace: call(key, params),
    ...(count ? { count } : {}),
  })
  const label = (text, key, count) => ({
    find: `label: '${text}'`,
    replace: `label: ${call(key)}`,
    ...(count ? { count } : {}),
  })
  const pattern = path.split('/').join(String.raw`[\\/]`)
  return {
    [`studio-text-${path.replaceAll('/', '-')}`]: {
      file: new RegExp(String.raw`[\\/]rhwp-studio[\\/]src[\\/]` + pattern + String.raw`\.ts$`),
      edits: [
        importing("import { t as hanpanText } from '@/i18n/index.ts';"),
        ...build({ call, lit, label }),
      ],
    },
  }
}

const SOURCE_PATCHES = {
  ...source('engine/input-handler', ({ call, lit, label }) => [
    label('캡션 넣기(A)', 'hanpan.ctx.captionInsert', 3),
    label('표 속성...', 'hanpan.ctx.tableProps'),
    label('표 붙이기', 'hanpan.ctx.tableAttach', 2),
    label('표 나누기', 'hanpan.ctx.tableSplit'),
    label('개체 묶기(G)', 'hanpan.ctx.group'),
    label('개체 풀기(U)', 'hanpan.ctx.ungroup'),
    label('지우기(D)', 'hanpan.ctx.delete', 2),
    lit('수식으로 변환하여 편집...', 'hanpan.ctx.convertEquation'),
    lit('수식 편집...', 'hanpan.ctx.editEquation'),
    label('차트 데이터 편집...', 'hanpan.ctx.editChartData'),
    label('맨 앞으로', 'hanpan.ctx.bringToFront'),
    label('앞으로', 'hanpan.ctx.bringForward'),
    label('뒤로', 'hanpan.ctx.sendBackward'),
    label('맨 뒤로', 'hanpan.ctx.sendToBack'),
    label('개체 속성(P)...', 'hanpan.ctx.objectProps'),
    label('셀 속성...', 'hanpan.ctx.cellProps'),
    label('셀 테두리/배경 - 각 셀마다 적용(E)...', 'hanpan.ctx.borderEach'),
    label('셀 테두리/배경 - 하나의 셀처럼 적용(Z)...', 'hanpan.ctx.borderOne'),
    label('계산식(F)...', 'hanpan.ctx.formula'),
    label('글자 모양', 'hanpan.ctx.charShape'),
    label('문단 모양', 'hanpan.ctx.paraShape'),
    label('문단 번호 모양(N)...', 'hanpan.ctx.paraNumShape'),
    lit('그림을 넣을 문단을 찾지 못했습니다.', 'hanpan.picture.noParagraph', undefined, 2),
    lit('이미지 크기를 확인할 수 없습니다.', 'hanpan.picture.noSize'),
    lit('삽입 위치 또는 이미지 정보를 확인할 수 없습니다.', 'hanpan.picture.noInsertInfo'),
    {
      find: "showConfirm('지우기', '[누름틀]을 지울까요?')",
      replace: `showConfirm(${call('hanpan.field.deleteTitle')}, ${call('hanpan.field.deleteConfirm')})`,
    },
  ]),
  ...source('engine/input-handler-mouse', ({ label }) => [
    label('하이퍼링크 고치기...', 'hanpan.ctx.hyperlinkEdit'),
    label('하이퍼링크 지우기', 'hanpan.ctx.hyperlinkRemove'),
    label('누름틀 고치기(E)...', 'hanpan.ctx.fieldEdit'),
    label('누름틀 지우기(J)', 'hanpan.ctx.fieldRemove'),
  ]),
  ...source('engine/input-handler-text', ({ lit }) => [
    lit('각주 삭제', 'hanpan.footnote.deleteTitle'),
    lit('각주를 삭제하시겠습니까?', 'hanpan.footnote.deleteConfirm'),
  ]),
  ...source('engine/input-handler-table', ({ call, lit }) => [
    lit(
      '그림을 넣을 문단을 찾지 못했습니다.\\n문서 본문이나 표 셀 안쪽을 다시 클릭하세요.',
      'hanpan.picture.noParagraphHint',
    ),
    lit('삽입 위치 또는 이미지 정보를 확인할 수 없습니다.', 'hanpan.picture.noInsertInfo'),
    {
      find: 'message: `그림 삽입에 실패했습니다.\\n${insertFailedMsg}`,',
      replace: `message: ${call('hanpan.picture.insertFailed', '{ reason: insertFailedMsg }')},`,
    },
    {
      find: 'message: `그림 삽입에 실패했습니다.\\n${msg}`,',
      replace: `message: ${call('hanpan.picture.insertFailed', '{ reason: msg }')},`,
    },
  ]),
  ...source('engine/input-handler-picture', ({ call, lit }) => [
    lit('이미지 크기를 확인할 수 없습니다.', 'hanpan.picture.noSize'),
    lit('브라우저가 이 이미지 파일을 읽지 못했습니다.', 'hanpan.picture.unreadable'),
    {
      find: 'message: `그림을 지정할 수 없습니다.\\n${msg}`,',
      replace: `message: ${call('hanpan.picture.cannotSet', '{ reason: msg }')},`,
    },
  ]),
  ...source('engine/input-handler-hyperlink', ({ lit }) => [
    lit(
      '팝업이 차단되었습니다. 이 사이트의 팝업을 허용해 주세요.',
      'hanpan.hyperlink.popupBlocked',
    ),
  ]),
  ...source('engine/input-handler-hyperlink-delete', ({ lit }) => [
    lit('편집 상태가 바뀌었습니다. 하이퍼링크를 다시 선택해 주세요.', 'hanpan.hyperlink.reselect'),
  ]),
  ...source('engine/cell-selection-phase', ({ lit }) => [
    lit('셀 선택 · 방향키로 이동', 'hanpan.cellSel.cell'),
    lit('셀 범위 선택 · 방향키로 확장', 'hanpan.cellSel.range'),
    lit('표 전체 선택', 'hanpan.cellSel.table'),
  ]),
  ...source('engine/command', ({ lit }) => [
    lit('글자 서식을 적용하지 못했습니다.', 'hanpan.charFormat.applyFailed', undefined, 2),
  ]),
  ...source('command/commands/file', ({ call, lit }) => [
    {
      find: 'new Error(`출력 전 페이지네이션을 완료하지 못했습니다 (${reason})`)',
      replace: `new Error(${call('hanpan.file.pagination', '{ reason }')})`,
    },
    lit('암호 설정 저장은 HWP 또는 HWPX 형식에서만 지원합니다.', 'hanpan.file.passwordFormat'),
    lit('보호 해제', 'hanpan.file.unprotectTitle'),
    lit(
      'HML 형식은 문서 암호를 지원하지 않습니다. 암호 없이 저장하면 보호가 해제됩니다. 계속할까요?',
      'hanpan.file.unprotectHml',
    ),
    lit('저장은 호스트 애플리케이션이 담당합니다.', 'hanpan.file.hostSaves'),
  ]),
  ...source('command/commands/insert', ({ lit }) => [
    lit('이미지 크기를 확인할 수 없습니다.', 'hanpan.picture.noSize'),
    lit('브라우저가 이 이미지 파일을 읽지 못했습니다.', 'hanpan.picture.unreadable'),
  ]),
  ...source('command/commands/hyperlink', ({ lit }) => [
    lit(
      '본문·표 셀·글상자의 글자에서 하이퍼링크를 편집해 주세요.',
      'hanpan.hyperlink.whereEditable',
    ),
    lit(
      '편집 상태가 바뀌었습니다. 대화상자를 닫고 다시 열어 주세요.',
      'hanpan.hyperlink.stateChanged',
    ),
    lit(
      '문서 내용이 바뀌었습니다. 대화상자를 닫고 다시 열어 주세요.',
      'hanpan.hyperlink.documentChanged',
    ),
    lit('표시할 글자를 한 줄로 입력해 주세요.', 'hanpan.hyperlink.oneLine'),
    lit(
      '하이퍼링크를 적용할 수 없습니다. 편집 모드를 확인해 주세요.',
      'hanpan.hyperlink.cannotApply',
    ),
  ]),
  ...source('command/export-html', ({ call, lit }) => [
    lit('Word 문서(.doc)', 'hanpan.export.wordDoc'),
    {
      find: 'new Error(`구역 ${section + 1} HTML 변환 실패: ${message}`)',
      replace: `new Error(${call('hanpan.export.sectionFailed', '{ section: section + 1, message }')})`,
    },
    { find: "|| '문서';", replace: `|| ${call('hanpan.file.defaultName')};` },
  ]),
  ...source('command/file-open-picker', ({ call }) => [
    {
      find: 'deps.alert(`파일 열기에 실패했습니다:\\n${message}`);',
      replace: `deps.alert(${call('hanpan.file.openFailed', '{ message }')});`,
    },
  ]),
  ...source('command/file-system-access', ({ call, lit }) => [
    lit('HWP/HWPX/HML 문서', 'hanpan.file.pickerHwp'),
    lit('HML 원본 파일은 저장 대상으로 선택할 수 없습니다.', 'hanpan.file.hmlNotTarget'),
    {
      find: '`${expectedExtension} 확장자를 가진 파일을 선택해야 합니다.`',
      replace: call('hanpan.file.needExtension', '{ ext: expectedExtension }'),
    },
  ]),
  ...source('command/print-pages', ({ call, lit }) => [
    lit('브라우저 인쇄 창에서 ‘대상 → PDF로 저장’을 선택합니다.', 'hanpan.print.pdfGuidance'),
    {
      find: "return baseName || '문서';",
      replace: `return baseName || ${call('hanpan.file.defaultName')};`,
    },
    lit('PDF 준비 중…', 'hanpan.print.preparingPdf'),
    lit('인쇄 준비 중…', 'hanpan.print.preparing'),
    {
      find: '`PDF 준비 완료 — ${PDF_PRINT_GUIDANCE}`',
      replace: call('hanpan.print.pdfReady', '{ guidance: PDF_PRINT_GUIDANCE }'),
    },
    lit('인쇄 미리보기 준비 완료', 'hanpan.print.ready'),
  ]),
  ...source('command/print-surface', ({ lit }) => [
    lit('인쇄 미리보기 팝업이 차단되었습니다.', 'hanpan.print.popupBlocked'),
    lit('인쇄 문서', 'hanpan.print.frameTitle'),
  ]),
  ...source('command/save-format', ({ lit }) => [
    lit('HML 문서', 'hanpan.file.saveHml'),
    lit('HWP 문서', 'hanpan.file.saveHwp'),
    lit('HWPX 문서', 'hanpan.file.saveHwpx'),
  ]),
  ...source('compare/diff-engine', ({ call }) => [
    // the character diff summary a history item shows; the titles stay (the views match on them)
    {
      find: 'return `문자 diff 요약 생략(길이: ${left.length}+${right.length})`;',
      replace: `return ${call('hanpan.charDiff.tooLong', '{ left: left.length, right: right.length }')};`,
    },
    {
      find: 'return `문자 diff 요약 생략(과대: ${n}×${m})`;',
      replace: `return ${call('hanpan.charDiff.tooLarge', '{ n, m }')};`,
    },
    {
      find: 'return `편집거리 ${dist} · ${pat}`;',
      replace: `return ${call('hanpan.charDiff.distance', '{ distance: dist, pattern: pat }')};`,
    },
  ]),
  ...source('compare/diff-location-label', ({ call }) => [
    {
      find: 'return `제 ${sec + 1}구역, ${sectionPage}쪽`;',
      replace: `return ${call('hanpan.diffLoc.sectionPage', '{ section: sec + 1, page: sectionPage }')};`,
    },
    {
      find: 'if (anchor) return `제 ${sec + 1}구역, ${anchor.pageIndex + 1}쪽`;',
      replace: `if (anchor) return ${call('hanpan.diffLoc.sectionPage', '{ section: sec + 1, page: anchor.pageIndex + 1 }')};`,
    },
    {
      find: 'return `제 ${sec + 1}구역`;',
      replace: `return ${call('hanpan.diffLoc.section', '{ section: sec + 1 }')};`,
    },
    {
      find: 'if (L && R) return `좌 ${L}, 우 ${R}`;',
      replace: `if (L && R) return ${call('hanpan.diffLoc.leftRight', '{ left: L, right: R }')};`,
    },
  ]),
  ...source('core/char-format-error', ({ lit }) => [
    lit(
      '글자 서식 복원이 일부 완료되지 않았습니다. 실행 취소(Undo)로 복원을 다시 시도해 주세요.',
      'hanpan.charFormat.restorePartial',
    ),
  ]),
  ...source('core/char-shape-runs', ({ lit }) => [
    lit('문서가 로드되지 않았습니다. 문서를 먼저 열어 주세요.', 'hanpan.charFormat.noDocument'),
    lit(
      '구간별 글자 서식 복원을 지원하는 최신 WASM이 필요합니다. 문서를 저장한 뒤 앱을 새로고침해 주세요.',
      'hanpan.charFormat.needNewerEngine',
    ),
  ]),
  ...source('core/chart-grid-model', ({ call }) => [
    // the name a new series gets, checked against the names taken in the same words
    { find: '`계열 ${n}`', replace: call('hanpan.chart.seriesName', '{ n }'), count: 2 },
  ]),
  ...source('core/document-signature', ({ lit }) => [
    lit(
      '실제 HWP/HWPX/HML 파일이 아닙니다. 파일 미리보기/오류 페이지가 반환되었습니다.',
      'hanpan.signature.preview',
    ),
    lit('HML 문서가 아닌 일반 XML 파일입니다.', 'hanpan.signature.plainXml'),
    lit(
      '실제 HWP/HWPX/HML 파일이 아닙니다. 파일 시그니처를 확인할 수 없습니다.',
      'hanpan.signature.unknown',
    ),
  ]),
  ...source('core/export-content-loss', ({ call, lit }) => [
    lit('그림·첨부 데이터', 'hanpan.loss.binaryData'),
    lit('문서 개체', 'hanpan.loss.control'),
    lit('필드 속성', 'hanpan.loss.fieldParameters'),
    lit('문서 내용', 'hanpan.loss.content'),
    {
      find: 'shown.push(`• 그 밖의 손실 ${remaining}건`);',
      replace: `shown.push(${call('hanpan.loss.more', '{ count: remaining }')});`,
    },
    {
      find: '`${format} 파일은 저장되었지만 일부 내용을 보존하지 못했습니다.`,',
      replace: `${call('hanpan.loss.notice', '{ format }')},`,
    },
  ]),
  ...source('core/hml-save-capability', ({ lit }) => [
    lit('HML 저장 정보를 확인할 수 없습니다.', 'hanpan.hml.noSaveInfo'),
    lit('보존할 수 없는 요소가 있어 HML 저장이 차단되었습니다.', 'hanpan.hml.blocked'),
    lit('현재 WASM 빌드는 HML 저장을 지원하지 않습니다.', 'hanpan.hml.notInEngine'),
  ]),
  ...source('core/hyperlink', ({ lit }) => [
    lit('셀 위치를 확인할 수 없습니다.', 'hanpan.hyperlink.noCell'),
    lit('중첩 셀 위치가 올바르지 않습니다.', 'hanpan.hyperlink.badNestedCell'),
    lit('캡션의 하이퍼링크 편집은 아직 지원하지 않습니다.', 'hanpan.hyperlink.noCaption'),
    lit('하이퍼링크 위치가 올바르지 않습니다.', 'hanpan.hyperlink.badPosition'),
    lit('한 문단 안의 글자를 선택해 주세요.', 'hanpan.hyperlink.oneParagraph'),
    lit('하나의 하이퍼링크 안에서 편집해 주세요.', 'hanpan.hyperlink.oneLink'),
  ]),
  ...source('core/page-body-limits', ({ call }) => [
    {
      find: [
        'return `좌우 여백이 너무 커서 본문이 남지 않습니다 (본문 너비 ${mm(body.width)}mm, `',
        '      + `최소 ${MIN_BODY_MM}mm). 왼쪽·오른쪽·제본 여백을 줄여주세요.`;',
      ].join('\n'),
      replace: `return ${call('hanpan.page.widthTooSmall', '{ width: mm(body.width), min: MIN_BODY_MM }')};`,
    },
    {
      find: [
        'return `위아래 여백이 너무 커서 본문이 남지 않습니다 (본문 높이 ${mm(body.height)}mm, `',
        '      + `최소 ${MIN_BODY_MM}mm). 위쪽·아래쪽·머리말·꼬리말 여백을 줄여주세요.`;',
      ].join('\n'),
      replace: `return ${call('hanpan.page.heightTooSmall', '{ height: mm(body.height), min: MIN_BODY_MM }')};`,
    },
  ]),
  ...source('core/user-settings', ({ call }) => [
    {
      find: "export const LANG_LABELS = ['한글', '영문', '한자', '일어', '외국어', '기호', '사용자'] as const;",
      replace: `export const LANG_LABELS = [${[
        'korean',
        'english',
        'hanja',
        'japanese',
        'other',
        'symbol',
        'user',
      ]
        .map((key) => call(`hanpan.fontLang.${key}`))
        .join(', ')}] as const;`,
    },
  ]),
  ...source('recent/recent-open', ({ call }) => [
    {
      find: '`"${entry.fileName}"은(는) 핸들 없이 열려 자동 재열기가 불가합니다. 파일을 다시 선택하세요.`',
      replace: call('hanpan.recent.noHandle', '{ name: entry.fileName }'),
    },
    {
      find: '`"${entry.fileName}" 접근 권한이 거부되어 열 수 없습니다.`',
      replace: call('hanpan.recent.denied', '{ name: entry.fileName }'),
    },
    {
      find: '`"${entry.fileName}" 파일을 찾을 수 없어 목록에서 제거했습니다.`',
      replace: call('hanpan.recent.missing', '{ name: entry.fileName }'),
    },
  ]),
  ...source('recovery/recovery-format', ({ call, lit }) => [
    lit('문서.hwp', 'hanpan.recovery.defaultName'),
    {
      find: 'return `${base} 복구본.hwp`;',
      replace: `return ${call('hanpan.recovery.fileName', '{ base }')};`,
    },
    lit('저장 시각 알 수 없음', 'hanpan.recovery.savedAtUnknown'),
    { find: "toLocaleString('ko-KR')", replace: `toLocaleString(${call('hanpan.localeTag')})` },
    lit('크기 알 수 없음', 'hanpan.recovery.sizeUnknown'),
    lit(' → HWP 복구본', 'hanpan.recovery.asHwp'),
  ]),
  ...source('recovery/recovery-ui', ({ call, lit }) => [
    { find: "super('문서 복구', 520);", replace: `super(${call('hanpan.recovery.title')}, 520);` },
    lit('저장되지 않은 문서 복구본이 있습니다. 복구할 문서를 선택하세요.', 'hanpan.recovery.lead'),
    lit(
      '복구해도 원본 파일을 자동으로 덮어쓰지 않습니다. 저장하려면 복구 후 직접 저장하세요.',
      'hanpan.recovery.note',
    ),
    lit('문서.hml', 'hanpan.recovery.defaultNameHml'),
    lit('문서.hwpx', 'hanpan.recovery.defaultNameHwpx'),
    lit('문서.hwp', 'hanpan.recovery.defaultName'),
    {
      find: "restoreBtn.textContent = '복구';",
      replace: `restoreBtn.textContent = ${call('hanpan.recovery.restore')};`,
    },
    {
      find: "cancelBtn.textContent = '나중에';",
      replace: `cancelBtn.textContent = ${call('hanpan.recovery.later')};`,
    },
    {
      find: "deleteBtn.textContent = '삭제';",
      replace: `deleteBtn.textContent = ${call('hanpan.recovery.delete')};`,
    },
    lit('복구 후보를 모두 삭제합니다.', 'hanpan.recovery.deleteTip'),
  ]),
  ...source('history/idb-store', ({ call }) => [
    {
      find: "`스냅샷 ${new Date(createdAt).toLocaleString('ko-KR')}`",
      replace: call(
        'hanpan.history.snapshotLabel',
        `{ date: new Date(createdAt).toLocaleString(${call('hanpan.localeTag')}) }`,
      ),
    },
  ]),
  ...source('view/zoom-dialog-state', ({ call, lit }) => [
    lit('사용자 정의 배율을 입력하세요.', 'hanpan.zoom.enterCustom'),
    lit('사용자 정의 배율은 숫자로 입력하세요.', 'hanpan.zoom.number'),
    lit('사용자 정의 배율은 정수로 입력하세요.', 'hanpan.zoom.integer'),
    {
      find: '`${MIN_CUSTOM_ZOOM_PERCENT}~${MAX_CUSTOM_ZOOM_PERCENT}% 사이의 배율을 입력하세요.`',
      replace: call(
        'hanpan.zoom.range',
        '{ min: MIN_CUSTOM_ZOOM_PERCENT, max: MAX_CUSTOM_ZOOM_PERCENT }',
      ),
    },
  ]),
  ...source('main', ({ call, lit }) => [
    lit('복구용 자동 저장 중...', 'hanpan.main.autosaving'),
    {
      find: '`복구용 자동 저장 완료 (${formatBytes(status.byteLength)})`',
      replace: call('hanpan.main.autosaved', '{ size: formatBytes(status.byteLength) }'),
    },
    lit('보호 문서는 복구용 자동 저장을 하지 않습니다', 'hanpan.main.autosaveProtected'),
    lit('복구용 자동 저장 실패', 'hanpan.main.autosaveFailed'),
    {
      find: '`파일 로딩 ${safePercent}% - ${label}`',
      replace: call('hanpan.main.loadingPercent', '{ percent: safePercent, label }'),
    },
    lit('로컬 폰트 준비 중...', 'hanpan.main.localFonts'),
    lit('웹폰트 로딩 중...', 'hanpan.main.webFonts'),
    lit('WASM 로딩 중...', 'hanpan.main.engineLoading'),
    lit('CanvasKit 로딩 중...', 'hanpan.main.canvasKitLoading'),
    lit('HWP 파일을 선택해주세요.', 'hanpan.main.chooseFile'),
    {
      find: '`지원하지 않는 파일 형식입니다: ${fileName}. HWP/HWPX/HML 파일만 지원합니다.`',
      replace: call('hanpan.main.unsupportedFile', '{ name: fileName }'),
    },
    {
      find: '`WASM 초기화 실패: ${error}`',
      replace: call('hanpan.main.engineFailed', '{ error }'),
    },
    lit('HWP/HWPX/HML 파일만 지원합니다.', 'hanpan.main.onlyHwp'),
    lit('HWP/HWPX/HML 파일 또는 이미지 파일만 지원합니다.', 'hanpan.main.onlyHwpOrImage'),
    {
      find: "`그림 삽입에 실패했습니다.\\n${result.error ?? '삽입 위치 또는 이미지 정보를 확인할 수 없습니다.'}`",
      replace: call(
        'hanpan.picture.insertFailed',
        `{ reason: result.error ?? ${call('hanpan.picture.noInsertInfo')} }`,
      ),
    },
    lit(
      '그림을 삽입할 수 없습니다.\\n브라우저가 이 이미지 파일을 읽지 못했습니다.',
      'hanpan.picture.cannotInsert',
    ),
    { find: '`[누름틀] ${label}`', replace: call('hanpan.main.fieldStatus', '{ label }') },
    lit('폰트 준비 중...', 'hanpan.main.fontsPreparing'),
    {
      find: '`파일 로딩 ${fontPercent}% - 폰트 로딩 중... (${loaded}/${total})`',
      replace: call('hanpan.main.fontsLoading', '{ percent: fontPercent, loaded, total }'),
    },
    lit('문서 상태 적용 중...', 'hanpan.main.applyingState'),
    lit('페이지 렌더 준비 중...', 'hanpan.main.preparingRender'),
    lit('도구 모음 준비 중...', 'hanpan.main.preparingToolbar'),
    lit('문서 검증 및 글꼴 확인 중...', 'hanpan.main.checking'),
    lit('편집 상태 초기화 중...', 'hanpan.main.initEditing'),
    { find: '`초기화 오류: ${error}`', replace: call('hanpan.main.initError', '{ error }') },
    lit('문서 열기가 취소되었습니다.', 'hanpan.main.openCancelled', undefined, 4),
    lit(
      '지원하지 않는 암호화 방식의 문서입니다. 지원되는 HWP3/HWP5 암호 문서만 열 수 있습니다.',
      'hanpan.main.unsupportedEncryption',
    ),
    lit('DRM으로 보호된 문서는 지원하지 않습니다.', 'hanpan.main.drm'),
    lit(
      '암호화된 문서를 열 수 없습니다. 문서가 손상되었는지 확인하세요.',
      'hanpan.main.encryptedFailed',
    ),
    lit(
      '암호가 일치하지 않거나 문서가 손상되었습니다. 다시 입력하세요.',
      'hanpan.main.passwordRetry',
    ),
    lit('문서 열기를 취소했습니다.', 'hanpan.main.openCancelledStatus'),
    lit('파일 읽는 중...', 'hanpan.main.reading'),
    lit('파일 읽기 완료', 'hanpan.main.readDone'),
    lit('문서 데이터 준비 중...', 'hanpan.main.preparingData'),
    lit('문서 파싱 및 쪽 계산 중...', 'hanpan.main.parsing'),
    lit('자동 저장 준비 중...', 'hanpan.main.autosavePrep'),
    lit('문서 초기화 중...', 'hanpan.main.initDocument'),
    {
      find: '`최근 문서 더보기 (${recents.length - RECENT_SUBMENU_COLLAPSED_LIMIT}개)`',
      replace: call(
        'hanpan.main.moreRecent',
        '{ count: recents.length - RECENT_SUBMENU_COLLAPSED_LIMIT }',
      ),
    },
    lit('최근 문서 목록 지우기', 'hanpan.main.clearRecent'),
    lit('복구 후보를 삭제했습니다.', 'hanpan.main.recoveryDeleted'),
    {
      find: '`"${fileName}" 복구본을 열었습니다.\\n원본 파일은 자동으로 덮어쓰지 않습니다.`',
      replace: call('hanpan.main.recoveryOpened', '{ name: fileName }'),
    },
    lit('새 문서 생성 중...', 'hanpan.main.creatingNew'),
    {
      find: '`새 문서 생성 실패: ${error}`',
      replace: call('hanpan.main.createFailed', '{ error }'),
    },
    lit('파일 로딩 중...', 'hanpan.main.loadingFile'),
    lit(
      '로컬 파일을 열려면 확장 프로그램의 "파일 URL에 대한 액세스 허용"을 켜야 합니다.\\n설정에서 권한을 허용한 뒤 파일을 다시 열어 주세요.',
      'hanpan.main.fileUrlAccess',
    ),
    lit('파일 로드 실패: 파일 URL 액세스 권한이 필요합니다.', 'hanpan.main.fileUrlStatus'),
    { find: "confirmLabel: '확인'", replace: `confirmLabel: ${call('hanpan.main.ok')}`, count: 2 },
    lit('설정 열기', 'hanpan.main.openSettings'),
    { find: '`파일 로드 실패: ${raw}`', replace: call('hanpan.main.loadFailed', '{ error: raw }') },
  ]),
}

export const DIALOG_TEXT_PATCHES = { ...DIALOG_PATCHES, ...DISPLAY_PATCHES, ...SOURCE_PATCHES }
