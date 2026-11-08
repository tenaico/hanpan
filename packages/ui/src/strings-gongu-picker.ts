import type { Lang } from '@genoffice/i18n'

/**
 * Hanpan: the words of the Gongu picture picker in the Word and PowerPoint
 * editors (docs/plans/gongu-images.md 4.5). Taken as they are from the design
 * board's panel (apps/shell/src/renderer/src/i18n/gongu), so the two read alike.
 * `{count}` and `{conditions}` are filled by `gonguPickerText`.
 */
export interface GonguPickerStrings {
  title: string
  find: string
  placeholder: string
  search: string
  searching: string
  noResults: string
  total: string
  more: string
  insert: string
  inserting: string
  noKey: string
  /** where the key comes from and where it goes, shown with noKey before any search */
  noKeyHint: string
  openSettings: string
  footer: string
  pictureFailed: string
  year: string
  close: string
  errBadKey: string
  errExpired: string
  errQuota: string
  errRate: string
  errBlocked: string
  errNetwork: string
  errService: string
  warnNc: string
  warnNd: string
  warnSa: string
  confirm: string
}

export const GONGU_PICKER_STRINGS: Record<Lang, GonguPickerStrings> = {
  zh: {
    title: 'Gongu 图片',
    find: '在 Gongu 中查找',
    placeholder: '标题或作者名（例：호랑이、김홍도）',
    search: '搜索',
    searching: '正在搜索…',
    noResults: '没有找到图片。请用标题或作者名中的一个词再试。',
    total: '共 {count} 项',
    more: '更多',
    insert: '插入',
    inserting: '正在插入…',
    noKey: '没有 Gongu 密钥。请在“设置 → 集成 → Gongu 图片”中输入密钥。',
    noKeyHint:
      'Gongu 图片需要韩国公共数据门户（data.go.kr）的免费密钥。请在“设置 → 集成 → Gongu 图片”中输入。',
    openSettings: '打开集成设置',
    footer: 'Gongu 作品由韩国著作权委员会提供。插入图片的出处会自动写上。',
    pictureFailed: '无法获取图片。请稍后再试。',
    year: '创作年份',
    close: '关闭',
    errBadKey:
      '公共数据门户不接受此密钥。请重新复制密钥，或确认申请已获批准。新密钥可能需要约一小时才能生效。',
    errExpired: '密钥已过期。请在公共数据门户延长使用期限。',
    errQuota: '今天的搜索次数已用完。请明天再试。',
    errRate: '短时间内请求过多。请稍后再试。',
    errBlocked: '公共数据门户阻止了来自此网络地址的请求。',
    errNetwork: '无法连接到公共数据门户。请检查网络连接。',
    errService: '公共数据门户目前没有正常响应。请稍后再试。',
    warnNc: '不得用于商业用途的文档。',
    warnNd: '不得修改，例如裁剪或改色。',
    warnSa: '修改后制作的成果必须以相同条件公开。',
    confirm: '这张图片有使用条件。\n{conditions}\n仍要插入吗？',
  },
  en: {
    title: 'Gongu pictures',
    find: 'Find in Gongu',
    placeholder: 'Title or artist (e.g. 호랑이, 김홍도)',
    search: 'Search',
    searching: 'Searching…',
    noResults: "No pictures found. Try one word from the title or the artist's name.",
    total: '{count} found',
    more: 'More',
    insert: 'Insert',
    inserting: 'Inserting…',
    noKey: 'There is no Gongu key. Enter one under Settings → Integrations → "Gongu pictures".',
    noKeyHint:
      'Gongu pictures need a free key from the Korean public data portal (data.go.kr). Put it under Settings → Integrations → "Gongu pictures".',
    openSettings: 'Open integration settings',
    footer:
      'Gongu works are provided by the Korea Copyright Commission. The credit for an inserted picture is written for you.',
    pictureFailed: 'Could not get the picture. Try again in a moment.',
    year: 'Year',
    close: 'Close',
    errBadKey:
      'The Public Data Portal does not accept this key. Copy it again, or check that your application was approved. A new key can take about an hour to start working.',
    errExpired: 'The key has expired. Extend it on the Public Data Portal.',
    errQuota: "Today's searches are used up. Try again tomorrow.",
    errRate: 'Too many requests in a short time. Try again in a moment.',
    errBlocked: 'The Public Data Portal blocked requests from this internet address.',
    errNetwork: 'Could not reach the Public Data Portal. Check your internet connection.',
    errService:
      'The Public Data Portal is not answering properly right now. Try again in a moment.',
    warnNc: 'Not for use in commercial documents.',
    warnNd: 'Must not be changed, such as by cropping or recolouring.',
    warnSa: 'Anything made by changing it must be shared under the same terms.',
    confirm: 'This picture has terms of use.\n{conditions}\nInsert it anyway?',
  },
  ja: {
    title: 'Gongu の画像',
    find: 'Gongu で探す',
    placeholder: 'タイトルまたは作者名（例：호랑이、김홍도）',
    search: '検索',
    searching: '検索中…',
    noResults: '画像が見つかりません。タイトルか作者名の一語で探してみてください。',
    total: '{count} 件',
    more: 'もっと見る',
    insert: '挿入',
    inserting: '挿入中…',
    noKey: 'Gongu のキーがありません。「設定 → 連携 → Gongu の画像」でキーを入力してください。',
    noKeyHint:
      'Gongu の画像には韓国の公共データポータル（data.go.kr）の無料キーが必要です。「設定 → 連携 → Gongu の画像」に入力してください。',
    openSettings: '連携設定を開く',
    footer:
      'Gongu の作品は韓国著作権委員会が提供しています。挿入した画像の出典は自動で記載されます。',
    pictureFailed: '画像を取得できませんでした。しばらくしてからもう一度お試しください。',
    year: '制作年',
    close: '閉じる',
    errBadKey:
      '公共データポータルがこのキーを受け付けません。キーをもう一度コピーするか、利用申請が承認されたか確認してください。新しいキーが使えるようになるまで 1 時間ほどかかることがあります。',
    errExpired: 'キーの有効期限が切れています。公共データポータルで期間を延長してください。',
    errQuota: '今日の検索回数を使い切りました。明日もう一度お試しください。',
    errRate: '短時間にリクエストが多すぎます。少し待ってからもう一度お試しください。',
    errBlocked:
      '公共データポータルがこのインターネットアドレスからのリクエストをブロックしました。',
    errNetwork: '公共データポータルに接続できませんでした。インターネット接続を確認してください。',
    errService:
      '公共データポータルが今は正常に応答していません。少し待ってからもう一度お試しください。',
    warnNc: '営利目的の文書には使えません。',
    warnNd: '切り抜きや色の変更などの改変はできません。',
    warnSa: '改変して作ったものは同じ条件で公開する必要があります。',
    confirm: 'この画像には利用条件があります。\n{conditions}\nそれでも挿入しますか？',
  },
  ko: {
    title: '공유마당 그림',
    find: '공유마당에서 찾기',
    placeholder: '제목이나 작가 이름 (예: 호랑이, 김홍도)',
    search: '찾기',
    searching: '찾는 중…',
    noResults: '찾은 그림이 없습니다. 제목이나 작가 이름의 한 낱말로 찾아 보세요.',
    total: '{count}건',
    more: '더 보기',
    insert: '넣기',
    inserting: '넣는 중…',
    noKey: '공유마당 그림을 찾으려면 키가 필요합니다.',
    noKeyHint:
      '키는 공공데이터포털(data.go.kr)에서 무료로 받습니다. 받은 키를 설정 → 연동의 "공유마당 그림"에 넣으면 바로 쓸 수 있습니다.',
    openSettings: '연동 설정 열기',
    footer:
      '공유마당 저작물은 한국저작권위원회가 제공합니다. 넣은 그림의 출처는 자동으로 적힙니다.',
    pictureFailed: '그림을 받지 못했습니다. 잠시 뒤 다시 시도하세요.',
    year: '창작연도',
    close: '닫기',
    errBadKey:
      '공공데이터포털이 이 키를 받지 않습니다. 키를 다시 복사하거나 활용신청이 승인됐는지 확인하세요. 새 키는 쓸 수 있게 되기까지 한 시간쯤 걸리기도 합니다.',
    errExpired: '키의 사용 기한이 끝났습니다. 공공데이터포털에서 기간을 늘리세요.',
    errQuota: '오늘 쓸 수 있는 횟수를 다 썼습니다. 내일 다시 시도하세요.',
    errRate: '짧은 시간에 요청이 너무 많았습니다. 잠시 뒤 다시 시도하세요.',
    errBlocked: '공공데이터포털이 이 인터넷 주소에서 온 요청을 막았습니다.',
    errNetwork: '공공데이터포털에 연결하지 못했습니다. 인터넷 연결을 확인하세요.',
    errService: '공공데이터포털이 지금 제대로 답하지 않습니다. 잠시 뒤 다시 시도하세요.',
    warnNc: '영리 목적 문서에는 쓸 수 없습니다.',
    warnNd: '자르거나 색을 바꾸는 등 고칠 수 없습니다.',
    warnSa: '고쳐서 만든 결과물은 같은 조건으로 공개해야 합니다.',
    confirm: '이 그림에는 이용 조건이 있습니다.\n{conditions}\n그래도 넣을까요?',
  },
  fr: {
    title: 'Images Gongu',
    find: 'Chercher dans Gongu',
    placeholder: 'Titre ou artiste (ex. 호랑이, 김홍도)',
    search: 'Rechercher',
    searching: 'Recherche…',
    noResults: "Aucune image trouvée. Essayez un seul mot du titre ou du nom de l'artiste.",
    total: '{count} résultats',
    more: 'Plus',
    insert: 'Insérer',
    inserting: 'Insertion…',
    noKey: 'Aucune clé Gongu. Saisissez-en une dans Paramètres → Intégrations → « Images Gongu ».',
    noKeyHint:
      'Gongu pictures need a free key from the Korean public data portal (data.go.kr). Put it under Settings → Integrations → "Gongu pictures".',
    openSettings: 'Open integration settings',
    footer:
      "Les œuvres de Gongu sont fournies par la Commission coréenne du droit d'auteur. Le crédit d'une image insérée est écrit automatiquement.",
    pictureFailed: "Impossible de récupérer l'image. Réessayez dans un instant.",
    year: 'Année',
    close: 'Fermer',
    errBadKey:
      'Le portail des données publiques n’accepte pas cette clé. Copiez-la de nouveau ou vérifiez que votre demande a été approuvée. Une nouvelle clé peut mettre environ une heure à fonctionner.',
    errExpired: 'La clé a expiré. Prolongez-la sur le portail des données publiques.',
    errQuota: 'Les recherches du jour sont épuisées. Réessayez demain.',
    errRate: 'Trop de requêtes en peu de temps. Réessayez dans un instant.',
    errBlocked:
      'Le portail des données publiques a bloqué les requêtes venant de cette adresse internet.',
    errNetwork:
      'Impossible de joindre le portail des données publiques. Vérifiez votre connexion internet.',
    errService:
      'Le portail des données publiques ne répond pas correctement pour le moment. Réessayez dans un instant.',
    warnNc: 'Interdit dans les documents à but commercial.',
    warnNd: 'Ne doit pas être modifiée (recadrage, changement de couleurs, etc.).',
    warnSa: 'Toute création faite en la modifiant doit être partagée selon les mêmes conditions.',
    confirm: "Cette image a des conditions d'utilisation.\n{conditions}\nL'insérer quand même ?",
  },
  de: {
    title: 'Gongu-Bilder',
    find: 'In Gongu suchen',
    placeholder: 'Titel oder Künstler (z. B. 호랑이, 김홍도)',
    search: 'Suchen',
    searching: 'Suche läuft…',
    noResults:
      'Keine Bilder gefunden. Versuchen Sie ein einzelnes Wort aus dem Titel oder dem Namen.',
    total: '{count} Treffer',
    more: 'Mehr',
    insert: 'Einfügen',
    inserting: 'Wird eingefügt…',
    noKey:
      'Kein Gongu-Schlüssel vorhanden. Geben Sie ihn unter Einstellungen → Integrationen → „Gongu-Bilder“ ein.',
    noKeyHint:
      'Gongu pictures need a free key from the Korean public data portal (data.go.kr). Put it under Settings → Integrations → "Gongu pictures".',
    openSettings: 'Open integration settings',
    footer:
      'Gongu-Werke stellt die Koreanische Urheberrechtskommission bereit. Die Quellenangabe eines eingefügten Bildes wird automatisch geschrieben.',
    pictureFailed: 'Das Bild konnte nicht geladen werden. Versuchen Sie es gleich noch einmal.',
    year: 'Jahr',
    close: 'Schließen',
    errBadKey:
      'Das Portal für öffentliche Daten akzeptiert diesen Schlüssel nicht. Kopieren Sie ihn erneut oder prüfen Sie, ob Ihr Antrag genehmigt wurde. Ein neuer Schlüssel kann etwa eine Stunde brauchen, bis er funktioniert.',
    errExpired: 'Der Schlüssel ist abgelaufen. Verlängern Sie ihn im Portal für öffentliche Daten.',
    errQuota: 'Die Suchen für heute sind aufgebraucht. Versuchen Sie es morgen wieder.',
    errRate: 'Zu viele Anfragen in kurzer Zeit. Versuchen Sie es gleich noch einmal.',
    errBlocked:
      'Das Portal für öffentliche Daten hat Anfragen von dieser Internetadresse gesperrt.',
    errNetwork:
      'Das Portal für öffentliche Daten ist nicht erreichbar. Prüfen Sie Ihre Internetverbindung.',
    errService:
      'Das Portal für öffentliche Daten antwortet gerade nicht richtig. Versuchen Sie es gleich noch einmal.',
    warnNc: 'Nicht für kommerzielle Dokumente.',
    warnNd: 'Darf nicht verändert werden, etwa durch Zuschneiden oder Umfärben.',
    warnSa:
      'Was durch Veränderung entsteht, muss unter denselben Bedingungen weitergegeben werden.',
    confirm: 'Für dieses Bild gelten Nutzungsbedingungen.\n{conditions}\nTrotzdem einfügen?',
  },
  es: {
    title: 'Imágenes de Gongu',
    find: 'Buscar en Gongu',
    placeholder: 'Título o artista (p. ej., 호랑이, 김홍도)',
    search: 'Buscar',
    searching: 'Buscando…',
    noResults:
      'No se encontraron imágenes. Pruebe con una sola palabra del título o del nombre del artista.',
    total: '{count} resultados',
    more: 'Más',
    insert: 'Insertar',
    inserting: 'Insertando…',
    noKey:
      'No hay clave de Gongu. Introdúzcala en Configuración → Integraciones → «Imágenes de Gongu».',
    noKeyHint:
      'Gongu pictures need a free key from the Korean public data portal (data.go.kr). Put it under Settings → Integrations → "Gongu pictures".',
    openSettings: 'Open integration settings',
    footer:
      'Las obras de Gongu las proporciona la Comisión de Derechos de Autor de Corea. El crédito de una imagen insertada se escribe automáticamente.',
    pictureFailed: 'No se pudo obtener la imagen. Inténtelo de nuevo en un momento.',
    year: 'Año',
    close: 'Cerrar',
    errBadKey:
      'El portal de datos públicos no acepta esta clave. Vuelve a copiarla o comprueba que tu solicitud fue aprobada. Una clave nueva puede tardar alrededor de una hora en funcionar.',
    errExpired: 'La clave ha caducado. Amplía su plazo en el portal de datos públicos.',
    errQuota: 'Se han agotado las búsquedas de hoy. Vuelve a intentarlo mañana.',
    errRate: 'Demasiadas solicitudes en poco tiempo. Vuelve a intentarlo en un momento.',
    errBlocked:
      'El portal de datos públicos ha bloqueado las solicitudes de esta dirección de internet.',
    errNetwork:
      'No se pudo conectar con el portal de datos públicos. Comprueba tu conexión a internet.',
    errService:
      'El portal de datos públicos no responde bien en este momento. Vuelve a intentarlo en un momento.',
    warnNc: 'No se puede usar en documentos con fines comerciales.',
    warnNd: 'No se puede modificar, por ejemplo recortándola o cambiando sus colores.',
    warnSa: 'Lo que se cree modificándola debe compartirse con las mismas condiciones.',
    confirm: 'Esta imagen tiene condiciones de uso.\n{conditions}\n¿Insertarla de todos modos?',
  },
  th: {
    title: 'ภาพจาก Gongu',
    find: 'ค้นหาใน Gongu',
    placeholder: 'ชื่อผลงานหรือชื่อศิลปิน (เช่น 호랑이, 김홍도)',
    search: 'ค้นหา',
    searching: 'กำลังค้นหา…',
    noResults: 'ไม่พบรูปภาพ ลองค้นด้วยคำเดียวจากชื่อผลงานหรือชื่อศิลปิน',
    total: '{count} รายการ',
    more: 'ดูเพิ่ม',
    insert: 'แทรก',
    inserting: 'กำลังแทรก…',
    noKey: 'ยังไม่มีคีย์ Gongu ใส่คีย์ได้ที่ การตั้งค่า → การเชื่อมต่อ → "รูปภาพ Gongu"',
    noKeyHint:
      'Gongu pictures need a free key from the Korean public data portal (data.go.kr). Put it under Settings → Integrations → "Gongu pictures".',
    openSettings: 'Open integration settings',
    footer:
      'ผลงานใน Gongu จัดให้โดยคณะกรรมการลิขสิทธิ์เกาหลี ระบบจะเขียนที่มาของรูปภาพที่แทรกให้โดยอัตโนมัติ',
    pictureFailed: 'รับรูปภาพไม่ได้ ลองใหม่อีกครั้งในอีกสักครู่',
    year: 'ปีที่สร้าง',
    close: 'ปิด',
    errBadKey:
      'พอร์ทัลข้อมูลสาธารณะไม่ยอมรับคีย์นี้ คัดลอกคีย์อีกครั้ง หรือตรวจสอบว่าคำขอได้รับอนุมัติแล้ว คีย์ใหม่อาจใช้เวลาประมาณหนึ่งชั่วโมงจึงจะใช้งานได้',
    errExpired: 'คีย์หมดอายุแล้ว ขยายระยะเวลาได้ที่พอร์ทัลข้อมูลสาธารณะ',
    errQuota: 'ใช้จำนวนการค้นหาของวันนี้หมดแล้ว ลองใหม่พรุ่งนี้',
    errRate: 'มีคำขอมากเกินไปในเวลาสั้น ๆ ลองใหม่อีกครั้งในอีกสักครู่',
    errBlocked: 'พอร์ทัลข้อมูลสาธารณะบล็อกคำขอจากที่อยู่อินเทอร์เน็ตนี้',
    errNetwork: 'เชื่อมต่อพอร์ทัลข้อมูลสาธารณะไม่ได้ ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต',
    errService: 'พอร์ทัลข้อมูลสาธารณะยังตอบกลับไม่ถูกต้องในขณะนี้ ลองใหม่อีกครั้งในอีกสักครู่',
    warnNc: 'ห้ามใช้ในเอกสารเพื่อการค้า',
    warnNd: 'ห้ามดัดแปลง เช่น ครอปหรือเปลี่ยนสี',
    warnSa: 'งานที่สร้างจากการดัดแปลงต้องเผยแพร่ภายใต้เงื่อนไขเดียวกัน',
    confirm: 'รูปภาพนี้มีเงื่อนไขการใช้งาน\n{conditions}\nยังต้องการแทรกหรือไม่',
  },
  id: {
    title: 'Gambar Gongu',
    find: 'Cari di Gongu',
    placeholder: 'Judul atau nama seniman (mis. 호랑이, 김홍도)',
    search: 'Cari',
    searching: 'Mencari…',
    noResults: 'Tidak ada gambar yang ditemukan. Coba satu kata dari judul atau nama seniman.',
    total: '{count} hasil',
    more: 'Lainnya',
    insert: 'Sisipkan',
    inserting: 'Menyisipkan…',
    noKey: 'Belum ada kunci Gongu. Masukkan di Pengaturan → Integrasi → "Gambar Gongu".',
    noKeyHint:
      'Gongu pictures need a free key from the Korean public data portal (data.go.kr). Put it under Settings → Integrations → "Gongu pictures".',
    openSettings: 'Open integration settings',
    footer:
      'Karya Gongu disediakan oleh Komisi Hak Cipta Korea. Kredit gambar yang disisipkan ditulis otomatis.',
    pictureFailed: 'Gambar tidak dapat diambil. Coba lagi sebentar lagi.',
    year: 'Tahun',
    close: 'Tutup',
    errBadKey:
      'Portal Data Publik tidak menerima kunci ini. Salin ulang kuncinya, atau pastikan pengajuan Anda sudah disetujui. Kunci baru bisa memerlukan sekitar satu jam sebelum berfungsi.',
    errExpired: 'Masa berlaku kunci sudah habis. Perpanjang di Portal Data Publik.',
    errQuota: 'Jatah pencarian hari ini sudah habis. Coba lagi besok.',
    errRate: 'Terlalu banyak permintaan dalam waktu singkat. Coba lagi sebentar lagi.',
    errBlocked: 'Portal Data Publik memblokir permintaan dari alamat internet ini.',
    errNetwork: 'Tidak dapat terhubung ke Portal Data Publik. Periksa koneksi internet Anda.',
    errService: 'Portal Data Publik sedang tidak merespons dengan benar. Coba lagi sebentar lagi.',
    warnNc: 'Tidak boleh dipakai dalam dokumen komersial.',
    warnNd: 'Tidak boleh diubah, misalnya dipotong atau diganti warnanya.',
    warnSa: 'Hasil yang dibuat dengan mengubahnya harus dibagikan dengan syarat yang sama.',
    confirm: 'Gambar ini memiliki syarat penggunaan.\n{conditions}\nTetap sisipkan?',
  },
  ru: {
    title: 'Изображения Gongu',
    find: 'Найти в Gongu',
    placeholder: 'Название или автор (напр., 호랑이, 김홍도)',
    search: 'Найти',
    searching: 'Поиск…',
    noResults: 'Изображения не найдены. Попробуйте одно слово из названия или имени автора.',
    total: 'Найдено: {count}',
    more: 'Ещё',
    insert: 'Вставить',
    inserting: 'Вставка…',
    noKey: 'Нет ключа Gongu. Введите его в разделе «Настройки → Интеграции → Изображения Gongu».',
    noKeyHint:
      'Gongu pictures need a free key from the Korean public data portal (data.go.kr). Put it under Settings → Integrations → "Gongu pictures".',
    openSettings: 'Open integration settings',
    footer:
      'Произведения Gongu предоставляет Комиссия по авторскому праву Кореи. Источник вставленного изображения указывается автоматически.',
    pictureFailed: 'Не удалось получить изображение. Попробуйте ещё раз чуть позже.',
    year: 'Год',
    close: 'Закрыть',
    errBadKey:
      'Портал открытых данных не принимает этот ключ. Скопируйте его ещё раз или проверьте, одобрена ли заявка. Новый ключ может начать работать примерно через час.',
    errExpired: 'Срок действия ключа истёк. Продлите его на портале открытых данных.',
    errQuota: 'Поиски на сегодня исчерпаны. Попробуйте завтра.',
    errRate: 'Слишком много запросов за короткое время. Повторите попытку чуть позже.',
    errBlocked: 'Портал открытых данных заблокировал запросы с этого интернет-адреса.',
    errNetwork:
      'Не удалось связаться с порталом открытых данных. Проверьте подключение к интернету.',
    errService: 'Портал открытых данных сейчас отвечает некорректно. Повторите попытку чуть позже.',
    warnNc: 'Нельзя использовать в коммерческих документах.',
    warnNd: 'Нельзя изменять, например обрезать или менять цвета.',
    warnSa: 'Созданное путём изменения нужно распространять на тех же условиях.',
    confirm: 'У этого изображения есть условия использования.\n{conditions}\nВсё равно вставить?',
  },
  ar: {
    title: 'صور Gongu',
    find: 'البحث في Gongu',
    placeholder: 'العنوان أو اسم الفنان (مثل: 호랑이، 김홍도)',
    search: 'بحث',
    searching: 'جارٍ البحث…',
    noResults: 'لم يُعثر على صور. جرّب كلمة واحدة من العنوان أو اسم الفنان.',
    total: '{count} نتيجة',
    more: 'المزيد',
    insert: 'إدراج',
    inserting: 'جارٍ الإدراج…',
    noKey: 'لا يوجد مفتاح Gongu. أدخِله من الإعدادات ← التكاملات ← "صور Gongu".',
    noKeyHint:
      'Gongu pictures need a free key from the Korean public data portal (data.go.kr). Put it under Settings → Integrations → "Gongu pictures".',
    openSettings: 'Open integration settings',
    footer: 'أعمال Gongu مقدَّمة من هيئة حقوق المؤلف الكورية. يُكتب مصدر الصورة المدرجة تلقائيًا.',
    pictureFailed: 'تعذّر جلب الصورة. حاول مرة أخرى بعد قليل.',
    year: 'السنة',
    close: 'إغلاق',
    errBadKey:
      'لا تقبل بوابة البيانات العامة هذا المفتاح. انسخه مرة أخرى أو تأكد من الموافقة على طلبك. قد يستغرق المفتاح الجديد نحو ساعة حتى يعمل.',
    errExpired: 'انتهت صلاحية المفتاح. مدّدها من بوابة البيانات العامة.',
    errQuota: 'استُنفدت عمليات البحث لهذا اليوم. حاول مرة أخرى غدًا.',
    errRate: 'طلبات كثيرة جدًا في وقت قصير. حاول مرة أخرى بعد قليل.',
    errBlocked: 'حظرت بوابة البيانات العامة الطلبات الواردة من عنوان الإنترنت هذا.',
    errNetwork: 'تعذّر الاتصال ببوابة البيانات العامة. تحقّق من اتصالك بالإنترنت.',
    errService: 'لا تستجيب بوابة البيانات العامة كما ينبغي الآن. حاول مرة أخرى بعد قليل.',
    warnNc: 'لا يجوز استخدامها في مستندات تجارية.',
    warnNd: 'لا يجوز تعديلها، كالقص أو تغيير الألوان.',
    warnSa: 'ما يُنتَج بتعديلها يجب نشره بالشروط نفسها.',
    confirm: 'لهذه الصورة شروط استخدام.\n{conditions}\nهل تريد إدراجها على أي حال؟',
  },
  pt: {
    title: 'Imagens do Gongu',
    find: 'Procurar no Gongu',
    placeholder: 'Título ou artista (ex.: 호랑이, 김홍도)',
    search: 'Procurar',
    searching: 'Procurando…',
    noResults:
      'Nenhuma imagem encontrada. Tente uma única palavra do título ou do nome do artista.',
    total: '{count} resultados',
    more: 'Mais',
    insert: 'Inserir',
    inserting: 'Inserindo…',
    noKey: 'Não há chave do Gongu. Insira-a em Configurações → Integrações → "Imagens do Gongu".',
    noKeyHint:
      'Gongu pictures need a free key from the Korean public data portal (data.go.kr). Put it under Settings → Integrations → "Gongu pictures".',
    openSettings: 'Open integration settings',
    footer:
      'As obras do Gongu são fornecidas pela Comissão de Direitos Autorais da Coreia. O crédito da imagem inserida é escrito automaticamente.',
    pictureFailed: 'Não foi possível obter a imagem. Tente de novo em instantes.',
    year: 'Ano',
    close: 'Fechar',
    errBadKey:
      'O portal de dados públicos não aceita esta chave. Copie-a novamente ou confira se sua solicitação foi aprovada. Uma chave nova pode levar cerca de uma hora para funcionar.',
    errExpired: 'A chave expirou. Prorrogue-a no portal de dados públicos.',
    errQuota: 'As buscas de hoje acabaram. Tente novamente amanhã.',
    errRate: 'Solicitações demais em pouco tempo. Tente novamente em instantes.',
    errBlocked: 'O portal de dados públicos bloqueou as solicitações deste endereço de internet.',
    errNetwork:
      'Não foi possível conectar ao portal de dados públicos. Verifique sua conexão com a internet.',
    errService:
      'O portal de dados públicos não está respondendo corretamente agora. Tente novamente em instantes.',
    warnNc: 'Não pode ser usada em documentos comerciais.',
    warnNd: 'Não pode ser alterada, por exemplo cortada ou recolorida.',
    warnSa: 'O que for criado alterando-a deve ser compartilhado nas mesmas condições.',
    confirm: 'Esta imagem tem condições de uso.\n{conditions}\nInserir mesmo assim?',
  },
  it: {
    title: 'Immagini Gongu',
    find: 'Cerca in Gongu',
    placeholder: 'Titolo o artista (es. 호랑이, 김홍도)',
    search: 'Cerca',
    searching: 'Ricerca in corso…',
    noResults:
      "Nessuna immagine trovata. Prova una sola parola del titolo o del nome dell'artista.",
    total: '{count} risultati',
    more: 'Altro',
    insert: 'Inserisci',
    inserting: 'Inserimento…',
    noKey: 'Nessuna chiave Gongu. Inseriscila in Impostazioni → Integrazioni → "Immagini Gongu".',
    noKeyHint:
      'Gongu pictures need a free key from the Korean public data portal (data.go.kr). Put it under Settings → Integrations → "Gongu pictures".',
    openSettings: 'Open integration settings',
    footer:
      "Le opere di Gongu sono fornite dalla Commissione coreana per il diritto d'autore. Il credito dell'immagine inserita viene scritto automaticamente.",
    pictureFailed: "Impossibile ottenere l'immagine. Riprova tra poco.",
    year: 'Anno',
    close: 'Chiudi',
    errBadKey:
      'Il portale dei dati pubblici non accetta questa chiave. Copiala di nuovo o verifica che la richiesta sia stata approvata. Una chiave nuova può impiegare circa un’ora per funzionare.',
    errExpired: 'La chiave è scaduta. Prolungala sul portale dei dati pubblici.',
    errQuota: 'Le ricerche di oggi sono esaurite. Riprova domani.',
    errRate: 'Troppe richieste in poco tempo. Riprova tra poco.',
    errBlocked:
      'Il portale dei dati pubblici ha bloccato le richieste da questo indirizzo internet.',
    errNetwork:
      'Impossibile raggiungere il portale dei dati pubblici. Controlla la connessione a internet.',
    errService:
      'Il portale dei dati pubblici non risponde correttamente in questo momento. Riprova tra poco.',
    warnNc: 'Non utilizzabile in documenti commerciali.',
    warnNd: 'Non si può modificare, ad esempio ritagliandola o cambiandone i colori.',
    warnSa: 'Ciò che si crea modificandola va condiviso alle stesse condizioni.',
    confirm: "Questa immagine ha condizioni d'uso.\n{conditions}\nInserirla comunque?",
  },
  pl: {
    title: 'Obrazy Gongu',
    find: 'Szukaj w Gongu',
    placeholder: 'Tytuł lub artysta (np. 호랑이, 김홍도)',
    search: 'Szukaj',
    searching: 'Wyszukiwanie…',
    noResults: 'Nie znaleziono obrazów. Spróbuj jednego słowa z tytułu lub nazwiska artysty.',
    total: 'Znaleziono: {count}',
    more: 'Więcej',
    insert: 'Wstaw',
    inserting: 'Wstawianie…',
    noKey: 'Brak klucza Gongu. Wpisz go w Ustawienia → Integracje → „Obrazy Gongu”.',
    noKeyHint:
      'Gongu pictures need a free key from the Korean public data portal (data.go.kr). Put it under Settings → Integrations → "Gongu pictures".',
    openSettings: 'Open integration settings',
    footer:
      'Dzieła Gongu udostępnia Koreańska Komisja Praw Autorskich. Źródło wstawionego obrazu jest wpisywane automatycznie.',
    pictureFailed: 'Nie udało się pobrać obrazu. Spróbuj ponownie za chwilę.',
    year: 'Rok',
    close: 'Zamknij',
    errBadKey:
      'Portal danych publicznych nie przyjmuje tego klucza. Skopiuj go ponownie albo sprawdź, czy wniosek został zatwierdzony. Nowy klucz może zacząć działać dopiero po około godzinie.',
    errExpired: 'Klucz wygasł. Przedłuż go w portalu danych publicznych.',
    errQuota: 'Dzisiejszy limit wyszukiwań został wyczerpany. Spróbuj jutro.',
    errRate: 'Zbyt wiele żądań w krótkim czasie. Spróbuj ponownie za chwilę.',
    errBlocked: 'Portal danych publicznych zablokował żądania z tego adresu internetowego.',
    errNetwork:
      'Nie udało się połączyć z portalem danych publicznych. Sprawdź połączenie z internetem.',
    errService:
      'Portal danych publicznych nie odpowiada teraz poprawnie. Spróbuj ponownie za chwilę.',
    warnNc: 'Nie wolno używać w dokumentach komercyjnych.',
    warnNd: 'Nie wolno zmieniać, np. kadrować ani zmieniać kolorów.',
    warnSa: 'To, co powstanie przez zmianę, trzeba udostępnić na tych samych warunkach.',
    confirm: 'Ten obraz ma warunki użycia.\n{conditions}\nWstawić mimo to?',
  },
  cs: {
    title: 'Obrázky Gongu',
    find: 'Hledat v Gongu',
    placeholder: 'Název nebo autor (např. 호랑이, 김홍도)',
    search: 'Hledat',
    searching: 'Hledání…',
    noResults: 'Žádné obrázky nenalezeny. Zkuste jedno slovo z názvu nebo jména autora.',
    total: 'Nalezeno: {count}',
    more: 'Další',
    insert: 'Vložit',
    inserting: 'Vkládání…',
    noKey: 'Chybí klíč Gongu. Zadejte ho v Nastavení → Integrace → „Obrázky Gongu“.',
    noKeyHint:
      'Gongu pictures need a free key from the Korean public data portal (data.go.kr). Put it under Settings → Integrations → "Gongu pictures".',
    openSettings: 'Open integration settings',
    footer:
      'Díla Gongu poskytuje Korejská komise pro autorská práva. Zdroj vloženého obrázku se zapíše automaticky.',
    pictureFailed: 'Obrázek se nepodařilo získat. Zkuste to za chvíli znovu.',
    year: 'Rok',
    close: 'Zavřít',
    errBadKey:
      'Portál veřejných dat tento klíč nepřijímá. Zkopírujte ho znovu nebo ověřte, že vaše žádost byla schválena. Nový klíč může začít fungovat až zhruba za hodinu.',
    errExpired: 'Platnost klíče vypršela. Prodlužte ji na portálu veřejných dat.',
    errQuota: 'Dnešní hledání jsou vyčerpána. Zkuste to zítra.',
    errRate: 'Příliš mnoho požadavků v krátké době. Zkuste to za chvíli znovu.',
    errBlocked: 'Portál veřejných dat zablokoval požadavky z této internetové adresy.',
    errNetwork: 'Nelze se spojit s portálem veřejných dat. Zkontrolujte připojení k internetu.',
    errService: 'Portál veřejných dat teď neodpovídá správně. Zkuste to za chvíli znovu.',
    warnNc: 'Nelze použít v komerčních dokumentech.',
    warnNd: 'Nelze upravovat, např. ořezávat nebo měnit barvy.',
    warnSa: 'Co vznikne úpravou, je nutné sdílet za stejných podmínek.',
    confirm: 'Tento obrázek má podmínky užití.\n{conditions}\nPřesto vložit?',
  },
  nl: {
    title: 'Gongu-afbeeldingen',
    find: 'Zoeken in Gongu',
    placeholder: 'Titel of kunstenaar (bijv. 호랑이, 김홍도)',
    search: 'Zoeken',
    searching: 'Zoeken…',
    noResults:
      'Geen afbeeldingen gevonden. Probeer één woord uit de titel of de naam van de kunstenaar.',
    total: '{count} gevonden',
    more: 'Meer',
    insert: 'Invoegen',
    inserting: 'Invoegen…',
    noKey:
      'Er is geen Gongu-sleutel. Voer er een in bij Instellingen → Integraties → "Gongu-afbeeldingen".',
    noKeyHint:
      'Gongu pictures need a free key from the Korean public data portal (data.go.kr). Put it under Settings → Integrations → "Gongu pictures".',
    openSettings: 'Open integration settings',
    footer:
      'Gongu-werken worden aangeboden door de Koreaanse auteursrechtcommissie. De bronvermelding van een ingevoegde afbeelding wordt automatisch geschreven.',
    pictureFailed: 'De afbeelding kon niet worden opgehaald. Probeer het zo meteen opnieuw.',
    year: 'Jaar',
    close: 'Sluiten',
    errBadKey:
      'Het portaal voor open data accepteert deze sleutel niet. Kopieer hem opnieuw of controleer of uw aanvraag is goedgekeurd. Een nieuwe sleutel kan ongeveer een uur nodig hebben voordat hij werkt.',
    errExpired: 'De sleutel is verlopen. Verleng hem op het portaal voor open data.',
    errQuota: 'De zoekopdrachten van vandaag zijn op. Probeer het morgen opnieuw.',
    errRate: 'Te veel verzoeken in korte tijd. Probeer het zo meteen opnieuw.',
    errBlocked: 'Het portaal voor open data heeft verzoeken van dit internetadres geblokkeerd.',
    errNetwork: 'Kan het portaal voor open data niet bereiken. Controleer uw internetverbinding.',
    errService:
      'Het portaal voor open data antwoordt op dit moment niet goed. Probeer het zo meteen opnieuw.',
    warnNc: 'Niet voor gebruik in commerciële documenten.',
    warnNd: 'Mag niet worden gewijzigd, zoals bijsnijden of herkleuren.',
    warnSa: 'Wat je maakt door haar te wijzigen, moet onder dezelfde voorwaarden worden gedeeld.',
    confirm: 'Voor deze afbeelding gelden gebruiksvoorwaarden.\n{conditions}\nToch invoegen?',
  },
  ms: {
    title: 'Gambar Gongu',
    find: 'Cari dalam Gongu',
    placeholder: 'Tajuk atau nama artis (cth. 호랑이, 김홍도)',
    search: 'Cari',
    searching: 'Mencari…',
    noResults: 'Tiada gambar ditemui. Cuba satu perkataan daripada tajuk atau nama artis.',
    total: '{count} hasil',
    more: 'Lagi',
    insert: 'Sisipkan',
    inserting: 'Menyisipkan…',
    noKey: 'Tiada kunci Gongu. Masukkan dalam Tetapan → Integrasi → "Gambar Gongu".',
    noKeyHint:
      'Gongu pictures need a free key from the Korean public data portal (data.go.kr). Put it under Settings → Integrations → "Gongu pictures".',
    openSettings: 'Open integration settings',
    footer:
      'Karya Gongu disediakan oleh Suruhanjaya Hak Cipta Korea. Kredit gambar yang disisipkan ditulis secara automatik.',
    pictureFailed: 'Gambar tidak dapat diambil. Cuba lagi sebentar lagi.',
    year: 'Tahun',
    close: 'Tutup',
    errBadKey:
      'Portal Data Awam tidak menerima kunci ini. Salin semula atau pastikan permohonan anda telah diluluskan. Kunci baharu mungkin mengambil masa kira-kira sejam sebelum berfungsi.',
    errExpired: 'Kunci telah tamat tempoh. Lanjutkannya di Portal Data Awam.',
    errQuota: 'Had carian hari ini telah habis. Cuba lagi esok.',
    errRate: 'Terlalu banyak permintaan dalam masa singkat. Cuba lagi sebentar nanti.',
    errBlocked: 'Portal Data Awam menyekat permintaan daripada alamat internet ini.',
    errNetwork: 'Tidak dapat menghubungi Portal Data Awam. Semak sambungan internet anda.',
    errService:
      'Portal Data Awam tidak memberi jawapan yang betul sekarang. Cuba lagi sebentar nanti.',
    warnNc: 'Tidak boleh digunakan dalam dokumen komersial.',
    warnNd: 'Tidak boleh diubah, contohnya dipangkas atau ditukar warna.',
    warnSa: 'Hasil yang dibuat dengan mengubahnya mesti dikongsi dengan syarat yang sama.',
    confirm: 'Gambar ini mempunyai syarat penggunaan.\n{conditions}\nSisipkan juga?',
  },
  he: {
    title: 'תמונות Gongu',
    find: 'חיפוש ב-Gongu',
    placeholder: 'כותרת או שם האמן (למשל 호랑이, 김홍도)',
    search: 'חיפוש',
    searching: 'מחפש…',
    noResults: 'לא נמצאו תמונות. נסו מילה אחת מהכותרת או משם האמן.',
    total: '{count} תוצאות',
    more: 'עוד',
    insert: 'הוספה',
    inserting: 'מוסיף…',
    noKey: 'אין מפתח Gongu. הזינו אותו בהגדרות ← שילובים ← "תמונות Gongu".',
    noKeyHint:
      'Gongu pictures need a free key from the Korean public data portal (data.go.kr). Put it under Settings → Integrations → "Gongu pictures".',
    openSettings: 'Open integration settings',
    footer:
      'יצירות Gongu מסופקות על ידי ועדת זכויות היוצרים של קוריאה. הקרדיט לתמונה שנוספה נכתב אוטומטית.',
    pictureFailed: 'לא ניתן היה להביא את התמונה. נסו שוב בעוד רגע.',
    year: 'שנה',
    close: 'סגירה',
    errBadKey:
      'פורטל הנתונים הציבוריים לא מקבל את המפתח הזה. העתיקו אותו שוב או בדקו שהבקשה שלכם אושרה. ייתכן שיעברו כשעה עד שמפתח חדש יתחיל לעבוד.',
    errExpired: 'תוקף המפתח פג. האריכו אותו בפורטל הנתונים הציבוריים.',
    errQuota: 'החיפושים להיום נוצלו. נסו שוב מחר.',
    errRate: 'יותר מדי בקשות בזמן קצר. נסו שוב בעוד רגע.',
    errBlocked: 'פורטל הנתונים הציבוריים חסם בקשות מכתובת האינטרנט הזו.',
    errNetwork: 'לא ניתן להתחבר לפורטל הנתונים הציבוריים. בדקו את החיבור לאינטרנט.',
    errService: 'פורטל הנתונים הציבוריים לא עונה כראוי כרגע. נסו שוב בעוד רגע.',
    warnNc: 'אסור לשימוש במסמכים מסחריים.',
    warnNd: 'אסור לשנות אותה, למשל בחיתוך או בשינוי צבעים.',
    warnSa: 'כל מה שנוצר משינויה חייב להיות משותף באותם תנאים.',
    confirm: 'לתמונה זו יש תנאי שימוש.\n{conditions}\nלהוסיף בכל זאת?',
  },
  hi: {
    title: 'Gongu चित्र',
    find: 'Gongu में खोजें',
    placeholder: 'शीर्षक या कलाकार का नाम (जैसे 호랑이, 김홍도)',
    search: 'खोजें',
    searching: 'खोजा जा रहा है…',
    noResults: 'कोई चित्र नहीं मिला। शीर्षक या कलाकार के नाम का एक शब्द आज़माएँ।',
    total: '{count} परिणाम',
    more: 'और देखें',
    insert: 'डालें',
    inserting: 'डाला जा रहा है…',
    noKey: 'कोई Gongu कुंजी नहीं है। सेटिंग्स → इंटीग्रेशन → "Gongu चित्र" में कुंजी डालें।',
    noKeyHint:
      'Gongu pictures need a free key from the Korean public data portal (data.go.kr). Put it under Settings → Integrations → "Gongu pictures".',
    openSettings: 'Open integration settings',
    footer:
      'Gongu की कृतियाँ कोरिया कॉपीराइट आयोग उपलब्ध कराता है। डाले गए चित्र का स्रोत अपने आप लिखा जाता है।',
    pictureFailed: 'चित्र नहीं मिल सका। थोड़ी देर बाद फिर कोशिश करें।',
    year: 'वर्ष',
    close: 'बंद करें',
    errBadKey:
      'सार्वजनिक डेटा पोर्टल यह कुंजी स्वीकार नहीं कर रहा। कुंजी फिर से कॉपी करें, या देखें कि आपका आवेदन स्वीकृत हुआ है या नहीं। नई कुंजी को काम शुरू करने में लगभग एक घंटा लग सकता है।',
    errExpired: 'कुंजी की अवधि समाप्त हो गई है। सार्वजनिक डेटा पोर्टल पर इसकी अवधि बढ़ाएँ।',
    errQuota: 'आज की खोजें पूरी हो चुकी हैं। कल फिर कोशिश करें।',
    errRate: 'कम समय में बहुत अधिक अनुरोध हुए। थोड़ी देर बाद फिर कोशिश करें।',
    errBlocked: 'सार्वजनिक डेटा पोर्टल ने इस इंटरनेट पते से आने वाले अनुरोध रोक दिए हैं।',
    errNetwork: 'सार्वजनिक डेटा पोर्टल से कनेक्ट नहीं हो सका। अपना इंटरनेट कनेक्शन जाँचें।',
    errService: 'सार्वजनिक डेटा पोर्टल अभी ठीक से जवाब नहीं दे रहा। थोड़ी देर बाद फिर कोशिश करें।',
    warnNc: 'व्यावसायिक दस्तावेज़ों में उपयोग नहीं कर सकते।',
    warnNd: 'बदला नहीं जा सकता, जैसे काटना या रंग बदलना।',
    warnSa: 'बदलकर बनाई गई चीज़ उसी शर्त पर साझा करनी होगी।',
    confirm: 'इस चित्र की उपयोग शर्तें हैं।\n{conditions}\nफिर भी डालें?',
  },
  'zh-TW': {
    title: 'Gongu 圖片',
    find: '在 Gongu 中尋找',
    placeholder: '標題或作者名（例：호랑이、김홍도）',
    search: '搜尋',
    searching: '正在搜尋…',
    noResults: '沒有找到圖片。請用標題或作者名中的一個詞再試。',
    total: '共 {count} 筆',
    more: '更多',
    insert: '插入',
    inserting: '正在插入…',
    noKey: '沒有 Gongu 金鑰。請在「設定 → 整合 → Gongu 圖片」中輸入金鑰。',
    noKeyHint:
      'Gongu pictures need a free key from the Korean public data portal (data.go.kr). Put it under Settings → Integrations → "Gongu pictures".',
    openSettings: 'Open integration settings',
    footer: 'Gongu 作品由韓國著作權委員會提供。插入圖片的出處會自動寫上。',
    pictureFailed: '無法取得圖片。請稍後再試。',
    year: '創作年份',
    close: '關閉',
    errBadKey:
      '公共資料入口網不接受此金鑰。請重新複製金鑰，或確認申請已獲核准。新金鑰可能需要約一小時才會生效。',
    errExpired: '金鑰已過期。請在公共資料入口網延長使用期限。',
    errQuota: '今天的搜尋次數已用完。請明天再試。',
    errRate: '短時間內要求過多。請稍後再試。',
    errBlocked: '公共資料入口網封鎖了來自此網路位址的要求。',
    errNetwork: '無法連線到公共資料入口網。請檢查網路連線。',
    errService: '公共資料入口網目前沒有正常回應。請稍後再試。',
    warnNc: '不得用於商業用途的文件。',
    warnNd: '不得修改，例如裁切或改色。',
    warnSa: '修改後製作的成果必須以相同條件公開。',
    confirm: '這張圖片有使用條件。\n{conditions}\n仍要插入嗎？',
  },
  vi: {
    title: 'Ảnh công cộng',
    find: 'Tìm ảnh trong Gongu, kho tác phẩm công cộng của Hàn Quốc',
    placeholder:
      'Tên tác phẩm hoặc tác giả bằng tiếng Hàn (vd: 호랑이 = con hổ, 김홍도 = Kim Hong-do)',
    search: 'Tìm',
    searching: 'Đang tìm…',
    noResults: 'Không tìm thấy hình ảnh. Hãy thử một từ trong tên tác phẩm hoặc tên tác giả.',
    total: '{count} kết quả',
    more: 'Xem thêm',
    insert: 'Chèn',
    inserting: 'Đang chèn…',
    noKey: 'Cần có khóa để tìm hình ảnh Gongu.',
    noKeyHint:
      'Khóa được cấp miễn phí trên Cổng dữ liệu công Hàn Quốc (data.go.kr). Nhập khóa vào Cài đặt → Tích hợp → "Ảnh công cộng (Gongu)" là dùng được ngay.',
    openSettings: 'Mở cài đặt tích hợp',
    footer:
      'Tác phẩm Gongu do Ủy ban Bản quyền Hàn Quốc cung cấp. Nguồn của hình được chèn sẽ được ghi tự động.',
    pictureFailed: 'Không lấy được hình ảnh. Hãy thử lại sau giây lát.',
    year: 'Năm sáng tác',
    close: 'Đóng',
    errBadKey:
      'Cổng dữ liệu công không chấp nhận khóa này. Hãy sao chép lại khóa hoặc kiểm tra xem đơn đăng ký đã được duyệt chưa. Khóa mới có thể mất khoảng một giờ mới dùng được.',
    errExpired: 'Khóa đã hết hạn. Hãy gia hạn trên Cổng dữ liệu công.',
    errQuota: 'Đã dùng hết lượt tìm của hôm nay. Hãy thử lại vào ngày mai.',
    errRate: 'Quá nhiều yêu cầu trong thời gian ngắn. Hãy thử lại sau giây lát.',
    errBlocked: 'Cổng dữ liệu công đã chặn các yêu cầu từ địa chỉ internet này.',
    errNetwork: 'Không kết nối được với Cổng dữ liệu công. Hãy kiểm tra kết nối internet.',
    errService: 'Cổng dữ liệu công hiện không phản hồi đúng. Hãy thử lại sau giây lát.',
    warnNc: 'Không được dùng trong tài liệu vì mục đích thương mại.',
    warnNd: 'Không được chỉnh sửa, chẳng hạn cắt hay đổi màu.',
    warnSa: 'Sản phẩm tạo ra từ việc chỉnh sửa phải được chia sẻ với cùng điều kiện.',
    confirm: 'Hình này có điều kiện sử dụng.\n{conditions}\nVẫn chèn chứ?',
  },
}
