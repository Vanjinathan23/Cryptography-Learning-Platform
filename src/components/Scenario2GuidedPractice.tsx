import { useEffect, useMemo, useRef, useState } from 'react';
import {
  block,
  db,
  hackerNode,
  link,
  panel,
} from '../data/cryptoHelpers';
import { fnv1aHex } from '../data/labData';
import { StageEngine, StageScene, renderIcon } from '../engine/isoEngine';
import TutorGuideCard from './TutorGuideCard';

type StageNum = 1 | 2 | 3 | 4 | 5;
type StoragePick = 'none' | 'aes' | 'sha256' | 'argon2';

const PRESET_PASSWORDS = ['campus2026', 'study123', 'pizza99'];

const STAGE_META: Array<{ num: StageNum; label: string }> = [
  { num: 1, label: 'Spot DB Leak' },
  { num: 2, label: 'Pick Hash' },
  { num: 3, label: 'Salt by Hand' },
  { num: 4, label: 'Verify Login' },
  { num: 5, label: 'Stop GPU Crack' },
];

export default function Scenario2GuidedPractice({
  theme,
  onSecured,
}: {
  theme: 'light' | 'dark';
  onSecured?: () => void;
}) {
  const [stage, setStage] = useState<StageNum>(1);
  const [maxUnlocked, setMaxUnlocked] = useState<StageNum>(1);

  // Stage 1: Shared password chosen by both Alice & Sam
  const [sharedPw, setSharedPw] = useState('campus2026');
  const [stage1Dumped, setStage1Dumped] = useState(false);

  // Stage 2: Pick storage algorithm
  const [pickedStorage, setPickedStorage] = useState<StoragePick>('none');

  // Stage 3: Manual per-user salting
  const [aliceSalt, setAliceSalt] = useState('');
  const [samSalt, setSamSalt] = useState('');

  // Stage 4: Manual login verification as the server
  const [loginTry, setLoginTry] = useState('wrong99');
  const [testedWrongLogin, setTestedWrongLogin] = useState(false);
  const [testedRightLogin, setTestedRightLogin] = useState(false);
  const [lastLoginVerdict, setLastLoginVerdict] = useState<null | { ok: boolean; hash: string }>(null);

  // Stage 5: Stop the breach (3 sequential steps)
  const [breachStep, setBreachStep] = useState<'stolen' | 'rainbow-dead' | 'ram-walled' | 'secured'>('stolen');

  const [tutorOverride, setTutorOverride] = useState<{
    mood: 'neutral' | 'happy' | 'warn' | 'hint';
    msg: string;
    key: string;
  } | null>(null);

  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const stageEngineRef = useRef<StageEngine | null>(null);

  const cleanPw = sharedPw.trim() || 'campus2026';
  const cleanAliceSalt = aliceSalt.trim();
  const cleanSamSalt = samSalt.trim();
  const saltsValid =
    cleanAliceSalt.length >= 3 &&
    cleanSamSalt.length >= 3 &&
    cleanAliceSalt.toLowerCase() !== cleanSamSalt.toLowerCase();

  const aliceSaltedHash = useMemo(
    () => fnv1aHex(`argon2:${cleanAliceSalt}:${cleanPw}`),
    [cleanAliceSalt, cleanPw]
  );
  const samSaltedHash = useMemo(
    () => fnv1aHex(`argon2:${cleanSamSalt}:${cleanPw}`),
    [cleanSamSalt, cleanPw]
  );
  const unsaltedHash = useMemo(() => fnv1aHex(`sha256::${cleanPw}`), [cleanPw]);

  const effectiveAliceSalt = cleanAliceSalt || '7f1a9c';

  useEffect(() => {
    if (breachStep === 'secured') {
      onSecured?.();
    }
  }, [breachStep, onSecured]);

  const unlockAndGo = (next: StageNum) => {
    setMaxUnlocked((prev) => (next > prev ? next : prev));
    setStage(next);
    setTutorOverride(null);
  };

  const rollRandomSalts = () => {
    const a = fnv1aHex(`a:${Date.now()}:${Math.random()}`).slice(0, 6);
    const s = fnv1aHex(`s:${Date.now() + 7}:${Math.random()}`).slice(0, 6);
    setAliceSalt(a);
    setSamSalt(s);
    setTutorOverride({
      mood: 'happy',
      msg: `Awesome! Look at those hashes now: Alice got salt "${a}" and Sam got "${s}" — even with the exact same password "${cleanPw}", their stored hashes look totally unrelated!`,
      key: `salts-ok-${a}`,
    });
  };

  const handleTestLogin = () => {
    const attempt = loginTry.trim();
    const attemptHash = fnv1aHex(`argon2:${effectiveAliceSalt}:${attempt}`);
    const storedHash = fnv1aHex(`argon2:${effectiveAliceSalt}:${cleanPw}`);
    const ok = attemptHash === storedHash;
    setLastLoginVerdict({ ok, hash: attemptHash });
    if (ok) {
      setTestedRightLogin(true);
      setTutorOverride({
        mood: 'happy',
        msg: `Exact hash match! The server grabbed Alice’s salt "${effectiveAliceSalt}", hashed your login attempt, matched the stored digest, and issued a session — without ever storing her raw password!`,
        key: `login-ok-${attempt}`,
      });
    } else {
      setTestedWrongLogin(true);
      setTutorOverride({
        mood: 'warn',
        msg: `401 Denied! "${attempt}" hashed to ${attemptHash.slice(0, 10)}…, which does NOT match Alice’s stored hash ${storedHash.slice(0, 10)}…. Now try typing Alice’s real password "${cleanPw}"!`,
        key: `login-bad-${attempt}`,
      });
    }
  };

  const handleRestartAll = () => {
    setStage(1);
    setMaxUnlocked(1);
    setStage1Dumped(false);
    setPickedStorage('none');
    setAliceSalt('');
    setSamSalt('');
    setLoginTry('wrong99');
    setTestedWrongLogin(false);
    setTestedRightLogin(false);
    setLastLoginVerdict(null);
    setBreachStep('stolen');
    setTutorOverride(null);
  };

  const liveScene = useMemo((): StageScene => {
    // Stage 1: Plaintext DB dump
    if (stage === 1) {
      return {
        entities: {
          portal: block(-15, -2, {
            color: 'blue',
            glyph: 'server',
            label: ['Campus', 'Portal'],
            sub: 'signup form',
            tags: [{ text: `Alice & Sam: "${cleanPw}"`, tone: stage1Dumped ? 'red' : 'blue', icon: 'users' }],
          }),
          database: db(0, -2, {
            label: ['students_auth', 'Table'],
            sub: stage1Dumped ? 'PLAINTEXT LEAKED!' : 'raw column',
            tags: [{ text: stage1Dumped ? '2,000 passwords exposed!' : 'Click Save & Dump', tone: stage1Dumped ? 'red' : 'paper', icon: 'database' }],
          }),
          hacker: hackerNode(
            15,
            -2,
            'SQL Attacker',
            [stage1Dumped ? { text: `READ "${cleanPw}"!`, tone: 'red', icon: 'eye' } : { text: 'Scanning for SQLi…', tone: 'amber', icon: 'bug' }],
            { heat: stage1Dumped ? 0.9 : 0.25 }
          ),
        },
        links: {
          pd: link('portal', 'database', ['portal', 'database'], {
            label: stage1Dumped ? `"${cleanPw}" (raw)` : 'signup',
            labelTone: stage1Dumped ? 'red' : 'blue',
          }),
          dh: link('database', 'hacker', ['database', 'hacker'], {
            style: 'dashed',
            label: stage1Dumped ? 'SQL dump stolen!' : 'waiting',
            labelTone: stage1Dumped ? 'red' : 'gray',
          }),
        },
        flows: stage1Dumped
          ? [
              { route: ['pd'], kind: 'mine', rate: 0.8 },
              { route: ['dh'], kind: 'poison', rate: 1.0 },
            ]
          : [],
      };
    }

    // Stage 2: Compare AES vs Fast SHA-256 vs Argon2id
    if (stage === 2) {
      const isSafe = pickedStorage === 'argon2';
      return {
        entities: {
          portal: block(-15, -2, {
            color: isSafe ? 'green' : 'blue',
            glyph: 'server',
            label: ['Campus', 'Portal'],
            sub:
              pickedStorage === 'none'
                ? 'pick method'
                : pickedStorage === 'aes'
                  ? 'AES (reversible!)'
                  : pickedStorage === 'sha256'
                    ? 'SHA-256 (fast!)'
                    : 'Argon2id (64 MB) ✓',
          }),
          database: db(0, -2, {
            label: ['students_auth', 'Table'],
            sub: isSafe ? 'memory-hard KDF ✓' : pickedStorage === 'none' ? 'choose below' : 'vulnerable!',
            tags: [
              {
                text:
                  pickedStorage === 'aes'
                    ? 'Key stolen from .env!'
                    : pickedStorage === 'sha256'
                      ? '12B guesses/sec GPU!'
                      : pickedStorage === 'argon2'
                        ? '~120 guesses/sec ✓'
                        : 'Test 3 options',
                tone: isSafe ? 'green' : pickedStorage === 'none' ? 'paper' : 'red',
                icon: isSafe ? 'shield' : 'alert',
              },
            ],
          }),
          hacker: hackerNode(
            15,
            -2,
            pickedStorage === 'sha256' ? '8× RTX GPU Rig' : 'Breach Attacker',
            [
              {
                text:
                  pickedStorage === 'none'
                    ? 'Ready to test…'
                    : pickedStorage === 'aes'
                      ? 'Decrypted all rows!'
                      : pickedStorage === 'sha256'
                        ? 'Cracked in 4 mins!'
                        : 'GPU Stalled (>140 yrs) ✓',
                tone: isSafe ? 'green' : pickedStorage === 'none' ? 'amber' : 'red',
                icon: isSafe ? 'ban' : 'flame',
              },
            ],
            { heat: pickedStorage === 'aes' || pickedStorage === 'sha256' ? 0.9 : 0 }
          ),
        },
        links: {
          pd: link('portal', 'database', ['portal', 'database'], {
            label: pickedStorage === 'none' ? 'choose' : pickedStorage,
            labelTone: isSafe ? 'green' : pickedStorage === 'none' ? 'blue' : 'red',
          }),
          dh: link('database', 'hacker', ['database', 'hacker'], {
            style: 'dashed',
            label: isSafe ? 'GPU throttled' : 'cracking!',
            labelTone: isSafe ? 'green' : 'red',
            fail: isSafe ? 0.9 : 0,
          }),
        },
        flows:
          pickedStorage === 'none'
            ? []
            : [
                { route: ['pd'], kind: isSafe ? 'msg' : 'write', rate: 0.75 },
                { route: ['dh'], kind: isSafe ? 'slow' : 'poison', rate: isSafe ? 0.25 : 1.0 },
              ],
      };
    }

    // Stage 3: Manual per-user salting
    if (stage === 3) {
      return {
        entities: {
          alice: block(-15, -5, {
            color: saltsValid ? 'green' : 'blue',
            glyph: 'user',
            label: ['Alice'],
            sub: cleanAliceSalt ? `salt: ${cleanAliceSalt}` : 'no salt yet',
          }),
          sam: block(-15, 5, {
            color: saltsValid ? 'green' : 'blue',
            glyph: 'user',
            label: ['Sam'],
            sub: cleanSamSalt ? `salt: ${cleanSamSalt}` : 'no salt yet',
          }),
          database: db(2, 0, {
            label: ['students_auth', 'Table'],
            sub: saltsValid ? 'Alice ≠ Sam ✓' : 'IDENTICAL HASHES!',
            tags: [
              {
                text: saltsValid ? 'Unique per user ✓' : 'Rainbow Table risk!',
                tone: saltsValid ? 'green' : 'red',
                icon: saltsValid ? 'sparkles' : 'alert',
              },
            ],
          }),
          preview: panel({ x: 15, y: 0 }, 'LIVE DB ROWS', [
            `Alice: ${(saltsValid ? aliceSaltedHash : unsaltedHash).slice(0, 14)}…`,
            `Sam:   ${(saltsValid ? samSaltedHash : unsaltedHash).slice(0, 14)}…`,
            `Match? ${saltsValid ? 'NO (Safe ✓)' : 'YES (Leak!)'}`,
          ]),
        },
        links: {
          ad: link('alice', 'database', ['alice', 'database'], {
            label: cleanAliceSalt ? `+ ${cleanAliceSalt}` : 'unsalted',
            labelTone: saltsValid ? 'green' : 'red',
          }),
          sd: link('sam', 'database', ['sam', 'database'], {
            label: cleanSamSalt ? `+ ${cleanSamSalt}` : 'unsalted',
            labelTone: saltsValid ? 'green' : 'red',
          }),
        },
        flows: [
          { route: ['ad'], kind: saltsValid ? 'msg' : 'poison', rate: 0.85 },
          { route: ['sd'], kind: saltsValid ? 'ping' : 'poison', rate: 0.85 },
        ],
      };
    }

    // Stage 4: Manual Login Verification
    if (stage === 4) {
      const ok = lastLoginVerdict?.ok === true;
      const bad = lastLoginVerdict?.ok === false;
      return {
        entities: {
          alice: block(-15, -2, {
            color: ok ? 'green' : 'blue',
            glyph: 'user',
            label: ['Alice Login'],
            sub: `types "${loginTry.slice(0, 12)}"`,
          }),
          portal: block(0, -2, {
            color: ok ? 'green' : bad ? 'orange' : 'purple',
            glyph: 'server',
            label: ['Auth Server', 'Verifier'],
            sub: `salt: ${effectiveAliceSalt}`,
            tags: [
              {
                text: ok ? 'HASH MATCH → 200 OK ✓' : bad ? 'MISMATCH → 401 DENIED' : 'Recompute & Compare',
                tone: ok ? 'green' : bad ? 'red' : 'blue',
                icon: ok ? 'circleCheck' : bad ? 'ban' : 'fingerprint',
              },
            ],
          }),
          database: db(15, -2, {
            label: ['Stored Row', '(No Plaintext)'],
            sub: `salt:${effectiveAliceSalt}`,
            tags: [{ text: `hash:${fnv1aHex(`argon2:${effectiveAliceSalt}:${cleanPw}`).slice(0, 8)}…`, tone: 'green', icon: 'lock' }],
          }),
        },
        links: {
          ap: link('alice', 'portal', ['alice', 'portal'], {
            label: 'login attempt',
            labelTone: ok ? 'green' : bad ? 'red' : 'blue',
          }),
          pd: link('portal', 'database', ['portal', 'database'], {
            heads: 'both',
            label: 'fetch salt & hash',
            labelTone: 'green',
          }),
        },
        flows: [
          { route: ['ap'], kind: ok ? 'msg' : bad ? 'kill' : 'req', rate: 0.85 },
          { route: ['pd'], kind: 'write', rate: 0.7, bounce: true },
        ],
      };
    }

    // Stage 5: Stop the DB Breach!
    const isSecured = breachStep === 'secured';
    const ramReady = breachStep === 'ram-walled' || isSecured;
    const rainbowDead = breachStep !== 'stolen';
    return {
      entities: {
        database: db(-14, -2, {
          label: ['Stolen SQL', 'Backup'],
          sub: ramReady ? 'Argon2id + 64 MB' : rainbowDead ? 'Salted hashes' : 'Breached dump',
          tags: [
            {
              text: isSecured ? 'Unbreakable ✓' : ramReady ? 'Ready for GPU Test' : 'Under Attack!',
              tone: isSecured ? 'green' : ramReady ? 'blue' : 'amber',
              icon: isSecured ? 'shield' : 'database',
            },
          ],
        }),
        wall: block(0, -2, {
          color: ramReady ? 'green' : 'slab',
          glyph: 'shield',
          label: ['Salt + RAM', 'Defense Wall'],
          sub: ramReady ? '64 MB / guess' : rainbowDead ? 'Rainbow dead ✓' : 'needs hardening',
        }),
        gpu: hackerNode(
          14,
          -2,
          '8× RTX GPU Rig',
          [
            {
              text: isSecured ? '120 H/s · >140 Yrs ✓' : rainbowDead ? 'Rainbow Failed!' : 'Attacking DB…',
              tone: isSecured ? 'green' : 'red',
              icon: isSecured ? 'ban' : 'flame',
            },
          ],
          { heat: isSecured ? 0 : 0.85 }
        ),
      },
      links: {
        dw: link('database', 'wall', ['database', 'wall'], {
          label: ramReady ? 'Argon2id + Salt' : 'salted rows',
          labelTone: ramReady ? 'green' : 'amber',
        }),
        wg: link('wall', 'gpu', ['wall', 'gpu'], {
          style: 'dashed',
          label: isSecured ? 'stalled >140 yrs ✓' : 'cracking attempts',
          labelTone: isSecured ? 'green' : 'red',
          fail: isSecured ? 0.95 : 0,
        }),
      },
      flows: [
        { route: ['dw'], kind: ramReady ? 'msg' : 'write', rate: 0.75 },
        { route: ['wg'], kind: isSecured ? 'slow' : 'poison', rate: isSecured ? 0.25 : 1.0 },
      ],
    };
  }, [
    stage,
    cleanPw,
    stage1Dumped,
    pickedStorage,
    cleanAliceSalt,
    cleanSamSalt,
    saltsValid,
    aliceSaltedHash,
    samSaltedHash,
    unsaltedHash,
    loginTry,
    effectiveAliceSalt,
    lastLoginVerdict,
    breachStep,
  ]);

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
    if (!stageEngineRef.current) return;
    stageEngineRef.current.frame([liveScene]);
    stageEngineRef.current.goTo(liveScene);
  }, [liveScene]);

  useEffect(() => {
    stageEngineRef.current?.retheme();
  }, [theme]);

  const tutorState = useMemo(() => {
    const getHint = (): string => {
      if (stage === 1) return 'Pick a password preset like "campus2026" and click "Save & Simulate SQL Dump" to see why plaintext databases are catastrophic.';
      if (stage === 2) return 'AES can be reversed if the app key leaks, and SHA-256 is way too fast on GPUs. Pick "Argon2id (Memory-Hard)"!';
      if (stage === 3) return 'Type two DIFFERENT short salts (like "7f1a" for Alice and "e92b" for Sam) — or just click "Generate Unique Random Salts"!';
      if (stage === 4) return `First click "Verify Login" with "${loginTry}" (wrong password) to see 401 Denied, then type "${cleanPw}" and click "Verify Login" to see a 200 OK match!`;
      if (breachStep === 'stolen') return 'Step 1: Click "Test Rainbow Table Attack" to watch unique salts defeat pre-computed hash tables.';
      if (breachStep === 'rainbow-dead') return 'Step 2: Click "Turn ON 64 MB Argon2id Memory Wall" to starve parallel GPUs of VRAM.';
      if (breachStep === 'ram-walled') return 'Step 3: Click "Launch 8× RTX GPU Rig" to confirm offline cracking stalls past 140 years!';
      return 'You mastered Scenario 02! Try another password or move on to Scenario 03 above.';
    };

    if (tutorOverride) {
      return { mood: tutorOverride.mood, message: tutorOverride.msg, key: tutorOverride.key, hint: getHint() };
    }

    if (stage === 1) {
      return stage1Dumped
        ? {
            mood: 'warn' as const,
            message: `Yikes! The SQL dump handed the hacker "${cleanPw}" in plain text for both Alice and Sam! Let’s click Next to pick a one-way password algorithm.`,
            key: `s2-1-dumped-${cleanPw}`,
            hint: getHint(),
          }
        : {
            mood: 'neutral' as const,
            message: `Welcome to the Campus Portal! Both Alice and Sam picked the same password. Click "Save & Simulate SQL Dump" to see what happens when passwords are stored raw.`,
            key: 's2-1-start',
            hint: getHint(),
          };
    }

    if (stage === 2) {
      if (pickedStorage === 'aes') {
        return {
          mood: 'warn' as const,
          message: `Careful! AES encryption is two-way — when the hacker breached the web server, they grabbed the AES key from .env and decrypted every student password! Try a one-way hash.`,
          key: 's2-2-aes',
          hint: getHint(),
        };
      }
      if (pickedStorage === 'sha256') {
        return {
          mood: 'warn' as const,
          message: `SHA-256 is one-way, BUT it’s built for speed! An 8-GPU cracking rig tests 12 billion SHA-256 guesses every second and cracks "${cleanPw}" in minutes. Try Argon2id!`,
          key: 's2-2-sha',
          hint: getHint(),
        };
      }
      if (pickedStorage === 'argon2') {
        return {
          mood: 'happy' as const,
          message: `Spot on! Argon2id forces 64 MB of RAM per guess, throttling GPU rigs from billions down to ~120 guesses per second. Next, let’s fix identical passwords using Salts!`,
          key: 's2-2-argon',
          hint: getHint(),
        };
      }
      return {
        mood: 'neutral' as const,
        message: `Test all 3 password storage methods below to discover which one survives both a server breach AND an 8-GPU cracking rig!`,
        key: 's2-2-start',
        hint: getHint(),
      };
    }

    if (stage === 3) {
      if (saltsValid) {
        return {
          mood: 'happy' as const,
          message: `Look at those two rows now — Alice and Sam have completely different digests even with the same password! Click Next to act as the Login Server yourself.`,
          key: `s2-3-ok-${cleanAliceSalt}-${cleanSamSalt}`,
          hint: getHint(),
        };
      }
      if (cleanAliceSalt && cleanAliceSalt.toLowerCase() === cleanSamSalt.toLowerCase()) {
        return {
          mood: 'warn' as const,
          message: `Aha! You gave Alice and Sam the SAME salt ("${cleanAliceSalt}"), so their hashes STILL match! Each user needs a different random salt.`,
          key: `s2-3-same-${cleanAliceSalt}`,
          hint: getHint(),
        };
      }
      return {
        mood: 'neutral' as const,
        message: `Right now Alice and Sam both have the exact same hash (${unsaltedHash.slice(0, 10)}…). Give Alice and Sam two DIFFERENT salts below and watch their hashes instantly diverge!`,
        key: 's2-3-start',
        hint: getHint(),
      };
    }

    if (stage === 4) {
      if (testedRightLogin) {
        return {
          mood: 'happy' as const,
          message: `Brilliant! You just verified a password login the real way — by fetching Alice’s salt and recomputing the hash! Click Next to defend against a full database theft.`,
          key: 's2-4-done',
          hint: getHint(),
        };
      }
      return {
        mood: 'neutral' as const,
        message: `Since the server NEVER stores raw passwords, how does login work? Try clicking "Verify Login" with a wrong password first, then try Alice’s real password "${cleanPw}"!`,
        key: 's2-4-start',
        hint: getHint(),
      };
    }

    if (breachStep === 'stolen') {
      return {
        mood: 'warn' as const,
        message: `Emergency! A hacker just stole the entire students_auth table. Follow the 3 quick defense steps below to watch Rainbow Tables and GPUs both fail!`,
        key: 's2-5-stolen',
        hint: getHint(),
      };
    }
    if (breachStep === 'rainbow-dead') {
      return {
        mood: 'neutral' as const,
        message: `Rainbow Tables failed completely because every row has a unique salt! Now turn on the 64 MB Argon2id Memory Wall before the hacker boots their GPU rig.`,
        key: 's2-5-rainbow',
        hint: getHint(),
      };
    }
    if (breachStep === 'ram-walled') {
      return {
        mood: 'neutral' as const,
        message: `Memory Wall is active! Click "Launch 8× RTX GPU Rig" to test how long it would take the hacker to crack your hardened database.`,
        key: 's2-5-ram',
        hint: getHint(),
      };
    }
    return {
      mood: 'happy' as const,
      message: `Mission complete! Even after stealing the whole database, the hacker’s Rainbow Tables failed and their 8-GPU rig stalled past 140 years. You mastered Scenario 02!`,
      key: 's2-5-done',
      hint: getHint(),
    };
  }, [
    tutorOverride,
    stage,
    stage1Dumped,
    cleanPw,
    pickedStorage,
    saltsValid,
    cleanAliceSalt,
    cleanSamSalt,
    unsaltedHash,
    loginTry,
    testedRightLogin,
    breachStep,
  ]);

  return (
    <div className="guided-layout">
      <section className="guided-main">
        <nav className="journey-bar" aria-label="Scenario 02 guided workout steps">
          {STAGE_META.map((s) => {
            const isCurrent = stage === s.num;
            const isDone = s.num < maxUnlocked || (s.num === 5 && breachStep === 'secured');
            const isLocked = s.num > maxUnlocked;
            return (
              <button
                key={s.num}
                type="button"
                className={`journey-step ${isCurrent ? 'is-current' : ''} ${isDone ? 'is-done' : ''}`}
                disabled={isLocked}
                onClick={() => {
                  setStage(s.num);
                  setTutorOverride(null);
                }}
              >
                <span className="journey-step__dot">
                  {isDone ? (
                    <span dangerouslySetInnerHTML={{ __html: renderIcon('check', { size: 11, stroke: 3 }) }} />
                  ) : (
                    s.num
                  )}
                </span>
                <span className="journey-step__label">{s.label}</span>
              </button>
            );
          })}
        </nav>

        <section className="card stage guided-stage">
          <div className="stage__hud">
            <div className="chip" data-level="none">
              <span className="chip__label">Step</span>
              <span className="chip__value">
                {stage} / 5 · {STAGE_META[stage - 1].label}
              </span>
            </div>
            <div className="chip" data-level="none">
              <span className="chip__label">Password</span>
              <span className="chip__value">{cleanPw}</span>
            </div>
            <div
              className="chip"
              data-level={
                stage === 1
                  ? stage1Dumped
                    ? 'bad'
                    : 'none'
                  : stage === 2
                    ? pickedStorage === 'argon2'
                      ? 'good'
                      : pickedStorage === 'none'
                        ? 'none'
                        : 'bad'
                    : stage === 3
                      ? saltsValid
                        ? 'good'
                        : 'bad'
                      : stage === 4
                        ? testedRightLogin
                          ? 'good'
                          : 'warn'
                        : breachStep === 'secured'
                          ? 'good'
                          : 'bad'
              }
            >
              <span className="chip__label">DB Safety</span>
              <span className="chip__value">
                {stage === 1
                  ? stage1Dumped
                    ? 'Plaintext Exposed!'
                    : 'Ready'
                  : stage === 2
                    ? pickedStorage === 'argon2'
                      ? 'Argon2id Chosen ✓'
                      : pickedStorage === 'none'
                        ? 'Compare 3 Options'
                        : 'Cracked!'
                    : stage === 3
                      ? saltsValid
                        ? 'Alice ≠ Sam ✓'
                        : 'Duplicate Hashes!'
                      : stage === 4
                        ? testedRightLogin
                          ? 'Verified ✓'
                          : 'Test Login'
                        : breachStep === 'secured'
                          ? '> 140 Yrs Safe ✓'
                          : 'Under Breach!'}
              </span>
            </div>
          </div>
          <div className="stage__canvas" ref={canvasHostRef} />
        </section>

        <section className="card step-workout-card">
          {stage === 1 && (
            <div className="step-pane">
              <div className="step-pane__head">
                <span className="eyebrow">Stage 1 of 5 · Why Plaintext Fails</span>
                <h2>Save Alice &amp; Sam’s Passwords — Then Watch the SQL Breach</h2>
                <p>
                  Choose a password that both Alice and Sam use on the Campus Portal, then simulate a SQL Injection dump.
                </p>
              </div>
              <div className="word-picker-row">
                <div className="preset-row">
                  {PRESET_PASSWORDS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`preset-btn ${cleanPw === p ? 'is-on' : ''}`}
                      onClick={() => {
                        setSharedPw(p);
                        setStage1Dumped(false);
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <input
                  className="lab-input"
                  style={{ maxWidth: 180 }}
                  value={sharedPw}
                  onChange={(e) => {
                    setSharedPw(e.target.value);
                    setStage1Dumped(false);
                  }}
                  placeholder="Type a password…"
                  aria-label="Campus portal password"
                />
              </div>
              <div className="step-cta-row">
                <button type="button" className="btn-pop" onClick={() => setStage1Dumped(true)}>
                  Save &amp; Simulate SQL Dump
                </button>
                {stage1Dumped && (
                  <button type="button" className="btn-pop btn-next" onClick={() => unlockAndGo(2)}>
                    Next: Pick the Right Storage Method →
                  </button>
                )}
              </div>
            </div>
          )}

          {stage === 2 && (
            <div className="step-pane">
              <div className="step-pane__head">
                <span className="eyebrow">Stage 2 of 5 · Pick the Right Password Algorithm</span>
                <h2>Compare 3 Ways to Store Passwords</h2>
                <p>Click each option to see how it holds up when the server and database are breached.</p>
              </div>
              <div className="algo-choice-grid">
                <button
                  type="button"
                  className={`algo-card ${pickedStorage === 'aes' ? 'is-bad' : ''}`}
                  onClick={() => {
                    setPickedStorage('aes');
                    setTutorOverride(null);
                  }}
                >
                  <div className="algo-card__title">AES Encryption</div>
                  <div className="algo-card__desc">Locks passwords with the web server’s secret key (two-way).</div>
                  {pickedStorage === 'aes' && (
                    <div className="algo-card__verdict is-bad">Failed · Key leaked from server!</div>
                  )}
                </button>
                <button
                  type="button"
                  className={`algo-card ${pickedStorage === 'sha256' ? 'is-warn' : ''}`}
                  onClick={() => {
                    setPickedStorage('sha256');
                    setTutorOverride(null);
                  }}
                >
                  <div className="algo-card__title">Fast SHA-256 Hash</div>
                  <div className="algo-card__desc">One-way hash built to run at blazing speed on files.</div>
                  {pickedStorage === 'sha256' && (
                    <div className="algo-card__verdict is-bad">Too Fast · GPUs test 12B/sec!</div>
                  )}
                </button>
                <button
                  type="button"
                  className={`algo-card ${pickedStorage === 'argon2' ? 'is-good' : ''}`}
                  onClick={() => {
                    setPickedStorage('argon2');
                    setTutorOverride(null);
                  }}
                >
                  <div className="algo-card__title">Argon2id (Memory-Hard)</div>
                  <div className="algo-card__desc">One-way KDF requiring 64 MB RAM per password guess.</div>
                  {pickedStorage === 'argon2' && (
                    <div className="algo-card__verdict is-good">Protected ✓ · GPUs stalled!</div>
                  )}
                </button>
              </div>
              {pickedStorage === 'argon2' && (
                <div className="step-cta-row">
                  <button type="button" className="btn-pop btn-next" onClick={() => unlockAndGo(3)}>
                    Next: Add Unique Salts by Hand →
                  </button>
                </div>
              )}
            </div>
          )}

          {stage === 3 && (
            <div className="step-pane">
              <div className="step-pane__head">
                <span className="eyebrow">Stage 3 of 5 · Hands-On Salting Workout</span>
                <h2>Separate Alice &amp; Sam’s Identical Password (“{cleanPw}”)</h2>
                <p>
                  Give Alice and Sam two <b>different</b> random salts (at least 3 characters each) and watch their stored hashes completely diverge!
                </p>
              </div>
              <div className="workout-row-2">
                <div className="lab-field">
                  <label htmlFor="s2-alice-salt">Alice’s Unique Salt</label>
                  <input
                    id="s2-alice-salt"
                    className="lab-input"
                    value={aliceSalt}
                    onChange={(e) => {
                      setAliceSalt(e.target.value);
                      setTutorOverride(null);
                    }}
                    placeholder="e.g. 7f1a9c"
                  />
                  <div className="lab-meta">
                    Stored hash: <b>{(saltsValid ? aliceSaltedHash : unsaltedHash).slice(0, 16)}…</b>
                  </div>
                </div>
                <div className="lab-field">
                  <label htmlFor="s2-sam-salt">Sam’s Unique Salt</label>
                  <input
                    id="s2-sam-salt"
                    className="lab-input"
                    value={samSalt}
                    onChange={(e) => {
                      setSamSalt(e.target.value);
                      setTutorOverride(null);
                    }}
                    placeholder="e.g. e92b4d"
                  />
                  <div className="lab-meta">
                    Stored hash: <b>{(saltsValid ? samSaltedHash : unsaltedHash).slice(0, 16)}…</b>
                  </div>
                </div>
              </div>
              <div className="step-cta-row">
                <button type="button" className="btn-ghost" onClick={rollRandomSalts}>
                  Generate Unique Random Salts
                </button>
                {saltsValid && (
                  <button type="button" className="btn-pop btn-next" onClick={() => unlockAndGo(4)}>
                    Next: Verify Alice’s Login as Server →
                  </button>
                )}
              </div>
            </div>
          )}

          {stage === 4 && (
            <div className="step-pane">
              <div className="step-pane__head">
                <span className="eyebrow">Stage 4 of 5 · Be the Login Server</span>
                <h2>Verify Alice’s Login Without Ever Storing Plaintext</h2>
                <p>
                  Alice’s stored salt is <b>{effectiveAliceSalt}</b>. Test a wrong password first, then enter <b>“{cleanPw}”</b> to watch the server recompute and match the hash!
                </p>
              </div>
              <div className="lab-inline">
                <input
                  className="lab-input"
                  value={loginTry}
                  onChange={(e) => setLoginTry(e.target.value)}
                  placeholder="Type password attempt…"
                  aria-label="Login password attempt"
                />
                <button type="button" className="btn-pop" onClick={handleTestLogin}>
                  Verify Login
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setLoginTry(cleanPw)}
                >
                  Fill Real Password
                </button>
              </div>
              {lastLoginVerdict && (
                <div className={`workout-result ${lastLoginVerdict.ok ? 'is-good' : 'is-bad'}`}>
                  <strong>
                    {lastLoginVerdict.ok
                      ? '200 OK · Hash Match! Alice is logged in ✓'
                      : '401 Denied · Hash Mismatch! Wrong password rejected ✕'}
                  </strong>
                  <code>Recomputed: Argon2id({effectiveAliceSalt} + "{loginTry}") = {lastLoginVerdict.hash}</code>
                </div>
              )}
              {testedRightLogin && (
                <div className="step-cta-row">
                  <button type="button" className="btn-pop btn-next" onClick={() => unlockAndGo(5)}>
                    Next: Stop the Stolen DB Crack →
                  </button>
                </div>
              )}
            </div>
          )}

          {stage === 5 && (
            <div className="step-pane">
              <div className="step-pane__head">
                <span className="eyebrow">Stage 5 of 5 · Emergency DB Breach Defense</span>
                <h2>
                  {breachStep === 'secured'
                    ? 'Breach Contained! Rainbow Tables & 8× GPU Rig Defeated ✓'
                    : 'The Hacker Stole Your Database — Stop Offline Cracking!'}
                </h2>
                <p>
                  {breachStep === 'secured'
                    ? 'Even with the entire SQL dump in hand, unique salts destroyed Rainbow Tables and Argon2id’s 64 MB RAM wall slowed their 8-GPU rig past 140 years.'
                    : 'Run through the 3 live defense checks below to prove your database survives a total SQL breach.'}
                </p>
              </div>

              <div className="step-cta-row">
                {breachStep === 'stolen' && (
                  <button
                    type="button"
                    className="btn-pop"
                    onClick={() => {
                      setBreachStep('rainbow-dead');
                      setTutorOverride(null);
                    }}
                  >
                    1. Test Rainbow Table Attack
                  </button>
                )}
                {breachStep === 'rainbow-dead' && (
                  <button
                    type="button"
                    className="btn-pop"
                    onClick={() => {
                      setBreachStep('ram-walled');
                      setTutorOverride(null);
                    }}
                  >
                    2. Turn ON 64 MB Argon2id Memory Wall
                  </button>
                )}
                {breachStep === 'ram-walled' && (
                  <button
                    type="button"
                    className="btn-pop"
                    onClick={() => {
                      setBreachStep('secured');
                      setTutorOverride(null);
                    }}
                  >
                    3. Launch 8× RTX GPU Rig Now!
                  </button>
                )}
                {breachStep === 'secured' && (
                  <div className="victory-summary">
                    <div className="victory-list">
                      <span>✓ Spotted Plaintext SQL Risk</span>
                      <span>✓ Chose Argon2id over AES &amp; SHA-256</span>
                      <span>✓ Salted Alice &amp; Sam Uniquely</span>
                      <span>✓ Verified Login by Recomputing Hash</span>
                      <span>✓ Stalled Rainbow Tables &amp; 8× GPUs</span>
                    </div>
                    <button type="button" className="btn-ghost" onClick={handleRestartAll}>
                      Practice Scenario 02 Again
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </section>

      <aside className="rail">
        <TutorGuideCard
          stageLabel={`Scenario 02 · Stage ${stage}/5`}
          mood={tutorState.mood}
          message={tutorState.message}
          hintText={tutorState.hint}
          voiceTriggerKey={tutorState.key}
        />

        <section className="card guided-progress-card">
          <div className="eyebrow">Your Scenario 02 Mastery</div>
          <ul className="workout-tasks">
            <li className={stage1Dumped ? 'is-done' : ''}>
              <span className={`check ${stage1Dumped ? 'is-on' : ''}`} dangerouslySetInnerHTML={{ __html: renderIcon('check', { size: 11, stroke: 3 }) }} />
              <span>Saw why plaintext DB leaks every password</span>
            </li>
            <li className={pickedStorage === 'argon2' ? 'is-done' : ''}>
              <span className={`check ${pickedStorage === 'argon2' ? 'is-on' : ''}`} dangerouslySetInnerHTML={{ __html: renderIcon('check', { size: 11, stroke: 3 }) }} />
              <span>Chose Argon2id over reversible AES &amp; fast SHA-256</span>
            </li>
            <li className={saltsValid ? 'is-done' : ''}>
              <span className={`check ${saltsValid ? 'is-on' : ''}`} dangerouslySetInnerHTML={{ __html: renderIcon('check', { size: 11, stroke: 3 }) }} />
              <span>Salted Alice &amp; Sam so identical passwords diverge</span>
            </li>
            <li className={testedRightLogin || testedWrongLogin ? 'is-done' : ''}>
              <span className={`check ${testedRightLogin ? 'is-on' : ''}`} dangerouslySetInnerHTML={{ __html: renderIcon('check', { size: 11, stroke: 3 }) }} />
              <span>Verified a live login using Alice’s stored salt</span>
            </li>
            <li className={breachStep === 'secured' ? 'is-done' : ''}>
              <span className={`check ${breachStep === 'secured' ? 'is-on' : ''}`} dangerouslySetInnerHTML={{ __html: renderIcon('check', { size: 11, stroke: 3 }) }} />
              <span>Defeated Rainbow Tables &amp; 8× GPU cracking</span>
            </li>
          </ul>
        </section>
      </aside>
    </div>
  );
}
