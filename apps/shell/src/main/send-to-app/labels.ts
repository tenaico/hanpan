/**
 * 다른 앱으로 보내기의 문구. 대상 편집기 이름은 메인 문자열 표의 "새로 만들기" 문구
 * (menuNewDoc 등)를 그대로 쓰고, 여기에는 이 기능의 문구만 둔다. 설정 메뉴(settings-menu.ts)
 * 처럼 메인 문자열 표와 따로 두어 다른 작업과 겹치지 않게 했다.
 */
const KEYS = [
  'menuSendToApp',
  'menuSendViaMarkdown',
  'sendSaveFirst',
  'sendSaveFirstDetail',
  'sendSaveAndSend',
  'sendFailed',
  'sendEmpty',
  'sendUnreadable',
  'sendRedaction',
  'sendTooManySlides',
] as const
export type SendLabelKey = (typeof KEYS)[number]

export const SEND_LABELS: Readonly<Record<string, Readonly<Record<SendLabelKey, string>>>> = {
  ko: {
    menuSendToApp: '다른 앱으로 보내기',
    menuSendViaMarkdown: '마크다운으로 먼저 보고 고치기',
    sendSaveFirst: '보내기 전에 저장',
    sendSaveFirstDetail:
      '저장하지 않은 변경은 보낼 내용에 들어가지 않습니다. 문서를 먼저 저장한 뒤 새 문서로 보냅니다. 이 문서는 그대로 남습니다.',
    sendSaveAndSend: '저장하고 보내기',
    sendFailed: '다른 앱으로 보내지 못했습니다',
    sendEmpty: '보낼 내용이 없습니다',
    sendUnreadable: '이 문서의 내용을 읽지 못했습니다',
    sendRedaction: 'AI에게 가린 부분을 처리하지 못해 보내지 않았습니다',
    sendTooManySlides: '슬라이드가 100장을 넘어 파워포인트로 보내지 못했습니다',
  },
  en: {
    menuSendToApp: 'Send to another app',
    menuSendViaMarkdown: 'Review in Markdown first',
    sendSaveFirst: 'Save before sending',
    sendSaveFirstDetail:
      'Unsaved changes are not part of what is sent. The document is saved first, then sent as a new document. This document stays as it is.',
    sendSaveAndSend: 'Save and Send',
    sendFailed: 'Could not send to the other app',
    sendEmpty: 'There is nothing to send',
    sendUnreadable: 'The content of this document could not be read',
    sendRedaction: 'Not sent: the parts hidden from AI could not be processed',
    sendTooManySlides: 'Not sent: the text makes more than 100 slides',
  },
  zh: {
    menuSendToApp: '发送到其他应用',
    menuSendViaMarkdown: '先在 Markdown 中查看和修改',
    sendSaveFirst: '发送前保存',
    sendSaveFirstDetail:
      '未保存的更改不会包含在发送内容中。将先保存文档，再作为新文档发送。此文档保持不变。',
    sendSaveAndSend: '保存并发送',
    sendFailed: '无法发送到其他应用',
    sendEmpty: '没有可发送的内容',
    sendUnreadable: '无法读取此文档的内容',
    sendRedaction: '未发送：无法处理对 AI 隐藏的部分',
    sendTooManySlides: '未发送：内容超过 100 张幻灯片',
  },
  'zh-tw': {
    menuSendToApp: '傳送到其他應用程式',
    menuSendViaMarkdown: '先在 Markdown 中檢視和修改',
    sendSaveFirst: '傳送前儲存',
    sendSaveFirstDetail:
      '未儲存的變更不會包含在傳送內容中。將先儲存文件，再作為新文件傳送。此文件保持不變。',
    sendSaveAndSend: '儲存並傳送',
    sendFailed: '無法傳送到其他應用程式',
    sendEmpty: '沒有可傳送的內容',
    sendUnreadable: '無法讀取此文件的內容',
    sendRedaction: '未傳送：無法處理對 AI 隱藏的部分',
    sendTooManySlides: '未傳送：內容超過 100 張投影片',
  },
  ja: {
    menuSendToApp: '他のアプリに送る',
    menuSendViaMarkdown: 'まず Markdown で確認・修正',
    sendSaveFirst: '送る前に保存',
    sendSaveFirstDetail:
      '保存していない変更は送る内容に含まれません。文書を先に保存してから新しい文書として送ります。この文書はそのまま残ります。',
    sendSaveAndSend: '保存して送る',
    sendFailed: '他のアプリに送れませんでした',
    sendEmpty: '送る内容がありません',
    sendUnreadable: 'この文書の内容を読み取れませんでした',
    sendRedaction: '送っていません：AI から隠した部分を処理できませんでした',
    sendTooManySlides: '送っていません：スライドが 100 枚を超えます',
  },
  fr: {
    menuSendToApp: 'Envoyer vers une autre application',
    menuSendViaMarkdown: 'Revoir d’abord en Markdown',
    sendSaveFirst: 'Enregistrer avant l’envoi',
    sendSaveFirstDetail:
      'Les modifications non enregistrées ne sont pas envoyées. Le document est d’abord enregistré, puis envoyé comme nouveau document. Ce document reste inchangé.',
    sendSaveAndSend: 'Enregistrer et envoyer',
    sendFailed: 'Impossible d’envoyer vers l’autre application',
    sendEmpty: 'Il n’y a rien à envoyer',
    sendUnreadable: 'Le contenu de ce document n’a pas pu être lu',
    sendRedaction: 'Non envoyé : les parties masquées à l’IA n’ont pas pu être traitées',
    sendTooManySlides: 'Non envoyé : le texte donne plus de 100 diapositives',
  },
  de: {
    menuSendToApp: 'An andere App senden',
    menuSendViaMarkdown: 'Zuerst in Markdown prüfen',
    sendSaveFirst: 'Vor dem Senden speichern',
    sendSaveFirstDetail:
      'Nicht gespeicherte Änderungen werden nicht gesendet. Das Dokument wird zuerst gespeichert und dann als neues Dokument gesendet. Dieses Dokument bleibt unverändert.',
    sendSaveAndSend: 'Speichern und senden',
    sendFailed: 'Senden an die andere App fehlgeschlagen',
    sendEmpty: 'Es gibt nichts zu senden',
    sendUnreadable: 'Der Inhalt dieses Dokuments konnte nicht gelesen werden',
    sendRedaction:
      'Nicht gesendet: Die vor der KI verborgenen Teile konnten nicht verarbeitet werden',
    sendTooManySlides: 'Nicht gesendet: Der Text ergibt mehr als 100 Folien',
  },
  es: {
    menuSendToApp: 'Enviar a otra aplicación',
    menuSendViaMarkdown: 'Revisar primero en Markdown',
    sendSaveFirst: 'Guardar antes de enviar',
    sendSaveFirstDetail:
      'Los cambios sin guardar no se envían. Primero se guarda el documento y luego se envía como un documento nuevo. Este documento queda como está.',
    sendSaveAndSend: 'Guardar y enviar',
    sendFailed: 'No se pudo enviar a la otra aplicación',
    sendEmpty: 'No hay nada que enviar',
    sendUnreadable: 'No se pudo leer el contenido de este documento',
    sendRedaction: 'No enviado: no se pudieron procesar las partes ocultas a la IA',
    sendTooManySlides: 'No enviado: el texto genera más de 100 diapositivas',
  },
  th: {
    menuSendToApp: 'ส่งไปยังแอปอื่น',
    menuSendViaMarkdown: 'ตรวจและแก้ใน Markdown ก่อน',
    sendSaveFirst: 'บันทึกก่อนส่ง',
    sendSaveFirstDetail:
      'การเปลี่ยนแปลงที่ยังไม่บันทึกจะไม่ถูกส่ง ระบบจะบันทึกเอกสารก่อน แล้วส่งเป็นเอกสารใหม่ เอกสารนี้จะยังคงเหมือนเดิม',
    sendSaveAndSend: 'บันทึกและส่ง',
    sendFailed: 'ส่งไปยังแอปอื่นไม่สำเร็จ',
    sendEmpty: 'ไม่มีเนื้อหาให้ส่ง',
    sendUnreadable: 'อ่านเนื้อหาของเอกสารนี้ไม่ได้',
    sendRedaction: 'ไม่ได้ส่ง: ประมวลผลส่วนที่ซ่อนจาก AI ไม่ได้',
    sendTooManySlides: 'ไม่ได้ส่ง: เนื้อหามีมากกว่า 100 สไลด์',
  },
  id: {
    menuSendToApp: 'Kirim ke aplikasi lain',
    menuSendViaMarkdown: 'Tinjau dulu di Markdown',
    sendSaveFirst: 'Simpan sebelum mengirim',
    sendSaveFirstDetail:
      'Perubahan yang belum disimpan tidak ikut terkirim. Dokumen disimpan dulu, lalu dikirim sebagai dokumen baru. Dokumen ini tetap seperti semula.',
    sendSaveAndSend: 'Simpan dan Kirim',
    sendFailed: 'Tidak dapat mengirim ke aplikasi lain',
    sendEmpty: 'Tidak ada yang dapat dikirim',
    sendUnreadable: 'Isi dokumen ini tidak dapat dibaca',
    sendRedaction: 'Tidak dikirim: bagian yang disembunyikan dari AI tidak dapat diproses',
    sendTooManySlides: 'Tidak dikirim: teks menghasilkan lebih dari 100 slide',
  },
  ru: {
    menuSendToApp: 'Отправить в другое приложение',
    menuSendViaMarkdown: 'Сначала просмотреть в Markdown',
    sendSaveFirst: 'Сохранить перед отправкой',
    sendSaveFirstDetail:
      'Несохранённые изменения не отправляются. Документ сначала будет сохранён, затем отправлен как новый документ. Этот документ останется без изменений.',
    sendSaveAndSend: 'Сохранить и отправить',
    sendFailed: 'Не удалось отправить в другое приложение',
    sendEmpty: 'Нечего отправлять',
    sendUnreadable: 'Не удалось прочитать содержимое этого документа',
    sendRedaction: 'Не отправлено: не удалось обработать части, скрытые от ИИ',
    sendTooManySlides: 'Не отправлено: текст даёт больше 100 слайдов',
  },
  ar: {
    menuSendToApp: 'إرسال إلى تطبيق آخر',
    menuSendViaMarkdown: 'المراجعة في Markdown أولًا',
    sendSaveFirst: 'الحفظ قبل الإرسال',
    sendSaveFirstDetail:
      'لا تُرسل التغييرات غير المحفوظة. يُحفظ المستند أولًا ثم يُرسل كمستند جديد. يبقى هذا المستند كما هو.',
    sendSaveAndSend: 'حفظ وإرسال',
    sendFailed: 'تعذّر الإرسال إلى التطبيق الآخر',
    sendEmpty: 'لا يوجد ما يُرسل',
    sendUnreadable: 'تعذّرت قراءة محتوى هذا المستند',
    sendRedaction: 'لم يُرسل: تعذّرت معالجة الأجزاء المخفية عن الذكاء الاصطناعي',
    sendTooManySlides: 'لم يُرسل: النص ينتج أكثر من 100 شريحة',
  },
  pt: {
    menuSendToApp: 'Enviar para outro aplicativo',
    menuSendViaMarkdown: 'Revisar primeiro em Markdown',
    sendSaveFirst: 'Salvar antes de enviar',
    sendSaveFirstDetail:
      'Alterações não salvas não são enviadas. O documento é salvo primeiro e depois enviado como um novo documento. Este documento fica como está.',
    sendSaveAndSend: 'Salvar e enviar',
    sendFailed: 'Não foi possível enviar para o outro aplicativo',
    sendEmpty: 'Não há nada para enviar',
    sendUnreadable: 'Não foi possível ler o conteúdo deste documento',
    sendRedaction: 'Não enviado: as partes ocultas da IA não puderam ser processadas',
    sendTooManySlides: 'Não enviado: o texto gera mais de 100 slides',
  },
  it: {
    menuSendToApp: 'Invia a un’altra app',
    menuSendViaMarkdown: 'Rivedi prima in Markdown',
    sendSaveFirst: 'Salva prima di inviare',
    sendSaveFirstDetail:
      'Le modifiche non salvate non vengono inviate. Il documento viene prima salvato, poi inviato come nuovo documento. Questo documento resta invariato.',
    sendSaveAndSend: 'Salva e invia',
    sendFailed: 'Impossibile inviare all’altra app',
    sendEmpty: 'Non c’è niente da inviare',
    sendUnreadable: 'Impossibile leggere il contenuto di questo documento',
    sendRedaction: 'Non inviato: impossibile elaborare le parti nascoste all’IA',
    sendTooManySlides: 'Non inviato: il testo produce più di 100 diapositive',
  },
  pl: {
    menuSendToApp: 'Wyślij do innej aplikacji',
    menuSendViaMarkdown: 'Najpierw przejrzyj w Markdown',
    sendSaveFirst: 'Zapisz przed wysłaniem',
    sendSaveFirstDetail:
      'Niezapisane zmiany nie są wysyłane. Dokument zostanie najpierw zapisany, a potem wysłany jako nowy dokument. Ten dokument pozostanie bez zmian.',
    sendSaveAndSend: 'Zapisz i wyślij',
    sendFailed: 'Nie udało się wysłać do innej aplikacji',
    sendEmpty: 'Nie ma nic do wysłania',
    sendUnreadable: 'Nie udało się odczytać zawartości tego dokumentu',
    sendRedaction: 'Nie wysłano: nie udało się przetworzyć części ukrytych przed AI',
    sendTooManySlides: 'Nie wysłano: tekst daje ponad 100 slajdów',
  },
  cs: {
    menuSendToApp: 'Odeslat do jiné aplikace',
    menuSendViaMarkdown: 'Nejprve zkontrolovat v Markdownu',
    sendSaveFirst: 'Uložit před odesláním',
    sendSaveFirstDetail:
      'Neuložené změny se neodesílají. Dokument se nejprve uloží a pak se odešle jako nový dokument. Tento dokument zůstane beze změny.',
    sendSaveAndSend: 'Uložit a odeslat',
    sendFailed: 'Odeslání do jiné aplikace se nezdařilo',
    sendEmpty: 'Není co odeslat',
    sendUnreadable: 'Obsah tohoto dokumentu nelze přečíst',
    sendRedaction: 'Neodesláno: části skryté před AI nelze zpracovat',
    sendTooManySlides: 'Neodesláno: text dává více než 100 snímků',
  },
  nl: {
    menuSendToApp: 'Naar een andere app sturen',
    menuSendViaMarkdown: 'Eerst bekijken in Markdown',
    sendSaveFirst: 'Opslaan voor verzenden',
    sendSaveFirstDetail:
      'Niet-opgeslagen wijzigingen worden niet verzonden. Het document wordt eerst opgeslagen en daarna als nieuw document verzonden. Dit document blijft zoals het is.',
    sendSaveAndSend: 'Opslaan en verzenden',
    sendFailed: 'Verzenden naar de andere app is mislukt',
    sendEmpty: 'Er is niets om te verzenden',
    sendUnreadable: 'De inhoud van dit document kon niet worden gelezen',
    sendRedaction: 'Niet verzonden: de voor AI verborgen delen konden niet worden verwerkt',
    sendTooManySlides: 'Niet verzonden: de tekst levert meer dan 100 dia’s op',
  },
  ms: {
    menuSendToApp: 'Hantar ke aplikasi lain',
    menuSendViaMarkdown: 'Semak dahulu dalam Markdown',
    sendSaveFirst: 'Simpan sebelum menghantar',
    sendSaveFirstDetail:
      'Perubahan yang belum disimpan tidak dihantar. Dokumen disimpan dahulu, kemudian dihantar sebagai dokumen baharu. Dokumen ini kekal seperti asal.',
    sendSaveAndSend: 'Simpan dan Hantar',
    sendFailed: 'Tidak dapat menghantar ke aplikasi lain',
    sendEmpty: 'Tiada apa-apa untuk dihantar',
    sendUnreadable: 'Kandungan dokumen ini tidak dapat dibaca',
    sendRedaction: 'Tidak dihantar: bahagian yang disembunyikan daripada AI tidak dapat diproses',
    sendTooManySlides: 'Tidak dihantar: teks menghasilkan lebih daripada 100 slaid',
  },
  he: {
    menuSendToApp: 'שליחה לאפליקציה אחרת',
    menuSendViaMarkdown: 'סקירה ב-Markdown קודם',
    sendSaveFirst: 'שמירה לפני שליחה',
    sendSaveFirstDetail:
      'שינויים שלא נשמרו אינם נשלחים. המסמך יישמר תחילה ואז יישלח כמסמך חדש. מסמך זה יישאר כפי שהוא.',
    sendSaveAndSend: 'שמירה ושליחה',
    sendFailed: 'לא ניתן לשלוח לאפליקציה האחרת',
    sendEmpty: 'אין מה לשלוח',
    sendUnreadable: 'לא ניתן לקרוא את תוכן המסמך',
    sendRedaction: 'לא נשלח: לא ניתן היה לעבד את החלקים המוסתרים מה-AI',
    sendTooManySlides: 'לא נשלח: הטקסט יוצר יותר מ-100 שקופיות',
  },
  hi: {
    menuSendToApp: 'दूसरे ऐप में भेजें',
    menuSendViaMarkdown: 'पहले Markdown में देखें',
    sendSaveFirst: 'भेजने से पहले सहेजें',
    sendSaveFirstDetail:
      'बिना सहेजे बदलाव नहीं भेजे जाते। दस्तावेज़ पहले सहेजा जाता है, फिर नए दस्तावेज़ के रूप में भेजा जाता है। यह दस्तावेज़ जैसा है वैसा ही रहता है।',
    sendSaveAndSend: 'सहेजें और भेजें',
    sendFailed: 'दूसरे ऐप में नहीं भेजा जा सका',
    sendEmpty: 'भेजने के लिए कुछ नहीं है',
    sendUnreadable: 'इस दस्तावेज़ की सामग्री पढ़ी नहीं जा सकी',
    sendRedaction: 'नहीं भेजा गया: AI से छिपाए गए हिस्से संसाधित नहीं हो सके',
    sendTooManySlides: 'नहीं भेजा गया: पाठ से 100 से अधिक स्लाइड बनती हैं',
  },
  vi: {
    menuSendToApp: 'Gửi sang ứng dụng khác',
    menuSendViaMarkdown: 'Xem và sửa bằng Markdown trước',
    sendSaveFirst: 'Lưu trước khi gửi',
    sendSaveFirstDetail:
      'Các thay đổi chưa lưu sẽ không được gửi. Tài liệu sẽ được lưu trước, rồi gửi thành một tài liệu mới. Tài liệu này giữ nguyên.',
    sendSaveAndSend: 'Lưu và gửi',
    sendFailed: 'Không gửi được sang ứng dụng khác',
    sendEmpty: 'Không có nội dung để gửi',
    sendUnreadable: 'Không đọc được nội dung của tài liệu này',
    sendRedaction: 'Chưa gửi: không xử lý được các phần đã ẩn với AI',
    sendTooManySlides: 'Chưa gửi: nội dung tạo ra hơn 100 trang chiếu',
  },
}

/** 화면 언어의 문구. 모르는 언어는 영어, `zh_TW` 같은 표기도 받는다 */
export function sendLabel(lang: string, key: SendLabelKey): string {
  const tag = lang.trim().toLowerCase().replace('_', '-')
  const table = SEND_LABELS[tag] ?? SEND_LABELS[tag.split('-')[0]!] ?? SEND_LABELS.en!
  return table[key]
}

export { KEYS as SEND_LABEL_KEYS }
