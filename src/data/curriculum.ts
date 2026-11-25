import { CourseModule, Lesson } from './cryptoHelpers';
import { SCENARIO_1_LESSONS } from './scenario1AliceBob';
import { SCENARIO_2_LESSONS } from './scenario2PortalBreach';
import { SCENARIO_3_LESSONS } from './scenario3AirportBank';
import { SCENARIO_4_LESSONS } from './scenario4SoftwareUpdate';
import { SCENARIO_5_LESSONS } from './scenario5VaultPayments';

/**
 * Five completely distinct real-world Cryptography & Cybersecurity scenarios,
 * each structured into 4 clear interactive animated subparts (20 lessons total).
 */
export const MODULES: CourseModule[] = [
  {
    id: 'alice-bob',
    num: '01',
    title: 'Alice to Bob Chat',
    color: 'sand',
    lessons: [
      { id: 'alice-encryption', title: '1. Encrypting on Alice’s Side' },
      { id: 'internet-routing', title: '2. Reaching Bob Across Internet' },
      { id: 'bob-decryption', title: '3. Decrypting on Bob’s Side' },
      { id: 'hacker-interception', title: '4. Hacker Attack & Defense' },
    ],
  },
  {
    id: 'portal-breach',
    num: '02',
    title: 'Portal Login Breach',
    color: 'green',
    lessons: [
      { id: 'portal-password-hash', title: '1. Hashing Passwords at Signup' },
      { id: 'portal-unique-salt', title: '2. Salting Identical Passwords' },
      { id: 'portal-login-verify', title: '3. Login Verification on Server' },
      { id: 'portal-db-breach', title: '4. Hacker Steals the Database' },
    ],
  },
  {
    id: 'airport-bank',
    num: '03',
    title: 'Airport Wi-Fi Banking',
    color: 'purple',
    lessons: [
      { id: 'bank-cert-verify', title: '1. Proving It’s Really the Bank' },
      { id: 'bank-dh-key-exchange', title: '2. Creating a Secret Key in Public' },
      { id: 'bank-tls-tunnel', title: '3. Hybrid TLS 1.3 Tunnel' },
      { id: 'bank-evil-twin-mitm', title: '4. Fake Airport Wi-Fi (MITM)' },
    ],
  },
  {
    id: 'software-update',
    num: '04',
    title: 'Software Updates',
    color: 'orange',
    lessons: [
      { id: 'update-avalanche-hash', title: '1. Fingerprinting the Installer' },
      { id: 'update-private-sign', title: '2. Signing with Private Key' },
      { id: 'update-public-verify', title: '3. Verifying Before Installing' },
      { id: 'update-trojan-attack', title: '4. Supply-Chain Malware Attack' },
    ],
  },
  {
    id: 'vault-payments',
    num: '05',
    title: 'Cloud Vault & Pay',
    color: 'rose',
    lessons: [
      { id: 'vault-ecb-vs-gcm', title: '1. X-Ray Scan ECB Pattern Leak' },
      { id: 'vault-kms-at-rest', title: '2. Cloud Storage & KMS Vault' },
      { id: 'wallet-nonce-freshness', title: '3. One-Time Nonces for Payments' },
      { id: 'wallet-replay-bruteforce', title: '4. Replay & Brute-Force Attacks' },
    ],
  },
];

export const ALL_LESSONS: Lesson[] = [
  ...SCENARIO_1_LESSONS,
  ...SCENARIO_2_LESSONS,
  ...SCENARIO_3_LESSONS,
  ...SCENARIO_4_LESSONS,
  ...SCENARIO_5_LESSONS,
];

export const LESSON_MAP: Record<string, Lesson> = Object.fromEntries(
  ALL_LESSONS.map((l) => [l.id, l])
);

export interface LessonMeta {
  id: string;
  title: string;
  module: CourseModule;
  index: number;
  of: number;
}

export const LESSON_META_LIST: LessonMeta[] = MODULES.flatMap((mod) =>
  mod.lessons.map((l, idx) => ({
    ...l,
    module: mod,
    index: idx + 1,
    of: mod.lessons.length,
  }))
);

export const getLessonMeta = (id: string): LessonMeta | undefined =>
  LESSON_META_LIST.find((m) => m.id === id);

export const getNextLessonMeta = (id: string): LessonMeta | null => {
  const idx = LESSON_META_LIST.findIndex((m) => m.id === id);
  return idx >= 0 && idx + 1 < LESSON_META_LIST.length ? LESSON_META_LIST[idx + 1] : null;
};

export interface SearchResult {
  kind: 'lesson' | 'step';
  lessonId: string;
  step: number;
  title: string;
  subtitle: string;
  moduleLabel: string;
  score: number;
}

const stripHtml = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

export function searchCurriculum(query: string): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const terms = q.split(/\s+/).filter(Boolean);
  const results: SearchResult[] = [];

  for (const meta of LESSON_META_LIST) {
    const lesson = LESSON_MAP[meta.id];
    if (!lesson) continue;
    const modLabel = `${meta.module.num} · ${meta.module.title}`;
    const lessonHay = `${lesson.title} ${lesson.summary} ${meta.module.title}`.toLowerCase();
    if (terms.every((t) => lessonHay.includes(t))) {
      results.push({
        kind: 'lesson',
        lessonId: lesson.id,
        step: 0,
        title: lesson.title,
        subtitle: lesson.summary,
        moduleLabel: modLabel,
        score: lesson.title.toLowerCase().includes(q) ? 100 : 60,
      });
    }

    lesson.steps.forEach((step, idx) => {
      const bodyText = step.body.map(stripHtml).join(' ');
      const stepHay = `${step.title} ${step.short} ${bodyText} ${step.callout?.text || ''}`.toLowerCase();
      if (terms.every((t) => stepHay.includes(t))) {
        results.push({
          kind: 'step',
          lessonId: lesson.id,
          step: idx,
          title: step.title,
          subtitle: bodyText.slice(0, 140) + (bodyText.length > 140 ? '…' : ''),
          moduleLabel: `${lesson.title} · Step ${idx + 1}`,
          score: step.title.toLowerCase().includes(q) ? 80 : 40,
        });
      }
    });
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 24);
}
