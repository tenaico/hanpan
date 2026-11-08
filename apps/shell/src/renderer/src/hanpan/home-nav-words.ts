/**
 * 홈 사이드바에서 한판이 따로 쓰는 말(0.17 리뷰 #18). "에이전트"는 사무직 사용자에게
 * 뜻이 닿지 않아, 한국어 화면에서는 하는 일로 부르고 고급 기능임을 알려 준다.
 * 다른 언어는 원래 문구(strings-agent)를 쓴다.
 */
const KO = {
  agent: 'AI 폴더 작업',
  agentTip:
    '폴더 속 파일을 AI(Claude Code·Codex)가 직접 읽고 고치는 고급 기능입니다. 새 창에서 열립니다.',
}

/** Vietnamese names it by what it does too (0.17 리뷰 v2 shell #34: "Tác tử") */
const VI: typeof KO = {
  agent: 'Làm việc thư mục với AI',
  agentTip:
    'Tính năng nâng cao: AI (Claude Code·Codex) đọc và sửa trực tiếp các tệp trong thư mục. Mở trong cửa sổ mới.',
}

export function homeNavText(lang: string, key: keyof typeof KO): string | undefined {
  return lang === 'ko' ? KO[key] : lang === 'vi' ? VI[key] : undefined
}
