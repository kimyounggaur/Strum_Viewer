# Lesson Designer Strum Viewer

기타와 우쿨렐레 학습자가 스트럼 패턴 PNG 자료를 카테고리별로 찾고, 크게 확대해서 보며, BPM 메트로놈 또는 리듬 재생과 함께 연습하는 정적 React SPA입니다.

## 실행

```bash
npm install
npm run prepare:strums
npm run dev
```

빌드 검증:

```bash
npm run build
```

`predev`, `prebuild`에서 `npm run prepare:strums`가 자동 실행되므로 일반적으로는 `npm run dev` 또는 `npm run build`만 실행해도 됩니다.

## 폴더 구조

```txt
public/strums/                 # 스크립트가 생성하는 ASCII asset
scripts/prepareStrumAssets.mjs # 스트럼 Source 스캔, 이미지 복사, manifest 생성
src/audio/                     # Web Audio 스트럼/메트로놈 엔진
src/components/                # 앱 화면 컴포넌트
src/data/                      # 타입, 카테고리, generated manifest, 리듬 데이터
src/hooks/                     # 검색, 저장, 메트로놈, transport 훅
src/lib/                       # 리듬 시간 계산, IndexedDB 확장 구조
```

## 이미지 추가법

1. `스트럼 Source`의 해당 카테고리 폴더에 PNG를 추가합니다.
2. 파일명 끝에 `Ex01`, `EX12`처럼 예제 번호가 들어가야 합니다.
3. `npm run prepare:strums`를 실행합니다.
4. 스크립트가 `public/strums/{categoryId}/exNN.png`로 복사하고 `src/data/strumPatterns.generated.ts`를 다시 생성합니다.

원본 파일명에는 한글, 공백, 괄호가 있어도 됩니다. 브라우저 URL에서는 배포 안정성을 위해 ASCII slug 파일명만 사용합니다.

## Manifest 규칙

`scripts/prepareStrumAssets.mjs`는 PNG 헤더에서 `width`, `height`를 읽고 다음 필드를 생성합니다.

`id`, `categoryId`, `title`, `exerciseNo`, `displayNo`, `originalFileName`, `imageSrc`, `width`, `height`, `timeSignature`, `feel`, `difficulty`, `recommendedBpm`, `tags`

리듬 재생 데이터는 generated 파일에 직접 쓰지 않고 `src/data/strumRhythms.ts`에 별도로 둡니다. 앱은 `src/data/patterns.ts`에서 manifest와 rhythm을 합친 배열만 사용합니다.

## 정적 배포 주의사항

정적 배포된 웹사이트의 `public` 폴더는 브라우저에서 직접 수정할 수 없습니다. 기본 이미지는 개발자가 프로젝트에 포함해 배포하고, 사용자 업로드 이미지는 IndexedDB 또는 서버 스토리지에 저장해야 합니다.

`src/lib/customPatternStorage.ts`에는 IndexedDB 기반 사용자 업로드 확장 구조가 격리되어 있습니다. 공유/관리자 업로드가 필요하면 Supabase Storage 같은 서버 스토리지로 확장하는 것이 좋습니다.

## 배포

Production: https://strum-viewer.vercel.app

Vercel 프로젝트 `strum-viewer`는 GitHub 저장소 `kimyounggaur/Strum_Viewer`의 `main` 브랜치와 연결되어 있습니다. `main`에 commit & push될 때마다 Vercel production 배포가 자동으로 생성됩니다.
