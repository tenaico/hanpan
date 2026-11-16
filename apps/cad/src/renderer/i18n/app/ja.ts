import type { zh } from './zh'

export const ja = {
  untitled: '無題の図面',
  saved: '保存済み',
  unsaved: '未保存',
  noWebGlTitle: '3D 表示を表示できません',
  noWebGlBody:
    'この PC では 3D 表示に必要な WebGL を開始できませんでした。図面は開いて保存できますが、表示はされません。次のいずれかを行ってから、タブを開き直してください。',
  noWebGlDriver: 'グラフィックス カードのドライバーを更新する。',
  noWebGlAccel: 'グラフィックス設定でハードウェア アクセラレーションをオンにする。',
  noticeNotOk:
    'このファイルを図面として開けませんでした。破損しているか、新しいバージョンで作成された可能性があります。空の図面を開きました。保存すると新しいファイル名を尋ねます。',
  noticeTooLarge: 'ファイルが大きすぎて開けません (上限 100 MB)。空の図面を開きました。',
  noticeUnreadable: 'このファイルを読み取れませんでした。空の図面を開きました。',
  noticeUnsupported:
    'この種類のファイルは開けません。開けるのは .ttukcad、.dxf、.stl、.obj ファイルです。',
  noticeImportFailed: 'このファイルの図形を読み取れませんでした。空の図面を開きました。',
  saveRefused:
    '図面を保存できませんでした。変更はそのまま残っています。もう一度保存するか、名前を付けて保存してください。',
  saveFailed:
    '図面の保存中に問題が発生しました。変更はそのまま残っています。もう一度保存するか、名前を付けて保存してください。',
} satisfies Record<keyof typeof zh, string>
