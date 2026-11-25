import { useEffect, useMemo, useRef, useState } from 'react';
import {
  aliceDev,
  bobDev,
  cipherBlock,
  hackerNode,
  link,
  routerNode,
} from '../data/cryptoHelpers';
import { fnv1aHex } from '../data/labData';
import { StageEngine, StageScene, renderIcon } from '../engine/isoEngine';
import TutorGuideCard from './TutorGuideCard';

type StageNum = 1 | 2 | 3 | 4 | 5;
type AlgoPick = 'none' | 'base64' | 'caesar' | 'aes-gcm';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const SHIFT_KEY = 3;
const PRESET_WORDS = ['CAFE', 'GOLD', 'LOCK', 'PASS'];

function shiftLetter(ch: string, shift: number): string {
  const idx = ALPHABET.indexOf(ch.toUpperCase());
  if (idx < 0) return ch;
  return ALPHABET[(idx + shift + 26) % 26];
}

function letterPos(ch: string): number {
  const idx = ALPHABET.indexOf(ch.toUpperCase());
  return idx >= 0 ? idx + 1 : 1;
}

const STAGE_META: Array<{ num: StageNum; label: string; short: string }> = [
  { num: 1, label: 'Spot the Leak', short: '1. Leak' },
  { num: 2, label: 'Pick Algorithm', short: '2. Algorithm' },
  { num: 3, label: 'Encrypt by Hand', short: '3. Encrypt' },
  { num: 4, label: 'Decrypt by Hand', short: '4. Decrypt' },
  { num: 5, label: 'Fix the Hack', short: '5. Fix Hack' },
];

export default function Scenario1GuidedPractice({
  theme,
  onSecured,
}: {
  theme: 'light' | 'dark';
  onSecured?: () => void;
}) {
  const [stage, setStage] = useState<StageNum>(1);
  const [maxUnlocked, setMaxUnlocked] = useState<StageNum>(1);

  // Stage 1 state
  const [secretWord, setSecretWord] = useState('CAFE');
  const [stage1Sent, setStage1Sent] = useState(false);

  // Stage 2 state
  const [pickedAlgo, setPickedAlgo] = useState<AlgoPick>('none');

  // Stage 3 state: manual encryption tiles
  const [encInputs, setEncInputs] = useState<string[]>(['', '', '', '']);
  const [encFocusIdx, setEncFocusIdx] = useState(0);
  const [encSent, setEncSent] = useState(false);

  // Stage 4 state: manual decryption tiles
  const [triedWrongKey, setTriedWrongKey] = useState(false);
  const [decInputs, setDecInputs] = useState<string[]>(['', '', '', '']);
  const [decFocusIdx, setDecFocusIdx] = useState(0);

  // Stage 5 state: emergency hack rescue (3 clear sequential steps)
  const [hackStep, setHackStep] = useState<'hacked' | 'inspected' | 'sealed' | 'rescued'>('hacked');

  // Tutor reactive feedback override when student tries a wrong letter or algo
  const [tutorOverride, setTutorOverride] = useState<{
    mood: 'neutral' | 'happy' | 'warn' | 'hint';
    msg: string;
    key: string;
  } | null>(null);

  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const stageEngineRef = useRef<StageEngine | null>(null);

  const cleanWord = useMemo(() => {
    const letters = secretWord.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
    return (letters || 'CAFE').padEnd(4, 'X');
  }, [secretWord]);

  const expectedEnc = useMemo(
    () => cleanWord.split('').map((ch) => shiftLetter(ch, SHIFT_KEY)),
    [cleanWord]
  );

  const wrongKeyDec = useMemo(
    () => expectedEnc.map((ch) => shiftLetter(ch, -5)).join(''),
    [expectedEnc]
  );

  const encSolvedCount = useMemo(
    () => expectedEnc.filter((exp, i) => encInputs[i]?.toUpperCase() === exp).length,
    [expectedEnc, encInputs]
  );
  const allEncSolved = encSolvedCount === 4;

  const decSolvedCount = useMemo(
    () => cleanWord.split('').filter((exp, i) => decInputs[i]?.toUpperCase() === exp).length,
    [cleanWord, decInputs]
  );
  const allDecSolved = decSolvedCount === 4;

  // Reset downstream manual tiles whenever secret word changes
  const handleSelectWord = (word: string) => {
    const cleaned = word.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
    setSecretWord(cleaned);
    setStage1Sent(false);
    setEncInputs(['', '', '', '']);
    setEncFocusIdx(0);
    setEncSent(false);
    setDecInputs(['', '', '', '']);
    setDecFocusIdx(0);
    setTutorOverride(null);
  };

  const unlockAndGo = (next: StageNum) => {
    setMaxUnlocked((prev) => (next > prev ? next : prev));
    setStage(next);
    setTutorOverride(null);
  };

  // Notify parent when Stage 5 rescue finishes
  useEffect(() => {
    if (hackStep === 'rescued') {
      onSecured?.();
    }
  }, [hackStep, onSecured]);

  // Build crisp, uncluttered 3D StageEngine scene for the active guided stage
  const liveScene = useMemo((): StageScene => {
    const cipherWord = expectedEnc.join('');
    const b64Word = typeof btoa === 'function' ? btoa(cleanWord) : 'Q0FGRQ==';
    const gcmHex = fnv1aHex(`aes-gcm:${cleanWord}`).slice(0, 10);

    // STAGE 1: Unencrypted leak on Café Wi-Fi
    if (stage === 1) {
      return {
        entities: {
          alice: aliceDev(-15, -2, [
            { text: `Message: "${cleanWord}"`, tone: stage1Sent ? 'red' : 'blue', icon: 'mail' },
          ]),
          router: routerNode(0, -2, ['Café Wi-Fi', 'Router'], stage1Sent ? 'plaintext!' : 'waiting', [
            stage1Sent
              ? { text: `Sees "${cleanWord}"!`, tone: 'red', icon: 'eye' }
              : { text: 'Click Send below', tone: 'paper', icon: 'wifi' },
          ]),
          bob: bobDev(15, -2, [
            { text: stage1Sent ? `Got "${cleanWord}"` : 'Waiting…', tone: stage1Sent ? 'amber' : 'paper', icon: 'inbox' },
          ]),
          eve: hackerNode(
            0,
            10,
            'Eve (Sniffer)',
            [
              stage1Sent
                ? { text: `STOLE "${cleanWord}"!`, tone: 'red', icon: 'eye' }
                : { text: 'Listening on Wi-Fi…', tone: 'amber', icon: 'wifi' },
            ],
            { heat: stage1Sent ? 0.9 : 0.25 }
          ),
        },
        links: {
          ar: link('alice', 'router', ['alice', 'router'], {
            label: stage1Sent ? `"${cleanWord}" (PLAIN)` : 'ready',
            labelTone: stage1Sent ? 'red' : 'blue',
          }),
          rb: link('router', 'bob', ['router', 'bob'], {
            label: stage1Sent ? 'unencrypted' : 'open wire',
            labelTone: stage1Sent ? 'red' : 'gray',
          }),
          re: link('router', 'eve', ['router', 'eve'], {
            style: 'dashed',
            label: stage1Sent ? 'copied in clear!' : 'wiretap ready',
            labelTone: stage1Sent ? 'red' : 'amber',
          }),
        },
        flows: stage1Sent
          ? [
              { route: ['ar', 'rb'], kind: 'mine', rate: 0.95 },
              { route: ['re'], kind: 'poison', rate: 0.95 },
            ]
          : [],
      };
    }

    // STAGE 2: Comparing Base64 vs Caesar vs AES-256-GCM
    if (stage === 2) {
      const isSafe = pickedAlgo === 'aes-gcm';
      const wireLabel =
        pickedAlgo === 'base64'
          ? b64Word
          : pickedAlgo === 'caesar'
            ? cipherWord
            : pickedAlgo === 'aes-gcm'
              ? `0x${gcmHex}…`
              : 'Pick a tool below';

      return {
        entities: {
          alice: aliceDev(-15, -2, [
            {
              text:
                pickedAlgo === 'none'
                  ? `Lock "${cleanWord}"`
                  : pickedAlgo === 'base64'
                    ? 'Base64 Encode'
                    : pickedAlgo === 'caesar'
                      ? 'Caesar (+3)'
                      : 'AES-256-GCM ✓',
              tone: isSafe ? 'green' : pickedAlgo === 'none' ? 'blue' : 'red',
              icon: isSafe ? 'lock' : 'alert',
            },
          ]),
          router: isSafe
            ? cipherBlock(0, -2, ['Café Wi-Fi', 'Router'], wireLabel, [
                { text: 'Opaque ciphertext ✓', tone: 'green', icon: 'shield' },
              ])
            : routerNode(0, -2, ['Café Wi-Fi', 'Router'], wireLabel, [
                {
                  text: pickedAlgo === 'none' ? 'Test 3 options' : 'Broken by Eve!',
                  tone: pickedAlgo === 'none' ? 'paper' : 'red',
                  icon: 'eye',
                },
              ]),
          bob: bobDev(15, -2, [
            { text: isSafe ? `Safe "${cleanWord}" ✓` : 'Needs real cipher', tone: isSafe ? 'green' : 'amber', icon: isSafe ? 'check' : 'lock' },
          ]),
          eve: hackerNode(
            0,
            10,
            'Eve (Sniffer)',
            [
              pickedAlgo === 'none'
                ? { text: 'Waiting to attack…', tone: 'amber', icon: 'eye' }
                : pickedAlgo === 'base64'
                  ? { text: `Decoded → "${cleanWord}"!`, tone: 'red', icon: 'zap' }
                  : pickedAlgo === 'caesar'
                    ? { text: `Cracked 25 keys → "${cleanWord}"!`, tone: 'red', icon: 'zap' }
                    : { text: 'Only random noise! ✕', tone: 'green', icon: 'eyeOff' },
            ],
            { heat: pickedAlgo === 'base64' || pickedAlgo === 'caesar' ? 0.9 : 0 }
          ),
        },
        links: {
          ar: link('alice', 'router', ['alice', 'router'], {
            label: wireLabel,
            labelTone: isSafe ? 'green' : pickedAlgo === 'none' ? 'blue' : 'red',
          }),
          rb: link('router', 'bob', ['router', 'bob'], {
            label: isSafe ? 'sealed packet' : 'weak / exposed',
            labelTone: isSafe ? 'green' : 'red',
          }),
          re: link('router', 'eve', ['router', 'eve'], {
            style: 'dashed',
            label: isSafe ? 'noise only' : 'eve attacks!',
            labelTone: isSafe ? 'green' : 'red',
          }),
        },
        flows:
          pickedAlgo === 'none'
            ? []
            : [
                { route: ['ar', 'rb'], kind: isSafe ? 'empty' : 'mine', rate: 0.9 },
                { route: ['re'], kind: isSafe ? 'empty' : 'poison', rate: 0.9 },
              ],
      };
    }

    // STAGE 3: Manual Encryption by Hand
    if (stage === 3) {
      const builtSoFar = encInputs.map((c) => (c ? c.toUpperCase() : '_')).join(' ');
      return {
        entities: {
          alice: aliceDev(-15, -2, [
            { text: `Plain: "${cleanWord}"`, tone: 'blue', icon: 'file' },
            { text: `Your Cipher: ${builtSoFar}`, tone: allEncSolved ? 'green' : 'amber', icon: 'lock' },
          ]),
          engine: cipherBlock(0, -2, ['Your Cipher', 'Key +3'], `${encSolvedCount}/4 letters locked`, [
            {
              text: encSent ? `Sent "${cipherWord}" ✓` : allEncSolved ? 'Ready to Send ✓' : 'Encrypt each letter!',
              tone: allEncSolved ? 'green' : 'blue',
              icon: 'key',
            },
          ]),
          bob: bobDev(15, -2, [
            {
              text: encSent ? `Received "${cipherWord}"` : 'Waiting for ciphertext…',
              tone: encSent ? 'green' : 'paper',
              icon: 'inbox',
            },
          ]),
          eve: hackerNode(0, 10, 'Eve (Sniffer)', [
            {
              text: encSent ? `Sees "${cipherWord}" (scrambled)` : 'Watching wire…',
              tone: encSent ? 'green' : 'amber',
              icon: 'eyeOff',
            },
          ]),
        },
        links: {
          ae: link('alice', 'engine', ['alice', 'engine'], {
            label: `shift +${SHIFT_KEY}`,
            labelTone: 'blue',
          }),
          eb: link('engine', 'bob', ['engine', 'bob'], {
            label: encSent ? `"${cipherWord}"` : 'waiting…',
            labelTone: encSent ? 'green' : 'gray',
          }),
          ee: link('engine', 'eve', ['engine', 'eve'], {
            style: 'dashed',
            label: encSent ? 'sees scrambled text' : 'listening',
            labelTone: encSent ? 'green' : 'amber',
          }),
        },
        flows: encSent
          ? [
              { route: ['ae', 'eb'], kind: 'empty', rate: 0.95 },
              { route: ['ee'], kind: 'empty', rate: 0.6 },
            ]
          : [{ route: ['ae'], kind: 'write', rate: 0.6 }],
      };
    }

    // STAGE 4: Manual Decryption on Bob's Side
    if (stage === 4) {
      const decSoFar = decInputs.map((c) => (c ? c.toUpperCase() : '_')).join(' ');
      return {
        entities: {
          alice: aliceDev(-15, -2, [
            { text: `Sent "${cipherWord}"`, tone: 'green', icon: 'lock' },
          ]),
          router: cipherBlock(0, -2, ['Café Wi-Fi', 'Router'], `"${cipherWord}"`, [
            { text: 'Delivered to Bob', tone: 'blue', icon: 'route' },
          ]),
          bob: bobDev(15, -2, [
            {
              text: allDecSolved
                ? `Unlocked: "${cleanWord}" ✓`
                : triedWrongKey && decSolvedCount === 0
                  ? `Wrong Key (-5) → "${wrongKeyDec}"!`
                  : `Decrypting: ${decSoFar}`,
              tone: allDecSolved ? 'green' : triedWrongKey && decSolvedCount === 0 ? 'red' : 'amber',
              icon: allDecSolved ? 'circleCheck' : 'key',
            },
          ]),
        },
        links: {
          ar: link('alice', 'router', ['alice', 'router'], { label: cipherWord, labelTone: 'green' }),
          rb: link('router', 'bob', ['router', 'bob'], {
            label: allDecSolved ? 'decrypted ✓' : `unlock with key -${SHIFT_KEY}`,
            labelTone: allDecSolved ? 'green' : 'blue',
          }),
        },
        flows: [{ route: ['ar', 'rb'], kind: allDecSolved ? 'msg' : 'empty', rate: 0.85 }],
      };
    }

    // STAGE 5: Emergency Hack Rescue!
    const isRescued = hackStep === 'rescued';
    const isSealed = hackStep === 'sealed' || isRescued;
    return {
      entities: {
        alice: aliceDev(-15, -2, [
          {
            text: isSealed ? 'AES-256-GCM + Tag ✓' : 'No Auth Tag!',
            tone: isSealed ? 'green' : 'red',
            icon: isSealed ? 'shield' : 'alert',
          },
        ]),
        router: cipherBlock(
          0,
          -2,
          ['Café Wi-Fi', 'Router'],
          isRescued ? 'Fresh Nonce ✓' : isSealed ? 'Sealed + Tag' : 'Tampered Byte!',
          [
            {
              text: isRescued
                ? 'Forgery Dropped ✓'
                : isSealed
                  ? '128-bit Tag Attached'
                  : 'Byte #2 Flipped!',
              tone: isRescued ? 'green' : isSealed ? 'blue' : 'red',
              icon: isRescued ? 'shield' : 'bug',
            },
          ]
        ),
        bob: bobDev(15, -2, [
          {
            text: isRescued
              ? 'Tag ≠ · Blocked Mallory ✓'
              : isSealed
                ? 'Ready to Verify Tag'
                : 'Got Fake "$900"!',
            tone: isRescued ? 'green' : isSealed ? 'blue' : 'red',
            icon: isRescued ? 'circleCheck' : 'alert',
          },
        ]),
        mallory: hackerNode(
          0,
          10,
          'Mallory (Hacker)',
          [
            {
              text: isRescued
                ? 'CAUGHT & BLOCKED ✓'
                : isSealed
                  ? 'Try attacking now!'
                  : 'Altered "$100" → "$900"!',
              tone: isRescued ? 'green' : 'red',
              icon: isRescued ? 'ban' : 'bug',
            },
          ],
          { heat: isRescued ? 0 : 0.9 }
        ),
      },
      links: {
        ar: link('alice', 'router', ['alice', 'router'], {
          label: isSealed ? 'ciphertext + GCM Tag' : 'unauthenticated cipher',
          labelTone: isSealed ? 'green' : 'red',
        }),
        rb: link('router', 'bob', ['router', 'bob'], {
          label: isRescued ? 'tampered dropped · safe ✓' : isSealed ? 'sealed packet' : 'corrupted "$900"!',
          labelTone: isRescued ? 'green' : isSealed ? 'blue' : 'red',
          fail: isRescued ? 0.95 : 0,
        }),
        rm: link('router', 'mallory', ['router', 'mallory'], {
          style: 'dashed',
          heads: 'both',
          label: isRescued ? 'bit-flip caught!' : 'mid-flight bit flip',
          labelTone: isRescued ? 'green' : 'red',
        }),
      },
      flows: [
        { route: ['ar', 'rb'], kind: isRescued ? 'kill' : isSealed ? 'empty' : 'poison', rate: 0.95 },
        { route: ['rm'], kind: isRescued ? 'kill' : 'poison', rate: 0.9, bounce: true },
      ],
    };
  }, [
    stage,
    cleanWord,
    stage1Sent,
    pickedAlgo,
    expectedEnc,
    encInputs,
    encSolvedCount,
    allEncSolved,
    encSent,
    decInputs,
    decSolvedCount,
    allDecSolved,
    triedWrongKey,
    wrongKeyDec,
    hackStep,
  ]);

  // Mount StageEngine once
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

  // ---------------- TUTOR CONTEXT-AWARE MESSAGE & HINT ----------------
  const tutorState = useMemo(() => {
    if (tutorOverride) {
      return {
        mood: tutorOverride.mood,
        message: tutorOverride.msg,
        key: tutorOverride.key,
        hint: getStageHint(),
      };
    }

    function getStageHint(): string {
      if (stage === 1) {
        return 'Click any 4-letter word preset like CAFE (or type your own), then click the green "Send Over Café Wi-Fi" button to see Eve intercept it.';
      }
      if (stage === 2) {
        return 'Base64 has no secret key, and Caesar only has 25 keys. Click the "AES-256-GCM" card — it uses a 256-bit key and an unforgeable tamper tag!';
      }
      if (stage === 3) {
        const idx = expectedEnc.findIndex((exp, i) => encInputs[i]?.toUpperCase() !== exp);
        if (idx === -1) return 'All 4 letters are encrypted! Click "Send Encrypted Packet to Bob" to continue.';
        const orig = cleanWord[idx];
        const step1 = shiftLetter(orig, 1);
        const step2 = shiftLetter(orig, 2);
        const step3 = shiftLetter(orig, 3);
        return `For Tile #${idx + 1} (letter ${orig}), count 3 letters forward in the alphabet: ${step1} (+1), ${step2} (+2), ${step3} (+3). So type "${step3}" or click the + button!`;
      }
      if (stage === 4) {
        const idx = cleanWord.split('').findIndex((exp, i) => decInputs[i]?.toUpperCase() !== exp);
        if (idx === -1) return 'All 4 letters are decrypted! Click "Continue to Stage 5" to face Mallory’s live hack.';
        const cip = expectedEnc[idx];
        const step1 = shiftLetter(cip, -1);
        const step2 = shiftLetter(cip, -2);
        const step3 = shiftLetter(cip, -3);
        return `For Tile #${idx + 1} (ciphertext ${cip}), count 3 letters BACKWARD in the alphabet: ${step1} (-1), ${step2} (-2), ${step3} (-3). So type "${step3}"!`;
      }
      if (hackStep === 'hacked') {
        return 'Step 1: Click "Inspect Mallory’s Flipped Byte" so we can locate exactly where the hacker tampered with the wire packet.';
      }
      if (hackStep === 'inspected') {
        return 'Step 2: Click "Upgrade to AES-256-GCM (Add Auth Tag)" to seal every byte with a 128-bit cryptographic checksum.';
      }
      if (hackStep === 'sealed') {
        return 'Step 3: Click "Test Mallory’s Attack Again" to watch Bob’s Auth Tag immediately detect the flipped bit and block Mallory!';
      }
      return 'You mastered all 5 stages! Try picking a new 4-letter word or explore Scenarios 02 to 05 above.';
    }

    if (stage === 1) {
      if (!stage1Sent) {
        return {
          mood: 'neutral' as const,
          message: `Welcome! I’m Prof. Ada. Let’s take this one easy step at a time. First, pick a 4-letter secret word for Alice and send it over public Café Wi-Fi to see what happens.`,
          key: 's1-start',
          hint: getStageHint(),
        };
      }
      return {
        mood: 'warn' as const,
        message: `Uh oh! Look at the 3D diagram — Eve is sitting on the Café router and read "${cleanWord}" in plain sight! Let’s click Next to pick the right encryption algorithm.`,
        key: `s1-sent-${cleanWord}`,
        hint: getStageHint(),
      };
    }

    if (stage === 2) {
      if (pickedAlgo === 'none') {
        return {
          mood: 'neutral' as const,
          message: `Now let’s discover which algorithm actually stops Eve. Try clicking each of the 3 options below and watch how Eve reacts!`,
          key: 's2-start',
          hint: getStageHint(),
        };
      }
      if (pickedAlgo === 'base64') {
        return {
          mood: 'warn' as const,
          message: `Good experiment! Base64 only reformats letters — it has NO secret key, so Eve decoded "${cleanWord}" in under a millisecond. Try another algorithm!`,
          key: 's2-b64',
          hint: getStageHint(),
        };
      }
      if (pickedAlgo === 'caesar') {
        return {
          mood: 'warn' as const,
          message: `Closer! Caesar shifts letters using a key, which is great for learning how encryption works — but only 25 keys exist, so Eve’s laptop cracked all 25 in 1 millisecond! Try AES-256-GCM.`,
          key: 's2-caesar',
          hint: getStageHint(),
        };
      }
      return {
        mood: 'happy' as const,
        message: `Spot on! AES-256-GCM is the real-world standard — Eve sees pure random noise! Next, let’s actually DO encryption manually by hand so you truly feel how ciphers work.`,
        key: 's2-gcm',
        hint: getStageHint(),
      };
    }

    if (stage === 3) {
      if (encSent) {
        return {
          mood: 'happy' as const,
          message: `Awesome work! You manually encrypted "${cleanWord}" into "${expectedEnc.join('')}" and sent it safely across the café router. Ready to step into Bob’s shoes and decrypt it?`,
          key: 's3-sent',
          hint: getStageHint(),
        };
      }
      if (allEncSolved) {
        return {
          mood: 'happy' as const,
          message: `Brilliant! You manually encrypted all 4 letters: ${cleanWord} became ${expectedEnc.join('')}. Click "Send Encrypted Packet" to transmit it to Bob!`,
          key: 's3-all-done',
          hint: getStageHint(),
        };
      }
      return {
        mood: 'neutral' as const,
        message: `Your turn to be the encryption engine! Using Secret Key +${SHIFT_KEY}, shift each letter of "${cleanWord}" forward by ${SHIFT_KEY} places in the alphabet strip below. Need help? Just tap Hint!`,
        key: `s3-work-${cleanWord}`,
        hint: getStageHint(),
      };
    }

    if (stage === 4) {
      if (allDecSolved) {
        return {
          mood: 'happy' as const,
          message: `You did it! Using Bob’s matching key (-${SHIFT_KEY}), you manually unlocked "${expectedEnc.join('')}" back into "${cleanWord}". Now click Next — an emergency hack is about to hit the Wi-Fi!`,
          key: 's4-done',
          hint: getStageHint(),
        };
      }
      if (triedWrongKey && decSolvedCount === 0) {
        return {
          mood: 'warn' as const,
          message: `See that gibberish "${wrongKeyDec}"? Without the exact matching key (-${SHIFT_KEY}), decryption only produces nonsense! Now decrypt each tile below using Key -${SHIFT_KEY}.`,
          key: 's4-wrongkey',
          hint: getStageHint(),
        };
      }
      return {
        mood: 'neutral' as const,
        message: `Now you’re Bob! The ciphertext "${expectedEnc.join('')}" just arrived. Shift each letter BACKWARD by ${SHIFT_KEY} places using Bob’s matching secret key to recover Alice’s original word.`,
        key: `s4-work-${cleanWord}`,
        hint: getStageHint(),
      };
    }

    // Stage 5
    if (hackStep === 'hacked') {
      return {
        mood: 'warn' as const,
        message: `Emergency! Mallory couldn’t read Alice’s encrypted payment, so she flipped 1 byte mid-flight — turning "$100" into "$900" on Bob’s screen! Follow the 3 quick rescue buttons to stop her.`,
        key: 's5-hacked',
        hint: getStageHint(),
      };
    }
    if (hackStep === 'inspected') {
      return {
        mood: 'neutral' as const,
        message: `Found it! Mallory flipped byte #2 (0x4b → 0x4a) on the open router. Because there was no integrity seal, Bob never noticed. Now attach an AES-256-GCM 128-bit Auth Tag!`,
        key: 's5-inspected',
        hint: getStageHint(),
      };
    }
    if (hackStep === 'sealed') {
      return {
        mood: 'neutral' as const,
        message: `Great! Every single wire byte is now mathematically locked into a 128-bit GCM Auth Tag. Click "Test Mallory’s Attack Again" to watch your defense catch her red-handed!`,
        key: 's5-sealed',
        hint: getStageHint(),
      };
    }
    return {
      mood: 'happy' as const,
      message: `Mission complete! Bob’s GCM Auth Tag instantly caught Mallory’s 1-bit flip, dropped the forged packet, and kept Alice’s real message safe. You mastered Scenario 01 end to end!`,
      key: 's5-rescued',
      hint: getStageHint(),
    };
  }, [
    tutorOverride,
    stage,
    stage1Sent,
    cleanWord,
    pickedAlgo,
    expectedEnc,
    encInputs,
    allEncSolved,
    encSent,
    decInputs,
    decSolvedCount,
    allDecSolved,
    triedWrongKey,
    wrongKeyDec,
    hackStep,
  ]);

  // Manual Tile Input Handlers
  const handleManualEncTile = (idx: number, raw: string) => {
    const ch = raw.toUpperCase().replace(/[^A-Z]/g, '').slice(-1);
    const next = [...encInputs];
    next[idx] = ch;
    setEncInputs(next);
    setEncFocusIdx(idx);

    if (!ch) return;
    const target = expectedEnc[idx];
    if (ch === target) {
      setTutorOverride({
        mood: 'happy',
        msg: `Nice! ${cleanWord[idx]} + ${SHIFT_KEY} = ${target}. ${
          idx < 3 ? `Now try Tile #${idx + 2} (${cleanWord[idx + 1]})!` : 'All 4 letters encrypted!'
        }`,
        key: `enc-ok-${idx}-${target}`,
      });
      if (idx < 3) setEncFocusIdx(idx + 1);
    } else {
      setTutorOverride({
        mood: 'warn',
        msg: `Not quite "${ch}"! Start at ${cleanWord[idx]} on the alphabet strip and count ${SHIFT_KEY} steps forward: ${shiftLetter(
          cleanWord[idx],
          1
        )}, ${shiftLetter(cleanWord[idx], 2)}, ${target}.`,
        key: `enc-err-${idx}-${ch}`,
      });
    }
  };

  const nudgeEncTile = (idx: number, delta: number) => {
    const cur = encInputs[idx] || cleanWord[idx];
    const nextChar = shiftLetter(cur, delta);
    handleManualEncTile(idx, nextChar);
  };

  const fillOneEncHint = () => {
    const idx = expectedEnc.findIndex((exp, i) => encInputs[i]?.toUpperCase() !== exp);
    if (idx >= 0) handleManualEncTile(idx, expectedEnc[idx]);
  };

  const handleManualDecTile = (idx: number, raw: string) => {
    const ch = raw.toUpperCase().replace(/[^A-Z]/g, '').slice(-1);
    const next = [...decInputs];
    next[idx] = ch;
    setDecInputs(next);
    setDecFocusIdx(idx);

    if (!ch) return;
    const target = cleanWord[idx];
    if (ch === target) {
      setTutorOverride({
        mood: 'happy',
        msg: `Spot on! ${expectedEnc[idx]} − ${SHIFT_KEY} = ${target}. ${
          idx < 3 ? `Next up: decrypt ${expectedEnc[idx + 1]}!` : `Bob recovered "${cleanWord}"!`
        }`,
        key: `dec-ok-${idx}-${target}`,
      });
      if (idx < 3) setDecFocusIdx(idx + 1);
    } else {
      setTutorOverride({
        mood: 'warn',
        msg: `Almost! To decrypt ${expectedEnc[idx]}, move ${SHIFT_KEY} steps BACKWARD from ${expectedEnc[idx]}: ${shiftLetter(
          expectedEnc[idx],
          -1
        )}, ${shiftLetter(expectedEnc[idx], -2)}, ${target}.`,
        key: `dec-err-${idx}-${ch}`,
      });
    }
  };

  const nudgeDecTile = (idx: number, delta: number) => {
    const cur = decInputs[idx] || expectedEnc[idx];
    const nextChar = shiftLetter(cur, delta);
    handleManualDecTile(idx, nextChar);
  };

  const fillOneDecHint = () => {
    const idx = cleanWord.split('').findIndex((exp, i) => decInputs[i]?.toUpperCase() !== exp);
    if (idx >= 0) handleManualDecTile(idx, cleanWord[idx]);
  };

  const handleRestartAll = () => {
    setStage(1);
    setMaxUnlocked(1);
    setStage1Sent(false);
    setPickedAlgo('none');
    setEncInputs(['', '', '', '']);
    setEncFocusIdx(0);
    setEncSent(false);
    setTriedWrongKey(false);
    setDecInputs(['', '', '', '']);
    setDecFocusIdx(0);
    setHackStep('hacked');
    setTutorOverride(null);
  };

  // Highlighted source letter on the visual alphabet strip during Stage 3 & 4
  const activeStripSource =
    stage === 3 ? cleanWord[encFocusIdx] : stage === 4 ? expectedEnc[decFocusIdx] : null;
  const activeStripTarget =
    stage === 3
      ? encInputs[encFocusIdx]?.toUpperCase() === expectedEnc[encFocusIdx]
        ? expectedEnc[encFocusIdx]
        : null
      : stage === 4
        ? decInputs[decFocusIdx]?.toUpperCase() === cleanWord[decFocusIdx]
          ? cleanWord[decFocusIdx]
          : null
        : null;

  return (
    <div className="guided-layout">
      {/* LEFT MAIN STAGE + SINGLE FOCUSED WORKOUT CARD */}
      <section className="guided-main">
        {/* Clean 5-Step Journey Bar */}
        <nav className="journey-bar" aria-label="Scenario 01 guided workout steps">
          {STAGE_META.map((s) => {
            const isCurrent = stage === s.num;
            const isDone = s.num < maxUnlocked || (s.num === 5 && hackStep === 'rescued');
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

        {/* Live 3D Isometric Diagram */}
        <section className="card stage guided-stage">
          <div className="stage__hud">
            <div className="chip" data-level="none">
              <span className="chip__label">Step</span>
              <span className="chip__value">
                {stage} / 5 · {STAGE_META[stage - 1].label}
              </span>
            </div>
            <div className="chip" data-level="none">
              <span className="chip__label">Your Word</span>
              <span className="chip__value">{cleanWord}</span>
            </div>
            <div
              className="chip"
              data-level={
                stage === 1
                  ? stage1Sent
                    ? 'bad'
                    : 'none'
                  : stage === 2
                    ? pickedAlgo === 'aes-gcm'
                      ? 'good'
                      : pickedAlgo === 'none'
                        ? 'none'
                        : 'bad'
                    : stage === 3
                      ? allEncSolved
                        ? 'good'
                        : 'warn'
                      : stage === 4
                        ? allDecSolved
                          ? 'good'
                          : 'warn'
                        : hackStep === 'rescued'
                          ? 'good'
                          : 'bad'
              }
            >
              <span className="chip__label">Status</span>
              <span className="chip__value">
                {stage === 1
                  ? stage1Sent
                    ? 'Sniffed by Eve!'
                    : 'Ready to Send'
                  : stage === 2
                    ? pickedAlgo === 'aes-gcm'
                      ? 'AES-256-GCM Chosen ✓'
                      : pickedAlgo === 'none'
                        ? 'Compare 3 Options'
                        : 'Cracked by Eve!'
                    : stage === 3
                      ? `${encSolvedCount}/4 Encrypted`
                      : stage === 4
                        ? `${decSolvedCount}/4 Decrypted`
                        : hackStep === 'rescued'
                          ? 'Mallory Blocked ✓'
                          : 'Active Hack!'}
              </span>
            </div>
          </div>
          <div className="stage__canvas" ref={canvasHostRef} />
        </section>

        {/* FOCUSED SINGLE-STEP INTERACTIVE WORKOUT CARD */}
        <section className="card step-workout-card">
          {/* ==================== STAGE 1 ==================== */}
          {stage === 1 && (
            <div className="step-pane">
              <div className="step-pane__head">
                <span className="eyebrow">Stage 1 of 5 · See Why Encryption Matters</span>
                <h2>Send Alice’s Secret Word Over Café Wi-Fi</h2>
                <p>
                  Pick a 4-letter secret word (or type your own) and send it without encryption to see what Eve sees on the café router.
                </p>
              </div>

              <div className="word-picker-row">
                <div className="preset-row">
                  {PRESET_WORDS.map((w) => (
                    <button
                      key={w}
                      type="button"
                      className={`preset-btn ${cleanWord === w ? 'is-on' : ''}`}
                      onClick={() => handleSelectWord(w)}
                    >
                      {w}
                    </button>
                  ))}
                </div>
                <input
                  className="lab-input word-input"
                  maxLength={4}
                  value={secretWord}
                  onChange={(e) => handleSelectWord(e.target.value)}
                  placeholder="4 letters"
                  aria-label="4-letter secret word"
                />
              </div>

              <div className="step-cta-row">
                <button
                  type="button"
                  className="btn-pop"
                  onClick={() => setStage1Sent(true)}
                >
                  <span>Send “{cleanWord}” Over Café Wi-Fi</span>
                </button>

                {stage1Sent && (
                  <button
                    type="button"
                    className="btn-pop btn-next"
                    onClick={() => unlockAndGo(2)}
                  >
                    <span>Next: Pick the Right Algorithm →</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ==================== STAGE 2 ==================== */}
          {stage === 2 && (
            <div className="step-pane">
              <div className="step-pane__head">
                <span className="eyebrow">Stage 2 of 5 · Choose the Right Algorithm</span>
                <h2>Test 3 Tools Against Eve’s Wi-Fi Sniffer</h2>
                <p>
                  Click each option below to test it live on <b>“{cleanWord}”</b>. Find the one Eve cannot break!
                </p>
              </div>

              <div className="algo-choice-grid">
                <button
                  type="button"
                  className={`algo-card ${pickedAlgo === 'base64' ? 'is-bad' : ''}`}
                  onClick={() => {
                    setPickedAlgo('base64');
                    setTutorOverride(null);
                  }}
                >
                  <div className="algo-card__title">Base64 Encoding</div>
                  <div className="algo-card__desc">Turns text into A–Z / 0–9 symbols with no secret key.</div>
                  {pickedAlgo === 'base64' && (
                    <div className="algo-card__verdict is-bad">Failed · Eve decoded it in 0.1 ms</div>
                  )}
                </button>

                <button
                  type="button"
                  className={`algo-card ${pickedAlgo === 'caesar' ? 'is-warn' : ''}`}
                  onClick={() => {
                    setPickedAlgo('caesar');
                    setTutorOverride(null);
                  }}
                >
                  <div className="algo-card__title">Caesar Shift (+3)</div>
                  <div className="algo-card__desc">Shifts every letter forward by a secret number (1–25).</div>
                  {pickedAlgo === 'caesar' && (
                    <div className="algo-card__verdict is-bad">Weak · Only 25 keys, cracked in 1 ms</div>
                  )}
                </button>

                <button
                  type="button"
                  className={`algo-card ${pickedAlgo === 'aes-gcm' ? 'is-good' : ''}`}
                  onClick={() => {
                    setPickedAlgo('aes-gcm');
                    setTutorOverride(null);
                  }}
                >
                  <div className="algo-card__title">AES-256-GCM (AEAD)</div>
                  <div className="algo-card__desc">256-bit secret key + unique nonce + 128-bit tamper seal.</div>
                  {pickedAlgo === 'aes-gcm' && (
                    <div className="algo-card__verdict is-good">Protected ✓ · Eve sees pure noise</div>
                  )}
                </button>
              </div>

              {pickedAlgo === 'aes-gcm' && (
                <div className="step-cta-row">
                  <button
                    type="button"
                    className="btn-pop btn-next"
                    onClick={() => unlockAndGo(3)}
                  >
                    <span>Next: Practice Encrypting by Hand →</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ==================== STAGE 3 ==================== */}
          {stage === 3 && (
            <div className="step-pane">
              <div className="step-pane__head">
                <span className="eyebrow">Stage 3 of 5 · Hands-On Manual Encryption</span>
                <h2>Encrypt “{cleanWord}” Manually Using Key +{SHIFT_KEY}</h2>
                <p>
                  To truly understand how a cipher locks plaintext, encrypt each letter yourself! Shift each letter <b>+{SHIFT_KEY} places forward</b> (type the letter or tap <b>+ / −</b>).
                </p>
              </div>

              {/* Friendly Visual Alphabet Ruler */}
              <div className="alpha-strip" aria-label="Alphabet reference strip">
                {ALPHABET.map((lt, idx) => (
                  <span
                    key={lt}
                    className={`alpha-cell ${
                      lt === activeStripSource ? 'is-src' : lt === activeStripTarget ? 'is-dst' : ''
                    }`}
                  >
                    <b>{lt}</b>
                    <small>{idx + 1}</small>
                  </span>
                ))}
              </div>

              {/* 4 Tactile Letter Encryption Tiles */}
              <div className="manual-tiles">
                {cleanWord.split('').map((origChar, idx) => {
                  const val = encInputs[idx] || '';
                  const isRight = val.toUpperCase() === expectedEnc[idx];
                  const isWrong = val !== '' && !isRight;
                  return (
                    <div
                      key={idx}
                      className={`cipher-tile ${isRight ? 'is-good' : isWrong ? 'is-bad' : ''} ${
                        encFocusIdx === idx ? 'is-focus' : ''
                      }`}
                      onClick={() => setEncFocusIdx(idx)}
                    >
                      <div className="cipher-tile__src">
                        <span>{origChar}</span>
                        <small>
                          #{letterPos(origChar)} + {SHIFT_KEY}
                        </small>
                      </div>
                      <div className="cipher-tile__arrow">↓</div>
                      <div className="cipher-tile__ctrl">
                        <button
                          type="button"
                          className="tile-step-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            nudgeEncTile(idx, -1);
                          }}
                          aria-label={`Previous letter for tile ${idx + 1}`}
                        >
                          −
                        </button>
                        <input
                          className="tile-input"
                          maxLength={1}
                          value={val}
                          onFocus={() => setEncFocusIdx(idx)}
                          onChange={(e) => handleManualEncTile(idx, e.target.value)}
                          placeholder="?"
                          aria-label={`Encrypted letter ${idx + 1}`}
                        />
                        <button
                          type="button"
                          className="tile-step-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            nudgeEncTile(idx, 1);
                          }}
                          aria-label={`Next letter for tile ${idx + 1}`}
                        >
                          +
                        </button>
                      </div>
                      <div className="cipher-tile__status">
                        {isRight ? 'Locked ✓' : isWrong ? 'Try again' : 'Your turn'}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="step-cta-row">
                {!allEncSolved && (
                  <button type="button" className="btn-ghost" onClick={fillOneEncHint}>
                    Help Me Fill Next Letter
                  </button>
                )}
                {allEncSolved && !encSent && (
                  <button
                    type="button"
                    className="btn-pop"
                    onClick={() => {
                      setEncSent(true);
                      setTutorOverride(null);
                    }}
                  >
                    <span>Send Encrypted “{expectedEnc.join('')}” to Bob</span>
                  </button>
                )}
                {encSent && (
                  <button
                    type="button"
                    className="btn-pop btn-next"
                    onClick={() => unlockAndGo(4)}
                  >
                    <span>Next: Decrypt as Bob →</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ==================== STAGE 4 ==================== */}
          {stage === 4 && (
            <div className="step-pane">
              <div className="step-pane__head">
                <span className="eyebrow">Stage 4 of 5 · Hands-On Manual Decryption</span>
                <h2>Unlock “{expectedEnc.join('')}” on Bob’s Laptop (Key −{SHIFT_KEY})</h2>
                <p>
                  Reverse Alice’s lock by shifting each ciphertext letter <b>{SHIFT_KEY} places BACKWARD</b>. Try testing a wrong key first if you want to see what happens!
                </p>
              </div>

              {/* Alphabet Strip */}
              <div className="alpha-strip" aria-label="Alphabet reference strip">
                {ALPHABET.map((lt, idx) => (
                  <span
                    key={lt}
                    className={`alpha-cell ${
                      lt === activeStripSource ? 'is-src' : lt === activeStripTarget ? 'is-dst' : ''
                    }`}
                  >
                    <b>{lt}</b>
                    <small>{idx + 1}</small>
                  </span>
                ))}
              </div>

              {/* 4 Manual Decryption Tiles */}
              <div className="manual-tiles">
                {expectedEnc.map((cipChar, idx) => {
                  const val = decInputs[idx] || '';
                  const isRight = val.toUpperCase() === cleanWord[idx];
                  const isWrong = val !== '' && !isRight;
                  return (
                    <div
                      key={idx}
                      className={`cipher-tile ${isRight ? 'is-good' : isWrong ? 'is-bad' : ''} ${
                        decFocusIdx === idx ? 'is-focus' : ''
                      }`}
                      onClick={() => setDecFocusIdx(idx)}
                    >
                      <div className="cipher-tile__src">
                        <span>{cipChar}</span>
                        <small>
                          #{letterPos(cipChar)} − {SHIFT_KEY}
                        </small>
                      </div>
                      <div className="cipher-tile__arrow">↓</div>
                      <div className="cipher-tile__ctrl">
                        <button
                          type="button"
                          className="tile-step-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            nudgeDecTile(idx, -1);
                          }}
                          aria-label={`Previous letter for decrypt tile ${idx + 1}`}
                        >
                          −
                        </button>
                        <input
                          className="tile-input"
                          maxLength={1}
                          value={val}
                          onFocus={() => setDecFocusIdx(idx)}
                          onChange={(e) => handleManualDecTile(idx, e.target.value)}
                          placeholder="?"
                          aria-label={`Decrypted letter ${idx + 1}`}
                        />
                        <button
                          type="button"
                          className="tile-step-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            nudgeDecTile(idx, 1);
                          }}
                          aria-label={`Next letter for decrypt tile ${idx + 1}`}
                        >
                          +
                        </button>
                      </div>
                      <div className="cipher-tile__status">
                        {isRight ? 'Unlocked ✓' : isWrong ? 'Count back 3' : 'Your turn'}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="step-cta-row">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    setTriedWrongKey(true);
                    setTutorOverride(null);
                  }}
                >
                  Test Wrong Key (−5 → {wrongKeyDec})
                </button>
                {!allDecSolved && (
                  <button type="button" className="btn-ghost" onClick={fillOneDecHint}>
                    Help Me Unlock Next Letter
                  </button>
                )}
                {allDecSolved && (
                  <button
                    type="button"
                    className="btn-pop btn-next"
                    onClick={() => unlockAndGo(5)}
                  >
                    <span>Next: Emergency Hack Rescue →</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ==================== STAGE 5 ==================== */}
          {stage === 5 && (
            <div className="step-pane">
              <div className="step-pane__head">
                <span className="eyebrow">Stage 5 of 5 · Your Message Got Hacked — Fix It!</span>
                <h2>
                  {hackStep === 'rescued'
                    ? 'Hack Stopped! Mallory’s Tampered Packet Was Dropped ✓'
                    : 'Mallory Flipped a Wire Byte — Rescue Alice & Bob!'}
                </h2>
                <p>
                  {hackStep === 'rescued'
                    ? 'By upgrading to AES-256-GCM, every byte is protected by an unforgeable 128-bit Auth Tag. Even 1 flipped bit causes Bob to drop the packet immediately.'
                    : 'Mallory couldn’t read the ciphertext, so she secretly altered 1 byte in transit, turning "$100" into "$900" on Bob’s screen! Complete the 3 rescue steps below.'}
                </p>
              </div>

              {/* Visual 4-Byte Wire Bar showing Mallory's Flipped Byte */}
              <div className="rescue-wire">
                {['7a', '3f', hackStep === 'hacked' || hackStep === 'inspected' ? '4a (FLIPPED!)' : '4b', '91'].map(
                  (byteLabel, idx) => (
                    <div
                      key={idx}
                      className={`rescue-byte ${
                        idx === 2 && (hackStep === 'hacked' || hackStep === 'inspected')
                          ? 'is-bad'
                          : hackStep === 'sealed' || hackStep === 'rescued'
                            ? 'is-good'
                            : ''
                      }`}
                    >
                      <small>Byte {idx}</small>
                      <b>{byteLabel}</b>
                    </div>
                  )
                )}
                <div className={`rescue-byte ${hackStep === 'sealed' || hackStep === 'rescued' ? 'is-tag' : 'is-missing'}`}>
                  <small>GCM Auth Tag</small>
                  <b>{hackStep === 'sealed' || hackStep === 'rescued' ? 'd7e390a4 ✓' : 'MISSING!'}</b>
                </div>
              </div>

              {/* Clean 1-Action-At-A-Time Rescue Controls */}
              <div className="step-cta-row">
                {hackStep === 'hacked' && (
                  <button
                    type="button"
                    className="btn-pop"
                    onClick={() => {
                      setHackStep('inspected');
                      setTutorOverride(null);
                    }}
                  >
                    <span>1. Inspect Mallory’s Flipped Byte</span>
                  </button>
                )}

                {hackStep === 'inspected' && (
                  <button
                    type="button"
                    className="btn-pop"
                    onClick={() => {
                      setHackStep('sealed');
                      setTutorOverride(null);
                    }}
                  >
                    <span>2. Upgrade to AES-256-GCM (Attach 128-bit Auth Tag)</span>
                  </button>
                )}

                {hackStep === 'sealed' && (
                  <button
                    type="button"
                    className="btn-pop"
                    onClick={() => {
                      setHackStep('rescued');
                      setTutorOverride(null);
                    }}
                  >
                    <span>3. Let Mallory Try Flipping a Byte Now!</span>
                  </button>
                )}

                {hackStep === 'rescued' && (
                  <div className="victory-summary">
                    <div className="victory-list">
                      <span>✓ Spotted Wi-Fi Plaintext Leak</span>
                      <span>✓ Chose AES-256-GCM</span>
                      <span>✓ Encrypted “{cleanWord}” by Hand</span>
                      <span>✓ Decrypted as Bob</span>
                      <span>✓ Stopped Mallory’s Hack</span>
                    </div>
                    <button type="button" className="btn-ghost" onClick={handleRestartAll}>
                      Practice Again With Another Word
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </section>

      {/* RIGHT RAIL: PROF. ADA TUTOR + VOICE GUIDE + CLEAN MINI SUMMARY */}
      <aside className="rail">
        <TutorGuideCard
          stageLabel={`Stage ${stage} of 5`}
          mood={tutorState.mood}
          message={tutorState.message}
          hintText={tutorState.hint}
          voiceTriggerKey={tutorState.key}
        />

        <section className="card guided-progress-card">
          <div className="eyebrow">Your Scenario 01 Mastery</div>
          <ul className="workout-tasks">
            <li className={stage1Sent ? 'is-done' : ''}>
              <span
                className={`check ${stage1Sent ? 'is-on' : ''}`}
                dangerouslySetInnerHTML={{ __html: renderIcon('check', { size: 11, stroke: 3 }) }}
              />
              <span>Saw why unencrypted Café Wi-Fi leaks “{cleanWord}”</span>
            </li>
            <li className={pickedAlgo === 'aes-gcm' ? 'is-done' : ''}>
              <span
                className={`check ${pickedAlgo === 'aes-gcm' ? 'is-on' : ''}`}
                dangerouslySetInnerHTML={{ __html: renderIcon('check', { size: 11, stroke: 3 }) }}
              />
              <span>Identified AES-256-GCM over Base64 &amp; Caesar</span>
            </li>
            <li className={encSent ? 'is-done' : ''}>
              <span
                className={`check ${encSent ? 'is-on' : ''}`}
                dangerouslySetInnerHTML={{ __html: renderIcon('check', { size: 11, stroke: 3 }) }}
              />
              <span>Manually encrypted all 4 letters ({cleanWord} → {expectedEnc.join('')})</span>
            </li>
            <li className={allDecSolved ? 'is-done' : ''}>
              <span
                className={`check ${allDecSolved ? 'is-on' : ''}`}
                dangerouslySetInnerHTML={{ __html: renderIcon('check', { size: 11, stroke: 3 }) }}
              />
              <span>Manually decrypted ciphertext back on Bob’s laptop</span>
            </li>
            <li className={hackStep === 'rescued' ? 'is-done' : ''}>
              <span
                className={`check ${hackStep === 'rescued' ? 'is-on' : ''}`}
                dangerouslySetInnerHTML={{ __html: renderIcon('check', { size: 11, stroke: 3 }) }}
              />
              <span>Caught &amp; fixed Mallory’s mid-flight hack with GCM Tag</span>
            </li>
          </ul>
        </section>
      </aside>
    </div>
  );
}
