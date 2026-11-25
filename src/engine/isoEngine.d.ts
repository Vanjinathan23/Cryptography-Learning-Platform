export interface StageEntitySpec {
  type: 'block' | 'crowd' | 'ghost' | 'device' | 'db' | 'zone' | 'queue' | 'panel' | 'ring';
  [key: string]: unknown;
}

export interface StageLinkSpec {
  from: string;
  to?: string;
  pts: Array<string | [number | string, number | string]>;
  heads?: 'end' | 'both' | 'none';
  style?: 'solid' | 'dashed' | 'off' | 'beat' | 'cut';
  label?: string;
  labelTone?: 'paper' | 'red' | 'green' | 'amber' | 'violet' | 'blue' | 'gray';
  labelAt?: number;
  fail?: number;
}

export interface StageFlowSpec {
  route?: Array<string | string[]>;
  routes?: Array<{ path: string[]; kind?: string; weight?: number }>;
  fanout?: boolean;
  pick?: 'weights';
  weights?: number[];
  pattern?: string[];
  kind?: string;
  rate: number;
  speed?: number;
  bounce?: boolean;
  hold?: number;
}

export interface StageScene {
  entities: Record<string, StageEntitySpec>;
  links?: Record<string, StageLinkSpec>;
  flows?: StageFlowSpec[];
}

export declare class StageEngine {
  paused: boolean;
  showCards: boolean;
  onCards: ((show: boolean) => void) | null;
  onView: ((zoomed: boolean) => void) | null;
  onSwipe: ((dir: number) => void) | null;
  onSettle: (() => void) | null;
  constructor(host: HTMLElement);
  clear(): void;
  frame(scenes: StageScene[]): void;
  goTo(scene: StageScene, opts?: { instant?: boolean }): void;
  fit(): void;
  refit(): void;
  retheme(): void;
}

export declare function renderIcon(
  name: string,
  opts?: { size?: number; stroke?: number; cls?: string; fill?: string }
): string;

export declare function renderFolderIcon(color: string): string;
export declare function renderSvgIcon(
  name: string,
  x: number,
  y: number,
  size?: number,
  opts?: { stroke?: number; color?: string; fill?: string }
): string;
export declare const ICONS: Record<string, unknown>;
export declare const BLOCK_COLORS: Record<string, { top: [string, string]; side: [string, string] }>;
