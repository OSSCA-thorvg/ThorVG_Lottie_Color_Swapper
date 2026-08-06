# Lottie Color Swapper

[English](README.en.md)

Lottie 애니메이션의 색상을 브라우저에서 직접 바꾸고, 색각이상 보정을 적용해 내보내는 웹 도구입니다. 렌더링과 색상 교체 모두 [ThorVG](https://www.npmjs.com/package/@thorvg/webcanvas)로 처리합니다. Vite와 TypeScript를 사용했습니다.

[**데모**](https://ossca-thorvg.github.io/ThorVG_Lottie_Color_Swapper/)

[OSSCA 2026 참여형 프로그램](https://www.contribution.ac/) ThorVG 과정 4주차 과제로 진행한 해커톤 프로젝트입니다.

## 기능

- `.json`(Lottie), `.lottie`(dotLottie v1.0/v2.0) 열기 — 버튼 선택 및 드래그 앤 드롭
- 파일의 레이어·그룹 구조를 따라가는 색상 계층 트리, 선택 시 캔버스에서 해당 도형 강조
- 컬러 피커로 실시간 색상 편집 (재생 중에도 끊김 없음)
- 실행 취소(`Ctrl+Z`) 및 업로드 시점 색상으로 초기화
- 색각이상 보정 3종(적색맹·녹색맹·청색맹) — 미리보기와 내보내기 양쪽에 적용
- 재생 제어 — `Space` 재생/일시정지, `←` `→` 프레임 이동
- JSON 내보내기, 한국어/영어 전환

## ThorVG Slot 활용

Lottie는 색상이 도형 구조 깊숙이 박혀 있어, 색 하나를 바꾸려면 보통 JSON을 고쳐 애니메이션을 다시 로드해야 합니다. 재생이 끊기고 프레임 위치도 잃습니다.

ThorVG의 **슬롯(slot)** 은 색상 속성에 이름표(`sid`)를 붙여 로드된 애니메이션에서 그 속성만 지목해 교체하게 해줍니다. 이 도구는 그 위에 세워져 있습니다.

- `src/lottieSlots.ts` — 대부분의 Lottie에는 슬롯이 없으므로, 레이어와 precomp를 재귀적으로 훑어 정적 fill·stroke 색상에 `sid`와 `slots` 항목을 주입합니다.
- `src/renderer.ts` — 색 변경 시 재로드 없이 `animation.gen(...)` → `animation.apply(id)`로 해당 슬롯만 갱신합니다. 재생 상태와 현재 프레임이 유지되는 이유입니다.

색상 편집만으로 범위를 좁힌 것은 의도된 선택입니다. 범용 Lottie 에디터 대신 ThorVG가 제공하는 기능을 제대로 쓰는 쪽을 택했습니다.

## 색각이상 보정

보정 모델은 Viénot, Brettel & Mollon (1999), *Digital video colourmaps for checking the legibility of displays by dichromats* ([PDF](https://vision.psychol.cam.ac.uk/jdmollon/papers/colourmaps.pdf))입니다. LMS 원추세포 공간에서, sRGB를 감마 디코딩한 선형 광량에 적용합니다.

보정을 그 보정이 쓴 모델로 채점하면 순환 논증이므로, **독립적인 모델로 검증합니다** — Machado, Oliveira & Fernandes (2009), Chrome DevTools가 쓰는 모델입니다. 적록 계열은 확인된 혼동 쌍의 97% 이상을 분리하며, 청색맹은 그보다 낮습니다(Viénot의 단일 평면 투영이 적록 계열용으로 검증된 방식이기 때문).

```bash
npm run verify:cvd   # 검증 결과표 출력
```

한계: 실제 색각이상 당사자 대상 검증은 하지 않았고, 색공간 밖으로 나간 색이 잘려 들어오며(gamut clipping) 오히려 구분이 사라지는 쌍이 약 1% 있습니다. 테스트로 상한을 못 박아 두었습니다.

## 실행

```bash
npm install
npm run dev     # 개발 서버
npm run build   # 타입 검사 + 빌드
npm test        # 테스트
```

## 팀

- [@alpakaDurumi](https://github.com/alpakaDurumi) — UI, 색상 편집, json export, 색각이상 보정
- [@Saususge](https://github.com/Saususge) — Lottie/dotLottie 파서, dotLottie v1.0/v2.0 버전 지원
