import type { ReactNode } from "react";
import Svg, { Circle, Path } from "react-native-svg";

/**
 * Icon set ported 1:1 from the SVG paths in the original web prototype
 * (Warning_Blackspot_App_Source_Code/app/page.tsx).
 */
const ICONS = {
  alert: (
    <>
      <Path d="M12 3 2.8 19a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L12 3Z" />
      <Path d="M12 9v5" />
      <Path d="M12 18h.01" />
    </>
  ),
  map: (
    <>
      <Path d="m3 6 5-3 8 3 5-3v15l-5 3-8-3-5 3V6Z" />
      <Path d="M8 3v15M16 6v15" />
    </>
  ),
  plus: <Path d="M12 5v14M5 12h14" />,
  list: (
    <>
      <Path d="M8 6h13M8 12h13M8 18h13" />
      <Path d="M3 6h.01M3 12h.01M3 18h.01" />
    </>
  ),
  user: (
    <>
      <Circle cx="12" cy="8" r="4" />
      <Path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  locate: (
    <>
      <Circle cx="12" cy="12" r="3" />
      <Path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
      <Circle cx="12" cy="12" r="8" />
    </>
  ),
  chevron: <Path d="m9 18 6-6-6-6" />,
  fire: (
    <Path d="M12 22c4 0 7-3 7-7 0-3.5-2-6.5-5-9 .2 2-1 3.5-2 4.5C11 8 9 5.5 8 2 4.5 5.5 3 9 4 14c.7 4.6 4 8 8 8Z" />
  ),
  signal: (
    <>
      <Path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0" />
      <Path d="M12 20h.01" />
    </>
  ),
  camera: (
    <>
      <Path d="M14.5 4 16 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3l1.5-3h5Z" />
      <Circle cx="12" cy="13" r="3" />
    </>
  ),
  check: <Path d="m5 12 4 4L19 6" />,
  clock: (
    <>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M12 7v5l3 2" />
    </>
  ),
  info: (
    <>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M12 11v5M12 8h.01" />
    </>
  ),
  shield: (
    <>
      <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <Path d="m9 12 2 2 4-4" />
    </>
  ),
  grassDry: (
    <>
      <Path d="M4 21c1-6 1-10-1-14 4 3 6 8 6 14M9 21c0-8 1-14 4-18 1 6 1 12 0 18M13 21c2-6 5-10 9-12-1 5-2 9-4 12" />
      <Circle cx="19" cy="4" r="2" />
    </>
  ),
  grassTall: (
    <Path d="M5 21V7M5 12 2 9M5 15l4-4M12 21V3M12 10 8 6M12 14l5-5M19 21V8M19 14l3-3M19 17l-4-4" />
  ),
  flood: (
    <>
      <Path d="M4 14V8l8-5 8 5v6M8 14v-3h4v3" />
      <Path d="M2 16c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 8 0M2 20c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 8 0" />
    </>
  ),
  language: (
    <>
      <Path d="M4 5h7M7.5 3v2c0 4-1.5 7-4.5 9M5 10c1 2 3 3.5 6 4" />
      <Path d="m13 21 4-10 4 10M14.5 17h5" />
    </>
  ),
  speaker: (
    <>
      <Path d="M11 5 6 9H3v6h3l5 4V5Z" />
      <Path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12" />
    </>
  ),
  cloud: (
    <Path d="M17.5 19a4.5 4.5 0 0 0 .4-8.98A6 6 0 0 0 6.34 10.5 4 4 0 0 0 7 19h10.5Z" />
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof ICONS;

type IconProps = {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  color?: string;
};

export function Icon({ name, size = 22, strokeWidth = 1.8, color = "#17211d" }: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {ICONS[name]}
    </Svg>
  );
}
