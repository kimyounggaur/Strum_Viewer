# Lesson Designer Strum Viewer

기타와 우쿨렐레 학습자가 스트럼 패턴 PNG 자료를 카테고리별로 찾고, 크게 확대해서 보며, BPM 메트로놈 또는 리듬 재생과 함께 연습하는 정적 React SPA입니다.

## 실행

```bash
npm install
npm run dev
```

빌드 검증:

```bash
npm run build
```

`predev`, `prebuild`에서 asset 준비 스크립트가 자동 실행되므로 일반적으로는 `npm run dev` 또는 `npm run build`만 실행해도 됩니다. `public/strums/`는 생성물이라 git에 올리지 않습니다(첫 실행 때 자동 생성).

## 폴더 구조

```txt
스트럼 Source/                  # PNG 원본 (수정 금지)
public/strums/                 # 생성물: 스크립트가 ASCII 파일명으로 복사 (git 제외)
scripts/prepareStrumAssets.mjs # 스트럼 Source 스캔, 이미지 복사, manifest 생성
scripts/buildRhythms.mjs       # rhythms.source.json → src/data/strumRhythms.generated.ts 생성
scripts/rhythms.source.json    # 리듬(스트로크) 전사 원본
src/app/                       # App 루트 (화면 전환)
src/audio/                     # Web Audio 스트럼/메트로놈 엔진, voices/ 음색
src/components/ui/             # 범용 UI 조각 (IconButton)
src/features/gallery/          # 헤더·카테고리·갤러리·카드
src/features/viewer/           # 악보 이미지 뷰어·재생선
src/features/practice/         # 상세 화면·트랜스포트·재생 트랙
src/data/                      # 타입, 카테고리, generated manifest, 리듬 데이터
src/hooks/                     # 검색, 저장, 메트로놈, transport 훅
src/lib/                       # 리듬 시간 계산, IndexedDB 확장 구조
docs/spec/                     # 바이브코딩 명세 문서
```

## 검증

```bash
npm run check   # typecheck + lint + format:check + test
npm test        # Vitest (골든 타이밍 스냅샷, 리듬 스키마, 훅)
```

`src/audio/__golden__/timeline.golden.json`은 76개 패턴의 스트로크 예약 시각을 고정한 회귀 기준입니다. 의도적으로 바꿀 때만 `npx vitest run -u`로 갱신합니다.

## 데이터 파이프라인

```txt
src/data/categories.json ─┐
스트럼 Source/*.png ───────┼─ scripts/prepareStrumAssets.mjs ─→ public/strums/**  (PNG + thumbs/*.webp)
scripts/rhythms.source.json┤                                └→ src/data/strumPatterns.generated.ts
src/data/patterns.overrides.json ┘
scripts/rhythms.source.json ─ scripts/buildRhythms.mjs ─→ src/data/strumRhythms.generated.ts
```

- `npm run prepare:data` = `prepare:rhythms` + `prepare:strums`. `npm run dev`/`build` 전에 자동 실행됩니다.
- `*.generated.ts`는 직접 고치지 않습니다. 원본(JSON·PNG)을 고치고 스크립트를 다시 실행한 뒤 생성물도 함께 커밋합니다(CI가 최신 여부를 검사).
- **카테고리 정의는 `src/data/categories.json` 한 곳**에만 있습니다(라벨·박자·추천 BPM·색·원본 폴더·박 구조). 스크립트와 앱이 모두 이 파일을 읽습니다.

### 이미지 추가법

1. `스트럼 Source`의 해당 카테고리 폴더에 PNG를 추가합니다. 파일명 끝에 `Ex01`, `EX12`, `Ex-5`처럼 예제 번호가 있어야 합니다.
2. `npm run prepare:data`를 실행합니다. 코드 수정은 필요 없습니다.
   - `categories.json`의 `expectedCount`와 개수가 다르면 **경고**만 냅니다(`--strict`로 실행하면 오류).
   - 같은 카테고리에 같은 Ex 번호가 둘이면 **오류**로 멈춥니다(덮어쓰기 방지).
   - 리듬 데이터가 없으면 경고 후 박자표 기반 클릭으로 재생됩니다. 재생을 붙이려면 `scripts/rhythms.source.json`에 전사를 추가합니다.
3. 카드용 WebP 썸네일(폭 640px)이 `public/strums/{categoryId}/thumbs/`에 함께 생성됩니다. `sharp`를 쓸 수 없는 환경에서는 원본 PNG를 그대로 씁니다(`--no-thumbs`로 끌 수도 있음).

### 난이도·메모 (`src/data/patterns.overrides.json`)

```json
{ "slow-rock_ex01": { "difficulty": "beginner", "notes": "모든 박을 다운으로." } }
```

- `difficulty`를 적은 패턴은 그 값을, 없는 패턴은 리듬 복잡도로 **자동 추정**합니다(싱코페이션 45%·업스트로크 30%·밀도 15%·붙임줄 10%). 상세 화면에 "(자동 추정)"으로 표시됩니다.
- `notes`는 상세 화면 상단에 안내로 표시됩니다. `tags`, `recommendedBpm`도 덮어쓸 수 있습니다.

### 리듬 데이터 (`scripts/rhythms.source.json`)

- 패턴 id(`<categoryId>_exNN`)별로 `subdivision`(한 박 칸 수), `feelTiming`(straight/swing/triplet/compound), `bars`, `strokes[{step, dir, accent?, tie?}]`, 이미지 여백(`imageLeftPad/RightPad`)을 적습니다.
- `confidence`가 `verified`로 시작하지 않으면 상세 화면에 "재생 데이터 근사치" 배지가 붙습니다.
- step 범위 밖·중복 step·알 수 없는 방향은 빌드를 멈춥니다(조용히 버리지 않음).

## 정적 배포 주의사항

정적 배포된 웹사이트의 `public` 폴더는 브라우저에서 직접 수정할 수 없습니다. 기본 이미지는 개발자가 프로젝트에 포함해 배포하고, 사용자 업로드 이미지는 IndexedDB 또는 서버 스토리지에 저장해야 합니다.

`src/lib/customPatternStorage.ts`에는 IndexedDB 기반 사용자 업로드 확장 구조가 격리되어 있습니다. 공유/관리자 업로드가 필요하면 Supabase Storage 같은 서버 스토리지로 확장하는 것이 좋습니다.

## 배포

Production: https://strum-viewer.vercel.app

Vercel 프로젝트 `strum-viewer`는 GitHub 저장소 `kimyounggaur/Strum_Viewer`의 `main` 브랜치와 연결되어 있습니다. `main`에 commit & push될 때마다 Vercel production 배포가 자동으로 생성됩니다.
