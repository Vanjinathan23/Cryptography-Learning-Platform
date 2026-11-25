import { useEffect, useMemo, useRef, useState } from 'react';
import {
  block,
  db,
  device,
  hackerNode,
  keyVault,
  link,
} from '../data/cryptoHelpers';
import { fnv1aHex } from '../data/labData';
import { INITIAL_MINI_XRAY } from '../data/practiceMissions';
import { StageEngine, StageScene, renderIcon } from '../engine/isoEngine';
import TutorGuideCard from './TutorGuideCard';

type StageNum = 1 | 2 | 3 | 4 | 5;

const PAY_AMOUNTS = [50, 120, 250];
const NONCE_POOL = ['8841-f9a2', '3c7e-4b19', '9f4a-102c', '5d28-e60b'];

const STAGE_META: Array<{ num: StageNum; label: string }> = [
  { num: 1, label: 'Spot ECB Leak' },
  { num: 2, label: 'Fix with GCM' },
  { num: 3, label: 'Isolate KMS Key' },
  { num: 4, label: 'See Replay Attack' },
  { num: 5, label: 'Block Replays' },
];

export default function Scenario5GuidedPractice({
  theme,
  onSecured,
}: {
  theme: 'light' | 'dark';
  onSecured?: () => void;
}) {
  const [stage, setStage] = useState<StageNum>(1);
  const [maxUnlocked, setMaxUnlocked] = useState<StageNum>(1);

  // Stage 1: Paintable 6x6 Hospital X-Ray + AES-ECB Leak
  const [grid, setGrid] = useState<number[]>(() => [...INITIAL_MINI_XRAY]);
  const [ecbTested, setEcbTested] = useState(false);

  // Stage 2: Upgrade to AES-256-GCM + Rotate Nonce
  const [gcmOn, setGcmOn] = useState(false);
  const [gcmNonceIdx, setGcmNonceIdx] = useState(0);

  // Stage 3: Key Isolation (S3 Bucket vs Hardware KMS)
  const [kmsChoice, setKmsChoice] = useState<'s3-same' | 'kms' | null>(null);

  // Stage 4: Live Tap-to-Pay Replay Attack Demo
  const [payAmount, setPayAmount] = useState(50);
  const [tapCount, setTapCount] = useState(0);
  const [replayCount, setReplayCount] = useState(0);

  // Stage 5: Fix Replay Hack with One-Time Nonce Ledger
  const [nonceStep, setNonceStep] = useState<'vulnerable' | 'nonce-added' | 'ledger-on' | 'blocked'>('vulnerable');

  const [tutorOverride, setTutorOverride] = useState<{
    mood: 'neutral' | 'happy' | 'warn' | 'hint';
    msg: string;
    key: string;
  } | null>(null);

  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const stageEngineRef = useRef<StageEngine | null>(null);

  const activeNonce = NONCE_POOL[gcmNonceIdx % NONCE_POOL.length];
  const totalStage4Charged = (tapCount + replayCount) * payAmount;

  useEffect(() => {
    if (nonceStep === 'blocked') {
      onSecured?.();
    }
  }, [nonceStep, onSecured]);

  const unlockAndGo = (next: StageNum) => {
    setMaxUnlocked((prev) => (next > prev ? next : prev));
    setStage(next);
    setTutorOverride(null);
  };

  const togglePixel = (idx: number) => {
    setGrid((prev) => {
      const next = [...prev];
      next[idx] = (next[idx] + 1) % 3;
      return next;
    });
  };

  const handleTestEcb = () => {
    setEcbTested(true);
    setTutorOverride({
      mood: 'warn',
      msg: 'Whoa — look at the AES-ECB ciphertext grid on the right! Even though every pixel was encrypted, identical pixels produced identical ciphertext blocks, so the entire hospital X-ray lung shape is STILL visible!',
      key: 's5-s1-ecb',
    });
  };

  const handleEnableGcm = () => {
    setGcmOn(true);
    setTutorOverride({
      mood: 'happy',
      msg: 'Much better! AES-256-GCM mixes a unique Nonce and block counter into EVERY single block. Now identical pixels turn into totally unpredictable static noise!',
      key: 's5-s2-gcm',
    });
  };

  const handleRotateNonce = () => {
    setGcmNonceIdx((i) => i + 1);
    setTutorOverride({
      mood: 'happy',
      msg: 'Fresh Nonce applied! Even encrypting the exact same X-ray scan twice produces a completely different noise pattern each time.',
      key: `s5-s2-rot-${gcmNonceIdx + 1}`,
    });
  };

  const handlePickKms = (choice: 's3-same' | 'kms') => {
    setKmsChoice(choice);
    if (choice === 's3-same') {
      setTutorOverride({
        mood: 'warn',
        msg: 'Uh-oh! Putting the Master Key inside the same S3 bucket is like taping your house key to the front door. When the bucket leaks, the thief decrypts every patient scan!',
        key: 's5-s3-bad',
      });
    } else {
      setTutorOverride({
        mood: 'happy',
        msg: 'Spot on! With Envelope Encryption, the Master Key stays sealed inside Hardware KMS behind strict IAM policies. Even if the entire S3 bucket leaks, hackers only get useless noise!',
        key: 's5-s3-ok',
      });
    }
  };

  const handleGenuineTap = () => {
    setTapCount((c) => c + 1);
    setTutorOverride({
      mood: 'neutral',
      msg: `Genuine tap #${tapCount + 1} charged $${payAmount}. Now click "2. Replay Captured Encrypted Tap" to see what happens when an attacker resends that exact same valid packet!`,
      key: `s5-s4-tap-${tapCount + 1}`,
    });
  };

  const handleReplayTap = () => {
    if (tapCount === 0) setTapCount(1);
    setReplayCount((r) => r + 1);
    setTutorOverride({
      mood: 'warn',
      msg: `Double-charged! Even though the packet was encrypted with AES-GCM, the attacker didn’t need to decrypt it — they just replayed the exact same valid packet and charged $${payAmount} AGAIN!`,
      key: `s5-s4-rep-${replayCount + 1}`,
    });
  };

  const handleNonceStep = (next: 'nonce-added' | 'ledger-on' | 'blocked') => {
    setNonceStep(next);
    if (next === 'nonce-added') {
      setTutorOverride({
        mood: 'neutral',
        msg: `Nice! Every tap now carries a fresh one-time Nonce (9f4a-102c) and timestamp sealed inside its authenticated payload. Next, turn ON the bank’s Spent-Nonce Ledger!`,
        key: 's5-s5-1',
      });
    } else if (next === 'ledger-on') {
      setTutorOverride({
        mood: 'neutral',
        msg: 'Ledger active! The bank now remembers every nonce that has already been spent. Now try replaying the captured tap again!',
        key: 's5-s5-2',
      });
    } else {
      setTutorOverride({
        mood: 'happy',
        msg: 'Scenario 5 Mastered! The bank spotted nonce 9f4a-102c already in the Spent Ledger and blocked the duplicate charge at $0 extra. You have mastered all 5 real-world cryptography defenses!',
        key: 's5-s5-ok',
      });
    }
  };

  const handleResetAll = () => {
    setStage(1);
    setMaxUnlocked(1);
    setGrid([...INITIAL_MINI_XRAY]);
    setEcbTested(false);
    setGcmOn(false);
    setGcmNonceIdx(0);
    setKmsChoice(null);
    setPayAmount(50);
    setTapCount(0);
    setReplayCount(0);
    setNonceStep('vulnerable');
    setTutorOverride(null);
  };

  const tutorContent = useMemo(() => {
    if (stage === 1) {
      return {
        mood: ecbTested ? ('warn' as const) : ('neutral' as const),
        msg: ecbTested
          ? 'Look closely! AES-ECB encrypted every pixel block independently, so the X-ray shape leaked right through the ciphertext! Click Next to fix it with AES-256-GCM.'
          : 'Welcome to Scenario 5 — our final mission! A hospital stores X-ray scans in the cloud. Click any pixel below if you want to edit the scan, then click "Encrypt with AES-ECB" to see a classic real-world flaw!',
        hint: 'Click "Encrypt with AES-ECB" to compare the raw X-ray scan side-by-side with its leaky ECB ciphertext.',
        key: `s5-stage1-${ecbTested}`,
      };
    }
    if (stage === 2) {
      return {
        mood: gcmOn ? ('happy' as const) : ('neutral' as const),
        msg: gcmOn
          ? 'Every block now looks like pure random snow! Try clicking "Rotate Random Nonce" to watch the whole encrypted grid re-randomize, then continue to Stage 3.'
          : 'Now fix the leaking X-ray! Switch the cloud vault from AES-ECB to AES-256-GCM with a unique Nonce and watch the silhouette disappear.',
        hint: 'Click "Upgrade to AES-256-GCM" to hide every pattern behind a unique nonce + counter stream.',
        key: `s5-stage2-${gcmOn}-${gcmNonceIdx}`,
      };
    }
    if (stage === 3) {
      return {
        mood: kmsChoice === 'kms' ? ('happy' as const) : kmsChoice === 's3-same' ? ('warn' as const) : ('neutral' as const),
        msg: 'Your X-ray scans are now encrypted with AES-256-GCM. One critical question left: WHERE should the hospital store the Master Encryption Key?',
        hint: 'Never keep the key in the same S3 bucket as the encrypted data. Choose Isolated Hardware KMS!',
        key: `s5-stage3-${kmsChoice || 'none'}`,
      };
    }
    if (stage === 4) {
      return {
        mood: replayCount > 0 ? ('warn' as const) : ('neutral' as const),
        msg: replayCount > 0
          ? `Caught in the act! Encryption hid your card number, yet the thief charged you $${totalStage4Charged} by replaying the same encrypted tap! Let’s stop replays in Step 5.`
          : 'Part 2 of our vault mission: NFC Tap-to-Pay! Send 1 genuine encrypted tap, then click "Replay Captured Tap" to see how hackers steal money WITHOUT even decrypting the packet.',
        hint: 'Click "1. Send Genuine Tap" first, then click "2. Replay Captured Encrypted Tap" to watch duplicate charges pile up.',
        key: `s5-stage4-${tapCount}-${replayCount}`,
      };
    }
    return {
      mood: nonceStep === 'blocked' ? ('happy' as const) : ('neutral' as const),
      msg: 'Final step! Let’s defeat Replay Attacks forever. Attach a unique one-time Nonce to each payment, enable the Server Nonce Ledger, and test the replay attack again!',
      hint: 'Click buttons 1 → 2 → 3 in order to add a unique nonce, turn on the spent-nonce ledger, and block the duplicate tap!',
      key: `s5-stage5-${nonceStep}`,
    };
  }, [stage, ecbTested, gcmOn, gcmNonceIdx, kmsChoice, tapCount, replayCount, totalStage4Charged, nonceStep]);

  const activeTutor = tutorOverride ?? tutorContent;

  const scene = useMemo((): StageScene => {
    if (stage === 1) {
      return {
        entities: {
          scanner: device(-13, -1, {
            form: 'laptop',
            label: 'Hospital X-Ray',
            tags: [
              {
                text: ecbTested ? 'AES-ECB (Leaky!)' : '6×6 Patient Scan',
                tone: ecbTested ? 'red' : 'blue',
                icon: ecbTested ? 'alert' : 'layers',
              },
            ],
          }),
          bucket: db(0, -1, {
            label: ['Cloud S3', 'Vault'],
            sub: ecbTested ? 'ECB silhouette!' : 'pending encrypt',
            tags: [
              {
                text: ecbTested ? 'Pattern Visible!' : 'Waiting',
                tone: ecbTested ? 'red' : 'amber',
                icon: ecbTested ? 'eye' : 'database',
              },
            ],
          }),
          thief: hackerNode(
            13,
            -1,
            'Bucket Scraper',
            [
              {
                text: ecbTested ? 'Sees Lung Shape!' : 'Watching S3',
                tone: ecbTested ? 'red' : 'amber',
                icon: 'eye',
              },
            ],
            { heat: ecbTested ? 0.9 : 0.25 }
          ),
        },
        links: {
          sb: link('scanner', 'bucket', ['scanner', 'bucket'], {
            label: ecbTested ? 'AES-ECB blocks' : 'raw scan',
            labelTone: ecbTested ? 'red' : 'amber',
          }),
          bt: link('bucket', 'thief', ['bucket', 'thief'], {
            style: 'dashed',
            label: ecbTested ? 'leaks shape!' : 'monitors',
            labelTone: ecbTested ? 'red' : 'amber',
          }),
        },
        flows: [
          { route: ['sb'], kind: ecbTested ? 'poison' : 'write', rate: 0.85 },
          { route: ['bt'], kind: ecbTested ? 'poison' : 'slow', rate: ecbTested ? 1.0 : 0.3 },
        ],
      };
    }

    if (stage === 2) {
      return {
        entities: {
          scanner: device(-13, -1, {
            form: 'laptop',
            label: 'Hospital X-Ray',
            tags: [
              {
                text: gcmOn ? `GCM Nonce ${activeNonce.slice(0, 4)}` : 'Still AES-ECB!',
                tone: gcmOn ? 'green' : 'red',
                icon: gcmOn ? 'lock' : 'alert',
              },
            ],
          }),
          bucket: db(0, -1, {
            label: ['Cloud S3', 'Vault'],
            sub: gcmOn ? 'pure random noise' : 'ECB silhouette!',
            tags: [
              {
                text: gcmOn ? '0 Patterns Leaked ✓' : 'Shape Visible!',
                tone: gcmOn ? 'green' : 'red',
                icon: gcmOn ? 'shield' : 'eye',
              },
            ],
          }),
          thief: hackerNode(
            13,
            -1,
            'Bucket Scraper',
            [
              {
                text: gcmOn ? 'Only Random Noise ✓' : 'Reads Lung Shape!',
                tone: gcmOn ? 'green' : 'red',
                icon: gcmOn ? 'eyeOff' : 'eye',
              },
            ],
            { heat: gcmOn ? 0 : 0.85 }
          ),
        },
        links: {
          sb: link('scanner', 'bucket', ['scanner', 'bucket'], {
            label: gcmOn ? 'AES-256-GCM + Nonce' : 'AES-ECB',
            labelTone: gcmOn ? 'green' : 'red',
          }),
          bt: link('bucket', 'thief', ['bucket', 'thief'], {
            style: 'dashed',
            label: gcmOn ? 'unreadable noise' : 'shape visible',
            labelTone: gcmOn ? 'green' : 'red',
          }),
        },
        flows: [
          { route: ['sb'], kind: gcmOn ? 'msg' : 'poison', rate: 0.9 },
          { route: ['bt'], kind: gcmOn ? 'empty' : 'poison', rate: 0.7 },
        ],
      };
    }

    if (stage === 3) {
      const safe = kmsChoice === 'kms';
      const bad = kmsChoice === 's3-same';
      return {
        entities: {
          bucket: db(-12, -1, {
            label: ['Leaked S3', 'Bucket'],
            sub: bad ? 'DATA + KEY INSIDE!' : 'ciphertext only',
            tags: [
              {
                text: bad ? 'Key Leaked Too!' : safe ? 'Ciphertext Only ✓' : 'Pick Key Location',
                tone: bad ? 'red' : safe ? 'green' : 'amber',
                icon: bad ? 'alert' : 'database',
              },
            ],
          }),
          kms: keyVault(0, 9, 'Hardware KMS', [
            {
              text: safe ? 'Master Key Isolated ✓' : 'Unused!',
              tone: safe ? 'green' : 'amber',
              icon: 'key',
            },
          ]),
          thief: hackerNode(
            12,
            -1,
            'Cloud Thief',
            [
              {
                text: safe ? 'Locked Out (No Key) ✓' : bad ? 'Decrypted All Scans!' : 'Waiting for Dump',
                tone: safe ? 'green' : bad ? 'red' : 'amber',
                icon: safe ? 'ban' : 'skull',
              },
            ],
            { heat: safe ? 0 : bad ? 0.95 : 0.35 }
          ),
        },
        links: {
          bt: link('bucket', 'thief', ['bucket', 'thief'], {
            style: 'dashed',
            label: safe ? 'useless noise' : bad ? 'stole scans + key!' : 'bucket dump',
            labelTone: safe ? 'green' : 'red',
          }),
          tk: link('thief', 'kms', ['thief', 'kms'], {
            style: 'dashed',
            label: safe ? 'IAM denied!' : 'not isolated',
            labelTone: safe ? 'green' : 'amber',
            fail: safe ? 0.95 : 0,
          }),
        },
        flows: [
          { route: ['bt'], kind: safe ? 'empty' : 'poison', rate: 0.9 },
          { route: ['tk'], kind: safe ? 'kill' : 'slow', rate: 0.65 },
        ],
      };
    }

    if (stage === 4) {
      const replayed = replayCount > 0;
      return {
        entities: {
          card: device(-14, -1, {
            form: 'phone',
            label: 'Tap-to-Pay',
            tags: [
              {
                text: tapCount > 0 ? `Sent $${payAmount} Tap` : 'Ready to Tap',
                tone: 'blue',
                icon: 'creditCard',
              },
            ],
          }),
          skimmer: hackerNode(
            0,
            9,
            'NFC Replay Thief',
            [
              {
                text: replayed ? `Replayed ×${replayCount} (+$${replayCount * payAmount}!)` : 'Captured Packet',
                tone: replayed ? 'red' : 'amber',
                icon: 'wifi',
              },
            ],
            { heat: replayed ? 0.95 : 0.35 }
          ),
          pos: block(14, -1, {
            color: replayed ? 'orange' : 'purple',
            glyph: 'server',
            label: ['Bank POS', 'Terminal'],
            sub: `Charged: $${totalStage4Charged}`,
            tags: [
              {
                text: replayed ? 'Double-Charged!' : 'No Nonce Ledger',
                tone: replayed ? 'red' : 'amber',
                icon: replayed ? 'alert' : 'clock',
              },
            ],
          }),
        },
        links: {
          cp: link('card', 'pos', ['card', 'pos'], {
            label: `encrypted $${payAmount}`,
            labelTone: 'green',
          }),
          sp: link('skimmer', 'pos', ['skimmer', 'pos'], {
            style: 'dashed',
            label: replayed ? `replayed valid packet!` : 'ready to replay',
            labelTone: replayed ? 'red' : 'amber',
          }),
        },
        flows: [
          { route: ['cp'], kind: 'msg', rate: tapCount > 0 ? 0.85 : 0.25 },
          { route: ['sp'], kind: replayed ? 'poison' : 'slow', rate: replayed ? 1.1 : 0.2 },
        ],
      };
    }

    // Stage 5: Nonce Ledger Replay Rescue
    const hasNonce = nonceStep !== 'vulnerable';
    const ledgerOn = nonceStep === 'ledger-on' || nonceStep === 'blocked';
    const blocked = nonceStep === 'blocked';
    return {
      entities: {
        card: device(-14, -1, {
          form: 'phone',
          label: 'Tap-to-Pay',
          tags: [
            {
              text: hasNonce ? 'Nonce: 9f4a-102c ✓' : 'No Unique Nonce',
              tone: hasNonce ? 'green' : 'red',
              icon: 'creditCard',
            },
          ],
        }),
        skimmer: hackerNode(
          0,
          9,
          'NFC Replay Thief',
          [
            {
              text: blocked ? 'Duplicate Rejected ✓' : 'Replaying 9f4a-102c',
              tone: blocked ? 'green' : 'red',
              icon: blocked ? 'ban' : 'wifi',
            },
          ],
          { heat: blocked ? 0 : 0.85 }
        ),
        ledger: db(0, -1, {
          label: ['Spent-Nonce', 'Ledger'],
          sub: ledgerOn ? '[9f4a-102c: USED]' : 'ledger OFF',
          tags: [
            {
              text: ledgerOn ? 'Replay Guard ON ✓' : 'Step 2: Enable',
              tone: ledgerOn ? 'green' : 'amber',
              icon: ledgerOn ? 'shield' : 'alert',
            },
          ],
        }),
        pos: block(14, -1, {
          color: blocked ? 'green' : 'purple',
          glyph: 'server',
          label: ['Bank POS', 'Terminal'],
          sub: blocked ? `$${payAmount} only ($0 extra)` : 'processing…',
          tags: [
            {
              text: blocked ? 'Replay Blocked ✓' : 'Testing Guard',
              tone: blocked ? 'green' : 'amber',
              icon: blocked ? 'circleCheck' : 'clock',
            },
          ],
        }),
      },
      links: {
        cl: link('card', 'ledger', ['card', 'ledger'], {
          label: hasNonce ? 'tap + nonce 9f4a' : 'no nonce',
          labelTone: hasNonce ? 'green' : 'red',
        }),
        lp: link('ledger', 'pos', ['ledger', 'pos'], {
          label: blocked ? 'genuine only ✓' : 'authorize',
          labelTone: blocked ? 'green' : 'amber',
        }),
        sl: link('skimmer', 'ledger', ['skimmer', 'ledger'], {
          style: 'dashed',
          label: blocked ? '9f4a ALREADY SPENT · DROP!' : 'replayed packet',
          labelTone: blocked ? 'green' : 'red',
          fail: blocked ? 0.95 : 0,
        }),
      },
      flows: [
        { route: ['cl', 'lp'], kind: 'msg', rate: 0.85 },
        { route: ['sl'], kind: blocked ? 'kill' : 'poison', rate: 0.95 },
      ],
    };
  }, [stage, ecbTested, gcmOn, activeNonce, kmsChoice, payAmount, tapCount, replayCount, totalStage4Charged, nonceStep]);

  useEffect(() => {
    if (!canvasHostRef.current) return;
    const engine = new StageEngine(canvasHostRef.current);
    stageEngineRef.current = engine;
    return () => {
      engine.clear();
      if (canvasHostRef.current) canvasHostRef.current.innerHTML = '';
      stageEngineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const engine = stageEngineRef.current;
    if (!engine) return;
    engine.frame([scene]);
    engine.goTo(scene);
  }, [scene]);

  useEffect(() => {
    stageEngineRef.current?.retheme();
  }, [theme]);

  const checklist = [
    { label: 'Spot the AES-ECB X-Ray silhouette leak', done: maxUnlocked > 1 || ecbTested },
    { label: 'Hide patterns with AES-256-GCM + Nonce', done: maxUnlocked > 2 || gcmOn },
    { label: 'Isolate Master Key in Hardware KMS', done: maxUnlocked > 3 || kmsChoice === 'kms' },
    { label: 'Trigger a Tap-to-Pay Replay double-charge', done: maxUnlocked > 4 || replayCount > 0 },
    { label: 'Block replays with a Spent-Nonce Ledger', done: nonceStep === 'blocked' },
  ];

  const completedCount = checklist.filter((c) => c.done).length;

  // Deterministic visual color for ECB vs GCM encrypted pixel preview
  const getEncryptedCellBg = (val: number, idx: number, useGcm: boolean) => {
    if (!useGcm) {
      // ECB maps identical plaintext values to identical ciphertext hues!
      return val === 0 ? '#5c6b7a' : val === 1 ? '#d98a4e' : '#3a8f6e';
    }
    // GCM mixes nonce + block index -> pure uniform random noise
    const h = parseInt(fnv1aHex(`${activeNonce}:${idx}:${val}`).slice(0, 6), 16);
    const hue = h % 360;
    const light = 34 + ((h >> 8) % 34);
    return `hsl(${hue}, 44%, ${light}%)`;
  };

  return (
    <div className="guided-layout">
      <div className="guided-main">
        {/* 5-Stage Journey Stepper */}
        <nav className="journey-bar card" aria-label="Scenario 5 Guided Steps">
          {STAGE_META.map((s) => {
            const isCurrent = stage === s.num;
            const isUnlocked = s.num <= maxUnlocked;
            const isDone =
              s.num < stage ||
              (s.num === 1 && ecbTested) ||
              (s.num === 2 && gcmOn) ||
              (s.num === 3 && kmsChoice === 'kms') ||
              (s.num === 4 && replayCount > 0) ||
              (s.num === 5 && nonceStep === 'blocked');

            return (
              <button
                key={s.num}
                type="button"
                className={`journey-step ${isCurrent ? 'is-current' : ''} ${isDone ? 'is-done' : ''} ${!isUnlocked ? 'is-locked' : ''}`}
                disabled={!isUnlocked}
                onClick={() => {
                  setStage(s.num);
                  setTutorOverride(null);
                }}
              >
                <span className="journey-step__num">
                  {isDone && !isCurrent ? (
                    <span dangerouslySetInnerHTML={{ __html: renderIcon('check', { size: 12, stroke: 3 }) }} />
                  ) : (
                    s.num
                  )}
                </span>
                <span className="journey-step__label">{s.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Live 3D Isometric Stage */}
        <section className="card stage guided-stage">
          <div className="stage__hud">
            <div className="chip" data-level="none">
              <span className="chip__label">Current Stage</span>
              <span className="chip__value">
                Step {stage} of 5 · {STAGE_META[stage - 1].label}
              </span>
            </div>
            <div className="chip" data-level={nonceStep === 'blocked' ? 'good' : stage >= 2 && gcmOn ? 'warn' : 'bad'}>
              <span className="chip__label">Vault & Pay Guard</span>
              <span className="chip__value">
                {nonceStep === 'blocked'
                  ? 'GCM + KMS + Nonce Ledger ✓'
                  : stage === 1
                    ? ecbTested
                      ? 'ECB Silhouette Leaked!'
                      : 'Raw X-Ray Scan'
                    : stage === 2
                      ? gcmOn
                        ? `GCM Noise (Nonce ${activeNonce.slice(0, 4)})`
                        : 'Still AES-ECB'
                      : stage === 3
                        ? kmsChoice === 'kms'
                          ? 'KMS Isolated ✓'
                          : 'Key Placement Needed'
                        : stage === 4
                          ? `Charged $${totalStage4Charged}`
                          : 'Replay Attack Live'}
              </span>
            </div>
          </div>
          <div className="stage__canvas" ref={canvasHostRef} />
        </section>

        {/* Active Stage Focused Workout Card */}
        <section className="card step-workout-card">
          {/* ==================== STAGE 1: SPOT ECB LEAK ==================== */}
          {stage === 1 && (
            <div className="step-body">
              <div className="step-head">
                <span className="eyebrow">Step 1 of 5 · See Why Cipher Mode Matters</span>
                <h2>Encrypt the Hospital X-Ray with AES-ECB and spot the leak</h2>
                <p className="step-desc">
                  Click any tile in the 6×6 X-Ray grid to draw, then click <b>Encrypt with AES-ECB</b> to see what lands inside the cloud bucket.
                </p>
              </div>

              <div className="xray-compare-row">
                <div className="xray-panel">
                  <span className="eyebrow">Original Hospital X-Ray (Click to Paint)</span>
                  <div className="mini-px-grid">
                    {grid.map((val, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className={`mini-px-cell is-v${val}`}
                        onClick={() => togglePixel(idx)}
                        aria-label={`X-Ray pixel ${idx + 1}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="xray-panel">
                  <span className="eyebrow">
                    {ecbTested ? 'AES-ECB Ciphertext (Shape STILL Visible!)' : 'Encrypted Vault Output'}
                  </span>
                  <div className="mini-px-grid">
                    {grid.map((val, idx) => (
                      <div
                        key={idx}
                        className="mini-px-cell is-static"
                        style={{
                          background: ecbTested
                            ? getEncryptedCellBg(val, idx, false)
                            : 'var(--paper-2)',
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {ecbTested && (
                <div className="step-feedback is-bad">
                  <b>Pattern leaked right through AES-ECB!</b>
                  <p>
                    ECB encrypts every identical block into the exact same ciphertext block — so anyone who steals the S3 bucket still sees the patient’s lung silhouette!
                  </p>
                </div>
              )}

              <div className="step-actions">
                <button type="button" className="btn-pop" onClick={handleTestEcb}>
                  {ecbTested ? 'Re-Run AES-ECB' : 'Encrypt with AES-ECB'}
                </button>
                <button
                  type="button"
                  className="btn-pop"
                  disabled={!ecbTested}
                  onClick={() => unlockAndGo(2)}
                >
                  Next: Hide Patterns with GCM →
                </button>
              </div>
            </div>
          )}

          {/* ==================== STAGE 2: FIX WITH GCM ==================== */}
          {stage === 2 && (
            <div className="step-body">
              <div className="step-head">
                <span className="eyebrow">Step 2 of 5 · Upgrade to AES-256-GCM</span>
                <h2>Mix a unique Nonce into every block so the X-Ray vanishes</h2>
                <p className="step-desc">
                  Upgrade from AES-ECB to <b>AES-256-GCM</b> and watch identical pixels scramble into completely different ciphertext noise.
                </p>
              </div>

              <div className="xray-compare-row">
                <div className="xray-panel">
                  <span className="eyebrow">Original Hospital X-Ray</span>
                  <div className="mini-px-grid">
                    {grid.map((val, idx) => (
                      <div key={idx} className={`mini-px-cell is-v${val} is-static`} />
                    ))}
                  </div>
                </div>

                <div className="xray-panel">
                  <span className="eyebrow">
                    {gcmOn ? `AES-256-GCM (Nonce: ${activeNonce})` : 'Still AES-ECB (Leaky!)'}
                  </span>
                  <div className="mini-px-grid">
                    {grid.map((val, idx) => (
                      <div
                        key={idx}
                        className="mini-px-cell is-static"
                        style={{ background: getEncryptedCellBg(val, idx, gcmOn) }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {gcmOn && (
                <div className="step-feedback is-good">
                  <b>Zero visual patterns leaked!</b>
                  <p>
                    AES-256-GCM combines a unique Nonce (<code>{activeNonce}</code>) + block counter so identical pixels encrypt to pure static — plus adds a 128-bit tamper tag!
                  </p>
                </div>
              )}

              <div className="step-actions">
                <button type="button" className="btn-ghost" onClick={() => setStage(1)}>
                  ← Back
                </button>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {!gcmOn ? (
                    <button type="button" className="btn-pop" onClick={handleEnableGcm}>
                      Upgrade to AES-256-GCM
                    </button>
                  ) : (
                    <>
                      <button type="button" className="btn-ghost" onClick={handleRotateNonce}>
                        Rotate Random Nonce
                      </button>
                      <button type="button" className="btn-pop" onClick={() => unlockAndGo(3)}>
                        Next: Isolate Master Key →
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ==================== STAGE 3: ISOLATE KMS KEY ==================== */}
          {stage === 3 && (
            <div className="step-body">
              <div className="step-head">
                <span className="eyebrow">Step 3 of 5 · Key Management Architecture</span>
                <h2>Where should the hospital store its Master Encryption Key?</h2>
                <p className="step-desc">
                  Imagine a misconfigured cloud rule exposes the hospital’s S3 storage bucket to the public internet. Pick the key architecture that survives!
                </p>
              </div>

              <div className="algo-choice-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                <button
                  type="button"
                  className={`algo-choice ${kmsChoice === 's3-same' ? 'is-wrong' : ''}`}
                  onClick={() => handlePickKms('s3-same')}
                >
                  <div className="algo-choice__top">
                    <b>Store Key Inside S3 Bucket</b>
                    <span className="algo-tag is-bad">Single Point of Failure</span>
                  </div>
                  <p>Keep `master.key` in the same S3 bucket folder as the encrypted X-ray scans for convenience.</p>
                </button>

                <button
                  type="button"
                  className={`algo-choice ${kmsChoice === 'kms' ? 'is-right' : ''}`}
                  onClick={() => handlePickKms('kms')}
                >
                  <div className="algo-choice__top">
                    <b>Isolated Hardware KMS</b>
                    <span className="algo-tag is-good">Envelope Encryption</span>
                  </div>
                  <p>Lock the Master Key inside Hardware KMS behind separate IAM permissions so a leaked S3 bucket stays unreadable.</p>
                </button>
              </div>

              {kmsChoice && (
                <div className={`step-feedback ${kmsChoice === 'kms' ? 'is-good' : 'is-bad'}`}>
                  {kmsChoice === 's3-same' ? (
                    <>
                      <b>Bucket breach = total decryption!</b>
                      <p>Never store keys alongside the ciphertext they protect — a single misconfigured S3 policy hands attackers both!</p>
                    </>
                  ) : (
                    <>
                      <b>Cloud Vault Secured!</b>
                      <p>Envelope Encryption separates ciphertext storage (S3) from Master Key custody (Hardware KMS). Stolen S3 files remain unbreakable noise!</p>
                    </>
                  )}
                </div>
              )}

              <div className="step-actions">
                <button type="button" className="btn-ghost" onClick={() => setStage(2)}>
                  ← Back
                </button>
                <button
                  type="button"
                  className="btn-pop"
                  disabled={kmsChoice !== 'kms'}
                  onClick={() => unlockAndGo(4)}
                >
                  Next: Test Tap-to-Pay Replay Attack →
                </button>
              </div>
            </div>
          )}

          {/* ==================== STAGE 4: SEE REPLAY ATTACK ==================== */}
          {stage === 4 && (
            <div className="step-body">
              <div className="step-head">
                <span className="eyebrow">Step 4 of 5 · Why Encryption Alone Isn’t Enough</span>
                <h2>Watch a Tap-to-Pay Replay Attack double-charge an encrypted card</h2>
                <p className="step-desc">
                  Pick a payment amount, send 1 genuine encrypted tap, then click <b>Replay Captured Tap</b> to resend that exact same valid packet!
                </p>
              </div>

              <div className="workout-row">
                <div className="word-presets">
                  <span className="eyebrow">Tap Amount</span>
                  <div className="word-preset-btns">
                    {PAY_AMOUNTS.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        className={`word-chip ${payAmount === amt ? 'is-active' : ''}`}
                        onClick={() => {
                          setPayAmount(amt);
                          setTapCount(0);
                          setReplayCount(0);
                        }}
                      >
                        ${amt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rescue-wire" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                <div className="rescue-byte is-good">
                  <small>Genuine Taps</small>
                  <b>{tapCount}</b>
                </div>
                <div className={`rescue-byte ${replayCount > 0 ? 'is-bad' : ''}`}>
                  <small>Replayed Taps</small>
                  <b>{replayCount}</b>
                </div>
                <div className={`rescue-byte ${replayCount > 0 ? 'is-bad' : 'is-tag'}`}>
                  <small>Total Charged</small>
                  <b>${totalStage4Charged}</b>
                </div>
              </div>

              {replayCount > 0 && (
                <div className="step-feedback is-bad">
                  <b>
                    Replay Attack succeeded! Charged ${totalStage4Charged} instead of ${payAmount}!
                  </b>
                  <p>
                    The attacker NEVER decrypted your card! They simply recorded your valid encrypted tap and re-broadcast it to the terminal.
                  </p>
                </div>
              )}

              <div className="step-actions">
                <button type="button" className="btn-ghost" onClick={() => setStage(3)}>
                  ← Back
                </button>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" className="btn-ghost" onClick={handleGenuineTap}>
                    1. Send Genuine Tap (${payAmount})
                  </button>
                  <button
                    type="button"
                    className="btn-pop"
                    disabled={tapCount === 0}
                    onClick={handleReplayTap}
                  >
                    2. Replay Captured Encrypted Tap
                  </button>
                  {replayCount > 0 && (
                    <button type="button" className="btn-pop" onClick={() => unlockAndGo(5)}>
                      Next: Stop Replays with Nonce Ledger →
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ==================== STAGE 5: BLOCK REPLAYS ==================== */}
          {stage === 5 && (
            <div className="step-body">
              <div className="step-head">
                <span className="eyebrow">Step 5 of 5 · Hands-On Replay Defense</span>
                <h2>Stop Tap-to-Pay Replays with a One-Time Nonce Ledger</h2>
                <p className="step-desc">
                  Complete the 3 steps below to give every tap a single-use Nonce + Timestamp and make the bank reject duplicates automatically.
                </p>
              </div>

              <div className="rescue-wire">
                <div className={`rescue-byte ${nonceStep !== 'vulnerable' ? 'is-good' : 'is-missing'}`}>
                  <small>1. Nonce</small>
                  <b>{nonceStep !== 'vulnerable' ? '9f4a-102c' : 'NONE'}</b>
                </div>
                <div className={`rescue-byte ${nonceStep !== 'vulnerable' ? 'is-good' : ''}`}>
                  <small>Timestamp</small>
                  <b>{nonceStep !== 'vulnerable' ? '14:02:09Z' : 'Missing'}</b>
                </div>
                <div className={`rescue-byte ${nonceStep === 'ledger-on' || nonceStep === 'blocked' ? 'is-good' : 'is-missing'}`}>
                  <small>2. Ledger</small>
                  <b>{nonceStep === 'ledger-on' || nonceStep === 'blocked' ? 'ACTIVE ✓' : 'OFF'}</b>
                </div>
                <div className={`rescue-byte ${nonceStep === 'blocked' ? 'is-good' : ''}`}>
                  <small>Replay</small>
                  <b>{nonceStep === 'blocked' ? 'DROPPED ✓' : 'Waiting'}</b>
                </div>
                <div className={`rescue-byte ${nonceStep === 'blocked' ? 'is-tag' : ''}`}>
                  <small>Extra Charge</small>
                  <b>{nonceStep === 'blocked' ? '$0 SAFE ✓' : 'At Risk'}</b>
                </div>
              </div>

              {nonceStep === 'blocked' && (
                <div className="victory-summary">
                  <div className="victory-list">
                    <span>✓ AES-256-GCM erased X-Ray silhouette leak</span>
                    <span>✓ Hardware KMS isolated Master Key from S3</span>
                    <span>✓ One-Time Nonce + Timestamp bound every tap</span>
                    <span>✓ Spent-Nonce Ledger blocked duplicate charge at $0!</span>
                  </div>
                </div>
              )}

              <div className="step-actions">
                <button type="button" className="btn-ghost" onClick={() => setStage(4)}>
                  ← Back
                </button>
                {nonceStep === 'vulnerable' && (
                  <button
                    type="button"
                    className="btn-pop"
                    onClick={() => handleNonceStep('nonce-added')}
                  >
                    1. Attach Unique Nonce + Timestamp
                  </button>
                )}
                {nonceStep === 'nonce-added' && (
                  <button
                    type="button"
                    className="btn-pop"
                    onClick={() => handleNonceStep('ledger-on')}
                  >
                    2. Turn ON Server Spent-Nonce Ledger
                  </button>
                )}
                {nonceStep === 'ledger-on' && (
                  <button
                    type="button"
                    className="btn-pop"
                    onClick={() => handleNonceStep('blocked')}
                  >
                    3. Try Replaying Captured Tap Now
                  </button>
                )}
                {nonceStep === 'blocked' && (
                  <button type="button" className="btn-ghost" onClick={handleResetAll}>
                    Replay Scenario 05
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* RIGHT RAIL: Prof. Ada Voice Tutor + Mastery Tracker */}
      <aside className="guided-rail">
        <TutorGuideCard
          mood={activeTutor.mood}
          stageLabel={`Step ${stage} of 5 · ${STAGE_META[stage - 1].label}`}
          message={activeTutor.msg}
          hintText={tutorContent.hint}
          voiceTriggerKey={activeTutor.key}
        />

        <section className="card guided-progress-card">
          <div className="workout-checklist__top">
            <span className="eyebrow">Your Mastery Tracker</span>
            <span className="workout-checklist__count">{completedCount} / 5 done</span>
          </div>
          <ul className="workout-tasks">
            {checklist.map((item, idx) => (
              <li key={idx} className={item.done ? 'is-done' : ''}>
                <span
                  className={`check ${item.done ? 'is-on' : ''}`}
                  dangerouslySetInnerHTML={{
                    __html: renderIcon('check', { size: 11, stroke: 3 }),
                  }}
                />
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        </section>
      </aside>
    </div>
  );
}
