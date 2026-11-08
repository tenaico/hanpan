"""Writes the in-app help topic "hanpan" (한판 시작하기) in the 21 UI languages.

usage: python tools/hanpan-help-topic.py
Every language has the same structure (one title, six sections, the same lists),
which tools/check-help-langs.mjs compares against the English file.
"""
import pathlib

OUT = pathlib.Path(__file__).resolve().parent.parent / 'apps/shell/src/renderer/src/i18n/help/topics'

# (title, intro, [ (heading, kind, [items]) ... ])  kind: 'ol' | 'ul'
T = {}

T['ko'] = ('한판 시작하기', '한판은 마인드맵으로 정리한 생각을 한글 보고서·PPT·워드로 보내 같은 창에서 이어 쓰고, 마인드맵과 문서를 서로 맞춥니다. AI는 이 PC에 깔린 AI를 먼저 씁니다.', [
 ('마인드맵을 문서로 보내기', 'ol', [
  '마인드맵 도구 줄의 **보내기** 단추를 누르고 한글 보고서, PPT, 워드 보고서 가운데 하나를 고릅니다. PPT는 **슬라이드 스타일**에서 스티브 잡스·맥킨지·토스 등 10가지 디자인 가운데 하나를 고를 수 있습니다.',
  '양식(개조식 보고서, 장 보고서, 공문 번호)과 날짜·부서를 정하고, 내용은 **마인드맵에 적은 말 그대로** 또는 **AI가 문장으로 살 붙이기**를 고릅니다.',
  '**보내기**를 누르면 같은 창의 새 탭에 문서가 열립니다. 처음 저장할 때 저장할 곳을 묻습니다.']),
 ('마인드맵과 문서 맞추기', 'ul', [
  '**보내기 › 연결된 문서와 맞추기**를 누르면 마인드맵과 한글 문서에서 바뀐 곳이 나옵니다.',
  '마인드맵에서 고친 것은 문서로, 문서에서 고친 것은 마인드맵으로 갑니다. 양쪽에서 다르게 고친 곳은 마인드맵 쪽, 문서 쪽, 나중에 가운데 고릅니다.',
  '문서에서 쓴 본문 문장은 그대로 지켜집니다. 워드·PPT 문서는 지금은 보내기만 됩니다.']),
 ('한판 양식', 'ul', [
  '홈 화면의 **한판 양식** 카드에서 공문, 보고서, 제안서, 회의록, 기획서 양식 22가지를 한글이나 워드로 엽니다.']),
 ('한판 도구', 'ul', [
  '한글 탭 위쪽 띠의 **한판 도구**에 공문 정돈, 공문 점검, 세대별 톤 바꾸기, 3색 검토 표시, 역관목조분 프롬프트가 있습니다.',
  '문서를 고치는 도구는 결과를 탭에 바로 보여 줍니다. 저장하지 않고 닫으면 원래대로 남습니다.']),
 ('디자인', 'ul', [
  '홈 화면의 **디자인** 카드로 포스터, 카드뉴스, 안내문, 썸네일을 만듭니다.',
  '**문서에 붙여 넣기용 복사**를 누른 뒤 한글·워드·PPT 탭에서 Ctrl+V 하면 그림으로 들어갑니다. PNG와 PDF로도 저장합니다.',
  '마인드맵의 **보내기 › 카드뉴스로 보내기**는 큰 가지마다 카드 한 장을 만듭니다.']),
 ('내 PC AI', 'ul', [
  '처음 시작할 때 Ollama, LM Studio, vLLM 같은 이 PC의 AI를 찾아, AI를 따로 고르지 않았다면 그것을 기본으로 씁니다.',
  '다른 AI로 바꾸려면 **설정 › AI**에서 고릅니다.']),
])

T['en'] = ('Getting started with Hanpan', 'Hanpan sends what you sorted out in a mind map to a Hangul (HWP) report, a slide deck or a Word report in the same window, and keeps the map and the document in step. The AI on this PC comes first.', [
 ('Send a mind map to a document', 'ol', [
  'In the mind map toolbar, press **Send to a document** and pick a HWP report, PowerPoint or a Word report. For PowerPoint, **Slide style** offers ten designs, from Steve Jobs and McKinsey to a startup pitch deck.',
  'Choose the layout (point-form report, report with chapters, official letter numbering), the date and department, and whether to send **exactly what the map says** or **let the AI write the sentences**.',
  'Press **Send**: the document opens in a new tab of the same window. Its first save asks where to keep it.']),
 ('Sync the map and the document', 'ul', [
  'Press **Send to a document › Sync with linked documents** to see what changed in the map and in the HWP document.',
  'Changes made in the map go to the document, and changes made in the document come to the map. Where both sides changed a topic differently, choose the map\'s, the document\'s, or later.',
  'Sentences written in the document are kept. Word and PowerPoint documents can be sent but not synced back yet.']),
 ('Hanpan templates', 'ul', [
  'The **Hanpan templates** card on Home opens 22 templates (official letters, reports, proposals, minutes, plans) as HWP or Word.']),
 ('Hanpan tools', 'ul', [
  '**Hanpan tools** in the strip above a HWP tab tidy and check an official letter, change its tone for a generation, mark a three-colour review and build a structured prompt.',
  'Tools that change the document show the result in the tab right away. Closing without saving leaves the file as it was.']),
 ('Design', 'ul', [
  'The **Design** card on Home makes posters, card news, notices and thumbnails.',
  'Press **Copy to paste in a document**, then Ctrl+V in a HWP, Word or PowerPoint tab to put the page in as a picture. Pages also save as PNG and PDF.',
  '**Send to a document › Send to card news** in a mind map makes one card per main branch.']),
 ('The AI on this PC', 'ul', [
  'At first start Hanpan looks for an AI running on this PC (Ollama, LM Studio, vLLM) and, if you have not chosen an AI, uses it.',
  'To use another AI, choose it in **Settings › AI**.']),
])

T['zh'] = ('Hanpan 入门', 'Hanpan 可以把思维导图整理的内容发送为 Hangul (HWP) 报告、演示文稿或 Word 报告，在同一窗口继续编辑，并让导图与文档保持一致。AI 优先使用本机上的 AI。', [
 ('把思维导图发送到文档', 'ol', [
  '在思维导图工具栏点 **发送到文档**，选择 HWP 报告、PowerPoint 或 Word 报告。',
  '选择版式（要点式报告、分章报告、公文编号）、日期和部门，再选 **按导图原文** 或 **由 AI 扩写成句子**。',
  '点 **发送**，文档会在同一窗口的新标签页中打开。首次保存时会询问保存位置。']),
 ('同步导图与文档', 'ul', [
  '点 **发送到文档 › 与关联文档同步**，可查看导图和 HWP 文档中的变化。',
  '导图中的修改会进入文档，文档中的修改会回到导图。两边改得不同的地方，可选择以导图为准、以文档为准或稍后。',
  '在文档中写的正文会被保留。Word 和 PowerPoint 文档目前只能发送，不能回同步。']),
 ('Hanpan 模板', 'ul', [
  '主页的 **Hanpan 模板** 卡片可用 HWP 或 Word 打开 22 种模板（公文、报告、提案、会议纪要、计划书）。']),
 ('Hanpan 工具', 'ul', [
  'HWP 标签页上方的 **Hanpan 工具** 可整理和检查公文、按年龄层转换语气、标记三色审阅并生成结构化提示词。',
  '修改文档的工具会立即在标签页中显示结果。不保存就关闭，文件保持原样。']),
 ('设计', 'ul', [
  '主页的 **设计** 卡片可制作海报、卡片新闻、通知和缩略图。',
  '点 **复制以粘贴到文档**，然后在 HWP、Word 或 PowerPoint 标签页按 Ctrl+V，即可作为图片插入。也可保存为 PNG 和 PDF。',
  '在思维导图中点 **发送到文档 › 发送为卡片新闻**，每个主分支生成一张卡片。']),
 ('本机 AI', 'ul', [
  '首次启动时，Hanpan 会查找本机运行的 AI（Ollama、LM Studio、vLLM），如果你还没有选择 AI，就使用它。',
  '要换用其他 AI，请在 **设置 › AI** 中选择。']),
])

T['zh-TW'] = ('Hanpan 入門', 'Hanpan 可以把心智圖整理的內容傳送為 Hangul (HWP) 報告、簡報或 Word 報告，在同一視窗繼續編輯，並讓導圖與文件保持一致。AI 優先使用本機上的 AI。', [
 ('把心智圖傳送到文件', 'ol', [
  '在心智圖工具列點 **傳送到文件**，選擇 HWP 報告、PowerPoint 或 Word 報告。',
  '選擇版式（條列式報告、分章報告、公文編號）、日期和部門，再選 **依導圖原文** 或 **由 AI 擴寫成句子**。',
  '點 **傳送**，文件會在同一視窗的新分頁中開啟。第一次儲存時會詢問儲存位置。']),
 ('同步導圖與文件', 'ul', [
  '點 **傳送到文件 › 與連結文件同步**，可查看導圖和 HWP 文件中的變更。',
  '導圖中的修改會進入文件，文件中的修改會回到導圖。兩邊改得不同的地方，可選擇以導圖為準、以文件為準或稍後。',
  '在文件中寫的內文會被保留。Word 和 PowerPoint 文件目前只能傳送，不能回同步。']),
 ('Hanpan 範本', 'ul', [
  '首頁的 **Hanpan 範本** 卡片可用 HWP 或 Word 開啟 22 種範本（公文、報告、提案、會議紀錄、企劃書）。']),
 ('Hanpan 工具', 'ul', [
  'HWP 分頁上方的 **Hanpan 工具** 可整理和檢查公文、依年齡層轉換語氣、標記三色審閱並產生結構化提示詞。',
  '修改文件的工具會立即在分頁中顯示結果。不儲存就關閉，檔案保持原樣。']),
 ('設計', 'ul', [
  '首頁的 **設計** 卡片可製作海報、卡片新聞、通知和縮圖。',
  '點 **複製以貼到文件**，然後在 HWP、Word 或 PowerPoint 分頁按 Ctrl+V，即可作為圖片插入。也可儲存為 PNG 和 PDF。',
  '在心智圖中點 **傳送到文件 › 傳送為卡片新聞**，每個主分支產生一張卡片。']),
 ('本機 AI', 'ul', [
  '第一次啟動時，Hanpan 會尋找本機執行的 AI（Ollama、LM Studio、vLLM），如果你還沒有選擇 AI，就使用它。',
  '要改用其他 AI，請在 **設定 › AI** 中選擇。']),
])

T['ja'] = ('Hanpan をはじめる', 'Hanpan はマインドマップで整理した考えをハングル (HWP) 報告書・スライド・Word 報告書へ送り、同じウィンドウで書き続け、マップと文書を互いに合わせます。AI はこの PC の AI を優先して使います。', [
 ('マインドマップを文書へ送る', 'ol', [
  'マインドマップのツールバーで **文書へ送る** を押し、HWP 報告書・PowerPoint・Word 報告書から選びます。',
  '様式（箇条書き報告書、章立て報告書、公文書の番号）と日付・部署を決め、**マップの言葉そのまま** か **AI に文章を書かせる** を選びます。',
  '**送る** を押すと、同じウィンドウの新しいタブで文書が開きます。最初の保存で保存先を尋ねます。']),
 ('マップと文書を合わせる', 'ul', [
  '**文書へ送る › つながった文書と同期** を押すと、マップと HWP 文書で変わった箇所が表示されます。',
  'マップで直した内容は文書へ、文書で直した内容はマップへ反映されます。両方で違うように直した箇所は、マップの方・文書の方・後で から選びます。',
  '文書で書いた本文はそのまま残ります。Word・PowerPoint 文書は今のところ送ることだけができます。']),
 ('Hanpan テンプレート', 'ul', [
  'ホームの **Hanpan テンプレート** カードから、公文書・報告書・提案書・議事録・企画書の 22 種類のテンプレートを HWP か Word で開けます。']),
 ('Hanpan ツール', 'ul', [
  'HWP タブ上部の **Hanpan ツール** には、公文書の整理とチェック、世代別の口調変更、3色レビュー、プロンプトビルダーがあります。',
  '文書を直すツールは結果をすぐタブに表示します。保存せずに閉じればファイルは元のままです。']),
 ('デザイン', 'ul', [
  'ホームの **デザイン** カードでポスター、カードニュース、お知らせ、サムネイルを作ります。',
  '**文書に貼り付け用にコピー** を押してから HWP・Word・PowerPoint タブで Ctrl+V すると画像として入ります。PNG と PDF でも保存できます。',
  'マインドマップの **文書へ送る › カードニュースへ送る** は、大きな枝ごとにカードを一枚作ります。']),
 ('この PC の AI', 'ul', [
  '初回起動時に Ollama・LM Studio・vLLM などこの PC の AI を探し、AI をまだ選んでいなければそれを使います。',
  ' 別の AI にするには **設定 › AI** で選びます。'.strip()]),
])

def latin(lang, title, intro, h, b):
    return (title, intro, [
        (h[0], 'ol', b[0]), (h[1], 'ul', b[1]), (h[2], 'ul', b[2]), (h[3], 'ul', b[3]), (h[4], 'ul', b[4]), (h[5], 'ul', b[5])])

T['fr'] = latin('fr', 'Bien démarrer avec Hanpan', "Hanpan envoie ce que vous avez organisé dans une carte mentale vers un rapport Hangul (HWP), une présentation ou un rapport Word dans la même fenêtre, et garde la carte et le document en accord. L'IA de ce PC passe en premier.",
 ['Envoyer une carte mentale vers un document', 'Synchroniser la carte et le document', 'Modèles Hanpan', 'Outils Hanpan', 'Design', "L'IA de ce PC"],
 [["Dans la barre d'outils de la carte, appuyez sur **Envoyer vers un document** et choisissez un rapport HWP, PowerPoint ou un rapport Word.",
   "Choisissez la mise en page (rapport à puces, rapport en chapitres, numérotation de lettre officielle), la date et le service, puis **le texte de la carte tel quel** ou **laisser l'IA rédiger les phrases**.",
   "Appuyez sur **Envoyer** : le document s'ouvre dans un nouvel onglet de la même fenêtre. Le premier enregistrement demande où le ranger."],
  ["Appuyez sur **Envoyer vers un document › Synchroniser avec les documents liés** pour voir ce qui a changé dans la carte et dans le document HWP.",
   "Les modifications faites dans la carte vont au document, et celles du document reviennent à la carte. Quand les deux côtés ont modifié un sujet différemment, choisissez la carte, le document ou plus tard.",
   "Les phrases écrites dans le document sont conservées. Les documents Word et PowerPoint peuvent être envoyés mais pas encore resynchronisés."],
  ["La carte **Modèles Hanpan** de l'accueil ouvre 22 modèles (lettres officielles, rapports, propositions, comptes rendus, plans) en HWP ou en Word."],
  ["Les **Outils Hanpan** au-dessus d'un onglet HWP mettent en forme et vérifient une lettre officielle, adaptent le ton à une génération, marquent une relecture en trois couleurs et construisent une invite structurée.",
   "Les outils qui modifient le document montrent le résultat tout de suite dans l'onglet. Fermer sans enregistrer laisse le fichier tel quel."],
  ["La carte **Design** de l'accueil crée affiches, cartes d'actualité, avis et miniatures.",
   "Appuyez sur **Copier pour coller dans un document**, puis Ctrl+V dans un onglet HWP, Word ou PowerPoint pour insérer la page comme image. Les pages s'enregistrent aussi en PNG et PDF.",
   "Dans une carte, **Envoyer vers un document › Envoyer en cartes d'actualité** crée une carte par branche principale."],
  ["Au premier démarrage, Hanpan cherche une IA sur ce PC (Ollama, LM Studio, vLLM) et l'utilise si vous n'avez pas choisi d'IA.",
   "Pour une autre IA, choisissez-la dans **Paramètres › IA**."]])

T['de'] = latin('de', 'Erste Schritte mit Hanpan', 'Hanpan schickt, was Sie in einer Mindmap geordnet haben, als Hangul-Bericht (HWP), Präsentation oder Word-Bericht in dasselbe Fenster und hält Karte und Dokument im Einklang. Die KI auf diesem PC hat Vorrang.',
 ['Eine Mindmap an ein Dokument senden', 'Karte und Dokument abgleichen', 'Hanpan-Vorlagen', 'Hanpan-Werkzeuge', 'Design', 'Die KI auf diesem PC'],
 [['Drücken Sie in der Mindmap-Werkzeugleiste **An ein Dokument senden** und wählen Sie HWP-Bericht, PowerPoint oder Word-Bericht.',
   'Wählen Sie das Layout (Stichpunktbericht, Bericht mit Kapiteln, Nummerierung amtlicher Schreiben), Datum und Abteilung sowie **genau den Text der Karte** oder **die KI die Sätze schreiben lassen**.',
   'Drücken Sie **Senden**: Das Dokument öffnet sich in einem neuen Tab desselben Fensters. Beim ersten Speichern wird nach dem Ort gefragt.'],
  ['Drücken Sie **An ein Dokument senden › Mit verknüpften Dokumenten abgleichen**, um zu sehen, was sich in Karte und HWP-Dokument geändert hat.',
   'Änderungen in der Karte gehen ins Dokument, Änderungen im Dokument kommen in die Karte. Wo beide Seiten ein Thema unterschiedlich geändert haben, wählen Sie Karte, Dokument oder später.',
   'Im Dokument geschriebene Sätze bleiben erhalten. Word- und PowerPoint-Dokumente lassen sich senden, aber noch nicht zurück abgleichen.'],
  ['Die Karte **Hanpan-Vorlagen** auf der Startseite öffnet 22 Vorlagen (amtliche Schreiben, Berichte, Angebote, Protokolle, Pläne) als HWP oder Word.'],
  ['Die **Hanpan-Werkzeuge** über einem HWP-Tab ordnen und prüfen ein amtliches Schreiben, passen den Ton an eine Generation an, markieren eine Dreifarben-Prüfung und bauen einen strukturierten Prompt.',
   'Werkzeuge, die das Dokument ändern, zeigen das Ergebnis sofort im Tab. Schließen ohne Speichern lässt die Datei unverändert.'],
  ['Die Karte **Design** auf der Startseite erstellt Plakate, Karten-News, Aushänge und Vorschaubilder.',
   'Drücken Sie **Zum Einfügen in ein Dokument kopieren** und dann Strg+V in einem HWP-, Word- oder PowerPoint-Tab, um die Seite als Bild einzufügen. Seiten lassen sich auch als PNG und PDF speichern.',
   'In einer Mindmap erstellt **An ein Dokument senden › Als Karten-News senden** eine Karte je Hauptzweig.'],
  ['Beim ersten Start sucht Hanpan eine KI auf diesem PC (Ollama, LM Studio, vLLM) und nutzt sie, wenn Sie noch keine KI gewählt haben.',
   'Eine andere KI wählen Sie unter **Einstellungen › KI**.']])

T['es'] = latin('es', 'Primeros pasos con Hanpan', 'Hanpan envía lo que ordenaste en un mapa mental a un informe Hangul (HWP), una presentación o un informe de Word en la misma ventana, y mantiene el mapa y el documento de acuerdo. La IA de este PC va primero.',
 ['Enviar un mapa mental a un documento', 'Sincronizar el mapa y el documento', 'Plantillas de Hanpan', 'Herramientas de Hanpan', 'Diseño', 'La IA de este PC'],
 [['En la barra del mapa, pulsa **Enviar a un documento** y elige un informe HWP, PowerPoint o un informe de Word.',
   'Elige el formato (informe por puntos, informe con capítulos, numeración de carta oficial), la fecha y el departamento, y si enviar **el texto del mapa tal cual** o **dejar que la IA escriba las frases**.',
   'Pulsa **Enviar**: el documento se abre en una pestaña nueva de la misma ventana. El primer guardado pregunta dónde guardarlo.'],
  ['Pulsa **Enviar a un documento › Sincronizar con documentos vinculados** para ver qué cambió en el mapa y en el documento HWP.',
   'Los cambios hechos en el mapa van al documento y los del documento vuelven al mapa. Si ambos lados cambiaron un tema de forma distinta, elige el del mapa, el del documento o más tarde.',
   'Las frases escritas en el documento se conservan. Los documentos de Word y PowerPoint se pueden enviar, pero aún no se sincronizan de vuelta.'],
  ['La tarjeta **Plantillas de Hanpan** del inicio abre 22 plantillas (cartas oficiales, informes, propuestas, actas, planes) como HWP o Word.'],
  ['Las **Herramientas de Hanpan** sobre una pestaña HWP ordenan y revisan una carta oficial, adaptan el tono a una generación, marcan una revisión en tres colores y crean una instrucción estructurada.',
   'Las herramientas que cambian el documento muestran el resultado al momento en la pestaña. Cerrar sin guardar deja el archivo como estaba.'],
  ['La tarjeta **Diseño** del inicio crea carteles, tarjetas de noticias, avisos y miniaturas.',
   'Pulsa **Copiar para pegar en un documento** y luego Ctrl+V en una pestaña HWP, Word o PowerPoint para insertar la página como imagen. Las páginas también se guardan en PNG y PDF.',
   'En un mapa, **Enviar a un documento › Enviar como tarjetas de noticias** crea una tarjeta por cada rama principal.'],
  ['Al primer inicio, Hanpan busca una IA en este PC (Ollama, LM Studio, vLLM) y la usa si aún no elegiste una IA.',
   'Para usar otra IA, elígela en **Ajustes › IA**.']])

T['it'] = latin('it', 'Per iniziare con Hanpan', 'Hanpan invia ciò che hai organizzato in una mappa mentale a un rapporto Hangul (HWP), una presentazione o un rapporto Word nella stessa finestra, e tiene allineati mappa e documento. L’IA di questo PC viene prima.',
 ['Inviare una mappa mentale a un documento', 'Allineare mappa e documento', 'Modelli Hanpan', 'Strumenti Hanpan', 'Design', 'L’IA di questo PC'],
 [['Nella barra della mappa premi **Invia a un documento** e scegli un rapporto HWP, PowerPoint o un rapporto Word.',
   'Scegli il layout (rapporto a punti, rapporto a capitoli, numerazione da lettera ufficiale), la data e l’ufficio, e se inviare **il testo della mappa così com’è** o **far scrivere le frasi all’IA**.',
   'Premi **Invia**: il documento si apre in una nuova scheda della stessa finestra. Il primo salvataggio chiede dove salvarlo.'],
  ['Premi **Invia a un documento › Sincronizza con i documenti collegati** per vedere cosa è cambiato nella mappa e nel documento HWP.',
   'Le modifiche fatte nella mappa vanno al documento e quelle del documento tornano alla mappa. Se le due parti hanno cambiato un argomento in modo diverso, scegli la mappa, il documento o più tardi.',
   'Le frasi scritte nel documento restano. I documenti Word e PowerPoint si possono inviare ma non ancora risincronizzare.'],
  ['La scheda **Modelli Hanpan** nella Home apre 22 modelli (lettere ufficiali, rapporti, proposte, verbali, piani) come HWP o Word.'],
  ['Gli **Strumenti Hanpan** sopra una scheda HWP sistemano e controllano una lettera ufficiale, adattano il tono a una generazione, segnano una revisione a tre colori e costruiscono un prompt strutturato.',
   'Gli strumenti che cambiano il documento mostrano subito il risultato nella scheda. Chiudere senza salvare lascia il file com’era.'],
  ['La scheda **Design** nella Home crea poster, schede notizie, avvisi e miniature.',
   'Premi **Copia per incollare in un documento**, poi Ctrl+V in una scheda HWP, Word o PowerPoint per inserire la pagina come immagine. Le pagine si salvano anche in PNG e PDF.',
   'In una mappa, **Invia a un documento › Invia come schede notizie** crea una scheda per ogni ramo principale.'],
  ['Al primo avvio Hanpan cerca un’IA su questo PC (Ollama, LM Studio, vLLM) e la usa se non hai ancora scelto un’IA.',
   'Per un’altra IA, sceglila in **Impostazioni › IA**.']])

T['pt'] = latin('pt', 'Primeiros passos com o Hanpan', 'O Hanpan envia o que você organizou num mapa mental para um relatório Hangul (HWP), uma apresentação ou um relatório Word na mesma janela, e mantém o mapa e o documento em sintonia. A IA deste PC vem primeiro.',
 ['Enviar um mapa mental para um documento', 'Sincronizar o mapa e o documento', 'Modelos do Hanpan', 'Ferramentas do Hanpan', 'Design', 'A IA deste PC'],
 [['Na barra do mapa, pressione **Enviar para um documento** e escolha um relatório HWP, PowerPoint ou um relatório Word.',
   'Escolha o layout (relatório em tópicos, relatório com capítulos, numeração de ofício), a data e o setor, e se envia **exatamente o texto do mapa** ou **deixa a IA escrever as frases**.',
   'Pressione **Enviar**: o documento abre numa nova aba da mesma janela. O primeiro salvamento pergunta onde guardá-lo.'],
  ['Pressione **Enviar para um documento › Sincronizar com documentos vinculados** para ver o que mudou no mapa e no documento HWP.',
   'O que mudou no mapa vai para o documento, e o que mudou no documento volta ao mapa. Quando os dois lados mudaram um tópico de forma diferente, escolha o do mapa, o do documento ou depois.',
   'As frases escritas no documento são mantidas. Documentos Word e PowerPoint podem ser enviados, mas ainda não são sincronizados de volta.'],
  ['O cartão **Modelos do Hanpan** no Início abre 22 modelos (ofícios, relatórios, propostas, atas, planos) como HWP ou Word.'],
  ['As **Ferramentas do Hanpan** acima de uma aba HWP arrumam e conferem um ofício, ajustam o tom para uma geração, marcam uma revisão em três cores e montam um prompt estruturado.',
   'As ferramentas que mudam o documento mostram o resultado na aba na hora. Fechar sem salvar deixa o arquivo como estava.'],
  ['O cartão **Design** no Início cria cartazes, cards de notícias, avisos e miniaturas.',
   'Pressione **Copiar para colar num documento** e depois Ctrl+V numa aba HWP, Word ou PowerPoint para inserir a página como imagem. As páginas também são salvas em PNG e PDF.',
   'Num mapa, **Enviar para um documento › Enviar como cards de notícias** cria um card por ramo principal.'],
  ['Na primeira abertura, o Hanpan procura uma IA neste PC (Ollama, LM Studio, vLLM) e a usa se você ainda não escolheu uma IA.',
   'Para usar outra IA, escolha-a em **Configurações › IA**.']])

T['nl'] = latin('nl', 'Aan de slag met Hanpan', 'Hanpan stuurt wat u in een mindmap hebt geordend naar een Hangul-rapport (HWP), een presentatie of een Word-rapport in hetzelfde venster, en houdt kaart en document op één lijn. De AI op deze pc gaat voor.',
 ['Een mindmap naar een document sturen', 'Kaart en document gelijkzetten', 'Hanpan-sjablonen', 'Hanpan-hulpmiddelen', 'Ontwerp', 'De AI op deze pc'],
 [['Druk in de werkbalk van de kaart op **Naar een document sturen** en kies een HWP-rapport, PowerPoint of een Word-rapport.',
   'Kies de opmaak (puntsgewijs rapport, rapport met hoofdstukken, nummering van een officiële brief), de datum en de afdeling, en of u **precies de tekst van de kaart** stuurt of **de AI de zinnen laat schrijven**.',
   'Druk op **Sturen**: het document opent in een nieuw tabblad van hetzelfde venster. Bij de eerste keer opslaan wordt gevraagd waar.'],
  ['Druk op **Naar een document sturen › Gelijkzetten met gekoppelde documenten** om te zien wat er in de kaart en in het HWP-document is veranderd.',
   'Wijzigingen in de kaart gaan naar het document, wijzigingen in het document komen naar de kaart. Waar beide kanten een onderwerp anders hebben gewijzigd, kiest u die van de kaart, die van het document of later.',
   'Zinnen die in het document zijn geschreven, blijven staan. Word- en PowerPoint-documenten kunnen worden verstuurd, maar nog niet terug gelijkgezet.'],
  ['De kaart **Hanpan-sjablonen** op Start opent 22 sjablonen (officiële brieven, rapporten, voorstellen, notulen, plannen) als HWP of Word.'],
  ['De **Hanpan-hulpmiddelen** boven een HWP-tabblad ordenen en controleren een officiële brief, passen de toon aan op een generatie, markeren een driekleurenbeoordeling en bouwen een gestructureerde prompt.',
   'Hulpmiddelen die het document wijzigen, tonen het resultaat meteen in het tabblad. Sluiten zonder opslaan laat het bestand ongewijzigd.'],
  ['De kaart **Ontwerp** op Start maakt posters, nieuwskaarten, mededelingen en miniaturen.',
   'Druk op **Kopiëren om in een document te plakken** en daarna op Ctrl+V in een HWP-, Word- of PowerPoint-tabblad om de pagina als afbeelding in te voegen. Pagina’s worden ook als PNG en PDF opgeslagen.',
   'In een kaart maakt **Naar een document sturen › Als nieuwskaarten sturen** één kaart per hoofdtak.'],
  ['Bij de eerste start zoekt Hanpan een AI op deze pc (Ollama, LM Studio, vLLM) en gebruikt die als u nog geen AI hebt gekozen.',
   'Kies een andere AI via **Instellingen › AI**.']])

T['pl'] = latin('pl', 'Pierwsze kroki z Hanpan', 'Hanpan wysyła to, co uporządkowałeś na mapie myśli, do raportu Hangul (HWP), prezentacji lub raportu Word w tym samym oknie i utrzymuje zgodność mapy z dokumentem. Najpierw używa AI z tego komputera.',
 ['Wysyłanie mapy myśli do dokumentu', 'Uzgadnianie mapy i dokumentu', 'Szablony Hanpan', 'Narzędzia Hanpan', 'Projekt', 'AI na tym komputerze'],
 [['Na pasku narzędzi mapy naciśnij **Wyślij do dokumentu** i wybierz raport HWP, PowerPoint lub raport Word.',
   'Wybierz układ (raport w punktach, raport z rozdziałami, numeracja pisma urzędowego), datę i dział oraz to, czy wysłać **dokładnie tekst z mapy**, czy **pozwolić AI napisać zdania**.',
   'Naciśnij **Wyślij**: dokument otworzy się w nowej karcie tego samego okna. Przy pierwszym zapisie pojawi się pytanie o miejsce.'],
  ['Naciśnij **Wyślij do dokumentu › Uzgodnij z połączonymi dokumentami**, aby zobaczyć, co zmieniło się na mapie i w dokumencie HWP.',
   'Zmiany z mapy trafiają do dokumentu, a zmiany z dokumentu wracają na mapę. Gdy obie strony zmieniły temat inaczej, wybierz wersję mapy, dokumentu albo później.',
   'Zdania napisane w dokumencie zostają. Dokumenty Word i PowerPoint można wysłać, ale jeszcze nie uzgodnić z powrotem.'],
  ['Karta **Szablony Hanpan** na ekranie startowym otwiera 22 szablonów (pisma urzędowe, raporty, oferty, protokoły, plany) jako HWP lub Word.'],
  ['**Narzędzia Hanpan** nad kartą HWP porządkują i sprawdzają pismo urzędowe, dostosowują ton do pokolenia, zaznaczają przegląd w trzech kolorach i budują uporządkowany prompt.',
   'Narzędzia zmieniające dokument od razu pokazują wynik w karcie. Zamknięcie bez zapisu pozostawia plik bez zmian.'],
  ['Karta **Projekt** na ekranie startowym tworzy plakaty, karty informacyjne, ogłoszenia i miniatury.',
   'Naciśnij **Kopiuj do wklejenia w dokumencie**, a potem Ctrl+V w karcie HWP, Word lub PowerPoint, aby wstawić stronę jako obraz. Strony można też zapisać jako PNG i PDF.',
   'Na mapie **Wyślij do dokumentu › Wyślij jako karty informacyjne** tworzy jedną kartę na każdą główną gałąź.'],
  ['Przy pierwszym uruchomieniu Hanpan szuka AI na tym komputerze (Ollama, LM Studio, vLLM) i używa jej, jeśli nie wybrałeś jeszcze AI.',
   'Inną AI wybierzesz w **Ustawienia › AI**.']])

T['cs'] = latin('cs', 'Začínáme s Hanpan', 'Hanpan pošle to, co jste uspořádali v myšlenkové mapě, do zprávy Hangul (HWP), prezentace nebo zprávy Word ve stejném okně a udržuje mapu a dokument v souladu. Přednost má AI na tomto počítači.',
 ['Odeslání myšlenkové mapy do dokumentu', 'Sladění mapy a dokumentu', 'Šablony Hanpan', 'Nástroje Hanpan', 'Návrh', 'AI na tomto počítači'],
 [['Na panelu nástrojů mapy stiskněte **Odeslat do dokumentu** a vyberte zprávu HWP, PowerPoint nebo zprávu Word.',
   'Vyberte rozvržení (zpráva v bodech, zpráva s kapitolami, číslování úředního dopisu), datum a oddělení a zda poslat **přesně text mapy**, nebo **nechat věty napsat AI**.',
   'Stiskněte **Odeslat**: dokument se otevře na nové kartě stejného okna. Při prvním uložení se zeptá, kam jej uložit.'],
  ['Stiskněte **Odeslat do dokumentu › Sladit s propojenými dokumenty** a uvidíte, co se změnilo v mapě a v dokumentu HWP.',
   'Změny v mapě jdou do dokumentu, změny v dokumentu se vrací do mapy. Kde obě strany změnily téma jinak, vyberte verzi mapy, dokumentu nebo později.',
   'Věty napsané v dokumentu zůstanou. Dokumenty Word a PowerPoint lze odeslat, ale zatím ne sladit zpět.'],
  ['Karta **Šablony Hanpan** na úvodní obrazovce otevře 22 šablon (úřední dopisy, zprávy, návrhy, zápisy, plány) jako HWP nebo Word.'],
  ['**Nástroje Hanpan** nad kartou HWP upraví a zkontrolují úřední dopis, přizpůsobí tón generaci, vyznačí tříbarevnou kontrolu a sestaví strukturovaný prompt.',
   'Nástroje, které mění dokument, ukážou výsledek hned na kartě. Zavření bez uložení nechá soubor beze změny.'],
  ['Karta **Návrh** na úvodní obrazovce vytváří plakáty, karty se zprávami, oznámení a náhledy.',
   'Stiskněte **Kopírovat pro vložení do dokumentu** a pak Ctrl+V na kartě HWP, Word nebo PowerPoint, čímž stránku vložíte jako obrázek. Stránky lze uložit i jako PNG a PDF.',
   'V mapě **Odeslat do dokumentu › Odeslat jako karty se zprávami** vytvoří jednu kartu na každou hlavní větev.'],
  ['Při prvním spuštění Hanpan hledá AI na tomto počítači (Ollama, LM Studio, vLLM) a použije ji, pokud jste ještě žádnou AI nevybrali.',
   'Jinou AI vyberete v **Nastavení › AI**.']])

T['id'] = latin('id', 'Memulai Hanpan', 'Hanpan mengirim apa yang Anda susun di peta pikiran ke laporan Hangul (HWP), presentasi, atau laporan Word di jendela yang sama, dan menjaga peta serta dokumen tetap selaras. AI di PC ini didahulukan.',
 ['Mengirim peta pikiran ke dokumen', 'Menyelaraskan peta dan dokumen', 'Templat Hanpan', 'Alat Hanpan', 'Desain', 'AI di PC ini'],
 [['Di bilah alat peta, tekan **Kirim ke dokumen** lalu pilih laporan HWP, PowerPoint, atau laporan Word.',
   'Pilih tata letak (laporan poin, laporan berbab, penomoran surat resmi), tanggal dan bagian, serta apakah mengirim **persis teks di peta** atau **membiarkan AI menulis kalimat**.',
   'Tekan **Kirim**: dokumen terbuka di tab baru pada jendela yang sama. Penyimpanan pertama menanyakan lokasinya.'],
  ['Tekan **Kirim ke dokumen › Selaraskan dengan dokumen tertaut** untuk melihat apa yang berubah di peta dan di dokumen HWP.',
   'Perubahan di peta masuk ke dokumen, dan perubahan di dokumen kembali ke peta. Bila kedua sisi mengubah topik secara berbeda, pilih versi peta, versi dokumen, atau nanti.',
   'Kalimat yang ditulis di dokumen tetap ada. Dokumen Word dan PowerPoint bisa dikirim tetapi belum bisa diselaraskan kembali.'],
  ['Kartu **Templat Hanpan** di Beranda membuka 22 templat (surat resmi, laporan, proposal, notulen, rencana) sebagai HWP atau Word.'],
  ['**Alat Hanpan** di atas tab HWP merapikan dan memeriksa surat resmi, menyesuaikan nada untuk suatu generasi, menandai tinjauan tiga warna, dan menyusun prompt terstruktur.',
   'Alat yang mengubah dokumen langsung menampilkan hasilnya di tab. Menutup tanpa menyimpan membiarkan berkas seperti semula.'],
  ['Kartu **Desain** di Beranda membuat poster, kartu berita, pengumuman, dan gambar mini.',
   'Tekan **Salin untuk ditempel di dokumen**, lalu Ctrl+V di tab HWP, Word, atau PowerPoint untuk menyisipkan halaman sebagai gambar. Halaman juga bisa disimpan sebagai PNG dan PDF.',
   'Di peta, **Kirim ke dokumen › Kirim sebagai kartu berita** membuat satu kartu untuk tiap cabang utama.'],
  ['Saat pertama dibuka, Hanpan mencari AI di PC ini (Ollama, LM Studio, vLLM) dan memakainya bila Anda belum memilih AI.',
   'Untuk AI lain, pilih di **Pengaturan › AI**.']])

T['ms'] = latin('ms', 'Bermula dengan Hanpan', 'Hanpan menghantar apa yang anda susun dalam peta minda ke laporan Hangul (HWP), persembahan atau laporan Word dalam tetingkap yang sama, dan memastikan peta serta dokumen kekal sepadan. AI pada PC ini diutamakan.',
 ['Menghantar peta minda ke dokumen', 'Menyelaraskan peta dan dokumen', 'Templat Hanpan', 'Alat Hanpan', 'Reka bentuk', 'AI pada PC ini'],
 [['Dalam bar alat peta, tekan **Hantar ke dokumen** dan pilih laporan HWP, PowerPoint atau laporan Word.',
   'Pilih susun atur (laporan berpoin, laporan berbab, penomboran surat rasmi), tarikh dan bahagian, serta sama ada menghantar **teks peta seadanya** atau **membiarkan AI menulis ayat**.',
   'Tekan **Hantar**: dokumen dibuka dalam tab baharu tetingkap yang sama. Simpanan pertama bertanya di mana hendak menyimpannya.'],
  ['Tekan **Hantar ke dokumen › Selaraskan dengan dokumen berpaut** untuk melihat apa yang berubah dalam peta dan dokumen HWP.',
   'Perubahan dalam peta pergi ke dokumen, dan perubahan dalam dokumen kembali ke peta. Jika kedua-dua pihak mengubah topik secara berbeza, pilih versi peta, versi dokumen atau kemudian.',
   'Ayat yang ditulis dalam dokumen dikekalkan. Dokumen Word dan PowerPoint boleh dihantar tetapi belum boleh diselaraskan semula.'],
  ['Kad **Templat Hanpan** di Laman Utama membuka 22 templat (surat rasmi, laporan, cadangan, minit, rancangan) sebagai HWP atau Word.'],
  ['**Alat Hanpan** di atas tab HWP mengemas dan menyemak surat rasmi, menyesuaikan nada untuk sesuatu generasi, menandakan semakan tiga warna dan membina gesaan berstruktur.',
   'Alat yang mengubah dokumen terus menunjukkan hasil dalam tab. Menutup tanpa menyimpan membiarkan fail seperti asal.'],
  ['Kad **Reka bentuk** di Laman Utama membuat poster, kad berita, notis dan gambar kecil.',
   'Tekan **Salin untuk ditampal dalam dokumen**, kemudian Ctrl+V dalam tab HWP, Word atau PowerPoint untuk memasukkan halaman sebagai gambar. Halaman juga boleh disimpan sebagai PNG dan PDF.',
   'Dalam peta, **Hantar ke dokumen › Hantar sebagai kad berita** membuat satu kad bagi setiap cabang utama.'],
  ['Pada permulaan pertama, Hanpan mencari AI pada PC ini (Ollama, LM Studio, vLLM) dan menggunakannya jika anda belum memilih AI.',
   'Untuk AI lain, pilih dalam **Tetapan › AI**.']])

T['vi'] = latin('vi', 'Bắt đầu với Hanpan', 'Hanpan gửi những gì bạn sắp xếp trong sơ đồ tư duy thành báo cáo Hangul (HWP), bản trình chiếu hoặc báo cáo Word trong cùng cửa sổ, và giữ sơ đồ với tài liệu khớp nhau. AI trên máy tính này được ưu tiên.',
 ['Gửi sơ đồ tư duy sang tài liệu', 'Đồng bộ sơ đồ và tài liệu', 'Mẫu Hanpan', 'Công cụ Hanpan', 'Thiết kế', 'AI trên máy tính này'],
 [['Trên thanh công cụ của sơ đồ, nhấn **Gửi sang tài liệu** rồi chọn báo cáo HWP, PowerPoint hoặc báo cáo Word.',
   'Chọn bố cục (báo cáo gạch đầu dòng, báo cáo có chương, đánh số công văn), ngày và bộ phận, rồi chọn gửi **đúng chữ trong sơ đồ** hay **để AI viết câu**.',
   'Nhấn **Gửi**: tài liệu mở trong một thẻ mới của cùng cửa sổ. Lần lưu đầu tiên sẽ hỏi nơi lưu.'],
  ['Nhấn **Gửi sang tài liệu › Đồng bộ với tài liệu liên kết** để xem những gì đã thay đổi trong sơ đồ và tài liệu HWP.',
   'Thay đổi trong sơ đồ đi sang tài liệu, thay đổi trong tài liệu quay về sơ đồ. Khi hai bên sửa một chủ đề khác nhau, hãy chọn bản của sơ đồ, của tài liệu hoặc để sau.',
   'Các câu đã viết trong tài liệu được giữ nguyên. Tài liệu Word và PowerPoint gửi được nhưng chưa đồng bộ ngược lại.'],
  ['Thẻ **Mẫu Hanpan** ở Trang chủ mở 22 mẫu (công văn, báo cáo, đề xuất, biên bản, kế hoạch) dạng HWP hoặc Word.'],
  ['**Công cụ Hanpan** phía trên thẻ HWP chỉnh và kiểm tra công văn, đổi giọng văn theo thế hệ, đánh dấu rà soát ba màu và dựng lời nhắc có cấu trúc.',
   'Công cụ thay đổi tài liệu hiển thị kết quả ngay trong thẻ. Đóng mà không lưu thì tệp vẫn như cũ.'],
  ['Thẻ **Thiết kế** ở Trang chủ tạo áp phích, thẻ tin, thông báo và ảnh thu nhỏ.',
   'Nhấn **Sao chép để dán vào tài liệu**, rồi Ctrl+V trong thẻ HWP, Word hoặc PowerPoint để chèn trang dưới dạng ảnh. Trang cũng lưu được dạng PNG và PDF.',
   'Trong sơ đồ, **Gửi sang tài liệu › Gửi thành thẻ tin** tạo một thẻ cho mỗi nhánh chính.'],
  ['Lần khởi động đầu, Hanpan tìm AI trên máy tính này (Ollama, LM Studio, vLLM) và dùng nó nếu bạn chưa chọn AI.',
   'Để dùng AI khác, chọn trong **Cài đặt › AI**.']])

T['ru'] = latin('ru', 'Начало работы с Hanpan', 'Hanpan отправляет то, что вы упорядочили в интеллект-карте, в отчёт Hangul (HWP), презентацию или отчёт Word в том же окне и поддерживает согласие карты и документа. Сначала используется ИИ на этом компьютере.',
 ['Отправка интеллект-карты в документ', 'Синхронизация карты и документа', 'Шаблоны Hanpan', 'Инструменты Hanpan', 'Дизайн', 'ИИ на этом компьютере'],
 [['На панели инструментов карты нажмите **Отправить в документ** и выберите отчёт HWP, PowerPoint или отчёт Word.',
   'Выберите макет (отчёт по пунктам, отчёт с главами, нумерация служебного письма), дату и отдел, а также отправить **текст карты как есть** или **поручить ИИ написать предложения**.',
   'Нажмите **Отправить**: документ откроется в новой вкладке того же окна. При первом сохранении будет спрошено, куда сохранить.'],
  ['Нажмите **Отправить в документ › Синхронизировать со связанными документами**, чтобы увидеть изменения в карте и в документе HWP.',
   'Изменения в карте переходят в документ, изменения в документе возвращаются в карту. Если обе стороны изменили тему по-разному, выберите вариант карты, документа или «позже».',
   'Предложения, написанные в документе, сохраняются. Документы Word и PowerPoint можно отправить, но пока нельзя синхронизировать обратно.'],
  ['Карточка **Шаблоны Hanpan** на главной открывает 22 шаблонов (служебные письма, отчёты, предложения, протоколы, планы) в HWP или Word.'],
  ['**Инструменты Hanpan** над вкладкой HWP приводят в порядок и проверяют служебное письмо, меняют тон для поколения, отмечают трёхцветную проверку и собирают структурированный запрос.',
   'Инструменты, меняющие документ, сразу показывают результат во вкладке. Если закрыть без сохранения, файл останется прежним.'],
  ['Карточка **Дизайн** на главной создаёт плакаты, карточки новостей, объявления и обложки.',
   'Нажмите **Копировать для вставки в документ**, затем Ctrl+V во вкладке HWP, Word или PowerPoint, чтобы вставить страницу как картинку. Страницы также сохраняются в PNG и PDF.',
   'В карте **Отправить в документ › Отправить в карточки** создаёт по карточке на каждую главную ветвь.'],
  ['При первом запуске Hanpan ищет ИИ на этом компьютере (Ollama, LM Studio, vLLM) и использует его, если вы ещё не выбрали ИИ.',
   'Чтобы выбрать другой ИИ, откройте **Настройки › ИИ**.']])

T['ar'] = latin('ar', 'البدء مع Hanpan', 'يرسل Hanpan ما رتّبته في خريطة ذهنية إلى تقرير Hangul ‏(HWP) أو عرض تقديمي أو تقرير Word في النافذة نفسها، ويُبقي الخريطة والمستند متوافقين. يُستخدم الذكاء الاصطناعي الموجود على هذا الحاسوب أولًا.',
 ['إرسال خريطة ذهنية إلى مستند', 'مزامنة الخريطة والمستند', 'قوالب Hanpan', 'أدوات Hanpan', 'التصميم', 'الذكاء الاصطناعي على هذا الحاسوب'],
 [['في شريط أدوات الخريطة اضغط **إرسال إلى مستند** واختر تقرير HWP أو PowerPoint أو تقرير Word.',
   'اختر التخطيط (تقرير بنقاط، تقرير بفصول، ترقيم خطاب رسمي) والتاريخ والقسم، وهل ترسل **نص الخريطة كما هو** أم **تدع الذكاء الاصطناعي يكتب الجمل**.',
   'اضغط **إرسال**: يُفتح المستند في علامة تبويب جديدة في النافذة نفسها. يسأل الحفظ الأول عن مكان الحفظ.'],
  ['اضغط **إرسال إلى مستند › مزامنة مع المستندات المرتبطة** لترى ما تغيّر في الخريطة وفي مستند HWP.',
   'تنتقل تغييرات الخريطة إلى المستند وتعود تغييرات المستند إلى الخريطة. حيث غيّر الطرفان موضوعًا بشكل مختلف، اختر نسخة الخريطة أو المستند أو لاحقًا.',
   'تبقى الجمل المكتوبة في المستند. يمكن إرسال مستندات Word وPowerPoint لكن لا تُزامن عكسيًا بعد.'],
  ['تفتح بطاقة **قوالب Hanpan** في الصفحة الرئيسية 22 قالبًا (خطابات رسمية، تقارير، عروض، محاضر، خطط) بصيغة HWP أو Word.'],
  ['تنظّم **أدوات Hanpan** فوق تبويب HWP الخطاب الرسمي وتفحصه، وتغيّر النبرة لجيل معيّن، وتعلّم مراجعة بثلاثة ألوان، وتبني موجّهًا منظّمًا.',
   'الأدوات التي تغيّر المستند تعرض النتيجة في التبويب فورًا. الإغلاق دون حفظ يترك الملف كما كان.'],
  ['تصنع بطاقة **التصميم** في الصفحة الرئيسية ملصقات وبطاقات أخبار وإعلانات وصورًا مصغّرة.',
   'اضغط **نسخ للصق في مستند** ثم Ctrl+V في تبويب HWP أو Word أو PowerPoint لإدراج الصفحة كصورة. وتُحفظ الصفحات أيضًا بصيغة PNG وPDF.',
   'في الخريطة، ينشئ **إرسال إلى مستند › إرسال إلى بطاقات أخبار** بطاقة لكل فرع رئيسي.'],
  ['عند أول تشغيل يبحث Hanpan عن ذكاء اصطناعي على هذا الحاسوب (Ollama وLM Studio وvLLM) ويستخدمه إن لم تكن اخترت ذكاءً اصطناعيًا.',
   'لاستخدام ذكاء اصطناعي آخر، اختره من **الإعدادات › الذكاء الاصطناعي**.']])

T['he'] = latin('he', 'צעדים ראשונים עם Hanpan', 'Hanpan שולח את מה שסידרתם במפת חשיבה לדוח Hangul ‏(HWP), למצגת או לדוח Word באותו חלון, ושומר על התאמה בין המפה למסמך. ה-AI שבמחשב הזה קודם.',
 ['שליחת מפת חשיבה למסמך', 'סנכרון המפה והמסמך', 'תבניות Hanpan', 'כלי Hanpan', 'עיצוב', 'ה-AI שבמחשב הזה'],
 [['בסרגל הכלים של המפה לחצו **שליחה למסמך** ובחרו דוח HWP,‏ PowerPoint או דוח Word.',
   'בחרו פריסה (דוח בנקודות, דוח עם פרקים, מספור מכתב רשמי), תאריך ומחלקה, והאם לשלוח **בדיוק את הטקסט שבמפה** או **לתת ל-AI לכתוב את המשפטים**.',
   'לחצו **שליחה**: המסמך נפתח בכרטיסייה חדשה באותו חלון. בשמירה הראשונה תישאלו היכן לשמור.'],
  ['לחצו **שליחה למסמך › סנכרון עם מסמכים מקושרים** כדי לראות מה השתנה במפה ובמסמך ה-HWP.',
   'שינויים במפה עוברים למסמך, ושינויים במסמך חוזרים למפה. כששני הצדדים שינו נושא באופן שונה, בחרו את גרסת המפה, את גרסת המסמך או אחר כך.',
   'משפטים שנכתבו במסמך נשמרים. מסמכי Word ו-PowerPoint אפשר לשלוח, אך עדיין לא לסנכרן בחזרה.'],
  ['הכרטיס **תבניות Hanpan** במסך הבית פותח 22 תבניות (מכתבים רשמיים, דוחות, הצעות, פרוטוקולים, תוכניות) כ-HWP או כ-Word.'],
  ['**כלי Hanpan** מעל כרטיסיית HWP מסדרים ובודקים מכתב רשמי, מתאימים את הטון לדור, מסמנים בדיקה בשלושה צבעים ובונים הנחיה מובנית.',
   'כלים שמשנים את המסמך מציגים את התוצאה בכרטיסייה מיד. סגירה בלי שמירה משאירה את הקובץ כפי שהיה.'],
  ['הכרטיס **עיצוב** במסך הבית יוצר פוסטרים, כרטיסי חדשות, הודעות ותמונות ממוזערות.',
   'לחצו **העתקה להדבקה במסמך**, ואז Ctrl+V בכרטיסיית HWP,‏ Word או PowerPoint כדי להכניס את העמוד כתמונה. אפשר גם לשמור עמודים כ-PNG וכ-PDF.',
   'במפה, **שליחה למסמך › שליחה לכרטיסי חדשות** יוצרת כרטיס לכל ענף ראשי.'],
  ['בהפעלה הראשונה Hanpan מחפש AI במחשב הזה (Ollama,‏ LM Studio,‏ vLLM) ומשתמש בו אם עוד לא בחרתם AI.',
   'כדי להשתמש ב-AI אחר, בחרו אותו ב**הגדרות › AI**.']])

T['hi'] = latin('hi', 'Hanpan से शुरुआत', 'Hanpan माइंड मैप में आपने जो व्यवस्थित किया उसे उसी विंडो में Hangul (HWP) रिपोर्ट, प्रस्तुति या Word रिपोर्ट में भेजता है, और मानचित्र व दस्तावेज़ को मेल में रखता है। पहले इस पीसी का AI इस्तेमाल होता है।',
 ['माइंड मैप को दस्तावेज़ में भेजना', 'मानचित्र और दस्तावेज़ का मिलान', 'Hanpan टेम्पलेट', 'Hanpan टूल', 'डिज़ाइन', 'इस पीसी का AI'],
 [['मानचित्र के टूलबार में **दस्तावेज़ में भेजें** दबाएँ और HWP रिपोर्ट, PowerPoint या Word रिपोर्ट चुनें।',
   'लेआउट (बिंदुवार रिपोर्ट, अध्यायों वाली रिपोर्ट, आधिकारिक पत्र क्रमांकन), तारीख और विभाग चुनें, और तय करें कि **मानचित्र में लिखा जैसा ही** भेजें या **AI से वाक्य लिखवाएँ**।',
   '**भेजें** दबाएँ: दस्तावेज़ उसी विंडो के नए टैब में खुलता है। पहली बार सहेजते समय जगह पूछी जाती है।'],
  ['**दस्तावेज़ में भेजें › जुड़े दस्तावेज़ों से मिलान करें** दबाकर देखें कि मानचित्र और HWP दस्तावेज़ में क्या बदला।',
   'मानचित्र के बदलाव दस्तावेज़ में जाते हैं और दस्तावेज़ के बदलाव मानचित्र में लौटते हैं। जहाँ दोनों ओर किसी विषय को अलग-अलग बदला गया हो, मानचित्र वाला, दस्तावेज़ वाला या बाद में चुनें।',
   'दस्तावेज़ में लिखे वाक्य बने रहते हैं। Word और PowerPoint दस्तावेज़ भेजे जा सकते हैं, पर अभी वापस मिलाए नहीं जाते।'],
  ['होम पर **Hanpan टेम्पलेट** कार्ड 22 टेम्पलेट (आधिकारिक पत्र, रिपोर्ट, प्रस्ताव, कार्यवृत्त, योजनाएँ) HWP या Word में खोलता है।'],
  ['HWP टैब के ऊपर **Hanpan टूल** आधिकारिक पत्र को सुधारते और जाँचते हैं, किसी पीढ़ी के लिए लहजा बदलते हैं, तीन-रंग समीक्षा चिह्नित करते हैं और संरचित प्रॉम्प्ट बनाते हैं।',
   'दस्तावेज़ बदलने वाले टूल परिणाम तुरंत टैब में दिखाते हैं। बिना सहेजे बंद करने पर फ़ाइल पहले जैसी रहती है।'],
  ['होम पर **डिज़ाइन** कार्ड पोस्टर, कार्ड न्यूज़, सूचनाएँ और थंबनेल बनाता है।',
   '**दस्तावेज़ में चिपकाने के लिए कॉपी करें** दबाएँ, फिर HWP, Word या PowerPoint टैब में Ctrl+V दबाकर पेज को चित्र के रूप में डालें। पेज PNG और PDF में भी सहेजे जा सकते हैं।',
   'मानचित्र में **दस्तावेज़ में भेजें › कार्ड न्यूज़ में भेजें** हर मुख्य शाखा के लिए एक कार्ड बनाता है।'],
  ['पहली बार शुरू होने पर Hanpan इस पीसी पर चल रहा AI (Ollama, LM Studio, vLLM) खोजता है और यदि आपने कोई AI नहीं चुना है तो उसका उपयोग करता है।',
   'दूसरा AI चुनने के लिए **सेटिंग्स › AI** खोलें।']])

T['th'] = latin('th', 'เริ่มต้นใช้ Hanpan', 'Hanpan ส่งสิ่งที่คุณจัดไว้ในแผนที่ความคิดไปเป็นรายงาน Hangul (HWP) งานนำเสนอ หรือรายงาน Word ในหน้าต่างเดียวกัน และทำให้แผนที่กับเอกสารตรงกันเสมอ โดยใช้ AI บนพีซีเครื่องนี้ก่อน',
 ['ส่งแผนที่ความคิดไปเป็นเอกสาร', 'ซิงค์แผนที่กับเอกสาร', 'เทมเพลต Hanpan', 'เครื่องมือ Hanpan', 'ออกแบบ', 'AI บนพีซีเครื่องนี้'],
 [['ในแถบเครื่องมือของแผนที่ กด **ส่งไปยังเอกสาร** แล้วเลือกรายงาน HWP, PowerPoint หรือรายงาน Word',
   'เลือกรูปแบบ (รายงานแบบหัวข้อ รายงานแบ่งบท เลขลำดับหนังสือราชการ) วันที่และหน่วยงาน แล้วเลือกส่ง **ตามข้อความในแผนที่** หรือ **ให้ AI เขียนเป็นประโยค**',
   'กด **ส่ง** เอกสารจะเปิดในแท็บใหม่ของหน้าต่างเดียวกัน การบันทึกครั้งแรกจะถามที่จัดเก็บ'],
  ['กด **ส่งไปยังเอกสาร › ซิงค์กับเอกสารที่เชื่อมไว้** เพื่อดูว่าอะไรเปลี่ยนในแผนที่และในเอกสาร HWP',
   'สิ่งที่แก้ในแผนที่จะไปที่เอกสาร และสิ่งที่แก้ในเอกสารจะกลับมาที่แผนที่ ส่วนที่แก้ต่างกันทั้งสองฝั่งให้เลือกตามแผนที่ ตามเอกสาร หรือภายหลัง',
   'ประโยคที่เขียนในเอกสารจะคงอยู่ เอกสาร Word และ PowerPoint ส่งได้แต่ยังซิงค์กลับไม่ได้'],
  ['การ์ด **เทมเพลต Hanpan** ในหน้าแรกเปิดเทมเพลต 22 แบบ (หนังสือราชการ รายงาน ข้อเสนอ บันทึกการประชุม แผนงาน) เป็น HWP หรือ Word'],
  ['**เครื่องมือ Hanpan** เหนือแท็บ HWP ช่วยจัดและตรวจหนังสือราชการ เปลี่ยนน้ำเสียงตามรุ่นวัย ทำเครื่องหมายการตรวจสามสี และสร้างพรอมต์แบบมีโครงสร้าง',
   'เครื่องมือที่แก้เอกสารจะแสดงผลในแท็บทันที หากปิดโดยไม่บันทึก ไฟล์จะคงเดิม'],
  ['การ์ด **ออกแบบ** ในหน้าแรกใช้สร้างโปสเตอร์ การ์ดข่าว ประกาศ และภาพปก',
   'กด **คัดลอกเพื่อวางในเอกสาร** แล้วกด Ctrl+V ในแท็บ HWP, Word หรือ PowerPoint เพื่อใส่หน้าเป็นรูปภาพ หน้ายังบันทึกเป็น PNG และ PDF ได้ด้วย',
   'ในแผนที่ **ส่งไปยังเอกสาร › ส่งเป็นการ์ดข่าว** จะสร้างการ์ดหนึ่งใบต่อกิ่งหลักหนึ่งกิ่ง'],
  ['เมื่อเปิดครั้งแรก Hanpan จะค้นหา AI บนพีซีเครื่องนี้ (Ollama, LM Studio, vLLM) และใช้งาน หากคุณยังไม่ได้เลือก AI',
   'หากต้องการ AI อื่น ให้เลือกใน **การตั้งค่า › AI**']])

# the Markdown converter, one line under the templates (languages without their own
# Home strings show the card and button in English, so the help names them so too)
CONVERTER = {
 'ko': '홈 화면의 **마크다운 변환기** 카드에 마크다운을 붙여 넣거나 .md 파일을 열고 **한 번에 변환**을 누르면, 고른 형식(HWP, HWPX, 워드, ODT, PDF, HTML)이 한 폴더에 함께 만들어집니다.',
 'en': 'In the **Markdown converter** card on Home, paste Markdown or open a .md file and press **Convert all**: every format you ticked (HWP, HWPX, Word, ODT, PDF, HTML) is made side by side in one folder.',
 'zh': '在主页的 **Markdown 转换器** 卡片中粘贴 Markdown 或打开 .md 文件，按 **一键转换**，所选格式（HWP、HWPX、Word、ODT、PDF、HTML）会一起生成在同一个文件夹里。',
 'zh-TW': '在首頁的 **Markdown 轉換器** 卡片中貼上 Markdown 或開啟 .md 檔案，按 **一鍵轉換**，所選格式（HWP、HWPX、Word、ODT、PDF、HTML）會一起產生在同一個資料夾裡。',
 'ja': 'ホームの **Markdown 変換ツール** カードに Markdown を貼り付けるか .md ファイルを開き、**まとめて変換** を押すと、選んだ形式（HWP・HWPX・Word・ODT・PDF・HTML）が一つのフォルダーにまとめて作られます。',
 'fr': "Dans la carte **Markdown converter** de l'accueil, collez du Markdown ou ouvrez un fichier .md, puis appuyez sur **Convert all** : chaque format coché (HWP, HWPX, Word, ODT, PDF, HTML) est créé dans un même dossier.",
 'de': 'Fügen Sie in der Karte **Markdown converter** auf der Startseite Markdown ein oder öffnen Sie eine .md-Datei und drücken Sie **Convert all**: Jedes gewählte Format (HWP, HWPX, Word, ODT, PDF, HTML) entsteht nebeneinander in einem Ordner.',
 'es': 'En la tarjeta **Markdown converter** del inicio, pega Markdown o abre un archivo .md y pulsa **Convert all**: cada formato marcado (HWP, HWPX, Word, ODT, PDF, HTML) se crea en una misma carpeta.',
 'it': 'Nella scheda **Markdown converter** della Home incolla del Markdown o apri un file .md e premi **Convert all**: ogni formato scelto (HWP, HWPX, Word, ODT, PDF, HTML) viene creato nella stessa cartella.',
 'pt': 'No cartão **Markdown converter** do início, cole Markdown ou abra um arquivo .md e toque em **Convert all**: cada formato marcado (HWP, HWPX, Word, ODT, PDF, HTML) é criado na mesma pasta.',
 'nl': 'Plak in de kaart **Markdown converter** op de startpagina Markdown of open een .md-bestand en druk op **Convert all**: elk aangevinkt formaat (HWP, HWPX, Word, ODT, PDF, HTML) komt naast elkaar in één map.',
 'pl': 'Na karcie **Markdown converter** na stronie głównej wklej Markdown lub otwórz plik .md i naciśnij **Convert all**: każdy zaznaczony format (HWP, HWPX, Word, ODT, PDF, HTML) powstaje w jednym folderze.',
 'cs': 'Na kartě **Markdown converter** na úvodní stránce vložte Markdown nebo otevřete soubor .md a stiskněte **Convert all**: každý zaškrtnutý formát (HWP, HWPX, Word, ODT, PDF, HTML) vznikne v jedné složce.',
 'id': 'Di kartu **Markdown converter** pada Beranda, tempel Markdown atau buka berkas .md lalu tekan **Convert all**: setiap format yang dicentang (HWP, HWPX, Word, ODT, PDF, HTML) dibuat berdampingan dalam satu folder.',
 'ms': 'Dalam kad **Markdown converter** di Laman Utama, tampal Markdown atau buka fail .md dan tekan **Convert all**: setiap format yang ditanda (HWP, HWPX, Word, ODT, PDF, HTML) dibuat bersebelahan dalam satu folder.',
 'vi': 'Trong thẻ **Markdown converter** ở Trang chủ, dán Markdown hoặc mở tệp .md rồi nhấn **Convert all**: mọi định dạng đã chọn (HWP, HWPX, Word, ODT, PDF, HTML) được tạo cùng trong một thư mục.',
 'ru': 'В карточке **Конвертер Markdown** на главной вставьте Markdown или откройте файл .md и нажмите **Преобразовать всё**: все отмеченные форматы (HWP, HWPX, Word, ODT, PDF, HTML) появятся рядом в одной папке.',
 'ar': 'في بطاقة **محوّل Markdown** في الصفحة الرئيسية، الصق Markdown أو افتح ملف ‎.md ثم اضغط **تحويل الكل**: تُنشأ كل الصيغ المختارة (HWP وHWPX وWord وODT وPDF وHTML) معًا في مجلد واحد.',
 'he': 'בכרטיס **ממיר Markdown** במסך הבית הדביקו Markdown או פתחו קובץ ‎.md ולחצו **המר הכול**: כל הפורמטים שסימנתם (HWP, HWPX, Word, ODT, PDF, HTML) נוצרים יחד בתיקייה אחת.',
 'hi': 'होम पर **Markdown कनवर्टर** कार्ड में Markdown चिपकाएँ या .md फ़ाइल खोलें और **सब बदलें** दबाएँ: चुने गए सभी फ़ॉर्मैट (HWP, HWPX, Word, ODT, PDF, HTML) एक ही फ़ोल्डर में साथ बनते हैं।',
 'th': 'ในการ์ด **ตัวแปลง Markdown** ที่หน้าแรก วาง Markdown หรือเปิดไฟล์ .md แล้วกด **แปลงทั้งหมด** ทุกรูปแบบที่เลือก (HWP, HWPX, Word, ODT, PDF, HTML) จะถูกสร้างไว้ด้วยกันในโฟลเดอร์เดียว',
}
assert set(CONVERTER) == set(T), set(T) ^ set(CONVERTER)
for lang, (_title, _intro, sections) in T.items():
    sections[2][2].append(CONVERTER[lang])

# the 교육 templates with Gongu (공유마당) pictures, opening a template as a map, and the
# slide sound effects (decision 0087), one line under the templates
GONGU_WORKS = {
 'ko': '**교육** 묶음에는 옛 그림 감상 수업 지도안, 옛 그림 전시 안내문, 「운수 좋은 날」 함께 읽기가 있습니다. 그림은 공유마당(gongu.copyright.or.kr)에서 가져온 저작권 만료·CC BY 작품이라 누구나 고쳐 쓸 수 있고, 문서에는 그림마다 출처 줄이 함께 들어갑니다. 지우지 말고 두세요. 양식 카드의 **마인드맵으로 열기**를 누르면 제목과 목록이 가지가 된 마인드맵으로 열립니다. 슬라이드 편집기의 **삽입 › 효과음**은 국악 효과음 6가지(주식회사 아이티앤, CC BY)를 슬라이드에 넣고, 출처는 넣은 소리의 이름에 적힙니다.',
 'en': 'The **교육** (education) group has a lesson plan for looking at old Korean paintings, an exhibition notice and a reading lesson on 「운수 좋은 날」. The pictures come from Gongu (gongu.copyright.or.kr) and are out of copyright or under CC BY, so anyone may adapt them; each one goes into the document with its credit line under it. Leave that line in. **Open as mind map** on a template card opens its headings and lists as branches of a mind map. In the slide editor, **Insert › Sound Effects** puts one of six Korean traditional-music sound effects (주식회사 아이티앤, CC BY) on the slide, with the credit in the sound’s name.',
 'zh': '**교육**（教育）组中有古画欣赏课教案、古画展览通知和「운수 좋은 날」阅读课。图片来自公有平台 Gongu（gongu.copyright.or.kr），版权已过期或采用 CC BY，任何人都可修改使用；每张图片下方都会附上出处行，请保留。在模板卡片上按 **以思维导图打开**，标题和列表会成为思维导图的分支。在幻灯片编辑器中，**插入 › 音效** 可把 6 种韩国传统音乐音效（주식회사 아이티앤，CC BY）放到幻灯片上，出处写在声音名称中。',
 'zh-TW': '**교육**（教育）群組中有古畫欣賞課教案、古畫展覽通知和「운수 좋은 날」閱讀課。圖片來自 Gongu（gongu.copyright.or.kr），著作權已過期或採用 CC BY，任何人都可修改使用；每張圖片下方都會附上出處行，請保留。在範本卡片上按 **以心智圖開啟**，標題和清單會成為心智圖的分支。在投影片編輯器中，**插入 › 音效** 可把 6 種韓國傳統音樂音效（주식회사 아이티앤，CC BY）放到投影片上，出處寫在聲音名稱中。',
 'ja': '**교육**（教育）グループには、昔の絵の鑑賞授業の指導案、昔の絵の展示案内、「운수 좋은 날」を読む授業があります。絵は Gongu（gongu.copyright.or.kr）の著作権切れまたは CC BY の作品なので誰でも手を加えて使え、文書には絵ごとに出典の行が入ります。この行は消さずに残してください。テンプレートのカードで **マインドマップで開く** を押すと、見出しと箇条書きが枝になったマインドマップで開きます。スライド編集の **挿入 › 効果音** は韓国伝統音楽の効果音 6 種類（주식회사 아이티앤、CC BY）をスライドに入れ、出典は音声の名前に記されます。',
 'fr': "Le groupe **교육** (éducation) contient une fiche de cours sur la peinture coréenne ancienne, une annonce d'exposition et une séance de lecture sur 「운수 좋은 날」. Les images viennent de Gongu (gongu.copyright.or.kr) ; elles sont dans le domaine public ou sous CC BY, donc chacun peut les adapter, et chacune entre dans le document avec sa ligne de crédit dessous. Laissez cette ligne. **Open as mind map** sur une carte de modèle ouvre ses titres et listes comme branches d'une carte mentale. Dans l'éditeur de diapositives, **Insertion › Effets sonores** place l'un des six effets de musique traditionnelle coréenne (주식회사 아이티앤, CC BY), avec le crédit dans le nom du son.",
 'de': 'Die Gruppe **교육** (Bildung) enthält einen Unterrichtsentwurf zu alten koreanischen Bildern, eine Ausstellungsankündigung und eine Lesestunde zu 「운수 좋은 날」. Die Bilder stammen von Gongu (gongu.copyright.or.kr) und sind gemeinfrei oder CC BY, dürfen also von allen bearbeitet werden; jedes kommt mit seiner Quellenzeile darunter ins Dokument. Lassen Sie diese Zeile stehen. **Open as mind map** auf einer Vorlagenkarte öffnet Überschriften und Listen als Zweige einer Mindmap. Im Folien-Editor setzt **Einfügen › Soundeffekte** einen von sechs Soundeffekten koreanischer traditioneller Musik (주식회사 아이티앤, CC BY) auf die Folie, die Quelle steht im Namen des Sounds.',
 'es': 'El grupo **교육** (educación) incluye una planificación de clase sobre pintura coreana antigua, un aviso de exposición y una clase de lectura de 「운수 좋은 날」. Las imágenes vienen de Gongu (gongu.copyright.or.kr) y son de dominio público o CC BY, así que cualquiera puede adaptarlas; cada una entra en el documento con su línea de crédito debajo. No la borres. **Open as mind map** en una tarjeta de plantilla abre sus títulos y listas como ramas de un mapa mental. En el editor de diapositivas, **Insertar › Efectos de sonido** coloca uno de seis efectos de música tradicional coreana (주식회사 아이티앤, CC BY), con el crédito en el nombre del sonido.',
 'it': "Il gruppo **교육** (istruzione) contiene un piano di lezione sui dipinti coreani antichi, un avviso di mostra e una lezione di lettura su 「운수 좋은 날」. Le immagini vengono da Gongu (gongu.copyright.or.kr) e sono di pubblico dominio o CC BY, quindi chiunque può adattarle; ognuna entra nel documento con la sua riga di attribuzione sotto. Lascia quella riga. **Open as mind map** su una scheda modello apre titoli ed elenchi come rami di una mappa mentale. Nell'editor di diapositive, **Inserisci › Effetti sonori** mette sulla diapositiva uno di sei effetti di musica tradizionale coreana (주식회사 아이티앤, CC BY), con l'attribuzione nel nome del suono.",
 'pt': 'O grupo **교육** (educação) traz um plano de aula sobre pintura coreana antiga, um aviso de exposição e uma aula de leitura de 「운수 좋은 날」. As imagens vêm do Gongu (gongu.copyright.or.kr) e estão em domínio público ou sob CC BY, então qualquer pessoa pode adaptá-las; cada uma entra no documento com a linha de crédito abaixo. Mantenha essa linha. **Open as mind map** num cartão de modelo abre os títulos e listas como ramos de um mapa mental. No editor de slides, **Inserir › Efeitos sonoros** coloca um de seis efeitos de música tradicional coreana (주식회사 아이티앤, CC BY), com o crédito no nome do som.',
 'nl': 'De groep **교육** (onderwijs) bevat een lesplan over oude Koreaanse schilderijen, een tentoonstellingsaankondiging en een leesles over 「운수 좋은 날」. De afbeeldingen komen van Gongu (gongu.copyright.or.kr) en zijn rechtenvrij of CC BY, dus iedereen mag ze bewerken; elke afbeelding komt met haar bronregel eronder in het document. Laat die regel staan. **Open as mind map** op een sjabloonkaart opent de koppen en lijsten als takken van een mindmap. In de dia-editor zet **Invoegen › Geluidseffecten** een van zes geluidseffecten van Koreaanse traditionele muziek (주식회사 아이티앤, CC BY) op de dia, met de bron in de naam van het geluid.',
 'pl': 'Grupa **교육** (edukacja) zawiera konspekt lekcji o dawnym malarstwie koreańskim, zapowiedź wystawy i lekcję czytania 「운수 좋은 날」. Obrazy pochodzą z Gongu (gongu.copyright.or.kr) i są w domenie publicznej lub na CC BY, więc każdy może je przerabiać; każdy trafia do dokumentu z linią źródła pod spodem. Nie usuwaj jej. **Open as mind map** na karcie szablonu otwiera nagłówki i listy jako gałęzie mapy myśli. W edytorze slajdów **Wstawianie › Efekty dźwiękowe** dodaje jeden z sześciu efektów koreańskiej muzyki tradycyjnej (주식회사 아이티앤, CC BY), a źródło jest w nazwie dźwięku.',
 'cs': 'Skupina **교육** (vzdělávání) obsahuje přípravu hodiny o staré korejské malbě, pozvánku na výstavu a hodinu čtení 「운수 좋은 날」. Obrázky pocházejí z Gongu (gongu.copyright.or.kr) a jsou volné nebo pod CC BY, takže je smí upravit kdokoli; každý přijde do dokumentu s řádkem zdroje pod sebou. Ten řádek ponechte. **Open as mind map** na kartě šablony otevře nadpisy a seznamy jako větve myšlenkové mapy. V editoru snímků **Vložení › Zvukové efekty** přidá jeden ze šesti zvukových efektů korejské tradiční hudby (주식회사 아이티앤, CC BY) se zdrojem v názvu zvuku.',
 'id': 'Grup **교육** (pendidikan) berisi rencana pelajaran tentang lukisan Korea lama, pengumuman pameran, dan pelajaran membaca 「운수 좋은 날」. Gambarnya berasal dari Gongu (gongu.copyright.or.kr) dan sudah bebas hak cipta atau ber-CC BY, jadi siapa pun boleh mengubahnya; setiap gambar masuk ke dokumen dengan baris sumber di bawahnya. Biarkan baris itu. **Open as mind map** pada kartu templat membuka judul dan daftarnya sebagai cabang peta pikiran. Di editor slide, **Sisipkan › Efek Suara** menaruh salah satu dari enam efek suara musik tradisional Korea (주식회사 아이티앤, CC BY), dengan sumber di nama suaranya.',
 'ms': 'Kumpulan **교육** (pendidikan) mengandungi rancangan pelajaran tentang lukisan lama Korea, notis pameran dan pelajaran membaca 「운수 좋은 날」. Gambar datang dari Gongu (gongu.copyright.or.kr) dan sudah tamat hak cipta atau di bawah CC BY, jadi sesiapa boleh mengubahnya; setiap gambar masuk ke dokumen dengan baris sumber di bawahnya. Biarkan baris itu. **Open as mind map** pada kad templat membuka tajuk dan senarainya sebagai cabang peta minda. Dalam penyunting slaid, **Sisip › Kesan Bunyi** meletakkan salah satu daripada enam kesan bunyi muzik tradisional Korea (주식회사 아이티앤, CC BY), dengan sumber dalam nama bunyi.',
 'vi': 'Nhóm **교육** (giáo dục) có giáo án thưởng thức tranh cổ Hàn Quốc, thông báo triển lãm và bài đọc 「운수 좋은 날」. Tranh lấy từ Gongu (gongu.copyright.or.kr), đã hết bản quyền hoặc theo CC BY nên ai cũng có thể chỉnh sửa; mỗi tranh vào tài liệu kèm dòng ghi nguồn bên dưới. Hãy giữ dòng đó. **Open as mind map** trên thẻ mẫu sẽ mở tiêu đề và danh sách thành các nhánh của sơ đồ tư duy. Trong trình chỉnh sửa trang chiếu, **Chèn › Hiệu ứng âm thanh** đặt một trong sáu hiệu ứng nhạc truyền thống Hàn Quốc (주식회사 아이티앤, CC BY) lên trang, với nguồn ghi trong tên âm thanh.',
 'ru': 'В группе **교육** (образование) есть план урока по старой корейской живописи, объявление о выставке и урок чтения 「운수 좋은 날」. Картинки взяты с Gongu (gongu.copyright.or.kr): они в общественном достоянии или под CC BY, их может переделывать любой; каждая попадает в документ со строкой об источнике под ней. Не удаляйте эту строку. **Открыть как интеллект-карту** на карточке шаблона открывает его заголовки и списки как ветви интеллект-карты. В редакторе слайдов **Вставка › Звуковые эффекты** ставит на слайд один из шести эффектов корейской традиционной музыки (주식회사 아이티앤, CC BY), источник указан в имени звука.',
 'ar': 'تضم مجموعة **교육** (التعليم) خطة درس لتأمل اللوحات الكورية القديمة وإعلان معرض ودرس قراءة لقصة 「운수 좋은 날」. الصور من Gongu \u200f(gongu.copyright.or.kr) وهي خارج حماية حقوق النشر أو بترخيص CC BY، فيحق لأي شخص تعديلها؛ وتدخل كل صورة المستند ومعها سطر المصدر تحتها. اترك هذا السطر. يفتح **فتح كخريطة ذهنية** في بطاقة القالب عناوينه وقوائمه فروعًا لخريطة ذهنية. وفي محرر الشرائح يضع **إدراج › مؤثرات صوتية** أحد ستة مؤثرات من الموسيقى الكورية التقليدية (주식회사 아이티앤، CC BY) على الشريحة، والمصدر مكتوب في اسم الصوت.',
 'he': 'בקבוצה **교육** (חינוך) יש מערך שיעור על ציורים קוריאניים עתיקים, מודעת תערוכה ושיעור קריאה של 「운수 좋은 날」. התמונות מגיעות מ-Gongu \u200f(gongu.copyright.or.kr) והן בנחלת הכלל או ברישיון CC BY, כך שכל אחד רשאי לעבד אותן; כל תמונה נכנסת למסמך עם שורת המקור שמתחתיה. השאירו את השורה. **פתיחה כמפת חשיבה** בכרטיס התבנית פותח את הכותרות והרשימות כענפים של מפת חשיבה. בעורך השקופיות, **הוספה › אפקטים קוליים** מוסיף אחד משישה אפקטים של מוזיקה קוריאנית מסורתית (주식회사 아이티앤, CC BY), והמקור כתוב בשם הצליל.',
 'hi': '**교육** (शिक्षा) समूह में पुराने कोरियाई चित्रों पर पाठ योजना, प्रदर्शनी की सूचना और 「운수 좋은 날」 पढ़ने का पाठ है। चित्र Gongu (gongu.copyright.or.kr) से हैं और कॉपीराइट से बाहर या CC BY के तहत हैं, इसलिए कोई भी इन्हें बदल सकता है; हर चित्र के नीचे स्रोत की पंक्ति दस्तावेज़ में साथ आती है। उसे न हटाएँ। टेम्पलेट कार्ड पर **माइंड मैप के रूप में खोलें** उसके शीर्षक और सूचियों को माइंड मैप की शाखाओं के रूप में खोलता है। स्लाइड संपादक में **सम्मिलित करें › ध्वनि प्रभाव** कोरियाई पारंपरिक संगीत के छह ध्वनि प्रभावों (주식회사 아이티앤, CC BY) में से एक स्लाइड पर डालता है, स्रोत ध्वनि के नाम में लिखा होता है।',
 'th': 'กลุ่ม **교육** (การศึกษา) มีแผนการสอนชมภาพวาดเกาหลีโบราณ ประกาศนิทรรศการ และบทเรียนการอ่าน 「운수 좋은 날」 ภาพมาจาก Gongu (gongu.copyright.or.kr) ซึ่งหมดลิขสิทธิ์แล้วหรือใช้ CC BY ทุกคนจึงดัดแปลงได้ และทุกภาพจะเข้าไปในเอกสารพร้อมบรรทัดแหล่งที่มาด้านล่าง โปรดอย่าลบบรรทัดนั้น ปุ่ม **เปิดเป็นแผนผังความคิด** บนการ์ดเทมเพลตจะเปิดหัวข้อและรายการเป็นกิ่งของแผนผังความคิด ในตัวแก้ไขสไลด์ **แทรก › เอฟเฟกต์เสียง** ใส่เอฟเฟกต์เสียงดนตรีพื้นเมืองเกาหลีหนึ่งในหกแบบ (주식회사 아이티앤, CC BY) ลงในสไลด์ โดยระบุแหล่งที่มาในชื่อเสียง',
}
assert set(GONGU_WORKS) == set(T), set(T) ^ set(GONGU_WORKS)
for lang, (_title, _intro, sections) in T.items():
    sections[2][2].append(GONGU_WORKS[lang])

# the official forms (서식) from law.go.kr, one line under the templates (languages
# without their own Home strings show the button in English, so the help names it so too)
OFFICIAL_FORMS = {
 'ko': '**서식** 묶음에는 법령에 붙은 서식 원본(정보공개 청구서, 행정심판 청구서, 민원 위임장, 거부처분 이의신청서)이 국가법령정보센터(law.go.kr)에서 받은 그대로 들어 있습니다. **한글로 열기**를 누르면 사본이 한글 탭에 열리고, 칸을 채워 저장하거나 인쇄하면 됩니다. 법령 서식은 저작권 보호를 받지 않아 누구나 쓸 수 있습니다. 서식은 법령이 바뀔 때 함께 바뀌니, 내기 전에 law.go.kr에서 최신판인지 확인하세요.',
 'en': 'The **서식** (official forms) group has forms attached to Korean statutes (a freedom-of-information request, an administrative appeal, a power of attorney for civil petitions and an objection to a refused petition), exactly as the National Law Information Center (law.go.kr) publishes them. **Open as HWP** opens a copy in a HWP tab; fill in the boxes, then save or print it. Statutory forms are not protected by copyright, so anyone may use them. Forms change when the law does, so check on law.go.kr that yours is the current version before you hand it in.',
 'zh': '**서식**（官方表格）组收录了韩国法令所附的表格原件（信息公开申请书、行政复议申请书、民愿委托书、拒绝处分异议申请书），与国家法令信息中心（law.go.kr）发布的完全一致。按 **以 HWP 打开** 会在 HWP 标签页中打开一份副本，填好各栏后保存或打印即可。法令表格不受著作权保护，任何人都可使用。表格会随法令修订而变化，提交前请在 law.go.kr 确认是否为最新版本。',
 'zh-TW': '**서식**（官方表格）群組收錄了韓國法令所附的表格原件（資訊公開申請書、行政訴願申請書、民願委任書、拒絕處分異議申請書），與國家法令資訊中心（law.go.kr）發布的完全一致。按 **以 HWP 開啟** 會在 HWP 分頁中開啟一份副本，填好各欄後儲存或列印即可。法令表格不受著作權保護，任何人都可使用。表格會隨法令修訂而變動，提交前請在 law.go.kr 確認是否為最新版本。',
 'ja': '**서식**（公式書式）グループには、韓国の法令に付いている書式の原本（情報公開請求書、行政審判請求書、民願の委任状、拒否処分の異議申立書）が、国家法令情報センター（law.go.kr）が公開しているとおりに入っています。**HWP で開く** を押すとコピーが HWP タブで開くので、欄を埋めて保存または印刷します。法令の書式は著作権で保護されないため、誰でも使えます。書式は法令の改正とともに変わるので、提出する前に law.go.kr で最新版か確かめてください。',
 'fr': "Le groupe **서식** (formulaires officiels) contient des formulaires annexés aux lois coréennes (demande d’accès à l’information, recours administratif, procuration pour les démarches administratives, contestation d’un refus), tels que le Centre national d’information juridique (law.go.kr) les publie. **Open as HWP** ouvre une copie dans un onglet HWP : remplissez les cases, puis enregistrez-la ou imprimez-la. Les formulaires légaux ne sont pas protégés par le droit d’auteur, chacun peut donc les utiliser. Ils changent avec la loi : vérifiez sur law.go.kr que vous avez la version en vigueur avant de le remettre.",
 'de': 'Die Gruppe **서식** (amtliche Formulare) enthält Formulare aus koreanischen Rechtsvorschriften (Antrag auf Informationszugang, Widerspruch im Verwaltungsverfahren, Vollmacht für Behördenanträge, Einspruch gegen einen abgelehnten Antrag), genau so, wie das Nationale Rechtsinformationszentrum (law.go.kr) sie veröffentlicht. **Open as HWP** öffnet eine Kopie in einem HWP-Tab; füllen Sie die Felder aus und speichern oder drucken Sie sie. Gesetzliche Formulare sind nicht urheberrechtlich geschützt und dürfen von allen genutzt werden. Sie ändern sich mit dem Gesetz, prüfen Sie also vor dem Einreichen auf law.go.kr, ob Sie die aktuelle Fassung haben.',
 'es': 'El grupo **서식** (formularios oficiales) incluye formularios anexos a leyes coreanas (solicitud de acceso a la información, recurso administrativo, poder para trámites y objeción a una denegación), tal como los publica el Centro Nacional de Información Jurídica (law.go.kr). **Open as HWP** abre una copia en una pestaña HWP; rellena las casillas y guárdala o imprímela. Los formularios legales no están protegidos por derechos de autor, así que cualquiera puede usarlos. Cambian cuando cambia la ley, así que comprueba en law.go.kr que tienes la versión vigente antes de presentarlo.',
 'it': "Il gruppo **서식** (moduli ufficiali) contiene moduli allegati alle leggi coreane (richiesta di accesso agli atti, ricorso amministrativo, delega per pratiche amministrative, opposizione a un diniego), così come li pubblica il Centro nazionale di informazione giuridica (law.go.kr). **Open as HWP** apre una copia in una scheda HWP: compila le caselle, poi salvala o stampala. I moduli di legge non sono protetti dal diritto d’autore, quindi chiunque può usarli. Cambiano quando cambia la legge: prima di consegnarne uno, verifica su law.go.kr che sia la versione in vigore.",
 'pt': 'O grupo **서식** (formulários oficiais) traz formulários anexos a leis coreanas (pedido de acesso à informação, recurso administrativo, procuração para pedidos administrativos e contestação de uma recusa), tal como o Centro Nacional de Informação Jurídica (law.go.kr) os publica. **Open as HWP** abre uma cópia numa aba HWP; preencha os campos e depois salve ou imprima. Formulários legais não são protegidos por direitos autorais, então qualquer pessoa pode usá-los. Eles mudam quando a lei muda, por isso confirme em law.go.kr que tem a versão em vigor antes de entregar.',
 'nl': 'De groep **서식** (officiële formulieren) bevat formulieren uit Koreaanse wetgeving (verzoek om openbaarmaking, administratief beroep, volmacht voor aanvragen bij de overheid en bezwaar tegen een weigering), precies zoals het Nationale Juridische Informatiecentrum (law.go.kr) ze publiceert. **Open as HWP** opent een kopie in een HWP-tabblad; vul de vakken in en sla het op of druk het af. Wettelijke formulieren zijn niet auteursrechtelijk beschermd, dus iedereen mag ze gebruiken. Ze veranderen als de wet verandert, dus controleer op law.go.kr of je de geldende versie hebt voordat je het indient.',
 'pl': 'Grupa **서식** (formularze urzędowe) zawiera formularze z koreańskich przepisów (wniosek o udostępnienie informacji, odwołanie administracyjne, pełnomocnictwo do spraw urzędowych i sprzeciw wobec odmowy) dokładnie w postaci, w jakiej publikuje je Krajowe Centrum Informacji Prawnej (law.go.kr). **Open as HWP** otwiera kopię w karcie HWP; wypełnij pola, a potem zapisz lub wydrukuj. Formularze ustawowe nie są chronione prawem autorskim, więc każdy może z nich korzystać. Zmieniają się razem z prawem, dlatego przed złożeniem sprawdź na law.go.kr, czy masz aktualną wersję.',
 'cs': 'Skupina **서식** (úřední formuláře) obsahuje formuláře připojené ke korejským předpisům (žádost o informace, správní odvolání, plná moc pro úřední podání a námitka proti zamítnutí) přesně tak, jak je zveřejňuje Národní centrum právních informací (law.go.kr). **Open as HWP** otevře kopii na kartě HWP; vyplňte políčka a pak ji uložte nebo vytiskněte. Zákonné formuláře nejsou chráněny autorským právem, takže je může použít kdokoli. Mění se se zákonem, proto si před podáním na law.go.kr ověřte, že máte platné znění.',
 'id': 'Grup **서식** (formulir resmi) berisi formulir yang dilampirkan pada peraturan Korea (permohonan keterbukaan informasi, banding administratif, surat kuasa untuk urusan layanan publik, dan keberatan atas penolakan), persis seperti yang diterbitkan Pusat Informasi Hukum Nasional (law.go.kr). **Open as HWP** membuka salinannya di tab HWP; isi kolomnya, lalu simpan atau cetak. Formulir resmi peraturan tidak dilindungi hak cipta, jadi siapa pun boleh memakainya. Formulir berubah saat peraturannya berubah, jadi periksa di law.go.kr bahwa itu versi terbaru sebelum Anda menyerahkannya.',
 'ms': 'Kumpulan **서식** (borang rasmi) mengandungi borang yang dilampirkan pada undang-undang Korea (permohonan maklumat awam, rayuan pentadbiran, surat kuasa untuk urusan perkhidmatan awam dan bantahan terhadap penolakan), sebagaimana diterbitkan oleh Pusat Maklumat Undang-undang Kebangsaan (law.go.kr). **Open as HWP** membuka salinan dalam tab HWP; isi ruangannya, kemudian simpan atau cetak. Borang undang-undang tidak dilindungi hak cipta, jadi sesiapa pun boleh menggunakannya. Borang berubah apabila undang-undang berubah, jadi semak di law.go.kr bahawa ia versi terkini sebelum anda menghantarnya.',
 'vi': 'Nhóm **서식** (biểu mẫu chính thức) gồm các biểu mẫu kèm theo luật của Hàn Quốc (đơn yêu cầu công khai thông tin, đơn khiếu nại hành chính, giấy ủy quyền làm thủ tục hành chính và đơn phản đối quyết định từ chối), đúng như Trung tâm Thông tin Pháp luật Quốc gia (law.go.kr) công bố. **Open as HWP** mở một bản sao trong thẻ HWP; điền vào các ô rồi lưu hoặc in. Biểu mẫu pháp luật không được bảo hộ bản quyền nên ai cũng có thể dùng. Biểu mẫu thay đổi khi luật thay đổi, vì vậy hãy kiểm tra trên law.go.kr rằng đó là phiên bản mới nhất trước khi nộp.',
 'ru': 'В группе **서식** (официальные бланки) есть бланки из корейских нормативных актов (запрос о раскрытии информации, административная жалоба, доверенность на подачу обращений и возражение на отказ) в том виде, в каком их публикует Национальный центр правовой информации (law.go.kr). **Открыть как HWP** открывает копию во вкладке HWP: заполните поля, затем сохраните или распечатайте. Бланки из законов не охраняются авторским правом, поэтому ими может пользоваться каждый. Они меняются вместе с законом, так что перед подачей проверьте на law.go.kr, что у вас действующая редакция.',
 'ar': 'تضم مجموعة **서식** (النماذج الرسمية) نماذج ملحقة بالتشريعات الكورية (طلب الإفصاح عن المعلومات، والتظلم الإداري، وتوكيل لتقديم الطلبات الإدارية، والاعتراض على قرار الرفض) كما ينشرها مركز المعلومات القانونية الوطني (law.go.kr) تمامًا. يفتح **فتح بصيغة HWP** نسخة في علامة تبويب HWP؛ املأ الخانات ثم احفظها أو اطبعها. النماذج القانونية غير محمية بحقوق النشر، لذا يمكن لأي شخص استخدامها. وهي تتغير بتغير القانون، فتحقق على law.go.kr من أنها النسخة السارية قبل تقديمها.',
 'he': 'בקבוצה **서식** (טפסים רשמיים) יש טפסים המצורפים לחקיקה הקוריאנית (בקשה לחופש מידע, ערר מנהלי, ייפוי כוח לפניות לרשויות והשגה על סירוב) בדיוק כפי שהמרכז הלאומי למידע משפטי (law.go.kr) מפרסם אותם. **פתיחה כ-HWP** פותחת עותק בכרטיסיית HWP; מלאו את השדות ואז שמרו או הדפיסו. טפסים שבחוק אינם מוגנים בזכויות יוצרים, כך שכל אחד רשאי להשתמש בהם. הם משתנים כשהחוק משתנה, לכן לפני ההגשה בדקו ב-law.go.kr שזו הגרסה התקפה.',
 'hi': '**서식** (आधिकारिक फ़ॉर्म) समूह में कोरियाई क़ानूनों के साथ जुड़े फ़ॉर्म (सूचना प्रकटीकरण अनुरोध, प्रशासनिक अपील, सरकारी आवेदनों के लिए मुख्तारनामा और अस्वीकृति पर आपत्ति) ठीक वैसे ही हैं जैसे राष्ट्रीय विधि सूचना केंद्र (law.go.kr) उन्हें प्रकाशित करता है। **HWP में खोलें** दबाने पर एक प्रति HWP टैब में खुलती है; खाने भरें, फिर सहेजें या प्रिंट करें। क़ानूनी फ़ॉर्म कॉपीराइट से सुरक्षित नहीं हैं, इसलिए कोई भी उनका उपयोग कर सकता है। क़ानून बदलने पर फ़ॉर्म भी बदलते हैं, इसलिए जमा करने से पहले law.go.kr पर जाँच लें कि यह नवीनतम संस्करण है।',
 'th': 'กลุ่ม **서식** (แบบฟอร์มทางการ) มีแบบฟอร์มที่แนบท้ายกฎหมายเกาหลี (คำขอเปิดเผยข้อมูลข่าวสาร คำร้องอุทธรณ์ทางปกครอง หนังสือมอบอำนาจสำหรับยื่นเรื่องต่อหน่วยงานรัฐ และคำคัดค้านคำสั่งปฏิเสธ) ตรงตามที่ศูนย์ข้อมูลกฎหมายแห่งชาติ (law.go.kr) เผยแพร่ กด **เปิดเป็น HWP** เพื่อเปิดสำเนาในแท็บ HWP แล้วกรอกช่องต่าง ๆ จากนั้นบันทึกหรือพิมพ์ แบบฟอร์มตามกฎหมายไม่มีลิขสิทธิ์คุ้มครอง ใครก็ใช้ได้ แบบฟอร์มจะเปลี่ยนเมื่อกฎหมายเปลี่ยน จึงควรตรวจที่ law.go.kr ว่าเป็นฉบับล่าสุดก่อนยื่น',
}
assert set(OFFICIAL_FORMS) == set(T), set(T) ^ set(OFFICIAL_FORMS)
for lang, (_title, _intro, sections) in T.items():
    sections[2][2].append(OFFICIAL_FORMS[lang])

# AI in the design board, one line under the design section (the board itself
# speaks Korean or English, so other languages name its buttons in English)
DESIGN_AI = {
 'ko': '디자인 창 오른쪽 위 **✦ AI 도우미**를 누르면 오른쪽에 AI 도우미가 열립니다. **새로 만들기**에 만들 것을 적고 보내면 설정에서 고른 AI가 글을 쓰고, 한판이 배치와 색을 정해 편집할 수 있는 디자인을 만듭니다. **이 디자인에 글 채우기**는 지금 디자인의 배치와 색은 그대로 두고 글 상자의 글만 내 내용으로 바꿉니다. 템플릿을 고른 뒤 나오는 **✦ 이 템플릿에 AI로 내 내용 채우기**를 눌러도 됩니다. 글 상자를 고르면 그 위에 ✦ 막대가 떠서 다듬기, 짧게, 눈길 끌게, 영↔한 번역을 한 번에 합니다. 결과마다 **되돌리기**가 있고, AI가 아직 연결되지 않았으면 도우미 안에서 바로 연결합니다.',
 'en': 'Press **✦ AI helper** at the top right of the design window to open the helper on the right. Under **Make new**, describe what you want and send it: the AI you chose in Settings writes the words and Hanpan lays them out as an editable design. **Fill this design** keeps the current layout and colours and rewrites only the text boxes with your content; after picking a template, **✦ Fill this template with my content** does the same. With a text box selected, a ✦ bar above it polishes, shortens, makes it catchier or translates between English and Korean in one click. Every result has **Undo**, and if no AI is connected yet you can connect one right in the helper.',
 'zh': '按设计窗口右上角的 **✦ AI helper**，右侧会打开 AI 助手。在 **Make new** 中写下要做的内容并发送：设置中选择的 AI 撰写文字，Hanpan 负责排版和配色，生成可编辑的设计。**Fill this design** 保留当前设计的版式和配色，只把文本框换成你的内容；选好模板后出现的 **✦ Fill this template with my content** 也是同样作用。选中文本框后，上方会出现 ✦ 工具条，一键润色、缩短、改得更吸引人或在英韩之间翻译。每个结果都有 **Undo**，尚未连接 AI 时可直接在助手中连接。',
 'zh-TW': '按設計視窗右上角的 **✦ AI helper**，右側會開啟 AI 助手。在 **Make new** 中寫下要做的內容並送出：設定中選擇的 AI 撰寫文字，Hanpan 負責排版與配色，產生可編輯的設計。**Fill this design** 保留目前設計的版面與配色，只把文字方塊換成你的內容；選好範本後出現的 **✦ Fill this template with my content** 也有同樣作用。選取文字方塊後，上方會出現 ✦ 工具列，一鍵潤飾、縮短、改得更吸睛或在英韓之間翻譯。每個結果都有 **Undo**，尚未連接 AI 時可直接在助手中連接。',
 'ja': 'デザイン画面右上の **✦ AI helper** を押すと、右側に AI ヘルパーが開きます。**Make new** に作りたいものを書いて送ると、設定で選んだ AI が文章を書き、Hanpan がレイアウトと色を決めて編集できるデザインを作ります。**Fill this design** は今のデザインのレイアウトと色はそのままに、テキストボックスの文章だけを自分の内容に置き換えます。テンプレートを選んだ後に出る **✦ Fill this template with my content** でも同じことができます。テキストボックスを選ぶと上に ✦ バーが現れ、整える・短くする・目を引く表現にする・英韓翻訳をワンクリックで行います。結果ごとに **Undo** があり、AI がまだ接続されていなければヘルパーの中でそのまま接続できます。',
 'fr': "Appuyez sur **✦ AI helper** en haut à droite de la fenêtre de design pour ouvrir l'assistant à droite. Sous **Make new**, décrivez ce que vous voulez et envoyez : l'IA choisie dans les réglages écrit le texte et Hanpan le met en page en un design modifiable. **Fill this design** garde la mise en page et les couleurs actuelles et ne réécrit que les zones de texte avec votre contenu ; après avoir choisi un modèle, **✦ Fill this template with my content** fait de même. Une zone de texte sélectionnée, une barre ✦ au-dessus la peaufine, la raccourcit, la rend plus accrocheuse ou la traduit entre anglais et coréen en un clic. Chaque résultat a son **Undo**, et si aucune IA n'est encore connectée, vous la connectez directement dans l'assistant.",
 'de': 'Drücken Sie oben rechts im Designfenster auf **✦ AI helper**, um den Assistenten rechts zu öffnen. Unter **Make new** beschreiben Sie, was entstehen soll, und senden es ab: Die in den Einstellungen gewählte KI schreibt den Text, Hanpan gestaltet daraus ein bearbeitbares Design. **Fill this design** behält Layout und Farben des aktuellen Designs und schreibt nur die Textfelder mit Ihrem Inhalt neu; nach der Wahl einer Vorlage tut **✦ Fill this template with my content** dasselbe. Bei einem gewählten Textfeld erscheint darüber eine ✦-Leiste, die es mit einem Klick glättet, kürzt, griffiger macht oder zwischen Englisch und Koreanisch übersetzt. Jedes Ergebnis hat **Undo**, und ist noch keine KI verbunden, verbinden Sie sie direkt im Assistenten.',
 'es': 'Pulsa **✦ AI helper** arriba a la derecha de la ventana de diseño para abrir el asistente a la derecha. En **Make new**, describe lo que quieres y envíalo: la IA elegida en Ajustes escribe el texto y Hanpan lo maqueta como un diseño editable. **Fill this design** conserva la maquetación y los colores actuales y solo reescribe los cuadros de texto con tu contenido; tras elegir una plantilla, **✦ Fill this template with my content** hace lo mismo. Con un cuadro de texto seleccionado, una barra ✦ encima lo pule, lo acorta, lo hace más llamativo o lo traduce entre inglés y coreano con un clic. Cada resultado tiene **Undo**, y si aún no hay una IA conectada, la conectas dentro del asistente.',
 'it': "Premi **✦ AI helper** in alto a destra nella finestra di design per aprire l'assistente a destra. In **Make new** descrivi cosa vuoi e invia: l'IA scelta nelle Impostazioni scrive il testo e Hanpan lo impagina in un design modificabile. **Fill this design** mantiene impaginazione e colori del design attuale e riscrive solo le caselle di testo con i tuoi contenuti; dopo aver scelto un modello, **✦ Fill this template with my content** fa lo stesso. Con una casella di testo selezionata, una barra ✦ sopra di essa la rifinisce, la accorcia, la rende più accattivante o la traduce tra inglese e coreano con un clic. Ogni risultato ha **Undo** e, se nessuna IA è ancora collegata, la colleghi direttamente nell'assistente.",
 'pt': 'Toque em **✦ AI helper** no canto superior direito da janela de design para abrir o assistente à direita. Em **Make new**, descreva o que quer e envie: a IA escolhida nas Configurações escreve o texto e o Hanpan o diagrama como um design editável. **Fill this design** mantém o layout e as cores do design atual e reescreve só as caixas de texto com o seu conteúdo; depois de escolher um modelo, **✦ Fill this template with my content** faz o mesmo. Com uma caixa de texto selecionada, uma barra ✦ acima dela refina, encurta, torna mais chamativa ou traduz entre inglês e coreano com um clique. Cada resultado tem **Undo**, e se ainda não houver uma IA conectada, você a conecta dentro do assistente.',
 'nl': 'Druk rechtsboven in het ontwerpvenster op **✦ AI helper** om de assistent rechts te openen. Beschrijf onder **Make new** wat je wilt en verstuur het: de AI die je in Instellingen koos schrijft de tekst en Hanpan maakt er een bewerkbaar ontwerp van. **Fill this design** houdt de opmaak en kleuren van het huidige ontwerp en herschrijft alleen de tekstvakken met jouw inhoud; na het kiezen van een sjabloon doet **✦ Fill this template with my content** hetzelfde. Met een geselecteerd tekstvak verschijnt erboven een ✦-balk die het met één klik verfijnt, inkort, pakkender maakt of vertaalt tussen Engels en Koreaans. Elk resultaat heeft **Undo**, en is er nog geen AI verbonden, dan verbind je die direct in de assistent.',
 'pl': 'Naciśnij **✦ AI helper** w prawym górnym rogu okna projektu, aby otworzyć asystenta po prawej. W **Make new** opisz, czego potrzebujesz, i wyślij: AI wybrana w Ustawieniach pisze tekst, a Hanpan układa z niego edytowalny projekt. **Fill this design** zachowuje układ i kolory bieżącego projektu i przepisuje tylko pola tekstowe Twoją treścią; po wyborze szablonu to samo robi **✦ Fill this template with my content**. Przy zaznaczonym polu tekstowym nad nim pojawia się pasek ✦, który jednym kliknięciem wygładza, skraca, uatrakcyjnia albo tłumaczy między angielskim a koreańskim. Każdy wynik ma **Undo**, a jeśli AI nie jest jeszcze połączona, połączysz ją od razu w asystencie.',
 'cs': 'Stiskněte **✦ AI helper** vpravo nahoře v okně návrhu a vpravo se otevře asistent. V **Make new** popište, co chcete, a odešlete: AI zvolená v Nastavení napíše text a Hanpan z něj sestaví upravitelný návrh. **Fill this design** zachová rozvržení a barvy současného návrhu a přepíše jen textová pole vaším obsahem; po výběru šablony totéž udělá **✦ Fill this template with my content**. U vybraného textového pole se nad ním objeví lišta ✦, která ho jedním kliknutím vyladí, zkrátí, zatraktivní nebo přeloží mezi angličtinou a korejštinou. Každý výsledek má **Undo** a pokud ještě není připojena žádná AI, připojíte ji přímo v asistentovi.',
 'id': 'Tekan **✦ AI helper** di kanan atas jendela desain untuk membuka asisten di sebelah kanan. Di **Make new**, tulis yang Anda inginkan lalu kirim: AI yang dipilih di Pengaturan menulis teksnya dan Hanpan menatanya menjadi desain yang bisa diedit. **Fill this design** mempertahankan tata letak dan warna desain saat ini dan hanya menulis ulang kotak teks dengan isi Anda; setelah memilih templat, **✦ Fill this template with my content** melakukan hal yang sama. Dengan kotak teks terpilih, bilah ✦ di atasnya merapikan, memperpendek, membuatnya lebih menarik, atau menerjemahkan antara Inggris dan Korea dalam satu klik. Setiap hasil punya **Undo**, dan jika belum ada AI yang terhubung, Anda bisa menghubungkannya langsung di asisten.',
 'ms': 'Tekan **✦ AI helper** di penjuru kanan atas tetingkap reka bentuk untuk membuka pembantu di sebelah kanan. Di bawah **Make new**, terangkan apa yang anda mahu dan hantar: AI yang dipilih dalam Tetapan menulis teks dan Hanpan menyusunnya menjadi reka bentuk yang boleh disunting. **Fill this design** mengekalkan susun atur dan warna reka bentuk semasa dan hanya menulis semula kotak teks dengan kandungan anda; selepas memilih templat, **✦ Fill this template with my content** melakukan perkara yang sama. Dengan kotak teks dipilih, bar ✦ di atasnya memurnikan, memendekkan, menjadikannya lebih menarik atau menterjemah antara bahasa Inggeris dan Korea dengan satu klik. Setiap hasil ada **Undo**, dan jika belum ada AI disambungkan, anda boleh menyambungnya terus dalam pembantu.',
 'vi': 'Nhấn **✦ AI helper** ở góc trên bên phải cửa sổ thiết kế để mở trợ lý ở bên phải. Trong **Make new**, mô tả điều bạn muốn rồi gửi: AI đã chọn trong Cài đặt viết chữ và Hanpan dàn trang thành thiết kế có thể chỉnh sửa. **Fill this design** giữ nguyên bố cục và màu của thiết kế hiện tại, chỉ viết lại các ô chữ bằng nội dung của bạn; sau khi chọn mẫu, **✦ Fill this template with my content** cũng làm như vậy. Khi chọn một ô chữ, thanh ✦ hiện phía trên giúp trau chuốt, rút gọn, làm nổi bật hơn hoặc dịch giữa tiếng Anh và tiếng Hàn chỉ bằng một cú nhấp. Mỗi kết quả đều có **Undo**, và nếu chưa kết nối AI, bạn có thể kết nối ngay trong trợ lý.',
 'ru': 'Нажмите **✦ AI helper** в правом верхнем углу окна дизайна, чтобы открыть помощника справа. В **Make new** опишите, что нужно, и отправьте: ИИ, выбранный в настройках, пишет текст, а Hanpan раскладывает его в редактируемый дизайн. **Fill this design** сохраняет макет и цвета текущего дизайна и переписывает только текстовые поля вашим содержимым; после выбора шаблона то же делает **✦ Fill this template with my content**. Если выбрано текстовое поле, над ним появляется панель ✦, которая одним щелчком шлифует текст, сокращает, делает ярче или переводит между английским и корейским. У каждого результата есть **Undo**, а если ИИ ещё не подключён, его можно подключить прямо в помощнике.',
 'ar': 'اضغط **✦ AI helper** أعلى يمين نافذة التصميم لفتح المساعد على اليمين. في **Make new** صف ما تريده وأرسله: يكتب الذكاء الاصطناعي الذي اخترته في الإعدادات النص، ويرتّبه Hanpan في تصميم قابل للتعديل. يحافظ **Fill this design** على تخطيط التصميم الحالي وألوانه ويعيد كتابة مربعات النص فقط بمحتواك؛ وبعد اختيار قالب يفعل **✦ Fill this template with my content** الشيء نفسه. عند تحديد مربع نص يظهر فوقه شريط ✦ يصقل النص أو يختصره أو يجعله أكثر جذبًا أو يترجمه بين الإنجليزية والكورية بنقرة واحدة. لكل نتيجة زر **Undo**، وإن لم يكن هناك ذكاء اصطناعي متصل بعد فيمكنك توصيله داخل المساعد مباشرة.',
 'he': 'לחצו על **✦ AI helper** בפינה הימנית העליונה של חלון העיצוב כדי לפתוח את העוזר בצד ימין. ב-**Make new** תארו מה אתם רוצים ושלחו: ה-AI שבחרתם בהגדרות כותב את הטקסט ו-Hanpan מסדר אותו לעיצוב שאפשר לערוך. **Fill this design** שומר על הפריסה והצבעים של העיצוב הנוכחי וכותב מחדש רק את תיבות הטקסט עם התוכן שלכם; אחרי בחירת תבנית, **✦ Fill this template with my content** עושה אותו דבר. כשתיבת טקסט נבחרת מופיע מעליה סרגל ✦ שמלטש, מקצר, הופך לקליט יותר או מתרגם בין אנגלית לקוריאנית בלחיצה אחת. לכל תוצאה יש **Undo**, ואם עדיין לא חובר AI אפשר לחבר אותו ישירות בתוך העוזר.',
 'hi': 'डिज़ाइन विंडो के ऊपर दाईं ओर **✦ AI helper** दबाएँ, दाईं ओर सहायक खुल जाएगा। **Make new** में लिखें कि क्या बनाना है और भेजें: सेटिंग्स में चुना गया AI शब्द लिखता है और Hanpan उन्हें संपादन योग्य डिज़ाइन में सजाता है। **Fill this design** मौजूदा डिज़ाइन का लेआउट और रंग वैसे ही रखता है और केवल टेक्स्ट बॉक्स को आपकी सामग्री से दोबारा लिखता है; टेम्पलेट चुनने के बाद दिखने वाला **✦ Fill this template with my content** भी यही करता है। टेक्स्ट बॉक्स चुनने पर उसके ऊपर ✦ पट्टी आती है, जो एक क्लिक में उसे निखारती, छोटा करती, आकर्षक बनाती या अंग्रेज़ी और कोरियाई के बीच अनुवाद करती है। हर परिणाम में **Undo** है, और अगर अभी कोई AI जुड़ा नहीं है तो आप उसे सहायक के अंदर ही जोड़ सकते हैं।',
 'th': 'กด **✦ AI helper** ที่มุมขวาบนของหน้าต่างออกแบบเพื่อเปิดผู้ช่วยทางด้านขวา ใน **Make new** ให้เขียนสิ่งที่ต้องการแล้วส่ง AI ที่เลือกไว้ในการตั้งค่าจะเขียนข้อความ และ Hanpan จะจัดวางเป็นงานออกแบบที่แก้ไขได้ **Fill this design** คงเลย์เอาต์และสีของงานปัจจุบันไว้ แล้วเขียนเฉพาะกล่องข้อความใหม่ด้วยเนื้อหาของคุณ หลังเลือกเทมเพลต ปุ่ม **✦ Fill this template with my content** ก็ทำแบบเดียวกัน เมื่อเลือกกล่องข้อความ จะมีแถบ ✦ ขึ้นด้านบนเพื่อเกลาข้อความ ทำให้สั้นลง ดึงดูดขึ้น หรือแปลระหว่างอังกฤษกับเกาหลีได้ในคลิกเดียว ทุกผลลัพธ์มี **Undo** และถ้ายังไม่ได้เชื่อมต่อ AI ก็เชื่อมต่อได้ในผู้ช่วยทันที',
}
assert set(DESIGN_AI) == set(T), set(T) ^ set(DESIGN_AI)
for lang, (_title, _intro, sections) in T.items():
    sections[4][2].append(DESIGN_AI[lang])

# the design board's editing tools, one more line under the design section
DESIGN_TOOLS = {
 'ko': '디자인 창 왼쪽 **템플릿**·**요소**·**글자** 탭에서 템플릿, 도형, QR 코드, 글자 꾸밈을 넣습니다. Shift를 누른 채 누르거나 빈 곳에서 끌면 여러 개를 고르고, 맞춤선을 따라 옮기고, 손잡이로 크기와 회전을 바꾸고, 글 상자는 두 번 눌러 그 자리에서 고칩니다. 오른쪽에서 그러데이션·그림자·외곽선·사진 필터를, **레이어** 탭에서 순서와 잠금을 정하고, **크기 바꾸기**는 배치를 지킨 채 판 크기를 바꿉니다. JPG로도 저장합니다.',
 'en': 'In the design window, the **Templates**, **Elements** and **Text** tabs add templates, shapes, QR codes and text styles. Shift-click or drag across empty space to pick several, move them along the guides, resize and turn them by their handles, and double-click a text box to type in place. The right side sets gradients, shadows, outlines and photo filters, the **Layers** tab sets order and locks, and **Resize** changes the page size keeping the layout. Pages also save as JPG.',
 'zh': '在设计窗口左侧的 **Templates**、**Elements**、**Text** 标签中添加模板、形状、二维码和文字样式。按住 Shift 点击或在空白处拖动可选中多个，沿参考线移动，用控制点调整大小和旋转，双击文本框可直接修改。右侧设置渐变、阴影、描边和照片滤镜，**Layers** 标签设置顺序和锁定，**Resize** 在保留布局的同时更改页面尺寸。页面也可保存为 JPG。',
 'zh-TW': '在設計視窗左側的 **Templates**、**Elements**、**Text** 分頁中加入範本、圖形、QR 碼與文字樣式。按住 Shift 點選或在空白處拖曳可選取多個，沿參考線移動，用控制點調整大小與旋轉，按兩下文字方塊即可就地修改。右側設定漸層、陰影、外框與相片濾鏡，**Layers** 分頁設定順序與鎖定，**Resize** 在保留版面的同時變更頁面大小。頁面也可存成 JPG。',
 'ja': 'デザイン画面左の **Templates**・**Elements**・**Text** タブで、テンプレート、図形、QR コード、文字スタイルを追加します。Shift を押しながらクリックするか空白をドラッグすると複数選択でき、ガイドに沿って移動し、ハンドルでサイズと回転を変え、テキストボックスはダブルクリックでその場で直せます。右側でグラデーション・影・縁取り・写真フィルターを、**Layers** タブで重なり順とロックを決め、**Resize** はレイアウトを保ったままページサイズを変えます。JPG でも保存できます。',
 'fr': 'Dans la fenêtre de design, les onglets **Templates**, **Elements** et **Text** ajoutent des modèles, des formes, des codes QR et des styles de texte. Maj+clic ou un glisser dans le vide sélectionne plusieurs éléments ; déplacez-les le long des repères, redimensionnez-les et faites-les pivoter avec leurs poignées, et double-cliquez sur une zone de texte pour écrire sur place. À droite se règlent dégradés, ombres, contours et filtres photo ; l\'onglet **Layers** règle l\'ordre et le verrouillage, et **Resize** change la taille de la page en gardant la mise en page. Les pages s\'enregistrent aussi en JPG.',
 'de': 'Im Designfenster fügen die Reiter **Templates**, **Elements** und **Text** Vorlagen, Formen, QR-Codes und Textstile ein. Mit Umschalt-Klick oder Ziehen über leere Fläche wählen Sie mehrere aus, verschieben sie an Hilfslinien entlang, ändern Größe und Drehung über die Griffe und bearbeiten ein Textfeld per Doppelklick direkt. Rechts stellen Sie Verläufe, Schatten, Konturen und Fotofilter ein, im Reiter **Layers** Reihenfolge und Sperre, und **Resize** ändert die Seitengröße unter Beibehaltung des Layouts. Seiten lassen sich auch als JPG speichern.',
 'es': 'En la ventana de diseño, las pestañas **Templates**, **Elements** y **Text** añaden plantillas, formas, códigos QR y estilos de texto. Con Mayús+clic o arrastrando en un espacio vacío eliges varios; muévelos siguiendo las guías, cambia su tamaño y giro con los tiradores y haz doble clic en un cuadro de texto para escribir en el sitio. A la derecha se ajustan degradados, sombras, contornos y filtros de foto; la pestaña **Layers** fija el orden y el bloqueo, y **Resize** cambia el tamaño de la página manteniendo el diseño. Las páginas también se guardan como JPG.',
 'it': "Nella finestra di design, le schede **Templates**, **Elements** e **Text** aggiungono modelli, forme, codici QR e stili di testo. Con Maiusc+clic o trascinando nel vuoto ne selezioni più d'uno; spostali lungo le guide, cambia dimensione e rotazione con le maniglie e fai doppio clic su una casella di testo per scrivere sul posto. A destra si impostano sfumature, ombre, contorni e filtri foto, la scheda **Layers** imposta ordine e blocco, e **Resize** cambia il formato della pagina mantenendo l'impaginazione. Le pagine si salvano anche in JPG.",
 'pt': 'Na janela de design, as abas **Templates**, **Elements** e **Text** adicionam modelos, formas, códigos QR e estilos de texto. Shift+clique ou arrastar num espaço vazio seleciona vários; mova-os pelas guias, mude tamanho e rotação pelas alças e dê duplo clique numa caixa de texto para escrever no lugar. À direita ficam degradês, sombras, contornos e filtros de foto, a aba **Layers** define ordem e bloqueio, e **Resize** muda o tamanho da página mantendo o layout. As páginas também são salvas como JPG.',
 'nl': 'In het ontwerpvenster voegen de tabbladen **Templates**, **Elements** en **Text** sjablonen, vormen, QR-codes en tekststijlen toe. Met Shift-klik of slepen over lege ruimte kies je er meerdere, verplaats je ze langs de hulplijnen, verander je grootte en draaiing met de grepen, en dubbelklik je op een tekstvak om ter plekke te typen. Rechts stel je verlopen, schaduwen, omlijningen en fotofilters in, het tabblad **Layers** regelt volgorde en vergrendeling, en **Resize** wijzigt het paginaformaat met behoud van de opmaak. Pagina\'s kunnen ook als JPG worden opgeslagen.',
 'pl': 'W oknie projektu karty **Templates**, **Elements** i **Text** dodają szablony, kształty, kody QR i style tekstu. Shift+klik lub przeciągnięcie po pustym miejscu zaznacza kilka elementów; przesuwaj je wzdłuż linii pomocniczych, zmieniaj rozmiar i obrót uchwytami, a pole tekstowe edytuj w miejscu dwuklikiem. Po prawej ustawiasz gradienty, cienie, obrysy i filtry zdjęć, karta **Layers** ustala kolejność i blokadę, a **Resize** zmienia rozmiar strony z zachowaniem układu. Strony można też zapisać jako JPG.',
 'cs': 'V okně návrhu přidávají karty **Templates**, **Elements** a **Text** šablony, tvary, QR kódy a styly textu. Shift+klik nebo tažení přes prázdné místo vybere více prvků; posouvejte je podél vodítek, měňte velikost a otočení úchyty a dvojklikem na textové pole pište přímo na místě. Vpravo nastavíte přechody, stíny, obrysy a filtry fotek, karta **Layers** určuje pořadí a zamčení a **Resize** mění velikost stránky se zachováním rozvržení. Stránky lze uložit i jako JPG.',
 'id': 'Di jendela desain, tab **Templates**, **Elements**, dan **Text** menambahkan templat, bentuk, kode QR, dan gaya teks. Shift+klik atau seret di ruang kosong untuk memilih beberapa; geser mengikuti garis bantu, ubah ukuran dan putaran lewat pegangan, dan klik dua kali kotak teks untuk mengetik langsung. Di kanan diatur gradasi, bayangan, garis tepi, dan filter foto, tab **Layers** mengatur urutan dan kunci, dan **Resize** mengubah ukuran halaman dengan tata letak tetap. Halaman juga bisa disimpan sebagai JPG.',
 'ms': 'Dalam tetingkap reka bentuk, tab **Templates**, **Elements** dan **Text** menambah templat, bentuk, kod QR dan gaya teks. Shift+klik atau seret di ruang kosong untuk memilih beberapa; alihkan mengikut garis panduan, ubah saiz dan putaran dengan pemegang, dan klik dua kali kotak teks untuk menaip di tempatnya. Di sebelah kanan ditetapkan gradien, bayang, garis luar dan penapis foto, tab **Layers** menetapkan susunan dan kunci, dan **Resize** menukar saiz halaman sambil mengekalkan susun atur. Halaman juga boleh disimpan sebagai JPG.',
 'vi': 'Trong cửa sổ thiết kế, các thẻ **Templates**, **Elements** và **Text** thêm mẫu, hình, mã QR và kiểu chữ. Shift+nhấp hoặc kéo qua vùng trống để chọn nhiều; di chuyển theo đường gióng, đổi kích thước và xoay bằng tay nắm, và nhấp đúp vào ô chữ để sửa ngay tại chỗ. Bên phải chỉnh dải màu, bóng, viền và bộ lọc ảnh, thẻ **Layers** đặt thứ tự và khóa, còn **Resize** đổi khổ trang mà vẫn giữ bố cục. Trang cũng lưu được dạng JPG.',
 'ru': 'В окне дизайна вкладки **Templates**, **Elements** и **Text** добавляют шаблоны, фигуры, QR-коды и стили текста. Shift+щелчок или протягивание по пустому месту выбирает несколько элементов; двигайте их по направляющим, меняйте размер и поворот маркерами, а текстовый блок правьте на месте двойным щелчком. Справа задаются градиенты, тени, обводка и фотофильтры, вкладка **Layers** задаёт порядок и блокировку, а **Resize** меняет размер страницы с сохранением раскладки. Страницы также сохраняются в JPG.',
 'ar': 'في نافذة التصميم تضيف علامات التبويب **Templates** و**Elements** و**Text** القوالب والأشكال ورموز QR وأنماط النص. اضغط مع Shift أو اسحب في مساحة فارغة لتحديد عدة عناصر، وحرّكها على خطوط الإرشاد، وغيّر حجمها ودورانها بالمقابض، وانقر نقرًا مزدوجًا على مربع النص للكتابة في مكانه. يضبط الجانب الأيمن التدرجات والظلال والحدود ومرشحات الصور، وتضبط علامة **Layers** الترتيب والقفل، ويغيّر **Resize** حجم الصفحة مع الحفاظ على التخطيط. تُحفظ الصفحات أيضًا بصيغة JPG.',
 'he': 'בחלון העיצוב, הלשוניות **Templates**, ‏**Elements** ו-**Text** מוסיפות תבניות, צורות, קודי QR וסגנונות טקסט. Shift+לחיצה או גרירה על שטח ריק בוחרות כמה רכיבים; הזיזו אותם לאורך קווי העזר, שנו גודל וסיבוב בידיות, ולחיצה כפולה על תיבת טקסט מאפשרת לכתוב במקום. בצד הימני קובעים מעברי צבע, צללים, קווי מתאר ומסנני תמונה, הלשונית **Layers** קובעת סדר ונעילה, ו-**Resize** משנה את גודל הדף תוך שמירה על הפריסה. אפשר לשמור דפים גם כ-JPG.',
 'hi': 'डिज़ाइन विंडो में **Templates**, **Elements** और **Text** टैब से टेम्पलेट, आकृतियाँ, QR कोड और टेक्स्ट स्टाइल जोड़ें। Shift दबाकर क्लिक करें या खाली जगह पर खींचें तो कई चुने जाते हैं; उन्हें गाइड लाइनों के साथ खिसकाएँ, हैंडल से आकार और घुमाव बदलें, और टेक्स्ट बॉक्स पर डबल-क्लिक करके वहीं लिखें। दाईं ओर ग्रेडिएंट, छाया, आउटलाइन और फ़ोटो फ़िल्टर, **Layers** टैब में क्रम और लॉक तय करें, और **Resize** लेआउट बनाए रखते हुए पेज का आकार बदलता है। पेज JPG में भी सहेजे जाते हैं।',
 'th': 'ในหน้าต่างออกแบบ แท็บ **Templates**, **Elements** และ **Text** ใช้เพิ่มเทมเพลต รูปทรง คิวอาร์โค้ด และสไตล์ข้อความ กด Shift ค้างแล้วคลิกหรือลากบนพื้นที่ว่างเพื่อเลือกหลายชิ้น เลื่อนตามเส้นนำ ปรับขนาดและหมุนด้วยจุดจับ และดับเบิลคลิกกล่องข้อความเพื่อพิมพ์แก้ตรงนั้น ด้านขวาตั้งค่าไล่สี เงา เส้นขอบ และฟิลเตอร์ภาพ แท็บ **Layers** กำหนดลำดับและการล็อก และ **Resize** เปลี่ยนขนาดหน้าโดยคงเลย์เอาต์ไว้ หน้ายังบันทึกเป็น JPG ได้ด้วย',
}
assert set(DESIGN_TOOLS) == set(T), set(T) ^ set(DESIGN_TOOLS)
for lang, (_title, _intro, sections) in T.items():
    sections[4][2].append(DESIGN_TOOLS[lang])

DESIGN_CRAFT = {
 'ko': '여러 개를 골라 **Ctrl+G**로 묶으면 함께 고르고 옮기며, **Ctrl+Shift+G**로 풉니다. 요소나 빈 곳을 오른쪽 단추로 누르면 복사·붙여 넣기·순서·잠금 메뉴가 열립니다. 사진은 두 번 누른 뒤 끌어서 보이는 곳을 고르고, 오른쪽 **자르기**에서 확대합니다. **요소** 탭의 **펜으로 그리기**로 손글씨나 형광펜을 긋고, 위쪽 **눈금자**로 위치를 재며, Space를 누른 채 끌면 화면을 옮깁니다. 글꼴 목록의 **글꼴 파일 추가…**로 넣은 글꼴은 디자인 파일에 함께 저장됩니다.',
 'en': 'Pick several and press **Ctrl+G** to group them so they pick and move together; **Ctrl+Shift+G** ungroups. Right-click an element or empty space for copy, paste, order and lock. Double-click a photo and drag to choose what shows, and zoom it under **Crop** on the right. **Draw** on the **Elements** tab draws handwriting or highlighter strokes, the **Rulers** button at the top measures positions, and dragging with Space held moves the view. Fonts added with **Add a font file…** in the font list are saved inside the design file.',
 'zh': '选中多个后按 **Ctrl+G** 编组，即可一起选中和移动；**Ctrl+Shift+G** 取消编组。右键单击元素或空白处可打开复制、粘贴、顺序和锁定菜单。双击照片后拖动可选择显示的部分，并在右侧 **Crop** 中放大。**Elements** 标签中的画笔可绘制手写或荧光笔线条，顶部的 **Rulers** 用于测量位置，按住空格拖动可移动视图。通过字体列表中的 **Add a font file…** 添加的字体会保存在设计文件中。',
 'zh-TW': '選取多個後按 **Ctrl+G** 組成群組，即可一起選取與移動；**Ctrl+Shift+G** 取消群組。在元素或空白處按右鍵可開啟複製、貼上、順序與鎖定選單。按兩下相片後拖曳可選擇顯示的部分，並在右側 **Crop** 中放大。**Elements** 分頁中的畫筆可畫出手寫或螢光筆線條，上方的 **Rulers** 用來量位置，按住空白鍵拖曳可移動畫面。透過字型清單中的 **Add a font file…** 加入的字型會存在設計檔裡。',
 'ja': '複数を選んで **Ctrl+G** を押すとグループになり、まとめて選択・移動できます。**Ctrl+Shift+G** で解除します。要素や空白を右クリックすると、コピー・貼り付け・重なり順・ロックのメニューが開きます。写真はダブルクリックしてからドラッグで見せる部分を選び、右側の **Crop** で拡大します。**Elements** タブのペンで手書きや蛍光ペンの線を引き、上の **Rulers** で位置を測り、Space を押しながらドラッグすると表示を動かせます。フォント一覧の **Add a font file…** で追加したフォントはデザインファイルに一緒に保存されます。',
 'fr': 'Sélectionnez plusieurs éléments et appuyez sur **Ctrl+G** pour les grouper : ils se sélectionnent et se déplacent ensemble ; **Ctrl+Maj+G** les dissocie. Un clic droit sur un élément ou dans le vide ouvre copier, coller, ordre et verrouillage. Double-cliquez sur une photo puis faites-la glisser pour choisir la partie visible, et agrandissez-la sous **Crop** à droite. Le stylo de l\'onglet **Elements** trace écriture manuscrite ou surligneur, le bouton **Rulers** en haut mesure les positions, et glisser en maintenant Espace déplace la vue. Les polices ajoutées par **Add a font file…** dans la liste des polices sont enregistrées dans le fichier de design.',
 'de': 'Wählen Sie mehrere aus und drücken Sie **Strg+G**, um sie zu gruppieren; dann werden sie gemeinsam gewählt und verschoben. **Strg+Umschalt+G** hebt die Gruppe auf. Ein Rechtsklick auf ein Element oder freie Fläche öffnet Kopieren, Einfügen, Reihenfolge und Sperre. Doppelklicken Sie auf ein Foto und ziehen Sie, um den sichtbaren Ausschnitt zu wählen; vergrößern Sie ihn rechts unter **Crop**. Der Stift im Reiter **Elements** zeichnet Handschrift oder Textmarker, die Schaltfläche **Rulers** oben misst Positionen, und Ziehen mit gedrückter Leertaste verschiebt die Ansicht. Schriften, die über **Add a font file…** in der Schriftliste hinzugefügt werden, werden in der Designdatei gespeichert.',
 'es': 'Elige varios y pulsa **Ctrl+G** para agruparlos: se eligen y se mueven juntos; **Ctrl+Mayús+G** los desagrupa. Con clic derecho sobre un elemento o un espacio vacío se abre copiar, pegar, orden y bloqueo. Haz doble clic en una foto y arrástrala para elegir la parte visible, y amplíala en **Crop** a la derecha. El lápiz de la pestaña **Elements** traza escritura a mano o subrayador, el botón **Rulers** de arriba mide posiciones y arrastrar con Espacio pulsado mueve la vista. Las fuentes añadidas con **Add a font file…** en la lista de fuentes se guardan dentro del archivo de diseño.',
 'it': "Seleziona più elementi e premi **Ctrl+G** per raggrupparli: si selezionano e si spostano insieme; **Ctrl+Maiusc+G** li separa. Con il clic destro su un elemento o sul vuoto si apre il menu copia, incolla, ordine e blocco. Fai doppio clic su una foto e trascinala per scegliere la parte visibile, e ingrandiscila in **Crop** a destra. La penna della scheda **Elements** traccia scrittura a mano o evidenziatore, il pulsante **Rulers** in alto misura le posizioni e trascinare tenendo premuto Spazio sposta la vista. I caratteri aggiunti con **Add a font file…** nell'elenco dei caratteri vengono salvati nel file di design.",
 'pt': 'Selecione vários e pressione **Ctrl+G** para agrupá-los: passam a ser selecionados e movidos juntos; **Ctrl+Shift+G** desagrupa. O clique direito num elemento ou num espaço vazio abre copiar, colar, ordem e bloqueio. Dê duplo clique numa foto e arraste para escolher a parte visível, e amplie-a em **Crop** à direita. A caneta da aba **Elements** desenha escrita à mão ou marca-texto, o botão **Rulers** no topo mede posições e arrastar com Espaço pressionado move a vista. As fontes adicionadas com **Add a font file…** na lista de fontes ficam guardadas no arquivo de design.',
 'nl': 'Kies er meerdere en druk op **Ctrl+G** om ze te groeperen; ze worden dan samen gekozen en verplaatst. **Ctrl+Shift+G** heft de groep op. Rechtsklikken op een element of lege ruimte opent kopiëren, plakken, volgorde en vergrendelen. Dubbelklik op een foto en sleep om te kiezen wat zichtbaar is, en zoom in onder **Crop** rechts. De pen op het tabblad **Elements** tekent handschrift of markeerstift, de knop **Rulers** bovenaan meet posities, en slepen met de spatiebalk ingedrukt verschuift de weergave. Lettertypen die je toevoegt met **Add a font file…** in de lettertypelijst worden in het ontwerpbestand bewaard.',
 'pl': 'Zaznacz kilka elementów i naciśnij **Ctrl+G**, aby je zgrupować — wtedy zaznaczają się i przesuwają razem; **Ctrl+Shift+G** rozgrupowuje. Prawy przycisk na elemencie lub pustym miejscu otwiera kopiowanie, wklejanie, kolejność i blokadę. Kliknij dwukrotnie zdjęcie i przeciągnij, aby wybrać widoczny fragment, a powiększ je w sekcji **Crop** po prawej. Pióro na karcie **Elements** rysuje pismo odręczne lub zakreślacz, przycisk **Rulers** u góry mierzy położenie, a przeciąganie z wciśniętą spacją przesuwa widok. Czcionki dodane przez **Add a font file…** na liście czcionek zapisują się w pliku projektu.',
 'cs': 'Vyberte více prvků a stiskněte **Ctrl+G**, tím je seskupíte a budou se vybírat i posouvat spolu; **Ctrl+Shift+G** skupinu zruší. Pravé tlačítko na prvku nebo prázdném místě otevře kopírování, vložení, pořadí a zamčení. Dvakrát klikněte na fotku a tažením zvolte viditelnou část, přiblížení nastavíte vpravo v **Crop**. Pero na kartě **Elements** kreslí ručně psané tahy nebo zvýrazňovač, tlačítko **Rulers** nahoře měří polohu a tažení s podrženou mezerou posouvá zobrazení. Písma přidaná přes **Add a font file…** v seznamu písem se ukládají do souboru návrhu.',
 'id': 'Pilih beberapa lalu tekan **Ctrl+G** untuk mengelompokkannya sehingga dipilih dan digeser bersama; **Ctrl+Shift+G** memisahkannya. Klik kanan elemen atau ruang kosong membuka menu salin, tempel, urutan, dan kunci. Klik dua kali foto lalu seret untuk memilih bagian yang tampak, dan perbesar di **Crop** sebelah kanan. Pena di tab **Elements** menggambar tulisan tangan atau stabilo, tombol **Rulers** di atas mengukur posisi, dan menyeret sambil menahan Spasi menggeser tampilan. Font yang ditambahkan lewat **Add a font file…** di daftar font disimpan di dalam berkas desain.',
 'ms': 'Pilih beberapa dan tekan **Ctrl+G** untuk mengumpulkannya supaya dipilih dan dialihkan bersama; **Ctrl+Shift+G** meleraikannya. Klik kanan pada elemen atau ruang kosong membuka menu salin, tampal, susunan dan kunci. Klik dua kali foto dan seret untuk memilih bahagian yang kelihatan, kemudian zum di **Crop** sebelah kanan. Pen dalam tab **Elements** melukis tulisan tangan atau penyerlah, butang **Rulers** di atas mengukur kedudukan, dan menyeret sambil menahan Space mengalihkan paparan. Fon yang ditambah melalui **Add a font file…** dalam senarai fon disimpan di dalam fail reka bentuk.',
 'vi': 'Chọn nhiều đối tượng rồi nhấn **Ctrl+G** để nhóm lại, khi đó chúng được chọn và di chuyển cùng nhau; **Ctrl+Shift+G** bỏ nhóm. Nhấp chuột phải vào đối tượng hoặc vùng trống để mở menu sao chép, dán, thứ tự và khóa. Nhấp đúp vào ảnh rồi kéo để chọn phần hiện ra, và phóng to ở mục **Crop** bên phải. Bút trong thẻ **Elements** vẽ nét viết tay hoặc bút dạ quang, nút **Rulers** phía trên đo vị trí, và giữ phím cách khi kéo sẽ dời khung nhìn. Phông thêm bằng **Add a font file…** trong danh sách phông được lưu ngay trong tệp thiết kế.',
 'ru': 'Выберите несколько элементов и нажмите **Ctrl+G**, чтобы сгруппировать их: тогда они выбираются и двигаются вместе; **Ctrl+Shift+G** разгруппировывает. Щелчок правой кнопкой по элементу или пустому месту открывает меню копирования, вставки, порядка и блокировки. Дважды щёлкните фото и перетащите, чтобы выбрать видимую часть, а увеличение задайте справа в **Crop**. Перо на вкладке **Elements** рисует от руки или маркером, кнопка **Rulers** вверху измеряет положение, а перетаскивание с зажатым пробелом сдвигает вид. Шрифты, добавленные через **Add a font file…** в списке шрифтов, сохраняются в файле дизайна.',
 'ar': 'حدّد عدة عناصر واضغط **Ctrl+G** لتجميعها فتُحدَّد وتتحرك معًا، ويفك **Ctrl+Shift+G** التجميع. يفتح النقر بالزر الأيمن على عنصر أو مساحة فارغة قائمة النسخ واللصق والترتيب والقفل. انقر نقرًا مزدوجًا على صورة ثم اسحبها لاختيار الجزء الظاهر، وكبّرها من **Crop** على اليمين. يرسم القلم في علامة **Elements** خطوطًا يدوية أو بقلم التمييز، ويقيس زر **Rulers** في الأعلى المواضع، ويحرّك السحب مع الضغط على المسافة العرض. تُحفظ الخطوط المضافة عبر **Add a font file…** في قائمة الخطوط داخل ملف التصميم.',
 'he': 'בחרו כמה רכיבים ולחצו **Ctrl+G** כדי לקבץ אותם, וכך הם נבחרים וזזים יחד; **Ctrl+Shift+G** מפרק את הקבוצה. לחיצה ימנית על רכיב או על שטח ריק פותחת העתקה, הדבקה, סדר ונעילה. לחצו פעמיים על תמונה וגררו כדי לבחור את החלק הנראה, והגדילו אותה ב-**Crop** מימין. העט בלשונית **Elements** משרטט כתב יד או מרקר, הכפתור **Rulers** למעלה מודד מיקומים, וגרירה עם מקש הרווח לחוץ מזיזה את התצוגה. גופנים שנוספו דרך **Add a font file…** ברשימת הגופנים נשמרים בתוך קובץ העיצוב.',
 'hi': 'कई चुनकर **Ctrl+G** दबाएँ तो वे समूह बन जाते हैं और साथ में चुने व खिसकाए जाते हैं; **Ctrl+Shift+G** समूह खोलता है। किसी तत्व या खाली जगह पर दायाँ क्लिक करने से कॉपी, पेस्ट, क्रम और लॉक का मेनू खुलता है। फ़ोटो पर डबल-क्लिक करके खींचें तो दिखने वाला हिस्सा चुन सकते हैं, और दाईं ओर **Crop** में ज़ूम करें। **Elements** टैब का पेन हाथ की लिखावट या हाइलाइटर की रेखाएँ खींचता है, ऊपर का **Rulers** बटन स्थिति मापता है, और Space दबाकर खींचने से दृश्य खिसकता है। फ़ॉन्ट सूची में **Add a font file…** से जोड़े गए फ़ॉन्ट डिज़ाइन फ़ाइल के अंदर सहेजे जाते हैं।',
 'th': 'เลือกหลายชิ้นแล้วกด **Ctrl+G** เพื่อจัดกลุ่ม จะเลือกและเลื่อนไปพร้อมกัน ส่วน **Ctrl+Shift+G** ใช้ยกเลิกกลุ่ม คลิกขวาที่ชิ้นงานหรือพื้นที่ว่างจะเปิดเมนูคัดลอก วาง ลำดับ และล็อก ดับเบิลคลิกรูปแล้วลากเพื่อเลือกส่วนที่จะแสดง และซูมได้ที่ **Crop** ด้านขวา ปากกาในแท็บ **Elements** ใช้วาดลายมือหรือปากกาเน้นข้อความ ปุ่ม **Rulers** ด้านบนใช้วัดตำแหน่ง และกด Space ค้างแล้วลากเพื่อเลื่อนมุมมอง ฟอนต์ที่เพิ่มด้วย **Add a font file…** ในรายการฟอนต์จะถูกบันทึกไว้ในไฟล์ออกแบบ',
}
assert set(DESIGN_CRAFT) == set(T), set(T) ^ set(DESIGN_CRAFT)
for lang, (_title, _intro, sections) in T.items():
    sections[4][2].append(DESIGN_CRAFT[lang])

DESIGN_LOOK = {
 'ko': '**템플릿** 탭에는 공문 카드뉴스, 가정통신문, 행사 포스터, 모집 공고, 메뉴판, 상장, 발표 표지 등 20가지 견본이 있습니다. 견본은 한판에 들어 있는 글꼴(프리텐다드, 본명조, 고운바탕, 검은고딕, 도현 등)로 만들어져 어느 PC에서 열어도 같은 모양으로 보입니다. **요소** 탭의 **아이콘**에서 "달력", "장소"처럼 찾아 선 아이콘을 넣고, 오른쪽에서 색과 선 굵기를 바꿉니다.',
 'en': 'The **Templates** tab has 20 samples, among them a notice card, a school letter, an event poster, a recruiting notice, a menu board, a certificate and a slide cover. They use the fonts that come with Hanpan (Pretendard, Noto Serif KR, Gowun Batang, Black Han Sans, Do Hyeon and more), so they look the same on any PC. Under **Icons** on the **Elements** tab, search for a word such as "calendar" or "place" to add a line icon, then change its colour and line width on the right.',
 'zh': '**Templates** 标签中有 20 个样板，包括公告卡片、家长通知、活动海报、招募公告、菜单、奖状和演示封面等。样板使用Hanpan 自带的字体（Pretendard、Noto Serif KR、Gowun Batang、Black Han Sans、Do Hyeon 等），在任何电脑上打开都一样。在 **Elements** 标签的 **Icons** 中搜索 "calendar"、"place" 等词即可加入线条图标，并在右侧更改颜色和线条粗细。',
 'zh-TW': '**Templates** 分頁中有 20 個範本，包括公告卡片、家長通知、活動海報、招募公告、菜單、獎狀與簡報封面等。範本使用Hanpan 內附的字型（Pretendard、Noto Serif KR、Gowun Batang、Black Han Sans、Do Hyeon 等），在任何電腦上開啟都一樣。在 **Elements** 分頁的 **Icons** 中搜尋 "calendar"、"place" 等字詞即可加入線條圖示，並在右側變更顏色與線條粗細。',
 'ja': '**Templates** タブには、お知らせカード、学校だより、イベントポスター、募集案内、メニュー表、賞状、発表の表紙など 20 種類の見本があります。見本はHanpan に同梱のフォント（Pretendard、Noto Serif KR、Gowun Batang、Black Han Sans、Do Hyeon など）で作られているので、どの PC で開いても同じ見た目になります。**Elements** タブの **Icons** で "calendar" や "place" などを検索して線のアイコンを入れ、右側で色と線の太さを変えます。',
 'fr': 'L\'onglet **Templates** propose 20 modèles, dont une carte d\'annonce, une lettre aux parents, une affiche d\'événement, un appel à candidatures, une carte de menu, un diplôme et une couverture de présentation. Ils utilisent les polices fournies avec Hanpan (Pretendard, Noto Serif KR, Gowun Batang, Black Han Sans, Do Hyeon, etc.) et s\'affichent donc de la même façon sur tout PC. Sous **Icons** dans l\'onglet **Elements**, cherchez un mot comme « calendar » ou « place » pour ajouter une icône au trait, puis changez sa couleur et son épaisseur à droite.',
 'de': 'Der Reiter **Templates** enthält 20 Vorlagen, darunter eine Mitteilungskarte, einen Elternbrief, ein Veranstaltungsplakat, eine Ausschreibung, eine Speisekarte, eine Urkunde und ein Präsentationstitelblatt. Sie verwenden die mit Hanpan gelieferten Schriften (Pretendard, Noto Serif KR, Gowun Batang, Black Han Sans, Do Hyeon u. a.) und sehen deshalb auf jedem PC gleich aus. Unter **Icons** im Reiter **Elements** suchen Sie nach einem Wort wie „calendar“ oder „place“, um ein Liniensymbol einzufügen, und ändern rechts Farbe und Linienstärke.',
 'es': 'La pestaña **Templates** tiene 20 muestras, entre ellas una tarjeta de aviso, una carta a las familias, un cartel de evento, una convocatoria, una carta de menú, un diploma y una portada de presentación. Usan las fuentes que vienen con Hanpan (Pretendard, Noto Serif KR, Gowun Batang, Black Han Sans, Do Hyeon y otras), así que se ven igual en cualquier PC. En **Icons** de la pestaña **Elements**, busca una palabra como "calendar" o "place" para añadir un icono de línea y cambia su color y grosor a la derecha.',
 'it': "La scheda **Templates** contiene 20 modelli, tra cui una scheda di avviso, una lettera alle famiglie, un poster per eventi, un bando di selezione, un menù, un attestato e una copertina di presentazione. Usano i caratteri inclusi in Hanpan (Pretendard, Noto Serif KR, Gowun Batang, Black Han Sans, Do Hyeon e altri), quindi appaiono uguali su qualsiasi PC. In **Icons** nella scheda **Elements** cerca una parola come \"calendar\" o \"place\" per aggiungere un'icona a linee, poi cambiane colore e spessore a destra.",
 'pt': 'A aba **Templates** tem 20 modelos, entre eles um cartão de aviso, uma carta aos pais, um cartaz de evento, um anúncio de recrutamento, um cardápio, um certificado e uma capa de apresentação. Eles usam as fontes que acompanham o Hanpan (Pretendard, Noto Serif KR, Gowun Batang, Black Han Sans, Do Hyeon e outras), por isso ficam iguais em qualquer PC. Em **Icons** na aba **Elements**, procure uma palavra como "calendar" ou "place" para inserir um ícone de linha e mude a cor e a espessura à direita.',
 'nl': 'Het tabblad **Templates** bevat 20 voorbeelden, waaronder een mededelingskaart, een ouderbrief, een evenementposter, een wervingsoproep, een menukaart, een oorkonde en een presentatievoorblad. Ze gebruiken de lettertypen die bij Hanpan horen (Pretendard, Noto Serif KR, Gowun Batang, Black Han Sans, Do Hyeon en meer) en zien er dus op elke pc hetzelfde uit. Zoek onder **Icons** op het tabblad **Elements** naar een woord als "calendar" of "place" om een lijnpictogram toe te voegen, en wijzig rechts de kleur en lijndikte.',
 'pl': 'Karta **Templates** zawiera 20 wzorów, m.in. kartę ogłoszenia, list do rodziców, plakat wydarzenia, ogłoszenie o naborze, kartę menu, dyplom i okładkę prezentacji. Korzystają z czcionek dołączonych do Hanpan (Pretendard, Noto Serif KR, Gowun Batang, Black Han Sans, Do Hyeon i innych), więc na każdym komputerze wyglądają tak samo. W sekcji **Icons** na karcie **Elements** wyszukaj słowo, np. „calendar” lub „place”, aby dodać ikonę liniową, a po prawej zmień jej kolor i grubość linii.',
 'cs': 'Karta **Templates** obsahuje 20 vzorů, mimo jiné kartu oznámení, dopis rodičům, plakát akce, náborový inzerát, jídelní lístek, diplom a titulní snímek prezentace. Používají písma dodávaná s Hanpanem (Pretendard, Noto Serif KR, Gowun Batang, Black Han Sans, Do Hyeon a další), takže na každém počítači vypadají stejně. V části **Icons** na kartě **Elements** vyhledejte slovo jako „calendar“ nebo „place“ a vložte čárovou ikonu; vpravo pak změníte její barvu a tloušťku čáry.',
 'id': 'Tab **Templates** berisi 20 contoh, di antaranya kartu pengumuman, surat untuk orang tua, poster acara, pengumuman rekrutmen, papan menu, sertifikat, dan sampul presentasi. Contoh ini memakai font bawaan Hanpan (Pretendard, Noto Serif KR, Gowun Batang, Black Han Sans, Do Hyeon, dan lainnya) sehingga tampak sama di PC mana pun. Di **Icons** pada tab **Elements**, cari kata seperti "calendar" atau "place" untuk menambahkan ikon garis, lalu ubah warna dan tebal garisnya di sebelah kanan.',
 'ms': 'Tab **Templates** mengandungi 20 contoh, antaranya kad notis, surat kepada ibu bapa, poster acara, notis pengambilan, papan menu, sijil dan kulit pembentangan. Contoh ini menggunakan fon yang disertakan bersama Hanpan (Pretendard, Noto Serif KR, Gowun Batang, Black Han Sans, Do Hyeon dan lain-lain), jadi rupanya sama pada mana-mana PC. Di **Icons** dalam tab **Elements**, cari perkataan seperti "calendar" atau "place" untuk menambah ikon garisan, kemudian tukar warna dan ketebalan garisannya di sebelah kanan.',
 'vi': 'Thẻ **Templates** có 20 mẫu, trong đó có thẻ thông báo, thư gửi phụ huynh, áp phích sự kiện, thông báo tuyển, bảng thực đơn, giấy khen và trang bìa thuyết trình. Các mẫu dùng phông đi kèm Hanpan (Pretendard, Noto Serif KR, Gowun Batang, Black Han Sans, Do Hyeon và một số phông khác) nên mở trên máy nào cũng giống nhau. Trong mục **Icons** của thẻ **Elements**, tìm một từ như "calendar" hoặc "place" để thêm biểu tượng nét, rồi đổi màu và độ dày nét ở bên phải.',
 'ru': 'На вкладке **Templates** 20 образцов, среди них карточка объявления, письмо родителям, афиша мероприятия, объявление о наборе, меню, грамота и титульный слайд. Они сделаны на шрифтах, которые поставляются с Hanpan (Pretendard, Noto Serif KR, Gowun Batang, Black Han Sans, Do Hyeon и другие), поэтому на любом компьютере выглядят одинаково. В разделе **Icons** на вкладке **Elements** найдите слово, например «calendar» или «place», чтобы добавить линейный значок, и справа измените его цвет и толщину линии.',
 'ar': 'تضم علامة **Templates** عشرين نموذجًا، منها بطاقة إعلان ورسالة إلى أولياء الأمور وملصق فعالية وإعلان توظيف ولوحة قائمة طعام وشهادة تقدير وغلاف عرض تقديمي. تستخدم النماذج الخطوط المرفقة مع Hanpan (Pretendard وNoto Serif KR وGowun Batang وBlack Han Sans وDo Hyeon وغيرها)، فتظهر بالشكل نفسه على أي حاسوب. في **Icons** ضمن علامة **Elements** ابحث عن كلمة مثل "calendar" أو "place" لإضافة أيقونة خطية، ثم غيّر لونها وسُمك خطها من اليمين.',
 'he': 'בלשונית **Templates** יש 20 דוגמאות, ביניהן כרטיס הודעה, מכתב להורים, כרזת אירוע, מודעת גיוס, תפריט, תעודת הוקרה ושער מצגת. הן משתמשות בגופנים שמגיעים עם Hanpan (Pretendard‏, Noto Serif KR‏, Gowun Batang‏, Black Han Sans‏, Do Hyeon ועוד), ולכן נראות אותו דבר בכל מחשב. תחת **Icons** בלשונית **Elements** חפשו מילה כמו "calendar" או "place" כדי להוסיף סמל קווי, ושנו את צבעו ואת עובי הקו מימין.',
 'hi': '**Templates** टैब में 20 नमूने हैं, जिनमें सूचना कार्ड, अभिभावकों को पत्र, कार्यक्रम पोस्टर, भर्ती सूचना, मेन्यू बोर्ड, प्रमाणपत्र और प्रस्तुति का मुखपृष्ठ शामिल हैं। ये Hanpan के साथ आने वाले फ़ॉन्ट (Pretendard, Noto Serif KR, Gowun Batang, Black Han Sans, Do Hyeon आदि) से बने हैं, इसलिए हर पीसी पर एक जैसे दिखते हैं। **Elements** टैब के **Icons** में "calendar" या "place" जैसे शब्द खोजकर रेखा वाला आइकन जोड़ें, फिर दाईं ओर उसका रंग और रेखा की मोटाई बदलें।',
 'th': 'แท็บ **Templates** มีตัวอย่าง 20 แบบ เช่น การ์ดประกาศ จดหมายถึงผู้ปกครอง โปสเตอร์งาน ประกาศรับสมัคร ป้ายเมนู เกียรติบัตร และหน้าปกงานนำเสนอ ตัวอย่างใช้ฟอนต์ที่มากับ Hanpan (Pretendard, Noto Serif KR, Gowun Batang, Black Han Sans, Do Hyeon และอื่น ๆ) จึงแสดงเหมือนกันในทุกเครื่อง ใน **Icons** ของแท็บ **Elements** ให้ค้นคำอย่าง "calendar" หรือ "place" เพื่อใส่ไอคอนเส้น แล้วเปลี่ยนสีและความหนาของเส้นได้ทางขวา',
}
assert set(DESIGN_LOOK) == set(T), set(T) ^ set(DESIGN_LOOK)
for lang, (_title, _intro, sections) in T.items():
    sections[4][2].append(DESIGN_LOOK[lang])

# The free fonts from Gongu (공유마당) bundled with the template fonts. The sentence on
# who released them is the attribution the KOGL type 1 fonts require (NOTICE has it too).
GONGU_ORGS = 'the Seoul Metropolitan Government, Gyeonggi Province and the Korea Heritage Service'
DESIGN_GONGU = {
 'ko': '**글꼴** 목록의 **공유마당 무료 글꼴** 묶음에는 본고딕, 서울남산체, 문화재돌봄체, 경기천년제목, 학교안심 포스터·칠판지우개·시간표가 있습니다. 한판에 들어 있어 내보낸 PNG·PDF에도 그대로 들어가고, 워드·엑셀·PPT의 글꼴 목록에도 나옵니다. 이 글꼴들은 서울특별시, 경기도, 문화재청(현 국가유산청)이 공공누리 제1유형으로, 한국교육학술정보원과 구글·어도비가 OFL로 개방한 것이며 공유마당(gongu.copyright.or.kr)에서 무료로 받을 수 있습니다.',
 'en': 'The **Free fonts from Gongu** group in the **Font** list has Noto Sans KR, Seoul Namsan, Munhwajae Dolbom, Gyeonggi Title and the Hakgyoansim Poster, Chilpanjiugae and Siganpyo fonts. They come with Hanpan, so exported PNG and PDF files keep them, and they also appear in the Word, Excel and PowerPoint font lists. They were released by ORGS under the Korea Open Government License type 1, and by KERIS and Google with Adobe under the SIL OFL, and can be downloaded free of charge from Gongu (gongu.copyright.or.kr).',
 'zh': '**Font** 列表中的 **Free fonts from Gongu** 组包含 Noto Sans KR、Seoul Namsan、Munhwajae Dolbom、Gyeonggi Title，以及 Hakgyoansim Poster、Chilpanjiugae 和 Siganpyo 字体。它们随 Hanpan 一起提供，因此导出的 PNG 和 PDF 会保留这些字体，Word、Excel 和 PowerPoint 的字体列表中也能看到它们。这些字体由 ORGS 以韩国公共许可（KOGL）第 1 类开放，由 KERIS 以及 Google 与 Adobe 以 SIL OFL 开放，可从 Gongu（gongu.copyright.or.kr）免费下载。',
 'zh-TW': '**Font** 清單中的 **Free fonts from Gongu** 群組包含 Noto Sans KR、Seoul Namsan、Munhwajae Dolbom、Gyeonggi Title，以及 Hakgyoansim Poster、Chilpanjiugae 與 Siganpyo 字型。它們隨 Hanpan 一起提供，因此匯出的 PNG 與 PDF 會保留這些字型，Word、Excel 與 PowerPoint 的字型清單中也會出現。這些字型由 ORGS 以韓國公共授權（KOGL）第 1 類開放，由 KERIS 以及 Google 與 Adobe 以 SIL OFL 開放，可從 Gongu（gongu.copyright.or.kr）免費下載。',
 'ja': '**Font** 一覧の **Free fonts from Gongu** グループには、Noto Sans KR、Seoul Namsan、Munhwajae Dolbom、Gyeonggi Title と、Hakgyoansim の Poster・Chilpanjiugae・Siganpyo があります。Hanpan に同梱されているため、書き出した PNG や PDF にもそのまま入り、Word・Excel・PowerPoint のフォント一覧にも表示されます。これらは ORGS が韓国公共ライセンス（KOGL）第 1 類で、KERIS と Google・Adobe が SIL OFL で公開したもので、Gongu（gongu.copyright.or.kr）から無料でダウンロードできます。',
 'fr': 'Le groupe **Free fonts from Gongu** de la liste **Font** contient Noto Sans KR, Seoul Namsan, Munhwajae Dolbom, Gyeonggi Title et les polices Hakgyoansim Poster, Chilpanjiugae et Siganpyo. Elles sont fournies avec Hanpan : les PNG et PDF exportés les conservent, et elles figurent aussi dans les listes de polices de Word, Excel et PowerPoint. Elles ont été publiées par ORGS sous la licence coréenne KOGL de type 1, et par KERIS ainsi que Google avec Adobe sous la licence SIL OFL ; elles sont téléchargeables gratuitement sur Gongu (gongu.copyright.or.kr).',
 'de': 'Die Gruppe **Free fonts from Gongu** in der Liste **Font** enthält Noto Sans KR, Seoul Namsan, Munhwajae Dolbom, Gyeonggi Title sowie die Schriften Hakgyoansim Poster, Chilpanjiugae und Siganpyo. Sie werden mit Hanpan geliefert, bleiben daher in exportierten PNG- und PDF-Dateien erhalten und erscheinen auch in den Schriftlisten von Word, Excel und PowerPoint. Veröffentlicht wurden sie von ORGS unter der koreanischen Lizenz KOGL Typ 1 sowie von KERIS und Google mit Adobe unter der SIL OFL; sie lassen sich kostenlos bei Gongu (gongu.copyright.or.kr) herunterladen.',
 'es': 'El grupo **Free fonts from Gongu** de la lista **Font** incluye Noto Sans KR, Seoul Namsan, Munhwajae Dolbom, Gyeonggi Title y las fuentes Hakgyoansim Poster, Chilpanjiugae y Siganpyo. Vienen con Hanpan, así que los PNG y PDF exportados las conservan, y también aparecen en las listas de fuentes de Word, Excel y PowerPoint. Las publicaron ORGS con la licencia coreana KOGL tipo 1, y KERIS y Google con Adobe con la licencia SIL OFL; se pueden descargar gratis desde Gongu (gongu.copyright.or.kr).',
 'it': "Il gruppo **Free fonts from Gongu** dell'elenco **Font** contiene Noto Sans KR, Seoul Namsan, Munhwajae Dolbom, Gyeonggi Title e i caratteri Hakgyoansim Poster, Chilpanjiugae e Siganpyo. Sono inclusi in Hanpan, quindi i PNG e i PDF esportati li mantengono, e compaiono anche negli elenchi dei caratteri di Word, Excel e PowerPoint. Sono stati pubblicati da ORGS con la licenza coreana KOGL di tipo 1, e da KERIS e da Google con Adobe con la licenza SIL OFL; si possono scaricare gratuitamente da Gongu (gongu.copyright.or.kr).",
 'pt': 'O grupo **Free fonts from Gongu** da lista **Font** traz Noto Sans KR, Seoul Namsan, Munhwajae Dolbom, Gyeonggi Title e as fontes Hakgyoansim Poster, Chilpanjiugae e Siganpyo. Elas acompanham o Hanpan, então os PNG e PDF exportados as mantêm, e elas também aparecem nas listas de fontes do Word, do Excel e do PowerPoint. Foram publicadas por ORGS sob a licença coreana KOGL tipo 1, e pela KERIS e pelo Google com a Adobe sob a licença SIL OFL; podem ser baixadas gratuitamente no Gongu (gongu.copyright.or.kr).',
 'nl': 'De groep **Free fonts from Gongu** in de lijst **Font** bevat Noto Sans KR, Seoul Namsan, Munhwajae Dolbom, Gyeonggi Title en de lettertypen Hakgyoansim Poster, Chilpanjiugae en Siganpyo. Ze horen bij Hanpan, dus geëxporteerde PNG- en PDF-bestanden behouden ze, en ze staan ook in de lettertypelijsten van Word, Excel en PowerPoint. Ze zijn uitgebracht door ORGS onder de Koreaanse licentie KOGL type 1, en door KERIS en Google met Adobe onder de SIL OFL; je kunt ze gratis downloaden van Gongu (gongu.copyright.or.kr).',
 'pl': 'Grupa **Free fonts from Gongu** na liście **Font** zawiera Noto Sans KR, Seoul Namsan, Munhwajae Dolbom, Gyeonggi Title oraz czcionki Hakgyoansim Poster, Chilpanjiugae i Siganpyo. Są dołączone do Hanpan, więc eksportowane pliki PNG i PDF je zachowują, a do tego pojawiają się na listach czcionek w Wordzie, Excelu i PowerPoincie. Udostępnili je ORGS na koreańskiej licencji KOGL typu 1 oraz KERIS i Google wraz z Adobe na licencji SIL OFL; można je bezpłatnie pobrać z serwisu Gongu (gongu.copyright.or.kr).',
 'cs': 'Skupina **Free fonts from Gongu** v seznamu **Font** obsahuje Noto Sans KR, Seoul Namsan, Munhwajae Dolbom, Gyeonggi Title a písma Hakgyoansim Poster, Chilpanjiugae a Siganpyo. Dodávají se s Hanpanem, takže je exportované soubory PNG a PDF zachovají, a objeví se i v seznamech písem ve Wordu, Excelu a PowerPointu. Vydali je ORGS pod korejskou licencí KOGL typu 1 a KERIS spolu s Googlem a Adobe pod licencí SIL OFL; zdarma je lze stáhnout ze služby Gongu (gongu.copyright.or.kr).',
 'id': 'Grup **Free fonts from Gongu** di daftar **Font** berisi Noto Sans KR, Seoul Namsan, Munhwajae Dolbom, Gyeonggi Title, serta font Hakgyoansim Poster, Chilpanjiugae, dan Siganpyo. Font ini disertakan dalam Hanpan, jadi PNG dan PDF hasil ekspor tetap memakainya, dan font ini juga muncul di daftar font Word, Excel, dan PowerPoint. Font ini dirilis oleh ORGS dengan lisensi Korea KOGL tipe 1, serta oleh KERIS dan Google bersama Adobe dengan lisensi SIL OFL, dan dapat diunduh gratis dari Gongu (gongu.copyright.or.kr).',
 'ms': 'Kumpulan **Free fonts from Gongu** dalam senarai **Font** mengandungi Noto Sans KR, Seoul Namsan, Munhwajae Dolbom, Gyeonggi Title serta fon Hakgyoansim Poster, Chilpanjiugae dan Siganpyo. Fon ini disertakan bersama Hanpan, jadi PNG dan PDF yang dieksport mengekalkannya, dan fon ini turut muncul dalam senarai fon Word, Excel dan PowerPoint. Fon ini dikeluarkan oleh ORGS di bawah lesen Korea KOGL jenis 1, dan oleh KERIS serta Google bersama Adobe di bawah lesen SIL OFL, dan boleh dimuat turun secara percuma daripada Gongu (gongu.copyright.or.kr).',
 'vi': 'Nhóm **Free fonts from Gongu** trong danh sách **Font** có Noto Sans KR, Seoul Namsan, Munhwajae Dolbom, Gyeonggi Title và các phông Hakgyoansim Poster, Chilpanjiugae, Siganpyo. Các phông này đi kèm Hanpan nên tệp PNG và PDF xuất ra vẫn giữ nguyên, và chúng cũng có trong danh sách phông của Word, Excel và PowerPoint. Chúng do ORGS phát hành theo giấy phép KOGL loại 1 của Hàn Quốc, và do KERIS cùng Google và Adobe phát hành theo giấy phép SIL OFL; có thể tải miễn phí từ Gongu (gongu.copyright.or.kr).',
 'ru': 'В группе **Free fonts from Gongu** списка **Font** есть Noto Sans KR, Seoul Namsan, Munhwajae Dolbom, Gyeonggi Title и шрифты Hakgyoansim Poster, Chilpanjiugae и Siganpyo. Они входят в Hanpan, поэтому сохраняются в экспортированных PNG и PDF, а также появляются в списках шрифтов Word, Excel и PowerPoint. Их выпустили ORGS по корейской лицензии KOGL типа 1, а также KERIS и Google вместе с Adobe по лицензии SIL OFL; скачать их можно бесплатно на сайте Gongu (gongu.copyright.or.kr).',
 'ar': 'تضم مجموعة **Free fonts from Gongu** في قائمة **Font** الخطوط Noto Sans KR وSeoul Namsan وMunhwajae Dolbom وGyeonggi Title، وخطوط Hakgyoansim Poster وChilpanjiugae وSiganpyo. تأتي هذه الخطوط مع Hanpan، لذا تبقى في ملفات PNG وPDF المصدَّرة، وتظهر أيضًا في قوائم الخطوط في Word وExcel وPowerPoint. أصدرتها ORGS بموجب الترخيص الكوري KOGL من النوع 1، وأصدرتها KERIS وGoogle مع Adobe بموجب ترخيص SIL OFL، ويمكن تنزيلها مجانًا من Gongu (gongu.copyright.or.kr).',
 'he': 'בקבוצה **Free fonts from Gongu** ברשימה **Font** יש את Noto Sans KR, Seoul Namsan, Munhwajae Dolbom, Gyeonggi Title ואת הגופנים Hakgyoansim Poster, Chilpanjiugae ו-Siganpyo. הם מגיעים עם Hanpan, ולכן קובצי PNG ו-PDF מיוצאים שומרים עליהם, והם מופיעים גם ברשימות הגופנים של Word, Excel ו-PowerPoint. הם שוחררו על ידי ORGS ברישיון הקוריאני KOGL מסוג 1, ועל ידי KERIS ו-Google יחד עם Adobe ברישיון SIL OFL, ואפשר להוריד אותם בחינם מ-Gongu (gongu.copyright.or.kr).',
 'hi': '**Font** सूची के **Free fonts from Gongu** समूह में Noto Sans KR, Seoul Namsan, Munhwajae Dolbom, Gyeonggi Title और Hakgyoansim Poster, Chilpanjiugae तथा Siganpyo फ़ॉन्ट हैं। ये Hanpan के साथ आते हैं, इसलिए निर्यात की गई PNG और PDF फ़ाइलों में बने रहते हैं, और Word, Excel तथा PowerPoint की फ़ॉन्ट सूचियों में भी दिखते हैं। इन्हें ORGS ने कोरियाई लाइसेंस KOGL टाइप 1 के तहत, और KERIS तथा Google ने Adobe के साथ SIL OFL के तहत जारी किया है; इन्हें Gongu (gongu.copyright.or.kr) से मुफ़्त डाउनलोड किया जा सकता है।',
 'th': 'กลุ่ม **Free fonts from Gongu** ในรายการ **Font** มี Noto Sans KR, Seoul Namsan, Munhwajae Dolbom, Gyeonggi Title และฟอนต์ Hakgyoansim Poster, Chilpanjiugae และ Siganpyo ฟอนต์เหล่านี้มาพร้อมกับ Hanpan ไฟล์ PNG และ PDF ที่ส่งออกจึงยังคงใช้ฟอนต์เดิม และยังปรากฏในรายการฟอนต์ของ Word, Excel และ PowerPoint ด้วย ฟอนต์เหล่านี้เผยแพร่โดย ORGS ภายใต้สัญญาอนุญาต KOGL ประเภท 1 ของเกาหลี และโดย KERIS และ Google ร่วมกับ Adobe ภายใต้สัญญาอนุญาต SIL OFL ดาวน์โหลดได้ฟรีจาก Gongu (gongu.copyright.or.kr)',
}
assert set(DESIGN_GONGU) == set(T), set(T) ^ set(DESIGN_GONGU)
for lang, (_title, _intro, sections) in T.items():
    sections[4][2].append(DESIGN_GONGU[lang].replace('ORGS', GONGU_ORGS))

# editing the map itself: the ribbon tabs, find and replace, pictures, sorting and
# what the View tab shows. The button names are read from the editor's own strings.
APP_STRINGS = pathlib.Path(__file__).resolve().parent.parent / 'apps/mindmap/src/renderer/i18n/app'
LABEL_KEYS = {'home': 'tabHome', 'insert': 'tabInsert', 'format': 'tabFormat', 'view': 'tabView',
              'picture': 'tbPicture', 'icons': 'tbIcons', 'sort': 'tbSort', 'levels': 'tbFoldLevels', 'show': 'tbShowParts',
              'style': 'tabStyle', 'painter': 'tbPainter', 'boundary': 'tbBoundary'}


def editor_labels(lang):
    import re
    text = (APP_STRINGS / f'{lang}.ts').read_text(encoding='utf8')
    out = {}
    for name, key in LABEL_KEYS.items():
        found = re.search(rf"^\s*{key}: (['\"])(.*?)\1,$", text, re.M)
        assert found, (lang, key)
        out[name] = found.group(2)
    return out


MAP_EDIT = {
 'ko': ('마인드맵 고치기', [
  '마인드맵 위쪽 띠는 **{home}**·**{insert}**·**{format}**·**{view}** 탭으로 나뉩니다. Ctrl+F로 모든 시트의 토픽 제목을, 원하면 메모까지 찾고, Ctrl+H로 바꿉니다. 접힌 가지 안에 있는 토픽은 찾아가면 가지가 펼쳐집니다.',
  '**{insert} › {picture}** 단추는 고른 토픽에 PNG·JPG·GIF 그림(10MB까지)을 넣고, 그림이 있으면 뺍니다. **{format} › {sort}** 단추는 고른 토픽의 가지를 가나다순으로 놓고, 한 번 더 누르면 거꾸로 놓습니다.',
  '**{view} › {levels}**로 1·2·3단계까지만 펼쳐 보고, **{view} › {show}**로 메모·라벨·링크·아이콘·그림을 화면에서만 감춥니다. 감춰도 파일에는 그대로 남습니다.',
  '**{insert} › {icons}** 단추는 아이콘 패널을 엽니다. 우선순위·진행률·깃발·별·스마일·화살표가 있고, 한 토픽에는 종류마다 하나씩 붙습니다. 붙은 것을 다시 누르면 떼고, 지도 위 아이콘을 누르면 같은 종류의 다른 것으로 바꾸거나 뗄 수 있습니다.',
  '**{style}** 탭에서는 고른 토픽의 모양·채우기·윤곽선·글꼴·굵게·기울임·밑줄·글자색·가지 선 색을 바꿉니다. **{style} › {painter}**는 한 토픽의 서식을 다음에 누른 토픽에 옮기고, 두 번 누르면 Esc를 누를 때까지 계속 옮깁니다. **{home} › {boundary}**는 고른 형제 토픽을 상자로 묶습니다. 테두리를 두 번 누르면 이름을 붙이고, 눌러 고른 뒤 Delete로 지웁니다.']),
 'en': ('Editing the mind map', [
  'The band above the map has the **{home}**, **{insert}**, **{format}** and **{view}** tabs. Ctrl+F finds topic titles on every sheet, and notes too if you tick it; Ctrl+H replaces. Going to a topic inside a folded branch unfolds the branch.',
  '**{insert} › {picture}** puts a PNG, JPG or GIF picture (10 MB at most) on the selected topic, or takes off the one it has. **{format} › {sort}** puts the branches of the selected topic in alphabetical order; press it again for the reverse order.',
  '**{view} › {levels}** unfolds the map down to level 1, 2 or 3, and **{view} › {show}** hides notes, labels, links, icons or pictures on screen only. The file keeps them all.',
  '**{insert} › {icons}** opens the icon panel: priority, progress, flags, stars, smileys and arrows. A topic takes one icon of each kind; press one it has to take it off. Click an icon on the map to swap it for another of its kind or remove it.',
  'The **{style}** tab changes how the selected topics look: shape, fill, outline, font, bold, italic, underline, text colour and branch line colour. **{style} › {painter}** copies the look of one topic to the next topic you click; double-click it to keep it on until Esc. **{home} › {boundary}** draws a box round the selected sibling topics; double-click the box to name it, or click it and press Delete to remove it.']),
 'zh': ('编辑思维导图', [
  '导图上方的功能区分为 **{home}**、**{insert}**、**{format}**、**{view}** 选项卡。Ctrl+F 查找所有工作表的主题标题，勾选后也查找备注；Ctrl+H 替换。跳到折叠分支中的主题时，该分支会展开。',
  '**{insert} › {picture}** 给所选主题加上 PNG、JPG 或 GIF 图片（最大 10 MB），已有图片时则移除。**{format} › {sort}** 按字母顺序排列所选主题的分支，再按一次则倒序排列。',
  '**{view} › {levels}** 只展开到第 1、2 或 3 层，**{view} › {show}** 只在屏幕上隐藏备注、标签、链接、图标或图片。文件中的内容保持不变。',
  '**{insert} › {icons}** 打开图标面板：优先级、进度、旗帜、星星、表情和箭头。每个主题每类图标只能有一个；再次点击已有的图标即可移除。点击导图上的图标，可换成同类的其他图标或将其移除。',
  '**{style}** 选项卡可更改所选主题的形状、填充、轮廓、字体、粗体、斜体、下划线、文字颜色和分支线颜色。**{style} › {painter}** 把一个主题的格式复制到下一个点击的主题；双击则一直有效，直到按 Esc。**{home} › {boundary}** 用方框圈住所选的同级主题；双击方框可命名，点击后按 Delete 删除。']),
 'zh-TW': ('編輯心智圖', [
  '心智圖上方的功能區分為 **{home}**、**{insert}**、**{format}**、**{view}** 索引標籤。Ctrl+F 尋找所有工作表的主題標題，勾選後也尋找備註；Ctrl+H 取代。跳到摺疊分支中的主題時，該分支會展開。',
  '**{insert} › {picture}** 為所選主題加上 PNG、JPG 或 GIF 圖片（最大 10 MB），已有圖片時則移除。**{format} › {sort}** 依字母順序排列所選主題的分支，再按一次則反向排列。',
  '**{view} › {levels}** 只展開到第 1、2 或 3 層，**{view} › {show}** 只在畫面上隱藏備註、標籤、連結、圖示或圖片。檔案中的內容保持不變。',
  '**{insert} › {icons}** 開啟圖示面板：優先順序、進度、旗幟、星星、表情和箭頭。每個主題每類圖示只能有一個；再次點選已有的圖示即可移除。點選心智圖上的圖示，可換成同類的其他圖示或將其移除。',
  '**{style}** 索引標籤可變更所選主題的形狀、填色、外框、字型、粗體、斜體、底線、文字色彩與分支線色彩。**{style} › {painter}** 將一個主題的格式複製到下一個點選的主題；按兩下則一直有效，直到按 Esc。**{home} › {boundary}** 以方框圈住所選的同層主題；按兩下方框可命名，點選後按 Delete 刪除。']),
 'ja': ('マインドマップを編集する', [
  'マップ上部のリボンは **{home}**・**{insert}**・**{format}**・**{view}** タブに分かれています。Ctrl+F ですべてのシートのトピック名を、チェックすればメモも検索し、Ctrl+H で置換します。折りたたまれた枝の中のトピックに移動すると、その枝が開きます。',
  '**{insert} › {picture}** は選んだトピックに PNG・JPG・GIF の画像（10 MB まで）を入れ、画像があれば外します。**{format} › {sort}** は選んだトピックの枝を五十音・アルファベット順に並べ、もう一度押すと逆順に並べます。',
  '**{view} › {levels}** で 1・2・3 階層目まで開き、**{view} › {show}** でメモ・ラベル・リンク・アイコン・画像を画面上だけ隠します。ファイルにはそのまま残ります。',
  '**{insert} › {icons}** でアイコンパネルが開きます。優先度・進捗・旗・星・顔・矢印があり、一つのトピックには種類ごとに一つだけ付きます。付いているものをもう一度押すと外れ、マップ上のアイコンを押すと同じ種類の別のものに替えたり外したりできます。',
  '**{style}** タブでは、選んだトピックの形・塗り・枠線・フォント・太字・斜体・下線・文字色・枝線の色を変えます。**{style} › {painter}** は一つのトピックの書式を次にクリックしたトピックに写します。ダブルクリックすると Esc を押すまで写し続けます。**{home} › {boundary}** は選んだ兄弟トピックを枠で囲みます。枠をダブルクリックすると名前を付け、クリックして Delete を押すと消します。']),
 'fr': ('Modifier la carte mentale', [
  'Le ruban au-dessus de la carte comporte les onglets **{home}**, **{insert}**, **{format}** et **{view}**. Ctrl+F cherche les titres des sujets sur toutes les feuilles, et les notes si vous le cochez ; Ctrl+H remplace. Aller à un sujet dans une branche repliée déplie la branche.',
  "**{insert} › {picture}** ajoute une image PNG, JPG ou GIF (10 Mo au plus) au sujet sélectionné, ou retire celle qu'il a. **{format} › {sort}** range les branches du sujet sélectionné par ordre alphabétique ; appuyez de nouveau pour l'ordre inverse.",
  "**{view} › {levels}** déplie la carte jusqu'au niveau 1, 2 ou 3, et **{view} › {show}** masque les notes, étiquettes, liens, icônes ou images à l'écran seulement. Le fichier les garde tous.",
  "**{insert} › {icons}** ouvre le panneau des icônes : priorité, avancement, drapeaux, étoiles, émoticônes et flèches. Un sujet prend une icône de chaque sorte ; appuyez sur celle qu'il a pour la retirer. Cliquez sur une icône de la carte pour la changer contre une autre de sa sorte ou la retirer.",
  "L'onglet **{style}** change l'aspect des sujets sélectionnés : forme, remplissage, contour, police, gras, italique, souligné, couleur du texte et des branches. **{style} › {painter}** copie la mise en forme d'un sujet sur le prochain sujet cliqué ; un double-clic le garde actif jusqu'à Échap. **{home} › {boundary}** entoure d'un cadre les sujets frères sélectionnés ; double-cliquez sur le cadre pour le nommer, ou cliquez dessus et appuyez sur Suppr pour le retirer."]),
 'de': ('Die Mindmap bearbeiten', [
  'Das Menüband über der Karte hat die Registerkarten **{home}**, **{insert}**, **{format}** und **{view}**. Strg+F sucht Thementitel auf allen Blättern, auf Wunsch auch in Notizen; Strg+H ersetzt. Wer zu einem Thema in einem eingeklappten Zweig springt, klappt den Zweig auf.',
  '**{insert} › {picture}** setzt ein PNG-, JPG- oder GIF-Bild (höchstens 10 MB) auf das gewählte Thema oder nimmt das vorhandene ab. **{format} › {sort}** ordnet die Zweige des gewählten Themas alphabetisch; erneut drücken ordnet umgekehrt.',
  '**{view} › {levels}** klappt die Karte bis Ebene 1, 2 oder 3 auf, und **{view} › {show}** blendet Notizen, Etiketten, Links, Symbole oder Bilder nur am Bildschirm aus. Die Datei behält alles.',
  '**{insert} › {icons}** öffnet den Symbolbereich: Priorität, Fortschritt, Flaggen, Sterne, Smileys und Pfeile. Ein Thema trägt ein Symbol je Art; ein vorhandenes erneut drücken nimmt es ab. Ein Klick auf ein Symbol in der Karte tauscht es gegen ein anderes seiner Art oder entfernt es.',
  'Die Registerkarte **{style}** ändert das Aussehen der ausgewählten Themen: Form, Füllung, Umriss, Schrift, fett, kursiv, unterstrichen, Text- und Zweigfarbe. **{style} › {painter}** überträgt das Format eines Themas auf das nächste angeklickte Thema; ein Doppelklick lässt es an, bis Esc gedrückt wird. **{home} › {boundary}** zieht einen Rahmen um die ausgewählten Geschwisterthemen; ein Doppelklick auf den Rahmen benennt ihn, ein Klick und Entf entfernt ihn.']),
 'es': ('Editar el mapa mental', [
  'La cinta sobre el mapa tiene las pestañas **{home}**, **{insert}**, **{format}** y **{view}**. Ctrl+F busca títulos de temas en todas las hojas, y también notas si lo marcas; Ctrl+H reemplaza. Ir a un tema dentro de una rama plegada despliega la rama.',
  '**{insert} › {picture}** pone una imagen PNG, JPG o GIF (10 MB como máximo) en el tema seleccionado, o quita la que tiene. **{format} › {sort}** ordena alfabéticamente las ramas del tema seleccionado; púlsalo otra vez para el orden inverso.',
  '**{view} › {levels}** despliega el mapa hasta el nivel 1, 2 o 3, y **{view} › {show}** oculta notas, etiquetas, enlaces, iconos o imágenes solo en pantalla. El archivo los conserva todos.',
  '**{insert} › {icons}** abre el panel de iconos: prioridad, progreso, banderas, estrellas, caras y flechas. Un tema lleva un icono de cada tipo; pulsa uno que ya tenga para quitarlo. Haz clic en un icono del mapa para cambiarlo por otro de su tipo o quitarlo.',
  'La pestaña **{style}** cambia el aspecto de los temas seleccionados: forma, relleno, contorno, fuente, negrita, cursiva, subrayado y color del texto y de las ramas. **{style} › {painter}** copia el formato de un tema al siguiente tema en que hagas clic; con doble clic sigue activo hasta pulsar Esc. **{home} › {boundary}** rodea con un marco los temas hermanos seleccionados; haz doble clic en el marco para ponerle nombre, o haz clic y pulsa Supr para quitarlo.']),
 'it': ('Modificare la mappa mentale', [
  'La barra multifunzione sopra la mappa ha le schede **{home}**, **{insert}**, **{format}** e **{view}**. Ctrl+F cerca i titoli degli argomenti in tutti i fogli, e anche le note se lo spunti; Ctrl+H sostituisce. Andare a un argomento in un ramo chiuso apre il ramo.',
  "**{insert} › {picture}** mette un'immagine PNG, JPG o GIF (al massimo 10 MB) sull'argomento selezionato, o toglie quella che ha. **{format} › {sort}** ordina alfabeticamente i rami dell'argomento selezionato; premilo di nuovo per l'ordine inverso.",
  '**{view} › {levels}** apre la mappa fino al livello 1, 2 o 3, e **{view} › {show}** nasconde note, etichette, collegamenti, icone o immagini solo sullo schermo. Il file li conserva tutti.',
  "**{insert} › {icons}** apre il pannello delle icone: priorità, avanzamento, bandiere, stelle, faccine e frecce. Un argomento ha un'icona per tipo; premi quella che ha già per toglierla. Fai clic su un'icona nella mappa per cambiarla con un'altra del suo tipo o toglierla.",
  "La scheda **{style}** cambia l'aspetto degli argomenti selezionati: forma, riempimento, contorno, carattere, grassetto, corsivo, sottolineato, colore del testo e dei rami. **{style} › {painter}** copia il formato di un argomento sul prossimo argomento su cui fai clic; con un doppio clic resta attivo fino a Esc. **{home} › {boundary}** racchiude in un riquadro gli argomenti fratelli selezionati; fai doppio clic sul riquadro per dargli un nome, oppure fai clic e premi Canc per toglierlo."]),
 'pt': ('Editar o mapa mental', [
  'A faixa acima do mapa tem as abas **{home}**, **{insert}**, **{format}** e **{view}**. Ctrl+F procura títulos de tópicos em todas as folhas, e também notas se você marcar; Ctrl+H substitui. Ir a um tópico dentro de um ramo recolhido expande o ramo.',
  '**{insert} › {picture}** coloca uma imagem PNG, JPG ou GIF (no máximo 10 MB) no tópico selecionado, ou tira a que ele tem. **{format} › {sort}** põe os ramos do tópico selecionado em ordem alfabética; toque de novo para a ordem inversa.',
  '**{view} › {levels}** expande o mapa até o nível 1, 2 ou 3, e **{view} › {show}** oculta notas, rótulos, links, ícones ou imagens só na tela. O arquivo mantém tudo.',
  '**{insert} › {icons}** abre o painel de ícones: prioridade, progresso, bandeiras, estrelas, carinhas e setas. Um tópico leva um ícone de cada tipo; toque num que ele já tem para tirá-lo. Clique num ícone do mapa para trocá-lo por outro do mesmo tipo ou tirá-lo.',
  'O separador **{style}** muda o aspeto dos tópicos selecionados: forma, preenchimento, contorno, tipo de letra, negrito, itálico, sublinhado e cor do texto e dos ramos. **{style} › {painter}** copia o formato de um tópico para o próximo tópico em que clicares; com duplo clique fica ativo até premires Esc. **{home} › {boundary}** põe uma moldura à volta dos tópicos irmãos selecionados; faz duplo clique na moldura para lhe dar nome, ou clica nela e prime Delete para a tirar.']),
 'nl': ('De mindmap bewerken', [
  'Het lint boven de kaart heeft de tabbladen **{home}**, **{insert}**, **{format}** en **{view}**. Ctrl+F zoekt onderwerptitels op alle bladen, en ook notities als u dat aanvinkt; Ctrl+H vervangt. Naar een onderwerp in een samengevouwen tak gaan, vouwt de tak open.',
  '**{insert} › {picture}** zet een PNG-, JPG- of GIF-afbeelding (hooguit 10 MB) op het gekozen onderwerp, of haalt de bestaande weg. **{format} › {sort}** zet de takken van het gekozen onderwerp op alfabetische volgorde; druk nogmaals voor de omgekeerde volgorde.',
  '**{view} › {levels}** vouwt de kaart open tot niveau 1, 2 of 3, en **{view} › {show}** verbergt notities, labels, koppelingen, pictogrammen of afbeeldingen alleen op het scherm. Het bestand houdt ze allemaal.',
  '**{insert} › {icons}** opent het paneel met pictogrammen: prioriteit, voortgang, vlaggen, sterren, smileys en pijlen. Een onderwerp krijgt er één van elke soort; druk op een die het al heeft om het weg te halen. Klik op een pictogram in de kaart om het te wisselen voor een ander van dezelfde soort of weg te halen.',
  'Het tabblad **{style}** verandert het uiterlijk van de gekozen onderwerpen: vorm, vulling, omtrek, lettertype, vet, cursief, onderstreept, tekstkleur en takkleur. **{style} › {painter}** neemt de opmaak van één onderwerp over op het volgende onderwerp waarop je klikt; dubbelklik om het aan te laten tot Esc. **{home} › {boundary}** zet een kader om de gekozen onderwerpen naast elkaar; dubbelklik op het kader om het een naam te geven, of klik erop en druk op Delete om het weg te halen.']),
 'pl': ('Edycja mapy myśli', [
  'Wstążka nad mapą ma karty **{home}**, **{insert}**, **{format}** i **{view}**. Ctrl+F szuka tytułów tematów na wszystkich arkuszach, a po zaznaczeniu także w notatkach; Ctrl+H zamienia. Przejście do tematu w zwiniętej gałęzi rozwija tę gałąź.',
  '**{insert} › {picture}** dodaje do zaznaczonego tematu obraz PNG, JPG lub GIF (najwyżej 10 MB) albo usuwa ten, który ma. **{format} › {sort}** układa gałęzie zaznaczonego tematu alfabetycznie; naciśnij ponownie, aby odwrócić kolejność.',
  '**{view} › {levels}** rozwija mapę do poziomu 1, 2 lub 3, a **{view} › {show}** ukrywa notatki, etykiety, linki, ikony lub obrazy tylko na ekranie. Plik zachowuje je wszystkie.',
  '**{insert} › {icons}** otwiera panel ikon: priorytet, postęp, flagi, gwiazdki, buźki i strzałki. Temat ma jedną ikonę każdego rodzaju; naciśnij tę, którą już ma, aby ją usunąć. Kliknij ikonę na mapie, aby zamienić ją na inną tego samego rodzaju albo usunąć.',
  'Karta **{style}** zmienia wygląd wybranych tematów: kształt, wypełnienie, obrys, czcionkę, pogrubienie, kursywę, podkreślenie, kolor tekstu i kolor gałęzi. **{style} › {painter}** przenosi formatowanie jednego tematu na następny kliknięty temat; dwukrotne kliknięcie zostawia go włączonego do naciśnięcia Esc. **{home} › {boundary}** otacza ramką wybrane tematy z jednej gałęzi; kliknij ramkę dwukrotnie, aby ją nazwać, albo kliknij ją i naciśnij Delete, aby ją usunąć.']),
 'cs': ('Úpravy myšlenkové mapy', [
  'Pás nad mapou má karty **{home}**, **{insert}**, **{format}** a **{view}**. Ctrl+F hledá názvy témat na všech listech, po zaškrtnutí i v poznámkách; Ctrl+H nahrazuje. Přechod na téma ve sbalené větvi tuto větev rozbalí.',
  '**{insert} › {picture}** vloží k vybranému tématu obrázek PNG, JPG nebo GIF (nejvýše 10 MB), nebo odebere ten, který má. **{format} › {sort}** seřadí větve vybraného tématu abecedně; dalším stisknutím v opačném pořadí.',
  '**{view} › {levels}** rozbalí mapu do úrovně 1, 2 nebo 3 a **{view} › {show}** skryje poznámky, štítky, odkazy, ikony nebo obrázky jen na obrazovce. Soubor je zachová všechny.',
  '**{insert} › {icons}** otevře panel ikon: priorita, průběh, vlajky, hvězdy, smajlíci a šipky. Téma nese jednu ikonu od každého druhu; stisknutím té, kterou už má, ji odeberete. Kliknutím na ikonu v mapě ji vyměníte za jinou téhož druhu nebo ji odeberete.',
  'Karta **{style}** mění vzhled vybraných témat: tvar, výplň, obrys, písmo, tučné, kurzívu, podtržení, barvu textu a barvu větví. **{style} › {painter}** přenese formát jednoho tématu na další téma, na které kliknete; dvojklikem zůstane zapnutý až do Esc. **{home} › {boundary}** ohraničí vybraná sourozenecká témata rámečkem; dvojklikem na rámeček ho pojmenujete, kliknutím a klávesou Delete ho odeberete.']),
 'id': ('Mengedit peta pikiran', [
  'Pita di atas peta berisi tab **{home}**, **{insert}**, **{format}**, dan **{view}**. Ctrl+F mencari judul topik di semua lembar, dan juga catatan jika dicentang; Ctrl+H mengganti. Membuka topik di dalam cabang yang terlipat akan membentangkan cabang itu.',
  '**{insert} › {picture}** memasang gambar PNG, JPG, atau GIF (paling besar 10 MB) pada topik terpilih, atau melepas gambar yang sudah ada. **{format} › {sort}** mengurutkan cabang topik terpilih menurut abjad; tekan lagi untuk urutan terbalik.',
  '**{view} › {levels}** membentangkan peta sampai tingkat 1, 2, atau 3, dan **{view} › {show}** menyembunyikan catatan, label, tautan, ikon, atau gambar hanya di layar. Berkasnya tetap menyimpan semuanya.',
  '**{insert} › {icons}** membuka panel ikon: prioritas, kemajuan, bendera, bintang, wajah, dan panah. Satu topik membawa satu ikon dari tiap jenis; tekan ikon yang sudah ada untuk melepasnya. Klik ikon di peta untuk menggantinya dengan ikon lain sejenis atau melepasnya.',
  'Tab **{style}** mengubah tampilan topik yang dipilih: bentuk, isian, garis tepi, fon, tebal, miring, garis bawah, warna teks, dan warna garis cabang. **{style} › {painter}** menyalin format satu topik ke topik berikutnya yang Anda klik; klik dua kali agar tetap aktif sampai Esc. **{home} › {boundary}** membingkai topik sejajar yang dipilih; klik dua kali bingkai untuk memberinya nama, atau klik lalu tekan Delete untuk menghapusnya.']),
 'ms': ('Menyunting peta minda', [
  'Reben di atas peta mempunyai tab **{home}**, **{insert}**, **{format}** dan **{view}**. Ctrl+F mencari tajuk topik pada semua helaian, dan juga nota jika ditanda; Ctrl+H menggantikan. Pergi ke topik dalam cabang yang dilipat akan membuka cabang itu.',
  '**{insert} › {picture}** meletakkan gambar PNG, JPG atau GIF (paling besar 10 MB) pada topik yang dipilih, atau menanggalkan gambar yang sedia ada. **{format} › {sort}** menyusun cabang topik yang dipilih mengikut abjad; tekan sekali lagi untuk susunan terbalik.',
  '**{view} › {levels}** membuka peta hingga tahap 1, 2 atau 3, dan **{view} › {show}** menyembunyikan nota, label, pautan, ikon atau gambar pada skrin sahaja. Fail tetap menyimpan semuanya.',
  '**{insert} › {icons}** membuka panel ikon: keutamaan, kemajuan, bendera, bintang, wajah dan anak panah. Satu topik membawa satu ikon bagi setiap jenis; tekan ikon yang sudah ada untuk menanggalkannya. Klik ikon pada peta untuk menukarnya dengan ikon lain yang sejenis atau menanggalkannya.',
  'Tab **{style}** menukar rupa topik yang dipilih: bentuk, isian, garis luar, fon, tebal, condong, garis bawah, warna teks dan warna garis cabang. **{style} › {painter}** menyalin format satu topik ke topik seterusnya yang anda klik; klik dua kali supaya ia kekal aktif hingga Esc. **{home} › {boundary}** membingkai topik sejajar yang dipilih; klik dua kali bingkai untuk menamakannya, atau klik dan tekan Delete untuk membuangnya.']),
 'vi': ('Chỉnh sửa sơ đồ tư duy', [
  'Dải phía trên sơ đồ có các thẻ **{home}**, **{insert}**, **{format}** và **{view}**. Ctrl+F tìm tiêu đề chủ đề trên mọi trang tính, và cả ghi chú nếu bạn đánh dấu; Ctrl+H thay thế. Đi tới một chủ đề trong nhánh đang thu gọn sẽ mở nhánh đó ra.',
  '**{insert} › {picture}** gắn hình PNG, JPG hoặc GIF (tối đa 10 MB) vào chủ đề đang chọn, hoặc gỡ hình đang có. **{format} › {sort}** xếp các nhánh của chủ đề đang chọn theo thứ tự chữ cái; nhấn lần nữa để xếp ngược lại.',
  '**{view} › {levels}** mở sơ đồ đến cấp 1, 2 hoặc 3, và **{view} › {show}** ẩn ghi chú, nhãn, liên kết, biểu tượng hoặc hình chỉ trên màn hình. Tệp vẫn giữ nguyên tất cả.',
  '**{insert} › {icons}** mở bảng biểu tượng: ưu tiên, tiến độ, cờ, sao, mặt cười và mũi tên. Mỗi chủ đề có một biểu tượng cho mỗi loại; nhấn lại biểu tượng đang có để gỡ. Nhấp vào biểu tượng trên sơ đồ để đổi sang biểu tượng khác cùng loại hoặc gỡ nó.',
  'Thẻ **{style}** đổi dáng vẻ của các chủ đề đang chọn: hình dạng, màu nền, viền, phông chữ, đậm, nghiêng, gạch chân, màu chữ và màu đường nhánh. **{style} › {painter}** chép định dạng của một chủ đề sang chủ đề bạn nhấp tiếp theo; nhấp đúp để giữ bật cho đến khi nhấn Esc. **{home} › {boundary}** đóng khung các chủ đề cùng cấp đang chọn; nhấp đúp vào khung để đặt tên, hoặc nhấp vào rồi nhấn Delete để xoá.']),
 'ru': ('Правка интеллект-карты', [
  'Лента над картой состоит из вкладок **{home}**, **{insert}**, **{format}** и **{view}**. Ctrl+F ищет названия тем на всех листах, а если отметить, то и в заметках; Ctrl+H заменяет. Переход к теме в свёрнутой ветке раскрывает эту ветку.',
  '**{insert} › {picture}** ставит на выбранную тему рисунок PNG, JPG или GIF (не больше 10 МБ) или снимает уже стоящий. **{format} › {sort}** располагает ветки выбранной темы по алфавиту; повторное нажатие — в обратном порядке.',
  '**{view} › {levels}** раскрывает карту до уровня 1, 2 или 3, а **{view} › {show}** скрывает заметки, метки, ссылки, значки или рисунки только на экране. В файле всё остаётся.',
  '**{insert} › {icons}** открывает панель значков: приоритет, ход работы, флажки, звёзды, смайлики и стрелки. У темы по одному значку каждого вида; повторное нажатие на имеющийся снимает его. Щелчок по значку на карте меняет его на другой того же вида или снимает.',
  'Вкладка **{style}** меняет вид выбранных тем: форму, заливку, контур, шрифт, жирный, курсив, подчёркивание, цвет текста и цвет ветвей. **{style} › {painter}** переносит оформление одной темы на следующую тему, по которой вы щёлкнете; двойной щелчок оставляет его включённым до Esc. **{home} › {boundary}** обводит рамкой выбранные соседние темы; двойной щелчок по рамке даёт ей название, щелчок и Delete удаляют её.']),
 'ar': ('تحرير الخريطة الذهنية', [
  'يضم الشريط أعلى الخريطة علامات التبويب **{home}** و**{insert}** و**{format}** و**{view}**. يبحث Ctrl+F في عناوين المواضيع في كل الأوراق، وفي الملاحظات أيضًا إن حدّدت ذلك؛ ويستبدل Ctrl+H. الانتقال إلى موضوع داخل فرع مطوي يفتح هذا الفرع.',
  'يضع **{insert} › {picture}** صورة PNG أو JPG أو GIF (حتى 10 ميغابايت) على الموضوع المحدد، أو يزيل الصورة الموجودة. ويرتّب **{format} › {sort}** فروع الموضوع المحدد أبجديًا؛ اضغطه مرة أخرى للترتيب العكسي.',
  'يفتح **{view} › {levels}** الخريطة حتى المستوى 1 أو 2 أو 3، ويُخفي **{view} › {show}** الملاحظات أو التسميات أو الروابط أو الرموز أو الصور على الشاشة فقط. ويبقى كل ذلك في الملف.',
  'يفتح **{insert} › {icons}** لوحة الرموز: الأولوية والتقدم والأعلام والنجوم والوجوه والأسهم. يحمل الموضوع رمزًا واحدًا من كل نوع؛ اضغط رمزًا موجودًا لإزالته. انقر رمزًا على الخريطة لتبديله برمز آخر من نوعه أو إزالته.',
  'يغيّر تبويب **{style}** مظهر المواضيع المحددة: الشكل والتعبئة والحد والخط والغامق والمائل والتسطير ولون النص ولون خط الفرع. ينسخ **{style} › {painter}** تنسيق موضوع إلى الموضوع التالي الذي تنقره؛ وبالنقر المزدوج يبقى فعّالًا حتى تضغط Esc. يرسم **{home} › {boundary}** إطارًا حول المواضيع الشقيقة المحددة؛ انقر الإطار نقرًا مزدوجًا لتسميته، أو انقره واضغط Delete لإزالته.']),
 'he': ('עריכת מפת החשיבה', [
  'ברצועה שמעל המפה יש את הכרטיסיות **{home}**, **{insert}**, **{format}** ו-**{view}**. Ctrl+F מחפש כותרות נושאים בכל הגיליונות, ואם מסמנים גם בהערות; Ctrl+H מחליף. מעבר לנושא בתוך ענף מקופל פותח את הענף.',
  '**{insert} › {picture}** מוסיף לנושא שנבחר תמונת PNG,‏ JPG או GIF (עד 10 MB), או מסיר את התמונה שכבר יש לו. **{format} › {sort}** מסדר את ענפי הנושא שנבחר לפי סדר האלף-בית; לחיצה נוספת הופכת את הסדר.',
  '**{view} › {levels}** פותח את המפה עד רמה 1, 2 או 3, ו-**{view} › {show}** מסתיר הערות, תוויות, קישורים, סמלים או תמונות במסך בלבד. הקובץ שומר את כולם.',
  '**{insert} › {icons}** פותח את חלונית הסמלים: עדיפות, התקדמות, דגלים, כוכבים, פרצופים וחצים. לכל נושא סמל אחד מכל סוג; לחיצה על סמל קיים מסירה אותו. לחיצה על סמל במפה מחליפה אותו בסמל אחר מאותו סוג או מסירה אותו.',
  'הכרטיסייה **{style}** משנה את מראה הנושאים שנבחרו: צורה, מילוי, קו מתאר, גופן, מודגש, נטוי, קו תחתון, צבע הטקסט וצבע קו הענף. **{style} › {painter}** מעתיק את העיצוב של נושא אחד לנושא הבא שתלחצו עליו; לחיצה כפולה משאירה אותו פעיל עד Esc. **{home} › {boundary}** מקיף במסגרת את הנושאים האחים שנבחרו; לחיצה כפולה על המסגרת נותנת לה שם, ולחיצה עליה ו-Delete מסירים אותה.']),
 'hi': ('माइंड मैप संपादित करना', [
  'मैप के ऊपर की पट्टी में **{home}**, **{insert}**, **{format}** और **{view}** टैब हैं। Ctrl+F सभी शीटों में विषयों के शीर्षक खोजता है, और चुनने पर नोट्स में भी; Ctrl+H बदलता है। मुड़ी हुई शाखा के अंदर किसी विषय पर जाने से वह शाखा खुल जाती है।',
  '**{insert} › {picture}** चुने गए विषय पर PNG, JPG या GIF चित्र (अधिकतम 10 MB) लगाता है, या पहले से लगा चित्र हटाता है। **{format} › {sort}** चुने गए विषय की शाखाओं को वर्णक्रम में रखता है; दोबारा दबाने पर उल्टे क्रम में।',
  '**{view} › {levels}** मैप को स्तर 1, 2 या 3 तक खोलता है, और **{view} › {show}** नोट्स, लेबल, लिंक, आइकन या चित्र केवल स्क्रीन पर छिपाता है। फ़ाइल में सब कुछ बना रहता है।',
  '**{insert} › {icons}** आइकन पैनल खोलता है: प्राथमिकता, प्रगति, झंडे, तारे, चेहरे और तीर। हर विषय पर हर तरह का एक ही आइकन लगता है; लगा हुआ आइकन फिर दबाने पर हट जाता है। मैप पर किसी आइकन को क्लिक करके उसे उसी तरह के दूसरे आइकन से बदलें या हटाएँ।',
  '**{style}** टैब चुने गए विषयों का रूप बदलता है: आकार, भराव, रूपरेखा, फ़ॉन्ट, बोल्ड, इटैलिक, रेखांकन, पाठ का रंग और शाखा रेखा का रंग। **{style} › {painter}** एक विषय का स्वरूप अगले क्लिक किए गए विषय पर लगाता है; दो बार क्लिक करने पर यह Esc दबाने तक चालू रहता है। **{home} › {boundary}** चुने गए सहोदर विषयों के चारों ओर एक घेरा बनाता है; नाम देने के लिए घेरे पर दो बार क्लिक करें, या उसे क्लिक करके Delete दबाएँ ताकि वह हट जाए।']),
 'th': ('แก้ไขแผนที่ความคิด', [
  'แถบด้านบนแผนที่แบ่งเป็นแท็บ **{home}** **{insert}** **{format}** และ **{view}** กด Ctrl+F เพื่อค้นหาชื่อหัวข้อในทุกแผ่นงาน และค้นในบันทึกด้วยหากเลือกไว้ กด Ctrl+H เพื่อแทนที่ เมื่อไปยังหัวข้อที่อยู่ในกิ่งที่พับไว้ กิ่งนั้นจะกางออก',
  '**{insert} › {picture}** ใส่รูป PNG, JPG หรือ GIF (ไม่เกิน 10 MB) ให้หัวข้อที่เลือก หรือเอารูปที่มีอยู่ออก **{format} › {sort}** เรียงกิ่งของหัวข้อที่เลือกตามตัวอักษร กดอีกครั้งเพื่อเรียงย้อนกลับ',
  '**{view} › {levels}** กางแผนที่ถึงระดับ 1, 2 หรือ 3 และ **{view} › {show}** ซ่อนบันทึก ป้ายกำกับ ลิงก์ ไอคอน หรือรูปเฉพาะบนหน้าจอ ไฟล์ยังเก็บทุกอย่างไว้ครบ',
  '**{insert} › {icons}** เปิดแผงไอคอน: ลำดับความสำคัญ ความคืบหน้า ธง ดาว หน้ายิ้ม และลูกศร หัวข้อหนึ่งมีไอคอนได้ชนิดละหนึ่งอัน กดไอคอนที่มีอยู่แล้วอีกครั้งเพื่อเอาออก คลิกไอคอนบนแผนที่เพื่อเปลี่ยนเป็นไอคอนอื่นชนิดเดียวกันหรือเอาออก',
  'แท็บ **{style}** เปลี่ยนรูปลักษณ์ของหัวข้อที่เลือก: รูปทรง สีพื้น เส้นขอบ แบบอักษร ตัวหนา ตัวเอียง ขีดเส้นใต้ สีตัวอักษร และสีเส้นกิ่ง **{style} › {painter}** คัดลอกรูปแบบของหัวข้อหนึ่งไปยังหัวข้อถัดไปที่คลิก ดับเบิลคลิกเพื่อให้ทำงานต่อไปจนกว่าจะกด Esc **{home} › {boundary}** ล้อมกรอบหัวข้อระดับเดียวกันที่เลือก ดับเบิลคลิกกรอบเพื่อตั้งชื่อ หรือคลิกแล้วกด Delete เพื่อลบ']),
}
assert set(MAP_EDIT) == set(T), set(T) ^ set(MAP_EDIT)
for lang, (_title, _intro, sections) in T.items():
    heading, items = MAP_EDIT[lang]
    labels = editor_labels(lang)
    # right after sending a map, before keeping map and document in step
    sections.insert(1, (heading, 'ul', [item.format(**labels) for item in items]))

# PowerPoint with the AI: the slides are written in the chosen style (slide-writer.ts)
SLIDE_AI = {
 'ko': 'PPT에서 **AI가 스타일에 맞춰 슬라이드 글 쓰기**를 고르면 고른 스타일의 말투로 제목, 화면 문장, 근거 줄, 발표자 노트를 써 줍니다. **청중**을 적으면 그 사람들에게 맞춥니다. 마인드맵에 없는 숫자나 이름은 지어내지 않고, 확인할 것은 발표자 노트에 남깁니다.',
 'en': 'For PowerPoint, **Let the AI write the slides in this style** writes the titles, slide lines, supporting lines and speaker notes in the chosen style; fill in **Audience** to aim them at the people you will present to. Figures and names the map does not hold are never made up, and what needs checking goes to the speaker notes.',
 'zh': '发送到 PPT 时选择 **由 AI 按此风格撰写幻灯片内容**，AI 会按所选风格撰写标题、页面文字、依据和演讲者备注；填写 **听众** 可让内容面向这些人。导图中没有的数字和名称不会被编造，需要核实的内容放在演讲者备注里。',
 'zh-TW': '傳送到 PPT 時選擇 **由 AI 依此風格撰寫投影片內容**，AI 會依所選風格撰寫標題、頁面文字、依據和演講者備忘稿；填寫 **聽眾** 可讓內容針對這些人。心智圖中沒有的數字和名稱不會被編造，需要確認的內容放在演講者備忘稿裡。',
 'ja': 'PPT で **AI がこのスタイルでスライドの文章を書く** を選ぶと、選んだスタイルの口調でタイトル・スライドの文・根拠・発表者ノートを書きます。**聞き手** を入れるとその人たちに合わせます。マップにない数字や名前は作らず、確認が必要なことは発表者ノートに残します。',
 'fr': "Pour PowerPoint, **Laisser l'IA rédiger les diapositives dans ce style** écrit les titres, les lignes, les justifications et les notes de l'orateur dans le style choisi ; remplissez **Public** pour viser les personnes devant qui vous présentez. Les chiffres et les noms absents de la carte ne sont jamais inventés, et ce qui doit être vérifié va dans les notes.",
 'de': 'Bei PowerPoint schreibt **Die KI schreibt die Folien in diesem Stil** Titel, Folienzeilen, Belege und Sprechernotizen im gewählten Stil; tragen Sie unter **Publikum** ein, für wen Sie präsentieren. Zahlen und Namen, die nicht in der Karte stehen, werden nie erfunden, und was zu prüfen ist, steht in den Sprechernotizen.',
 'es': 'En PowerPoint, **Que la IA escriba las diapositivas en este estilo** redacta los títulos, las líneas, los argumentos y las notas del orador en el estilo elegido; rellena **Público** para dirigirlos a quienes vas a presentar. Nunca inventa cifras ni nombres que no estén en el mapa, y lo que hay que comprobar va a las notas del orador.',
 'it': "Per PowerPoint, **Lascia che l'IA scriva le slide in questo stile** scrive titoli, righe, motivazioni e note del relatore nello stile scelto; compila **Pubblico** per rivolgerle alle persone a cui presenterai. Numeri e nomi che la mappa non contiene non vengono mai inventati, e ciò che va verificato finisce nelle note del relatore.",
 'pt': 'No PowerPoint, **Deixar a IA escrever os slides neste estilo** escreve títulos, linhas, justificativas e notas do apresentador no estilo escolhido; preencha **Público** para direcioná-los a quem vai assistir. Números e nomes que o mapa não tem nunca são inventados, e o que precisa ser conferido vai para as notas do apresentador.',
 'nl': "Bij PowerPoint schrijft **Laat de AI de dia’s in deze stijl schrijven** de titels, dia-regels, onderbouwing en sprekersnotities in de gekozen stijl; vul **Publiek** in om ze op uw toehoorders af te stemmen. Cijfers en namen die niet in de kaart staan worden nooit verzonnen, en wat gecontroleerd moet worden komt in de sprekersnotities.",
 'pl': 'W PowerPoincie **Niech AI napisze slajdy w tym stylu** pisze tytuły, wiersze slajdów, uzasadnienia i notatki prelegenta w wybranym stylu; wpisz **Odbiorcy**, aby dopasować je do słuchaczy. Liczby i nazwy, których nie ma na mapie, nigdy nie są wymyślane, a to, co trzeba sprawdzić, trafia do notatek prelegenta.',
 'cs': 'U PowerPointu **Nechat AI napsat snímky v tomto stylu** napíše nadpisy, řádky snímků, zdůvodnění a poznámky řečníka ve zvoleném stylu; vyplňte **Publikum**, aby byly psané pro vaše posluchače. Čísla a jména, která v mapě nejsou, se nikdy nevymýšlejí, a co je třeba ověřit, jde do poznámek řečníka.',
 'id': 'Untuk PowerPoint, **Biarkan AI menulis slide dengan gaya ini** menulis judul, baris slide, alasan, dan catatan pembicara dalam gaya yang dipilih; isi **Audiens** agar ditujukan kepada orang yang akan Anda ajak bicara. Angka dan nama yang tidak ada di peta tidak pernah dikarang, dan hal yang perlu diperiksa masuk ke catatan pembicara.',
 'ms': 'Untuk PowerPoint, **Biar AI menulis slaid dalam gaya ini** menulis tajuk, baris slaid, sokongan dan nota penceramah dalam gaya yang dipilih; isi **Penonton** supaya ia ditujukan kepada orang yang akan mendengar. Angka dan nama yang tiada dalam peta tidak pernah direka, dan perkara yang perlu disemak dimasukkan ke dalam nota penceramah.',
 'vi': 'Với PowerPoint, **Để AI viết nội dung trang chiếu theo phong cách này** sẽ viết tiêu đề, dòng chữ trên trang, lý lẽ và ghi chú cho người trình bày theo phong cách đã chọn; điền **Người nghe** để nội dung hướng tới đúng người. Số liệu và tên không có trong sơ đồ sẽ không bao giờ được bịa ra, còn điều cần kiểm tra được ghi vào ghi chú người trình bày.',
 'ru': 'Для PowerPoint вариант **Пусть ИИ напишет слайды в этом стиле** пишет заголовки, строки слайдов, обоснования и заметки докладчика в выбранном стиле; заполните **Аудитория**, чтобы текст был обращён к вашим слушателям. Чисел и имён, которых нет в карте, ИИ не придумывает, а то, что нужно проверить, попадает в заметки докладчика.',
 'ar': 'في PowerPoint، يكتب خيار **دع الذكاء الاصطناعي يكتب الشرائح بهذا الأسلوب** العناوين وأسطر الشرائح والحجج وملاحظات المتحدث بالأسلوب المختار؛ املأ **الجمهور** ليُوجَّه الكلام إلى من ستعرض أمامهم. لا تُختلق أرقام أو أسماء ليست في الخريطة، وما يحتاج إلى تحقق يُوضع في ملاحظات المتحدث.',
 'he': 'ב-PowerPoint, האפשרות **לתת ל-AI לכתוב את השקופיות בסגנון הזה** כותבת כותרות, שורות שקופית, נימוקים והערות דובר בסגנון שנבחר; מלאו את **קהל** כדי לכוון אותן לאנשים שמולם תציגו. מספרים ושמות שאינם במפה לעולם לא מומצאים, ומה שצריך לבדוק נכנס להערות הדובר.',
 'hi': 'PowerPoint में **AI से इस शैली में स्लाइड लिखवाएँ** चुनी गई शैली में शीर्षक, स्लाइड की पंक्तियाँ, आधार और वक्ता नोट्स लिखता है; **श्रोता** भरें ताकि सामग्री उन्हीं लोगों के लिए हो। जो संख्याएँ और नाम मैप में नहीं हैं वे कभी गढ़े नहीं जाते, और जिसे जाँचना है वह वक्ता नोट्स में जाता है।',
 'th': 'สำหรับ PowerPoint ตัวเลือก **ให้ AI เขียนสไลด์ในสไตล์นี้** จะเขียนชื่อสไลด์ ข้อความบนสไลด์ เหตุผลสนับสนุน และบันทึกผู้บรรยายตามสไตล์ที่เลือก กรอก **ผู้ฟัง** เพื่อให้เนื้อหาเหมาะกับคนที่คุณจะนำเสนอ ตัวเลขและชื่อที่ไม่มีในแผนที่จะไม่ถูกแต่งขึ้น และสิ่งที่ต้องตรวจสอบจะอยู่ในบันทึกผู้บรรยาย',
}
assert set(SLIDE_AI) == set(T), set(T) ^ set(SLIDE_AI)
for lang, (_title, _intro, sections) in T.items():
    # the send steps: the second one is where the content is chosen
    sections[0][2][1] += ' ' + SLIDE_AI[lang]

for lang, (title, intro, sections) in T.items():
    lines = [f'# {title}', '', intro, '']
    for heading, kind, items in sections:
        lines += [f'## {heading}', '']
        for i, item in enumerate(items, 1):
            lines.append(f'{i}. {item}' if kind == 'ol' else f'- {item}')
        lines.append('')
    (OUT / f'hanpan.{lang}.md').write_text('\n'.join(lines), encoding='utf8')
print(len(T), 'languages')
