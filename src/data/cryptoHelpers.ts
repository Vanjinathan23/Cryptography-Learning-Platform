import type { StageEntitySpec, StageLinkSpec, StageScene } from '../engine/isoEngine';

export type ChapterKind = 'setup' | 'problem' | 'solution' | 'technique' | 'tradeoff' | 'insight' | 'recap';
export type CalloutKind = 'warn' | 'tip' | 'insight' | 'next';
export type FolderColor = 'sand' | 'green' | 'purple' | 'orange' | 'rose' | 'blue' | 'teal' | 'olive' | 'slate';

export interface TagSpec {
  text: string;
  tone?: 'paper' | 'red' | 'green' | 'amber' | 'violet' | 'blue' | 'gray';
  icon?: string;
}

export interface LessonStep {
  short: string;
  chapter: ChapterKind;
  title: string;
  body: string[];
  callout?: { kind: CalloutKind; text: string };
  changes?: string[];
  metrics: Record<string, string | number | null>;
  scene: StageScene;
}

export interface LessonGoal {
  text: string;
  step: number;
}

export interface Lesson {
  id: string;
  title: string;
  summary: string;
  minutes: number;
  level: 'beginner' | 'intermediate' | 'advanced';
  metrics: string[];
  legend: Array<string | [string, string]>;
  goals: LessonGoal[];
  steps: LessonStep[];
}

export interface CourseModule {
  id: string;
  num: string;
  title: string;
  color: FolderColor;
  lessons: Array<{ id: string; title: string }>;
}

export const CHAPTERS: Record<ChapterKind, { label: string; tone: string }> = {
  setup: { label: 'Setup', tone: 'sand' },
  problem: { label: 'Attack / Risk', tone: 'red' },
  solution: { label: 'Defense', tone: 'green' },
  technique: { label: 'Algorithm', tone: 'blue' },
  tradeoff: { label: 'Trade-off', tone: 'amber' },
  insight: { label: 'Key Insight', tone: 'violet' },
  recap: { label: 'Recap', tone: 'ink' },
};

export const CALLOUT_META: Record<CalloutKind, { icon: string; title: string }> = {
  warn: { icon: 'alert', title: 'Security warning' },
  tip: { icon: 'bulb', title: 'Good to know' },
  insight: { icon: 'sparkles', title: 'Key idea' },
  next: { icon: 'arrowRight', title: 'Coming up' },
};

export const LEVELS: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export const LEGEND_ITEMS: Record<string, [string, string]> = {
  mine: ['<i class="lg lg--mine"></i>', 'Plaintext message'],
  empty: ['<i class="lg lg--empty"></i>', 'Encrypted ciphertext'],
  poison: ['<i class="lg lg--poison"></i>', 'Intercepted / tampered'],
  write: ['<i class="lg lg--write"></i>', 'Key / secret exchange'],
  msg: ['<i class="lg lg--msg"></i>', 'Verified packet'],
  req: ['<i class="lg lg--req"></i>', 'Network packet'],
  res: ['<i class="lg lg--res"></i>', 'Response / ACK'],
  ping: ['<i class="lg lg--ping"></i>', 'Handshake / nonce'],
  slow: ['<i class="lg lg--slow"></i>', 'Brute-force / retry'],
  push: ['<i class="lg lg--push"></i>', 'Digital signature'],
  kill: ['<i class="lg lg--kill"></i>', 'Rejected packet'],
  fail: ['<i class="lg lg--fail">×</i>', 'Blocked / failed'],
};

export interface MetricDef {
  label: string;
  icon: string;
  fmt: (v: string | number | null) => string;
  level?: (v: string | number | null) => 'good' | 'warn' | 'bad' | 'none';
}

const textFmt = (v: string | number | null) => (v == null ? '—' : String(v));

export const METRICS: Record<string, MetricDef> = {
  state: {
    label: 'Message state',
    icon: 'mail',
    fmt: textFmt,
    level: (v) =>
      /cipher|encrypted|sealed|verified|decrypted|recovered/i.test(String(v))
        ? 'good'
        : /plain|exposed|tampered|forged/i.test(String(v))
          ? 'bad'
          : 'none',
  },
  confidentiality: {
    label: 'Confidentiality',
    icon: 'lock',
    fmt: textFmt,
    level: (v) =>
      /protected|strong|end-to-end|safe|forward/i.test(String(v))
        ? 'good'
        : /weak|partial|leaked pattern/i.test(String(v))
          ? 'warn'
          : /none|exposed|broken/i.test(String(v))
            ? 'bad'
            : 'none',
  },
  integrity: {
    label: 'Integrity',
    icon: 'shield',
    fmt: textFmt,
    level: (v) =>
      /verified|tamper-proof|checked|authenticated/i.test(String(v))
        ? 'good'
        : /unchecked|none|altered|tampered/i.test(String(v))
          ? 'bad'
          : 'warn',
  },
  attackerSees: {
    label: 'Attacker sees',
    icon: 'eye',
    fmt: textFmt,
    level: (v) =>
      /random bytes|ciphertext|blocked|useless|cannot forge|nothing/i.test(String(v))
        ? 'good'
        : /metadata|patterns|public/i.test(String(v))
          ? 'warn'
          : /plaintext|password|readable|secret|controls/i.test(String(v))
            ? 'bad'
            : 'none',
  },
  algorithm: {
    label: 'Algorithm',
    icon: 'braces',
    fmt: textFmt,
  },
  keyType: {
    label: 'Key model',
    icon: 'key',
    fmt: textFmt,
    level: (v) =>
      /256-bit|ephemeral|hybrid|asymmetric|salted|private/i.test(String(v))
        ? 'good'
        : /none|shift|weak/i.test(String(v))
          ? 'bad'
          : 'none',
  },
  hops: {
    label: 'Network hops',
    icon: 'route',
    fmt: textFmt,
  },
  recipient: {
    label: 'Recipient match',
    icon: 'userCheck',
    fmt: textFmt,
    level: (v) =>
      /exact|bob|verified/i.test(String(v))
        ? 'good'
        : /wrong|imposter|mallory|broadcast/i.test(String(v))
          ? 'bad'
          : 'none',
  },
  keySpace: {
    label: 'Key space',
    icon: 'hash',
    fmt: textFmt,
    level: (v) =>
      /2\^128|2\^256|2048/i.test(String(v))
        ? 'good'
        : /26|256\b|small/i.test(String(v))
          ? 'bad'
          : 'warn',
  },
  avalanche: {
    label: 'Bit change',
    icon: 'zap',
    fmt: textFmt,
    level: (v) =>
      /50%|~50%|half/i.test(String(v)) ? 'good' : /0%|identical/i.test(String(v)) ? 'none' : 'warn',
  },
  trust: {
    label: 'Sender identity',
    icon: 'fingerprint',
    fmt: textFmt,
    level: (v) =>
      /verified|ca-signed|authentic/i.test(String(v))
        ? 'good'
        : /unknown|forged|spoofed/i.test(String(v))
          ? 'bad'
          : 'warn',
  },
  attackRisk: {
    label: 'Attack risk',
    icon: 'siren',
    fmt: textFmt,
    level: (v) =>
      /mitigated|blocked|low/i.test(String(v))
        ? 'good'
        : /medium/i.test(String(v))
          ? 'warn'
          : /critical|high|active/i.test(String(v))
            ? 'bad'
            : 'none',
  },
  dbState: {
    label: 'Stored in DB',
    icon: 'database',
    fmt: textFmt,
    level: (v) =>
      /salted|argon2|encrypted|safe/i.test(String(v))
        ? 'good'
        : /unsalted/i.test(String(v))
          ? 'warn'
          : /plaintext|leaked|cracked/i.test(String(v))
            ? 'bad'
            : 'none',
  },
  crackTime: {
    label: 'Crack time',
    icon: 'clock',
    fmt: textFmt,
    level: (v) =>
      /centuries|billions|years|infeasible/i.test(String(v))
        ? 'good'
        : /hours|days/i.test(String(v))
          ? 'warn'
          : /instant|seconds|0 ms/i.test(String(v))
            ? 'bad'
            : 'none',
  },
  certStatus: {
    label: 'Certificate',
    icon: 'fileKey',
    fmt: textFmt,
    level: (v) =>
      /valid|trusted|ca-signed/i.test(String(v))
        ? 'good'
        : /pending/i.test(String(v))
          ? 'warn'
          : /forged|invalid|untrusted|spoofed/i.test(String(v))
            ? 'bad'
            : 'none',
  },
  signatureStatus: {
    label: 'Signature',
    icon: 'fingerprint',
    fmt: textFmt,
    level: (v) =>
      /valid|verified|signed/i.test(String(v))
        ? 'good'
        : /unsigned/i.test(String(v))
          ? 'warn'
          : /invalid|mismatch|blocked|tampered/i.test(String(v))
            ? 'bad'
            : 'none',
  },
  replayGuard: {
    label: 'Replay guard',
    icon: 'replay',
    fmt: textFmt,
    level: (v) =>
      /nonce|active|blocked|unique/i.test(String(v))
        ? 'good'
        : /none|vulnerable|replayed/i.test(String(v))
          ? 'bad'
          : 'warn',
  },
};

// Isometric scene builder helpers matching isoEngine.js primitives
export const block = (
  x: number,
  y: number,
  opts: Record<string, unknown> = {}
): StageEntitySpec => ({
  type: 'block',
  x,
  y,
  color: 'blue',
  glyph: 'server',
  ...opts,
});

export const device = (
  x: number,
  y: number,
  opts: Record<string, unknown> = {}
): StageEntitySpec => ({
  type: 'device',
  x,
  y,
  ...opts,
});

export const db = (
  x: number,
  y: number,
  opts: Record<string, unknown> = {}
): StageEntitySpec => ({
  type: 'db',
  x,
  y,
  ...opts,
});

export const crowd = (
  bounds: { x0: number; x1: number; y0: number; y1: number },
  count: number,
  label: string,
  opts: Record<string, unknown> = {}
): StageEntitySpec => ({
  type: 'crowd',
  ...bounds,
  count,
  label,
  ...opts,
});

export const zone = (
  bounds: { x0: number; x1: number; y0: number; y1: number },
  label: string,
  opts: Record<string, unknown> = {}
): StageEntitySpec => ({
  type: 'zone',
  ...bounds,
  label,
  ...opts,
});

export const panel = (
  pos: { x: number; y: number; z?: number; dx?: number; dy?: number },
  title: string,
  lines: string[],
  opts: Record<string, unknown> = {}
): StageEntitySpec => ({
  type: 'panel',
  z: 0,
  ...pos,
  title,
  lines,
  ...opts,
});

export const queue = (
  x: number,
  y: number,
  n: number,
  dir: [number, number] = [0, -1],
  opts: Record<string, unknown> = {}
): StageEntitySpec => ({
  type: 'queue',
  x,
  y,
  n,
  dir,
  ...opts,
});

export const ring = (
  x: number,
  y: number,
  r: number,
  opts: Record<string, unknown> = {}
): StageEntitySpec => ({
  type: 'ring',
  x,
  y,
  r,
  ...opts,
});

export const link = (
  from: string,
  to: string,
  pts: Array<string | [number | string, number | string]>,
  opts: Partial<StageLinkSpec> = {}
): StageLinkSpec => ({
  from,
  to,
  pts,
  heads: 'end',
  ...opts,
});

// Common reusable actor builders for Alice, Bob, Eve/Mallory, Routers, Cipher Engine, Key Vault
export const aliceDev = (
  x: number,
  y: number,
  tags: TagSpec[] = [],
  opts: Record<string, unknown> = {}
) =>
  device(x, y, {
    form: 'laptop',
    label: 'Alice',
    tags,
    ...opts,
  });

export const bobDev = (
  x: number,
  y: number,
  tags: TagSpec[] = [],
  opts: Record<string, unknown> = {}
) =>
  device(x, y, {
    form: 'laptop',
    label: 'Bob',
    tags,
    ...opts,
  });

export const hackerNode = (
  x: number,
  y: number,
  name: string,
  tags: TagSpec[] = [],
  opts: Record<string, unknown> = {}
) =>
  block(x, y, {
    color: 'orange',
    glyph: 'skull',
    label: [name],
    sub: 'attacker',
    tags,
    ...opts,
  });

export const cipherBlock = (
  x: number,
  y: number,
  label: string[],
  sub: string,
  tags: TagSpec[] = [],
  opts: Record<string, unknown> = {}
) =>
  block(x, y, {
    color: 'purple',
    glyph: 'lock',
    label,
    sub,
    tags,
    ...opts,
  });

export const keyVault = (
  x: number,
  y: number,
  label = 'Secret Key',
  tags: TagSpec[] = [],
  opts: Record<string, unknown> = {}
) =>
  block(x, y, {
    color: 'yellow',
    glyph: 'key',
    s: 3.4,
    h: 36,
    label: [label],
    tags,
    ...opts,
  });

export const routerNode = (
  x: number,
  y: number,
  label: string[],
  sub = 'router',
  tags: TagSpec[] = [],
  opts: Record<string, unknown> = {}
) =>
  block(x, y, {
    color: 'slab',
    glyph: 'wifi',
    s: 3.6,
    h: 34,
    label,
    sub,
    tags,
    ...opts,
  });
