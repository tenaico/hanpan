import {
  createI18n,
  defineStrings,
  PRODUCT_CONTACT_EMAIL,
  productName,
  type Lang,
} from '@genoffice/i18n'

/**
 * Hanpan: feedback goes to the people who make it (TenAI) by email. The Help
 * menu and Settings → About open the person's mail app with a message to
 * PRODUCT_CONTACT_EMAIL, the version details already in it; the app itself
 * sends nothing.
 */
export function feedbackMailUrl(details: string): string {
  const subject = encodeURIComponent(`${productName('ko')} 의견 / ${productName('en')} feedback`)
  return `mailto:${PRODUCT_CONTACT_EMAIL}?subject=${subject}&body=${encodeURIComponent(`

---
${details}
`)}`
}

const zh = {
  menuLabel: '发送反馈',
  dialogTitle: '发送反馈',
  dialogBody:
    '将打开你的邮件应用，并给 TenAI 团队写一封邮件。下面的信息已附在邮件中，也会复制到剪贴板。应用本身不会发送任何内容，也不会包含文档内容。',
  details: '版本 {version}\n操作系统 {os}\n界面语言 {language}',
  btnOpen: '写邮件',
  btnCancel: '取消',
}

type Keys = Record<keyof typeof zh, string>

export const FEEDBACK_STRINGS = defineStrings({
  zh,
  en: {
    menuLabel: 'Send feedback',
    dialogTitle: 'Send feedback',
    dialogBody:
      'Your mail app opens with a message to the TenAI team. The details below are in the message and also copied to the clipboard. The app sends nothing itself, and document contents are never included.',
    details: 'Version {version}\nOS {os}\nUI language {language}',
    btnOpen: 'Write email',
    btnCancel: 'Cancel',
  } satisfies Keys,
  vi: {
    menuLabel: 'Gửi phản hồi',
    dialogTitle: 'Gửi phản hồi',
    dialogBody:
      'Ứng dụng thư sẽ mở với một thư gửi nhóm TenAI. Thông tin bên dưới đã có trong thư và cũng được sao chép vào bộ nhớ tạm. Ứng dụng không tự gửi gì, và không bao giờ kèm nội dung tài liệu.',
    details: 'Phiên bản {version}\nHệ thống {os}\nNgôn ngữ {language}',
    btnOpen: 'Viết email',
    btnCancel: 'Hủy',
  } satisfies Keys,
  ja: {
    menuLabel: 'フィードバックを送る',
    dialogTitle: 'フィードバックを送る',
    dialogBody:
      'メールアプリが開き、TenAI チーム宛てのメールが作られます。下の情報はメールに入っており、クリップボードにもコピーされます。アプリ自体は何も送信せず、文書の内容は含まれません。',
    details: 'バージョン {version}\nOS {os}\n表示言語 {language}',
    btnOpen: 'メールを書く',
    btnCancel: 'キャンセル',
  } satisfies Keys,
  ko: {
    menuLabel: '의견 보내기',
    dialogTitle: '의견 보내기',
    dialogBody:
      '메일 앱이 열리고 TenAI 팀에게 보낼 메일이 만들어집니다. 아래 정보는 메일에 들어 있고 클립보드에도 복사됩니다. 앱은 아무것도 보내지 않으며, 문서 내용은 포함되지 않습니다.',
    details: '버전 {version}\n운영체제 {os}\n화면 언어 {language}',
    btnOpen: '메일 쓰기',
    btnCancel: '취소',
  } satisfies Keys,
  fr: {
    menuLabel: 'Envoyer un commentaire',
    dialogTitle: 'Envoyer un commentaire',
    dialogBody:
      "Votre messagerie s'ouvre avec un message pour l'équipe TenAI. Les informations ci-dessous sont dans le message et copiées dans le presse-papiers. L'application n'envoie rien elle-même et n'inclut jamais le contenu des documents.",
    details: 'Version {version}\nSystème {os}\nLangue {language}',
    btnOpen: 'Écrire un e-mail',
    btnCancel: 'Annuler',
  } satisfies Keys,
  de: {
    menuLabel: 'Feedback senden',
    dialogTitle: 'Feedback senden',
    dialogBody:
      'Ihr E-Mail-Programm öffnet sich mit einer Nachricht an das TenAI-Team. Die Angaben unten stehen in der Nachricht und werden auch in die Zwischenablage kopiert. Die App sendet selbst nichts, und Dokumentinhalte sind nie enthalten.',
    details: 'Version {version}\nBetriebssystem {os}\nSprache {language}',
    btnOpen: 'E-Mail schreiben',
    btnCancel: 'Abbrechen',
  } satisfies Keys,
  es: {
    menuLabel: 'Enviar comentarios',
    dialogTitle: 'Enviar comentarios',
    dialogBody:
      'Se abre tu aplicación de correo con un mensaje para el equipo de TenAI. Los datos de abajo van en el mensaje y también se copian al portapapeles. La aplicación no envía nada por sí misma y nunca incluye el contenido de los documentos.',
    details: 'Versión {version}\nSistema {os}\nIdioma {language}',
    btnOpen: 'Escribir correo',
    btnCancel: 'Cancelar',
  } satisfies Keys,
  th: {
    menuLabel: 'ส่งข้อเสนอแนะ',
    dialogTitle: 'ส่งข้อเสนอแนะ',
    dialogBody:
      'แอปอีเมลจะเปิดพร้อมข้อความถึงทีม TenAI ข้อมูลด้านล่างอยู่ในข้อความและถูกคัดลอกไปยังคลิปบอร์ดด้วย แอปไม่ส่งอะไรเอง และไม่รวมเนื้อหาเอกสาร',
    details: 'เวอร์ชัน {version}\nระบบ {os}\nภาษา {language}',
    btnOpen: 'เขียนอีเมล',
    btnCancel: 'ยกเลิก',
  } satisfies Keys,
  id: {
    menuLabel: 'Kirim masukan',
    dialogTitle: 'Kirim masukan',
    dialogBody:
      'Aplikasi email Anda terbuka dengan pesan untuk tim TenAI. Detail di bawah ada di dalam pesan dan juga disalin ke papan klip. Aplikasi tidak mengirim apa pun sendiri, dan isi dokumen tidak pernah disertakan.',
    details: 'Versi {version}\nSistem {os}\nBahasa {language}',
    btnOpen: 'Tulis email',
    btnCancel: 'Batal',
  } satisfies Keys,
  ru: {
    menuLabel: 'Отправить отзыв',
    dialogTitle: 'Отправить отзыв',
    dialogBody:
      'Откроется почтовая программа с письмом команде TenAI. Сведения ниже уже в письме и скопированы в буфер обмена. Само приложение ничего не отправляет, содержимое документов не включается.',
    details: 'Версия {version}\nСистема {os}\nЯзык {language}',
    btnOpen: 'Написать письмо',
    btnCancel: 'Отмена',
  } satisfies Keys,
  ar: {
    menuLabel: 'إرسال ملاحظات',
    dialogTitle: 'إرسال ملاحظات',
    dialogBody:
      'يُفتح تطبيق البريد برسالة إلى فريق TenAI. التفاصيل أدناه موجودة في الرسالة ومنسوخة أيضًا إلى الحافظة. لا يرسل التطبيق شيئًا بنفسه، ولا يتضمن محتوى المستندات أبدًا.',
    details: 'الإصدار {version}\nالنظام {os}\nاللغة {language}',
    btnOpen: 'كتابة بريد',
    btnCancel: 'إلغاء',
  } satisfies Keys,
  pt: {
    menuLabel: 'Enviar comentários',
    dialogTitle: 'Enviar comentários',
    dialogBody:
      'Seu aplicativo de e-mail abre com uma mensagem para a equipe da TenAI. Os detalhes abaixo estão na mensagem e também são copiados para a área de transferência. O aplicativo não envia nada sozinho e nunca inclui o conteúdo dos documentos.',
    details: 'Versão {version}\nSistema {os}\nIdioma {language}',
    btnOpen: 'Escrever e-mail',
    btnCancel: 'Cancelar',
  } satisfies Keys,
  it: {
    menuLabel: 'Invia feedback',
    dialogTitle: 'Invia feedback',
    dialogBody:
      'Si apre il programma di posta con un messaggio per il team di TenAI. I dettagli qui sotto sono nel messaggio e vengono copiati negli appunti. L’app non invia nulla da sé e non include mai il contenuto dei documenti.',
    details: 'Versione {version}\nSistema {os}\nLingua {language}',
    btnOpen: 'Scrivi email',
    btnCancel: 'Annulla',
  } satisfies Keys,
  pl: {
    menuLabel: 'Wyślij opinię',
    dialogTitle: 'Wyślij opinię',
    dialogBody:
      'Otworzy się program pocztowy z wiadomością do zespołu TenAI. Poniższe dane są w wiadomości i zostaną też skopiowane do schowka. Aplikacja sama niczego nie wysyła i nigdy nie dołącza treści dokumentów.',
    details: 'Wersja {version}\nSystem {os}\nJęzyk {language}',
    btnOpen: 'Napisz e-mail',
    btnCancel: 'Anuluj',
  } satisfies Keys,
  cs: {
    menuLabel: 'Odeslat zpětnou vazbu',
    dialogTitle: 'Odeslat zpětnou vazbu',
    dialogBody:
      'Otevře se poštovní program se zprávou pro tým TenAI. Údaje níže jsou ve zprávě a zkopírují se i do schránky. Aplikace sama nic neodesílá a obsah dokumentů nikdy nepřikládá.',
    details: 'Verze {version}\nSystém {os}\nJazyk {language}',
    btnOpen: 'Napsat e-mail',
    btnCancel: 'Zrušit',
  } satisfies Keys,
  nl: {
    menuLabel: 'Feedback sturen',
    dialogTitle: 'Feedback sturen',
    dialogBody:
      'Uw mailprogramma opent met een bericht aan het TenAI-team. De gegevens hieronder staan in het bericht en worden ook naar het klembord gekopieerd. De app verstuurt zelf niets en voegt nooit documentinhoud toe.',
    details: 'Versie {version}\nSysteem {os}\nTaal {language}',
    btnOpen: 'E-mail schrijven',
    btnCancel: 'Annuleren',
  } satisfies Keys,
  ms: {
    menuLabel: 'Hantar maklum balas',
    dialogTitle: 'Hantar maklum balas',
    dialogBody:
      'Aplikasi e-mel anda dibuka dengan mesej kepada pasukan TenAI. Butiran di bawah ada dalam mesej dan turut disalin ke papan keratan. Aplikasi tidak menghantar apa-apa sendiri dan tidak sekali-kali menyertakan kandungan dokumen.',
    details: 'Versi {version}\nSistem {os}\nBahasa {language}',
    btnOpen: 'Tulis e-mel',
    btnCancel: 'Batal',
  } satisfies Keys,
  he: {
    menuLabel: 'שליחת משוב',
    dialogTitle: 'שליחת משוב',
    dialogBody:
      'תוכנת הדואר תיפתח עם הודעה לצוות TenAI. הפרטים שלמטה נמצאים בהודעה ומועתקים גם ללוח. האפליקציה עצמה לא שולחת דבר, ותוכן מסמכים אף פעם לא נכלל.',
    details: 'גרסה {version}\nמערכת {os}\nשפה {language}',
    btnOpen: 'כתיבת דוא"ל',
    btnCancel: 'ביטול',
  } satisfies Keys,
  hi: {
    menuLabel: 'फ़ीडबैक भेजें',
    dialogTitle: 'फ़ीडबैक भेजें',
    dialogBody:
      'आपका मेल ऐप TenAI टीम के लिए एक संदेश के साथ खुलेगा। नीचे की जानकारी संदेश में है और क्लिपबोर्ड पर भी कॉपी हो जाती है। ऐप खुद कुछ नहीं भेजता, और दस्तावेज़ की सामग्री कभी शामिल नहीं होती।',
    details: 'संस्करण {version}\nसिस्टम {os}\nभाषा {language}',
    btnOpen: 'ईमेल लिखें',
    btnCancel: 'रद्द करें',
  } satisfies Keys,
  'zh-TW': {
    menuLabel: '傳送意見回饋',
    dialogTitle: '傳送意見回饋',
    dialogBody:
      '將開啟你的郵件程式，並寫好一封給 TenAI 團隊的郵件。下面的資訊已附在郵件中，也會複製到剪貼簿。應用程式本身不會傳送任何內容，也不會包含文件內容。',
    details: '版本 {version}\n作業系統 {os}\n介面語言 {language}',
    btnOpen: '寫郵件',
    btnCancel: '取消',
  } satisfies Keys,
})

export const feedbackText = createI18n(FEEDBACK_STRINGS)

export interface FeedbackEnvironment {
  version: string
  os: string
  language: string
}

/** `Windows`, `macOS`, `Linux`; anything else is shown as the platform names itself. */
export function platformLabel(platform: string): string {
  if (platform === 'win32') return 'Windows'
  if (platform === 'darwin') return 'macOS'
  if (platform === 'linux') return 'Linux'
  return platform
}

/** The block copied to the clipboard: version, OS and UI language, nothing else. */
export function feedbackDetails(lang: Lang, env: FeedbackEnvironment): string {
  return feedbackText(lang, 'details', {
    version: env.version,
    os: env.os,
    language: env.language,
  })
}

/**
 * The OS as people know it (0.17 리뷰 v2 shell #20): Windows 11 still reports
 * kernel 10.0, so the build number (22000 and up) tells 11 from 10.
 */
export function osLabel(platform: string, release: string): string {
  if (platform === 'win32') {
    const build = Number(release.split('.')[2])
    const name = Number.isFinite(build) && build >= 22000 ? 'Windows 11' : 'Windows 10'
    return `${name} (${release})`
  }
  return `${platformLabel(platform)} ${release}`
}
