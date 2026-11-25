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
} from './cryptoHelpers';
import { fnv1aHex, modPow } from './labData';
import type { StageScene } from '../engine/isoEngine';

export type MissionId = 'm1-chat' | 'm2-portal' | 'm3-bank' | 'm4-update' | 'm5-vault';

export interface MissionControlOption {
  value: string;
  label: string;
  hint?: string;
}

export interface MissionControl {
  id: string;
  label: string;
  options: MissionControlOption[];
}

export interface MissionActionBtn {
  id: string;
  label: string;
  icon: string;
  tone: 'attack' | 'test';
  description: string;
}

export interface WorkoutState {
  // Mission 1: Custom message, passphrase, and clickable wire byte flips
  m1Msg: string;
  m1Key: string;
  m1TamperedBytes: number[];
  // Mission 2: Student-chosen passwords, fresh salts, and live login verifier
  m2AlicePw: string;
  m2SamPw: string;
  m2SaltSeed: number;
  m2LoginAttempt: string;
  m2LoginResult: null | { ok: boolean; detail: string; computedHash: string };
  // Mission 3: Custom transfer amount, live ECDHE client secret, cert decision
  m3Amount: string;
  m3ClientSecretA: number;
  m3CertDecision: 'pending' | 'trust' | 'reject';
  // Mission 4: Editable installer payload + real SHA-256 + HSM sign/verify
  m4OfficialPayload: string;
  m4MirrorPayload: string;
  m4OfficialHash: string;
  m4MirrorHash: string;
  m4SignedHash: string | null;
  m4VerifyResult: null | { ok: boolean; detail: string };
  // Mission 5: Paintable 6x6 mini X-ray grid + live Tap-to-Pay POS replay terminal
  m5Grid: number[];
  m5PayAmount: number;
  m5ActiveNonce: string;
  m5TotalCharged: number;
  m5AcceptedTaps: number;
  m5BlockedReplays: number;
  m5LastTerminalEvent: string;
}

export const INITIAL_MINI_XRAY: number[] = [
  0, 1, 1, 1, 1, 0,
  1, 0, 1, 1, 0, 1,
  1, 2, 1, 1, 2, 1,
  1, 2, 1, 1, 2, 1,
  1, 0, 1, 1, 0, 1,
  0, 0, 1, 1, 0, 0,
];

export const DEFAULT_WORKOUT_STATE: WorkoutState = {
  m1Msg: 'Pay Bob $100 for lab gear',
  m1Key: 'cafe-secret-256',
  m1TamperedBytes: [],

  m2AlicePw: 'campus2026',
  m2SamPw: 'campus2026',
  m2SaltSeed: 1,
  m2LoginAttempt: 'campus2026',
  m2LoginResult: null,

  m3Amount: '2500',
  m3ClientSecretA: 6,
  m3CertDecision: 'pending',

  m4OfficialPayload: 'pkg=AppInstaller_v4.2; perm=standard; bin=0x4f9a82c1',
  m4MirrorPayload: 'pkg=AppInstaller_v4.2; perm=standard; bin=0x4f9a82c1',
  m4OfficialHash: '9c8a4b21d0f7e312a9840c55b1e7d219f02a4e8c',
  m4MirrorHash: '9c8a4b21d0f7e312a9840c55b1e7d219f02a4e8c',
  m4SignedHash: '9c8a4b21d0f7e312a9840c55b1e7d219f02a4e8c',
  m4VerifyResult: null,

  m5Grid: [...INITIAL_MINI_XRAY],
  m5PayAmount: 50,
  m5ActiveNonce: '8841-f9a2',
  m5TotalCharged: 50,
  m5AcceptedTaps: 1,
  m5BlockedReplays: 0,
  m5LastTerminalEvent: 'Tap #1 ($50) sent with nonce 8841-f9a2. Try clicking "Replay Captured Tap"!',
};

export interface MissionWorkoutTask {
  id: string;
  label: string;
}

export interface MissionEvaluation {
  status: 'vulnerable' | 'partial' | 'secured';
  statusLabel: string;
  reactionTitle: string;
  reactionDetail: string;
  attackerOutcome: string;
  systemOutcome: string;
  whyItHappened: string;
  nextHint: string;
  hud: Array<{ label: string; value: string; level: 'good' | 'warn' | 'bad' | 'none' }>;
  inspectorTitle: string;
  inspectorLines: Array<{ label: string; value: string; tone?: 'good' | 'warn' | 'bad' }>;
  scene: StageScene;
}

export interface InteractiveMission {
  id: MissionId;
  num: string;
  title: string;
  scenarioLabel: string;
  brief: string;
  goal: string;
  defaultConfig: Record<string, string>;
  defaultAction: string;
  workoutTasks: MissionWorkoutTask[];
  controls: MissionControl[];
  actions: MissionActionBtn[];
  evaluate: (
    config: Record<string, string>,
    lastAction: string,
    workout: WorkoutState
  ) => MissionEvaluation;
}

// Helper for Mission 1 live wire byte representation
export function buildMission1WireBytes(
  msg: string,
  key: string,
  cipher: string,
  tamperedIndices: number[]
): Array<{ index: number; origHex: string; wireHex: string; tampered: boolean; charOut: string }> {
  const safeMsg = (msg || 'Pay Bob $100').slice(0, 26);
  const safeKey = key || 'key';
  const tamperedSet = new Set(tamperedIndices);

  return Array.from(safeMsg).map((ch, i) => {
    const code = ch.charCodeAt(0) & 0xff;
    let wireByte = code;
    if (cipher === 'base64') {
      const b64 = typeof btoa === 'function' ? btoa(unescape(encodeURIComponent(safeMsg))) : safeMsg;
      wireByte = (b64.charCodeAt(i % b64.length) || 65) & 0xff;
    } else if (cipher === 'aes-ctr' || cipher === 'aes-gcm') {
      const ks = parseInt(fnv1aHex(`${safeKey}:${i}`).slice(0, 2), 16);
      wireByte = code ^ ks;
    }
    const isTampered = tamperedSet.has(i);
    const finalByte = isTampered ? wireByte ^ 0x05 : wireByte;

    let decCode = finalByte;
    if (cipher === 'aes-ctr' || cipher === 'aes-gcm') {
      const ks = parseInt(fnv1aHex(`${safeKey}:${i}`).slice(0, 2), 16);
      decCode = finalByte ^ ks;
    }
    const charOut = decCode >= 32 && decCode <= 126 ? String.fromCharCode(decCode) : '?';

    return {
      index: i,
      origHex: wireByte.toString(16).padStart(2, '0'),
      wireHex: finalByte.toString(16).padStart(2, '0'),
      tampered: isTampered,
      charOut,
    };
  });
}

// Helper for Mission 2 live password row formatting
export function computeMission2Row(
  pw: string,
  storage: string,
  saltMode: string,
  userSalt: string
): string {
  const safePw = pw || 'campus2026';
  if (storage === 'plaintext') return safePw;
  if (storage === 'aes-db') return `enc(K_app): ${fnv1aHex('aes:' + safePw).slice(0, 16)}…`;
  const effectiveSalt = saltMode === 'unique' ? userSalt : saltMode === 'shared' ? 'S0_GLOBAL' : '';
  const digest = fnv1aHex(`${storage}:${effectiveSalt}:${safePw}`);
  if (storage === 'sha256') {
    return saltMode === 'unique'
      ? `salt:${userSalt} · sha256:${digest}`
      : `sha256:${digest}`;
  }
  return saltMode === 'unique'
    ? `salt:${userSalt} · $argon2id$m65536$${digest}`
    : `$argon2id$nosalt$${digest}`;
}

export const PRACTICE_MISSIONS: InteractiveMission[] = [
  // =========================================================================
  // MISSION 01: CAFÉ WI-FI MESSAGING (ALICE -> BOB)
  // =========================================================================
  {
    id: 'm1-chat',
    num: '01',
    title: 'Café Wi-Fi Messaging',
    scenarioLabel: 'Scenario 01 · Alice to Bob Chat',
    brief:
      'Type your own message from Alice to Bob over public café Wi-Fi. Flip wire bytes yourself as Mallory and configure the right cipher + key delivery to defeat both Eve and Mallory.',
    goal: 'Stop Eve from reading YOUR message AND make Bob catch & reject YOUR manual wire bit-flip.',
    defaultConfig: {
      cipher: 'plaintext',
      keyDelivery: 'inline',
    },
    defaultAction: 'sniff',
    workoutTasks: [
      { id: 'm1-t1', label: 'Type your own message & see Eve decode Plaintext or Base64' },
      { id: 'm1-t2', label: 'Click any Wire Byte below under AES-CTR to corrupt Bob’s screen silently' },
      { id: 'm1-t3', label: 'Enable AES-256-GCM + Private ECDHE & flip a byte to watch Bob’s Auth Tag drop it' },
    ],
    controls: [
      {
        id: 'cipher',
        label: '1. Message Protection',
        options: [
          { value: 'plaintext', label: 'Plaintext (None)' },
          { value: 'base64', label: 'Base64 Encode' },
          { value: 'aes-ctr', label: 'AES-256-CTR (No Tag)' },
          { value: 'aes-gcm', label: 'AES-256-GCM (AEAD)' },
        ],
      },
      {
        id: 'keyDelivery',
        label: '2. Secret Key Handling',
        options: [
          { value: 'inline', label: 'Send Key in Header' },
          { value: 'ecdhe', label: 'Private Pre-Shared / ECDHE' },
        ],
      },
    ],
    actions: [
      {
        id: 'sniff',
        label: 'Run Eve Sniffer',
        icon: 'eye',
        tone: 'attack',
        description: 'Capture your live wire packet passively at the café router',
      },
      {
        id: 'tamper',
        label: 'Mallory Bit-Flip',
        icon: 'bug',
        tone: 'attack',
        description: 'Flip a byte mid-flight to corrupt Bob’s decrypted text',
      },
      {
        id: 'normal',
        label: 'Send Clean Packet',
        icon: 'send',
        tone: 'test',
        description: 'Deliver your packet with an intact wire',
      },
    ],
    evaluate: (cfg, action, workout) => {
      const { cipher, keyDelivery } = cfg;
      const msg = workout.m1Msg || 'Pay Bob $100 for lab gear';
      const key = workout.m1Key || 'cafe-secret-256';
      const isPlain = cipher === 'plaintext';
      const isB64 = cipher === 'base64';
      const isCtr = cipher === 'aes-ctr';
      const isGcm = cipher === 'aes-gcm';
      const keyLeaked = keyDelivery === 'inline';

      const manualFlip = workout.m1TamperedBytes.length > 0;
      const isTamper = action === 'tamper' || manualFlip;
      const effectiveFlips = manualFlip ? workout.m1TamperedBytes : action === 'tamper' ? [Math.min(8, Math.max(0, msg.length - 1))] : [];
      const wireTokens = buildMission1WireBytes(msg, key, cipher, effectiveFlips);
      const bobDecoded = wireTokens.map((t) => t.charOut).join('');

      const confidential = (isCtr || isGcm) && !keyLeaked;
      const integrityProtected = isGcm && !keyLeaked;
      const secured = confidential && integrityProtected;

      const status: 'vulnerable' | 'partial' | 'secured' = secured
        ? 'secured'
        : confidential
          ? 'partial'
          : 'vulnerable';

      const shortMsg = msg.slice(0, 22);
      const wireHex = isPlain
        ? bobDecoded
        : isB64
          ? (typeof btoa === 'function' ? btoa(unescape(encodeURIComponent(msg))) : msg)
          : (keyLeaked ? `[KEY:${key.slice(0, 10)}!!] ` : '[nonce:4f8a] ') +
            wireTokens.slice(0, 12).map((t) => t.wireHex).join(' ') +
            (isGcm ? ` [tag:${fnv1aHex(key + msg).slice(0, 8)}]` : '');

      let reactionTitle = '';
      let reactionDetail = '';
      let attackerOutcome = '';
      let systemOutcome = '';
      let whyItHappened = '';
      let nextHint = '';

      if (isPlain) {
        reactionTitle = isTamper
          ? `Tampered wire bytes changed Bob’s screen to "${bobDecoded.slice(0, 26)}"!`
          : `Eve read your exact message "${shortMsg}" off the router!`;
        reactionDetail = isTamper
          ? `You flipped byte(s) [${effectiveFlips.join(', ')}] on an unencrypted wire. Bob displayed "${bobDecoded}" with zero alert.`
          : `Encryption is OFF, so "${msg}" traveled in readable UTF-8 across the café Wi-Fi router.`;
        attackerOutcome = isTamper ? `Altered message → "${bobDecoded.slice(0, 22)}"` : `Read in clear: "${shortMsg}"`;
        systemOutcome = isTamper ? 'Bob displayed forged text!' : 'Exposed on public Wi-Fi';
        whyItHappened = 'Unencrypted traffic has neither confidentiality nor tamper detection.';
        nextHint = 'Try switching to AES-256-CTR or AES-256-GCM and keep the secret key off the wire.';
      } else if (isB64) {
        reactionTitle = `Eve decoded your Base64 back to "${shortMsg}" in 0.05 ms!`;
        reactionDetail =
          'Base64 uses a public alphabet with zero secret key — anyone sniffing the router runs base64 decode and reads your exact message.';
        attackerOutcome = `Decoded Base64 → "${shortMsg}"`;
        systemOutcome = isTamper ? 'Corrupted Base64 accepted' : 'Zero confidentiality';
        whyItHappened = 'Encoding (Base64/Hex) formats bytes for transport; it never hides secrets.';
        nextHint = 'Switch from Base64 to AES-256-CTR (to test bit-flipping) or AES-256-GCM.';
      } else if (keyLeaked) {
        reactionTitle = `Eve stole your key "${key.slice(0, 14)}" straight from the packet header!`;
        reactionDetail = `Even with ${isGcm ? 'AES-256-GCM' : 'AES-256-CTR'} active, putting the secret key inside the wire header handed Eve everything needed to decrypt "${shortMsg}".`;
        attackerOutcome = `Stole key "${key.slice(0, 12)}" & decrypted!`;
        systemOutcome = 'Key leaked in transit';
        whyItHappened = 'A cipher is only as secret as its key — never transmit raw keys in plaintext headers.';
        nextHint = 'Change Secret Key Handling to "Private Pre-Shared / ECDHE".';
      } else if (isCtr) {
        reactionTitle = isTamper
          ? `Bit-flip succeeded! Bob silently saw "${bobDecoded.slice(0, 26)}"!`
          : 'Eve sees random noise — now click any Wire Byte below to test Mallory’s bit-flip!';
        reactionDetail = isTamper
          ? `AES-256-CTR hid your plaintext from Eve, BUT because CTR has NO authentication tag, flipping wire byte(s) [${effectiveFlips.join(', ')}] silently altered Bob’s output from "${msg}" to "${bobDecoded}"!`
          : 'Confidentiality is working, but CTR mode is malleable. Click a byte in the Interactive Wire Editor below to watch silent corruption happen!';
        attackerOutcome = isTamper ? `Corrupted Bob → "${bobDecoded.slice(0, 20)}"` : 'Sees random noise (cannot read)';
        systemOutcome = isTamper ? 'Silent corruption accepted!' : 'Confidential, but no tamper guard';
        whyItHappened = 'Unauthenticated stream/CTR ciphers flip the exact corresponding plaintext bit when a ciphertext bit is flipped.';
        nextHint = 'Upgrade to AES-256-GCM (AEAD) and flip a wire byte again to see the Auth Tag stop it!';
      } else {
        reactionTitle = isTamper
          ? `Mission Secured! Bob’s GCM Auth Tag caught your flipped byte(s) [${effectiveFlips.join(', ')}] & dropped it!`
          : 'Mission Secured! Your message is protected end-to-end with AES-256-GCM';
        reactionDetail = isTamper
          ? `Because AES-256-GCM authenticates every ciphertext byte inside its 128-bit GHASH tag, flipping byte(s) [${effectiveFlips.join(', ')}] caused Bob’s tag verification to fail BEFORE showing a single corrupted character.`
          : `Alice sealed "${shortMsg}" with AES-256-GCM using a private key. Eve sees uniform noise — click any wire byte below to watch GCM reject tampering live!`;
        attackerOutcome = isTamper ? 'Bit-flip caught & dropped (Tag ≠)' : 'Sees pure random noise (0 bits)';
        systemOutcome = isTamper ? 'Packet safely quarantined before display' : `Bob verified Tag ✓ → "${shortMsg}"`;
        whyItHappened = 'AEAD binds confidentiality and cryptographic integrity together in one primitive.';
        nextHint = 'Try clicking wire bytes below to verify tamper rejection, or move to Mission 02!';
      }

      const bobScreen =
        secured && isTamper
          ? '⛔ DROPPED: GCM Auth Tag mismatch (0 corrupted bytes displayed)'
          : bobDecoded;

      const scene: StageScene = {
        entities: {
          alice: aliceDev(-15, -2, [
            {
              text: isPlain
                ? `"${shortMsg.slice(0, 14)}" (PLAIN)`
                : isB64
                  ? 'Base64 (No Key!)'
                  : keyLeaked
                    ? 'Key Sent on Wire!'
                    : isCtr
                      ? 'AES-CTR (No Tag)'
                      : 'AES-256-GCM Sealed',
              tone: secured ? 'green' : isCtr && !keyLeaked ? 'amber' : 'red',
              icon: secured ? 'lock' : 'alert',
            },
          ]),
          router: confidential
            ? cipherBlock(0, -2, ['Café Wi-Fi', 'Router'], isGcm ? 'AEAD + Tag' : 'CTR only', [
                {
                  text: isTamper
                    ? isGcm
                      ? `byte [${effectiveFlips[0]}] flipped`
                      : 'silent bit-flip!'
                    : 'ciphertext bytes',
                  tone: isTamper ? 'amber' : 'green',
                  icon: 'wifi',
                },
              ])
            : routerNode(0, -2, ['Café Wi-Fi', 'Router'], 'exposed', [
                {
                  text: keyLeaked ? 'KEY LEAKED!' : isB64 ? 'Base64 decoded!' : 'Plaintext visible!',
                  tone: 'red',
                  icon: 'eye',
                },
              ]),
          bob: bobDev(15, -2, [
            {
              text:
                secured && isTamper
                  ? 'Tag Invalid · Dropped!'
                  : !secured && isTamper
                    ? `Saw "${bobDecoded.slice(0, 14)}"!`
                    : secured
                      ? `Tag ✓ · "${shortMsg.slice(0, 12)}"`
                      : 'Received (Unsafe)',
              tone: secured ? 'green' : 'red',
              icon: secured ? (isTamper ? 'shield' : 'check') : 'alert',
            },
          ]),
          attacker: hackerNode(
            0,
            10,
            isTamper ? 'Mallory (MITM)' : 'Eve (Sniffer)',
            [
              {
                text: !confidential
                  ? isTamper
                    ? 'Rewrote wire!'
                    : `Reads "${shortMsg.slice(0, 12)}"`
                  : isTamper
                    ? isGcm
                      ? 'Tamper Caught ✓'
                      : 'Corrupted Bob!'
                    : 'Only random noise',
                tone: secured ? 'green' : 'red',
                icon: isTamper ? 'bug' : 'eye',
              },
            ],
            { heat: secured ? 0 : 0.85 }
          ),
        },
        links: {
          ar: link('alice', 'router', ['alice', 'router'], {
            label: isPlain ? 'plaintext' : isB64 ? 'base64' : keyLeaked ? 'cipher + KEY!' : 'ciphertext',
            labelTone: confidential ? 'green' : 'red',
          }),
          rb: link('router', 'bob', ['router', 'bob'], {
            label:
              secured && isTamper
                ? 'dropped at Bob'
                : !secured && isTamper
                  ? 'corrupted text!'
                  : confidential
                    ? 'sealed packet'
                    : 'open packet',
            labelTone: isTamper ? (secured ? 'amber' : 'red') : confidential ? 'green' : 'red',
            fail: secured && isTamper ? 0.95 : 0,
          }),
          ra: link('router', 'attacker', ['router', 'attacker'], {
            style: 'dashed',
            heads: isTamper ? 'both' : 'end',
            label: isTamper ? `flipped [${effectiveFlips.join(',')}]` : 'wiretap copy',
            labelTone: secured ? 'green' : 'red',
          }),
        },
        flows: [
          {
            route: ['ar', 'rb'],
            kind: !confidential ? 'mine' : isTamper ? (secured ? 'kill' : 'poison') : 'empty',
            rate: 0.95,
          },
          {
            route: ['ra'],
            kind: secured ? 'empty' : 'poison',
            rate: action === 'normal' && !manualFlip ? 0.35 : 0.95,
            bounce: isTamper,
          },
        ],
      };

      return {
        status,
        statusLabel:
          status === 'secured' ? 'Mission Secured' : status === 'partial' ? 'Integrity Vulnerable' : 'Breached',
        reactionTitle,
        reactionDetail,
        attackerOutcome,
        systemOutcome,
        whyItHappened,
        nextHint,
        hud: [
          { label: 'Confidentiality', value: confidential ? 'Protected' : 'Exposed', level: confidential ? 'good' : 'bad' },
          { label: 'Integrity', value: integrityProtected ? 'GCM Tag Active' : 'No Tamper Check', level: integrityProtected ? 'good' : 'bad' },
          { label: 'Wire Tamper', value: isTamper ? (secured ? 'Caught ✓' : 'Corrupted!') : 'Intact', level: !isTamper || secured ? 'good' : 'bad' },
        ],
        inspectorTitle: 'Live Café Router Packet Capture (Your Message)',
        inspectorLines: [
          { label: 'Wire Payload', value: wireHex, tone: confidential ? 'good' : 'bad' },
          { label: 'Attacker Sees', value: attackerOutcome, tone: secured ? 'good' : 'bad' },
          { label: 'Bob’s Screen', value: bobScreen, tone: !secured && isTamper ? 'bad' : 'good' },
        ],
        scene,
      };
    },
  },

  // =========================================================================
  // MISSION 02: CAMPUS PORTAL DATABASE BREACH
  // =========================================================================
  {
    id: 'm2-portal',
    num: '02',
    title: 'Campus Portal DB Breach',
    scenarioLabel: 'Scenario 02 · Portal Login Breach',
    brief:
      'Set Alice’s and Sam’s signup passwords yourself, watch their live database rows change as you toggle hashing + salting, test live server logins, and defend against a stolen SQL dump.',
    goal: 'Make identical passwords hash differently, verify a live login using Alice’s stored salt, and stall the 8× GPU Rig.',
    defaultConfig: {
      storage: 'plaintext',
      saltMode: 'none',
    },
    defaultAction: 'sqldump',
    workoutTasks: [
      { id: 'm2-t1', label: 'Run Rainbow Table on identical passwords under SHA-256 (No Salt)' },
      { id: 'm2-t2', label: 'Enable Unique Salt + Argon2id & test a live login in the Verifier Bench below' },
      { id: 'm2-t3', label: 'Launch the 8× GPU Rig against your hardened Argon2id + Salt database' },
    ],
    controls: [
      {
        id: 'storage',
        label: '1. Password Storage Method',
        options: [
          { value: 'plaintext', label: 'Plaintext Column' },
          { value: 'aes-db', label: 'AES Encrypt (App Key)' },
          { value: 'sha256', label: 'Fast Hash (SHA-256)' },
          { value: 'argon2', label: 'Argon2id (Memory-Hard)' },
        ],
      },
      {
        id: 'saltMode',
        label: '2. Per-User Salt Strategy',
        options: [
          { value: 'none', label: 'No Salt' },
          { value: 'shared', label: 'Same Salt for Everyone' },
          { value: 'unique', label: 'Unique 128-bit Salt / User' },
        ],
      },
    ],
    actions: [
      {
        id: 'sqldump',
        label: 'Dump SQL Table',
        icon: 'database',
        tone: 'attack',
        description: 'Exfiltrate Alice & Sam’s stored database rows',
      },
      {
        id: 'rainbow',
        label: 'Run Rainbow Table',
        icon: 'zap',
        tone: 'attack',
        description: 'Look up pre-computed hashes in 40 milliseconds',
      },
      {
        id: 'gpu',
        label: 'Launch 8× GPU Rig',
        icon: 'flame',
        tone: 'attack',
        description: 'Brute-force your stored rows offline at GPU speed',
      },
    ],
    evaluate: (cfg, action, workout) => {
      const { storage, saltMode } = cfg;
      const uniqueSalt = saltMode === 'unique';
      const isPlain = storage === 'plaintext';
      const isAes = storage === 'aes-db';
      const isSha = storage === 'sha256';
      const isArgon = storage === 'argon2';

      const aliceSalt = fnv1aHex(`alice:${workout.m2SaltSeed}`).slice(0, 6);
      const samSalt = fnv1aHex(`sam:${workout.m2SaltSeed}`).slice(0, 6);
      const aliceRow = computeMission2Row(workout.m2AlicePw, storage, saltMode, aliceSalt);
      const samRow = computeMission2Row(workout.m2SamPw, storage, saltMode, samSalt);
      const rowsMatch = aliceRow === samRow;

      const rainbowBlocked = isArgon || (isSha && uniqueSalt);
      const gpuBlocked = isArgon && uniqueSalt;
      const secured = isArgon && uniqueSalt;

      const status: 'vulnerable' | 'partial' | 'secured' = secured
        ? 'secured'
        : (isSha && uniqueSalt) || (isArgon && !uniqueSalt)
          ? 'partial'
          : 'vulnerable';

      const crackTime = isPlain
        ? '0 ms (instant)'
        : isAes
          ? '0.2 s (app key leaked)'
          : isSha && !uniqueSalt
            ? '0.04 s (Rainbow Table)'
            : isSha && uniqueSalt
              ? '4 minutes (12B H/s GPU)'
              : isArgon && !uniqueSalt
                ? 'Duplicate hashes leak!'
                : '> 140 years (RAM-bound)';

      let reactionTitle = '';
      let reactionDetail = '';
      let whyItHappened = '';
      let nextHint = '';

      if (isPlain) {
        reactionTitle = `Plaintext leaked! Attacker immediately saw "${workout.m2AlicePw}" & "${workout.m2SamPw}"`;
        reactionDetail =
          'No cracking needed — your student passwords sat readable inside `students_auth`. Switch to a one-way KDF and unique salt.';
        whyItHappened = 'Servers only need to verify passwords on login, never recover them.';
        nextHint = 'Try SHA-256 (No Salt) first to witness duplicate hashes, then upgrade to Argon2id + Unique Salt.';
      } else if (isAes) {
        reactionTitle = 'Reversible AES failed — attacker grabbed K_app from the server config!';
        reactionDetail =
          'Because encryption is two-way, stealing the web server’s key decrypted every student row back to plaintext in under a second.';
        whyItHappened = 'Passwords require ONE-WAY hashing, never reversible encryption.';
        nextHint = 'Switch from AES Encrypt to Argon2id (Memory-Hard) + Unique 128-bit Salt.';
      } else if (isSha && !uniqueSalt) {
        reactionTitle = rowsMatch
          ? 'Identical hashes! Rainbow Table cracked both Alice & Sam in 40 ms!'
          : 'Unsalted SHA-256 is still vulnerable to instant Rainbow Table lookups!';
        reactionDetail = rowsMatch
          ? `Both Alice and Sam chose "${workout.m2AlicePw}", producing the EXACT same hash (${aliceRow.slice(0, 22)}). One Rainbow Table lookup unlocked both accounts instantly!`
          : 'Even with different passwords, unsalted SHA-256 lets attackers match stolen hashes against pre-built dictionaries in milliseconds.';
        whyItHappened = 'Deterministic unsalted hashes always map the same password to the exact same digest.';
        nextHint = 'Enable "Unique 128-bit Salt / User" and watch Alice & Sam’s hashes immediately diverge!';
      } else if (isSha && uniqueSalt) {
        reactionTitle =
          action === 'gpu'
            ? 'Unique salt beat Rainbow Tables, BUT 8× GPU cracked fast SHA-256 in 4 minutes!'
            : 'Unique salts separated Alice & Sam — now click "Launch 8× GPU Rig"!';
        reactionDetail =
          action === 'gpu'
            ? 'SHA-256 runs at 12 billion guesses/second on modern GPUs, brute-forcing human passwords in minutes even with salts.'
            : 'Alice and Sam now have totally different digests even with the same password. Test an offline GPU rig to see why fast hashes aren’t enough.';
        whyItHappened = 'Fast file hashes (SHA-256) lack memory/CPU cost to slow down parallel GPU cracking.';
        nextHint = 'Switch from fast SHA-256 to Argon2id (Memory-Hard), then test a live login below!';
      } else if (isArgon && !uniqueSalt) {
        reactionTitle = 'Argon2id is slow, BUT without unique salts identical passwords STILL collide!';
        reactionDetail =
          'Alice and Sam still share an identical database hash when using the same password — attackers immediately spot duplicate accounts.';
        whyItHappened = 'Always pair a memory-hard KDF with a unique random per-user salt.';
        nextHint = 'Turn on "Unique 128-bit Salt / User" to complete the defense.';
      } else {
        reactionTitle = 'Mission Secured! Unique Salts + Argon2id Defeat Both Rainbow Tables & GPUs!';
        reactionDetail =
          'Alice and Sam’s rows look completely unrelated even with identical passwords, and Argon2id’s 64 MB RAM requirement drops GPU cracking to ~120 H/s (> 140 years). Try testing Alice’s live login in the Workout Bench below!';
        whyItHappened = 'Unique random salt breaks pre-computed tables; Argon2id memory-hardness breaks parallel GPUs.';
        nextHint = 'Test a wrong password and right password in the Login Verifier below, or advance to Mission 03!';
      }

      const scene: StageScene = {
        entities: {
          portal: block(-15, -2, {
            color: secured ? 'green' : 'blue',
            glyph: 'server',
            label: ['Campus', 'Portal'],
            sub: isArgon ? 'Argon2id' : isSha ? 'SHA-256' : isAes ? 'AES key' : 'raw SQL',
            tags: [
              {
                text: workout.m2LoginResult
                  ? workout.m2LoginResult.ok
                    ? 'Login Verified ✓'
                    : 'Login Denied ✕'
                  : uniqueSalt
                    ? '+ Unique Salt'
                    : 'No Unique Salt',
                tone: workout.m2LoginResult ? (workout.m2LoginResult.ok ? 'green' : 'amber') : uniqueSalt ? 'green' : 'red',
                icon: uniqueSalt ? 'sparkles' : 'alert',
              },
            ],
          }),
          database: db(0, -2, {
            label: ['students_auth', 'Table'],
            sub: secured ? 'salted Argon2id' : isSha ? 'fast hashes' : 'compromised',
            tags: [
              {
                text: rowsMatch ? 'Alice == Sam!' : 'Alice ≠ Sam ✓',
                tone: rowsMatch ? 'red' : 'green',
                icon: rowsMatch ? 'alert' : 'check',
              },
            ],
          }),
          attacker: hackerNode(
            15,
            -2,
            action === 'gpu' ? '8× RTX GPU Rig' : action === 'rainbow' ? 'Rainbow Table' : 'SQL Dumper',
            [
              {
                text: secured ? 'Stalled (>140 yrs)' : crackTime,
                tone: secured ? 'green' : 'red',
                icon: secured ? 'shield' : 'flame',
              },
            ],
            { heat: secured ? 0 : 0.9 }
          ),
          statusCard: panel({ x: 0, y: 10 }, 'YOUR LIVE DB ROWS', [
            `Alice: ${aliceRow.slice(0, 28)}`,
            `Sam:   ${samRow.slice(0, 28)}`,
            `Crack: ${crackTime}`,
          ]),
        },
        links: {
          pd: link('portal', 'database', ['portal', 'database'], {
            label: isArgon ? 'Argon2id + salt' : isSha ? 'SHA-256' : isAes ? 'AES(K_app)' : 'plaintext',
            labelTone: secured ? 'green' : isSha && uniqueSalt ? 'amber' : 'red',
          }),
          da: link('database', 'attacker', ['database', 'attacker'], {
            style: 'dashed',
            label: action === 'gpu' ? 'GPU offline crack' : action === 'rainbow' ? 'table lookup' : 'SQL dump stolen',
            labelTone: secured ? 'green' : 'red',
            fail: secured ? 0.9 : 0,
          }),
        },
        flows: [
          { route: ['pd'], kind: secured ? 'msg' : isPlain ? 'mine' : 'write', rate: 0.8 },
          { route: ['da'], kind: secured ? 'slow' : 'poison', rate: secured ? 0.25 : 1.1 },
        ],
      };

      return {
        status,
        statusLabel:
          status === 'secured' ? 'Database Hardened' : status === 'partial' ? 'Partially Hardened' : 'Accounts Cracked',
        reactionTitle,
        reactionDetail,
        attackerOutcome: secured ? 'Stalled at 120 H/s (> 140 years)' : `Cracked in ${crackTime}`,
        systemOutcome: secured ? 'Accounts safe despite full SQL breach' : 'Student passwords exposed',
        whyItHappened,
        nextHint,
        hud: [
          { label: 'Duplicate Check', value: rowsMatch ? 'Alice == Sam!' : 'Unique Rows ✓', level: rowsMatch ? 'bad' : 'good' },
          { label: 'Rainbow Tables', value: rainbowBlocked ? 'Defeated ✓' : 'Vulnerable', level: rainbowBlocked ? 'good' : 'bad' },
          { label: 'GPU Crack Time', value: crackTime, level: gpuBlocked ? 'good' : isSha && uniqueSalt ? 'warn' : 'bad' },
        ],
        inspectorTitle: 'Live `students_auth` Table (Reflecting Your Typed Passwords)',
        inspectorLines: [
          { label: `Alice ("${workout.m2AlicePw.slice(0, 14)}")`, value: aliceRow, tone: secured ? 'good' : rowsMatch ? 'bad' : 'warn' },
          { label: `Sam ("${workout.m2SamPw.slice(0, 14)}")`, value: samRow, tone: secured ? 'good' : rowsMatch ? 'bad' : 'warn' },
          { label: 'Crack Estimate', value: crackTime, tone: secured ? 'good' : 'bad' },
        ],
        scene,
      };
    },
  },

  // =========================================================================
  // MISSION 03: AIRPORT FREE WI-FI BANKING (EVIL-TWIN MITM)
  // =========================================================================
  {
    id: 'm3-bank',
    num: '03',
    title: 'Airport Wi-Fi Banking',
    scenarioLabel: 'Scenario 03 · Airport Wi-Fi Banking',
    brief:
      'Enter your own bank wire amount on Terminal 4 Airport Wi-Fi, inspect the presented X.509 certificate yourself (Trust vs Reject), and tune your own live ECDHE ephemeral secret `a` to verify Forward Secrecy.',
    goal: 'Reject the Evil-Twin forged cert via Root CA AND negotiate an Ephemeral ECDHE key that survives Harvest-Now attacks.',
    defaultConfig: {
      transport: 'http',
      caCheck: 'ignore',
      keyExchange: 'static-rsa',
    },
    defaultAction: 'eviltwin',
    workoutTasks: [
      { id: 'm3-t1', label: 'Inspect the Evil-Twin cert below & see what happens if you click "Trust Anyway"' },
      { id: 'm3-t2', label: 'Enforce Trusted Root CA + TLS 1.3 & slide your own ECDHE secret a to derive key S' },
      { id: 'm3-t3', label: 'Enable Ephemeral ECDHE & run "Harvest Now, Leak Key Later" to verify Forward Secrecy' },
    ],
    controls: [
      {
        id: 'transport',
        label: '1. Connection Protocol',
        options: [
          { value: 'http', label: 'Plain HTTP (Port 80)' },
          { value: 'tls13', label: 'HTTPS / TLS 1.3' },
        ],
      },
      {
        id: 'caCheck',
        label: '2. Browser Certificate Policy',
        options: [
          { value: 'ignore', label: 'Allow "Proceed Anyway"' },
          { value: 'strict', label: 'Enforce Trusted Root CA' },
        ],
      },
      {
        id: 'keyExchange',
        label: '3. Handshake Key Agreement',
        options: [
          { value: 'static-rsa', label: 'Static Server RSA Key' },
          { value: 'ecdhe', label: 'Ephemeral ECDHE (PFS)' },
        ],
      },
    ],
    actions: [
      {
        id: 'eviltwin',
        label: 'Evil-Twin Fake Cert',
        icon: 'wifi',
        tone: 'attack',
        description: 'Rogue airport hotspot presents a self-signed bank.example cert',
      },
      {
        id: 'harvest',
        label: 'Harvest Now, Leak Key Later',
        icon: 'clock',
        tone: 'attack',
        description: 'Record encrypted session today & steal server key next year',
      },
      {
        id: 'transfer',
        label: 'Wire Funds to Bank',
        icon: 'creditCard',
        tone: 'test',
        description: 'Run your live banking transfer over Airport Wi-Fi',
      },
    ],
    evaluate: (cfg, action, workout) => {
      const isTls = cfg.transport === 'tls13';
      const caStrict = cfg.caCheck === 'strict' && workout.m3CertDecision !== 'trust';
      const hasPfs = cfg.keyExchange === 'ecdhe';
      const amt = `$${workout.m3Amount || '2500'}`;

      // Live DH math using student's own secret a
      const p = 23;
      const g = 5;
      const a = workout.m3ClientSecretA;
      const bankBPriv = 15;
      const clientPubA = modPow(g, a, p);
      const bankPubB = modPow(g, bankBPriv, p);
      const sharedS = modPow(bankPubB, a, p);

      const mitmBlocked = isTls && caStrict;
      const forwardSecret = isTls && hasPfs;
      const secured = mitmBlocked && forwardSecret;

      const status: 'vulnerable' | 'partial' | 'secured' = secured
        ? 'secured'
        : mitmBlocked
          ? 'partial'
          : 'vulnerable';

      let reactionTitle = '';
      let reactionDetail = '';
      let whyItHappened = '';
      let nextHint = '';

      if (!isTls) {
        reactionTitle = `Your ${amt} transfer traveled in plaintext across Evil-Twin Airport Wi-Fi!`;
        reactionDetail = `Over plain HTTP, the rogue router read your session cookie and redirected your ${amt} transfer with zero cryptographic resistance.`;
        whyItHappened = 'HTTP offers neither encryption nor server identity checks.';
        nextHint = 'Switch Connection Protocol to HTTPS / TLS 1.3 and inspect the certificate below.';
      } else if (!caStrict) {
        reactionTitle = `Fake Certificate Trusted! Evil-Twin intercepted your ${amt} wire!`;
        reactionDetail = `Because the untrusted self-signed certificate was accepted, your browser negotiated encryption directly with Mallory! She decrypted your ${amt} transfer and changed the recipient account.`;
        whyItHappened = 'Encrypting to an unverified imposter gives you a padlock straight to the hacker.';
        nextHint = 'Click "Reject Fake Cert" in the Cert Inspector below and set Browser Policy to "Enforce Trusted Root CA".';
      } else if (!hasPfs) {
        reactionTitle =
          action === 'harvest'
            ? `Evil-Twin blocked, BUT leaking the static RSA key exposed your past ${amt} transfer!`
            : 'Evil-Twin blocked! Now test "Harvest Now, Leak Key Later" to see why Static RSA fails.';
        reactionDetail =
          action === 'harvest'
            ? `Even though the Evil-Twin was blocked, Eve recorded the ciphertext. When the bank’s static RSA private key leaked a year later, she decrypted your past ${amt} transaction!`
            : 'Root CA verification stopped the imposter cold. Switch to Ephemeral ECDHE so each session uses a throwaway key!';
        whyItHappened = 'Static RSA reuses the server’s long-term key to wrap session secrets — no Forward Secrecy.';
        nextHint = 'Switch Handshake Key Agreement to "Ephemeral ECDHE (PFS)" and slide your own secret `a` below!';
      } else {
        reactionTitle =
          action === 'harvest'
            ? `Mission Secured! Throwaway ECDHE key (S=${sharedS}) kept your ${amt} recording unbreakable!`
            : `Mission Secured! Evil-Twin Blocked + Live ECDHE Secret S=${sharedS} protects ${amt}`;
        reactionDetail = `Your browser rejected the forged cert via the Root CA, and your ephemeral secret a=${a} (public share A=${clientPubA}) derived throwaway session key S=${sharedS} with the real bank — erased immediately after checkout.`;
        whyItHappened = 'TLS 1.3 pairs CA certificate identity (anti-MITM) with ephemeral ECDHE (Forward Secrecy).';
        nextHint = 'Try sliding your ECDHE secret `a` below to watch A and S recompute live, or move to Mission 04!';
      }

      const scene: StageScene = {
        entities: {
          traveler: device(-16, -2, {
            form: 'laptop',
            label: 'Traveler',
            tags: [
              {
                text: !isTls ? `${amt} HTTP Open` : caStrict ? `Root CA ✓ (A=${clientPubA})` : 'Fake Cert Trusted!',
                tone: mitmBlocked ? 'green' : 'red',
                icon: mitmBlocked ? 'shield' : 'alert',
              },
            ],
          }),
          hotspot: hackerNode(
            0,
            -2,
            'Evil-Twin Wi-Fi',
            [
              {
                text: !isTls
                  ? `Stole ${amt}!`
                  : !caStrict
                    ? `Hijacked ${amt}!`
                    : action === 'harvest' && !hasPfs
                      ? 'Decrypted Recording!'
                      : 'Fake Cert Rejected ✓',
                tone: secured ? 'green' : !mitmBlocked || (action === 'harvest' && !hasPfs) ? 'red' : 'amber',
                icon: secured ? 'ban' : 'wifi',
              },
            ],
            { heat: secured ? 0 : 0.85 }
          ),
          bank: block(16, -2, {
            color: 'purple',
            glyph: 'building',
            label: ['bank.example', 'Vault'],
            sub: hasPfs ? `ECDHE S=${sharedS}` : isTls ? 'Static RSA' : 'Port 80',
            tags: [
              {
                text: hasPfs ? `PFS Active (${amt})` : 'No Forward Secrecy',
                tone: forwardSecret ? 'green' : 'amber',
                icon: 'key',
              },
            ],
          }),
          ca: block(0, 10, {
            color: caStrict ? 'green' : 'slab',
            glyph: 'fileKey',
            s: 3.4,
            h: 34,
            label: ['Trusted', 'Root CA'],
            sub: caStrict ? 'chain verified' : 'bypassed!',
            tags: [
              {
                text: caStrict ? 'Blocks Self-Signed ✓' : 'Ignored by User',
                tone: caStrict ? 'green' : 'red',
                icon: caStrict ? 'circleCheck' : 'alert',
              },
            ],
          }),
        },
        links: {
          th: link('traveler', 'hotspot', ['traveler', 'hotspot'], {
            label: !isTls ? 'HTTP plain' : caStrict ? 'CA check → kill fake' : 'MITM fake TLS',
            labelTone: mitmBlocked ? 'green' : 'red',
            fail: mitmBlocked && action === 'eviltwin' ? 0.92 : 0,
          }),
          hb: link('hotspot', 'bank', ['hotspot', 'bank'], {
            label: secured ? `TLS 1.3 (S=${sharedS})` : !mitmBlocked ? 'MITM proxy' : 'static RSA',
            labelTone: secured ? 'green' : mitmBlocked ? 'amber' : 'red',
          }),
          tc: link('traveler', 'ca', ['traveler', 'ca'], {
            style: 'dashed',
            label: caStrict ? 'verify X.509 sig' : 'bypassed',
            labelTone: caStrict ? 'green' : 'red',
          }),
        },
        flows: [
          {
            route: ['th', 'hb'],
            kind: !isTls ? 'mine' : !caStrict ? 'poison' : action === 'eviltwin' ? 'kill' : 'empty',
            rate: 0.95,
          },
          { route: ['tc'], kind: caStrict ? 'msg' : 'fail', rate: 0.7 },
        ],
      };

      return {
        status,
        statusLabel:
          status === 'secured' ? 'Banking Secured' : status === 'partial' ? 'No Forward Secrecy' : 'MITM Hijacked',
        reactionTitle,
        reactionDetail,
        attackerOutcome: secured
          ? 'Fake cert rejected & recordings permanently unreadable'
          : !mitmBlocked
            ? `Hijacked session & stole ${amt} transfer`
            : 'Unlocked recorded session after server key leak',
        systemOutcome: secured ? `Authentic TLS 1.3 (S=${sharedS}) protects ${amt}` : 'Banking session exposed',
        whyItHappened,
        nextHint,
        hud: [
          { label: 'Cert Trust', value: mitmBlocked ? 'Root CA Verified ✓' : 'Spoofed / None', level: mitmBlocked ? 'good' : 'bad' },
          { label: 'ECDHE Key', value: forwardSecret ? `A=${clientPubA} → S=${sharedS}` : 'Static / None', level: forwardSecret ? 'good' : 'bad' },
          { label: 'Transfer', value: secured ? `${amt} Safe ✓` : `${amt} At Risk`, level: secured ? 'good' : mitmBlocked ? 'warn' : 'bad' },
        ],
        inspectorTitle: 'Live X.509 Certificate & ECDHE Math Trace',
        inspectorLines: [
          {
            label: 'Presented Cert',
            value:
              action === 'eviltwin'
                ? 'CN=bank.example | Issuer=EvilTwin_SelfSigned (UNTRUSTED)'
                : 'CN=bank.example | Issuer=DigiCert Global Root G2 (TRUSTED)',
            tone: action === 'eviltwin' && !caStrict ? 'bad' : 'good',
          },
          {
            label: 'Your ECDHE Math',
            value: `Client a=${a} → A = 5^${a} mod 23 = ${clientPubA} | Bank B=${bankPubB} → Shared S = ${sharedS}`,
            tone: forwardSecret ? 'good' : 'warn',
          },
          {
            label: 'Wire Outcome',
            value: secured ? `Transfer ${amt} sealed & verified ✓` : `Transfer ${amt} vulnerable!`,
            tone: secured ? 'good' : 'bad',
          },
        ],
        scene,
      };
    },
  },

  // =========================================================================
  // MISSION 04: SOFTWARE UPDATE SUPPLY-CHAIN ATTACK
  // =========================================================================
  {
    id: 'm4-update',
    num: '04',
    title: 'Software Update Hijack',
    scenarioLabel: 'Scenario 04 · Software Updates',
    brief:
      'Edit even 1 single character inside the mirror’s `AppInstaller_v4.2.pkg` payload yourself to witness real SHA-256 avalanche, sign the official release in an offline HSM, and run the OS verifier!',
    goal: 'Sign the official build in an offline HSM, tamper 1 byte on the mirror, and make the OS Verifier block the Trojan.',
    defaultConfig: {
      verifyMode: 'none',
      keyLocation: 'cdn',
    },
    defaultAction: 'trojan',
    workoutTasks: [
      { id: 'm4-t1', label: 'Edit 1 character in the Mirror Installer box below to trigger real SHA-256 avalanche' },
      { id: 'm4-t2', label: 'Try "Check SHA-256 on Same CDN" + "Attacker Re-Hashes Mirror" to see the mirror trap' },
      { id: 'm4-t3', label: 'Switch to Ed25519 + Offline HSM, sign official build & run OS Signature Verifier' },
    ],
    controls: [
      {
        id: 'verifyMode',
        label: '1. OS Pre-Install Verification',
        options: [
          { value: 'none', label: 'Install Directly (No Check)' },
          { value: 'mirror-hash', label: 'Check SHA-256 on Same CDN' },
          { value: 'ed25519', label: 'Verify Ed25519 Digital Signature' },
        ],
      },
      {
        id: 'keyLocation',
        label: '2. Publisher Private Signing Key',
        options: [
          { value: 'cdn', label: 'Stored on CDN Mirror Server' },
          { value: 'hsm', label: 'Offline Hardware Security Module (HSM)' },
        ],
      },
    ],
    actions: [
      {
        id: 'trojan',
        label: 'Inject 1-Byte Trojan',
        icon: 'bug',
        tone: 'attack',
        description: 'Modify 1 byte inside the mirror installer binary',
      },
      {
        id: 'rehash',
        label: 'Attacker Re-Hashes Mirror',
        icon: 'refresh',
        tone: 'attack',
        description: 'Hacker overwrites SHA256SUMS.txt on the hacked mirror',
      },
      {
        id: 'clean',
        label: 'Download Official Build',
        icon: 'packageCheck',
        tone: 'test',
        description: 'Restore untouched official release and verify',
      },
    ],
    evaluate: (cfg, action, workout) => {
      const { verifyMode, keyLocation } = cfg;
      const usesSig = verifyMode === 'ed25519';
      const usesHsm = keyLocation === 'hsm';
      const usesHashOnly = verifyMode === 'mirror-hash';
      const secured = usesSig && usesHsm;

      const payloadTampered = workout.m4MirrorPayload !== workout.m4OfficialPayload;
      const isAttack = action !== 'clean' || payloadTampered;

      const officialHash = workout.m4OfficialHash.slice(0, 24);
      const mirrorHash = isAttack
        ? (payloadTampered ? workout.m4MirrorHash : fnv1aHex(workout.m4OfficialPayload + ':trojan') + 'a4f69b22').slice(0, 24)
        : officialHash;

      const status: 'vulnerable' | 'partial' | 'secured' = secured
        ? 'secured'
        : usesHashOnly && action === 'trojan' && !payloadTampered
          ? 'partial'
          : 'vulnerable';

      let reactionTitle = '';
      let reactionDetail = '';
      let whyItHappened = '';
      let nextHint = '';

      if (verifyMode === 'none') {
        reactionTitle = 'Trojan installer ran with root privileges — zero verification configured!';
        reactionDetail =
          'Your OS executed the downloaded binary from the compromised mirror without checking either its hash or publisher signature.';
        whyItHappened = 'Public download mirrors are untrusted infrastructure and can be compromised.';
        nextHint = 'Edit 1 character in the Mirror Installer below, then test plain SHA-256 vs Ed25519 + HSM.';
      } else if (usesHashOnly) {
        reactionTitle =
          action === 'rehash'
            ? 'Trap! Hacker replaced SHA256SUMS.txt on the mirror — OS trusted the Trojan!'
            : 'Plain mirror hash caught raw corruption — now click "Attacker Re-Hashes Mirror"!';
        reactionDetail =
          action === 'rehash'
            ? `Because the hacker owns the mirror, they updated the mirror’s checksum file to ${mirrorHash.slice(0, 12)}… matching their Trojan. The OS saw a match and ran the malware!`
            : 'Anyone can run SHA-256 on malware! Click "Attacker Re-Hashes Mirror" to see why hashes alone cannot prove publisher identity.';
        whyItHappened = 'A hash proves data didn’t accidentally flip, NOT who created it.';
        nextHint = 'Switch to "Verify Ed25519 Digital Signature" paired with an Offline HSM.';
      } else if (usesSig && !usesHsm) {
        reactionTitle = 'Hacker stole the Publisher Private Key right off the CDN server!';
        reactionDetail =
          'Storing the signing key on the same public CDN mirror let the attacker validly sign their Trojanized installer with your own publisher key!';
        whyItHappened = 'Private signing keys must stay air-gapped inside a Hardware Security Module (HSM).';
        nextHint = 'Move Publisher Private Signing Key to "Offline Hardware Security Module (HSM)".';
      } else {
        reactionTitle = isAttack
          ? 'Mission Secured! Ed25519 Signature Mismatch Caught & Quarantined the Trojan!'
          : 'Mission Secured! Official Release Signature σ Verified Cleanly!';
        reactionDetail = isAttack
          ? `Your 1-character change flipped the SHA-256 digest from ${officialHash.slice(0, 10)}… to ${mirrorHash.slice(0, 10)}…. Because the private key is sealed inside the Offline HSM, the attacker cannot forge a matching Ed25519 signature — the OS blocked the installer before execution!`
          : `The OS hashed the downloaded binary (${officialHash.slice(0, 10)}…), verified signature σ with the embedded Publisher Public Key, and confirmed authenticity!`;
        whyItHappened = 'Asymmetric digital signatures + offline HSM protect updates even when every CDN mirror is hacked.';
        nextHint = 'Try editing 1 character in the Mirror Installer below and clicking "Run OS Signature Verifier"!';
      }

      const scene: StageScene = {
        entities: {
          hsm: keyVault(
            -16,
            -2,
            usesHsm ? 'Offline HSM' : 'CDN Key (Risk!)',
            [
              {
                text: usesHsm ? 'Private Key Locked' : 'Key Exposed on CDN!',
                tone: usesHsm ? 'green' : 'red',
                icon: usesHsm ? 'lock' : 'alert',
              },
            ],
            { color: usesHsm ? 'yellow' : 'orange' }
          ),
          mirror: hackerNode(
            0,
            -2,
            'CDN Mirror',
            [
              {
                text: !isAttack
                  ? 'Official v4.2.pkg'
                  : action === 'rehash'
                    ? 'Trojan + Fake Hash!'
                    : 'Tampered Binary!',
                tone: !isAttack ? 'green' : 'red',
                icon: !isAttack ? 'packageCheck' : 'bug',
              },
            ],
            { heat: !isAttack || secured ? 0 : 0.9 }
          ),
          laptop: device(16, -2, {
            form: 'laptop',
            label: 'User OS Updater',
            tags: [
              {
                text: !isAttack
                  ? 'Verified · Installed ✓'
                  : secured
                    ? 'SIG MISMATCH · BLOCKED!'
                    : 'TROJAN EXECUTED!',
                tone: !isAttack || secured ? 'green' : 'red',
                icon: !isAttack || secured ? 'shield' : 'skull',
              },
            ],
          }),
          digest: panel({ x: 0, y: 10 }, 'LIVE INSTALLER DIGESTS', [
            `Official: ${officialHash.slice(0, 20)}`,
            `Mirror:   ${mirrorHash.slice(0, 20)}`,
            `Verdict:  ${!isAttack ? 'MATCH ✓' : secured ? 'QUARANTINED ✓' : 'MALWARE RAN!'}`,
          ]),
        },
        links: {
          hm: link('hsm', 'mirror', ['hsm', 'mirror'], {
            label: usesHsm ? 'signed release + σ' : 'private key leaked!',
            labelTone: usesHsm ? 'green' : 'red',
          }),
          ml: link('mirror', 'laptop', ['mirror', 'laptop'], {
            label: !isAttack ? 'clean build + σ' : secured ? 'Trojan blocked!' : 'Trojan installed!',
            labelTone: !isAttack || secured ? 'green' : 'red',
            fail: isAttack && secured ? 0.95 : 0,
          }),
        },
        flows: [
          { route: ['hm'], kind: usesHsm ? 'push' : 'poison', rate: 0.7 },
          { route: ['ml'], kind: !isAttack ? 'msg' : secured ? 'kill' : 'poison', rate: 0.95 },
        ],
      };

      return {
        status,
        statusLabel:
          status === 'secured' ? 'Supply Chain Secured' : status === 'partial' ? 'Mirror Trust Flaw' : 'Malware Executed',
        reactionTitle,
        reactionDetail,
        attackerOutcome: secured ? 'Cannot forge HSM signature — Trojan quarantined' : 'Trojan bypassed verification',
        systemOutcome: secured ? 'OS rejected modified binary before execution' : 'Device compromised',
        whyItHappened,
        nextHint,
        hud: [
          { label: 'Digest Match', value: isAttack ? 'Mismatch (Avalanche)' : 'Exact Match ✓', level: isAttack ? 'warn' : 'good' },
          { label: 'Signing Key', value: secured ? 'Offline HSM ✓' : usesSig ? 'Stolen on CDN' : 'None', level: secured ? 'good' : 'bad' },
          { label: 'OS Verdict', value: !isAttack ? 'Installed ✓' : secured ? 'Blocked ✓' : 'Infected!', level: !isAttack || secured ? 'good' : 'bad' },
        ],
        inspectorTitle: 'Live Real-Time SHA-256 & Ed25519 Verifier',
        inspectorLines: [
          { label: 'Official SHA-256', value: officialHash, tone: 'good' },
          { label: 'Mirror SHA-256', value: mirrorHash, tone: isAttack ? 'bad' : 'good' },
          {
            label: 'OS Verifier',
            value: !isAttack
              ? 'Signature σ verified with embedded Publisher Public Key ✓'
              : secured
                ? 'verify(PubKey, mirrorHash, σ) === FALSE → Installer deleted!'
                : 'Unverified / forged binary executed!',
            tone: !isAttack || secured ? 'good' : 'bad',
          },
        ],
        scene,
      };
    },
  },

  // =========================================================================
  // MISSION 05: CLOUD HOSPITAL VAULT & TAP-TO-PAY REPLAY DEFENSE
  // =========================================================================
  {
    id: 'm5-vault',
    num: '05',
    title: 'Cloud Vault & Tap-to-Pay',
    scenarioLabel: 'Scenario 05 · Cloud Vault & Pay',
    brief:
      'Paint on the hospital’s 6×6 X-Ray scan yourself to witness ECB pattern leaks vs GCM noise, then operate the live Tap-to-Pay POS Terminal below — send a genuine tap and replay it yourself to see your wallet get drained vs protected!',
    goal: 'Eliminate X-ray ECB leaks, isolate keys in Hardware KMS, and block your own live Tap-to-Pay replay attempts.',
    defaultConfig: {
      cipherMode: 'ecb',
      keyArch: 'in-bucket',
      replayGuard: 'none',
    },
    defaultAction: 'replay',
    workoutTasks: [
      { id: 'm5-t1', label: 'Paint on the mini X-Ray grid under AES-ECB, then switch to AES-GCM + Hardware KMS' },
      { id: 'm5-t2', label: 'Click "Replay Captured Tap" below BEFORE enabling Nonce Ledger — watch charges stack up!' },
      { id: 'm5-t3', label: 'Enable One-Time Nonce Ledger & click "Replay Captured Tap" again to watch it blocked ($0 extra)' },
    ],
    controls: [
      {
        id: 'cipherMode',
        label: '1. X-Ray File Cipher Mode',
        options: [
          { value: 'ecb', label: 'AES-256-ECB' },
          { value: 'gcm', label: 'AES-256-GCM (Unique Nonce)' },
        ],
      },
      {
        id: 'keyArch',
        label: '2. Storage Key Architecture',
        options: [
          { value: 'in-bucket', label: 'Store Key Inside Cloud Bucket' },
          { value: 'kms', label: 'Envelope Encryption (Hardware KMS)' },
        ],
      },
      {
        id: 'replayGuard',
        label: '3. Tap-to-Pay Freshness Guard',
        options: [
          { value: 'none', label: 'None (Static Encrypted Packet)' },
          { value: 'timestamp-only', label: '5-Min Timestamp Only' },
          { value: 'nonce-ledger', label: 'One-Time Nonce Ledger + Timestamp' },
        ],
      },
    ],
    actions: [
      {
        id: 'bucketleak',
        label: 'Leak Cloud Bucket',
        icon: 'database',
        tone: 'attack',
        description: 'Download the hospital’s encrypted cloud storage bucket',
      },
      {
        id: 'replay',
        label: 'Simulate 5× Tap Replay',
        icon: 'replay',
        tone: 'attack',
        description: 'Re-broadcast a captured valid encrypted payment tap',
      },
      {
        id: 'bruteforce',
        label: 'Brute-Force AES-256',
        icon: 'cpu',
        tone: 'attack',
        description: 'Attempt guessing the 256-bit key across 2²⁵⁶ keys',
      },
    ],
    evaluate: (cfg, action, workout) => {
      const noEcbLeak = cfg.cipherMode === 'gcm';
      const kmsSafe = cfg.keyArch === 'kms';
      const replayBlocked = cfg.replayGuard === 'nonce-ledger';
      const secured = noEcbLeak && kmsSafe && replayBlocked;
      const score = (noEcbLeak ? 1 : 0) + (kmsSafe ? 1 : 0) + (replayBlocked ? 1 : 0);

      const status: 'vulnerable' | 'partial' | 'secured' = secured
        ? 'secured'
        : score >= 1
          ? 'partial'
          : 'vulnerable';

      const amt = workout.m5PayAmount || 50;
      const totalChargedDisplay = `$${workout.m5TotalCharged} (${workout.m5AcceptedTaps}× charged, ${workout.m5BlockedReplays} blocked)`;

      let reactionTitle = '';
      let reactionDetail = '';
      let whyItHappened = '';
      let nextHint = '';

      if (action === 'bruteforce' && noEcbLeak && kmsSafe) {
        reactionTitle = '2²⁵⁶ Brute-Force Impossible — would outlast the universe!';
        reactionDetail =
          'With AES-256-GCM and keys isolated in Hardware KMS, guessing the 256-bit key directly is mathematically hopeless.';
        whyItHappened = 'AES-256 has 1.15 × 10⁷⁷ possible keys.';
        nextHint = replayBlocked
          ? 'All defenses verified! Try clicking "Replay Captured Tap" in your live POS Terminal below.'
          : 'Your vault resisted brute force, but your wallet is still vulnerable to Replay Attacks! Enable the Nonce Ledger.';
      } else if (!noEcbLeak && (action === 'bucketleak' || !kmsSafe)) {
        reactionTitle = 'AES-ECB leaked your X-Ray drawing silhouette even WITHOUT the key!';
        reactionDetail =
          'Look at your mini X-Ray canvas below: identical pixel blocks mapped to identical ciphertext blocks, exposing the patient scan shape directly in the leaked bucket!';
        whyItHappened = 'ECB mode is deterministic and preserves repeating spatial structure.';
        nextHint = 'Switch X-Ray File Cipher Mode from AES-256-ECB to AES-256-GCM.';
      } else if (!kmsSafe) {
        reactionTitle = 'Bucket thief copied your encryption key right next to the encrypted scans!';
        reactionDetail =
          'Storing the data key inside the same leaked S3 bucket let the thief unlock every hospital record immediately.';
        whyItHappened = 'Keys must live in an isolated Hardware KMS separate from cloud storage blobs.';
        nextHint = 'Switch Storage Key Architecture to "Envelope Encryption (Hardware KMS)".';
      } else if (!replayBlocked) {
        reactionTitle =
          cfg.replayGuard === 'timestamp-only'
            ? `5-Min Timestamp failed! Replayed $${amt} taps drained your wallet ($${workout.m5TotalCharged})!`
            : `Valid encrypted $${amt} packet replayed! Wallet charged $${workout.m5TotalCharged}!`;
        reactionDetail =
          'Even though the payment packet is strongly encrypted, resending the exact same valid ciphertext charges the customer again and again! Click "Replay Captured Tap" below to see charges pile up.';
        whyItHappened = 'Encryption hides payment data, but only a One-Time Nonce Ledger prevents valid packets from being replayed.';
        nextHint = 'Set Tap-to-Pay Freshness Guard to "One-Time Nonce Ledger + Timestamp", then try replaying a tap below!';
      } else {
        reactionTitle = `Mission Secured! Vault Private + Nonce Ledger Blocked ${Math.max(1, workout.m5BlockedReplays)} Duplicate Tap(s)!`;
        reactionDetail =
          `Your X-Ray scan is pure static under AES-GCM + Hardware KMS, and your Tap-to-Pay terminal rejected duplicate copies of nonce ${workout.m5ActiveNonce} with $0 extra charged!`;
        whyItHappened = 'Defense-in-depth unites randomized AEAD, isolated KMS keys, and unique Nonce Ledgers.';
        nextHint = 'Try clicking "Send Fresh Tap" and "Replay Captured Tap" in the live POS Terminal below!';
      }

      const scene: StageScene = {
        entities: {
          vault: db(-15, -2, {
            label: ['Hospital', 'Cloud Bucket'],
            sub: noEcbLeak ? 'AES-GCM blobs' : 'ECB pattern leak!',
            tags: [
              {
                text: !noEcbLeak ? 'X-Ray Visible!' : kmsSafe ? 'Opaque Noise ✓' : 'Key in Bucket!',
                tone: noEcbLeak && kmsSafe ? 'green' : 'red',
                icon: noEcbLeak && kmsSafe ? 'lock' : 'alert',
              },
            ],
          }),
          kms: keyVault(
            -15,
            10,
            kmsSafe ? 'Hardware KMS' : 'Exposed Key File',
            [
              {
                text: kmsSafe ? 'Isolated Master Key' : 'Copied by Thief!',
                tone: kmsSafe ? 'green' : 'red',
                icon: kmsSafe ? 'shield' : 'skull',
              },
            ],
            { color: kmsSafe ? 'yellow' : 'orange' }
          ),
          wallet: device(0, -2, {
            form: 'phone',
            label: `Wallet ($${amt})`,
            tags: [
              {
                text: replayBlocked ? `Nonce ${workout.m5ActiveNonce}` : 'Replayable Packet!',
                tone: replayBlocked ? 'green' : 'red',
                icon: replayBlocked ? 'hash' : 'alert',
              },
            ],
          }),
          attacker: hackerNode(
            0,
            10,
            action === 'bucketleak' ? 'Bucket Thief' : action === 'bruteforce' ? 'Brute-Forcer' : 'Replay Sniffer',
            [
              {
                text: secured
                  ? `${workout.m5BlockedReplays} Replays Blocked ✓`
                  : !replayBlocked
                    ? `Drained $${workout.m5TotalCharged}!`
                    : !kmsSafe
                      ? 'Stole Bucket Key!'
                      : 'Sees ECB X-Ray!',
                tone: secured ? 'green' : 'red',
                icon: secured ? 'ban' : 'replay',
              },
            ],
            { heat: secured ? 0 : 0.85 }
          ),
          ledger: block(15, -2, {
            color: replayBlocked ? 'green' : 'orange',
            glyph: 'creditCard',
            label: ['Payment', 'Nonce Ledger'],
            sub: `$${workout.m5TotalCharged} total`,
            tags: [
              {
                text: replayBlocked ? `Dupes Blocked (${workout.m5BlockedReplays}) ✓` : `Charged ${workout.m5AcceptedTaps}×!`,
                tone: replayBlocked ? 'green' : 'red',
                icon: replayBlocked ? 'circleCheck' : 'alert',
              },
            ],
          }),
        },
        links: {
          vk: link('vault', 'kms', ['vault', 'kms'], {
            style: 'dashed',
            label: kmsSafe ? 'KMS envelope wrap' : 'key leaked w/ data',
            labelTone: kmsSafe ? 'green' : 'red',
          }),
          wl: link('wallet', 'ledger', ['wallet', 'ledger'], {
            label: replayBlocked ? 'nonce verified 1×' : `charged ${workout.m5AcceptedTaps}×!`,
            labelTone: replayBlocked ? 'green' : 'red',
          }),
          al: link('attacker', 'ledger', ['attacker', 'ledger'], {
            style: 'dashed',
            label: 'replayed packet',
            labelTone: replayBlocked ? 'green' : 'red',
            fail: replayBlocked ? 0.95 : 0,
          }),
        },
        flows: [
          { route: ['vk'], kind: kmsSafe ? 'write' : 'poison', rate: 0.7 },
          { route: ['wl'], kind: replayBlocked ? 'msg' : 'empty', rate: 0.85 },
          { route: ['al'], kind: replayBlocked ? 'kill' : 'poison', rate: 1.0 },
        ],
      };

      return {
        status,
        statusLabel:
          status === 'secured' ? 'Vault & Wallet Secured' : status === 'partial' ? `${score}/3 Defenses Active` : 'Double Breach',
        reactionTitle,
        reactionDetail,
        attackerOutcome: secured
          ? `Bucket unreadable & ${workout.m5BlockedReplays} duplicate tap(s) killed`
          : !replayBlocked
            ? `Replayed $${amt} tap → drained $${workout.m5TotalCharged}`
            : !noEcbLeak
              ? 'Read X-ray silhouette from ECB ciphertext'
              : 'Decrypted bucket using leaked key file',
        systemOutcome: secured ? 'Records private at rest & wallet protected' : 'Active vulnerability remains',
        whyItHappened,
        nextHint,
        hud: [
          { label: 'X-Ray Privacy', value: noEcbLeak && kmsSafe ? 'GCM + KMS ✓' : !noEcbLeak ? 'ECB Leak!' : 'Key Exposed!', level: noEcbLeak && kmsSafe ? 'good' : 'bad' },
          { label: 'Replay Guard', value: replayBlocked ? 'Nonce Ledger ✓' : 'Vulnerable', level: replayBlocked ? 'good' : 'bad' },
          { label: 'Wallet Charged', value: `$${workout.m5TotalCharged}`, level: replayBlocked && workout.m5AcceptedTaps <= 1 ? 'good' : 'bad' },
        ],
        inspectorTitle: 'Live Hospital Bucket & Tap-to-Pay Nonce Ledger',
        inspectorLines: [
          { label: 'Latest POS Event', value: workout.m5LastTerminalEvent, tone: replayBlocked ? 'good' : 'warn' },
          { label: 'Active Nonce', value: `nonce:${workout.m5ActiveNonce} · amount:$${amt}`, tone: 'good' },
          { label: 'Ledger Tally', value: totalChargedDisplay, tone: replayBlocked ? 'good' : 'bad' },
        ],
        scene,
      };
    },
  },
];
