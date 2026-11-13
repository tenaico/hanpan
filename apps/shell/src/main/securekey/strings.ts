import { createI18n, type Lang } from '@genoffice/i18n'

/**
 * Text of the first-run window (terms and key), the wait screen and the lock covers, made
 * in the main process (the owner of the UI language). Korean and English are
 * written by hand and nine more languages come from strings.json through
 * tools/hanpan-add-block-strings.mjs; the other ten carry the English text.
 */
const dicts = {
  zh: {
    skTitle: 'GenOffice 安全密钥',
    skTermsTitle: '使用 GenOffice 之前',
    skTermsLead: 'GenOffice 是免费的开源程序。同意以下内容即可开始。',
    skTerms1: 'GenOffice 按 Apache License 2.0 免费、按现状提供。',
    skTerms2:
      '因使用 GenOffice 而造成的文档丢失、AI 服务费用、API 密钥泄露和安全密钥丢失，责任由用户自行承担。但 TEN AI 故意造成的损害除外。',
    skTerms3: 'AI 写出的内容只是草稿，使用前请核实事实。',
    skTerms4: 'GenOffice 不会把会员信息、文档内容和 AI 对话发送给 TEN AI。',
    skTermsAgree: '我已阅读并同意以上内容。',
    skTermsFull: '查看完整许可证',
    skTermsContinue: '同意并继续',
    skCreateTitle: '创建安全密钥',
    skCreateLead:
      '必须有安全密钥才能打开 GenOffice。您在 GenOffice 中填写的 API 密钥也会用它加锁保护。',
    skCreateUsb: '在 USB 上创建',
    skRecommended: '推荐',
    skCreateUsbSub:
      '只有插着 USB 时才能打开 GenOffice。别人无法在这台电脑上使用 GenOffice 和您的 API 密钥。',
    skCreatePc: '在此电脑上创建',
    skCreatePcSub:
      '无需 USB 即可直接打开，很方便，但使用这台电脑的任何人都能使用 GenOffice 和您的 API 密钥。',
    skNoteSubscription: 'Claude 和 ChatGPT 的订阅登录由各公司自己的程序管理，与安全密钥无关。',
    skNoteWindowsLock: '若想防止别人使用这台电脑，请同时使用 Windows 锁定。',
    skNext: '下一步',
    skBack: '返回',
    skUsbPickTitle: '选择 USB',
    skUsbPickLead: '会在所选 USB 上创建一个安全密钥文件，不会改动 USB 里的其他文件。',
    skUsbDrive: 'USB（{letter}:）',
    skNoUsb: '没有插入 USB。请插入 USB 后点击[重新检查]。',
    skUsbSpareHint:
      '丢失 USB 后，TEN AI 也无法帮您恢复。把同一个安全密钥再做一份到另一个 USB 上会更稳妥（设置 › 安全密钥 › 制作备用 USB）。',
    skCreateKey: '创建密钥',
    skCreating: '正在创建…',
    skPcTitle: '要在这台电脑上创建密钥吗？',
    skPcWarn:
      '保存在这台电脑上后，无需 USB 即可直接打开，但使用这台电脑的其他人也能打开 GenOffice，并用您的 API 密钥使用 AI。之后可以在 设置 › 安全密钥 中把密钥移到 USB。',
    skPcAgree:
      '我明白：使用这台电脑的其他人可以使用 GenOffice 和我的 API 密钥，由此产生的费用和损失由我自己承担。',
    skPcCreate: '在此电脑上创建',
    skUseUsb: '改用 USB',
    skWaitTitle: '请插入安全密钥 USB',
    skWaitLead: '插入存有 GenOffice 安全密钥的 USB 后会立即打开。',
    skLostLink: '丢失 USB 了吗？',
    skNewKey: '创建新的安全密钥',
    skReplaced:
      '{when}在这台电脑上重新创建了安全密钥，因此这个 USB 已不能使用。如果不是您本人操作的，请检查您的 Windows 密码。',
    skUnregisteredUsb:
      '这个 USB 尚未登记。请插入创建安全密钥时用的 USB，或通过 设置 › 安全密钥 › 制作备用 USB 添加这个 USB。',
    skDamaged: '无法打开安全密钥。请创建新的安全密钥。',
    skRetry: '重新检查',
    skChecking: '正在检查…',
    skQuit: '退出',
    skResetTitle: '要创建新的安全密钥吗？',
    skReset1: '您的文档和 GenOffice 设置会原样保留。',
    skReset2:
      '您在 GenOffice 中填写的 API 密钥会被删除，需要重新填写，因为它们是用旧安全密钥加锁的。',
    skReset3: 'Claude 和 ChatGPT 的订阅登录保持不变。',
    skReset4: '即使以后找到旧 USB，那个安全密钥也不能再用了。',
    skResetAgree: '我明白已填写的 API 密钥会被删除。',
    skResetGo: '重新创建',
    skCancel: '取消',
    skErrNoUsb: '找不到所选的 USB。请重新插入 USB。',
    skErrWriteFailed: '无法把安全密钥写入 USB。请确认 USB 没有写保护，然后重试。',
    skCoverTitle: '在确认安全密钥之前，GenOffice 处于锁定状态',
  },
  en: {
    skTitle: 'GenOffice security key',
    skTermsTitle: 'Before you use GenOffice',
    skTermsLead: 'GenOffice is a free, open-source program. Agree to the points below to start.',
    skTerms1: 'GenOffice is provided free of charge and as is, under the Apache License 2.0.',
    skTerms2:
      'You are responsible for lost documents, AI service charges, leaked API keys and lost security keys that come from using GenOffice. Damage TEN AI causes on purpose is the exception.',
    skTerms3: 'What AI writes is a draft: check the facts before you use it.',
    skTerms4: 'GenOffice does not send account details, documents or AI conversations to TEN AI.',
    skTermsAgree: 'I have read and agree to the above.',
    skTermsFull: 'Read the full license',
    skTermsContinue: 'Agree and continue',
    skCreateTitle: 'Make a security key',
    skCreateLead:
      'GenOffice opens only with a security key. The API keys you put in GenOffice are locked with it too.',
    skCreateUsb: 'Make it on a USB stick',
    skRecommended: 'Recommended',
    skCreateUsbSub:
      'GenOffice opens only while the stick is plugged in. Others cannot use GenOffice or your API keys on this PC.',
    skCreatePc: 'Make it on this PC',
    skCreatePcSub:
      'It opens without a stick, but anyone using this PC can use GenOffice and your API keys.',
    skNoteSubscription:
      "Claude and ChatGPT subscription sign-ins are kept by each company's own program and have nothing to do with the security key.",
    skNoteWindowsLock: 'To keep others off this PC, use the Windows lock as well.',
    skNext: 'Next',
    skBack: 'Back',
    skUsbPickTitle: 'Choose a USB stick',
    skUsbPickLead:
      'One security key file goes on the stick you choose. Nothing else on the stick is touched.',
    skUsbDrive: 'USB stick ({letter}:)',
    skNoUsb: 'No USB stick is plugged in. Plug one in and press [Check again].',
    skUsbSpareHint:
      'If you lose the stick, TEN AI cannot bring the key back. A copy on a second stick keeps you safe (Settings › Security key › Make a spare stick).',
    skCreateKey: 'Make the key',
    skCreating: 'Making the key…',
    skPcTitle: 'Make the key on this PC?',
    skPcWarn:
      'Kept on this PC, GenOffice opens without a stick, but anyone else using this PC can open it and use AI with your API keys. You can move the key to a stick later in Settings › Security key.',
    skPcAgree:
      'I understand that others using this PC can use GenOffice and my API keys, and that the charges and damage are my responsibility.',
    skPcCreate: 'Make it on this PC',
    skUseUsb: 'Use a stick instead',
    skWaitTitle: 'Plug in your security key stick',
    skWaitLead: 'GenOffice opens as soon as the stick with its security key is plugged in.',
    skLostLink: 'Lost the stick?',
    skNewKey: 'Make a new key',
    skReplaced:
      'A new security key was made on this PC on {when}, so this stick no longer works. If that was not you, check your Windows password.',
    skUnregisteredUsb:
      'This stick is not registered. Plug in the stick the key was made on, or add this one with Settings › Security key › Make a spare stick.',
    skDamaged: 'The security key cannot be opened. Please make a new key.',
    skRetry: 'Check again',
    skChecking: 'Checking…',
    skQuit: 'Quit',
    skResetTitle: 'Make a new security key?',
    skReset1: 'Your documents and GenOffice settings stay as they are.',
    skReset2:
      'The API keys you put in GenOffice are deleted, so you will need to enter them again: they were locked with the old key.',
    skReset3: 'Claude and ChatGPT subscription sign-ins stay as they are.',
    skReset4: 'Even if you find the old stick, its key will no longer work.',
    skResetAgree: 'I understand my API keys will be deleted.',
    skResetGo: 'Make a new key',
    skCancel: 'Cancel',
    skErrNoUsb: 'The stick you chose cannot be found. Please plug it in again.',
    skErrWriteFailed:
      'The key could not be written to the stick. Check that the stick is not write-protected and try again.',
    skCoverTitle: 'GenOffice is locked until the security key is checked',
  },
  ja: {
    skTitle: 'GenOffice セキュリティキー',
    skTermsTitle: 'GenOffice をご利用になる前に',
    skTermsLead: 'GenOffice は無料のオープンソースプログラムです。以下に同意すると始められます。',
    skTerms1: 'GenOffice は Apache License 2.0 に基づき、無料で現状のまま提供されます。',
    skTerms2:
      'GenOffice の使用中に生じた文書の消失、AI サービスの料金、API キーの漏えい、セキュリティキーの紛失の責任は、ユーザーが負います。ただし、TEN AI の故意による損害は例外です。',
    skTerms3: 'AI が作成した内容は下書きです。事実かどうかを確認してから使ってください。',
    skTerms4: 'GenOffice は会員情報、文書の内容、AI との会話を TEN AI に送信しません。',
    skTermsAgree: '上記の内容を読み、同意します。',
    skTermsFull: 'ライセンス全文を見る',
    skTermsContinue: '同意して続ける',
    skCreateTitle: 'セキュリティキーを作成',
    skCreateLead:
      'GenOffice はセキュリティキーがないと開けません。GenOffice に入力した API キーも、このキーでロックされます。',
    skCreateUsb: 'USB に作成',
    skRecommended: 'おすすめ',
    skCreateUsbSub:
      'USB を挿しているときだけ GenOffice が開きます。ほかの人がこの PC で GenOffice や自分の API キーを使うことはできません。',
    skCreatePc: 'この PC に作成',
    skCreatePcSub:
      'USB なしですぐ開けて便利ですが、この PC を使う人なら誰でも GenOffice と自分の API キーを使えます。',
    skNoteSubscription:
      'Claude や ChatGPT のサブスクリプションのログインは各社のプログラムが別に管理しており、セキュリティキーとは関係ありません。',
    skNoteWindowsLock:
      'ほかの人がこの PC を使えないようにするには、Windows のロックも併用してください。',
    skNext: '次へ',
    skBack: '戻る',
    skUsbPickTitle: 'USB を選択',
    skUsbPickLead:
      '選んだ USB にセキュリティキーのファイルを 1 つ作成します。USB 内のほかのファイルには触れません。',
    skUsbDrive: 'USB（{letter}:）',
    skNoUsb: 'USB が挿さっていません。USB を挿して[もう一度確認]を押してください。',
    skUsbSpareHint:
      'USB をなくすと TEN AI でも復元できません。同じセキュリティキーをもう 1 本の USB に作っておくと安心です（設定 › セキュリティキー › 予備の USB を作成）。',
    skCreateKey: 'キーを作成',
    skCreating: '作成中…',
    skPcTitle: 'この PC にキーを作成しますか？',
    skPcWarn:
      'この PC に保管すると USB なしですぐ開けますが、この PC を使うほかの人も GenOffice を開き、自分の API キーで AI を使えます。あとで 設定 › セキュリティキー から USB に移せます。',
    skPcAgree:
      'この PC を使うほかの人が GenOffice と自分の API キーを使えること、それによる料金や被害は自分の責任であることを理解しました。',
    skPcCreate: 'この PC に作成',
    skUseUsb: 'USB にします',
    skWaitTitle: 'セキュリティキーの USB を挿してください',
    skWaitLead: 'GenOffice のセキュリティキーが入った USB を挿すと、すぐ開きます。',
    skLostLink: 'USB をなくしましたか？',
    skNewKey: '新しいセキュリティキーを作成',
    skReplaced:
      '{when}にこの PC でセキュリティキーが新しく作成されたため、この USB は使えなくなりました。ご自身の操作でない場合は、Windows のパスワードを確認してください。',
    skUnregisteredUsb:
      'この USB は登録されていません。セキュリティキーを作った USB を挿すか、設定 › セキュリティキー › 予備の USB を作成 でこの USB を追加してください。',
    skDamaged: 'セキュリティキーを開けません。新しいキーを作成してください。',
    skRetry: 'もう一度確認',
    skChecking: '確認中…',
    skQuit: '終了',
    skResetTitle: '新しいセキュリティキーを作成しますか？',
    skReset1: '自分の文書と GenOffice の設定はそのまま残ります。',
    skReset2:
      'GenOffice に入れた API キーは削除されるので、入力し直す必要があります。古いセキュリティキーでロックされていたためです。',
    skReset3: 'Claude や ChatGPT のサブスクリプションのログインはそのままです。',
    skReset4: '古い USB が見つかっても、そのセキュリティキーはもう使えません。',
    skResetAgree: '入れておいた API キーが削除されることを理解しました。',
    skResetGo: '新しく作成',
    skCancel: 'キャンセル',
    skErrNoUsb: '選んだ USB が見つかりません。USB を挿し直してください。',
    skErrWriteFailed:
      'USB にセキュリティキーを書き込めませんでした。USB の書き込み禁止を確認して、もう一度お試しください。',
    skCoverTitle: 'セキュリティキーを確認するまで GenOffice はロックされています',
  },
  ko: {
    skTitle: 'GenOffice 보안키',
    skTermsTitle: 'GenOffice을 쓰기 전에',
    skTermsLead: 'GenOffice은 무료 오픈소스 프로그램입니다. 아래 내용에 동의하면 시작합니다.',
    skTerms1: 'GenOffice은 Apache License 2.0에 따라 무료로, 있는 그대로 제공됩니다.',
    skTerms2:
      'GenOffice을 쓰면서 생긴 문서 손실, AI 서비스 요금, API 키 유출, 보안키 분실의 책임은 사용자에게 있습니다. 다만 TEN AI의 고의로 생긴 손해는 예외입니다.',
    skTerms3: 'AI가 만든 내용은 초안이므로 사실 여부를 확인하고 쓰세요.',
    skTerms4: 'GenOffice은 회원 정보, 문서 내용, AI 대화를 TEN AI로 보내지 않습니다.',
    skTermsAgree: '위 내용을 읽고 동의합니다.',
    skTermsFull: '전체 사용권 보기',
    skTermsContinue: '동의하고 계속',
    skCreateTitle: '보안키를 만드세요',
    skCreateLead:
      '보안키가 있어야 GenOffice이 열립니다. GenOffice에 넣는 API 키도 이 보안키로 잠가 둡니다.',
    skCreateUsb: 'USB에 만들기',
    skRecommended: '권장',
    skCreateUsbSub:
      'USB를 꽂았을 때만 GenOffice이 열립니다. 다른 사람이 이 PC로 GenOffice과 내 API 키를 쓸 수 없습니다.',
    skCreatePc: '이 PC에 만들기',
    skCreatePcSub:
      'USB 없이 바로 열려 편하지만, 이 PC를 쓰는 누구나 GenOffice과 내 API 키를 쓸 수 있습니다.',
    skNoteSubscription:
      'Claude·ChatGPT 구독 로그인은 각 회사 프로그램이 따로 관리하며, 보안키와 관계없습니다.',
    skNoteWindowsLock: '다른 사람이 이 PC를 쓰지 못하게 하려면 Windows 잠금을 함께 쓰세요.',
    skNext: '다음',
    skBack: '뒤로',
    skUsbPickTitle: 'USB를 고르세요',
    skUsbPickLead: '고른 USB에 보안키 파일 하나를 만듭니다. USB의 다른 파일은 건드리지 않습니다.',
    skUsbDrive: 'USB ({letter}:)',
    skNoUsb: '꽂힌 USB가 없습니다. USB를 꽂고 [다시 확인]을 누르세요.',
    skUsbSpareHint:
      'USB를 잃어버리면 TEN AI도 되살려 줄 수 없습니다. 같은 보안키를 다른 USB에 한 장 더 만들어 두면 안전합니다(설정 › 보안키 › 예비 USB 만들기).',
    skCreateKey: '보안키 만들기',
    skCreating: '만드는 중…',
    skPcTitle: '이 PC에 보안키를 만들까요?',
    skPcWarn:
      '이 PC에 보관하면 USB 없이 바로 열리는 대신, 이 PC를 쓰는 다른 사람도 GenOffice을 열고 내 API 키로 AI를 쓸 수 있습니다. 나중에 설정 › 보안키에서 USB로 옮길 수 있습니다.',
    skPcAgree:
      '이 PC를 쓰는 다른 사람이 GenOffice과 내 API 키를 쓸 수 있으며, 그로 인한 요금과 피해는 제 책임임을 이해했습니다.',
    skPcCreate: '이 PC에 만들기',
    skUseUsb: 'USB로 할게요',
    skWaitTitle: '보안키 USB를 꽂아 주세요',
    skWaitLead: 'GenOffice의 보안키가 들어 있는 USB를 꽂으면 바로 열립니다.',
    skLostLink: 'USB를 잃어버렸나요?',
    skNewKey: '새 보안키 만들기',
    skReplaced:
      '{when}에 이 PC에서 보안키가 새로 만들어져 이 USB는 더 이상 쓸 수 없습니다. 본인이 한 일이 아니라면 Windows 비밀번호를 확인하세요.',
    skUnregisteredUsb:
      '등록하지 않은 USB입니다. 보안키를 만든 USB를 꽂거나, 설정 › 보안키 › 예비 USB 만들기로 이 USB를 더하세요.',
    skDamaged: '보안키를 열 수 없습니다. 새 보안키를 만들어 주세요.',
    skRetry: '다시 확인',
    skChecking: '확인하는 중…',
    skQuit: '끝내기',
    skResetTitle: '새 보안키를 만들까요?',
    skReset1: '내 문서와 GenOffice 설정은 그대로 남습니다.',
    skReset2:
      'GenOffice에 넣어 둔 API 키는 지워지므로 다시 넣어야 합니다. 예전 보안키로 잠가 두었기 때문입니다.',
    skReset3: 'Claude·ChatGPT 구독 로그인은 그대로입니다.',
    skReset4: '예전 USB를 다시 찾아도 그 보안키는 더 이상 쓸 수 없습니다.',
    skResetAgree: '넣어 둔 API 키가 지워진다는 것을 이해했습니다.',
    skResetGo: '새로 만들기',
    skCancel: '취소',
    skErrNoUsb: '고른 USB를 찾을 수 없습니다. USB를 다시 꽂아 주세요.',
    skErrWriteFailed:
      'USB에 보안키를 쓰지 못했습니다. USB가 잠겨 있지 않은지 확인하고 다시 하세요.',
    skCoverTitle: '보안키를 확인할 때까지 GenOffice이 잠겨 있습니다',
  },
  fr: {
    skTitle: 'GenOffice security key',
    skTermsTitle: 'Before you use GenOffice',
    skTermsLead: 'GenOffice is a free, open-source program. Agree to the points below to start.',
    skTerms1: 'GenOffice is provided free of charge and as is, under the Apache License 2.0.',
    skTerms2:
      'You are responsible for lost documents, AI service charges, leaked API keys and lost security keys that come from using GenOffice. Damage TEN AI causes on purpose is the exception.',
    skTerms3: 'What AI writes is a draft: check the facts before you use it.',
    skTerms4: 'GenOffice does not send account details, documents or AI conversations to TEN AI.',
    skTermsAgree: 'I have read and agree to the above.',
    skTermsFull: 'Read the full license',
    skTermsContinue: 'Agree and continue',
    skCreateTitle: 'Make a security key',
    skCreateLead:
      'GenOffice opens only with a security key. The API keys you put in GenOffice are locked with it too.',
    skCreateUsb: 'Make it on a USB stick',
    skRecommended: 'Recommended',
    skCreateUsbSub:
      'GenOffice opens only while the stick is plugged in. Others cannot use GenOffice or your API keys on this PC.',
    skCreatePc: 'Make it on this PC',
    skCreatePcSub:
      'It opens without a stick, but anyone using this PC can use GenOffice and your API keys.',
    skNoteSubscription:
      "Claude and ChatGPT subscription sign-ins are kept by each company's own program and have nothing to do with the security key.",
    skNoteWindowsLock: 'To keep others off this PC, use the Windows lock as well.',
    skNext: 'Next',
    skBack: 'Back',
    skUsbPickTitle: 'Choose a USB stick',
    skUsbPickLead:
      'One security key file goes on the stick you choose. Nothing else on the stick is touched.',
    skUsbDrive: 'USB stick ({letter}:)',
    skNoUsb: 'No USB stick is plugged in. Plug one in and press [Check again].',
    skUsbSpareHint:
      'If you lose the stick, TEN AI cannot bring the key back. A copy on a second stick keeps you safe (Settings › Security key › Make a spare stick).',
    skCreateKey: 'Make the key',
    skCreating: 'Making the key…',
    skPcTitle: 'Make the key on this PC?',
    skPcWarn:
      'Kept on this PC, GenOffice opens without a stick, but anyone else using this PC can open it and use AI with your API keys. You can move the key to a stick later in Settings › Security key.',
    skPcAgree:
      'I understand that others using this PC can use GenOffice and my API keys, and that the charges and damage are my responsibility.',
    skPcCreate: 'Make it on this PC',
    skUseUsb: 'Use a stick instead',
    skWaitTitle: 'Plug in your security key stick',
    skWaitLead: 'GenOffice opens as soon as the stick with its security key is plugged in.',
    skLostLink: 'Lost the stick?',
    skNewKey: 'Make a new key',
    skReplaced:
      'A new security key was made on this PC on {when}, so this stick no longer works. If that was not you, check your Windows password.',
    skUnregisteredUsb:
      'This stick is not registered. Plug in the stick the key was made on, or add this one with Settings › Security key › Make a spare stick.',
    skDamaged: 'The security key cannot be opened. Please make a new key.',
    skRetry: 'Check again',
    skChecking: 'Checking…',
    skQuit: 'Quit',
    skResetTitle: 'Make a new security key?',
    skReset1: 'Your documents and GenOffice settings stay as they are.',
    skReset2:
      'The API keys you put in GenOffice are deleted, so you will need to enter them again: they were locked with the old key.',
    skReset3: 'Claude and ChatGPT subscription sign-ins stay as they are.',
    skReset4: 'Even if you find the old stick, its key will no longer work.',
    skResetAgree: 'I understand my API keys will be deleted.',
    skResetGo: 'Make a new key',
    skCancel: 'Cancel',
    skErrNoUsb: 'The stick you chose cannot be found. Please plug it in again.',
    skErrWriteFailed:
      'The key could not be written to the stick. Check that the stick is not write-protected and try again.',
    skCoverTitle: 'GenOffice is locked until the security key is checked',
  },
  de: {
    skTitle: 'GenOffice security key',
    skTermsTitle: 'Before you use GenOffice',
    skTermsLead: 'GenOffice is a free, open-source program. Agree to the points below to start.',
    skTerms1: 'GenOffice is provided free of charge and as is, under the Apache License 2.0.',
    skTerms2:
      'You are responsible for lost documents, AI service charges, leaked API keys and lost security keys that come from using GenOffice. Damage TEN AI causes on purpose is the exception.',
    skTerms3: 'What AI writes is a draft: check the facts before you use it.',
    skTerms4: 'GenOffice does not send account details, documents or AI conversations to TEN AI.',
    skTermsAgree: 'I have read and agree to the above.',
    skTermsFull: 'Read the full license',
    skTermsContinue: 'Agree and continue',
    skCreateTitle: 'Make a security key',
    skCreateLead:
      'GenOffice opens only with a security key. The API keys you put in GenOffice are locked with it too.',
    skCreateUsb: 'Make it on a USB stick',
    skRecommended: 'Recommended',
    skCreateUsbSub:
      'GenOffice opens only while the stick is plugged in. Others cannot use GenOffice or your API keys on this PC.',
    skCreatePc: 'Make it on this PC',
    skCreatePcSub:
      'It opens without a stick, but anyone using this PC can use GenOffice and your API keys.',
    skNoteSubscription:
      "Claude and ChatGPT subscription sign-ins are kept by each company's own program and have nothing to do with the security key.",
    skNoteWindowsLock: 'To keep others off this PC, use the Windows lock as well.',
    skNext: 'Next',
    skBack: 'Back',
    skUsbPickTitle: 'Choose a USB stick',
    skUsbPickLead:
      'One security key file goes on the stick you choose. Nothing else on the stick is touched.',
    skUsbDrive: 'USB stick ({letter}:)',
    skNoUsb: 'No USB stick is plugged in. Plug one in and press [Check again].',
    skUsbSpareHint:
      'If you lose the stick, TEN AI cannot bring the key back. A copy on a second stick keeps you safe (Settings › Security key › Make a spare stick).',
    skCreateKey: 'Make the key',
    skCreating: 'Making the key…',
    skPcTitle: 'Make the key on this PC?',
    skPcWarn:
      'Kept on this PC, GenOffice opens without a stick, but anyone else using this PC can open it and use AI with your API keys. You can move the key to a stick later in Settings › Security key.',
    skPcAgree:
      'I understand that others using this PC can use GenOffice and my API keys, and that the charges and damage are my responsibility.',
    skPcCreate: 'Make it on this PC',
    skUseUsb: 'Use a stick instead',
    skWaitTitle: 'Plug in your security key stick',
    skWaitLead: 'GenOffice opens as soon as the stick with its security key is plugged in.',
    skLostLink: 'Lost the stick?',
    skNewKey: 'Make a new key',
    skReplaced:
      'A new security key was made on this PC on {when}, so this stick no longer works. If that was not you, check your Windows password.',
    skUnregisteredUsb:
      'This stick is not registered. Plug in the stick the key was made on, or add this one with Settings › Security key › Make a spare stick.',
    skDamaged: 'The security key cannot be opened. Please make a new key.',
    skRetry: 'Check again',
    skChecking: 'Checking…',
    skQuit: 'Quit',
    skResetTitle: 'Make a new security key?',
    skReset1: 'Your documents and GenOffice settings stay as they are.',
    skReset2:
      'The API keys you put in GenOffice are deleted, so you will need to enter them again: they were locked with the old key.',
    skReset3: 'Claude and ChatGPT subscription sign-ins stay as they are.',
    skReset4: 'Even if you find the old stick, its key will no longer work.',
    skResetAgree: 'I understand my API keys will be deleted.',
    skResetGo: 'Make a new key',
    skCancel: 'Cancel',
    skErrNoUsb: 'The stick you chose cannot be found. Please plug it in again.',
    skErrWriteFailed:
      'The key could not be written to the stick. Check that the stick is not write-protected and try again.',
    skCoverTitle: 'GenOffice is locked until the security key is checked',
  },
  es: {
    skTitle: 'GenOffice security key',
    skTermsTitle: 'Before you use GenOffice',
    skTermsLead: 'GenOffice is a free, open-source program. Agree to the points below to start.',
    skTerms1: 'GenOffice is provided free of charge and as is, under the Apache License 2.0.',
    skTerms2:
      'You are responsible for lost documents, AI service charges, leaked API keys and lost security keys that come from using GenOffice. Damage TEN AI causes on purpose is the exception.',
    skTerms3: 'What AI writes is a draft: check the facts before you use it.',
    skTerms4: 'GenOffice does not send account details, documents or AI conversations to TEN AI.',
    skTermsAgree: 'I have read and agree to the above.',
    skTermsFull: 'Read the full license',
    skTermsContinue: 'Agree and continue',
    skCreateTitle: 'Make a security key',
    skCreateLead:
      'GenOffice opens only with a security key. The API keys you put in GenOffice are locked with it too.',
    skCreateUsb: 'Make it on a USB stick',
    skRecommended: 'Recommended',
    skCreateUsbSub:
      'GenOffice opens only while the stick is plugged in. Others cannot use GenOffice or your API keys on this PC.',
    skCreatePc: 'Make it on this PC',
    skCreatePcSub:
      'It opens without a stick, but anyone using this PC can use GenOffice and your API keys.',
    skNoteSubscription:
      "Claude and ChatGPT subscription sign-ins are kept by each company's own program and have nothing to do with the security key.",
    skNoteWindowsLock: 'To keep others off this PC, use the Windows lock as well.',
    skNext: 'Next',
    skBack: 'Back',
    skUsbPickTitle: 'Choose a USB stick',
    skUsbPickLead:
      'One security key file goes on the stick you choose. Nothing else on the stick is touched.',
    skUsbDrive: 'USB stick ({letter}:)',
    skNoUsb: 'No USB stick is plugged in. Plug one in and press [Check again].',
    skUsbSpareHint:
      'If you lose the stick, TEN AI cannot bring the key back. A copy on a second stick keeps you safe (Settings › Security key › Make a spare stick).',
    skCreateKey: 'Make the key',
    skCreating: 'Making the key…',
    skPcTitle: 'Make the key on this PC?',
    skPcWarn:
      'Kept on this PC, GenOffice opens without a stick, but anyone else using this PC can open it and use AI with your API keys. You can move the key to a stick later in Settings › Security key.',
    skPcAgree:
      'I understand that others using this PC can use GenOffice and my API keys, and that the charges and damage are my responsibility.',
    skPcCreate: 'Make it on this PC',
    skUseUsb: 'Use a stick instead',
    skWaitTitle: 'Plug in your security key stick',
    skWaitLead: 'GenOffice opens as soon as the stick with its security key is plugged in.',
    skLostLink: 'Lost the stick?',
    skNewKey: 'Make a new key',
    skReplaced:
      'A new security key was made on this PC on {when}, so this stick no longer works. If that was not you, check your Windows password.',
    skUnregisteredUsb:
      'This stick is not registered. Plug in the stick the key was made on, or add this one with Settings › Security key › Make a spare stick.',
    skDamaged: 'The security key cannot be opened. Please make a new key.',
    skRetry: 'Check again',
    skChecking: 'Checking…',
    skQuit: 'Quit',
    skResetTitle: 'Make a new security key?',
    skReset1: 'Your documents and GenOffice settings stay as they are.',
    skReset2:
      'The API keys you put in GenOffice are deleted, so you will need to enter them again: they were locked with the old key.',
    skReset3: 'Claude and ChatGPT subscription sign-ins stay as they are.',
    skReset4: 'Even if you find the old stick, its key will no longer work.',
    skResetAgree: 'I understand my API keys will be deleted.',
    skResetGo: 'Make a new key',
    skCancel: 'Cancel',
    skErrNoUsb: 'The stick you chose cannot be found. Please plug it in again.',
    skErrWriteFailed:
      'The key could not be written to the stick. Check that the stick is not write-protected and try again.',
    skCoverTitle: 'GenOffice is locked until the security key is checked',
  },
  th: {
    skTitle: 'กุญแจความปลอดภัย GenOffice',
    skTermsTitle: 'ก่อนใช้ GenOffice',
    skTermsLead: 'GenOffice เป็นโปรแกรมโอเพนซอร์สที่ใช้ฟรี ยอมรับข้อความด้านล่างเพื่อเริ่มใช้งาน',
    skTerms1: 'GenOffice ให้ใช้ฟรีตามสภาพที่เป็นอยู่ ภายใต้ Apache License 2.0',
    skTerms2:
      'ผู้ใช้รับผิดชอบเองต่อเอกสารที่สูญหาย ค่าบริการ AI การรั่วไหลของ API key และการทำกุญแจความปลอดภัยหาย ที่เกิดจากการใช้ GenOffice ยกเว้นความเสียหายที่ TEN AI ก่อขึ้นโดยเจตนา',
    skTerms3: 'สิ่งที่ AI เขียนเป็นเพียงฉบับร่าง โปรดตรวจสอบข้อเท็จจริงก่อนนำไปใช้',
    skTerms4: 'GenOffice ไม่ส่งข้อมูลสมาชิก เนื้อหาเอกสาร หรือบทสนทนากับ AI ไปยัง TEN AI',
    skTermsAgree: 'ฉันอ่านและยอมรับข้อความข้างต้นแล้ว',
    skTermsFull: 'อ่านสัญญาอนุญาตฉบับเต็ม',
    skTermsContinue: 'ยอมรับและไปต่อ',
    skCreateTitle: 'สร้างกุญแจความปลอดภัย',
    skCreateLead:
      'GenOffice จะเปิดได้ก็ต่อเมื่อมีกุญแจความปลอดภัย และ API key ที่ใส่ใน GenOffice ก็ถูกล็อกด้วยกุญแจนี้เช่นกัน',
    skCreateUsb: 'สร้างบน USB',
    skRecommended: 'แนะนำ',
    skCreateUsbSub:
      'GenOffice จะเปิดได้เมื่อเสียบ USB อยู่เท่านั้น คนอื่นใช้ GenOffice และ API key ของคุณบน PC เครื่องนี้ไม่ได้',
    skCreatePc: 'สร้างบน PC เครื่องนี้',
    skCreatePcSub:
      'เปิดได้ทันทีโดยไม่ต้องใช้ USB สะดวก แต่ทุกคนที่ใช้ PC เครื่องนี้ก็ใช้ GenOffice และ API key ของคุณได้',
    skNoteSubscription:
      'การเข้าสู่ระบบด้วยการสมัครสมาชิก Claude และ ChatGPT อยู่ในความดูแลของโปรแกรมของแต่ละบริษัท และไม่เกี่ยวกับกุญแจความปลอดภัย',
    skNoteWindowsLock: 'หากไม่ต้องการให้คนอื่นใช้ PC เครื่องนี้ ให้ใช้การล็อก Windows ควบคู่ไปด้วย',
    skNext: 'ถัดไป',
    skBack: 'ย้อนกลับ',
    skUsbPickTitle: 'เลือก USB',
    skUsbPickLead:
      'ระบบจะสร้างไฟล์กุญแจความปลอดภัยหนึ่งไฟล์บน USB ที่เลือก และจะไม่แตะต้องไฟล์อื่นใน USB',
    skUsbDrive: 'USB ({letter}:)',
    skNoUsb: 'ไม่พบ USB ที่เสียบอยู่ เสียบ USB แล้วกด [ตรวจสอบอีกครั้ง]',
    skUsbSpareHint:
      'หาก USB หาย TEN AI ก็กู้กุญแจคืนให้ไม่ได้ การทำสำเนาไว้ใน USB อีกอันจะปลอดภัยกว่า (การตั้งค่า › กุญแจความปลอดภัย › สร้าง USB สำรอง)',
    skCreateKey: 'สร้างกุญแจ',
    skCreating: 'กำลังสร้างกุญแจ…',
    skPcTitle: 'สร้างกุญแจบน PC เครื่องนี้ไหม',
    skPcWarn:
      'เมื่อเก็บไว้ใน PC เครื่องนี้ GenOffice จะเปิดได้โดยไม่ต้องใช้ USB แต่คนอื่นที่ใช้ PC เครื่องนี้ก็เปิดและใช้ AI ด้วย API key ของคุณได้ คุณย้ายกุญแจไปไว้ใน USB ภายหลังได้ที่ การตั้งค่า › กุญแจความปลอดภัย',
    skPcAgree:
      'ฉันเข้าใจว่าคนอื่นที่ใช้ PC เครื่องนี้ใช้ GenOffice และ API key ของฉันได้ และค่าใช้จ่ายกับความเสียหายที่เกิดขึ้นเป็นความรับผิดชอบของฉันเอง',
    skPcCreate: 'สร้างบน PC เครื่องนี้',
    skUseUsb: 'ใช้ USB แทน',
    skWaitTitle: 'เสียบ USB กุญแจความปลอดภัยของคุณ',
    skWaitLead: 'เมื่อเสียบ USB ที่มีกุญแจความปลอดภัยของ GenOffice GenOffice จะเปิดทันที',
    skLostLink: 'USB หายหรือเปล่า',
    skNewKey: 'สร้างกุญแจใหม่',
    skReplaced:
      'มีการสร้างกุญแจความปลอดภัยใหม่บน PC เครื่องนี้เมื่อ {when} USB อันนี้จึงใช้ไม่ได้อีกแล้ว หากไม่ใช่คุณที่ทำ ให้ตรวจสอบรหัสผ่าน Windows',
    skUnregisteredUsb:
      'USB อันนี้ยังไม่ได้ลงทะเบียน ให้เสียบ USB ที่ใช้สร้างกุญแจ หรือเพิ่ม USB อันนี้ผ่าน การตั้งค่า › กุญแจความปลอดภัย › สร้าง USB สำรอง',
    skDamaged: 'เปิดกุญแจความปลอดภัยไม่ได้ โปรดสร้างกุญแจใหม่',
    skRetry: 'ตรวจสอบอีกครั้ง',
    skChecking: 'กำลังตรวจสอบ…',
    skQuit: 'ออก',
    skResetTitle: 'สร้างกุญแจความปลอดภัยใหม่ไหม',
    skReset1: 'เอกสารและการตั้งค่า GenOffice ของคุณจะยังอยู่ครบ',
    skReset2: 'API key ที่ใส่ไว้ใน GenOffice จะถูกลบ ต้องใส่ใหม่ เพราะถูกล็อกด้วยกุญแจเดิม',
    skReset3: 'การเข้าสู่ระบบด้วยการสมัครสมาชิก Claude และ ChatGPT จะไม่เปลี่ยนแปลง',
    skReset4: 'ต่อให้หา USB อันเก่าเจอ กุญแจนั้นก็ใช้ไม่ได้อีกแล้ว',
    skResetAgree: 'ฉันเข้าใจว่า API key ที่ใส่ไว้จะถูกลบ',
    skResetGo: 'สร้างใหม่',
    skCancel: 'ยกเลิก',
    skErrNoUsb: 'ไม่พบ USB ที่เลือก โปรดเสียบ USB ใหม่อีกครั้ง',
    skErrWriteFailed:
      'เขียนกุญแจลง USB ไม่สำเร็จ ตรวจสอบว่า USB ไม่ได้ป้องกันการเขียน แล้วลองอีกครั้ง',
    skCoverTitle: 'GenOffice จะถูกล็อกไว้จนกว่าจะตรวจสอบกุญแจความปลอดภัย',
  },
  id: {
    skTitle: 'GenOffice security key',
    skTermsTitle: 'Before you use GenOffice',
    skTermsLead: 'GenOffice is a free, open-source program. Agree to the points below to start.',
    skTerms1: 'GenOffice is provided free of charge and as is, under the Apache License 2.0.',
    skTerms2:
      'You are responsible for lost documents, AI service charges, leaked API keys and lost security keys that come from using GenOffice. Damage TEN AI causes on purpose is the exception.',
    skTerms3: 'What AI writes is a draft: check the facts before you use it.',
    skTerms4: 'GenOffice does not send account details, documents or AI conversations to TEN AI.',
    skTermsAgree: 'I have read and agree to the above.',
    skTermsFull: 'Read the full license',
    skTermsContinue: 'Agree and continue',
    skCreateTitle: 'Make a security key',
    skCreateLead:
      'GenOffice opens only with a security key. The API keys you put in GenOffice are locked with it too.',
    skCreateUsb: 'Make it on a USB stick',
    skRecommended: 'Recommended',
    skCreateUsbSub:
      'GenOffice opens only while the stick is plugged in. Others cannot use GenOffice or your API keys on this PC.',
    skCreatePc: 'Make it on this PC',
    skCreatePcSub:
      'It opens without a stick, but anyone using this PC can use GenOffice and your API keys.',
    skNoteSubscription:
      "Claude and ChatGPT subscription sign-ins are kept by each company's own program and have nothing to do with the security key.",
    skNoteWindowsLock: 'To keep others off this PC, use the Windows lock as well.',
    skNext: 'Next',
    skBack: 'Back',
    skUsbPickTitle: 'Choose a USB stick',
    skUsbPickLead:
      'One security key file goes on the stick you choose. Nothing else on the stick is touched.',
    skUsbDrive: 'USB stick ({letter}:)',
    skNoUsb: 'No USB stick is plugged in. Plug one in and press [Check again].',
    skUsbSpareHint:
      'If you lose the stick, TEN AI cannot bring the key back. A copy on a second stick keeps you safe (Settings › Security key › Make a spare stick).',
    skCreateKey: 'Make the key',
    skCreating: 'Making the key…',
    skPcTitle: 'Make the key on this PC?',
    skPcWarn:
      'Kept on this PC, GenOffice opens without a stick, but anyone else using this PC can open it and use AI with your API keys. You can move the key to a stick later in Settings › Security key.',
    skPcAgree:
      'I understand that others using this PC can use GenOffice and my API keys, and that the charges and damage are my responsibility.',
    skPcCreate: 'Make it on this PC',
    skUseUsb: 'Use a stick instead',
    skWaitTitle: 'Plug in your security key stick',
    skWaitLead: 'GenOffice opens as soon as the stick with its security key is plugged in.',
    skLostLink: 'Lost the stick?',
    skNewKey: 'Make a new key',
    skReplaced:
      'A new security key was made on this PC on {when}, so this stick no longer works. If that was not you, check your Windows password.',
    skUnregisteredUsb:
      'This stick is not registered. Plug in the stick the key was made on, or add this one with Settings › Security key › Make a spare stick.',
    skDamaged: 'The security key cannot be opened. Please make a new key.',
    skRetry: 'Check again',
    skChecking: 'Checking…',
    skQuit: 'Quit',
    skResetTitle: 'Make a new security key?',
    skReset1: 'Your documents and GenOffice settings stay as they are.',
    skReset2:
      'The API keys you put in GenOffice are deleted, so you will need to enter them again: they were locked with the old key.',
    skReset3: 'Claude and ChatGPT subscription sign-ins stay as they are.',
    skReset4: 'Even if you find the old stick, its key will no longer work.',
    skResetAgree: 'I understand my API keys will be deleted.',
    skResetGo: 'Make a new key',
    skCancel: 'Cancel',
    skErrNoUsb: 'The stick you chose cannot be found. Please plug it in again.',
    skErrWriteFailed:
      'The key could not be written to the stick. Check that the stick is not write-protected and try again.',
    skCoverTitle: 'GenOffice is locked until the security key is checked',
  },
  ru: {
    skTitle: 'Ключ безопасности GenOffice',
    skTermsTitle: 'Перед началом работы с GenOffice',
    skTermsLead:
      'GenOffice — бесплатная программа с открытым кодом. Чтобы начать, согласитесь с пунктами ниже.',
    skTerms1: 'GenOffice предоставляется бесплатно и «как есть» по лицензии Apache License 2.0.',
    skTerms2:
      'Пользователь сам отвечает за потерю документов, плату за AI-сервисы, утечку API-ключей и потерю ключей безопасности при использовании GenOffice. Исключение — ущерб, причинённый TEN AI умышленно.',
    skTerms3: 'То, что пишет AI, — черновик: перед использованием проверьте факты.',
    skTerms4:
      'GenOffice не отправляет в TEN AI данные учётной записи, содержимое документов и диалоги с AI.',
    skTermsAgree: 'Я прочитал(а) и согласен(на) с изложенным выше.',
    skTermsFull: 'Открыть полный текст лицензии',
    skTermsContinue: 'Согласиться и продолжить',
    skCreateTitle: 'Создайте ключ безопасности',
    skCreateLead:
      'GenOffice открывается только с ключом безопасности. API-ключи, которые вы вводите в GenOffice, тоже защищены этим ключом.',
    skCreateUsb: 'Создать на USB-флешке',
    skRecommended: 'Рекомендуется',
    skCreateUsbSub:
      'GenOffice открывается, только пока флешка вставлена. Другие не смогут использовать GenOffice и ваши API-ключи на этом PC.',
    skCreatePc: 'Создать на этом PC',
    skCreatePcSub:
      'Открывается сразу, без флешки, это удобно, но любой, кто работает на этом PC, сможет пользоваться GenOffice и вашими API-ключами.',
    skNoteSubscription:
      'Вход по подписке Claude и ChatGPT хранится в программе каждой компании и никак не связан с ключом безопасности.',
    skNoteWindowsLock:
      'Чтобы другие не могли пользоваться этим PC, дополнительно включайте блокировку Windows.',
    skNext: 'Далее',
    skBack: 'Назад',
    skUsbPickTitle: 'Выберите флешку',
    skUsbPickLead:
      'На выбранной флешке будет создан один файл ключа безопасности. Остальные файлы на ней не затрагиваются.',
    skUsbDrive: 'Флешка ({letter}:)',
    skNoUsb: 'Флешка не вставлена. Вставьте её и нажмите [Проверить снова].',
    skUsbSpareHint:
      'Если вы потеряете флешку, TEN AI не сможет восстановить ключ. Надёжнее сделать копию на второй флешке (Настройки › Ключ безопасности › Создать запасную флешку).',
    skCreateKey: 'Создать ключ',
    skCreating: 'Создание ключа…',
    skPcTitle: 'Создать ключ на этом PC?',
    skPcWarn:
      'Если хранить ключ на этом PC, GenOffice открывается без флешки, но любой другой пользователь этого PC сможет открыть его и работать с AI по вашим API-ключам. Позже ключ можно перенести на флешку: Настройки › Ключ безопасности.',
    skPcAgree:
      'Я понимаю, что другие пользователи этого PC смогут пользоваться GenOffice и моими API-ключами, а плата и ущерб из-за этого — на моей ответственности.',
    skPcCreate: 'Создать на этом PC',
    skUseUsb: 'Лучше флешку',
    skWaitTitle: 'Вставьте флешку с ключом безопасности',
    skWaitLead:
      'Как только вы вставите флешку с ключом безопасности GenOffice, программа откроется.',
    skLostLink: 'Потеряли флешку?',
    skNewKey: 'Создать новый ключ',
    skReplaced:
      '{when} на этом PC был создан новый ключ безопасности, поэтому эта флешка больше не работает. Если это сделали не вы, проверьте пароль Windows.',
    skUnregisteredUsb:
      'Эта флешка не зарегистрирована. Вставьте флешку, на которой создан ключ, или добавьте эту: Настройки › Ключ безопасности › Создать запасную флешку.',
    skDamaged: 'Не удаётся открыть ключ безопасности. Создайте новый ключ.',
    skRetry: 'Проверить снова',
    skChecking: 'Проверка…',
    skQuit: 'Выйти',
    skResetTitle: 'Создать новый ключ безопасности?',
    skReset1: 'Ваши документы и настройки GenOffice сохранятся.',
    skReset2:
      'API-ключи, введённые в GenOffice, будут удалены, и их придётся ввести заново: они были защищены старым ключом.',
    skReset3: 'Вход по подписке Claude и ChatGPT останется прежним.',
    skReset4: 'Даже если вы найдёте старую флешку, этот ключ уже не заработает.',
    skResetAgree: 'Я понимаю, что введённые API-ключи будут удалены.',
    skResetGo: 'Создать новый',
    skCancel: 'Отмена',
    skErrNoUsb: 'Выбранная флешка не найдена. Вставьте её снова.',
    skErrWriteFailed:
      'Не удалось записать ключ на флешку. Проверьте, что на ней нет защиты от записи, и повторите.',
    skCoverTitle: 'GenOffice заблокирован, пока не проверен ключ безопасности',
  },
  ar: {
    skTitle: 'مفتاح أمان GenOffice',
    skTermsTitle: 'قبل استخدام GenOffice',
    skTermsLead: 'GenOffice برنامج مجاني مفتوح المصدر. وافق على البنود أدناه للبدء.',
    skTerms1: 'يُقدَّم GenOffice مجانًا وكما هو بموجب Apache License 2.0.',
    skTerms2:
      'أنت المسؤول عن فقدان المستندات ورسوم خدمات الذكاء الاصطناعي وتسرّب مفاتيح API وفقدان مفاتيح الأمان الناتجة عن استخدام GenOffice. والاستثناء الوحيد هو الضرر الذي تتسبب فيه TEN AI عمدًا.',
    skTerms3: 'ما يكتبه الذكاء الاصطناعي مسوّدة، فتحقّق من صحة المعلومات قبل استخدامها.',
    skTerms4:
      'لا يرسل GenOffice بيانات الحساب أو محتوى المستندات أو محادثات الذكاء الاصطناعي إلى TEN AI.',
    skTermsAgree: 'قرأتُ ما سبق وأوافق عليه.',
    skTermsFull: 'عرض الترخيص كاملًا',
    skTermsContinue: 'موافقة ومتابعة',
    skCreateTitle: 'أنشئ مفتاح أمان',
    skCreateLead:
      'لا يُفتح GenOffice إلا بمفتاح أمان. ومفاتيح API التي تضعها في GenOffice تُقفل به أيضًا.',
    skCreateUsb: 'إنشاء على USB',
    skRecommended: 'موصى به',
    skCreateUsbSub:
      'يُفتح GenOffice فقط أثناء توصيل USB. لا يستطيع الآخرون استخدام GenOffice ومفاتيح API الخاصة بك على هذا الـ PC.',
    skCreatePc: 'إنشاء على هذا الـ PC',
    skCreatePcSub:
      'يُفتح بلا USB وهذا مريح، لكن أي شخص يستخدم هذا الـ PC يمكنه استخدام GenOffice ومفاتيح API الخاصة بك.',
    skNoteSubscription:
      'تسجيل الدخول باشتراك Claude وChatGPT تحتفظ به برامج كل شركة على حدة، ولا علاقة له بمفتاح الأمان.',
    skNoteWindowsLock: 'لمنع الآخرين من استخدام هذا الـ PC، استخدم قفل Windows أيضًا.',
    skNext: 'التالي',
    skBack: 'رجوع',
    skUsbPickTitle: 'اختر USB',
    skUsbPickLead: 'سيُنشأ ملف مفتاح أمان واحد على USB الذي تختاره. لن يُمسّ أي ملف آخر عليه.',
    skUsbDrive: 'USB ({letter}:)',
    skNoUsb: 'لا يوجد USB موصول. وصّل USB ثم اضغط [تحقق مرة أخرى].',
    skUsbSpareHint:
      'إذا فقدتَ USB فلن تستطيع TEN AI استعادة المفتاح. نسخة على USB ثانٍ تحميك (الإعدادات › مفتاح الأمان › إنشاء USB احتياطي).',
    skCreateKey: 'إنشاء المفتاح',
    skCreating: 'جارٍ إنشاء المفتاح…',
    skPcTitle: 'هل تريد إنشاء المفتاح على هذا الـ PC؟',
    skPcWarn:
      'عند حفظ المفتاح على هذا الـ PC يُفتح GenOffice بلا USB، لكن أي شخص آخر يستخدم هذا الـ PC يمكنه فتحه واستخدام الذكاء الاصطناعي بمفاتيح API الخاصة بك. يمكنك لاحقًا نقل المفتاح إلى USB من الإعدادات › مفتاح الأمان.',
    skPcAgree:
      'أفهم أن الآخرين الذين يستخدمون هذا الـ PC يمكنهم استخدام GenOffice ومفاتيح API الخاصة بي، وأن الرسوم والأضرار الناتجة عن ذلك مسؤوليتي.',
    skPcCreate: 'إنشاء على هذا الـ PC',
    skUseUsb: 'استخدام USB بدلًا من ذلك',
    skWaitTitle: 'وصّل USB مفتاح الأمان',
    skWaitLead: 'يُفتح GenOffice فور توصيل USB الذي يحوي مفتاح الأمان الخاص به.',
    skLostLink: 'هل فقدتَ USB؟',
    skNewKey: 'إنشاء مفتاح جديد',
    skReplaced:
      'أُنشئ مفتاح أمان جديد على هذا الـ PC في {when}، لذا لم يعد هذا USB صالحًا. إن لم تكن أنت من فعل ذلك، فتحقّق من كلمة مرور Windows.',
    skUnregisteredUsb:
      'هذا USB غير مسجَّل. وصّل USB الذي أُنشئ عليه المفتاح، أو أضف هذا عبر الإعدادات › مفتاح الأمان › إنشاء USB احتياطي.',
    skDamaged: 'تعذّر فتح مفتاح الأمان. يرجى إنشاء مفتاح جديد.',
    skRetry: 'تحقق مرة أخرى',
    skChecking: 'جارٍ التحقق…',
    skQuit: 'إنهاء',
    skResetTitle: 'هل تريد إنشاء مفتاح أمان جديد؟',
    skReset1: 'تبقى مستنداتك وإعدادات GenOffice كما هي.',
    skReset2:
      'ستُحذف مفاتيح API التي وضعتها في GenOffice وعليك إدخالها مجددًا، لأنها كانت مقفلة بالمفتاح القديم.',
    skReset3: 'يبقى تسجيل الدخول باشتراك Claude وChatGPT كما هو.',
    skReset4: 'حتى لو عثرتَ على USB القديم فلن يعمل مفتاحه بعد الآن.',
    skResetAgree: 'أفهم أن مفاتيح API التي وضعتها ستُحذف.',
    skResetGo: 'إنشاء جديد',
    skCancel: 'إلغاء',
    skErrNoUsb: 'تعذّر العثور على USB الذي اخترته. يرجى توصيله مرة أخرى.',
    skErrWriteFailed:
      'تعذّرت كتابة المفتاح على USB. تأكد من أن USB غير محمي من الكتابة ثم أعد المحاولة.',
    skCoverTitle: 'GenOffice مقفل حتى يتم التحقق من مفتاح الأمان',
  },
  pt: {
    skTitle: 'GenOffice security key',
    skTermsTitle: 'Before you use GenOffice',
    skTermsLead: 'GenOffice is a free, open-source program. Agree to the points below to start.',
    skTerms1: 'GenOffice is provided free of charge and as is, under the Apache License 2.0.',
    skTerms2:
      'You are responsible for lost documents, AI service charges, leaked API keys and lost security keys that come from using GenOffice. Damage TEN AI causes on purpose is the exception.',
    skTerms3: 'What AI writes is a draft: check the facts before you use it.',
    skTerms4: 'GenOffice does not send account details, documents or AI conversations to TEN AI.',
    skTermsAgree: 'I have read and agree to the above.',
    skTermsFull: 'Read the full license',
    skTermsContinue: 'Agree and continue',
    skCreateTitle: 'Make a security key',
    skCreateLead:
      'GenOffice opens only with a security key. The API keys you put in GenOffice are locked with it too.',
    skCreateUsb: 'Make it on a USB stick',
    skRecommended: 'Recommended',
    skCreateUsbSub:
      'GenOffice opens only while the stick is plugged in. Others cannot use GenOffice or your API keys on this PC.',
    skCreatePc: 'Make it on this PC',
    skCreatePcSub:
      'It opens without a stick, but anyone using this PC can use GenOffice and your API keys.',
    skNoteSubscription:
      "Claude and ChatGPT subscription sign-ins are kept by each company's own program and have nothing to do with the security key.",
    skNoteWindowsLock: 'To keep others off this PC, use the Windows lock as well.',
    skNext: 'Next',
    skBack: 'Back',
    skUsbPickTitle: 'Choose a USB stick',
    skUsbPickLead:
      'One security key file goes on the stick you choose. Nothing else on the stick is touched.',
    skUsbDrive: 'USB stick ({letter}:)',
    skNoUsb: 'No USB stick is plugged in. Plug one in and press [Check again].',
    skUsbSpareHint:
      'If you lose the stick, TEN AI cannot bring the key back. A copy on a second stick keeps you safe (Settings › Security key › Make a spare stick).',
    skCreateKey: 'Make the key',
    skCreating: 'Making the key…',
    skPcTitle: 'Make the key on this PC?',
    skPcWarn:
      'Kept on this PC, GenOffice opens without a stick, but anyone else using this PC can open it and use AI with your API keys. You can move the key to a stick later in Settings › Security key.',
    skPcAgree:
      'I understand that others using this PC can use GenOffice and my API keys, and that the charges and damage are my responsibility.',
    skPcCreate: 'Make it on this PC',
    skUseUsb: 'Use a stick instead',
    skWaitTitle: 'Plug in your security key stick',
    skWaitLead: 'GenOffice opens as soon as the stick with its security key is plugged in.',
    skLostLink: 'Lost the stick?',
    skNewKey: 'Make a new key',
    skReplaced:
      'A new security key was made on this PC on {when}, so this stick no longer works. If that was not you, check your Windows password.',
    skUnregisteredUsb:
      'This stick is not registered. Plug in the stick the key was made on, or add this one with Settings › Security key › Make a spare stick.',
    skDamaged: 'The security key cannot be opened. Please make a new key.',
    skRetry: 'Check again',
    skChecking: 'Checking…',
    skQuit: 'Quit',
    skResetTitle: 'Make a new security key?',
    skReset1: 'Your documents and GenOffice settings stay as they are.',
    skReset2:
      'The API keys you put in GenOffice are deleted, so you will need to enter them again: they were locked with the old key.',
    skReset3: 'Claude and ChatGPT subscription sign-ins stay as they are.',
    skReset4: 'Even if you find the old stick, its key will no longer work.',
    skResetAgree: 'I understand my API keys will be deleted.',
    skResetGo: 'Make a new key',
    skCancel: 'Cancel',
    skErrNoUsb: 'The stick you chose cannot be found. Please plug it in again.',
    skErrWriteFailed:
      'The key could not be written to the stick. Check that the stick is not write-protected and try again.',
    skCoverTitle: 'GenOffice is locked until the security key is checked',
  },
  it: {
    skTitle: 'GenOffice security key',
    skTermsTitle: 'Before you use GenOffice',
    skTermsLead: 'GenOffice is a free, open-source program. Agree to the points below to start.',
    skTerms1: 'GenOffice is provided free of charge and as is, under the Apache License 2.0.',
    skTerms2:
      'You are responsible for lost documents, AI service charges, leaked API keys and lost security keys that come from using GenOffice. Damage TEN AI causes on purpose is the exception.',
    skTerms3: 'What AI writes is a draft: check the facts before you use it.',
    skTerms4: 'GenOffice does not send account details, documents or AI conversations to TEN AI.',
    skTermsAgree: 'I have read and agree to the above.',
    skTermsFull: 'Read the full license',
    skTermsContinue: 'Agree and continue',
    skCreateTitle: 'Make a security key',
    skCreateLead:
      'GenOffice opens only with a security key. The API keys you put in GenOffice are locked with it too.',
    skCreateUsb: 'Make it on a USB stick',
    skRecommended: 'Recommended',
    skCreateUsbSub:
      'GenOffice opens only while the stick is plugged in. Others cannot use GenOffice or your API keys on this PC.',
    skCreatePc: 'Make it on this PC',
    skCreatePcSub:
      'It opens without a stick, but anyone using this PC can use GenOffice and your API keys.',
    skNoteSubscription:
      "Claude and ChatGPT subscription sign-ins are kept by each company's own program and have nothing to do with the security key.",
    skNoteWindowsLock: 'To keep others off this PC, use the Windows lock as well.',
    skNext: 'Next',
    skBack: 'Back',
    skUsbPickTitle: 'Choose a USB stick',
    skUsbPickLead:
      'One security key file goes on the stick you choose. Nothing else on the stick is touched.',
    skUsbDrive: 'USB stick ({letter}:)',
    skNoUsb: 'No USB stick is plugged in. Plug one in and press [Check again].',
    skUsbSpareHint:
      'If you lose the stick, TEN AI cannot bring the key back. A copy on a second stick keeps you safe (Settings › Security key › Make a spare stick).',
    skCreateKey: 'Make the key',
    skCreating: 'Making the key…',
    skPcTitle: 'Make the key on this PC?',
    skPcWarn:
      'Kept on this PC, GenOffice opens without a stick, but anyone else using this PC can open it and use AI with your API keys. You can move the key to a stick later in Settings › Security key.',
    skPcAgree:
      'I understand that others using this PC can use GenOffice and my API keys, and that the charges and damage are my responsibility.',
    skPcCreate: 'Make it on this PC',
    skUseUsb: 'Use a stick instead',
    skWaitTitle: 'Plug in your security key stick',
    skWaitLead: 'GenOffice opens as soon as the stick with its security key is plugged in.',
    skLostLink: 'Lost the stick?',
    skNewKey: 'Make a new key',
    skReplaced:
      'A new security key was made on this PC on {when}, so this stick no longer works. If that was not you, check your Windows password.',
    skUnregisteredUsb:
      'This stick is not registered. Plug in the stick the key was made on, or add this one with Settings › Security key › Make a spare stick.',
    skDamaged: 'The security key cannot be opened. Please make a new key.',
    skRetry: 'Check again',
    skChecking: 'Checking…',
    skQuit: 'Quit',
    skResetTitle: 'Make a new security key?',
    skReset1: 'Your documents and GenOffice settings stay as they are.',
    skReset2:
      'The API keys you put in GenOffice are deleted, so you will need to enter them again: they were locked with the old key.',
    skReset3: 'Claude and ChatGPT subscription sign-ins stay as they are.',
    skReset4: 'Even if you find the old stick, its key will no longer work.',
    skResetAgree: 'I understand my API keys will be deleted.',
    skResetGo: 'Make a new key',
    skCancel: 'Cancel',
    skErrNoUsb: 'The stick you chose cannot be found. Please plug it in again.',
    skErrWriteFailed:
      'The key could not be written to the stick. Check that the stick is not write-protected and try again.',
    skCoverTitle: 'GenOffice is locked until the security key is checked',
  },
  pl: {
    skTitle: 'GenOffice security key',
    skTermsTitle: 'Before you use GenOffice',
    skTermsLead: 'GenOffice is a free, open-source program. Agree to the points below to start.',
    skTerms1: 'GenOffice is provided free of charge and as is, under the Apache License 2.0.',
    skTerms2:
      'You are responsible for lost documents, AI service charges, leaked API keys and lost security keys that come from using GenOffice. Damage TEN AI causes on purpose is the exception.',
    skTerms3: 'What AI writes is a draft: check the facts before you use it.',
    skTerms4: 'GenOffice does not send account details, documents or AI conversations to TEN AI.',
    skTermsAgree: 'I have read and agree to the above.',
    skTermsFull: 'Read the full license',
    skTermsContinue: 'Agree and continue',
    skCreateTitle: 'Make a security key',
    skCreateLead:
      'GenOffice opens only with a security key. The API keys you put in GenOffice are locked with it too.',
    skCreateUsb: 'Make it on a USB stick',
    skRecommended: 'Recommended',
    skCreateUsbSub:
      'GenOffice opens only while the stick is plugged in. Others cannot use GenOffice or your API keys on this PC.',
    skCreatePc: 'Make it on this PC',
    skCreatePcSub:
      'It opens without a stick, but anyone using this PC can use GenOffice and your API keys.',
    skNoteSubscription:
      "Claude and ChatGPT subscription sign-ins are kept by each company's own program and have nothing to do with the security key.",
    skNoteWindowsLock: 'To keep others off this PC, use the Windows lock as well.',
    skNext: 'Next',
    skBack: 'Back',
    skUsbPickTitle: 'Choose a USB stick',
    skUsbPickLead:
      'One security key file goes on the stick you choose. Nothing else on the stick is touched.',
    skUsbDrive: 'USB stick ({letter}:)',
    skNoUsb: 'No USB stick is plugged in. Plug one in and press [Check again].',
    skUsbSpareHint:
      'If you lose the stick, TEN AI cannot bring the key back. A copy on a second stick keeps you safe (Settings › Security key › Make a spare stick).',
    skCreateKey: 'Make the key',
    skCreating: 'Making the key…',
    skPcTitle: 'Make the key on this PC?',
    skPcWarn:
      'Kept on this PC, GenOffice opens without a stick, but anyone else using this PC can open it and use AI with your API keys. You can move the key to a stick later in Settings › Security key.',
    skPcAgree:
      'I understand that others using this PC can use GenOffice and my API keys, and that the charges and damage are my responsibility.',
    skPcCreate: 'Make it on this PC',
    skUseUsb: 'Use a stick instead',
    skWaitTitle: 'Plug in your security key stick',
    skWaitLead: 'GenOffice opens as soon as the stick with its security key is plugged in.',
    skLostLink: 'Lost the stick?',
    skNewKey: 'Make a new key',
    skReplaced:
      'A new security key was made on this PC on {when}, so this stick no longer works. If that was not you, check your Windows password.',
    skUnregisteredUsb:
      'This stick is not registered. Plug in the stick the key was made on, or add this one with Settings › Security key › Make a spare stick.',
    skDamaged: 'The security key cannot be opened. Please make a new key.',
    skRetry: 'Check again',
    skChecking: 'Checking…',
    skQuit: 'Quit',
    skResetTitle: 'Make a new security key?',
    skReset1: 'Your documents and GenOffice settings stay as they are.',
    skReset2:
      'The API keys you put in GenOffice are deleted, so you will need to enter them again: they were locked with the old key.',
    skReset3: 'Claude and ChatGPT subscription sign-ins stay as they are.',
    skReset4: 'Even if you find the old stick, its key will no longer work.',
    skResetAgree: 'I understand my API keys will be deleted.',
    skResetGo: 'Make a new key',
    skCancel: 'Cancel',
    skErrNoUsb: 'The stick you chose cannot be found. Please plug it in again.',
    skErrWriteFailed:
      'The key could not be written to the stick. Check that the stick is not write-protected and try again.',
    skCoverTitle: 'GenOffice is locked until the security key is checked',
  },
  cs: {
    skTitle: 'GenOffice security key',
    skTermsTitle: 'Before you use GenOffice',
    skTermsLead: 'GenOffice is a free, open-source program. Agree to the points below to start.',
    skTerms1: 'GenOffice is provided free of charge and as is, under the Apache License 2.0.',
    skTerms2:
      'You are responsible for lost documents, AI service charges, leaked API keys and lost security keys that come from using GenOffice. Damage TEN AI causes on purpose is the exception.',
    skTerms3: 'What AI writes is a draft: check the facts before you use it.',
    skTerms4: 'GenOffice does not send account details, documents or AI conversations to TEN AI.',
    skTermsAgree: 'I have read and agree to the above.',
    skTermsFull: 'Read the full license',
    skTermsContinue: 'Agree and continue',
    skCreateTitle: 'Make a security key',
    skCreateLead:
      'GenOffice opens only with a security key. The API keys you put in GenOffice are locked with it too.',
    skCreateUsb: 'Make it on a USB stick',
    skRecommended: 'Recommended',
    skCreateUsbSub:
      'GenOffice opens only while the stick is plugged in. Others cannot use GenOffice or your API keys on this PC.',
    skCreatePc: 'Make it on this PC',
    skCreatePcSub:
      'It opens without a stick, but anyone using this PC can use GenOffice and your API keys.',
    skNoteSubscription:
      "Claude and ChatGPT subscription sign-ins are kept by each company's own program and have nothing to do with the security key.",
    skNoteWindowsLock: 'To keep others off this PC, use the Windows lock as well.',
    skNext: 'Next',
    skBack: 'Back',
    skUsbPickTitle: 'Choose a USB stick',
    skUsbPickLead:
      'One security key file goes on the stick you choose. Nothing else on the stick is touched.',
    skUsbDrive: 'USB stick ({letter}:)',
    skNoUsb: 'No USB stick is plugged in. Plug one in and press [Check again].',
    skUsbSpareHint:
      'If you lose the stick, TEN AI cannot bring the key back. A copy on a second stick keeps you safe (Settings › Security key › Make a spare stick).',
    skCreateKey: 'Make the key',
    skCreating: 'Making the key…',
    skPcTitle: 'Make the key on this PC?',
    skPcWarn:
      'Kept on this PC, GenOffice opens without a stick, but anyone else using this PC can open it and use AI with your API keys. You can move the key to a stick later in Settings › Security key.',
    skPcAgree:
      'I understand that others using this PC can use GenOffice and my API keys, and that the charges and damage are my responsibility.',
    skPcCreate: 'Make it on this PC',
    skUseUsb: 'Use a stick instead',
    skWaitTitle: 'Plug in your security key stick',
    skWaitLead: 'GenOffice opens as soon as the stick with its security key is plugged in.',
    skLostLink: 'Lost the stick?',
    skNewKey: 'Make a new key',
    skReplaced:
      'A new security key was made on this PC on {when}, so this stick no longer works. If that was not you, check your Windows password.',
    skUnregisteredUsb:
      'This stick is not registered. Plug in the stick the key was made on, or add this one with Settings › Security key › Make a spare stick.',
    skDamaged: 'The security key cannot be opened. Please make a new key.',
    skRetry: 'Check again',
    skChecking: 'Checking…',
    skQuit: 'Quit',
    skResetTitle: 'Make a new security key?',
    skReset1: 'Your documents and GenOffice settings stay as they are.',
    skReset2:
      'The API keys you put in GenOffice are deleted, so you will need to enter them again: they were locked with the old key.',
    skReset3: 'Claude and ChatGPT subscription sign-ins stay as they are.',
    skReset4: 'Even if you find the old stick, its key will no longer work.',
    skResetAgree: 'I understand my API keys will be deleted.',
    skResetGo: 'Make a new key',
    skCancel: 'Cancel',
    skErrNoUsb: 'The stick you chose cannot be found. Please plug it in again.',
    skErrWriteFailed:
      'The key could not be written to the stick. Check that the stick is not write-protected and try again.',
    skCoverTitle: 'GenOffice is locked until the security key is checked',
  },
  nl: {
    skTitle: 'GenOffice security key',
    skTermsTitle: 'Before you use GenOffice',
    skTermsLead: 'GenOffice is a free, open-source program. Agree to the points below to start.',
    skTerms1: 'GenOffice is provided free of charge and as is, under the Apache License 2.0.',
    skTerms2:
      'You are responsible for lost documents, AI service charges, leaked API keys and lost security keys that come from using GenOffice. Damage TEN AI causes on purpose is the exception.',
    skTerms3: 'What AI writes is a draft: check the facts before you use it.',
    skTerms4: 'GenOffice does not send account details, documents or AI conversations to TEN AI.',
    skTermsAgree: 'I have read and agree to the above.',
    skTermsFull: 'Read the full license',
    skTermsContinue: 'Agree and continue',
    skCreateTitle: 'Make a security key',
    skCreateLead:
      'GenOffice opens only with a security key. The API keys you put in GenOffice are locked with it too.',
    skCreateUsb: 'Make it on a USB stick',
    skRecommended: 'Recommended',
    skCreateUsbSub:
      'GenOffice opens only while the stick is plugged in. Others cannot use GenOffice or your API keys on this PC.',
    skCreatePc: 'Make it on this PC',
    skCreatePcSub:
      'It opens without a stick, but anyone using this PC can use GenOffice and your API keys.',
    skNoteSubscription:
      "Claude and ChatGPT subscription sign-ins are kept by each company's own program and have nothing to do with the security key.",
    skNoteWindowsLock: 'To keep others off this PC, use the Windows lock as well.',
    skNext: 'Next',
    skBack: 'Back',
    skUsbPickTitle: 'Choose a USB stick',
    skUsbPickLead:
      'One security key file goes on the stick you choose. Nothing else on the stick is touched.',
    skUsbDrive: 'USB stick ({letter}:)',
    skNoUsb: 'No USB stick is plugged in. Plug one in and press [Check again].',
    skUsbSpareHint:
      'If you lose the stick, TEN AI cannot bring the key back. A copy on a second stick keeps you safe (Settings › Security key › Make a spare stick).',
    skCreateKey: 'Make the key',
    skCreating: 'Making the key…',
    skPcTitle: 'Make the key on this PC?',
    skPcWarn:
      'Kept on this PC, GenOffice opens without a stick, but anyone else using this PC can open it and use AI with your API keys. You can move the key to a stick later in Settings › Security key.',
    skPcAgree:
      'I understand that others using this PC can use GenOffice and my API keys, and that the charges and damage are my responsibility.',
    skPcCreate: 'Make it on this PC',
    skUseUsb: 'Use a stick instead',
    skWaitTitle: 'Plug in your security key stick',
    skWaitLead: 'GenOffice opens as soon as the stick with its security key is plugged in.',
    skLostLink: 'Lost the stick?',
    skNewKey: 'Make a new key',
    skReplaced:
      'A new security key was made on this PC on {when}, so this stick no longer works. If that was not you, check your Windows password.',
    skUnregisteredUsb:
      'This stick is not registered. Plug in the stick the key was made on, or add this one with Settings › Security key › Make a spare stick.',
    skDamaged: 'The security key cannot be opened. Please make a new key.',
    skRetry: 'Check again',
    skChecking: 'Checking…',
    skQuit: 'Quit',
    skResetTitle: 'Make a new security key?',
    skReset1: 'Your documents and GenOffice settings stay as they are.',
    skReset2:
      'The API keys you put in GenOffice are deleted, so you will need to enter them again: they were locked with the old key.',
    skReset3: 'Claude and ChatGPT subscription sign-ins stay as they are.',
    skReset4: 'Even if you find the old stick, its key will no longer work.',
    skResetAgree: 'I understand my API keys will be deleted.',
    skResetGo: 'Make a new key',
    skCancel: 'Cancel',
    skErrNoUsb: 'The stick you chose cannot be found. Please plug it in again.',
    skErrWriteFailed:
      'The key could not be written to the stick. Check that the stick is not write-protected and try again.',
    skCoverTitle: 'GenOffice is locked until the security key is checked',
  },
  ms: {
    skTitle: 'GenOffice security key',
    skTermsTitle: 'Before you use GenOffice',
    skTermsLead: 'GenOffice is a free, open-source program. Agree to the points below to start.',
    skTerms1: 'GenOffice is provided free of charge and as is, under the Apache License 2.0.',
    skTerms2:
      'You are responsible for lost documents, AI service charges, leaked API keys and lost security keys that come from using GenOffice. Damage TEN AI causes on purpose is the exception.',
    skTerms3: 'What AI writes is a draft: check the facts before you use it.',
    skTerms4: 'GenOffice does not send account details, documents or AI conversations to TEN AI.',
    skTermsAgree: 'I have read and agree to the above.',
    skTermsFull: 'Read the full license',
    skTermsContinue: 'Agree and continue',
    skCreateTitle: 'Make a security key',
    skCreateLead:
      'GenOffice opens only with a security key. The API keys you put in GenOffice are locked with it too.',
    skCreateUsb: 'Make it on a USB stick',
    skRecommended: 'Recommended',
    skCreateUsbSub:
      'GenOffice opens only while the stick is plugged in. Others cannot use GenOffice or your API keys on this PC.',
    skCreatePc: 'Make it on this PC',
    skCreatePcSub:
      'It opens without a stick, but anyone using this PC can use GenOffice and your API keys.',
    skNoteSubscription:
      "Claude and ChatGPT subscription sign-ins are kept by each company's own program and have nothing to do with the security key.",
    skNoteWindowsLock: 'To keep others off this PC, use the Windows lock as well.',
    skNext: 'Next',
    skBack: 'Back',
    skUsbPickTitle: 'Choose a USB stick',
    skUsbPickLead:
      'One security key file goes on the stick you choose. Nothing else on the stick is touched.',
    skUsbDrive: 'USB stick ({letter}:)',
    skNoUsb: 'No USB stick is plugged in. Plug one in and press [Check again].',
    skUsbSpareHint:
      'If you lose the stick, TEN AI cannot bring the key back. A copy on a second stick keeps you safe (Settings › Security key › Make a spare stick).',
    skCreateKey: 'Make the key',
    skCreating: 'Making the key…',
    skPcTitle: 'Make the key on this PC?',
    skPcWarn:
      'Kept on this PC, GenOffice opens without a stick, but anyone else using this PC can open it and use AI with your API keys. You can move the key to a stick later in Settings › Security key.',
    skPcAgree:
      'I understand that others using this PC can use GenOffice and my API keys, and that the charges and damage are my responsibility.',
    skPcCreate: 'Make it on this PC',
    skUseUsb: 'Use a stick instead',
    skWaitTitle: 'Plug in your security key stick',
    skWaitLead: 'GenOffice opens as soon as the stick with its security key is plugged in.',
    skLostLink: 'Lost the stick?',
    skNewKey: 'Make a new key',
    skReplaced:
      'A new security key was made on this PC on {when}, so this stick no longer works. If that was not you, check your Windows password.',
    skUnregisteredUsb:
      'This stick is not registered. Plug in the stick the key was made on, or add this one with Settings › Security key › Make a spare stick.',
    skDamaged: 'The security key cannot be opened. Please make a new key.',
    skRetry: 'Check again',
    skChecking: 'Checking…',
    skQuit: 'Quit',
    skResetTitle: 'Make a new security key?',
    skReset1: 'Your documents and GenOffice settings stay as they are.',
    skReset2:
      'The API keys you put in GenOffice are deleted, so you will need to enter them again: they were locked with the old key.',
    skReset3: 'Claude and ChatGPT subscription sign-ins stay as they are.',
    skReset4: 'Even if you find the old stick, its key will no longer work.',
    skResetAgree: 'I understand my API keys will be deleted.',
    skResetGo: 'Make a new key',
    skCancel: 'Cancel',
    skErrNoUsb: 'The stick you chose cannot be found. Please plug it in again.',
    skErrWriteFailed:
      'The key could not be written to the stick. Check that the stick is not write-protected and try again.',
    skCoverTitle: 'GenOffice is locked until the security key is checked',
  },
  he: {
    skTitle: 'מפתח אבטחה של GenOffice',
    skTermsTitle: 'לפני השימוש ב-GenOffice',
    skTermsLead: 'GenOffice היא תוכנה חופשית בקוד פתוח. הסכימו לסעיפים שלהלן כדי להתחיל.',
    skTerms1: 'GenOffice ניתנת בחינם וכפי שהיא (as is), לפי Apache License 2.0.',
    skTerms2:
      'האחריות לאובדן מסמכים, לחיובי שירותי AI, לדליפת מפתחות API ולאובדן מפתחות אבטחה הנובעים משימוש ב-GenOffice היא על המשתמש. היוצא מן הכלל הוא נזק ש-TEN AI גורמת בכוונה.',
    skTerms3: 'מה ש-AI כותב הוא טיוטה: בדקו את העובדות לפני השימוש.',
    skTerms4: 'GenOffice אינה שולחת ל-TEN AI פרטי חשבון, תוכן מסמכים או שיחות עם AI.',
    skTermsAgree: 'קראתי ואני מסכים/ה לאמור לעיל.',
    skTermsFull: 'לקריאת הרישיון המלא',
    skTermsContinue: 'הסכמה והמשך',
    skCreateTitle: 'צרו מפתח אבטחה',
    skCreateLead: 'GenOffice נפתחת רק עם מפתח אבטחה. גם מפתחות ה-API שתזינו ב-GenOffice ננעלים בו.',
    skCreateUsb: 'יצירה על כונן USB',
    skRecommended: 'מומלץ',
    skCreateUsbSub:
      'GenOffice נפתחת רק כשהכונן מחובר. אחרים לא יוכלו להשתמש ב-GenOffice ובמפתחות ה-API שלכם ב-PC הזה.',
    skCreatePc: 'יצירה ב-PC הזה',
    skCreatePcSub:
      'נפתחת בלי כונן וזה נוח, אבל כל מי שמשתמש ב-PC הזה יכול להשתמש ב-GenOffice ובמפתחות ה-API שלכם.',
    skNoteSubscription:
      'הכניסה למנויי Claude ו-ChatGPT נשמרת בתוכנה של כל חברה בנפרד, ואין לה קשר למפתח האבטחה.',
    skNoteWindowsLock: 'כדי שאחרים לא ישתמשו ב-PC הזה, השתמשו גם בנעילת Windows.',
    skNext: 'הבא',
    skBack: 'חזרה',
    skUsbPickTitle: 'בחרו כונן USB',
    skUsbPickLead: 'בכונן שתבחרו ייווצר קובץ מפתח אבטחה אחד. שאר הקבצים בכונן לא ייגעו.',
    skUsbDrive: 'USB ({letter}:)',
    skNoUsb: 'לא מחובר כונן USB. חברו כונן ולחצו על [בדוק שוב].',
    skUsbSpareHint:
      'אם תאבדו את הכונן, גם TEN AI לא תוכל לשחזר את המפתח. עותק בכונן שני ישמור עליכם (הגדרות › מפתח אבטחה › יצירת כונן USB רזרבי).',
    skCreateKey: 'יצירת המפתח',
    skCreating: 'יוצר את המפתח…',
    skPcTitle: 'ליצור את המפתח ב-PC הזה?',
    skPcWarn:
      'כשהמפתח שמור ב-PC הזה, GenOffice נפתחת בלי כונן, אבל כל אדם אחר שמשתמש ב-PC הזה יכול לפתוח אותה ולהשתמש ב-AI עם מפתחות ה-API שלכם. אפשר להעביר את המפתח לכונן USB בהמשך דרך הגדרות › מפתח אבטחה.',
    skPcAgree:
      'אני מבין/ה שאחרים המשתמשים ב-PC הזה יכולים להשתמש ב-GenOffice ובמפתחות ה-API שלי, וכי החיובים והנזק שייגרמו מכך באחריותי.',
    skPcCreate: 'יצירה ב-PC הזה',
    skUseUsb: 'עדיף כונן USB',
    skWaitTitle: 'חברו את כונן מפתח האבטחה',
    skWaitLead: 'GenOffice תיפתח ברגע שתחברו את הכונן שבו מפתח האבטחה שלה.',
    skLostLink: 'איבדתם את הכונן?',
    skNewKey: 'יצירת מפתח חדש',
    skReplaced:
      'ב-{when} נוצר ב-PC הזה מפתח אבטחה חדש, ולכן הכונן הזה כבר לא עובד. אם לא אתם עשיתם זאת, בדקו את סיסמת Windows.',
    skUnregisteredUsb:
      'הכונן הזה אינו רשום. חברו את הכונן שעליו נוצר המפתח, או הוסיפו את זה דרך הגדרות › מפתח אבטחה › יצירת כונן USB רזרבי.',
    skDamaged: 'לא ניתן לפתוח את מפתח האבטחה. אנא צרו מפתח חדש.',
    skRetry: 'בדוק שוב',
    skChecking: 'בודק…',
    skQuit: 'יציאה',
    skResetTitle: 'ליצור מפתח אבטחה חדש?',
    skReset1: 'המסמכים וההגדרות של GenOffice שלכם יישארו כפי שהם.',
    skReset2:
      'מפתחות ה-API שהזנתם ב-GenOffice יימחקו ויהיה צריך להזין אותם מחדש, כי הם ננעלו במפתח הישן.',
    skReset3: 'הכניסה למנויי Claude ו-ChatGPT תישאר כפי שהיא.',
    skReset4: 'גם אם תמצאו את הכונן הישן, המפתח שבו כבר לא יעבוד.',
    skResetAgree: 'אני מבין/ה שמפתחות ה-API שהזנתי יימחקו.',
    skResetGo: 'יצירה מחדש',
    skCancel: 'ביטול',
    skErrNoUsb: 'לא ניתן למצוא את הכונן שבחרתם. אנא חברו אותו שוב.',
    skErrWriteFailed:
      'לא ניתן היה לכתוב את המפתח לכונן. ודאו שהכונן אינו מוגן מפני כתיבה ונסו שוב.',
    skCoverTitle: 'GenOffice נעולה עד שמפתח האבטחה ייבדק',
  },
  hi: {
    skTitle: 'GenOffice सुरक्षा कुंजी',
    skTermsTitle: 'GenOffice इस्तेमाल करने से पहले',
    skTermsLead:
      'GenOffice एक मुफ़्त ओपन-सोर्स प्रोग्राम है। शुरू करने के लिए नीचे की बातों से सहमत हों।',
    skTerms1: 'GenOffice, Apache License 2.0 के तहत, मुफ़्त और जैसा है वैसा ही दिया जाता है।',
    skTerms2:
      'GenOffice इस्तेमाल करने से हुए दस्तावेज़ों के नुकसान, AI सेवा के शुल्क, API कुंजी के लीक होने और सुरक्षा कुंजी खो जाने की ज़िम्मेदारी उपयोगकर्ता की है। अपवाद केवल वह नुकसान है जो TEN AI जानबूझकर पहुँचाए।',
    skTerms3: 'AI जो लिखता है वह मसौदा है: इस्तेमाल से पहले तथ्य जाँच लें।',
    skTerms4:
      'GenOffice सदस्य की जानकारी, दस्तावेज़ की सामग्री और AI की बातचीत TEN AI को नहीं भेजता।',
    skTermsAgree: 'मैंने ऊपर की बातें पढ़ ली हैं और सहमत हूँ।',
    skTermsFull: 'पूरा लाइसेंस पढ़ें',
    skTermsContinue: 'सहमत होकर आगे बढ़ें',
    skCreateTitle: 'सुरक्षा कुंजी बनाएँ',
    skCreateLead:
      'GenOffice सिर्फ़ सुरक्षा कुंजी से खुलता है। GenOffice में डाली गई API कुंजियाँ भी इसी से लॉक रहती हैं।',
    skCreateUsb: 'USB पर बनाएँ',
    skRecommended: 'अनुशंसित',
    skCreateUsbSub:
      'GenOffice सिर्फ़ तब खुलता है जब USB लगा हो। दूसरे लोग इस PC पर GenOffice और आपकी API कुंजियों का इस्तेमाल नहीं कर सकते।',
    skCreatePc: 'इस PC पर बनाएँ',
    skCreatePcSub:
      'USB के बिना सीधे खुल जाता है, यह आसान है, पर इस PC को इस्तेमाल करने वाला कोई भी GenOffice और आपकी API कुंजियाँ इस्तेमाल कर सकता है।',
    skNoteSubscription:
      'Claude और ChatGPT की सब्सक्रिप्शन लॉगिन हर कंपनी का अपना प्रोग्राम सँभालता है, और उसका सुरक्षा कुंजी से कोई संबंध नहीं है।',
    skNoteWindowsLock:
      'दूसरों को इस PC का इस्तेमाल करने से रोकने के लिए Windows लॉक भी इस्तेमाल करें।',
    skNext: 'आगे',
    skBack: 'वापस',
    skUsbPickTitle: 'USB चुनें',
    skUsbPickLead:
      'चुने गए USB पर सुरक्षा कुंजी की एक फ़ाइल बनेगी। USB की दूसरी फ़ाइलों को छुआ नहीं जाएगा।',
    skUsbDrive: 'USB ({letter}:)',
    skNoUsb: 'कोई USB लगा हुआ नहीं है। USB लगाकर [फिर से जाँचें] दबाएँ।',
    skUsbSpareHint:
      'USB खो जाए तो TEN AI भी कुंजी वापस नहीं ला सकता। दूसरे USB पर एक और प्रति रखना सुरक्षित है (सेटिंग › सुरक्षा कुंजी › स्पेयर USB बनाएँ)।',
    skCreateKey: 'कुंजी बनाएँ',
    skCreating: 'कुंजी बन रही है…',
    skPcTitle: 'क्या इस PC पर कुंजी बनानी है?',
    skPcWarn:
      'इस PC पर रखने से GenOffice बिना USB के खुलता है, पर इस PC को इस्तेमाल करने वाला कोई भी इसे खोलकर आपकी API कुंजियों से AI चला सकता है। बाद में सेटिंग › सुरक्षा कुंजी में जाकर कुंजी को USB पर ले जा सकते हैं।',
    skPcAgree:
      'मैं समझता/समझती हूँ कि इस PC को इस्तेमाल करने वाले दूसरे लोग GenOffice और मेरी API कुंजियाँ इस्तेमाल कर सकते हैं, और इससे होने वाले शुल्क और नुकसान की ज़िम्मेदारी मेरी है।',
    skPcCreate: 'इस PC पर बनाएँ',
    skUseUsb: 'USB से करूँगा',
    skWaitTitle: 'अपना सुरक्षा कुंजी वाला USB लगाएँ',
    skWaitLead: 'GenOffice की सुरक्षा कुंजी वाला USB लगाते ही यह खुल जाएगा।',
    skLostLink: 'क्या USB खो गया?',
    skNewKey: 'नई कुंजी बनाएँ',
    skReplaced:
      '{when} को इस PC पर नई सुरक्षा कुंजी बनाई गई, इसलिए यह USB अब काम नहीं करता। अगर यह आपने नहीं किया, तो अपना Windows पासवर्ड जाँचें।',
    skUnregisteredUsb:
      'यह USB पंजीकृत नहीं है। जिस USB पर कुंजी बनी थी उसे लगाएँ, या सेटिंग › सुरक्षा कुंजी › स्पेयर USB बनाएँ से इस USB को जोड़ें।',
    skDamaged: 'सुरक्षा कुंजी खुल नहीं रही। कृपया नई कुंजी बनाएँ।',
    skRetry: 'फिर से जाँचें',
    skChecking: 'जाँच हो रही है…',
    skQuit: 'बंद करें',
    skResetTitle: 'क्या नई सुरक्षा कुंजी बनानी है?',
    skReset1: 'आपके दस्तावेज़ और GenOffice की सेटिंग जैसी हैं वैसी ही रहेंगी।',
    skReset2:
      'GenOffice में डाली गई API कुंजियाँ मिट जाएँगी और उन्हें दोबारा डालना होगा, क्योंकि वे पुरानी कुंजी से लॉक थीं।',
    skReset3: 'Claude और ChatGPT की सब्सक्रिप्शन लॉगिन वैसी ही रहेंगी।',
    skReset4: 'पुराना USB मिल भी जाए, तो वह कुंजी अब काम नहीं करेगी।',
    skResetAgree: 'मैं समझता/समझती हूँ कि डाली गई API कुंजियाँ मिट जाएँगी।',
    skResetGo: 'नई बनाएँ',
    skCancel: 'रद्द करें',
    skErrNoUsb: 'चुना हुआ USB नहीं मिला। कृपया USB फिर से लगाएँ।',
    skErrWriteFailed:
      'कुंजी USB पर नहीं लिखी जा सकी। देखें कि USB राइट-प्रोटेक्टेड तो नहीं है, फिर दोबारा कोशिश करें।',
    skCoverTitle: 'सुरक्षा कुंजी जाँचे जाने तक GenOffice लॉक है',
  },
  'zh-TW': {
    skTitle: 'GenOffice 安全金鑰',
    skTermsTitle: '使用 GenOffice 之前',
    skTermsLead: 'GenOffice 是免費的開源程式。同意以下內容即可開始。',
    skTerms1: 'GenOffice 依 Apache License 2.0 免費、依現狀提供。',
    skTerms2:
      '因使用 GenOffice 而造成的文件遺失、AI 服務費用、API 金鑰外洩和安全金鑰遺失，責任由使用者自行承擔。但 TEN AI 故意造成的損害除外。',
    skTerms3: 'AI 寫出的內容只是草稿，使用前請查證事實。',
    skTerms4: 'GenOffice 不會把會員資料、文件內容和 AI 對話傳送給 TEN AI。',
    skTermsAgree: '我已閱讀並同意以上內容。',
    skTermsFull: '查看完整授權條款',
    skTermsContinue: '同意並繼續',
    skCreateTitle: '建立安全金鑰',
    skCreateLead:
      '必須有安全金鑰才能開啟 GenOffice。您在 GenOffice 中填寫的 API 金鑰也會用它加鎖保護。',
    skCreateUsb: '在 USB 上建立',
    skRecommended: '建議',
    skCreateUsbSub:
      '只有插著 USB 時才能開啟 GenOffice。別人無法在這台電腦上使用 GenOffice 和您的 API 金鑰。',
    skCreatePc: '在這台電腦上建立',
    skCreatePcSub:
      '無需 USB 即可直接開啟，很方便，但使用這台電腦的任何人都能使用 GenOffice 和您的 API 金鑰。',
    skNoteSubscription: 'Claude 和 ChatGPT 的訂閱登入由各公司自己的程式管理，與安全金鑰無關。',
    skNoteWindowsLock: '若想防止別人使用這台電腦，請同時使用 Windows 鎖定。',
    skNext: '下一步',
    skBack: '返回',
    skUsbPickTitle: '選擇 USB',
    skUsbPickLead: '會在所選 USB 上建立一個安全金鑰檔案，不會更動 USB 裡的其他檔案。',
    skUsbDrive: 'USB（{letter}:）',
    skNoUsb: '沒有插入 USB。請插入 USB 後按[重新檢查]。',
    skUsbSpareHint:
      '遺失 USB 後，TEN AI 也無法幫您復原。把同一個安全金鑰再做一份到另一個 USB 上會更穩妥（設定 › 安全金鑰 › 製作備用 USB）。',
    skCreateKey: '建立金鑰',
    skCreating: '正在建立…',
    skPcTitle: '要在這台電腦上建立金鑰嗎？',
    skPcWarn:
      '保存在這台電腦上後，無需 USB 即可直接開啟，但使用這台電腦的其他人也能開啟 GenOffice，並用您的 API 金鑰使用 AI。之後可以在 設定 › 安全金鑰 中把金鑰移到 USB。',
    skPcAgree:
      '我明白：使用這台電腦的其他人可以使用 GenOffice 和我的 API 金鑰，由此產生的費用和損失由我自己承擔。',
    skPcCreate: '在這台電腦上建立',
    skUseUsb: '改用 USB',
    skWaitTitle: '請插入安全金鑰 USB',
    skWaitLead: '插入存有 GenOffice 安全金鑰的 USB 後會立即開啟。',
    skLostLink: '遺失 USB 了嗎？',
    skNewKey: '建立新的安全金鑰',
    skReplaced:
      '{when}在這台電腦上重新建立了安全金鑰，因此這個 USB 已不能使用。如果不是您本人操作的，請檢查您的 Windows 密碼。',
    skUnregisteredUsb:
      '這個 USB 尚未登記。請插入建立安全金鑰時用的 USB，或透過 設定 › 安全金鑰 › 製作備用 USB 加入這個 USB。',
    skDamaged: '無法開啟安全金鑰。請建立新的安全金鑰。',
    skRetry: '重新檢查',
    skChecking: '正在檢查…',
    skQuit: '結束',
    skResetTitle: '要建立新的安全金鑰嗎？',
    skReset1: '您的文件和 GenOffice 設定會原樣保留。',
    skReset2:
      '您在 GenOffice 中填寫的 API 金鑰會被刪除，需要重新填寫，因為它們是用舊安全金鑰加鎖的。',
    skReset3: 'Claude 和 ChatGPT 的訂閱登入保持不變。',
    skReset4: '即使之後找到舊 USB，那個安全金鑰也不能再用了。',
    skResetAgree: '我明白已填寫的 API 金鑰會被刪除。',
    skResetGo: '重新建立',
    skCancel: '取消',
    skErrNoUsb: '找不到所選的 USB。請重新插入 USB。',
    skErrWriteFailed: '無法把安全金鑰寫入 USB。請確認 USB 沒有寫入保護，然後再試一次。',
    skCoverTitle: '在確認安全金鑰之前，GenOffice 處於鎖定狀態',
  },
  vi: {
    skTitle: 'Khóa bảo mật GenOffice',
    skTermsTitle: 'Trước khi dùng GenOffice',
    skTermsLead:
      'GenOffice là chương trình mã nguồn mở miễn phí. Hãy đồng ý với các điều dưới đây để bắt đầu.',
    skTerms1: 'GenOffice được cung cấp miễn phí và nguyên trạng, theo Apache License 2.0.',
    skTerms2:
      'Người dùng tự chịu trách nhiệm về việc mất tài liệu, phí dịch vụ AI, lộ khóa API và mất khóa bảo mật phát sinh khi dùng GenOffice. Ngoại lệ duy nhất là thiệt hại do TEN AI cố ý gây ra.',
    skTerms3: 'Nội dung do AI viết chỉ là bản nháp: hãy kiểm tra sự thật trước khi dùng.',
    skTerms4:
      'GenOffice không gửi thông tin thành viên, nội dung tài liệu hay cuộc trò chuyện với AI cho TEN AI.',
    skTermsAgree: 'Tôi đã đọc và đồng ý với các nội dung trên.',
    skTermsFull: 'Xem toàn văn giấy phép',
    skTermsContinue: 'Đồng ý và tiếp tục',
    skCreateTitle: 'Tạo khóa bảo mật',
    skCreateLead:
      'GenOffice chỉ mở được khi có khóa bảo mật. Các khóa API bạn nhập vào GenOffice cũng được khóa bằng khóa này.',
    skCreateUsb: 'Tạo trên USB',
    skRecommended: 'Khuyên dùng',
    skCreateUsbSub:
      'GenOffice chỉ mở khi đang cắm USB. Người khác không thể dùng GenOffice và khóa API của bạn trên PC này.',
    skCreatePc: 'Tạo trên PC này',
    skCreatePcSub:
      'Mở ngay không cần USB nên tiện, nhưng bất kỳ ai dùng PC này đều có thể dùng GenOffice và khóa API của bạn.',
    skNoteSubscription:
      'Đăng nhập bằng gói đăng ký Claude và ChatGPT do chương trình của từng công ty quản lý riêng, không liên quan đến khóa bảo mật.',
    skNoteWindowsLock: 'Để người khác không dùng được PC này, hãy dùng thêm khóa màn hình Windows.',
    skNext: 'Tiếp',
    skBack: 'Quay lại',
    skUsbPickTitle: 'Chọn USB',
    skUsbPickLead:
      'Một tệp khóa bảo mật sẽ được tạo trên USB bạn chọn. Các tệp khác trên USB không bị động đến.',
    skUsbDrive: 'USB ({letter}:)',
    skNoUsb: 'Chưa cắm USB nào. Hãy cắm USB rồi nhấn [Kiểm tra lại].',
    skUsbSpareHint:
      'Nếu mất USB, TEN AI cũng không thể khôi phục khóa. Làm thêm một bản trên USB thứ hai sẽ an toàn hơn (Cài đặt › Khóa bảo mật › Tạo USB dự phòng).',
    skCreateKey: 'Tạo khóa',
    skCreating: 'Đang tạo khóa…',
    skPcTitle: 'Tạo khóa trên PC này?',
    skPcWarn:
      'Khi lưu trên PC này, GenOffice mở được mà không cần USB, nhưng bất kỳ ai khác dùng PC này cũng có thể mở và dùng AI bằng khóa API của bạn. Sau này bạn có thể chuyển khóa sang USB tại Cài đặt › Khóa bảo mật.',
    skPcAgree:
      'Tôi hiểu rằng người khác dùng PC này có thể dùng GenOffice và khóa API của tôi, và phí cũng như thiệt hại phát sinh là trách nhiệm của tôi.',
    skPcCreate: 'Tạo trên PC này',
    skUseUsb: 'Dùng USB thay thế',
    skWaitTitle: 'Hãy cắm USB khóa bảo mật',
    skWaitLead: 'GenOffice sẽ mở ngay khi bạn cắm USB chứa khóa bảo mật của nó.',
    skLostLink: 'Bạn làm mất USB?',
    skNewKey: 'Tạo khóa mới',
    skReplaced:
      'Một khóa bảo mật mới đã được tạo trên PC này vào {when}, nên USB này không còn dùng được. Nếu không phải bạn làm, hãy kiểm tra mật khẩu Windows.',
    skUnregisteredUsb:
      'USB này chưa được đăng ký. Hãy cắm USB đã tạo khóa, hoặc thêm USB này qua Cài đặt › Khóa bảo mật › Tạo USB dự phòng.',
    skDamaged: 'Không mở được khóa bảo mật. Vui lòng tạo khóa mới.',
    skRetry: 'Kiểm tra lại',
    skChecking: 'Đang kiểm tra…',
    skQuit: 'Thoát',
    skResetTitle: 'Tạo khóa bảo mật mới?',
    skReset1: 'Tài liệu và cài đặt GenOffice của bạn được giữ nguyên.',
    skReset2:
      'Các khóa API bạn đã nhập vào GenOffice sẽ bị xóa nên phải nhập lại, vì chúng được khóa bằng khóa cũ.',
    skReset3: 'Đăng nhập bằng gói đăng ký Claude và ChatGPT vẫn giữ nguyên.',
    skReset4: 'Dù tìm lại được USB cũ, khóa đó cũng không dùng được nữa.',
    skResetAgree: 'Tôi hiểu rằng các khóa API đã nhập sẽ bị xóa.',
    skResetGo: 'Tạo mới',
    skCancel: 'Hủy',
    skErrNoUsb: 'Không tìm thấy USB đã chọn. Vui lòng cắm lại USB.',
    skErrWriteFailed:
      'Không ghi được khóa vào USB. Hãy kiểm tra USB có đang bật chế độ chống ghi không rồi thử lại.',
    skCoverTitle: 'GenOffice bị khóa cho đến khi khóa bảo mật được kiểm tra',
  },
}

const tSk = createI18n(dicts)

export type SecureKeyStringKey = keyof typeof dicts.zh

/** Every key the window and the covers use */
export const SECUREKEY_STRING_KEYS = Object.keys(dicts.zh) as SecureKeyStringKey[]

export function tSecureKey(
  lang: Lang,
  key: SecureKeyStringKey,
  params?: Record<string, string | number>,
): string {
  return tSk(lang, key, params)
}

/** Every string in one language, with the same params filled in each */
export function secureKeyStrings(
  lang: Lang,
  params?: Record<string, string | number>,
): Record<string, string> {
  return Object.fromEntries(SECUREKEY_STRING_KEYS.map((key) => [key, tSk(lang, key, params)]))
}
