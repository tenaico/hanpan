import type { zh } from './zh'

export const zhTW = {
  untitled: '未命名圖紙',
  saved: '已儲存',
  unsaved: '未儲存',
  noWebGlTitle: '無法顯示 3D 檢視',
  noWebGlBody:
    '這台電腦無法啟動 3D 檢視所需的 WebGL。圖紙仍可開啟和儲存，但無法顯示。請嘗試以下其中一項，然後重新開啟分頁：',
  noWebGlDriver: '更新顯示卡驅動程式。',
  noWebGlAccel: '在圖形設定中開啟硬體加速。',
  noticeNotOk:
    '無法將此檔案開啟為圖紙，檔案可能已損毀或由較新版本建立。已開啟空白圖紙，儲存時會詢問新的檔案名稱。',
  noticeTooLarge: '檔案太大，無法開啟（上限 100 MB）。已開啟空白圖紙。',
  noticeUnreadable: '無法讀取此檔案。已開啟空白圖紙。',
  noticeUnsupported: '無法開啟此類檔案。可開啟的檔案為 .ttukcad、.dxf、.stl 和 .obj。',
  noticeImportFailed: '無法讀取此檔案中的圖形。已開啟空白圖紙。',
  saveRefused: '無法儲存圖紙。變更仍保留在畫面上，請再試一次或另存新檔。',
  saveFailed: '儲存圖紙時發生錯誤。變更仍保留在畫面上，請再試一次或另存新檔。',
} satisfies Record<keyof typeof zh, string>
