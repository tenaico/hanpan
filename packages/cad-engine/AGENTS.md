# packages/cad-engine (`@genoffice/cad-engine`)

"AI 도면" 탭의 엔진이다. 화면 코드와 Node 전용 기능을 쓰지 않는 순수 코드라서 편집기 화면(`apps/cad`)과 껍데기 앱이 같은 코드를 쓴다. 설계: `docs/superpowers/specs/2026-11-16-hanpan-cad-tab-design.md`. 결정: 0101.

## 맡은 범위

- 문서 모형(`model.ts`): 단위는 mm, 위쪽이 +Z, 각도는 도(°). 회전은 X, Y, Z 순서로 돈다(R = Rz · Ry · Rx). 도형은 다섯 종류다: 기본 도형 15종(`shape`), 밑그림을 세운 입체(`extrude`), 불러온 그물(`mesh`), DXF 밑그림(`drawing`), 묶음(`group`). 묶음의 자식은 묶음을 기준으로 놓인다.
- 고치는 함수(`ops.ts`): 놓기, 바꾸기, 지우기, 묶기, 풀기, 줄 맞추기, 작업판 크기. 모두 입력 문서를 바꾸지 않고 새 문서를 돌려준다. 잘못된 값은 `CadEditError`(코드 다섯 가지)로 던진다.
- 되돌리기(`history.ts`): `CadHistory.edit`가 문서를 고치는 유일한 길이다. `openGroup`과 `closeGroup` 사이의 고침은 되돌리기 한 번이다(AI 요청 하나). 100단계까지 둔다.
- 경계 상자(`bounds.ts`)와 회전 계산(`geometry.ts`), 그물 기본 함수(`mesh.ts`).

## 맡지 않는 것 (경계)

- 그리기, 손잡이, 선택, 글꼴 읽기는 `apps/cad` 화면이 한다. "글자" 도형은 화면이 글꼴로 만든 윤곽 점을 받는다.
- 디스크에 쓰는 일은 `apps/cad`의 메인 프로세스가 한다. 엔진은 바이트와 글만 만든다.
- 3MF·GLB·PLY 읽기는 화면 쪽이 한다(DOM이 필요한 읽기 코드).

## 항상 지켜야 하는 것

- **문서는 바뀌지 않는 값이다.** 함수는 입력 문서와 그 안의 배열·객체를 고치지 않는다. 되돌리기는 이전 문서 참조를 그대로 다시 쓰는 것으로 동작한다.
- **모르는 필드를 버리지 않는다.** 문서의 `extra`와 도형의 `extra`에 두고 다음 저장에 그대로 쓴다.
- **`src/`에서 Node 내장 모듈, `Buffer`, `require`, `process`, DOM을 쓰지 않는다.** `tests/browser-safety.test.ts`와 DOM 라이브러리 없는 형 검사가 지킨다. 식별자는 `getRandomValues`로 만든다.
- **`src/index.ts`는 `export … from './파일'` 줄만 둔다.** 그래서 `src/` 아래에 하위 폴더를 두지 않는다.
- **`manifold-3d`는 3.2.1로 고정한다.** 3.3부터 명령줄 도구용 의존성(이미지 라이브러리 sharp, LGPL)이 딸려 와 `npm run licenses`가 실패한다(2026-11-16 확인).
- **다른 프로그램의 견본 파일을 넣지 않는다.** 시험 파일은 시험이 직접 만든다.

## 테스트

- 실행: `npm run test -w @genoffice/cad-engine`, `npm run typecheck -w @genoffice/cad-engine`.
- 시험용 그물은 `tests/helpers.ts`의 `cube`로 만든다.
