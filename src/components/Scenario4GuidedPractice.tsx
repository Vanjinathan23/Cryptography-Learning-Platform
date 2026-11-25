import { useEffect, useMemo, useRef, useState } from 'react';
import {
  block,
  device,
  hackerNode,
  keyVault,
  link,
  panel,
} from '../data/cryptoHelpers';
import { computeAvalancheDiff, fnv1aHex, sha256Hex } from '../data/labData';
import { StageEngine, StageScene, renderIcon } from '../engine/isoEngine';
import TutorGuideCard from './TutorGuideCard';

type StageNum = 1 | 2 | 3 | 4 | 5;

const OFFICIAL_PAYLOAD = 'pkg=AppInstaller_v4.2; safe=true; bin=0x4f9a';
const TROJAN_PAYLOAD = 'pkg=AppInstaller_v4.2; safe=evil; bin=0x4f9a';

const STAGE_META: Array<{ num: StageNum; label: string }> = [
  { num: 1, label: 'Trigger Avalanche' },
  { num: 2, label: 'Pick Verification' },
  { num: 3, label: 'Sign in HSM' },
  { num: 4, label: 'Verify on OS' },
  { num: 5, label: 'Block Trojan' },
];

export default function Scenario4GuidedPractice({
  theme,
  onSecured,
}: {
  theme: 'light' | 'dark';
  onSecured?: () => void;
}) {
  const [stage, setStage] = useState<StageNum>(1);
  const [maxUnlocked, setMaxUnlocked] = useState<StageNum>(1);

  // Stage 1: Real SHA-256 Avalanche demo
  const [editedPayload, setEditedPayload] = useState(OFFICIAL_PAYLOAD);
  const [officialHash, setOfficialHash] = useState(
    '8f2c9a14e7b035d6412a8c90f3e1b72094d5c6e183a27f05c812e940b6d31a7f'
  );
  const [editedHash, setEditedHash] = useState(
    '8f2c9a14e7b035d6412a8c90f3e1b72094d5c6e183a27f05c812e940b6d31a7f'
  );

  // Stage 2: Pick Verification Strategy
  const [verifyChoice, setVerifyChoice] = useState<'none' | 'mirror-hash' | 'ed25519' | null>(null);

  // Stage 3: Sign as App Publisher inside Offline HSM (3 tactile steps)
  const [hsmStep, setHsmStep] = useState<0 | 1 | 2 | 3>(0);

  // Stage 4: Verify on User's OS Updater (2 tactile steps)
  const [osStep, setOsStep] = useState<0 | 1 | 2>(0);

  // Stage 5: Live Trojan CDN Hijack Rescue
  const [trojanStep, setTrojanStep] = useState<
    'ready' | 'injected' | 'forge-failed' | 'blocked'
  >('ready');

  const [tutorOverride, setTutorOverride] = useState<{
    mood: 'neutral' | 'happy' | 'warn' | 'hint';
    msg: string;
    key: string;
  } | null>(null);

  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const stageEngineRef = useRef<StageEngine | null>(null);

  // Compute real Web Crypto SHA-256 whenever payload edits
  useEffect(() => {
    let alive = true;
    sha256Hex(OFFICIAL_PAYLOAD).then((h) => {
      if (alive) setOfficialHash(h);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    sha256Hex(editedPayload).then((h) => {
      if (alive) setEditedHash(h);
    });
    return () => {
      alive = false;
    };
  }, [editedPayload]);

  const avalanche = useMemo(
    () => computeAvalancheDiff(officialHash, editedHash),
    [officialHash, editedHash]
  );
  const stage1Triggered = editedPayload !== OFFICIAL_PAYLOAD && avalanche.changedBits > 0;

  const officialSig = useMemo(
    () => `ed25519:${fnv1aHex('hsm-priv:' + officialHash).slice(0, 14)}`,
    [officialHash]
  );
  const trojanHashShort = useMemo(
    () => fnv1aHex(TROJAN_PAYLOAD).slice(0, 14),
    []
  );

  useEffect(() => {
    if (trojanStep === 'blocked') {
      onSecured?.();
    }
  }, [trojanStep, onSecured]);

  const unlockAndGo = (next: StageNum) => {
    setMaxUnlocked((prev) => (next > prev ? next : prev));
    setStage(next);
    setTutorOverride(null);
  };

  const handleFlipOneChar = () => {
    const next =
      editedPayload === OFFICIAL_PAYLOAD
        ? 'pkg=AppInstaller_v4.2; safe=True; bin=0x4f9a'
        : OFFICIAL_PAYLOAD;
    setEditedPayload(next);
    if (next !== OFFICIAL_PAYLOAD) {
      setTutorOverride({
        mood: 'happy',
        msg: 'Whoa — look at that! Changing just a single lowercase "t" to uppercase "T" scrambled roughly HALF of all 256 bits of the SHA-256 fingerprint! That is the Avalanche Effect.',
        key: 's4-s1-avalanche',
      });
    }
  };

  const handlePickVerify = (choice: 'none' | 'mirror-hash' | 'ed25519') => {
    setVerifyChoice(choice);
    if (choice === 'none') {
      setTutorOverride({
        mood: 'warn',
        msg: 'With no verification at all, any hacked download mirror can swap in a Trojan and millions of laptops will silently install it!',
        key: 's4-s2-none',
      });
    } else if (choice === 'mirror-hash') {
      setTutorOverride({
        mood: 'warn',
        msg: 'Careful! A plain SHA-256 hash detects accidental corruption, NOT a hacker! If the attacker hacks the CDN mirror, they just overwrite SHA256SUMS.txt with their Trojan’s hash too!',
        key: 's4-s2-mirror',
      });
    } else {
      setTutorOverride({
        mood: 'happy',
        msg: 'Brilliant choice! An Ed25519 Digital Signature signed inside an Offline Hardware Security Module (HSM) proves BOTH integrity and publisher identity — hackers on the CDN cannot forge it!',
        key: 's4-s2-ed25519',
      });
    }
  };

  const handleHsmAction = (nextStep: 1 | 2 | 3) => {
    setHsmStep(nextStep);
    if (nextStep === 1) {
      setTutorOverride({
        mood: 'neutral',
        msg: `Step 1 done! Hashing the 400 MB installer shrank it down to a compact 256-bit digest (${officialHash.slice(0, 12)}…) so signing takes less than 1 millisecond.`,
        key: 's4-s3-1',
      });
    } else if (nextStep === 2) {
      setTutorOverride({
        mood: 'neutral',
        msg: 'Smart move! The Private Signing Key stays air-gapped inside the Offline HSM — it NEVER touches the public CDN mirror server.',
        key: 's4-s3-2',
      });
    } else {
      setTutorOverride({
        mood: 'happy',
        msg: `Signed! The HSM stamped unforgeable signature ${officialSig} onto your installer’s hash. Only your publisher private key could ever create this math proof!`,
        key: 's4-s3-3',
      });
    }
  };

  const handleOsAction = (nextStep: 1 | 2) => {
    setOsStep(nextStep);
    if (nextStep === 1) {
      setTutorOverride({
        mood: 'neutral',
        msg: `Downloaded! Your laptop computed local SHA-256 ${officialHash.slice(0, 12)}… from the file bytes it just received. Now check the publisher’s signature!`,
        key: 's4-s4-1',
      });
    } else {
      setTutorOverride({
        mood: 'happy',
        msg: 'Verified! Using the publisher’s built-in Public Key, your OS proved the downloaded file matches the exact installer signed by the Offline HSM. Safe to install!',
        key: 's4-s4-2',
      });
    }
  };

  const handleTrojanAction = (nextStep: 'injected' | 'forge-failed' | 'blocked') => {
    setTrojanStep(nextStep);
    if (nextStep === 'injected') {
      setTutorOverride({
        mood: 'warn',
        msg: 'Alert! A hacker broke into the public CDN mirror and swapped 1 byte inside AppInstaller_v4.2.pkg! Look how the file hash immediately exploded to a completely different digest!',
        key: 's4-s5-inj',
      });
    } else if (nextStep === 'forge-failed') {
      setTutorOverride({
        mood: 'happy',
        msg: 'The hacker tried to forge a matching signature σ — and FAILED! Because the Private Signing Key lives inside your Offline HSM, not on the CDN, they cannot generate a valid signature!',
        key: 's4-s5-fail',
      });
    } else {
      setTutorOverride({
        mood: 'happy',
        msg: 'Mission Mastered! Your OS Updater compared the Trojan’s hash against the HSM signature using the built-in Public Key, saw the mismatch immediately, and quarantined the malware before a single line ran!',
        key: 's4-s5-ok',
      });
    }
  };

  const handleResetAll = () => {
    setStage(1);
    setMaxUnlocked(1);
    setEditedPayload(OFFICIAL_PAYLOAD);
    setVerifyChoice(null);
    setHsmStep(0);
    setOsStep(0);
    setTrojanStep('ready');
    setTutorOverride(null);
  };

  const tutorContent = useMemo(() => {
    if (stage === 1) {
      return {
        mood: stage1Triggered ? ('happy' as const) : ('neutral' as const),
        msg: stage1Triggered
          ? `See how ${avalanche.changedBits} of 256 bits (${avalanche.percentChanged}%) flipped from a tiny edit? That Avalanche Effect guarantees malware can never sneak past a hash check unnoticed.`
          : 'Welcome to Scenario 4! A software update is going out to 500,000 laptops. First, edit just ONE character in the installer payload below (or press the quick button) to see how SHA-256 reacts.',
        hint: 'Click "Change 1 Character" or edit any single letter inside the installer payload box to watch ~50% of the 256 bits flip instantly.',
        key: `s4-stage1-${stage1Triggered}`,
      };
    }
    if (stage === 2) {
      return {
        mood:
          verifyChoice === 'ed25519'
            ? ('happy' as const)
            : verifyChoice
              ? ('warn' as const)
              : ('neutral' as const),
        msg: 'Now think like a hacker: if you break into the public CDN download mirror, can you defeat a plain SHA-256 checksum file hosted on that SAME server? Pick the defense that actually stops a hacked mirror!',
        hint: 'A hash file on the same CDN can be overwritten by the hacker. Choose Ed25519 Digital Signature + Offline HSM so the signing key is never on the CDN.',
        key: `s4-stage2-${verifyChoice || 'none'}`,
      };
    }
    if (stage === 3) {
      return {
        mood: hsmStep === 3 ? ('happy' as const) : ('neutral' as const),
        msg: 'Time to act as the App Publisher! Complete the 3 release steps below: hash your official installer, lock the private signing key inside an Offline HSM, and stamp signature σ.',
        hint: 'Click buttons 1 → 2 → 3 in order. Remember: we hash the big file first, then sign that tiny hash inside the air-gapped HSM.',
        key: `s4-stage3-${hsmStep}`,
      };
    }
    if (stage === 4) {
      return {
        mood: osStep === 2 ? ('happy' as const) : ('neutral' as const),
        msg: 'Now switch seats to the User’s Laptop OS Updater! Your OS already ships with the Publisher’s Public Key built in. Re-hash the downloaded file and verify signature σ.',
        hint: 'Click Step 1 to compute the local SHA-256 of the downloaded package, then Step 2 to verify signature σ with the Public Key.',
        key: `s4-stage4-${osStep}`,
      };
    }
    return {
      mood:
        trojanStep === 'blocked'
          ? ('happy' as const)
          : trojanStep === 'injected'
            ? ('warn' as const)
            : ('neutral' as const),
      msg: 'Final test! A hacker just broke into the public CDN mirror. Walk through the live attack: inject the Trojan, watch the hacker fail to forge σ, and let your OS Updater quarantine it!',
      hint: 'Click steps 1 → 2 → 3 in order to see how Offline HSM + Ed25519 catches a 1-byte supply-chain Trojan automatically.',
      key: `s4-stage5-${trojanStep}`,
    };
  }, [stage, stage1Triggered, avalanche.changedBits, avalanche.percentChanged, verifyChoice, hsmStep, osStep, trojanStep]);

  const activeTutor = tutorOverride ?? tutorContent;

  const scene = useMemo((): StageScene => {
    if (stage === 1) {
      return {
        entities: {
          pkg: block(-13, -1, {
            color: stage1Triggered ? 'orange' : 'blue',
            glyph: 'package',
            label: ['Installer', 'v4.2.pkg'],
            sub: stage1Triggered ? '1 char edited' : 'official file',
            tags: [
              {
                text: stage1Triggered ? 'Payload Modified!' : 'Original Bytes',
                tone: stage1Triggered ? 'amber' : 'blue',
                icon: 'package',
              },
            ],
          }),
          hasher: block(0, -1, {
            color: 'purple',
            glyph: 'hash',
            label: ['SHA-256', 'Fingerprint'],
            sub: `${avalanche.changedBits}/256 bits`,
            tags: [
              {
                text: stage1Triggered ? `${avalanche.percentChanged}% Flipped!` : 'Deterministic',
                tone: stage1Triggered ? 'green' : 'blue',
                icon: 'zap',
              },
            ],
          }),
          digest: panel({ x: 13, y: -1 }, 'SHA-256 OUTPUT', [
            `Orig: ${officialHash.slice(0, 12)}…`,
            `Edit: ${editedHash.slice(0, 12)}…`,
            stage1Triggered ? `Diff: ${avalanche.changedBits} bits` : 'Edit 1 char!',
          ]),
        },
        links: {
          ph: link('pkg', 'hasher', ['pkg', 'hasher'], {
            label: stage1Triggered ? '1-char edit' : 'installer bytes',
            labelTone: stage1Triggered ? 'amber' : 'green',
          }),
          hd: link('hasher', 'digest', ['hasher', 'digest'], {
            label: stage1Triggered ? `${avalanche.percentChanged}% avalanche` : '256-bit hash',
            labelTone: 'green',
          }),
        },
        flows: [
          { route: ['ph', 'hd'], kind: stage1Triggered ? 'write' : 'msg', rate: 0.9 },
        ],
      };
    }

    if (stage === 2) {
      const ok = verifyChoice === 'ed25519';
      const mirror = verifyChoice === 'mirror-hash';
      return {
        entities: {
          cdn: block(-13, -1, {
            color: ok ? 'blue' : 'orange',
            glyph: 'server',
            label: ['Public CDN', 'Mirror'],
            sub: ok ? 'untrusted pipe' : mirror ? 'hosts hash too!' : 'no checks',
            tags: [
              {
                text: ok ? 'Cannot Forge σ ✓' : mirror ? 'Hacker Rewrote Hash!' : 'Open to Trojan!',
                tone: ok ? 'green' : 'red',
                icon: ok ? 'shield' : 'alert',
              },
            ],
          }),
          hacker: hackerNode(
            0,
            9,
            'CDN Hacker',
            [
              {
                text: ok ? 'No HSM Key!' : mirror ? 'Overwrote SHA256SUMS!' : 'Swapped Installer!',
                tone: ok ? 'green' : 'red',
                icon: ok ? 'ban' : 'bug',
              },
            ],
            { heat: ok ? 0 : 0.85 }
          ),
          laptop: device(13, -1, {
            form: 'laptop',
            label: 'User OS',
            tags: [
              {
                text: ok ? 'Verifies Ed25519 ✓' : 'Fooled by Mirror!',
                tone: ok ? 'green' : 'red',
                icon: ok ? 'check' : 'alert',
              },
            ],
          }),
        },
        links: {
          cl: link('cdn', 'laptop', ['cdn', 'laptop'], {
            label: ok ? 'pkg + HSM sig σ' : mirror ? 'fake pkg + fake hash' : 'raw installer',
            labelTone: ok ? 'green' : 'red',
          }),
          hc: link('hacker', 'cdn', ['hacker', 'cdn'], {
            style: 'dashed',
            label: ok ? 'tamper caught' : 'mirror compromised',
            labelTone: ok ? 'green' : 'red',
          }),
        },
        flows: [
          { route: ['cl'], kind: ok ? 'empty' : 'poison', rate: 0.9 },
          { route: ['hc'], kind: ok ? 'kill' : 'poison', rate: 0.85 },
        ],
      };
    }

    if (stage === 3) {
      const hashed = hsmStep >= 1;
      const locked = hsmStep >= 2;
      const signed = hsmStep >= 3;
      return {
        entities: {
          build: block(-14, -1, {
            color: hashed ? 'green' : 'blue',
            glyph: 'package',
            label: ['Official', 'Build v4.2'],
            sub: hashed ? `${officialHash.slice(0, 8)}…` : '400 MB raw',
            tags: [
              {
                text: hashed ? 'SHA-256 Ready ✓' : 'Step 1: Hash File',
                tone: hashed ? 'green' : 'amber',
                icon: 'hash',
              },
            ],
          }),
          hsm: keyVault(0, -1, 'Offline HSM', [
            {
              text: signed ? 'Signed σ ✓' : locked ? 'Air-Gapped Key ✓' : 'Key Not Locked',
              tone: locked ? 'green' : 'amber',
              icon: 'key',
            },
          ]),
          release: block(14, -1, {
            color: signed ? 'green' : 'slab',
            glyph: 'packageCheck',
            label: ['Signed', 'Release'],
            sub: signed ? officialSig.slice(0, 14) : 'waiting for σ',
            tags: [
              {
                text: signed ? 'Ready for CDN ✓' : 'Unsigned',
                tone: signed ? 'green' : 'amber',
                icon: signed ? 'circleCheck' : 'clock',
              },
            ],
          }),
        },
        links: {
          bh: link('build', 'hsm', ['build', 'hsm'], {
            label: hashed ? 'send 256-bit hash' : 'not hashed yet',
            labelTone: hashed ? 'green' : 'amber',
          }),
          hr: link('hsm', 'release', ['hsm', 'release'], {
            label: signed ? 'attach sig σ' : 'pending sign',
            labelTone: signed ? 'green' : 'amber',
          }),
        },
        flows: [
          { route: ['bh'], kind: hashed ? 'msg' : 'slow', rate: 0.85 },
          { route: ['hr'], kind: signed ? 'msg' : 'slow', rate: signed ? 0.95 : 0.25 },
        ],
      };
    }

    if (stage === 4) {
      const hashed = osStep >= 1;
      const verified = osStep >= 2;
      return {
        entities: {
          cdn: block(-14, -1, {
            color: 'blue',
            glyph: 'server',
            label: ['CDN Mirror', 'Download'],
            sub: 'pkg + sig σ',
            tags: [
              {
                text: 'Delivered to OS',
                tone: 'blue',
                icon: 'package',
              },
            ],
          }),
          os: device(0, -1, {
            form: 'laptop',
            label: 'OS Updater',
            tags: [
              {
                text: verified ? 'Signature Valid ✓' : hashed ? 'Hash Ready' : 'Step 1: Re-Hash',
                tone: verified ? 'green' : 'amber',
                icon: verified ? 'circleCheck' : 'hash',
              },
            ],
          }),
          pubkey: block(14, -1, {
            color: verified ? 'green' : 'purple',
            glyph: 'fileKey',
            label: ['Built-in', 'Public Key'],
            sub: 'publisher root',
            tags: [
              {
                text: verified ? 'Math Matches σ ✓' : 'Ready to Verify',
                tone: verified ? 'green' : 'blue',
                icon: 'key',
              },
            ],
          }),
        },
        links: {
          co: link('cdn', 'os', ['cdn', 'os'], {
            label: 'pkg + sig σ',
            labelTone: 'green',
          }),
          op: link('os', 'pubkey', ['os', 'pubkey'], {
            label: verified ? 'Verify(Pub, hash, σ) = TRUE' : 'verify with PubKey',
            labelTone: verified ? 'green' : 'amber',
          }),
        },
        flows: [
          { route: ['co'], kind: 'msg', rate: 0.85 },
          { route: ['op'], kind: verified ? 'msg' : 'slow', rate: verified ? 0.95 : 0.3 },
        ],
      };
    }

    // Stage 5: Live Trojan CDN Hijack Rescue
    const injected = trojanStep !== 'ready';
    const blocked = trojanStep === 'blocked';
    const forgeFailed = trojanStep === 'forge-failed' || blocked;
    return {
      entities: {
        cdn: block(-14, -1, {
          color: injected ? 'orange' : 'blue',
          glyph: 'server',
          label: ['Hacked CDN', 'Mirror'],
          sub: injected ? `Trojan (${trojanHashShort.slice(0, 6)}…)` : 'waiting…',
          tags: [
            {
              text: injected ? '1-Byte Trojan!' : 'Clean Mirror',
              tone: injected ? 'red' : 'blue',
              icon: injected ? 'bug' : 'package',
            },
          ],
        }),
        hacker: hackerNode(
          0,
          9,
          'Supply-Chain Attacker',
          [
            {
              text: blocked
                ? 'Trojan Quarantined ✓'
                : forgeFailed
                  ? 'Forge Failed (No HSM)!'
                  : injected
                    ? 'Swapped 1 Byte!'
                    : 'Ready to Hijack',
              tone: blocked ? 'green' : forgeFailed ? 'amber' : 'red',
              icon: blocked ? 'ban' : 'skull',
            },
          ],
          { heat: blocked ? 0 : 0.9 }
        ),
        hsm: keyVault(0, -1, 'Offline HSM', [
          {
            text: forgeFailed ? 'Key Unreachable ✓' : 'Air-Gapped Safe',
            tone: 'green',
            icon: 'lock',
          },
        ]),
        os: device(14, -1, {
          form: 'laptop',
          label: 'User OS',
          tags: [
            {
              text: blocked ? 'SIG MISMATCH · BLOCKED ✓' : injected ? 'Verifying Download…' : 'Protected Mode',
              tone: blocked ? 'green' : injected ? 'amber' : 'blue',
              icon: blocked ? 'shield' : 'alert',
            },
          ],
        }),
      },
      links: {
        hc: link('hacker', 'cdn', ['hacker', 'cdn'], {
          style: 'dashed',
          label: injected ? 'injected Trojan' : 'mirror access',
          labelTone: blocked ? 'green' : 'red',
        }),
        hh: link('hacker', 'hsm', ['hacker', 'hsm'], {
          style: 'dashed',
          label: forgeFailed ? 'blocked (air-gapped!)' : 'cannot reach key',
          labelTone: 'green',
          fail: forgeFailed ? 0.95 : 0.4,
        }),
        co: link('cdn', 'os', ['cdn', 'os'], {
          label: blocked ? 'quarantined before run!' : injected ? 'Trojan + old sig σ' : 'update channel',
          labelTone: blocked ? 'green' : injected ? 'red' : 'amber',
          fail: blocked ? 0.95 : 0,
        }),
      },
      flows: [
        { route: ['co'], kind: blocked ? 'kill' : injected ? 'poison' : 'msg', rate: 0.95 },
        { route: ['hc'], kind: blocked ? 'kill' : 'poison', rate: 0.85 },
      ],
    };
  }, [stage, stage1Triggered, avalanche.changedBits, avalanche.percentChanged, officialHash, editedHash, verifyChoice, hsmStep, officialSig, osStep, trojanStep, trojanHashShort]);

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
    { label: 'Trigger SHA-256 Avalanche', done: maxUnlocked > 1 || stage1Triggered },
    { label: 'Pick Ed25519 + Offline HSM', done: maxUnlocked > 2 || verifyChoice === 'ed25519' },
    { label: 'Hash & sign inside HSM', done: maxUnlocked > 3 || hsmStep === 3 },
    { label: 'Verify signature on user OS', done: maxUnlocked > 4 || osStep === 2 },
    { label: 'Quarantine 1-byte CDN Trojan', done: trojanStep === 'blocked' },
  ];

  const completedCount = checklist.filter((c) => c.done).length;

  return (
    <div className="guided-layout">
      <div className="guided-main">
        {/* 5-Stage Journey Stepper */}
        <nav className="journey-bar card" aria-label="Scenario 4 Guided Steps">
          {STAGE_META.map((s) => {
            const isCurrent = stage === s.num;
            const isUnlocked = s.num <= maxUnlocked;
            const isDone =
              s.num < stage ||
              (s.num === 1 && stage1Triggered) ||
              (s.num === 2 && verifyChoice === 'ed25519') ||
              (s.num === 3 && hsmStep === 3) ||
              (s.num === 4 && osStep === 2) ||
              (s.num === 5 && trojanStep === 'blocked');

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
            <div className="chip" data-level={trojanStep === 'blocked' ? 'good' : stage >= 3 ? 'warn' : 'bad'}>
              <span className="chip__label">Update Pipeline</span>
              <span className="chip__value">
                {trojanStep === 'blocked'
                  ? 'Ed25519 + HSM Verified ✓'
                  : stage === 1
                    ? `${avalanche.changedBits} / 256 Bits Flipped`
                    : stage === 2
                      ? verifyChoice === 'ed25519'
                        ? 'Ed25519 Selected ✓'
                        : 'Mirror Vulnerable'
                      : stage === 3
                        ? `HSM Step ${hsmStep}/3`
                        : stage === 4
                          ? `OS Check ${osStep}/2`
                          : 'CDN Mirror Hijacked'}
              </span>
            </div>
          </div>
          <div className="stage__canvas" ref={canvasHostRef} />
        </section>

        {/* Active Stage Focused Workout Card */}
        <section className="card step-workout-card">
          {/* ==================== STAGE 1: TRIGGER AVALANCHE ==================== */}
          {stage === 1 && (
            <div className="step-body">
              <div className="step-head">
                <span className="eyebrow">Step 1 of 5 · See Why 1 Byte Breaks the Fingerprint</span>
                <h2>Edit 1 character in the installer and watch SHA-256 explode</h2>
                <p className="step-desc">
                  Every software installer has a unique 256-bit SHA-256 fingerprint. Change even a single letter below to trigger the <b>Avalanche Effect</b>.
                </p>
              </div>

              <div className="workout-row">
                <label className="workout-field" style={{ flex: '1 1 300px' }}>
                  <span>Installer Payload (Edit 1 character!)</span>
                  <input
                    type="text"
                    className="lab-input"
                    value={editedPayload}
                    onChange={(e) => setEditedPayload(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="btn-pop"
                  onClick={handleFlipOneChar}
                  style={{ alignSelf: 'flex-end', height: 40 }}
                >
                  {stage1Triggered ? 'Restore Official Bytes' : 'Change 1 Character (t → T)'}
                </button>
              </div>

              <div className="wire-preview">
                <span className="wire-preview__label">Official SHA-256</span>
                <code className="wire-preview__code">{officialHash.slice(0, 44)}…</code>
              </div>
              <div className="wire-preview">
                <span className="wire-preview__label">Your Edited SHA-256</span>
                <code className={`wire-preview__code ${stage1Triggered ? 'is-bad' : ''}`}>
                  {editedHash.slice(0, 44)}…
                </code>
              </div>

              {/* Compact 64-bit visual flip strip */}
              <div className="hash-diff-strip" aria-label="First 64 bits comparison">
                {avalanche.diffMask.slice(0, 64).map((changed, idx) => (
                  <span
                    key={idx}
                    className={`hash-bit-cell ${changed ? 'is-flipped' : ''}`}
                    title={`Bit ${idx}: ${changed ? 'Flipped!' : 'Same'}`}
                  />
                ))}
              </div>

              {stage1Triggered && (
                <div className="step-feedback is-good">
                  <b>
                    Avalanche Effect triggered! {avalanche.changedBits} out of 256 bits ({avalanche.percentChanged}%) flipped from a tiny edit!
                  </b>
                  <p>
                    A hash instantly spots any modified byte — but wait: what if a hacker controls the CDN mirror and replaces the hash file too?
                  </p>
                </div>
              )}

              <div className="step-actions">
                <span />
                <button
                  type="button"
                  className="btn-pop"
                  disabled={!stage1Triggered}
                  onClick={() => unlockAndGo(2)}
                >
                  Next: Pick Verification Method →
                </button>
              </div>
            </div>
          )}

          {/* ==================== STAGE 2: PICK VERIFICATION ==================== */}
          {stage === 2 && (
            <div className="step-body">
              <div className="step-head">
                <span className="eyebrow">Step 2 of 5 · Choose the Right Defense</span>
                <h2>How do we stop a hacker who controls the download mirror?</h2>
                <p className="step-desc">
                  Assume the attacker already hacked the public CDN mirror server. Test each option to see which one survives!
                </p>
              </div>

              <div className="algo-choice-grid">
                <button
                  type="button"
                  className={`algo-choice ${verifyChoice === 'none' ? 'is-wrong' : ''}`}
                  onClick={() => handlePickVerify('none')}
                >
                  <div className="algo-choice__top">
                    <b>No Verification</b>
                    <span className="algo-tag is-bad">Zero Check</span>
                  </div>
                  <p>Download and execute whatever binary arrives from the CDN mirror.</p>
                </button>

                <button
                  type="button"
                  className={`algo-choice ${verifyChoice === 'mirror-hash' ? 'is-wrong' : ''}`}
                  onClick={() => handlePickVerify('mirror-hash')}
                >
                  <div className="algo-choice__top">
                    <b>SHA-256 on Same Mirror</b>
                    <span className="algo-tag is-warn">Easily Rewritten</span>
                  </div>
                  <p>Post SHA256SUMS.txt right next to the installer on the same public CDN.</p>
                </button>

                <button
                  type="button"
                  className={`algo-choice ${verifyChoice === 'ed25519' ? 'is-right' : ''}`}
                  onClick={() => handlePickVerify('ed25519')}
                >
                  <div className="algo-choice__top">
                    <b>Ed25519 + Offline HSM</b>
                    <span className="algo-tag is-good">Unforgeable</span>
                  </div>
                  <p>Sign the SHA-256 hash inside an air-gapped HSM; verify on user devices with Public Key.</p>
                </button>
              </div>

              {verifyChoice && (
                <div className={`step-feedback ${verifyChoice === 'ed25519' ? 'is-good' : 'is-bad'}`}>
                  {verifyChoice === 'none' && (
                    <>
                      <b>Defeated immediately!</b>
                      <p>Without a check, any compromised download mirror silently infects every updating user.</p>
                    </>
                  )}
                  {verifyChoice === 'mirror-hash' && (
                    <>
                      <b>Nice trap — mirror hashes fail against mirror hackers!</b>
                      <p>If an attacker owns the CDN mirror, they upload their Trojan AND overwrite SHA256SUMS.txt so the checksum still “matches”!</p>
                    </>
                  )}
                  {verifyChoice === 'ed25519' && (
                    <>
                      <b>Correct! Asymmetric Signatures separate who can SIGN from who can VERIFY!</b>
                      <p>The Private Key stays offline in the HSM. Even if the CDN is 100% hacked, the attacker cannot forge a valid signature σ.</p>
                    </>
                  )}
                </div>
              )}

              <div className="step-actions">
                <button type="button" className="btn-ghost" onClick={() => setStage(1)}>
                  ← Back
                </button>
                <button
                  type="button"
                  className="btn-pop"
                  disabled={verifyChoice !== 'ed25519'}
                  onClick={() => unlockAndGo(3)}
                >
                  Next: Sign Release in HSM →
                </button>
              </div>
            </div>
          )}

          {/* ==================== STAGE 3: SIGN IN HSM ==================== */}
          {stage === 3 && (
            <div className="step-body">
              <div className="step-head">
                <span className="eyebrow">Step 3 of 5 · Hands-On Publisher Signing</span>
                <h2>Sign AppInstaller_v4.2.pkg inside your Offline HSM</h2>
                <p className="step-desc">
                  You are the release engineer. Follow the 3 cryptographic steps to produce an unforgeable signature before uploading to the CDN.
                </p>
              </div>

              <div className="rescue-wire">
                <div className={`rescue-byte ${hsmStep >= 1 ? 'is-good' : ''}`}>
                  <small>1. Hash</small>
                  <b>{hsmStep >= 1 ? `${officialHash.slice(0, 6)}…` : 'Pending'}</b>
                </div>
                <div className={`rescue-byte ${hsmStep >= 2 ? 'is-good' : ''}`}>
                  <small>2. Priv Key</small>
                  <b>{hsmStep >= 2 ? 'Offline HSM' : 'Exposed'}</b>
                </div>
                <div className={`rescue-byte ${hsmStep >= 3 ? 'is-good' : ''}`}>
                  <small>3. Algorithm</small>
                  <b>{hsmStep >= 3 ? 'Ed25519' : 'Idle'}</b>
                </div>
                <div className={`rescue-byte ${hsmStep >= 3 ? 'is-good' : ''}`}>
                  <small>CDN Trust</small>
                  <b>{hsmStep >= 3 ? 'Not Needed' : 'High Risk'}</b>
                </div>
                <div className={`rescue-byte ${hsmStep >= 3 ? 'is-tag' : 'is-missing'}`}>
                  <small>Signature σ</small>
                  <b>{hsmStep >= 3 ? officialSig.slice(0, 14) : 'NONE'}</b>
                </div>
              </div>

              <div className="step-actions">
                <button type="button" className="btn-ghost" onClick={() => setStage(2)}>
                  ← Back
                </button>

                {hsmStep === 0 && (
                  <button type="button" className="btn-pop" onClick={() => handleHsmAction(1)}>
                    1. Hash Official 400 MB Installer
                  </button>
                )}
                {hsmStep === 1 && (
                  <button type="button" className="btn-pop" onClick={() => handleHsmAction(2)}>
                    2. Lock Private Key Inside Offline HSM
                  </button>
                )}
                {hsmStep === 2 && (
                  <button type="button" className="btn-pop" onClick={() => handleHsmAction(3)}>
                    3. Stamp Unforgeable Signature σ
                  </button>
                )}
                {hsmStep === 3 && (
                  <button type="button" className="btn-pop" onClick={() => unlockAndGo(4)}>
                    Next: Verify on User’s OS →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ==================== STAGE 4: VERIFY ON USER OS ==================== */}
          {stage === 4 && (
            <div className="step-body">
              <div className="step-head">
                <span className="eyebrow">Step 4 of 5 · Hands-On OS Verification</span>
                <h2>Verify the downloaded update with the Publisher’s Public Key</h2>
                <p className="step-desc">
                  Now act as the user’s laptop OS. Your OS does <b>not</b> have the private key — only the built-in Public Key. Run the 2-step check!
                </p>
              </div>

              <div className="wire-preview">
                <span className="wire-preview__label">Downloaded Bundle</span>
                <code className="wire-preview__code">
                  AppInstaller_v4.2.pkg + σ ({officialSig})
                </code>
              </div>

              {osStep >= 1 && (
                <div className="wire-preview">
                  <span className="wire-preview__label">Local Re-Computed Hash</span>
                  <code className="wire-preview__code">{officialHash.slice(0, 42)}…</code>
                </div>
              )}

              {osStep === 2 && (
                <div className="step-feedback is-good">
                  <b>Verify(PublicKey, LocalHash, σ) = TRUE ✓</b>
                  <p>
                    The math confirms two guarantees at once: not a single bit changed in transit, AND it was signed by the real publisher’s Offline HSM!
                  </p>
                </div>
              )}

              <div className="step-actions">
                <button type="button" className="btn-ghost" onClick={() => setStage(3)}>
                  ← Back
                </button>
                {osStep === 0 && (
                  <button type="button" className="btn-pop" onClick={() => handleOsAction(1)}>
                    1. Re-Hash Downloaded Installer
                  </button>
                )}
                {osStep === 1 && (
                  <button type="button" className="btn-pop" onClick={() => handleOsAction(2)}>
                    2. Check Signature σ with Public Key
                  </button>
                )}
                {osStep === 2 && (
                  <button type="button" className="btn-pop" onClick={() => unlockAndGo(5)}>
                    Next: Defeat a Hacked CDN Trojan! →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ==================== STAGE 5: BLOCK TROJAN ON HACKED CDN ==================== */}
          {stage === 5 && (
            <div className="step-body">
              <div className="step-head">
                <span className="eyebrow">Step 5 of 5 · Live Supply-Chain Attack Drill</span>
                <h2>Stop a 1-Byte Trojan injected into the hacked CDN Mirror!</h2>
                <p className="step-desc">
                  Watch what happens when an attacker hacks your public CDN mirror and tries to sneak malware past your Ed25519 + Offline HSM defense.
                </p>
              </div>

              <div className="rescue-wire">
                <div className={`rescue-byte ${trojanStep === 'ready' ? '' : 'is-bad'}`}>
                  <small>CDN File</small>
                  <b>{trojanStep === 'ready' ? 'Official' : 'TROJAN!'}</b>
                </div>
                <div className={`rescue-byte ${trojanStep === 'ready' ? '' : 'is-bad'}`}>
                  <small>New Hash</small>
                  <b>{trojanStep === 'ready' ? `${officialHash.slice(0, 6)}…` : `${trojanHashShort.slice(0, 6)}…`}</b>
                </div>
                <div className={`rescue-byte ${trojanStep === 'forge-failed' || trojanStep === 'blocked' ? 'is-good' : ''}`}>
                  <small>HSM Key</small>
                  <b>{trojanStep === 'forge-failed' || trojanStep === 'blocked' ? 'Air-Gapped' : 'Offline'}</b>
                </div>
                <div className={`rescue-byte ${trojanStep === 'blocked' ? 'is-good' : 'is-missing'}`}>
                  <small>Sig Check</small>
                  <b>{trojanStep === 'blocked' ? 'MISMATCH!' : 'Pending'}</b>
                </div>
                <div className={`rescue-byte ${trojanStep === 'blocked' ? 'is-tag' : ''}`}>
                  <small>OS Action</small>
                  <b>{trojanStep === 'blocked' ? 'QUARANTINED ✓' : 'Waiting'}</b>
                </div>
              </div>

              {trojanStep === 'injected' && (
                <div className="step-feedback is-bad">
                  <b>Trojan injected on CDN mirror!</b>
                  <p>
                    The hacker modified the installer (`safe=true` → `safe=evil`), changing its SHA-256 hash to <code>{trojanHashShort}…</code>. Now watch them try to forge signature σ!
                  </p>
                </div>
              )}

              {trojanStep === 'forge-failed' && (
                <div className="step-feedback is-good">
                  <b>Forgery FAILED — Private Key is locked in the Offline HSM!</b>
                  <p>
                    The hacker only has the public CDN server, so they are stuck shipping the old signature σ from the clean file. Run the OS Updater now!
                  </p>
                </div>
              )}

              {trojanStep === 'blocked' && (
                <div className="victory-summary">
                  <div className="victory-list">
                    <span>✓ SHA-256 Avalanche triggered</span>
                    <span>✓ Air-gapped HSM protected Private Key</span>
                    <span>✓ Ed25519 Signature σ verified by Public Key</span>
                    <span>✓ Supply-chain Trojan quarantined at 0 executions!</span>
                  </div>
                </div>
              )}

              <div className="step-actions">
                <button type="button" className="btn-ghost" onClick={() => setStage(4)}>
                  ← Back
                </button>
                {trojanStep === 'ready' && (
                  <button
                    type="button"
                    className="btn-pop"
                    onClick={() => handleTrojanAction('injected')}
                  >
                    1. Inject 1-Byte Trojan on Hacked CDN
                  </button>
                )}
                {trojanStep === 'injected' && (
                  <button
                    type="button"
                    className="btn-pop"
                    onClick={() => handleTrojanAction('forge-failed')}
                  >
                    2. Hacker Tries to Forge Signature σ
                  </button>
                )}
                {trojanStep === 'forge-failed' && (
                  <button
                    type="button"
                    className="btn-pop"
                    onClick={() => handleTrojanAction('blocked')}
                  >
                    3. Run OS Pre-Install Verifier
                  </button>
                )}
                {trojanStep === 'blocked' && (
                  <button type="button" className="btn-ghost" onClick={handleResetAll}>
                    Replay Scenario 04
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
