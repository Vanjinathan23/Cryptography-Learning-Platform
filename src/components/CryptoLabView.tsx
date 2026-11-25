import { useEffect, useMemo, useRef, useState } from 'react';
import {
  LAB_ALGORITHMS,
  LabAlgorithmId,
  PIXEL_PRESETS,
  PatternPresetId,
  computeAvalancheDiff,
  encryptVisualGrid,
  fnv1aHex,
  runCryptoSimulation,
  runDhSimulation,
  sha256Hex,
} from '../data/labData';
import {
  aliceDev,
  block,
  bobDev,
  cipherBlock,
  db,
  device,
  hackerNode,
  keyVault,
  link,
  panel,
  routerNode,
} from '../data/cryptoHelpers';
import { StageEngine, StageScene, renderIcon } from '../engine/isoEngine';

type WorkbenchId = 'cipher' | 'hash' | 'dh' | 'ecb';

const WORKBENCHES: Array<{ id: WorkbenchId; label: string; icon: string; subtitle: string }> = [
  {
    id: 'cipher',
    label: 'Cipher & Wire',
    icon: 'lock',
    subtitle: 'Encrypt live messages, click wire bytes to flip bits, and watch Bob’s GCM auth tag react.',
  },
  {
    id: 'hash',
    label: 'Hash & Avalanche',
    icon: 'fingerprint',
    subtitle: 'Edit a single character to inspect real 256-bit SHA-256 bit flips, unique salts, and GPU cost.',
  },
  {
    id: 'dh',
    label: 'Key Exchange',
    icon: 'key',
    subtitle: 'Tune Diffie-Hellman secrets live on a tapped wire and test how CA certificates block MITM.',
  },
  {
    id: 'ecb',
    label: 'ECB vs GCM Visual',
    icon: 'layers',
    subtitle: 'Paint on an 8×8 pixel scan and watch AES-ECB leak the shape while AES-GCM turns it to noise.',
  },
];

const DH_PRIMES = [23, 47, 59, 83, 107];

export default function CryptoLabView({ theme }: { theme: 'light' | 'dark' }) {
  const [workbench, setWorkbench] = useState<WorkbenchId>('cipher');

  // --- Workbench 1: Cipher & Wire ---
  const [algorithm, setAlgorithm] = useState<LabAlgorithmId>('aes-gcm');
  const [plaintext, setPlaintext] = useState('Meet at Lab 4B at 5 PM');
  const [key, setKey] = useState('alice-bob-shared-key-256');
  const [nonceCounter, setNonceCounter] = useState(1);
  const [encryptEnabled, setEncryptEnabled] = useState(true);
  const [hackerMode, setHackerMode] = useState<'none' | 'sniff' | 'tamper'>('sniff');
  const [bobWrongKey, setBobWrongKey] = useState(false);
  const [tamperedIndices, setTamperedIndices] = useState<number[]>([]);
  const [shaDigest, setShaDigest] = useState('');

  // --- Workbench 2: Hash & Avalanche ---
  const [hashInputA, setHashInputA] = useState('Pay Bob $100');
  const [hashInputB, setHashInputB] = useState('Pay Bob $101');
  const [digestA, setDigestA] = useState('');
  const [digestB, setDigestB] = useState('');
  const [saltEnabled, setSaltEnabled] = useState(true);
  const [workFactor, setWorkFactor] = useState(64); // MB RAM for Argon2id

  // --- Workbench 3: Key Exchange (Diffie-Hellman) ---
  const [dhPrime, setDhPrime] = useState(23);
  const [dhGen, setDhGen] = useState(5);
  const [alicePriv, setAlicePriv] = useState(6);
  const [bobPriv, setBobPriv] = useState(15);
  const [dhMitm, setDhMitm] = useState(false);
  const [dhCaPinned, setDhCaPinned] = useState(true);

  // --- Workbench 4: ECB vs GCM Visual ---
  const [pixelPreset, setPixelPreset] = useState<PatternPresetId>('xray');
  const [pixelGrid, setPixelGrid] = useState<number[]>(() => [...PIXEL_PRESETS.xray.grid]);
  const [blockMode, setBlockMode] = useState<'ecb' | 'gcm'>('ecb');
  const [visualNonce, setVisualNonce] = useState(1);

  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<StageEngine | null>(null);

  const algoInfo = useMemo(
    () => LAB_ALGORITHMS.find((a) => a.id === algorithm) || LAB_ALGORITHMS[0],
    [algorithm]
  );

  // Run Cipher & Wire Simulation
  const sim = useMemo(
    () =>
      runCryptoSimulation({
        algorithm,
        plaintext,
        key,
        nonceSeed: `nonce-${nonceCounter}`,
        encryptEnabled,
        hackerMode,
        bobWrongKey,
        tamperedByteIndices: tamperedIndices,
      }),
    [algorithm, plaintext, key, nonceCounter, encryptEnabled, hackerMode, bobWrongKey, tamperedIndices]
  );

  // Compute real SHA-256 digests
  useEffect(() => {
    let active = true;
    sha256Hex(plaintext || 'Meet at Lab 4B at 5 PM').then((h) => {
      if (active) setShaDigest(h);
    });
    return () => {
      active = false;
    };
  }, [plaintext]);

  useEffect(() => {
    let active = true;
    const effectiveA = saltEnabled ? `salt_7f1a:${hashInputA}` : hashInputA;
    const effectiveB = saltEnabled ? `salt_e92b:${hashInputB}` : hashInputB;
    Promise.all([sha256Hex(effectiveA), sha256Hex(effectiveB)]).then(([a, b]) => {
      if (active) {
        setDigestA(a);
        setDigestB(b);
      }
    });
    return () => {
      active = false;
    };
  }, [hashInputA, hashInputB, saltEnabled]);

  const avalanche = useMemo(() => computeAvalancheDiff(digestA, digestB), [digestA, digestB]);

  // Run DH simulation
  const dh = useMemo(
    () =>
      runDhSimulation({
        p: dhPrime,
        g: dhGen,
        a: alicePriv,
        b: bobPriv,
        mitmActive: dhMitm,
        caPinned: dhCaPinned,
      }),
    [dhPrime, dhGen, alicePriv, bobPriv, dhMitm, dhCaPinned]
  );

  // Run Visual ECB/GCM simulation
  const visualCipher = useMemo(
    () => encryptVisualGrid(pixelGrid, blockMode, visualNonce),
    [pixelGrid, blockMode, visualNonce]
  );

  // Build Live 3D StageEngine Scene for the active workbench
  const liveScene = useMemo<StageScene>(() => {
    if (workbench === 'cipher') {
      const shortMsg = (plaintext || 'Meet at Lab 4B').slice(0, 18);
      const shortCipher = sim.ciphertext.slice(0, 15) + (sim.ciphertext.length > 15 ? '…' : '');
      const hasTamper = tamperedIndices.length > 0 || hackerMode === 'tamper';

      const entities: StageScene['entities'] = {
        alice: aliceDev(-15, -2, [
          encryptEnabled
            ? { text: `${algoInfo.shortName} locked`, tone: 'green', icon: 'lock' }
            : { text: `"${shortMsg}" (PLAIN)`, tone: 'red', icon: 'eyeOff' },
        ]),
        router: encryptEnabled
          ? cipherBlock(0, -2, ['Internet', 'Router'], shortCipher, [
              {
                text: hasTamper
                  ? sim.tamperDetected
                    ? 'bit flipped on wire'
                    : 'silent tamper!'
                  : 'routes ciphertext',
                tone: hasTamper ? 'amber' : 'blue',
                icon: 'route',
              },
            ])
          : routerNode(0, -2, ['Public', 'Wi-Fi'], 'unprotected', [
              { text: 'plaintext visible!', tone: 'red', icon: 'eye' },
            ]),
        bob: bobDev(15, -2, [
          sim.tamperDetected
            ? { text: 'TAG INVALID · DROPPED', tone: 'red', icon: 'ban' }
            : bobWrongKey && encryptEnabled
              ? { text: 'wrong key · garbled', tone: 'red', icon: 'alert' }
              : hasTamper && !sim.tamperDetected
                ? { text: 'accepted CORRUPTED!', tone: 'red', icon: 'alert' }
                : { text: `decrypted: "${sim.bobOutput.slice(0, 14)}"`, tone: 'green', icon: 'check' },
        ]),
      };

      const links: StageScene['links'] = {
        ar: link('alice', 'router', ['alice', 'router'], {
          label: encryptEnabled ? `nonce:${sim.nonce.slice(0, 6)}` : 'plaintext',
          labelTone: encryptEnabled ? 'green' : 'red',
        }),
        rb: link('router', 'bob', ['router', 'bob'], {
          label: sim.tamperDetected
            ? 'tampered → dropped'
            : hasTamper
              ? 'corrupted packet!'
              : encryptEnabled
                ? 'sealed packet'
                : 'open text',
          labelTone: sim.tamperDetected || hasTamper || !encryptEnabled ? 'red' : 'green',
          fail: sim.tamperDetected ? 0.95 : 0,
        }),
      };

      const flows: StageScene['flows'] = [
        {
          route: ['ar', 'rb'],
          kind: !encryptEnabled ? 'mine' : sim.tamperDetected ? 'kill' : hasTamper ? 'poison' : 'empty',
          rate: 0.95,
        },
      ];

      if (hackerMode !== 'none' || tamperedIndices.length > 0) {
        const isMallory = hackerMode === 'tamper' || tamperedIndices.length > 0;
        entities.hacker = hackerNode(
          0,
          10,
          isMallory ? 'Mallory' : 'Eve',
          [
            !encryptEnabled
              ? { text: isMallory ? 'edited wire bytes!' : 'reads plaintext!', tone: 'red', icon: 'eye' }
              : sim.attackerCanRead
                ? { text: 'cracked Caesar key!', tone: 'red', icon: 'zap' }
                : isMallory
                  ? {
                      text: sim.tamperDetected ? 'bit-flip CAUGHT ✓' : 'corrupted Bob!',
                      tone: sim.tamperDetected ? 'green' : 'red',
                      icon: 'bug',
                    }
                  : { text: 'sees random noise', tone: 'green', icon: 'eyeOff' },
          ],
          { heat: !encryptEnabled || sim.attackerCanRead || (isMallory && !sim.tamperDetected) ? 0.85 : 0 }
        );
        links.rh = link('router', 'hacker', ['router', 'hacker'], {
          style: 'dashed',
          heads: isMallory ? 'both' : 'end',
          label: isMallory ? 'byte tampered' : 'packet sniffed',
          labelTone: !encryptEnabled || sim.attackerCanRead ? 'red' : 'amber',
        });
        flows.push({
          route: ['rh'],
          kind: !encryptEnabled || sim.attackerCanRead || isMallory ? 'poison' : 'empty',
          rate: 0.9,
          bounce: isMallory,
        });
      } else {
        entities.guard = block(0, 10, {
          color: 'green',
          glyph: 'shield',
          s: 3.2,
          h: 30,
          label: ['Wire Quiet'],
          sub: 'click bytes to tamper',
        });
      }

      return { entities, links, flows };
    }

    if (workbench === 'hash') {
      const sameRaw = hashInputA === hashInputB;
      const identicalDigest = digestA === digestB;
      const slowEnough = workFactor >= 64;
      const safe = !identicalDigest && saltEnabled && slowEnough;

      return {
        entities: {
          inA: aliceDev(-15, -4, [
            { text: `A: "${hashInputA.slice(0, 14)}"`, tone: 'paper', icon: 'file' },
          ]),
          inB: bobDev(-15, 6, [
            { text: `B: "${hashInputB.slice(0, 14)}"`, tone: 'paper', icon: 'file' },
          ]),
          hasher: block(0, 1, {
            color: safe ? 'green' : 'purple',
            glyph: 'fingerprint',
            label: ['SHA-256 /', 'Argon2id'],
            sub: saltEnabled ? `+ unique salt (${workFactor} MB)` : 'no salt!',
            tags: [
              {
                text: identicalDigest ? '0% diff (IDENTICAL!)' : `${avalanche.percentChanged}% bits flipped`,
                tone: identicalDigest ? 'red' : 'green',
                icon: 'zap',
              },
            ],
          }),
          vault: db(15, 1, {
            label: ['Digest', 'Store'],
            sub: identicalDigest ? 'collision leak!' : 'unique digests ✓',
            tags: [
              {
                text: sameRaw && !saltEnabled ? 'Rainbow risk!' : slowEnough ? 'GPU throttled ✓' : 'GPU fast!',
                tone: safe ? 'green' : 'red',
                icon: safe ? 'shield' : 'flame',
              },
            ],
          }),
        },
        links: {
          ah: link('inA', 'hasher', ['inA', 'hasher'], {
            label: saltEnabled ? '+ salt_7f1a' : 'raw input',
            labelTone: saltEnabled ? 'green' : 'amber',
          }),
          bh: link('inB', 'hasher', ['inB', 'hasher'], {
            label: saltEnabled ? '+ salt_e92b' : 'raw input',
            labelTone: saltEnabled ? 'green' : 'amber',
          }),
          hv: link('hasher', 'vault', ['hasher', 'vault'], {
            label: identicalDigest ? 'identical hashes!' : `${avalanche.changedBits}/256 bits differ`,
            labelTone: identicalDigest ? 'red' : 'green',
          }),
        },
        flows: [
          { route: ['ah', 'hv'], kind: 'msg', rate: 0.85 },
          { route: ['bh', 'hv'], kind: identicalDigest ? 'poison' : 'ping', rate: 0.85 },
        ],
      };
    }

    if (workbench === 'dh') {
      const compromised = dh.mitmActive && !dh.caPinned;
      return {
        entities: {
          alice: aliceDev(-15, -2, [
            { text: `a=${dh.a} → A=${dh.A}`, tone: 'blue', icon: 'key' },
            {
              text: `S = ${dh.aliceSecret}`,
              tone: compromised ? 'red' : 'green',
              icon: compromised ? 'alert' : 'lock',
            },
          ]),
          wire: dh.mitmActive
            ? hackerNode(
                0,
                -2,
                'Mallory MITM',
                [
                  {
                    text: compromised
                      ? `Holds S₁=${dh.mallorySecretWithAlice}, S₂=${dh.mallorySecretWithBob}`
                      : 'CA Signature Rejected!',
                    tone: compromised ? 'red' : 'green',
                    icon: compromised ? 'skull' : 'ban',
                  },
                ],
                { heat: compromised ? 0.9 : 0 }
              )
            : routerNode(0, -2, ['Public Wire', `p=${dh.p}, g=${dh.g}`], `A=${dh.A} ↔ B=${dh.B}`, [
                { text: 'Eve cannot solve S!', tone: 'green', icon: 'eyeOff' },
              ]),
          bob: bobDev(15, -2, [
            { text: `b=${dh.b} → B=${dh.B}`, tone: 'violet', icon: 'key' },
            {
              text: `S = ${dh.bobSecret}`,
              tone: compromised ? 'red' : 'green',
              icon: compromised ? 'alert' : 'lock',
            },
          ]),
          ca: block(0, 10, {
            color: dh.caPinned ? 'green' : 'slab',
            glyph: 'fileKey',
            s: 3.3,
            h: 32,
            label: ['Root CA', 'Certificate'],
            sub: dh.caPinned ? 'identity verified' : 'unverified DH',
          }),
        },
        links: {
          aw: link('alice', 'wire', ['alice', 'wire'], {
            heads: 'both',
            label: `A=${dh.A}`,
            labelTone: compromised ? 'red' : 'green',
          }),
          wb: link('wire', 'bob', ['wire', 'bob'], {
            heads: 'both',
            label: `B=${dh.B}`,
            labelTone: compromised ? 'red' : 'green',
          }),
          ac: link('alice', 'ca', ['alice', 'ca'], {
            style: 'dashed',
            label: dh.caPinned ? 'cert valid ✓' : 'no cert check',
            labelTone: dh.caPinned ? 'green' : 'red',
          }),
        },
        flows: [
          { route: ['aw', 'wb'], kind: compromised ? 'poison' : 'write', rate: 0.9, bounce: true },
          { route: ['ac'], kind: dh.caPinned ? 'msg' : 'fail', rate: 0.6 },
        ],
      };
    }

    // Workbench 4: ECB vs GCM Visual
    const isEcb = blockMode === 'ecb';
    return {
      entities: {
        scanner: device(-15, -2, {
          form: 'laptop',
          label: 'Hospital Scan',
          tags: [{ text: '64 image blocks', tone: 'blue', icon: 'layers' }],
        }),
        encryptor: cipherBlock(
          0,
          -2,
          [isEcb ? 'AES-256-ECB' : 'AES-256-GCM', 'Cipher'],
          isEcb ? 'same input → same out' : `nonce #${visualNonce} + ctr`,
          [
            {
              text: isEcb ? `${visualCipher.uniqueBlocks} repeated patterns!` : `${visualCipher.uniqueBlocks}/64 unique blocks ✓`,
              tone: isEcb ? 'red' : 'green',
              icon: isEcb ? 'alert' : 'sparkles',
            },
          ]
        ),
        bucket: db(15, -2, {
          label: ['Cloud', 'Vault'],
          sub: isEcb ? 'outline visible!' : 'pure static noise',
          tags: [
            {
              text: isEcb ? 'Shape Leaked!' : 'Pattern Destroyed ✓',
              tone: isEcb ? 'red' : 'green',
              icon: isEcb ? 'eye' : 'lock',
            },
          ],
        }),
        eve: hackerNode(
          0,
          10,
          'Eve (Bucket Leak)',
          [
            {
              text: isEcb ? 'Sees the X-Ray shape!' : 'Sees random static only',
              tone: isEcb ? 'red' : 'green',
              icon: isEcb ? 'eye' : 'eyeOff',
            },
          ],
          { heat: isEcb ? 0.85 : 0 }
        ),
        info: panel({ x: 15, y: 10 }, 'CIPHER BLOCK ENTROPY', [
          `Mode: ${isEcb ? 'AES-ECB (UNSAFE)' : 'AES-GCM (SAFE)'}`,
          `Unique Blocks: ${visualCipher.uniqueBlocks} / 64`,
          `Visual Leak: ${isEcb ? 'HIGH (Outline clear)' : 'ZERO (Uniform noise)'}`,
        ]),
      },
      links: {
        se: link('scanner', 'encryptor', ['scanner', 'encryptor'], {
          label: '8×8 pixel blocks',
          labelTone: 'blue',
        }),
        eb: link('encryptor', 'bucket', ['encryptor', 'bucket'], {
          label: isEcb ? 'repeating ciphertext' : 'randomized blocks',
          labelTone: isEcb ? 'red' : 'green',
        }),
        be: link('bucket', 'eve', ['bucket', 'eve'], {
          style: 'dashed',
          label: isEcb ? 'reads shape!' : 'noise only',
          labelTone: isEcb ? 'red' : 'green',
        }),
      },
      flows: [
        { route: ['se', 'eb'], kind: isEcb ? 'poison' : 'empty', rate: 0.9 },
        { route: ['be'], kind: isEcb ? 'poison' : 'empty', rate: 0.7 },
      ],
    };
  }, [
    workbench,
    plaintext,
    encryptEnabled,
    hackerMode,
    bobWrongKey,
    tamperedIndices,
    algoInfo.shortName,
    sim,
    hashInputA,
    hashInputB,
    digestA,
    digestB,
    saltEnabled,
    workFactor,
    avalanche.changedBits,
    avalanche.percentChanged,
    dh,
    blockMode,
    visualNonce,
    visualCipher.uniqueBlocks,
  ]);

  // Mount StageEngine once
  useEffect(() => {
    if (!canvasHostRef.current) return;
    const engine = new StageEngine(canvasHostRef.current);
    stageRef.current = engine;
    return () => {
      engine.clear();
      if (canvasHostRef.current) canvasHostRef.current.innerHTML = '';
      stageRef.current = null;
    };
  }, []);

  // Re-frame on workbench switch, update smoothly on every state change
  const prevWbRef = useRef<WorkbenchId | null>(null);
  useEffect(() => {
    if (!stageRef.current) return;
    if (prevWbRef.current !== workbench) {
      prevWbRef.current = workbench;
      stageRef.current.clear();
      stageRef.current.frame([liveScene]);
      stageRef.current.goTo(liveScene);
    } else {
      stageRef.current.frame([liveScene]);
      stageRef.current.goTo(liveScene);
    }
  }, [workbench, liveScene]);

  useEffect(() => {
    stageRef.current?.retheme();
  }, [theme]);

  // Helpers
  const handleAlgoSwitch = (id: LabAlgorithmId) => {
    setAlgorithm(id);
    setTamperedIndices([]);
    const info = LAB_ALGORITHMS.find((a) => a.id === id);
    if (info) setKey(info.defaultKey);
  };

  const toggleWireByte = (idx: number) => {
    setTamperedIndices((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const applyPresetExperiment = (preset: 'plain' | 'flip' | 'nonce' | 'wrongkey' | 'clean') => {
    if (preset === 'plain') {
      setEncryptEnabled(false);
      setHackerMode('sniff');
      setTamperedIndices([]);
      setBobWrongKey(false);
    } else if (preset === 'flip') {
      setEncryptEnabled(true);
      setAlgorithm('aes-gcm');
      setHackerMode('tamper');
      setTamperedIndices([2]);
      setBobWrongKey(false);
    } else if (preset === 'nonce') {
      setEncryptEnabled(true);
      setAlgorithm('aes-gcm');
      setNonceCounter((c) => c + 1);
      setTamperedIndices([]);
      setBobWrongKey(false);
    } else if (preset === 'wrongkey') {
      setEncryptEnabled(true);
      setAlgorithm('aes-gcm');
      setBobWrongKey(true);
      setTamperedIndices([]);
    } else {
      setEncryptEnabled(true);
      setAlgorithm('aes-gcm');
      setHackerMode('sniff');
      setTamperedIndices([]);
      setBobWrongKey(false);
    }
  };

  const togglePixelCell = (idx: number) => {
    setPixelGrid((prev) => {
      const next = [...prev];
      next[idx] = (next[idx] + 1) % 3;
      return next;
    });
  };

  const activeWbMeta = WORKBENCHES.find((w) => w.id === workbench) || WORKBENCHES[0];

  // Current reaction banner across all 4 workbenches
  const reactionBanner = useMemo(() => {
    if (workbench === 'cipher') {
      return {
        tone: sim.reactionTone,
        title: sim.reactionTitle,
        detail: sim.reactionDetail,
      };
    }
    if (workbench === 'hash') {
      const identical = digestA === digestB;
      if (identical) {
        return {
          tone: 'bad' as const,
          title: 'Identical digests! Rainbow table collision risk',
          detail:
            'Both inputs produced the exact same 256-bit digest. If two users pick the same password without unique salts, an attacker spots and cracks both accounts simultaneously.',
        };
      }
      if (!saltEnabled && hashInputA === hashInputB) {
        return {
          tone: 'bad' as const,
          title: 'Turn ON Unique Salt to separate identical passwords',
          detail: 'Without a per-user salt, identical passwords always hash identically.',
        };
      }
      return {
        tone: workFactor >= 64 ? ('good' as const) : ('warn' as const),
        title: `Avalanche Effect: ${avalanche.changedBits} of 256 bits flipped (${avalanche.percentChanged}%)`,
        detail:
          workFactor >= 64
            ? `Even a tiny input tweak scrambled ~50% of all output bits unpredictably. With ${workFactor} MB Argon2id memory cost and unique salts, offline GPU cracking is throttled to centuries.`
            : `Great avalanche (${avalanche.percentChanged}% bits flipped), but ${workFactor} MB memory cost is still fast on GPUs. Slide Argon2id Memory Cost to 64+ MB to lock down password storage.`,
      };
    }
    if (workbench === 'dh') {
      return {
        tone: dh.reactionTone,
        title: dh.reactionTitle,
        detail: dh.reactionDetail,
      };
    }
    return blockMode === 'ecb'
      ? {
          tone: 'bad' as const,
          title: 'ECB Pattern Leak! The encrypted image still reveals your drawing!',
          detail: `Only ${visualCipher.uniqueBlocks} distinct ciphertext colors appeared across 64 blocks because identical pixel blocks always encrypt to the exact same ciphertext. Switch to AES-GCM to destroy the pattern!`,
        }
      : {
          tone: 'good' as const,
          title: `AES-GCM Destroyed All Visual Patterns (${visualCipher.uniqueBlocks}/64 unique blocks)`,
          detail: `Nonce #${visualNonce} + Counter gave every single 16-byte block a fresh keystream. Even identical background pixels turned into unrelated ciphertext — click "Rotate Nonce" to watch every block re-randomize!`,
        };
  }, [
    workbench,
    sim,
    digestA,
    digestB,
    saltEnabled,
    hashInputA,
    hashInputB,
    workFactor,
    avalanche,
    dh,
    blockMode,
    visualCipher.uniqueBlocks,
    visualNonce,
  ]);

  return (
    <div className="lab-grid">
      <section className="lab-main">
        {/* Header + Clean 4-Workbench Segmented Switcher */}
        <div className="lab-head-bar">
          <div>
            <div className="crumb">
              Crypto Lab <span>/</span> {activeWbMeta.label}
            </div>
            <h1 className="title">Interactive Cryptography Studio</h1>
            <p className="subtitle">{activeWbMeta.subtitle}</p>
          </div>

          <div className="wb-tabs" role="tablist" aria-label="Cryptography lab workbenches">
            {WORKBENCHES.map((wb) => (
              <button
                key={wb.id}
                type="button"
                role="tab"
                aria-selected={workbench === wb.id}
                className={`wb-tab ${workbench === wb.id ? 'is-active' : ''}`}
                onClick={() => setWorkbench(wb.id)}
              >
                <span dangerouslySetInnerHTML={{ __html: renderIcon(wb.icon, { size: 15, stroke: 2 }) }} />
                <span>{wb.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Live 3D Isometric StageEngine Canvas */}
        <section className="card stage lab-stage">
          <div className="stage__hud">
            {workbench === 'cipher' && (
              <>
                <div className="chip" data-level={encryptEnabled && !sim.attackerCanRead ? 'good' : 'bad'}>
                  <span className="chip__label">Confidentiality</span>
                  <span className="chip__value">
                    {!encryptEnabled ? 'Exposed' : sim.attackerCanRead ? 'Cracked' : 'Protected'}
                  </span>
                </div>
                <div
                  className="chip"
                  data-level={
                    sim.tamperDetected
                      ? 'good'
                      : tamperedIndices.length > 0 || hackerMode === 'tamper'
                        ? 'bad'
                        : 'good'
                  }
                >
                  <span className="chip__label">Integrity</span>
                  <span className="chip__value">
                    {sim.tamperDetected
                      ? 'Tamper Caught ✓'
                      : tamperedIndices.length > 0 || hackerMode === 'tamper'
                        ? 'Corrupted!'
                        : 'Verified'}
                  </span>
                </div>
                <div className="chip" data-level="none">
                  <span className="chip__label">Nonce</span>
                  <span className="chip__value">{sim.nonce.slice(0, 12)}</span>
                </div>
                <div className="chip" data-level={sim.tamperDetected ? 'bad' : 'good'}>
                  <span className="chip__label">Auth Tag</span>
                  <span className="chip__value">{sim.authTag.slice(0, 12)}</span>
                </div>
              </>
            )}

            {workbench === 'hash' && (
              <>
                <div className="chip" data-level={digestA === digestB ? 'bad' : 'good'}>
                  <span className="chip__label">Bit Avalanche</span>
                  <span className="chip__value">
                    {avalanche.changedBits}/256 ({avalanche.percentChanged}%)
                  </span>
                </div>
                <div className="chip" data-level={saltEnabled ? 'good' : 'bad'}>
                  <span className="chip__label">Per-User Salt</span>
                  <span className="chip__value">{saltEnabled ? 'Unique ✓' : 'Off'}</span>
                </div>
                <div className="chip" data-level={workFactor >= 64 ? 'good' : 'warn'}>
                  <span className="chip__label">Argon2id RAM</span>
                  <span className="chip__value">{workFactor} MB</span>
                </div>
              </>
            )}

            {workbench === 'dh' && (
              <>
                <div className="chip" data-level="none">
                  <span className="chip__label">Public Wire</span>
                  <span className="chip__value">
                    A={dh.A} · B={dh.B}
                  </span>
                </div>
                <div className="chip" data-level={dh.mitmActive && !dh.caPinned ? 'bad' : 'good'}>
                  <span className="chip__label">Alice / Bob Key</span>
                  <span className="chip__value">
                    {dh.aliceSecret === dh.bobSecret ? `S = ${dh.aliceSecret} ✓` : `S₁=${dh.aliceSecret} ≠ S₂=${dh.bobSecret}`}
                  </span>
                </div>
                <div className="chip" data-level={dh.mitmActive && !dh.caPinned ? 'bad' : 'good'}>
                  <span className="chip__label">MITM Defense</span>
                  <span className="chip__value">{dh.caPinned ? 'Root CA Verified' : 'Unauthenticated'}</span>
                </div>
              </>
            )}

            {workbench === 'ecb' && (
              <>
                <div className="chip" data-level={blockMode === 'gcm' ? 'good' : 'bad'}>
                  <span className="chip__label">Cipher Mode</span>
                  <span className="chip__value">{blockMode === 'ecb' ? 'AES-ECB (Unsafe)' : 'AES-GCM (Safe)'}</span>
                </div>
                <div className="chip" data-level={blockMode === 'gcm' ? 'good' : 'bad'}>
                  <span className="chip__label">Unique Cipher Blocks</span>
                  <span className="chip__value">{visualCipher.uniqueBlocks} / 64</span>
                </div>
                <div className="chip" data-level={blockMode === 'gcm' ? 'good' : 'bad'}>
                  <span className="chip__label">Visual Pattern Leak</span>
                  <span className="chip__value">{blockMode === 'ecb' ? 'Shape Visible!' : 'Zero Leak ✓'}</span>
                </div>
              </>
            )}
          </div>
          <div className="stage__canvas" ref={canvasHostRef} />
        </section>

        {/* Live Cause-and-Effect Reaction Banner */}
        <section className={`card reaction-card is-${reactionBanner.tone}`} aria-live="polite">
          <div className="reaction-card__head">
            <span
              className="reaction-card__ico"
              dangerouslySetInnerHTML={{
                __html: renderIcon(
                  reactionBanner.tone === 'good'
                    ? 'circleCheck'
                    : reactionBanner.tone === 'warn'
                      ? 'alert'
                      : 'siren',
                  { size: 17, stroke: 2.1 }
                ),
              }}
            />
            <span className="reaction-card__kicker">
              Live Reaction · {reactionBanner.tone === 'good' ? 'Protected' : reactionBanner.tone === 'warn' ? 'Caution' : 'Security Alert'}
            </span>
          </div>
          <h2 className="reaction-card__title">{reactionBanner.title}</h2>
          <p className="reaction-card__body">{reactionBanner.detail}</p>
        </section>

        {/* Workbench-Specific Interactive Inspector Below Stage */}
        {workbench === 'cipher' && (
          <section className="card lab-output">
            <div className="lab-wire-head">
              <div>
                <div className="eyebrow">Interactive Wire Inspector — Click Any Byte to Flip 1 Bit Live</div>
                <div className="lab-meta">
                  Tampered bytes: {tamperedIndices.length === 0 ? 'None (wire intact)' : `Index [${tamperedIndices.join(', ')}] flipped`}
                </div>
              </div>
              {tamperedIndices.length > 0 && (
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    setTamperedIndices([]);
                    if (hackerMode === 'tamper') setHackerMode('sniff');
                  }}
                >
                  Repair Wire Bytes
                </button>
              )}
            </div>

            <div className="wire-bytes" role="group" aria-label="Interactive ciphertext wire bytes">
              {sim.wireBytes.slice(0, 28).map((tok) => (
                <button
                  key={tok.index}
                  type="button"
                  className={`wire-byte ${tok.tampered ? 'is-tampered' : ''}`}
                  onClick={() => toggleWireByte(tok.index)}
                  title={
                    tok.tampered
                      ? `Byte #${tok.index} flipped (${tok.originalHex} → ${tok.wireHex}). Click to restore.`
                      : `Click to flip 1 bit in wire byte #${tok.index} (${tok.originalHex})`
                  }
                >
                  <span className="wire-byte__idx">{tok.index}</span>
                  <span className="wire-byte__hex">{tok.wireHex}</span>
                </button>
              ))}
            </div>

            <div className="lab-output__row">
              <div className="lab-box">
                <div className="eyebrow">Alice’s Plaintext &amp; SHA-256</div>
                <code className="lab-code">{sim.plaintext}</code>
                <div className="lab-meta">SHA-256: {shaDigest.slice(0, 32)}…</div>
              </div>
              <div className="lab-box">
                <div className="eyebrow">Bob’s Decrypted Output</div>
                <code
                  className={`lab-code ${
                    sim.tamperDetected || bobWrongKey || (tamperedIndices.length > 0 && !sim.tamperDetected)
                      ? 'is-bad'
                      : 'is-good'
                  }`}
                >
                  {sim.bobOutput}
                </code>
                <div className="lab-meta">
                  Attacker view: {sim.attackerView}
                </div>
              </div>
            </div>
          </section>
        )}

        {workbench === 'hash' && (
          <section className="card lab-output">
            <div className="lab-wire-head">
              <div>
                <div className="eyebrow">Live 256-Bit Avalanche Matrix (Highlighted Bits Flipped Between A &amp; B)</div>
                <div className="lab-meta">
                  {avalanche.changedBits} / 256 bits changed ({avalanche.percentChanged}%) · Ideal cryptographic avalanche is ~50%
                </div>
              </div>
            </div>

            <div className="avalanche-grid" aria-label="256-bit SHA-256 difference grid">
              {avalanche.diffMask.map((changed, idx) => (
                <span
                  key={idx}
                  className={`bit-cell ${changed ? 'is-flipped' : ''}`}
                  title={`Bit #${idx}: A=${avalanche.bitsA[idx]} · B=${avalanche.bitsB[idx]}`}
                />
              ))}
            </div>

            <div className="lab-output__row">
              <div className="lab-box">
                <div className="eyebrow">Digest A {saltEnabled ? '(+ salt_7f1a)' : '(unsalted)'}</div>
                <code className="lab-code">{digestA || 'computing…'}</code>
              </div>
              <div className="lab-box">
                <div className="eyebrow">Digest B {saltEnabled ? '(+ salt_e92b)' : '(unsalted)'}</div>
                <code className={`lab-code ${digestA === digestB ? 'is-bad' : 'is-good'}`}>
                  {digestB || 'computing…'}
                </code>
              </div>
            </div>
          </section>
        )}

        {workbench === 'dh' && (
          <section className="card lab-output">
            <div className="eyebrow">Live Modular Arithmetic Proof (Public Parameters: p = {dh.p}, g = {dh.g})</div>
            <div className="dh-proof-grid">
              <div className="lab-box">
                <div className="eyebrow">1. Alice Computes Public Share</div>
                <code className="lab-code">
                  A = {dh.g}^{dh.a} mod {dh.p} = <b>{dh.A}</b>
                </code>
                <div className="lab-meta">Private secret a={dh.a} never leaves Alice’s laptop.</div>
              </div>
              <div className="lab-box">
                <div className="eyebrow">2. Bob Computes Public Share</div>
                <code className="lab-code">
                  B = {dh.g}^{dh.b} mod {dh.p} = <b>{dh.B}</b>
                </code>
                <div className="lab-meta">Private secret b={dh.b} never leaves Bob’s laptop.</div>
              </div>
              <div className="lab-box">
                <div className="eyebrow">3. Alice Derives Shared Key</div>
                <code className={`lab-code ${dh.mitmActive && !dh.caPinned ? 'is-bad' : 'is-good'}`}>
                  {dh.mitmActive && !dh.caPinned
                    ? `S₁ = M^${dh.a} mod ${dh.p} = ${dh.aliceSecret} (with Mallory!)`
                    : `S = ${dh.B}^${dh.a} mod ${dh.p} = ${dh.aliceSecret}`}
                </code>
              </div>
              <div className="lab-box">
                <div className="eyebrow">4. Bob Derives Shared Key</div>
                <code className={`lab-code ${dh.mitmActive && !dh.caPinned ? 'is-bad' : 'is-good'}`}>
                  {dh.mitmActive && !dh.caPinned
                    ? `S₂ = M^${dh.b} mod ${dh.p} = ${dh.bobSecret} (with Mallory!)`
                    : `S = ${dh.A}^${dh.b} mod ${dh.p} = ${dh.bobSecret}`}
                </code>
              </div>
            </div>
          </section>
        )}

        {workbench === 'ecb' && (
          <section className="card lab-output">
            <div className="pixel-compare">
              <div className="pixel-panel">
                <div className="eyebrow">1. Original 8×8 Scan (Click Any Cell to Paint)</div>
                <div className="pixel-grid">
                  {pixelGrid.map((val, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`px-cell px-cell--v${val}`}
                      onClick={() => togglePixelCell(idx)}
                      aria-label={`Pixel ${idx}, value ${val}`}
                    />
                  ))}
                </div>
                <div className="lab-meta">Click cells to cycle background / bone / tissue blocks</div>
              </div>

              <div className="pixel-panel">
                <div className="eyebrow">
                  2. Encrypted Output ({blockMode === 'ecb' ? 'AES-ECB — Shape Leaks!' : `AES-GCM Nonce #${visualNonce} — Pure Noise`})
                </div>
                <div className="pixel-grid">
                  {visualCipher.colors.map((bg, idx) => (
                    <div
                      key={idx}
                      className="px-cell px-cell--cipher"
                      style={{ backgroundColor: bg }}
                      title={`Block #${idx}: 0x${visualCipher.hexBlocks[idx]}`}
                    >
                      <span>{visualCipher.hexBlocks[idx].slice(0, 2)}</span>
                    </div>
                  ))}
                </div>
                <div className="lab-meta">
                  {blockMode === 'ecb'
                    ? 'Notice how identical input blocks map to identical ciphertext blocks!'
                    : 'Every block uses a unique Nonce + Counter so zero silhouette survives.'}
                </div>
              </div>
            </div>
          </section>
        )}
      </section>

      {/* RIGHT CONTROL RAIL */}
      <aside className="rail">
        <section className="card lab-controls">
          <div className="eyebrow">Hands-On Controls</div>

          {workbench === 'cipher' && (
            <>
              <div className="lab-field">
                <label>One-Click Interactive Experiments</label>
                <div className="preset-row">
                  <button type="button" className="preset-btn" onClick={() => applyPresetExperiment('plain')}>
                    Send Plaintext
                  </button>
                  <button type="button" className="preset-btn" onClick={() => applyPresetExperiment('flip')}>
                    Flip 1 Wire Bit
                  </button>
                  <button type="button" className="preset-btn" onClick={() => applyPresetExperiment('nonce')}>
                    Rotate Nonce
                  </button>
                  <button type="button" className="preset-btn" onClick={() => applyPresetExperiment('wrongkey')}>
                    Wrong Bob Key
                  </button>
                  <button type="button" className="preset-btn" onClick={() => applyPresetExperiment('clean')}>
                    Reset Secure
                  </button>
                </div>
              </div>

              <div className="lab-field">
                <label htmlFor="lab-msg">Alice’s Secret Message</label>
                <input
                  id="lab-msg"
                  className="lab-input"
                  value={plaintext}
                  onChange={(e) => {
                    setPlaintext(e.target.value);
                    setTamperedIndices([]);
                  }}
                  placeholder="Type any message…"
                />
              </div>

              <div className="lab-field">
                <label>Cryptographic Algorithm</label>
                <div className="lab-algo-list">
                  {LAB_ALGORITHMS.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      className={`lab-pill ${algorithm === a.id ? 'btn-pop is-active' : ''}`}
                      onClick={() => handleAlgoSwitch(a.id)}
                    >
                      <span>{a.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="lab-field">
                <label htmlFor="lab-key">{algoInfo.keyLabel}</label>
                <div className="lab-inline">
                  <input
                    id="lab-key"
                    className="lab-input"
                    value={key}
                    disabled={algorithm === 'rsa'}
                    onChange={(e) => setKey(e.target.value)}
                  />
                  {algorithm === 'aes-gcm' && (
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => setNonceCounter((c) => c + 1)}
                    >
                      New Nonce
                    </button>
                  )}
                </div>
              </div>

              <div className="lab-field">
                <label>Security &amp; Key Switches</label>
                <div className="lab-toggles">
                  <button
                    type="button"
                    className={`lab-toggle ${encryptEnabled ? 'is-good' : 'is-bad'}`}
                    onClick={() => setEncryptEnabled((v) => !v)}
                  >
                    <span dangerouslySetInnerHTML={{ __html: renderIcon(encryptEnabled ? 'lock' : 'eyeOff', { size: 14 }) }} />
                    <span>Encryption: {encryptEnabled ? 'ON' : 'OFF'}</span>
                  </button>

                  <button
                    type="button"
                    className={`lab-toggle ${bobWrongKey ? 'is-bad' : 'is-good'}`}
                    onClick={() => setBobWrongKey((v) => !v)}
                  >
                    <span dangerouslySetInnerHTML={{ __html: renderIcon('key', { size: 14 }) }} />
                    <span>Bob Key: {bobWrongKey ? 'Wrong' : 'Match'}</span>
                  </button>
                </div>
              </div>

              <div className="lab-field">
                <label>Active Wire Threat</label>
                <div className="lab-seg">
                  {(['none', 'sniff', 'tamper'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={`lab-seg__btn ${hackerMode === m ? 'is-on' : ''}`}
                      onClick={() => {
                        setHackerMode(m);
                        if (m === 'tamper' && tamperedIndices.length === 0) setTamperedIndices([2]);
                        if (m !== 'tamper') setTamperedIndices([]);
                      }}
                    >
                      {m === 'none' ? 'Quiet Wire' : m === 'sniff' ? 'Eve Sniff' : 'Mallory Flip'}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {workbench === 'hash' && (
            <>
              <div className="lab-field">
                <label htmlFor="hash-a">Input A (Original)</label>
                <input
                  id="hash-a"
                  className="lab-input"
                  value={hashInputA}
                  onChange={(e) => setHashInputA(e.target.value)}
                />
              </div>

              <div className="lab-field">
                <label htmlFor="hash-b">Input B (Compare)</label>
                <input
                  id="hash-b"
                  className="lab-input"
                  value={hashInputB}
                  onChange={(e) => setHashInputB(e.target.value)}
                />
              </div>

              <div className="lab-field">
                <label>Quick Avalanche Tests</label>
                <div className="preset-row">
                  <button
                    type="button"
                    className="preset-btn"
                    onClick={() => {
                      setHashInputA('Pay Bob $100');
                      setHashInputB('Pay Bob $101');
                    }}
                  >
                    Change 1 Digit ($100 vs $101)
                  </button>
                  <button
                    type="button"
                    className="preset-btn"
                    onClick={() => {
                      setHashInputA('campus2026');
                      setHashInputB('campus2026');
                      setSaltEnabled(false);
                    }}
                  >
                    Same Password (No Salt)
                  </button>
                  <button
                    type="button"
                    className="preset-btn"
                    onClick={() => {
                      setHashInputA('campus2026');
                      setHashInputB('campus2026');
                      setSaltEnabled(true);
                    }}
                  >
                    Same Password (+ Salt)
                  </button>
                </div>
              </div>

              <div className="lab-field">
                <label>Unique Per-User Salt</label>
                <button
                  type="button"
                  className={`lab-toggle ${saltEnabled ? 'is-good' : 'is-bad'}`}
                  onClick={() => setSaltEnabled((v) => !v)}
                >
                  <span dangerouslySetInnerHTML={{ __html: renderIcon(saltEnabled ? 'sparkles' : 'alert', { size: 14 }) }} />
                  <span>Per-User Salt: {saltEnabled ? 'ON (Unique)' : 'OFF (Deterministic)'}</span>
                </button>
              </div>

              <div className="lab-field">
                <label htmlFor="argon-slider">Argon2id Memory Cost: {workFactor} MB RAM</label>
                <input
                  id="argon-slider"
                  type="range"
                  min={1}
                  max={128}
                  step={1}
                  value={workFactor}
                  onChange={(e) => setWorkFactor(Number(e.target.value))}
                  className="lab-slider"
                />
                <div className="lab-meta">
                  Estimated GPU speed: {workFactor < 16 ? '10B+ guesses/sec (Unsafe)' : workFactor < 64 ? '8,000 guesses/sec (Moderate)' : '~120 guesses/sec (Hardened)'}
                </div>
              </div>
            </>
          )}

          {workbench === 'dh' && (
            <>
              <div className="lab-field">
                <label>Public Prime Modulus (p)</label>
                <div className="preset-row">
                  {DH_PRIMES.map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`preset-btn ${dhPrime === p ? 'is-on' : ''}`}
                      onClick={() => setDhPrime(p)}
                    >
                      p = {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="lab-field">
                <label htmlFor="dh-gen">Public Generator (g): {dhGen}</label>
                <input
                  id="dh-gen"
                  type="range"
                  min={2}
                  max={11}
                  value={dhGen}
                  onChange={(e) => setDhGen(Number(e.target.value))}
                  className="lab-slider"
                />
              </div>

              <div className="lab-field">
                <label htmlFor="dh-a">Alice’s Private Secret (a): {alicePriv}</label>
                <input
                  id="dh-a"
                  type="range"
                  min={2}
                  max={20}
                  value={alicePriv}
                  onChange={(e) => setAlicePriv(Number(e.target.value))}
                  className="lab-slider"
                />
              </div>

              <div className="lab-field">
                <label htmlFor="dh-b">Bob’s Private Secret (b): {bobPriv}</label>
                <input
                  id="dh-b"
                  type="range"
                  min={2}
                  max={20}
                  value={bobPriv}
                  onChange={(e) => setBobPriv(Number(e.target.value))}
                  className="lab-slider"
                />
              </div>

              <div className="lab-field">
                <label>MITM Attack &amp; Root CA Defense</label>
                <div className="lab-toggles">
                  <button
                    type="button"
                    className={`lab-toggle ${dhMitm ? 'is-bad' : 'is-good'}`}
                    onClick={() => setDhMitm((v) => !v)}
                  >
                    <span dangerouslySetInnerHTML={{ __html: renderIcon('skull', { size: 14 }) }} />
                    <span>Mallory MITM: {dhMitm ? 'ON' : 'OFF'}</span>
                  </button>
                  <button
                    type="button"
                    className={`lab-toggle ${dhCaPinned ? 'is-good' : 'is-bad'}`}
                    onClick={() => setDhCaPinned((v) => !v)}
                  >
                    <span dangerouslySetInnerHTML={{ __html: renderIcon('shield', { size: 14 }) }} />
                    <span>Root CA: {dhCaPinned ? 'ON' : 'OFF'}</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {workbench === 'ecb' && (
            <>
              <div className="lab-field">
                <label>Sample 8×8 Scan Pattern</label>
                <div className="preset-row">
                  {(Object.keys(PIXEL_PRESETS) as PatternPresetId[]).map((pid) => (
                    <button
                      key={pid}
                      type="button"
                      className={`preset-btn ${pixelPreset === pid ? 'is-on' : ''}`}
                      onClick={() => {
                        setPixelPreset(pid);
                        setPixelGrid([...PIXEL_PRESETS[pid].grid]);
                      }}
                    >
                      {PIXEL_PRESETS[pid].label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="lab-field">
                <label>Block Cipher Mode</label>
                <div className="lab-toggles">
                  <button
                    type="button"
                    className={`lab-toggle ${blockMode === 'ecb' ? 'is-bad' : ''}`}
                    onClick={() => setBlockMode('ecb')}
                  >
                    <span dangerouslySetInnerHTML={{ __html: renderIcon('alert', { size: 14 }) }} />
                    <span>AES-ECB (Leaky)</span>
                  </button>
                  <button
                    type="button"
                    className={`lab-toggle ${blockMode === 'gcm' ? 'is-good' : ''}`}
                    onClick={() => setBlockMode('gcm')}
                  >
                    <span dangerouslySetInnerHTML={{ __html: renderIcon('lock', { size: 14 }) }} />
                    <span>AES-GCM (Safe)</span>
                  </button>
                </div>
              </div>

              <div className="lab-field">
                <label>Randomization Controls</label>
                <div className="lab-inline">
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{ flex: 1 }}
                    onClick={() => {
                      setBlockMode('gcm');
                      setVisualNonce((n) => n + 1);
                    }}
                  >
                    Rotate Nonce (#{visualNonce + 1})
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => setPixelGrid(Array(64).fill(0))}
                  >
                    Clear Canvas
                  </button>
                </div>
              </div>
            </>
          )}
        </section>

        <section className="card lab-steps">
          <div className="eyebrow">Under the Hood</div>
          {workbench === 'cipher' && (
            <ol className="lab-trace">
              {sim.mathSteps.map((s, idx) => (
                <li key={idx}>{s}</li>
              ))}
            </ol>
          )}
          {workbench === 'hash' && (
            <ol className="lab-trace">
              <li>SHA-256 compresses any input length into a fixed 256-bit (64-hex-char) fingerprint.</li>
              <li>Flipping 1 input character triggers a ~50% bit avalanche across the entire output.</li>
              <li>Adding a unique random salt guarantees identical passwords never share a database row.</li>
            </ol>
          )}
          {workbench === 'dh' && (
            <ol className="lab-trace">
              <li>Both sides agree publicly on p={dh.p}, g={dh.g} — Eve sees them too.</li>
              <li>Modular exponentiation (g^a mod p) is easy forward, but finding a from A is the Discrete Log hard problem.</li>
              <li>Always pair Diffie-Hellman with a CA-signed certificate so Mallory cannot substitute her own public share!</li>
            </ol>
          )}
          {workbench === 'ecb' && (
            <ol className="lab-trace">
              <li>AES-ECB encrypts every 16-byte block independently with the same key — identical inputs always yield identical ciphertext.</li>
              <li>AES-GCM combines a unique Nonce + incrementing Counter per block, turning repeated patterns into uniform static noise.</li>
              <li>Try painting a smiley face or cross on the left grid and flip between ECB and GCM!</li>
            </ol>
          )}
        </section>
      </aside>
    </div>
  );
}
