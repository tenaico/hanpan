/**
 * 첫 실행 "AI 연결" 단계에서 한판이 쓰는 말(0.17 리뷰 #4). 1단계가 "무료로 쓰는 AI 오피스"라고
 * 말하므로, 연결 단계도 유료 요금제를 조건처럼 말하지 않는다: AI는 Claude·ChatGPT 계정 로그인이나
 * 이 PC의 AI 모델(PC 모델), 무료 AI로 쓴다. Claude 무료 계정이 연결되지 않는 사실은 숨기지 않되,
 * 다른 길이 있다는 말과 함께 한다. 공용 문자열(strings.json)과 따로 두어 다국어 작업과 겹치지 않게 했다.
 */
import type { AiConnectPath } from '@genoffice/ui'

type Words = Partial<Record<AiConnectPath, { title?: string; body?: string }>>

const KO: Words = {
  'claude-code': {
    title: 'Claude를 써요',
    body: 'Claude 계정으로 로그인해서 씁니다. Claude 무료 계정은 연결되지 않으니, 그럴 때는 아래 "다른 방법 고르기"에서 "아직 없어요"를 고르세요.',
  },
  chatgpt: { body: 'ChatGPT 계정으로 로그인해서 씁니다. 무료 계정은 쓸 수 있는 양이 적습니다.' },
  codex: { body: 'ChatGPT 계정으로 로그인해서 씁니다. 무료 계정은 쓸 수 있는 양이 적습니다.' },
  free: {
    body: '무료 AI를 1분 안에 연결합니다. 이 PC에 AI 모델(PC 모델)이 있으면 한판이 켤 때 찾아서 씁니다.',
  },
}

const EN: Words = {
  'claude-code': {
    title: 'I use Claude',
    body: 'Sign in with your Claude account. A free Claude account cannot connect; in that case use "Choose another way" below and pick "Neither yet".',
  },
  chatgpt: { body: 'Sign in with your ChatGPT account. Free accounts get a smaller allowance.' },
  codex: { body: 'Sign in with your ChatGPT account. Free accounts get a smaller allowance.' },
  free: {
    body: 'Connect a free AI in a minute. If this PC has an AI model (the PC model), Hanpan finds and uses it at start.',
  },
}

const VI: Words = {
  'claude-code': {
    title: 'Tôi dùng Claude',
    body: 'Đăng nhập bằng tài khoản Claude. Tài khoản Claude miễn phí không kết nối được; khi đó hãy bấm "Chọn cách khác" bên dưới và chọn "Tôi chưa có cái nào".',
  },
  chatgpt: {
    body: 'Đăng nhập bằng tài khoản ChatGPT. Tài khoản miễn phí được dùng ít hơn.',
  },
  codex: { body: 'Đăng nhập bằng tài khoản ChatGPT. Tài khoản miễn phí được dùng ít hơn.' },
  free: {
    body: 'Kết nối một AI miễn phí trong một phút. Nếu máy tính này có mô hình AI (mô hình trên PC), Hanpan sẽ tìm và dùng khi khởi động.',
  },
}

export function onboardingConnectText(
  lang: string,
  path: AiConnectPath,
  part: 'title' | 'body',
): string | undefined {
  return (lang === 'ko' ? KO : lang === 'vi' ? VI : EN)[path]?.[part]
}
