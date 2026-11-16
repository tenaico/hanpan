import type { zh } from './zh'

export const ko = {
  untitled: '제목 없는 도면',
  saved: '저장됨',
  unsaved: '저장 안 됨',
  noWebGlTitle: '3D 화면을 보여 줄 수 없습니다',
  noWebGlBody:
    '이 PC에서 3D 화면에 필요한 WebGL을 시작하지 못했습니다. 도면은 열고 저장할 수 있지만 화면에 보이지 않습니다. 아래 중 하나를 한 뒤 탭을 다시 여세요.',
  noWebGlDriver: '그래픽 카드 드라이버를 최신으로 갱신합니다.',
  noWebGlAccel: '그래픽 설정에서 하드웨어 가속을 켭니다.',
  noticeNotOk:
    '이 파일을 도면으로 열 수 없습니다. 파일이 손상되었거나 더 새 버전에서 만든 파일일 수 있습니다. 빈 도면을 열었고, 저장하면 새 파일 이름을 묻습니다.',
  noticeTooLarge: '파일이 너무 커서 열 수 없습니다(한도 100MB). 빈 도면을 열었습니다.',
  noticeUnreadable: '이 파일을 읽을 수 없습니다. 빈 도면을 열었습니다.',
  noticeUnsupported:
    '이 종류의 파일은 열 수 없습니다. 열 수 있는 파일은 .ttukcad, .dxf, .stl, .obj, .3mf, .glb, .ply입니다.',
  noticeImportFailed: '이 파일의 도형을 읽을 수 없습니다. 빈 도면을 열었습니다.',
  saveRefused:
    '도면을 저장하지 못했습니다. 고친 내용은 그대로 있습니다. 다시 저장하거나 다른 이름으로 저장하세요.',
  saveFailed:
    '도면을 저장하는 중에 문제가 생겼습니다. 고친 내용은 그대로 있습니다. 다시 저장하거나 다른 이름으로 저장하세요.',
  guideTitle: '이 파일을 여는 방법',
  guideBody: '{ext} 파일은 전문 CAD 프로그램이 만드는 파일이라 AI 도면에서 읽을 수 없습니다.',
  guideAsk:
    '보낸 사람에게 DXF(2D 도면)나 STL(3D 모형)로 다시 저장해서 보내 달라고 하세요. 두 파일 모두 여기서 열립니다.',
  exportEmpty: '내보낼 것이 없습니다. 도형을 하나 이상 보이게 한 뒤 다시 해 보세요.',
  exportFailed: '파일을 내보내지 못했습니다. 다시 해 보거나 다른 폴더를 고르세요.',
  exportSourcePath: '이 도면을 가져온 원본 파일에는 내보낼 수 없습니다. 다른 이름을 고르세요.',
  issueOpenMesh: '열린 그물이 들어 있어 이 묶음을 계산할 수 없습니다',
  issueTooLarge: '삼각형이 너무 많아 보여 줄 수 없습니다(한도 200만 개)',
  editLocked: '잠긴 도형입니다. 고치려면 잠금을 푸세요.',
  editNotScalable:
    '이 도형은 손잡이로 크기를 바꿀 수 없습니다. 불러온 그물, 도면, 묶음, 글자는 옮기고 돌리기만 할 수 있습니다.',
  editRefused: '그렇게 고칠 수 없습니다. 도면은 그대로입니다.',
} satisfies Record<keyof typeof zh, string>
