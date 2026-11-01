# 스트럼(Strum) 뷰어 웹앱 통합 바이브코딩 프롬프트 결정판

> 이 문서는 `스트럼 Source` 폴더의 PNG 스트럼 패턴 자료와 `기타코드뷰어_바이브코딩_프롬프트_통합결정판.md`의 설계 방식을 참고해 만든, **기타·우쿨렐레 스트럼(리듬 주법) 뷰어 웹앱 개발용 최종 명세 겸 프롬프트**입니다.
>
> Cursor, Claude Code, v0, Lovable, Windsurf, Bolt, Replit Agent 등 어떤 바이브코딩 도구에도 그대로 붙여넣어 사용할 수 있게 작성했습니다.
>
> *(이 버전은 음악이론·Web Audio·프롬프트 사용성·소스 일치성 4개 관점의 교차 검수를 거쳐 보정한 결정판입니다.)*

---

## 이 문서의 두 트랙 (먼저 읽어주세요)

이 앱은 **두 단계 트랙**으로 만듭니다. 욕심내서 한 번에 다 시키지 말고, **Core를 끝낸 뒤 Upgrade를 얹으세요.**

| 트랙 | 핵심 | 무엇을 만드나 | 위험도 |
|------|------|----------------|--------|
| **Core 트랙 (필수 MVP)** | “원본 악보 이미지를 가장 잘 보여주는 뷰어” | 카테고리 → 갤러리 → 상세(확대·패닝) + 검색 + 즐겨찾기 + BPM 메트로놈 | 낮음 (이미지가 항상 정답) |
| **Upgrade 트랙 (이 앱을 ‘가장 훌륭하게’ 만드는 부분)** | “패턴을 **소리로 재생**하고 **박자에 맞춰 커서가 움직이는** 연습 도구” | 리듬 데이터(strokes) + Web Audio 스트럼 재생 + 동기 플레이헤드 + 기타/우쿨렐레 음색 | 중간 (전사·정렬 필요) |

> **왜 Upgrade가 핵심인가**: 코드(운지)는 “정지된 그림”이지만, **스트럼은 본질이 ‘리듬 = 소리와 시간’**입니다. 보기만 하는 갤러리에서 멈추면 평범하고, **“보고 → 듣고 → 따라 치는”** 도구가 되면 진짜 연습 앱이 됩니다.
>
> **두 트랙의 화해 원칙**: 표시는 항상 **원본 PNG**가 담당합니다(픽셀 정확). 소리와 플레이헤드는 **별도 리듬 데이터**가 담당합니다. 둘이 약간 어긋나도 “보이는 것”은 늘 정확하므로 안전합니다. 플레이헤드를 이미지에 억지로 맞추지 않고, 정렬은 **선택적 보정값(`xNorm`) 또는 데이터 기반 SVG 렌더러**로만 정밀화합니다.

---

## 목차
0. [이 프롬프트가 목표로 하는 앱](#0-이-프롬프트가-목표로-하는-앱)
1. [소스 자료 분석](#1-소스-자료-분석)
2. [마스터 프롬프트](#2-마스터-프롬프트)
3. [권장 기술 스택](#3-권장-기술-스택)
4. [폴더 구조](#4-폴더-구조)
5. [데이터 모델](#5-데이터-모델)
6. [화면 설계](#6-화면-설계)
7. [디자인 명세](#7-디자인-명세)
8. [단계별 개발 프롬프트 — Core 트랙 (Step 1~15)](#8-단계별-개발-프롬프트--core-트랙-step-115)
9. [업그레이드 트랙 — 오디오 재생 & 동기 플레이헤드 (Step U1~U5)](#9-업그레이드-트랙--오디오-재생--동기-플레이헤드-step-u1u5)
10. [완료 체크리스트](#10-완료-체크리스트)
11. [운영 및 확장 아이디어](#11-운영-및-확장-아이디어)
12. [마지막 품질 지시문](#12-마지막-품질-지시문)
- [부록 A. 스트럼 표기법 사전 (기호 → 의미 → 데이터)](#부록-a-스트럼-표기법-사전-기호--의미--데이터)
- [부록 B. 9개 카테고리 & 예제 인덱스 (소스 폴더 그대로)](#부록-b-9개-카테고리--예제-인덱스-소스-폴더-그대로)
- [부록 C. 파일명 → ID/슬러그 변환 규칙](#부록-c-파일명--id슬러그-변환-규칙)

---

## 0. 이 프롬프트가 목표로 하는 앱

**앱 이름:** Lesson Designer Strum Viewer
**핵심 목적:** 기타/우쿨렐레 학습자가 스트럼 패턴을 카테고리별로 빠르게 찾고, 크게 확대해서 보고, **들으면서 박자에 맞춰 따라 치며** 반복 연습할 수 있는 반응형 SPA.

이 앱은 단순 이미지 폴더 뷰어가 아니라, 다음 흐름을 갖는 **학습용 스트럼 패턴 뷰어**여야 한다.

1. **카테고리 선택:** 16Beat Variation, 3/4, 12/8, 6/8, Shuffle, Slow GoGo, Slow Rock, Calypso, Country 등 스트럼 유형(9종)을 고른다.
2. **패턴 갤러리:** 선택한 카테고리의 Ex01, Ex02… 패턴을 카드/썸네일로 훑어본다.
3. **상세 연습:** 패턴 이미지를 크게 보고, 확대/축소/가로 패닝/이전·다음 이동/BPM 메트로놈/즐겨찾기/최근 본 패턴을 사용한다. **(Upgrade)** 여기에 **재생(▶︎) + 박자 동기 플레이헤드 + 기타/우쿨렐레 음색**이 더해진다.

MVP에서는 원본 PNG 이미지를 정확히 보존한다. 이후 확장을 위해 패턴 메타데이터·리듬 데이터·이미지 asset manifest를 분리해 둔다.

---

## 1. 소스 자료 분석

`스트럼 Source` 폴더에는 총 **76개 PNG 이미지**가 있다. 대부분 “리듬 슬래시 한 줄 악보” 형식의 스트럼 패턴 이미지이며, 이미지 안에 `Ex-1`, 박자표, 다운/업 스트럼 기호, 악센트, 반복기호, 셋잇단음표 표기가 포함되어 있다.

### 1.1 폴더 구성 (실측)

| 카테고리 폴더 | 파일 수 | 대표 파일명 | 이미지 크기 특성 |
|---|---:|---|---|
| `스트럼(16Beat Variation)-[개별]` | 12 | `16Beat Variation Strum Pattern Ex 1~4(POD&전자책용)EX01.png` | 약 2370x576~590, 매우 넓음 |
| `스트럼(4분의 3박)-[개별]` | 13 | `4분의 3박 스트럼 1(Remake)[POD&전자책]Ex01.png` | 약 1143~1158x267~432 |
| `스트럼(8분의 12박)-[개별]` | 16 | `8분의 12박 스트럼 1(Remake)[POD&전자책]Ex01.png` | 약 553~562x115~130, 작고 얇음 |
| `스트럼(8분의 6박)-[개별]` | 8 | `8분의 6박 스트럼 1(Remake)[POD&전자책]Ex01.png` | 약 553~555x116~128 |
| `스트럼(Shuffle)-[개별]` | 6 | `셔플-Shuffle(Remake)[POD&전자책]Ex01.png` | 약 2282~2308x552~708, 매우 넓음 |
| `스트럼(슬로우 고고)-[개별]` | 3 | `슬로우 고고(Slow GoGo) 주법EX01.png` | 약 2358~2359x673~710, 매우 넓음 |
| `스트럼(슬로우 락)-[개별]` | 12 | `슬로우 락-Slow Rock Exercise 1~4(POD&전자책용)EX01.png` | 약 2367~2381x599~644, 매우 넓음 |
| `스트럼(칼립소)-[개별]` | 3 | `칼립소-Calypso Exercise 1~3(POD&전자책용)EX01.png` | 약 2371~2372x576~577, 매우 넓음 |
| `스트럼(컨트리)-[개별]` | 3 | `컨트리(Country) 주법EX01.png` | 약 2359~2363x588~601, 매우 넓음 |

> 합계 = 12+13+16+8+6+3+12+3+3 = **76개**. (앞으로 늘어날 수 있으니 “폴더 스캔 → 자동 등록”에 가깝게 설계한다.)

### 1.2 패턴 이미지(악보) 표기법 해부 — 무엇이 그려져 있나

모든 PNG는 **오선보가 아니라 ‘가로 한 줄(리듬 슬래시) 악보’**다. 한 줄 위에 리듬만 표기한다. 구성 요소:

1. **세로 라벨 `Ex-1`** : 맨 왼쪽에 세로로 누운 예제 번호.
2. **박자표** : `3/4`, `4/4`, `6/8`, `12/8` 등 큰 숫자.
3. **반복 기호(repeat)** : 시작·끝의 점 두 개 달린 굵은 겹세로줄(║: … :║).
4. **마디 번호** : 줄 위 작은 숫자 `1`, `2`.
5. **리듬 슬래시(노트헤드)** : 가로줄 위의 빗금(`/`) — 한 번의 ‘침’.
6. **기둥(stem)** : 슬래시에서 위로 뻗는 세로 막대.
7. **빔(beam)** : 8분음표는 굵은 가로 빔 1개, 16분음표는 빔 2개로 묶음.
8. **스트로크 기호(가장 중요)** : 줄 위쪽에 표기.
   - **다운 스트로크 `⊓`** (저음→고음, 위에서 아래로 침) — 꺽쇠/staple 모양.
   - **업 스트로크 `V`** (고음→저음, 아래에서 위로 침) — 알파벳 V 모양.
9. **악센트 `>`** : 특정 박을 세게 — 스트로크 기호 위에 표기.
10. **셋잇단음표 `3` 괄호** : Slow Rock 등에서 한 박을 3등분(triplet bracket + 숫자 3).
11. **붙임줄(tie)/이음줄(slur)** : 두 음을 잇는 곡선 — 새로 안 치고 소리를 끌기.
12. **점음표(dotted)** : 슬래시 옆 점(`.`) — 길이 1.5배.

> 이 표기법 사전은 **(a) 메트로놈 subdivision 표시**와 **(b) Upgrade 트랙의 리듬 데이터 전사** 두 곳에서 그대로 쓰인다. 전체 매핑표는 [부록 A](#부록-a-스트럼-표기법-사전-기호--의미--데이터).

### 1.3 스타일별 리듬 특징 (분석 결과)

- **6/8 · 12/8** : 한 박을 3등분하는 겹박자. 보통 8분음표 다운 스트로크가 3개씩 묶여 그룹을 이룸. 시작 박에 악센트가 흔함. (느끼는 박 = 점4분음표 → 6/8은 2박, 12/8은 4박으로 셈한다.)
- **Slow Rock** : 4/4지만 모든 박을 셋잇단(triplet)으로 — 한 마디 12개 다운 스트로크가 기본. `3` 괄호가 4개.
- **Shuffle** : 4/4를 스윙(swing)으로 — 박을 “길게-짧게”로 분할, 업/다운이 번갈아. 점8분+16분 묶음 형태.
- **16 Beat Variation** : 4/4를 16분음표(한 박 4등분)로 잘게 — 다운/업/쉼/붙임줄이 다양하게 섞임. 가장 복잡한 그룹.
- **3/4** : 한 마디 3박. 왈츠/발라드 계열. 다운 위주 + 업 변형.
- **Slow GoGo / Calypso / Country** : 4/4 대중가요 리듬. 다운·업 조합 + 악센트로 그루브를 만듦. (Country는 16분 펌핑이 강함)

### 1.4 중요한 설계 결론

- 이미지 폭 차이가 크므로(짧은 6/8 ~ 매우 넓은 16Beat) 상세 화면에는 **fit-width**, **actual-size**, **zoom slider**, **드래그 패닝**, **가로 스크롤 fallback**이 필요하다.
- 파일명에 한글, 공백, 괄호, `&`, `~`가 섞여 있으므로 배포 안정성을 위해 앱 asset은 **ASCII slug 파일명**으로 복사하고, 원본 파일명은 메타데이터에 보관한다.
- 브라우저는 배포 후 `public` 폴더를 직접 수정할 수 없으므로, 기본 이미지는 빌드 전 복사하고 사용자 업로드는 IndexedDB 또는 Supabase Storage 같은 별도 저장소로 분리한다.
- PNG 자체가 학습 자료의 원본이므로 MVP에서 OCR이나 벡터 재작성으로 원본을 대체하지 않는다. 대신 `timeSignature`, `feel`, `exerciseNo`, `difficulty`, `tags`, `bpm` 등 메타데이터와 **(Upgrade) 리듬 데이터(`strokes`)**를 붙여 검색/필터/연습/재생 기능을 강화한다.

---

## 2. 마스터 프롬프트

아래 블록을 AI 코딩 도구의 첫 메시지로 그대로 붙여넣어라. (Core 트랙용. Upgrade는 [9장](#9-업그레이드-트랙--오디오-재생--동기-플레이헤드-step-u1u5)에서 별도로 이어 붙인다.)

```text
너는 React, TypeScript, Vite, TailwindCSS, Web Audio API에 능숙한 시니어 프론트엔드 개발자다.
현재 작업 폴더에는 `스트럼 Source` 폴더가 있고, 그 안에는 기타/우쿨렐레 스트럼 패턴 PNG 이미지 76개가 카테고리별 폴더로 정리되어 있다.
이 자료를 기반으로 "Lesson Designer Strum Viewer"라는 최고 품질의 스트럼 패턴 뷰어 웹앱을 만들어라.

[앱 핵심 목표]
- 기타/우쿨렐레 학습자가 스트럼 패턴을 빠르게 찾고, 크게 확대해서 보고, BPM/메트로놈과 함께 반복 연습할 수 있는 반응형 SPA.
- 단순 이미지 갤러리가 아니라 카테고리 선택 → 패턴 갤러리 → 상세 연습 화면으로 이어지는 학습용 도구여야 한다.
- 첫 화면은 마케팅 랜딩 페이지가 아니라 실제 앱 화면이어야 한다.
- (이후 업그레이드 단계에서 패턴을 "소리로 재생 + 박자에 맞춰 움직이는 플레이헤드"를 추가할 것이므로,
  패턴을 단순 이미지가 아니라 "메타데이터 + (확장 가능한) 리듬 데이터"를 가진 객체로 모델링하라.)

[소스 자료]
- 원본 폴더: ./스트럼 Source
- 총 9개 카테고리, PNG 76개:
  1. 16Beat Variation: 12개   2. 4분의 3박: 13개   3. 8분의 12박: 16개
  4. 8분의 6박: 8개          5. Shuffle: 6개       6. 슬로우 고고: 3개
  7. 슬로우 락: 12개         8. 칼립소: 3개         9. 컨트리: 3개
- 이미지 안에는 Ex 번호, 박자표, 업(V)/다운(⊓) 스트럼 기호, 악센트(>), 반복기호, 셋잇단음표(3) 표기가 포함되어 있다.
- 원본 PNG는 학습 자료이므로 MVP에서는 이미지 자체를 정확히 보존해서 보여준다.

[기술 스택 고정]
- React + TypeScript + Vite + TailwindCSS / lucide-react 아이콘.
- 라우터 없이 React state로 3단계 화면 전환을 구현해도 된다.
- 백엔드 없이 정적 배포 가능해야 한다. Vercel/Netlify/GitHub Pages에서 동작해야 한다.
- TypeScript any는 사용하지 말고, 타입과 데이터 구조를 명확히 분리하라.

[가장 중요한 asset 처리]
- 한글/공백/괄호가 포함된 원본 파일명은 브라우저 URL과 배포에서 문제가 생길 수 있으므로 빌드 전 asset 준비 스크립트를 만든다.
- `scripts/prepareStrumAssets.mjs`를 만들어 `스트럼 Source`를 스캔하고, 이미지를 `public/strums/{categoryId}/exNN.png` 형태로 복사하라.
- 동시에 `src/data/strumPatterns.generated.ts`(또는 `src/data/strumManifest.json`)을 생성하라.
- manifest에는 id, categoryId, title, exerciseNo, displayNo, originalFileName, imageSrc, width, height, timeSignature, feel, tags, recommendedBpm을 포함하라.
- 원본 파일은 삭제하거나 변경하지 마라.

[필수 화면]
1. AppHeader        : 왼쪽 검색창 + 오른쪽 "Lesson Designer / Strum Viewer" 브랜드. 검색 대상 = 카테고리명/Ex 번호/태그/박자표/feel.
2. CategorySelector : 9개 카테고리를 카드/버튼으로. 각 카테고리는 색상/파일 수/박자·느낌 요약.
3. PatternGallery   : 선택 카테고리 패턴을 썸네일 카드로. Ex 번호/박자표/feel/난이도/즐겨찾기. lazy loading + skeleton + empty state.
4. PatternDetail    : 패턴 이미지를 크게 보는 핵심 화면. fit-width/fit-height/actual/zoom slider/reset/fullscreen/download.
                      이미지가 매우 넓으므로 드래그 패닝과 가로 스크롤을 반드시 지원. 이전/다음 이동·화살표 키·ESC·즐겨찾기.
5. PracticePanel    : BPM slider, start/stop metronome, count-in, loop, beat subdivision 표시.
                      Web Audio API 메트로놈은 사용자가 시작 버튼을 누른 뒤에만 재생(autoplay 정책).
                      MVP에서는 이미지 위에 커서를 억지로 맞추지 말고, 별도 beat indicator/count display를 제공한다.

[디자인 방향]
- 밝은 배경, 부드러운 그림자, 정돈된 카드 UI(기타 코드 뷰어 톤 계승). 첫 화면에서 실제 스트럼 자료가 바로 보이게.
- 배경은 흰색/아주 밝은 회색, 포인트는 민트/코랄/인디고/스카이/바이올렛/그린/슬레이트/로즈/골드를 카테고리별로 균형 있게.
- 어두운 배경에 이미지를 묻지 말고, 악보 PNG의 검정 기호와 흰 배경이 선명하게 보이게 한다. 모바일에서도 텍스트/버튼이 겹치지 않게.

[상태와 저장]
- selectedCategoryId, selectedPatternId, searchTerm, filters, zoom/pan, favorites, recentPatterns, metronomeState를 React state/custom hook으로 관리.
- favorites, recentPatterns는 localStorage. 사용자 업로드는 선택 기능으로 IndexedDB(lib에 격리).
- README에 반드시 적어라: "정적 배포된 웹사이트의 public 폴더는 브라우저에서 직접 수정할 수 없다.
  기본 이미지는 개발자가 프로젝트에 포함해 배포하고, 사용자 업로드 이미지는 IndexedDB 또는 서버 스토리지에 저장해야 한다."

[진행 방식]
먼저 전체 폴더 구조와 컴포넌트 설계를 제안하라.
그 다음 프로젝트 스캐폴딩 → asset 준비 스크립트 → 타입/데이터 → 레이아웃 → 카테고리 → 갤러리 →
이미지 뷰어 → 상세 연습 → 메트로놈 → 즐겨찾기/최근 본 패턴 → 접근성/반응형 → README/build 검증 순서로 단계별 구현하라.
각 단계마다 `npm run build` 또는 타입 체크가 깨지지 않게 유지하라.
```

---

## 3. 권장 기술 스택

| 항목 | 결정 | 이유 |
|---|---|---|
| 프레임워크 | React + Vite | 이미지 중심 SPA를 빠르게 만들고 정적 배포하기 좋음 |
| 언어 | TypeScript | 패턴/카테고리/메타데이터/리듬 타입 안정성 확보 |
| 스타일 | TailwindCSS | 반응형, 카드, 밝은 UI, 상태 스타일을 빠르게 구현 |
| 아이콘 | lucide-react | 검색, 확대/축소, 재생/정지, 즐겨찾기, 다운로드, 전체화면, 메트로놈 아이콘 |
| 오디오 | **Web Audio API** | 메트로놈 클릭음 + (Upgrade) 스트럼 음색. 정밀 타이밍은 **룩어헤드 스케줄러** 패턴 |
| (선택) 오디오 보조 | Tone.js | 스케줄링/신스가 복잡해지면 도입. 단 “미리 예약” 원리는 동일 |
| 저장 | localStorage | 즐겨찾기/최근 본 패턴 |
| 선택 저장 | IndexedDB(`idb`) | 사용자 업로드 패턴 이미지 |
| 배포 | Vercel/Netlify/GitHub Pages | 백엔드 없는 정적 사이트 |

> AI 지시 톤: “외부 라이브러리는 최소화. 오디오는 정확한 타이밍이 생명이니 `setInterval` 단독 말고 룩어헤드 스케줄러를 써라. 패턴은 데이터로 모델링해 표시·소리·플레이헤드를 한 소스로 처리하라.”

---

## 4. 폴더 구조

```txt
strum-viewer/
├─ public/
│  └─ strums/                          # Core: 원본 PNG를 slug 이름으로 복사
│     ├─ sixteen-beat-variation/  ex01.png … ex12.png
│     ├─ three-four/              ex01.png … ex13.png
│     ├─ twelve-eight/            ex01.png … ex16.png
│     ├─ six-eight/               ex01.png … ex08.png
│     ├─ shuffle/                 ex01.png … ex06.png
│     ├─ slow-gogo/               ex01.png … ex03.png
│     ├─ slow-rock/               ex01.png … ex12.png
│     ├─ calypso/                 ex01.png … ex03.png
│     ├─ country/                 ex01.png … ex03.png
│     └─ placeholders/ pattern-placeholder.svg
├─ scripts/
│  ├─ prepareStrumAssets.mjs           # Core: 스트럼 Source → public/strums + manifest 생성
│  └─ generateStrumSvgs.ts             # (Upgrade·선택) 리듬 데이터 → 정적 SVG 일괄 생성
├─ src/
│  ├─ components/
│  │  ├─ AppHeader.tsx
│  │  ├─ CategorySelector.tsx
│  │  ├─ CategoryCard.tsx
│  │  ├─ PatternGallery.tsx
│  │  ├─ PatternCard.tsx
│  │  ├─ PatternDetail.tsx
│  │  ├─ PatternImageViewer.tsx        # Core: 확대/패닝/fit 뷰어
│  │  ├─ PracticePanel.tsx
│  │  ├─ MetronomeControls.tsx
│  │  ├─ FilterBar.tsx
│  │  ├─ EmptyState.tsx
│  │  ├─ IconButton.tsx
│  │  ├─ StrumSheet.tsx                # (Upgrade) 이미지 + 플레이헤드/하이라이트 오버레이 래퍼
│  │  ├─ StrumSheetSvg.tsx             # (Upgrade·선택) 리듬 데이터 → SVG 악보 렌더러
│  │  ├─ TransportBar.tsx              # (Upgrade) ▶︎/⏸/⏹·BPM·루프·카운트인·악기 토글
│  │  └─ StrokeLegend.tsx              # (Upgrade) ⊓/V/>/3 기호 범례
│  ├─ data/
│  │  ├─ strumTypes.ts                 # 타입(카테고리·패턴·리듬)
│  │  ├─ strumCategories.ts            # 9개 카테고리 기본값
│  │  ├─ strumPatterns.generated.ts    # 스크립트 생성(이미지 메타) — 매 빌드 시 덮어씀
│  │  ├─ strumRhythms.ts               # (Upgrade) 패턴별 strokes 리듬 데이터(전사)
│  │  └─ patterns.ts                   # (Upgrade) generated + strumRhythms 머지 → 앱이 쓰는 단일 배열
│  ├─ audio/                           # (Upgrade)
│  │  ├─ AudioEngine.ts                # 룩어헤드 스케줄러(재생/정지/BPM/루프/카운트인)
│  │  ├─ strumVoices.ts                # 기타/우쿨렐레 스트럼·메트로놈 음색(합성)
│  │  └─ schedulePattern.ts            # StrumPattern → 스트로크별 발음 시각(스윙·셋잇단 반영)
│  ├─ hooks/
│  │  ├─ usePatternSearch.ts
│  │  ├─ useFavorites.ts
│  │  ├─ useRecentPatterns.ts
│  │  ├─ useImageZoomPan.ts
│  │  ├─ useMetronome.ts               # Core: 메트로놈
│  │  └─ useTransport.ts               # (Upgrade) 재생 상태 + progress(플레이헤드) 훅
│  ├─ lib/
│  │  ├─ slug.ts
│  │  ├─ assetManifest.ts
│  │  ├─ storage.ts                    # 즐겨찾기/최근 + (선택)IndexedDB 격리
│  │  ├─ metronome.ts
│  │  └─ rhythm.ts                     # (Upgrade) 박자·분할·스윙·셋잇단 → 시간(초) 계산
│  ├─ styles/ globals.css
│  ├─ App.tsx
│  └─ main.tsx
├─ package.json
├─ tailwind.config.js
└─ README.md
```

---

## 5. 데이터 모델

### 5.1 타입 정의 (`src/data/strumTypes.ts`)

```ts
export type StrumCategoryId =
  | 'sixteen-beat-variation'
  | 'three-four'
  | 'twelve-eight'
  | 'six-eight'
  | 'shuffle'
  | 'slow-gogo'
  | 'slow-rock'
  | 'calypso'
  | 'country';

export type TimeSignature = '4/4' | '3/4' | '12/8' | '6/8';

export type StrumFeel =
  | 'straight'
  | 'sixteenth'
  | 'triplet'
  | 'shuffle'
  | 'slow'
  | 'latin'
  | 'country';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export type BpmRange = { min: number; max: number; default: number };

export type StrumCategory = {
  id: StrumCategoryId;
  labelKo: string;
  labelEn: string;
  shortLabel: string;
  description: string;
  timeSignature: TimeSignature;
  feel: StrumFeel;
  color: string;
  accentColor: string;
  patternCount: number;
  recommendedBpm: BpmRange;
  tags: string[];
};

export type StrumPattern = {
  id: string;                 // '{categoryId}_ex{2자리}'  예) 'country_ex01' — strumRhythms 키와 동일
  categoryId: StrumCategoryId;
  title: string;              // '{labelEn} Ex-{exerciseNo}'  예) 'Country Ex-1'
  exerciseNo: number;
  displayNo: string;          // 'Ex01'
  originalFileName: string;
  imageSrc: string;           // '/strums/{category}/ex01.png'
  width: number;
  height: number;
  timeSignature: TimeSignature;
  feel: StrumFeel;
  difficulty: Difficulty;
  recommendedBpm: BpmRange;   // PNG엔 BPM이 없으므로 카테고리의 recommendedBpm을 복사해 채운다(§Step 2)
  tags: string[];
  notes?: string;

  // ── (Upgrade) 리듬 데이터: 있으면 오디오 재생 + 동기 플레이헤드가 켜진다. 없으면 Core 기능만. ──
  rhythm?: StrumRhythm;
};
```

### 5.2 카테고리 기본값 (`src/data/strumCategories.ts`)

```ts
export const strumCategories: StrumCategory[] = [
  {
    id: 'sixteen-beat-variation',
    labelKo: '16비트 변형', labelEn: '16Beat Variation', shortLabel: '16Beat',
    description: '팝·발라드·모던 워십에서 자주 쓰는 16분음표 기반 변형 패턴',
    timeSignature: '4/4', feel: 'sixteenth',
    color: '#14b8a6', accentColor: '#f97316',
    patternCount: 12, recommendedBpm: { min: 60, max: 120, default: 82 },
    tags: ['16beat', 'variation', 'pop', 'worship'],
  },
  {
    id: 'three-four',
    labelKo: '4분의 3박', labelEn: '3/4 Strum', shortLabel: '3/4',
    description: '왈츠 계열 곡에 어울리는 3박 스트럼 패턴',
    timeSignature: '3/4', feel: 'straight',
    color: '#f97316', accentColor: '#2563eb',
    patternCount: 13, recommendedBpm: { min: 60, max: 130, default: 90 },
    tags: ['3/4', 'waltz'],
  },
  {
    id: 'twelve-eight',
    labelKo: '8분의 12박', labelEn: '12/8 Strum', shortLabel: '12/8',
    description: '느린 발라드와 블루스 감성에 어울리는 12/8 패턴',
    timeSignature: '12/8', feel: 'triplet',
    color: '#6366f1', accentColor: '#22c55e',
    patternCount: 16, recommendedBpm: { min: 45, max: 100, default: 66 },
    tags: ['12/8', 'triplet', 'ballad'],
  },
  {
    id: 'six-eight',
    labelKo: '8분의 6박', labelEn: '6/8 Strum', shortLabel: '6/8',
    description: '두 박 큰 흐름으로 연습하기 좋은 6/8 스트럼',
    timeSignature: '6/8', feel: 'triplet',
    color: '#0ea5e9', accentColor: '#f59e0b',
    patternCount: 8, recommendedBpm: { min: 50, max: 120, default: 76 },
    tags: ['6/8', 'triplet'],
  },
  {
    id: 'shuffle',
    labelKo: '셔플', labelEn: 'Shuffle', shortLabel: 'Shuffle',
    description: '스윙감 있는 셔플 리듬 패턴',
    timeSignature: '4/4', feel: 'shuffle',
    color: '#a855f7', accentColor: '#eab308',
    patternCount: 6, recommendedBpm: { min: 60, max: 140, default: 96 },
    tags: ['shuffle', 'swing'],
  },
  {
    id: 'slow-gogo',
    labelKo: '슬로우 고고', labelEn: 'Slow GoGo', shortLabel: 'Slow GoGo',
    description: '느린 템포의 안정적인 4/4 고고 패턴',
    timeSignature: '4/4', feel: 'slow',
    color: '#22c55e', accentColor: '#ef4444',
    patternCount: 3, recommendedBpm: { min: 55, max: 105, default: 74 },
    tags: ['slow', 'gogo'],
  },
  {
    id: 'slow-rock',
    labelKo: '슬로우 락', labelEn: 'Slow Rock', shortLabel: 'Slow Rock',
    description: '셋잇단음표 흐름과 긴 호흡을 익히는 슬로우 락 패턴',
    timeSignature: '4/4', feel: 'triplet',
    color: '#334155', accentColor: '#fb7185',
    patternCount: 12, recommendedBpm: { min: 45, max: 95, default: 64 },
    tags: ['slow rock', 'triplet'],
  },
  {
    id: 'calypso',
    labelKo: '칼립소', labelEn: 'Calypso', shortLabel: 'Calypso',
    description: '싱코페이션과 업스트로크 감각을 익히는 칼립소 패턴',
    timeSignature: '4/4', feel: 'latin',
    color: '#f43f5e', accentColor: '#06b6d4',
    patternCount: 3, recommendedBpm: { min: 70, max: 140, default: 104 },
    tags: ['calypso', 'latin', 'syncopation'],
  },
  {
    id: 'country',
    labelKo: '컨트리', labelEn: 'Country', shortLabel: 'Country',
    description: '경쾌한 다운/업 흐름과 악센트를 연습하는 컨트리 패턴',
    timeSignature: '4/4', feel: 'country',
    color: '#ca8a04', accentColor: '#16a34a',
    patternCount: 3, recommendedBpm: { min: 70, max: 150, default: 112 },
    tags: ['country', 'accent'],
  },
];
```

### 5.3 (Upgrade) 리듬·스트로크 타입 (`src/data/strumTypes.ts`에 추가)

```ts
// 한 번의 "침" 또는 "쉼"
export type StrokeDir =
  | 'down'   // 다운 스트로크 ⊓ (저음→고음)
  | 'up'     // 업 스트로크 V (고음→저음)
  | 'rest'   // 쉼(소리 없음)
  | 'mute';  // 뮤트(퍼커시브, 짧고 둔탁)

export type Stroke = {
  // 마디 안에서의 위치(분할 격자 인덱스). 칸 수 cells = beatsPerBar * subdivision, step은 0..(cells-1).
  step: number;
  dir: StrokeDir;
  accent?: boolean;       // 악센트 > (세게)
  tie?: boolean;          // 붙임줄: 새로 안 치고 이전 음을 지속
  durationSteps?: number; // 음 길이(격자 단위, 기본 1) — 16분=1, 8분=2, 점8분=3 등
  xNorm?: number;         // (선택) 0..1, 소스 이미지 가로상의 정확한 위치(플레이헤드 정밀 정렬용)
};

export type StrumRhythm = {
  timeSignature: [number, number];        // [4,4] / [3,4] / [6,8] / [12,8]
  pulseNote: 'quarter' | 'dotted-quarter';// bpm이 가리키는 "박"의 단위. 단순박자=4분, 겹박자(6/8·12/8)=점4분
  beatsPerBar: number;                     // 한 마디의 "느끼는 박" 수 (3/4→3, 4/4→4, 6/8→2, 12/8→4)
  subdivision: number;                     // 한 박(pulseNote)을 쪼개는 격자 해상도 = 마디 최소분할(섞이면 LCM). 16분=4, 8분=2, 셋잇단·겹박자=3
  bars: number;                            // 보통 1 (반복)
  feelTiming: 'straight' | 'swing' | 'triplet' | 'compound';
  swing?: number;                          // 0.5~0.75 (정박0.5·셋잇단0.667·하드셔플0.65·점8분0.75). feelTiming='swing'일 때만
  strokes: Stroke[];                       // 리듬의 핵심

  // 이미지 위 플레이헤드 정렬용(선택). 없으면 imageLeftPad/imageRightPad로 step→x 균등 매핑.
  imageLeftPad?: number;                   // 악보 시작 x (이미지 폭 대비 0..1)
  imageRightPad?: number;                  // 악보 끝 x (0..1)
};
```

> ⚠️ **컨벤션 고정**: `step`은 “분할 격자 인덱스”라는 단 하나의 규칙만 쓴다. **칸 수 `cells = beatsPerBar * subdivision`, `step`은 `0..cells-1`.** 예: 4/4 16분 → 4×4 = 16칸(0..15); 3/4 8분 → 3×2 = 6칸; 6/8 → 2×3 = 6칸. `subdivision`은 “한 박을 쪼개는 격자”이며 마디에서 쓰인 가장 잘게 쪼갠 값으로 잡는다(여러 길이가 섞이면 LCM). 빔 1개(8분)·점8분 등 음 길이는 `step`이 아니라 `durationSteps`로 표현한다. 이 규칙을 강하게 못박아 좌우/박 어긋남을 방지한다.

### 5.4 (Upgrade) 패턴 리듬 데이터 전사 예시 (`src/data/strumRhythms.ts`)

> 아래는 **소스 PNG를 보고 전사한 예시**다. 나머지는 `스트럼 Source/`의 실제 이미지를 보고 같은 형식으로 채운다. 데이터가 약간 틀려도 “보이는 악보(이미지)”가 항상 정답이라 안전하다(데이터는 소리/플레이헤드용).

```ts
import type { StrumRhythm } from './strumTypes';

// 패턴 id → 리듬 데이터 (없는 패턴은 Core 기능만 동작)
export const strumRhythms: Record<string, StrumRhythm> = {
  // ── 6/8 Ex-1 : 8분음표 다운 6개(3+3 그룹), 점4분 2박 각 머리 악센트 (소스 확인: 가장 단순) ──
  'six-eight_ex01': {
    timeSignature: [6, 8], pulseNote: 'dotted-quarter', beatsPerBar: 2, subdivision: 3, bars: 1, feelTiming: 'compound',
    strokes: [
      { step: 0, dir: 'down', accent: true }, { step: 1, dir: 'down' }, { step: 2, dir: 'down' },
      { step: 3, dir: 'down', accent: true }, { step: 4, dir: 'down' }, { step: 5, dir: 'down' },
    ],
  },

  // ── 12/8 Ex-1 : 8분음표 다운 12개(3×4 그룹), 점4분 4박 각 머리 악센트 ──
  'twelve-eight_ex01': {
    timeSignature: [12, 8], pulseNote: 'dotted-quarter', beatsPerBar: 4, subdivision: 3, bars: 1, feelTiming: 'compound',
    strokes: Array.from({ length: 12 }, (_, i) => ({ step: i, dir: 'down' as const, accent: i % 3 === 0 })),
  },

  // ── Slow Rock Ex-1 : 4/4, 모든 박 셋잇단(triplet) 다운 12개 ──
  'slow-rock_ex01': {
    timeSignature: [4, 4], pulseNote: 'quarter', beatsPerBar: 4, subdivision: 3, bars: 1, feelTiming: 'triplet',
    strokes: Array.from({ length: 12 }, (_, i) => ({ step: i, dir: 'down' as const, accent: i % 3 === 0 })),
  },

  // ── 3/4 Ex-1 : 1박 다운(악센트), 2·3박은 다운+뒷박 업 (D | D U | D U) (예시·근사) ──
  'three-four_ex01': {
    timeSignature: [3, 4], pulseNote: 'quarter', beatsPerBar: 3, subdivision: 2, bars: 1, feelTiming: 'straight',
    strokes: [
      { step: 0, dir: 'down', accent: true },
      { step: 2, dir: 'down' }, { step: 3, dir: 'up' },
      { step: 4, dir: 'down' }, { step: 5, dir: 'up' },
    ],
  },

  // ── Shuffle Ex-1 : 1박 다운, 2~4박 다운+스윙업 (D | D U | D U | D U), 뒷박 업이 늦게(스윙) (예시·근사) ──
  'shuffle_ex01': {
    timeSignature: [4, 4], pulseNote: 'quarter', beatsPerBar: 4, subdivision: 2, bars: 1, feelTiming: 'swing', swing: 0.65,
    // 8분 격자(cells = 4*2 = 8). 짝수 step=박머리(다운), 홀수 step=뒷박(스윙 업, 박의 65% 지점)
    strokes: [
      { step: 0, dir: 'down' },
      { step: 2, dir: 'down' }, { step: 3, dir: 'up' },
      { step: 4, dir: 'down' }, { step: 5, dir: 'up' },
      { step: 6, dir: 'down' }, { step: 7, dir: 'up' },
    ],
  },
};
```

> 나머지 패턴(16 Beat, Country, Calypso, Slow GoGo, 각 스타일 Ex-2~)은 [부록 B 인덱스](#부록-b-9개-카테고리--예제-인덱스-소스-폴더-그대로)와 실제 PNG를 보고 같은 형식으로 채운다. (전사 우선순위는 §U1 참고: 각 카테고리 Ex-1부터.)

### 5.5 스트럼 표기법 → 데이터 매핑 (요약)

| 악보 기호 | 데이터(`Stroke`/`StrumRhythm`) | 소리 |
|-----------|--------------------------------|------|
| `⊓` 다운 | `dir:'down'` | 저현→고현 빠른 아르페지오 |
| `V` 업 | `dir:'up'` | 고현→저현 빠른 아르페지오 |
| `>` 악센트 | `accent:true` | gain↑ |
| `3` 셋잇단 | `feelTiming:'triplet'`, `subdivision:3` | 균등 3분할 |
| 빔 1개(8분)/2개(16분) | 음 길이 `durationSteps`(16분=1·8분=2·점8분=3). 격자는 `subdivision`(마디 최소분할) | 8분/16분 길이 |
| 점음표 `.` | `durationSteps` 조정 | 더 길게 |
| 곡선 tie | `tie:true` | 새로 안 침, 지속 |
| 쉼표 | `dir:'rest'` | 무음 |
| ×머리(뮤트) | `dir:'mute'` | 짧고 둔탁 |
| `║: … :║` | `bars`·loop | 반복 |
| 셔플 “길게-짧게” | `feelTiming:'swing'`, `swing≈0.65` | 뒷박 지연 |

전체 사전은 [부록 A](#부록-a-스트럼-표기법-사전-기호--의미--데이터).

---

## 6. 화면 설계

### 6.1 전체 앱 레이아웃
- `AppHeader`는 상단 고정/sticky. 왼쪽 검색창, 오른쪽 브랜드 + 아이콘 버튼.
- 본문은 `max-width: 1200px`. 단 상세 이미지 뷰어는 넓은 이미지를 위해 데스크톱에서 더 넓게 쓸 수 있다.
- 첫 화면은 카테고리 카드 + 최근 본/추천 패턴이 바로 보이는 실제 앱 화면(랜딩 아님).

### 6.2 카테고리 선택 화면
- 9개 카테고리 카드를 3~4열로 배치. 각 카드 = `shortLabel`/`labelKo`/파일 수/박자표/추천 BPM/색상 포인트.
- hover 시 살짝 떠오르고, active는 색상 링·그림자로 강조. 모바일 1~2열.

### 6.3 패턴 갤러리
- 선택 카테고리 패턴을 카드 그리드로. 썸네일은 흰 캔버스 안 `object-fit: contain`(원본 비율 유지, 넓은 악보가 잘리지 않게).
- 카드 정보: Ex 번호, 카테고리명, 박자표, 추천 BPM, 즐겨찾기 버튼, (Upgrade·rhythm 있으면) 작은 ▶︎ 미리듣기.
- 정렬: Ex 번호순 / 최근 본 순 / 즐겨찾기 우선 / 난이도순.

### 6.4 상세 연습 화면 (앱의 중심)
필수 기능:
- 이미지 fit-width / fit-height / 실제 크기 / zoom in·out / zoom slider / reset / 드래그 패닝.
- 마우스 휠 확대는 `Ctrl` 또는 viewer focus 시에만 과하지 않게. 모바일 pinch zoom은 기본 제스처와 충돌 없이.
- 전체화면 / 다운로드 / 이전·다음 패턴 / 같은 카테고리 썸네일 rail.
- 키보드: `←/→` 이전·다음, `Esc` 뒤로, `+/-` 확대·축소, `0` 보기 초기화, `Space` 메트로놈(또는 재생) 시작·정지(입력창 포커스 시 차단).
- 패턴을 열면 `useRecentPatterns`에 기록.

### 6.5 연습 패널 (PracticePanel) — 2단계
**Core(MVP)**: 이미지 위에 정확한 재생 커서를 억지로 맞추지 않는다(음표 좌표 데이터가 없으므로). 대신:
- BPM slider + number input, start/stop, count-in 1마디, 소리 on/off, 강박 accent on/off.
- subdivision 카운트 표시(별도 패널):
  - 4/4 straight: `1 & 2 & 3 & 4 &`
  - 16beat: `1 e & a 2 e & a 3 e & a 4 e & a`
  - 3/4: `1 & 2 & 3 &`   ·   6/8(2박으로 셈): `1 & a 2 & a`   ·   12/8(4박으로 셈): `1 & a 2 & a 3 & a 4 & a`
  - shuffle/triplet: `1 & a 2 & a …` (또는 `1 trip let 2 trip let …`)
- 현재 beat indicator는 이미지 밖 별도 패널에서 점등.

**Upgrade**: 해당 패턴에 `rhythm` 데이터가 있으면 패널이 **재생 모드**로 승격된다 → [9장](#9-업그레이드-트랙--오디오-재생--동기-플레이헤드-step-u1u5).

### 6.6 (Upgrade) 동기 플레이헤드 & 하이라이트 (StrumSheet)
- 상세 이미지 위에 **오버레이 레이어**를 얹어, 재생 중 빨강 **세로 플레이헤드**가 악보 위를 지나가고 현재 스트로크가 하이라이트된다.
- 위치 계산: 진행률 `progress = clamp((ctx.currentTime - engine.currentBarStartTime) / barDuration, 0, 1)` → 화면 x. (이미지 모드는 `xNorm` 보간 또는 `imageLeftPad/imageRightPad` 균등 매핑, SVG 모드는 좌표 직접.) **플레이헤드는 오디오 클럭(`currentBarStartTime`)만 사용** — `performance.now`/rAF 타임스탬프로 추정 금지.
- `rhythm`이 없는 패턴은 플레이헤드 없이 Core 메트로놈만 — **두 모드가 한 화면에서 자연스럽게 공존**해야 한다.

---

## 7. 디자인 명세

### 7.1 톤
- 배경 `#fbfbf8`/`#ffffff`. 텍스트 `#172033`/`#334155`, 보조 `#64748b`.
- 카드: 흰색, 얕은 그림자, 8px radius. 버튼: 아이콘 중심 + tooltip.
- 패턴 이미지 영역: 흰 배경 + 얇은 경계선. 원본 PNG가 또렷하게 보이도록 불필요한 오버레이 금지(단 Upgrade 플레이헤드/하이라이트는 예외).

### 7.2 색상 팔레트 (카테고리 포인트, 한 계열로만 몰지 않기)
민트 `#14b8a6` · 코랄 `#f97316` · 인디고 `#6366f1` · 스카이 `#0ea5e9` · 바이올렛 `#a855f7` · 그린 `#22c55e` · 슬레이트 `#334155` · 로즈 `#f43f5e` · 골드 `#ca8a04`.

### 7.3 반응형 기준
| 화면 | 카테고리 | 갤러리 | 상세 이미지 |
|---|---|---|---|
| Desktop | 3~4열 | 3~4열 | 큰 viewer + 오른쪽 연습/Transport 패널 |
| Tablet | 2~3열 | 2~3열 | viewer 위, 패널 아래 |
| Mobile | 1~2열 | 1~2열 | viewer 전체폭(가로 스크롤), 하단 sticky controls |

### 7.4 접근성
- 모든 클릭 요소는 `button`. 이미지 `alt="${title} 스트럼 패턴 악보"`.
- 선택 카테고리 `aria-pressed`/`aria-current`. icon-only 버튼 `aria-label` + tooltip.
- 색상만으로 상태 구분 금지(border/ring/text 병행). `focus-visible` ring 명확.
- 재생 상태는 아이콘+텍스트(`재생 중`)로 스크린리더에 알림. 오디오는 사용자 제스처 후 `AudioContext.resume()`.

### 7.5 (Upgrade) 플레이헤드 / 하이라이트 비주얼
- 플레이헤드: 빨강 세로선(2~3px) + 옅은 글로우. `requestAnimationFrame`으로 매 프레임 갱신(절대 `setInterval` 단독 금지 → 끊김).
- 현재 스트로크 하이라이트: 반투명 노랑 원/박스, 악센트면 더 진하게. 박마다 `scale 1→1.15→1` 펄스(0.1s).
- 카운트인 중에는 `progress=0`으로 두고 `1·2·3·4` 오버레이만 표시. 정지 시 플레이헤드는 시작 위치로 복귀(또는 마지막 위치 유지 옵션).

---

## 8. 단계별 개발 프롬프트 — Core 트랙 (Step 1~15)

각 블록을 하나씩 순서대로 붙여넣어 개발한다. 각 단계 후 `npm run build`/타입 체크가 깨지지 않게 유지한다.

### Step 1. 프로젝트 스캐폴딩
```text
React + TypeScript + Vite + TailwindCSS 프로젝트를 생성하라. 앱 이름은 `lesson-designer-strum-viewer`.
기본 예제 코드를 제거하고 폴더를 만든다: public/strums, scripts, src/components, src/data, src/hooks, src/lib, src/styles.
lucide-react를 설치하라. Tailwind를 정상 설정하고 기본 배경 #fbfbf8, 기본 폰트 Pretendard(또는 시스템 sans-serif).
첫 화면에는 임시로 "Lesson Designer Strum Viewer"와 빈 레이아웃만 표시한다.
```

### Step 2. Asset 준비 스크립트
```text
`scripts/prepareStrumAssets.mjs`를 만들어라.
- `./스트럼 Source` 하위 PNG를 모두 스캔한다.
- 카테고리 폴더명을 categoryId로 매핑한다:
  스트럼(16Beat Variation)-[개별] -> sixteen-beat-variation
  스트럼(4분의 3박)-[개별] -> three-four
  스트럼(8분의 12박)-[개별] -> twelve-eight
  스트럼(8분의 6박)-[개별] -> six-eight
  스트럼(Shuffle)-[개별] -> shuffle
  스트럼(슬로우 고고)-[개별] -> slow-gogo
  스트럼(슬로우 락)-[개별] -> slow-rock
  스트럼(칼립소)-[개별] -> calypso
  스트럼(컨트리)-[개별] -> country
- 각 PNG를 `public/strums/{categoryId}/exNN.png`로 복사한다(번호 2자리 0패딩).
- 원본 파일명에서 "확장자 바로 앞" 번호를 추출해 exerciseNo를 만든다.
  정규식: /(?:Ex|EX)\s*0*(\d+)(?=\.png$)/  (또는 모든 매치 중 마지막을 취한다).
  ⚠️ 16Beat 파일명엔 중간에 범위 라벨 'Ex 1~4'가 있어, 끝에 고정하지 않으면 그 'Ex 1'이 먼저 잡혀 전부 오매치된다.
- id/표시 규칙을 고정한다: id = `{categoryId}_ex{2자리}` (예: country_ex01), displayNo = `Ex{2자리}`,
  title = `{labelEn} Ex-{exerciseNo}` (예: "Country Ex-1"). 이 id는 strumRhythms 키와 1:1로 일치해야 한다(머지 키).
- recommendedBpm은 PNG/파일명에 없으므로 해당 categoryId 카테고리의 recommendedBpm을 각 패턴에 복사해 채운다.
- 이미지 width/height를 읽어 manifest에 포함한다(image-size 패키지 또는 PNG 헤더 직접 파싱).
- `src/data/strumPatterns.generated.ts`를 생성한다(필드: id, categoryId, title, exerciseNo, displayNo,
  originalFileName, imageSrc, width, height, timeSignature, feel, tags, recommendedBpm). StrumPattern[] 타입을 만족해야 한다.
- public/strums/placeholders/pattern-placeholder.svg(연회색 빈 악보 한 줄)도 생성한다.
- 원본 파일은 절대 수정/삭제하지 마라. package.json에 "prepare:strums": "node scripts/prepareStrumAssets.mjs" 추가.
```

### Step 3. 타입과 카테고리 데이터
```text
`src/data/strumTypes.ts`와 `src/data/strumCategories.ts`를 만들어라.
strumTypes.ts: StrumCategoryId, TimeSignature, StrumFeel, Difficulty, BpmRange, StrumCategory, StrumPattern
  (StrumPattern에는 이후 업그레이드용 optional `rhythm?: StrumRhythm` 필드도 미리 선언. StrokeDir/Stroke/StrumRhythm 타입도 §5.3대로 정의).
strumCategories.ts: 9개 카테고리 데이터(§5.2). 파일 수는 실제값과 일치:
  16Beat 12, 3/4 13, 12/8 16, 6/8 8, Shuffle 6, Slow GoGo 3, Slow Rock 12, Calypso 3, Country 3.
```

### Step 4. 앱 상태 구조
```text
App.tsx 상태 설계: searchTerm, selectedCategoryId, selectedPatternId, sortMode, activeFilters, viewer zoom/pan.
favorites/recentPatterns는 custom hook으로 분리: useFavorites(localStorage, toggleFavorite), useRecentPatterns(최대 12개).
라우터 없이 화면 상태를 구분: home(카테고리+추천/최근) / gallery(카테고리 패턴) / detail(상세 연습).
```

### Step 5. Header와 검색
```text
AppHeader.tsx: 왼쪽 브랜드(Lesson Designer / Strum Viewer), 큰 검색창, 오른쪽 icon-only(home/favorites/info).
검색 대상: 카테고리 한/영문명, 패턴 title, Ex 번호, 박자표, feel, tags. 결과가 있으면 카테고리 미선택이어도 갤러리에 검색결과 표시.
```

### Step 6. 카테고리 선택 UI
```text
CategoryCard.tsx, CategorySelector.tsx.
CategoryCard: props(category, active, onSelect). 색상 포인트/shortLabel/labelKo/labelEn/patternCount/timeSignature/recommendedBpm. hover·active 부드럽게. button+aria-pressed.
CategorySelector: 9개를 반응형 그리드. 선택 카테고리 active. 파일 수 합계 76 확인 가능하게.
```

### Step 7. 패턴 검색/필터 훅
```text
usePatternSearch.ts.
입력: patterns, categories, searchTerm, selectedCategoryId, activeFilters, sortMode, favorites, recentPatterns.
출력: filteredPatterns, grouped counts, empty reason.
검색: 대소문자 무시, 한/영 부분 일치, Ex01/1 번호 검색. 정렬: exerciseNo 기본, favorite-first, recent-first.
```

### Step 8. 갤러리와 패턴 카드
```text
PatternCard.tsx, PatternGallery.tsx.
PatternCard: 썸네일을 흰 캔버스 안 object-fit contain. Ex 번호/title/timeSignature/recommended BPM/tags 일부 + 즐겨찾기 토글. 클릭 시 detail. lazy loading + skeleton/shimmer.
  이미지 onError 시 /strums/placeholders/pattern-placeholder.svg로 폴백.
PatternGallery: 필터/정렬 바 + 카드 그리드(desktop 3~4 / tablet 2~3 / mobile 1~2). 결과 없음 EmptyState. 넓은 PNG가 썸네일에서 잘리지 않게 aspect-ratio/object-fit 안정 설정.
```

### Step 9. 이미지 뷰어 핵심 컴포넌트
```text
PatternImageViewer.tsx + useImageZoomPan.ts.
props: pattern, zoom, pan, onZoomChange, onPanChange, mode('fit-width'|'fit-height'|'actual').
기능: fit-width/fit-height/actual/zoom in·out/reset/drag pan/더블클릭 fit·actual 토글/wheel zoom(Ctrl 또는 focus 시)/로딩 상태/alt.
  로딩 실패 시 /strums/placeholders/pattern-placeholder.svg로 폴백.
주의: 원본 비율 왜곡 금지. 넓은 악보 좌우 패닝 자연스럽게. 모바일은 fit-width로 시작하고 화면을 밀어내지 않게.
```

### Step 10. 상세 연습 화면
```text
PatternDetail.tsx.
구성: 상단(뒤로/카테고리명/Ex 번호/즐겨찾기/이전·다음) + 중앙(PatternImageViewer) + 우측·하단(PracticePanel) + 하단(같은 카테고리 썸네일 rail).
키보드: ←/→ 이전·다음, Esc 뒤로, +/- 확대·축소, 0 reset, Space 메트로놈 start/stop(input focus 시 차단). 진입 시 useRecentPatterns 기록.
```

### Step 11. 메트로놈과 연습 패널 (Core)
```text
useMetronome.ts + PracticePanel.tsx + MetronomeControls.tsx.
useMetronome: Web Audio 클릭음, bpm/isPlaying/accentEnabled/countInEnabled/subdivision label/start/stop/setBpm. 사용자 제스처 후 AudioContext resume.
PracticePanel: BPM slider+number, start/stop, count-in, accent, loop, 현재 beat/subdivision 표시(§6.5). 카테고리 recommendedBpm을 초기값으로.
MVP에서는 이미지 위에 커서를 억지로 올리지 않는다(좌표 데이터 없음). 별도 beat indicator로 충분.
```

### Step 12. 즐겨찾기와 최근 본 패턴
```text
useFavorites.ts, useRecentPatterns.ts 완성.
favorites: key 'lesson-designer-strum-favorites', id 배열, toggleFavorite/isFavorite.
recentPatterns: key 'lesson-designer-strum-recent', id 배열, 최대 12개, detail 진입 시 최신으로.
홈 화면에 최근 본/즐겨찾기 일부 표시.
```

### Step 13. 사용자 업로드 확장 구조 (선택)
```text
사용자 커스텀 스트럼 패턴 업로드(선택 기능): 기본 76개와 별개로 png/svg/webp 추가, IndexedDB 저장.
src/lib/storage.ts(또는 customPatternStorage.ts)에 격리. 최대 5MB, title/categoryId/timeSignature/bpm/tags 입력.
README·주석에 반드시: "정적 배포된 웹사이트의 public 폴더는 브라우저에서 직접 수정할 수 없다.
기본 이미지는 개발자가 프로젝트에 포함해 배포하고, 사용자 업로드 이미지는 IndexedDB 또는 서버 스토리지에 저장해야 한다."
```

### Step 14. 반응형/접근성/디자인 polish
```text
모바일 375px에서 텍스트·버튼 안 겹침. viewer가 화면을 밀어내지 않음. icon button tooltip+aria-label. focus-visible ring.
카테고리/카드/상세 전환 애니메이션. 이미지 skeleton. empty/error 상태. 색 팔레트가 한 계열로만 보이지 않게. 카드 중첩 금지. 첫 화면은 실제 앱 화면.
```

### Step 15. README, 검증, 배포
```text
README.md: 앱 소개 / 실행(npm run prepare:strums, npm run dev, npm run build) / 폴더 구조 / 스트럼 이미지 추가법 /
asset slug 규칙 / manifest 생성 방식 / 정적 배포 주의사항 / 사용자 업로드 한계 / Supabase 확장 아이디어.
마지막으로 npm run prepare:strums 와 npm run build 를 실행하고 문제를 수정하라. 빌드 성공이 완료 조건.
```

---

## 9. 업그레이드 트랙 — 오디오 재생 & 동기 플레이헤드 (Step U1~U5)

> **이 앱을 ‘가장 훌륭하게’ 만드는 부분.** Core가 끝난 뒤 진행한다. 표시는 이미지가 그대로 담당하고, 여기서는 **소리와 플레이헤드**를 더한다.
> 시작 전, AI에 이 안내를 먼저 붙여라:

```text
지금부터 스트럼 뷰어에 "오디오 재생 + 박자 동기 플레이헤드" 기능을 추가한다. 원칙:
- 표시는 기존 원본 PNG가 담당한다(픽셀 정확). 소리/플레이헤드는 별도 리듬 데이터(strokes)에서 구동한다.
- 둘이 약간 어긋나도 "보이는 악보"는 늘 정확하므로 안전하다. 플레이헤드를 이미지에 억지로 맞추지 말고,
  정렬은 선택적 보정값(xNorm) 또는 데이터 기반 SVG 렌더러로만 정밀화한다.
- bpm은 항상 "느끼는 박"(pulseNote): 단순박자=4분음표, 겹박자(6/8·12/8)=점4분음표. 이걸로 템포·메트로놈 카운트를 일치시킨다.
- 오디오 타이밍은 setInterval 단독 금지. "룩어헤드 스케줄러"로 AudioContext.currentTime에 미리 예약한다.
- rhythm 데이터가 없는 패턴은 기존 Core 메트로놈만 동작해야 한다(두 모드 공존).
```

### Step U1. 리듬 데이터 모델 & 전사
```text
src/data/strumTypes.ts에 StrokeDir, Stroke, StrumRhythm 타입(§5.3, pulseNote 포함)을 추가하라. StrumPattern에 optional rhythm 필드 연결.
src/data/strumRhythms.ts를 만들어 '스트럼 Source/'의 실제 PNG를 보고 strokes를 전사하라.
- 전사 우선순위: 각 카테고리 Ex-1 (9개) 먼저. 리듬이 없는 패턴은 Core 메트로놈으로 그대로 동작한다(전 패턴 전사 강제 아님).
- 단순한 것부터: 6/8, 12/8, Slow Rock(셋잇단), 3/4. 그다음 Shuffle(swing), 16Beat, Country, Calypso, Slow GoGo.
- step 격자 규칙(§5.3 ⚠️: cells = beatsPerBar*subdivision)을 한 가지로 고정.
  각 패턴에 timeSignature/pulseNote/beatsPerBar/subdivision/feelTiming(/swing) 채움.
  (단순박자 pulseNote='quarter'; 6/8은 beatsPerBar=2·subdivision=3, 12/8은 beatsPerBar=4·subdivision=3, pulseNote='dotted-quarter'.)
- 확신 없는 디테일엔 'TODO: verify' 주석. 표시는 이미지가 정답이므로 문제없음.
- 머지는 strumPatterns.generated.ts(스크립트가 매번 덮어씀)가 아니라 별도 모듈 src/data/patterns.ts에서 한다:
  generated 배열 + strumRhythms를 pattern.id === key로 합쳐, 머지된 배열만 앱이 사용한다.
```

### Step U2. 시간 계산 유틸
```text
src/lib/rhythm.ts를 만들어라. 박/박자 의미를 한 가지로 고정한다: bpm은 항상 pulseNote가 가리키는 "박"(단순박자=4분, 겹박자=점4분).
- secPerBeat(bpm) = 60/bpm  (= pulseNote 한 박의 길이).
- stepDuration(rhythm, bpm) = secPerBeat / rhythm.subdivision  (격자 한 칸 길이).
- barDuration(rhythm, bpm) = rhythm.beatsPerBar * secPerBeat(bpm).
  (단순박자: 4/4=4*(60/bpm), 3/4=3*(60/bpm). 겹박자: 6/8 beatsPerBar=2, 12/8 beatsPerBar=4.
   워크드 예: 6/8 @76 → bar = 2*(60/76) ≈ 1.58s.)
- stepToTime(step, rhythm, bpm): step → 마디 내 상대 시각(초).
  beatIndex = floor(step / subdivision), within = step % subdivision.
  straight/triplet/compound(균등): beatIndex*secPerBeat + (within/subdivision)*secPerBeat.
  swing(subdivision=2): within=0 → beatIndex*secPerBeat(박머리);
    within=1 → beatIndex*secPerBeat + secPerBeat*clamp(swing,0.5,0.75)
    (박 안에서의 "절대 위치". 0.5=정박/straight, 0.667=셋잇단스윙, 0.65=하드셔플, 0.75=점8분.
     직진 격자 위치에 지연을 더하는 게 아니라 절대 위치로 둔다.)
순수 함수로 만들고 간단한 단위 테스트(콘솔)도 포함하라.
```

### Step U3. 오디오 엔진 (룩어헤드 스케줄러)
```text
src/audio/strumVoices.ts, src/audio/schedulePattern.ts, src/audio/AudioEngine.ts를 만들어라.
strumVoices.ts: Web Audio로 다운/업/뮤트/메트로놈 클릭 음색 합성(외부 샘플 없이 Oscillator/노이즈+Gain+BiquadFilter).
  - 다운=저현→고현, 업=고현→저현 순서로 현을 5~12ms 간격으로 어긋나게 울려 "슥" 스트럼 질감. 악센트는 gain↑. 뮤트는 짧은 감쇠+고역.
  - 악기 토글 guitar(낮고 풍성, 6현)↔ukulele(높고 가벼움, 4현): 기본 주파수/현 수/감쇠만 다르게.
schedulePattern.ts: StrumPattern.rhythm → [{ timeInBar(초), stroke }] 목록(rhythm.ts 사용, 스윙·셋잇단 반영).
AudioEngine.ts: lookahead=25ms 타이머가 scheduleAheadTime=0.1s 앞을 미리 예약하는 룩어헤드 스케줄러.
  메서드: load(pattern,bpm,instrument) / start({loop,countIn,onBarStart}) / stop() / setBpm(bpm).
  공개 속성: currentBarStartTime:number (AudioContext.currentTime 값) — 새 마디를 예약할 때마다 갱신하고,
    onBarStart(barIndex, barStartTime)로도 전달한다. 플레이헤드는 오직 이 값을 쓴다.
  ⭐ 스케줄러 불변식(반드시 이대로 구현):
    nextNoteTime(오디오 초)을 보존하고 25ms마다 scheduler()를 돈다 —
      while (nextNoteTime < ctx.currentTime + scheduleAheadTime) {
        이 마디의 각 스트로크를 (currentBarStartTime + timeInBar)에 정확히 예약;
        nextNoteTime을 다음 이벤트 시각(또는 최소 스케줄 증분)만큼 전진;
        마디 끝이면 currentBarStartTime += barDuration (루프면 다음 마디로 감싸고, 아니면 정지 예약)
      }
    nextNoteTime은 단조 증가·누적이며, 재생 도중 절대 ctx.currentTime으로 리셋하지 않는다(드리프트/중복예약 방지).
  AudioContext는 사용자 제스처 후 resume. setBpm은 barDuration·이벤트 시각을 재계산. 정지 시 예약 노드 정리. setInterval 단독 금지.
콘솔에서 단독 재생 테스트할 작은 데모 함수도 포함하라.
```

### Step U4. Transport(재생) 컨트롤 + 동기 플레이헤드
```text
src/hooks/useTransport.ts, src/components/TransportBar.tsx, src/components/StrumSheet.tsx, src/components/StrokeLegend.tsx를 만들어라.
useTransport: AudioEngine 래핑. 상태 isPlaying/bpm/loop/countIn/instrument + progress(0..1) + activeStrokeIndex.
  progress는 requestAnimationFrame 루프에서 "오디오 클럭"으로만 계산한다:
    const t = ctx.currentTime;
    progress = barDuration > 0 ? clamp((t - engine.currentBarStartTime) / barDuration, 0, 1) : 0;
    barStartTime은 반드시 engine.currentBarStartTime(오디오 클럭 앵커)에서 받는다 — Date.now/performance.now/rAF 타임스탬프 추정 금지.
  activeStrokeIndex = (progress*barDuration) 직전의 마지막 이벤트 인덱스.
TransportBar: ▶︎/⏸/⏹, BPM slider(40~200)+숫자, 루프/카운트인/메트로놈 토글, 기타·우쿨렐레 토글. lucide 아이콘. Space로 재생/정지.
StrumSheet: 상세 이미지를 감싸 progress·activeStrokeIndex로 빨강 플레이헤드 세로선과 노랑 하이라이트를 오버레이.
  이미지 모드 x좌표 = stroke.xNorm 보간(없으면 rhythm.imageLeftPad/imageRightPad로 step→x 균등 매핑).
PatternDetail/PracticePanel을 수정: rhythm 있는 패턴은 재생 모드(TransportBar+StrumSheet+StrokeLegend), 없으면 기존 메트로놈.
rhythm 있는 갤러리 카드에 한해 AudioEngine을 재사용한 ▶︎ 미리듣기를 붙인다(§6.3).
화면 이탈/패턴 전환/언마운트 시 stop() + 컨텍스트 정리(메모리 누수 없게).
```

### Step U5. (선택) 데이터 기반 SVG 렌더러 + 정밀 정렬
```text
(선택·고급) src/components/StrumSheetSvg.tsx를 만들어 rhythm 데이터로 악보 SVG를 직접 그려라.
- 가로 스태프 라인 1개, 좌측 박자표, 양 끝 반복기호. 마디를 beatsPerBar/subdivision로 균등 분할.
- 각 스트로크: 45° 빗금 노트헤드 + 기둥, 8분 빔 1개/16분 빔 2개, 점음표 점, 다운 ⊓ / 업 V, 악센트 >, 셋잇단 [3], rest/뮤트/tie.
- progress prop이 오면 플레이헤드를 좌측여백+progress×악보폭에 정확히 그린다(이미지보다 정렬이 정확).
StrumSheet에 표시 우선순위 토글을 둔다: ① 업로드 이미지 ② pattern.imageSrc ③ SVG 렌더. 오디오/플레이헤드는 항상 rhythm에서 구동.
원하면 scripts/generateStrumSvgs.ts로 정적 SVG 일괄 생성도 가능하게 한다.
```

---

## 10. 완료 체크리스트

### 자료 처리 (Core)
- [ ] `스트럼 Source` 원본 파일을 수정하지 않는다.
- [ ] 76개 PNG가 모두 `public/strums/{categoryId}/exNN.png`로 복사된다(번호는 파일명 끝 'Ex/EX' 값, 'Ex 1~4' 라벨 아님).
- [ ] manifest에 76개 패턴이 모두 들어가고, id/displayNo/원본 파일명·width·height가 보존된다.

### 기능 (Core)
- [ ] 9개 카테고리 선택 / 카테고리별 패턴 개수 표시 / 패턴 갤러리 / 검색 / 정렬
- [ ] 상세 이미지 확대·축소 / 드래그 패닝 / 이전·다음 / 키보드 단축키
- [ ] 즐겨찾기 / 최근 본 패턴 / BPM 메트로놈 / count-in·accent 옵션 / 이미지 실패 시 placeholder

### 기능 (Upgrade)
- [ ] rhythm이 채워진 패턴은 ▶︎ 재생 시 소리가 나고, 빨강 플레이헤드가 박자에 맞춰 이동, 현재 스트로크 하이라이트
- [ ] 다운/업/악센트/쉼/뮤트/스윙/셋잇단이 소리에 반영 / 6·12/8 템포가 점4분 박 기준으로 맞다
- [ ] BPM 슬라이더·루프·카운트인·메트로놈·기타/우쿨렐레 토글 동작
- [ ] rhythm 없는 패턴은 기존 Core 메트로놈만(두 모드 공존, 깨짐 없음)

### UI/UX
- [ ] 첫 화면이 실제 앱 화면 / 매우 넓은 PNG가 잘리지 않음 / 작은 6·12/8도 fit·actual 선택 가능
- [ ] 모바일에서 버튼·텍스트 안 겹침 / icon 버튼 tooltip·aria-label / 악보가 흰 배경에서 선명

### 코드 품질 / 오디오
- [ ] TypeScript `any` 없음, 컴포넌트 역할 분리 / asset 준비는 script / 즐겨찾기·최근·메트로놈은 hook·lib 분리
- [ ] (Upgrade) 오디오가 룩어헤드 스케줄러로 타이밍 안정(nextNoteTime 누적·리셋 금지), AudioContext는 제스처 후 resume, 이탈 시 정지·정리
- [ ] (Upgrade) 플레이헤드는 engine.currentBarStartTime(오디오 클럭)만 사용 / 표시(이미지) ↔ 소리(rhythm) 분리, 오디오 src/audio/*·저장 src/lib/* 격리
- [ ] `npm run prepare:strums` 와 `npm run build` 성공

---

## 11. 운영 및 확장 아이디어

### 11.1 추천 MVP 범위 (Core)
원본 76개 PNG asset manifest화 / 카테고리·갤러리·상세 뷰어 / 확대·패닝 / 검색 / 즐겨찾기·최근 / BPM 메트로놈 / README·정적 배포.

### 11.2 다음 버전 (Upgrade 및 그 이후)
- **오디오 재생 + 동기 플레이헤드 + 기타/우쿨렐레 음색** (9장).
- 루프 연습 모드(카운트인 → 점점 빨라지는 BPM, A-B 구간 반복).
- 스트럼 + 코드 결합: 코드 뷰어(자매 앱)와 합쳐 “코드 진행 + 스트럼”을 함께 재생.
- 사용자 패턴 에디터(격자를 탭해 다운/업/악센트 찍기) · 메트로놈/드럼 백킹.
- 패턴 설명·연습 팁 입력 / 난이도 수동 태깅 / 패턴 비교 모드 / 인쇄용 PDF / 다크 모드(악보는 흰 캔버스 유지) / 한·영 전환.
- 사용자 업로드 IndexedDB → Supabase Storage 연동(관리자 업로드/공유) / 이미지 위 beat marker 좌표 수동 편집.

### 11.3 절대 피해야 할 것
- 원본 PNG를 무리하게 OCR해서 악보를 재생성하려 하지 마라(데이터는 손 전사 + 이미지 표시가 정답).
- 넓은 악보를 카드 안에서 강제로 crop하지 마라. 한글 파일명을 그대로 public URL에 노출하지 마라.
- 메트로놈/재생 자동 시작 금지(브라우저 정책상 사용자 제스처 필요).
- 상세 화면에서 텍스트 설명이 이미지를 가리지 않게 하라. 플레이헤드를 데이터가 부정확한데 억지로 정렬하지 마라.

---

## 12. 마지막 품질 지시문

아래 문장을 개발 AI에게 마지막으로 붙여 넣으면 좋다.

```text
이 앱의 주인공은 스트럼 악보 이미지이고, 본질은 "리듬"이다.
1) 표시: 원본 PNG 비율과 선명도를 절대 훼손하지 마라. 모든 이미지는 manifest 기반으로 관리하고
   카테고리/검색/상세/연습 기능을 그 manifest 중심으로 연결하라.
2) 소리·플레이헤드: 별도 리듬 데이터(strokes)에서 구동하라. bpm은 항상 "느끼는 박"(단순박자=4분, 겹박자=점4분)으로
   템포·메트로놈 카운트를 일치시키고, 오디오는 룩어헤드 스케줄러(nextNoteTime 누적)로 타이밍을 안정시켜라.
   플레이헤드는 engine.currentBarStartTime(오디오 클럭)만 사용하라. 다운/업/악센트/스윙/셋잇단을 소리로 구분하고,
   rhythm이 없는 패턴은 메트로놈만으로도 완전히 동작해야 한다.
3) 배포: 정적 배포에서 동작해야 하므로 기본 자료는 빌드 전 public/strums로 복사하고,
   사용자 런타임 추가 자료는 IndexedDB 또는 서버 스토리지로 분리하라.
최종 결과는 모바일·데스크톱 모두에서 사용 가능해야 하며, `npm run prepare:strums`와 `npm run build`가 성공해야 한다.
```

---

## 부록 A. 스트럼 표기법 사전 (기호 → 의미 → 데이터)

AI가 소스 이미지를 데이터로 전사할 때의 기준표.

| 악보 기호 | 의미 | 데이터(`Stroke`/`StrumRhythm`) | 소리 |
|-----------|------|--------------------------------|------|
| `⊓` (꺽쇠/staple) | **다운 스트로크** (저음→고음, 위→아래) | `dir:'down'` | 저현→고현 빠른 아르페지오 |
| `V` | **업 스트로크** (고음→저음, 아래→위) | `dir:'up'` | 고현→저현 빠른 아르페지오 |
| `>` | **악센트** (그 박을 세게) | `accent:true` | gain ↑ |
| `3` + 괄호 | **셋잇단음표** (한 박 3등분) | `feelTiming:'triplet'`, `subdivision:3` | 균등 3분할 |
| 빔 1개 | 8분음표 | `durationSteps:2` (격자 16분 기준) | 8분 길이 |
| 빔 2개 | 16분음표 | `durationSteps:1` (격자 16분 기준) | 16분 길이 |
| 점(`.`) | 점음표(1.5배) | `durationSteps` 조정(예: 점8분=3) | 더 길게 |
| 곡선(`⌒`) | **붙임줄(tie)** | `tie:true` | 새로 안 침, 지속 |
| 쉼표 기호 | 쉼 | `dir:'rest'` | 무음 |
| ×(엑스) 머리 | 뮤트/고스트 | `dir:'mute'` | 짧고 둔탁 |
| `║: … :║` | 반복기호 | `bars`·loop로 처리 | 반복 재생 |
| `3/4·4/4·6/8·12/8` | 박자표 | `timeSignature`,`pulseNote`,`beatsPerBar` | 마디 길이 |
| 셔플 “길게-짧게” | 스윙 | `feelTiming:'swing'`,`swing≈0.65` | 뒷박 지연 |

---

## 부록 B. 9개 카테고리 & 예제 인덱스 (소스 폴더 그대로)

`스트럼 Source/`에서 확인한 실제 목록. AI는 이 인덱스대로 manifest·rhythm을 채우고 이미지를 임포트한다.

| categoryId | 폴더(슬러그) | 박자 | 예제 파일(원본명 키워드) | 개수 |
|------------|--------------|------|---------------------------|------|
| `sixteen-beat-variation` | `sixteen-beat-variation` | 4/4 | `16Beat Variation Strum Pattern …EX01`~`EX12` | 12 |
| `three-four` | `three-four` | 3/4 | `4분의 3박 스트럼 1(Remake)…Ex01`~`Ex13` | 13 |
| `twelve-eight` | `twelve-eight` | 12/8 | `8분의 12박 스트럼 1(Remake)…Ex01`~`Ex16` | 16 |
| `six-eight` | `six-eight` | 6/8 | `8분의 6박 스트럼 1(Remake)…Ex01`~`Ex08` | 8 |
| `shuffle` | `shuffle` | 4/4 swing | `셔플-Shuffle(Remake)…Ex01`~`Ex06` | 6 |
| `slow-gogo` | `slow-gogo` | 4/4 | `슬로우 고고(Slow GoGo) 주법EX01`~`EX03` | 3 |
| `slow-rock` | `slow-rock` | 4/4 triplet | `슬로우 락-Slow Rock Exercise …EX01`~`EX12` | 12 |
| `calypso` | `calypso` | 4/4 | `칼립소-Calypso Exercise …EX01`~`EX03` | 3 |
| `country` | `country` | 4/4 | `컨트리(Country) 주법EX01`~`EX03` | 3 |

> 합계 76개. 파일명 **끝(확장자 앞)**의 `Ex01`/`EX01` 번호가 `exerciseNo`(중간의 'Ex 1~4' 범위 라벨이 아님)이며, 표시 제목은 `"{카테고리 labelEn} Ex-{exerciseNo}"`.

---

## 부록 C. 파일명 → ID/슬러그 변환 규칙

```txt
[카테고리 폴더 → 슬러그/categoryId]
  스트럼(16Beat Variation)-[개별]  → sixteen-beat-variation
  스트럼(4분의 3박)-[개별]         → three-four
  스트럼(8분의 12박)-[개별]        → twelve-eight
  스트럼(8분의 6박)-[개별]         → six-eight
  스트럼(Shuffle)-[개별]           → shuffle
  스트럼(슬로우 고고)-[개별]       → slow-gogo
  스트럼(슬로우 락)-[개별]         → slow-rock
  스트럼(칼립소)-[개별]            → calypso
  스트럼(컨트리)-[개별]            → country

[파일명 → exerciseNo/대상명]
  "확장자 바로 앞" 번호를 뽑는다: /(?:Ex|EX)\s*0*(\d+)(?=\.png$)/  (또는 모든 매치 중 마지막).
  ⚠️ 16Beat 파일명엔 중간에 범위 라벨 'Ex 1~4'가 있어, 끝에 고정하지 않으면 그 'Ex 1'이 먼저 잡힌다.
  대상 파일: public/strums/{슬러그}/ex{2자리 0패딩}.png   예) ex01.png, ex12.png
  id        = `{categoryId}_ex{2자리}`                     예) country_ex01   (strumRhythms 키와 동일)
  displayNo = `Ex{2자리}`                                  예) "Ex01"
  title     = `{카테고리 labelEn} Ex-{exerciseNo}`         예) "Country Ex-1"
```

---

### 마지막 한마디 (AI에게)
> “Core(이미지 뷰어)를 먼저 완성해 ‘정확히 보여주는’ 토대를 만들고, 그 위에 Upgrade(오디오 재생 + 동기 플레이헤드 + 기타/우쿨렐레 음색)를 얹어 ‘듣고 따라 치는’ 연습 도구로 끌어올려라. 표시는 원본 PNG, 소리·커서는 리듬 데이터 — 둘을 분리하면 안전하고 강력하다. bpm은 ‘느끼는 박’(단순=4분, 겹=점4분)으로 통일하고, 오디오는 룩어헤드 스케줄러로, 플레이헤드는 오디오 클럭으로만 구동하라. 영상/자매 앱의 디자인 톤(밝은 배경·부드러운 그림자·정돈된 카드·알록달록 카테고리 색·연핑크 로고)을 일관되게 재현하고, TypeScript 타입 안정성과 `npm run prepare:strums`·`npm run build` 성공까지 끝내라.”
