# Woodpecker sprite frames

프레임 이미지를 아래 폴더에 넣으면 `TitleScreen`에서 자동으로 애니메이션됩니다.

- `door/`: 문고리/통나무를 두드리는 시퀀스 (예: `01.png`, `02.png`, ...)
- `hammer/`: 망치 시퀀스
- `finish/`: 완성 포즈 시퀀스

권장:
- 배경 투명 PNG
- 파일명은 숫자 순서가 되도록 (`01`, `02`, `03` ...)
- 프레임 크기는 동일하게 유지

코드 위치:
- `src/app/components/WoodpeckerSpriteAnimation.tsx`
