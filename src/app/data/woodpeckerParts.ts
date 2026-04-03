import headImage from "../../assets/woodpecker/head.png";
import bodyImage from "../../assets/woodpecker/body.png";
import beakImage from "../../assets/woodpecker/beak.png";
import leftWingImage from "../../assets/woodpecker/left-wing.png";
import rightWingImage from "../../assets/woodpecker/right-wing.png";
import legsImage from "../../assets/woodpecker/legs.png";

export interface WoodpeckerPart {
  partId: string;
  name: string;
  image: string;
  bench: {
    x: number;
    y: number;
    rotation: number;
    width: number;
  };
  cardRotation?: number;
}

export const WOODPECKER_PARTS: WoodpeckerPart[] = [
  {
    partId: "body",
    name: "몸통",
    image: bodyImage,
    bench: { x: 14, y: 24, rotation: -8, width: 78 },
    cardRotation: -5,
  },
  {
    partId: "head",
    name: "머리",
    image: headImage,
    bench: { x: 50, y: 10, rotation: 4, width: 120 },
    cardRotation: 2,
  },
  {
    partId: "beak",
    name: "부리",
    image: beakImage,
    bench: { x: 28, y: 63, rotation: -10, width: 132 },
    cardRotation: -8,
  },
  {
    partId: "left-wing",
    name: "왼쪽 날개",
    image: leftWingImage,
    bench: { x: 66, y: 54, rotation: -8, width: 104 },
    cardRotation: -6,
  },
  {
    partId: "right-wing",
    name: "오른쪽 날개",
    image: rightWingImage,
    bench: { x: 8, y: 74, rotation: 10, width: 112 },
    cardRotation: 7,
  },
  {
    partId: "legs",
    name: "다리",
    image: legsImage,
    bench: { x: 58, y: 75, rotation: 8, width: 90 },
    cardRotation: 6,
  },
];

export const FIND_PART_DISTRACTORS = [
  { partId: "body-blank", name: "몸통 판재", image: bodyImage, cardRotation: 7 },
  { partId: "head-blank", name: "머리 판재", image: headImage, cardRotation: -6 },
  { partId: "beak-blank", name: "부리 판재", image: beakImage, cardRotation: 10 },
  { partId: "left-wing-blank", name: "날개 판재", image: leftWingImage, cardRotation: 12 },
  { partId: "right-wing-blank", name: "날개 판재", image: rightWingImage, cardRotation: -12 },
  { partId: "legs-blank", name: "다리 판재", image: legsImage, cardRotation: -10 },
  { partId: "body-shadow", name: "몸통 자국", image: bodyImage, cardRotation: -4 },
  { partId: "head-shadow", name: "머리 자국", image: headImage, cardRotation: 5 },
  { partId: "wing-shadow", name: "날개 자국", image: rightWingImage, cardRotation: -3 },
  { partId: "beak-shadow", name: "부리 자국", image: beakImage, cardRotation: 4 },
];
