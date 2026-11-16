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
  noticeUnsupported:
    '無法開啟此類檔案。可開啟的檔案為 .ttukcad、.dxf、.stl、.obj、.3mf、.glb 和 .ply。',
  noticeImportFailed: '無法讀取此檔案中的圖形。已開啟空白圖紙。',
  saveRefused: '無法儲存圖紙。變更仍保留在畫面上，請再試一次或另存新檔。',
  saveFailed: '儲存圖紙時發生錯誤。變更仍保留在畫面上，請再試一次或另存新檔。',
  guideTitle: '如何開啟此檔案',
  guideBody: '{ext} 檔案由專業 CAD 程式製作，AI 圖面無法讀取。',
  guideAsk:
    '請傳送者將其另存為 DXF（2D 圖面）或 STL（3D 模型）後再傳送。這兩種檔案都可以在這裡開啟。',
  exportEmpty: '沒有可匯出的內容。請至少顯示一個圖形後再試。',
  exportFailed: '無法匯出檔案。請重試，或選擇其他資料夾。',
  exportSourcePath: '匯出不能覆寫此圖面的來源檔案。請換一個檔名。',
  issueOpenMesh: '含有未封閉的網格，無法計算此群組',
  issueTooLarge: '三角形過多，無法顯示（上限 200 萬個）',
  editLocked: '此圖形已鎖定。請先解鎖再修改。',
  editNotScalable: '此圖形無法用控制點調整大小。匯入的網格、圖紙、群組和文字只能移動和旋轉。',
  editRefused: '無法進行此變更。圖紙保持不變。',
} satisfies Record<keyof typeof zh, string>
