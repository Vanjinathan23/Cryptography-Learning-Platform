// Real interactive cryptography math & simulation utilities for the 4-Workbench Crypto Lab

export type LabAlgorithmId = 'aes-gcm' | 'caesar' | 'xor' | 'rsa';

export interface LabAlgorithmInfo {
  id: LabAlgorithmId;
  name: string;
  shortName: string;
  category: string;
  summary: string;
  keyLabel: string;
  defaultKey: string;
  strength: 'Weak (Educational)' | 'Demo Only' | 'Production Standard';
  supportsTag: boolean;
}

export const LAB_ALGORITHMS: LabAlgorithmInfo[] = [
  {
    id: 'aes-gcm',
    name: 'AES-256-GCM (Authenticated)',
    shortName: 'AES-256-GCM',
    category: 'Symmetric AEAD',
    summary: 'Modern authenticated encryption with unique nonce + 128-bit tamper-proof tag.',
    keyLabel: 'Shared Secret Key',
    defaultKey: 'alice-bob-shared-key-256',
    strength: 'Production Standard',
    supportsTag: true,
  },
  {
    id: 'caesar',
    name: 'Caesar Shift Cipher',
    shortName: 'Caesar',
    category: 'Classical',
    summary: 'Shifts each A–Z character forward by k places around the 26-letter ring.',
    keyLabel: 'Shift Key (1–25)',
    defaultKey: '3',
    strength: 'Weak (Educational)',
    supportsTag: false,
  },
  {
    id: 'xor',
    name: 'XOR Stream Cipher',
    shortName: 'XOR Stream',
    category: 'Stream Primitive',
    summary: 'XORs each byte of plaintext with the repeating key stream to produce hex bytes.',
    keyLabel: 'Stream Key',
    defaultKey: 'CRYPTO',
    strength: 'Demo Only',
    supportsTag: false,
  },
  {
    id: 'rsa',
    name: 'RSA Asymmetric (p=17, q=19)',
    shortName: 'RSA Public-Key',
    category: 'Asymmetric Public Key',
    summary: 'Locks each byte using Bob’s Public Key (e=5, n=323); only Private Key (d=173) unlocks.',
    keyLabel: 'Bob’s Public Key (e, n)',
    defaultKey: 'e=5, n=323',
    strength: 'Demo Only',
    supportsTag: false,
  },
];

// Modular exponentiation (base^exp % mod) safely
export function modPow(base: number, exp: number, mod: number): number {
  let result = 1;
  let b = ((base % mod) + mod) % mod;
  let e = exp;
  while (e > 0) {
    if (e % 2 === 1) result = (result * b) % mod;
    e = Math.floor(e / 2);
    b = (b * b) % mod;
  }
  return result;
}

// Fast deterministic 64-bit hex hash for instant synchronous simulation previews
export function fnv1aHex(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 ^= c + ((i * 31) & 255);
    h2 = Math.imul(h2, 0x85ebca6b) >>> 0;
  }
  return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
}

// Real Web Crypto SHA-256 digest
export async function sha256Hex(text: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buf = new TextEncoder().encode(text);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return fnv1aHex(text) + fnv1aHex(text + ':sha') + fnv1aHex(text + ':256') + fnv1aHex(text + ':end');
}

// Convert a 64-char hex digest into 256 binary bits (0 or 1)
export function hexToBits(hex: string): number[] {
  const clean = (hex || '').padEnd(64, '0').slice(0, 64);
  const bits: number[] = [];
  for (let i = 0; i < clean.length; i++) {
    const n = parseInt(clean[i], 16) || 0;
    bits.push((n >> 3) & 1, (n >> 2) & 1, (n >> 1) & 1, n & 1);
  }
  return bits;
}

export interface AvalancheDiff {
  bitsA: number[];
  bitsB: number[];
  diffMask: boolean[];
  changedBits: number;
  percentChanged: number;
}

export function computeAvalancheDiff(hexA: string, hexB: string): AvalancheDiff {
  const bitsA = hexToBits(hexA);
  const bitsB = hexToBits(hexB);
  let changedBits = 0;
  const diffMask = bitsA.map((b, i) => {
    const diff = b !== bitsB[i];
    if (diff) changedBits++;
    return diff;
  });
  return {
    bitsA,
    bitsB,
    diffMask,
    changedBits,
    percentChanged: Math.round((changedBits / 256) * 1000) / 10,
  };
}

export interface WireByteToken {
  index: number;
  originalHex: string;
  wireHex: string;
  tampered: boolean;
}

export interface CryptoSimulationResult {
  plaintext: string;
  ciphertext: string;
  wireBytes: WireByteToken[];
  nonce: string;
  authTag: string;
  expectedTag: string;
  wirePayload: string;
  attackerView: string;
  attackerCanRead: boolean;
  tamperDetected: boolean;
  bobOutput: string;
  reactionTitle: string;
  reactionTone: 'good' | 'warn' | 'bad';
  reactionDetail: string;
  mathSteps: string[];
}

export function runCryptoSimulation(opts: {
  algorithm: LabAlgorithmId;
  plaintext: string;
  key: string;
  nonceSeed: string;
  encryptEnabled: boolean;
  hackerMode: 'none' | 'sniff' | 'tamper';
  bobWrongKey: boolean;
  tamperedByteIndices?: number[];
}): CryptoSimulationResult {
  const {
    algorithm,
    plaintext,
    key,
    nonceSeed,
    encryptEnabled,
    hackerMode,
    bobWrongKey,
    tamperedByteIndices = [],
  } = opts;
  const msg = plaintext || 'Meet at Lab 4B at 5 PM';
  const safeKey = key || 'secret';
  const tamperedSet = new Set<number>(tamperedByteIndices);
  if (hackerMode === 'tamper' && tamperedSet.size === 0 && msg.length > 0) {
    tamperedSet.add(Math.min(2, msg.length - 1));
  }
  const hasWireTamper = tamperedSet.size > 0;

  if (!encryptEnabled) {
    const origBytes = Array.from(msg).map((ch) => ch.charCodeAt(0) & 0xff);
    const modBytes = origBytes.map((b, i) => (tamperedSet.has(i) ? (b === 32 ? 88 : b ^ 0x05) : b));
    const tamperedText = modBytes
      .map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '?'))
      .join('');
    const wireBytes: WireByteToken[] = origBytes.map((b, i) => ({
      index: i,
      originalHex: b.toString(16).padStart(2, '0'),
      wireHex: modBytes[i].toString(16).padStart(2, '0'),
      tampered: tamperedSet.has(i),
    }));

    return {
      plaintext: msg,
      ciphertext: msg,
      wireBytes,
      nonce: 'NONE',
      authTag: 'NONE',
      expectedTag: 'NONE',
      wirePayload: tamperedText,
      attackerView:
        hackerMode === 'none' && !hasWireTamper
          ? 'Wire is open — anyone on this router can read it.'
          : hasWireTamper
            ? `Modified byte(s) [${Array.from(tamperedSet).join(', ')}] → "${tamperedText}"`
            : `Read in clear text: "${msg}"`,
      attackerCanRead: true,
      tamperDetected: false,
      bobOutput: tamperedText,
      reactionTitle: hasWireTamper
        ? 'Unencrypted message silently corrupted in transit'
        : 'Plaintext exposed to every router on the internet',
      reactionTone: 'bad',
      reactionDetail: hasWireTamper
        ? `Without encryption or an authentication tag, flipping byte(s) [${Array.from(tamperedSet).join(', ')}] directly altered Bob’s screen to "${tamperedText}" with zero warning.`
        : `Encryption is OFF. Every café router, ISP switch, and passive sniffer can read "${msg}" word for word. Toggle Encryption ON to seal the packet.`,
      mathSteps: [
        'Encryption is OFF — UTF-8 bytes leave Alice’s laptop unprotected.',
        `Wire carries readable text: "${tamperedText}"`,
        hasWireTamper
          ? `Tampered bytes [${Array.from(tamperedSet).join(', ')}] landed on Bob’s screen silently.`
          : 'Turn Encryption ON or click any wire byte below to test live tampering.',
      ],
    };
  }

  if (algorithm === 'caesar') {
    const shift = (((parseInt(safeKey, 10) || 3) % 26) + 26) % 26 || 3;
    const shiftStr = (s: string, k: number) =>
      s
        .split('')
        .map((ch) => {
          const code = ch.charCodeAt(0);
          if (code >= 65 && code <= 90) return String.fromCharCode(((code - 65 + k + 26) % 26) + 65);
          if (code >= 97 && code <= 122) return String.fromCharCode(((code - 97 + k + 26) % 26) + 97);
          return ch;
        })
        .join('');
    const cipher = shiftStr(msg, shift);
    const origBytes = Array.from(cipher).map((c) => c.charCodeAt(0) & 0xff);
    const modChars = Array.from(cipher).map((ch, i) =>
      tamperedSet.has(i) ? (ch === 'Z' ? 'A' : 'Z') : ch
    );
    const wire = modChars.join('');
    const bobShift = bobWrongKey ? (shift + 5) % 26 : shift;
    const bobOut = shiftStr(wire, -bobShift);

    const wireBytes: WireByteToken[] = origBytes.map((b, i) => ({
      index: i,
      originalHex: b.toString(16).padStart(2, '0'),
      wireHex: (modChars[i].charCodeAt(0) & 0xff).toString(16).padStart(2, '0'),
      tampered: tamperedSet.has(i),
    }));

    return {
      plaintext: msg,
      ciphertext: cipher,
      wireBytes,
      nonce: 'NONE (deterministic)',
      authTag: 'NONE',
      expectedTag: 'NONE',
      wirePayload: wire,
      attackerView: `Brute-forced all 25 shifts in 0.02 ms → found k=${shift} → "${msg}"`,
      attackerCanRead: true,
      tamperDetected: false,
      bobOutput: bobOut,
      reactionTitle: 'Caesar cipher broken instantly (only 25 keys)',
      reactionTone: 'bad',
      reactionDetail: hasWireTamper
        ? `Eve cracked shift k=${shift} in under a millisecond AND Mallory’s wire edit silently corrupted Bob’s message to "${bobOut}" because Caesar has no authentication tag.`
        : `Even though "${cipher.slice(0, 18)}" looks scrambled to human eyes, a laptop tests all 25 possible shifts in 0.02 ms and reads Alice’s message immediately.`,
      mathSteps: [
        `Alice shifts letters by +${shift} mod 26: "${msg.slice(0, 14)}" → "${cipher.slice(0, 14)}"`,
        'Keyspace is only 25 keys — Eve recovers plaintext automatically.',
        bobWrongKey
          ? `Bob tried wrong shift (-${bobShift}) → garbled "${bobOut.slice(0, 18)}"`
          : `Bob shifts back by -${shift} mod 26 → "${bobOut}"`,
      ],
    };
  }

  if (algorithm === 'xor') {
    const encBytes = Array.from(msg).map((ch, i) => ch.charCodeAt(0) ^ safeKey.charCodeAt(i % safeKey.length));
    const hex = encBytes.map((b) => b.toString(16).padStart(2, '0')).join(' ');
    const modBytes = encBytes.map((b, i) => (tamperedSet.has(i) ? b ^ 0x01 : b));
    const wireHex = modBytes.map((b) => b.toString(16).padStart(2, '0')).join(' ');
    const bobKey = bobWrongKey ? safeKey + 'X' : safeKey;
    const bobOut = modBytes
      .map((b, i) => {
        const c = b ^ bobKey.charCodeAt(i % bobKey.length);
        return c >= 32 && c <= 126 ? String.fromCharCode(c) : '·';
      })
      .join('');

    const wireBytes: WireByteToken[] = encBytes.map((b, i) => ({
      index: i,
      originalHex: b.toString(16).padStart(2, '0'),
      wireHex: modBytes[i].toString(16).padStart(2, '0'),
      tampered: tamperedSet.has(i),
    }));

    return {
      plaintext: msg,
      ciphertext: hex,
      wireBytes,
      nonce: 'NONE',
      authTag: 'NONE (malleable!)',
      expectedTag: 'NONE',
      wirePayload: wireHex,
      attackerView: hasWireTamper
        ? `Flipped 1 bit in byte(s) [${Array.from(tamperedSet).join(', ')}] → Bob accepted corrupted text!`
        : `Sees hex bytes (${hex.slice(0, 26)}…) — cannot read directly, but repeating key leaks patterns.`,
      attackerCanRead: false,
      tamperDetected: false,
      bobOutput: bobOut,
      reactionTitle: hasWireTamper
        ? 'XOR malleability: bit-flip silently altered Bob’s text!'
        : bobWrongKey
          ? 'Wrong XOR key produced garbled characters'
          : 'XOR hides bytes, but has zero tamper protection',
      reactionTone: hasWireTamper || bobWrongKey ? 'bad' : 'warn',
      reactionDetail: hasWireTamper
        ? `In raw XOR stream ciphers, flipping 1 bit on the wire flips the exact same bit in Bob’s plaintext ("${bobOut}") without raising any error! Switch to AES-256-GCM to catch tampering.`
        : bobWrongKey
          ? `Bob decrypted with the wrong key stream and got "${bobOut}", with no tag to warn him the key was wrong.`
          : 'Try clicking any hex byte on the wire below to flip 1 bit — watch Bob accept the corrupted message silently.',
      mathSteps: [
        `Byte[0]: '${msg[0]}' (0x${msg.charCodeAt(0).toString(16)}) ⊕ '${safeKey[0]}' (0x${safeKey.charCodeAt(0).toString(16)}) = 0x${encBytes[0].toString(16).padStart(2, '0')}`,
        'Raw XOR is completely malleable — no authentication tag protects wire bytes.',
        hasWireTamper
          ? `Wire bit-flip changed Bob’s output to "${bobOut}" with zero alert.`
          : `Bob XORs with "${bobKey}" → "${bobOut}"`,
      ],
    };
  }

  if (algorithm === 'rsa') {
    const n = 323;
    const e = 5;
    const d = 173;
    const cipherNums = Array.from(msg).map((ch) => modPow(ch.charCodeAt(0), e, n));
    const modNums = cipherNums.map((num, i) => (tamperedSet.has(i) ? (num + 17) % n : num));
    const bobD = bobWrongKey ? 171 : d;
    const bobOut = modNums
      .map((c) => {
        const dec = modPow(c, bobD, n);
        return dec >= 32 && dec <= 126 ? String.fromCharCode(dec) : '□';
      })
      .join('');

    const wireBytes: WireByteToken[] = cipherNums.map((num, i) => ({
      index: i,
      originalHex: num.toString(16).padStart(3, '0'),
      wireHex: modNums[i].toString(16).padStart(3, '0'),
      tampered: tamperedSet.has(i),
    }));

    return {
      plaintext: msg,
      ciphertext: cipherNums.join(' '),
      wireBytes,
      nonce: 'Textbook RSA (needs OAEP)',
      authTag: 'Needs RSA-PSS Signature',
      expectedTag: 'NONE',
      wirePayload: modNums.join(' '),
      attackerView: hasWireTamper
        ? `Altered ciphertext numbers at [${Array.from(tamperedSet).join(', ')}] — Bob got garbled bytes!`
        : `Has Bob’s Public Key (e=5, n=323), sees [${cipherNums.slice(0, 5).join(', ')}…] — cannot invert without private key d!`,
      attackerCanRead: false,
      tamperDetected: false,
      bobOutput: bobOut,
      reactionTitle: hasWireTamper
        ? 'Textbook RSA corrupted without signature check'
        : bobWrongKey
          ? 'Wrong private key d=171 failed modular inverse'
          : 'Public key locked the message; only Bob’s private key d=173 unlocks it',
      reactionTone: hasWireTamper || bobWrongKey ? 'warn' : 'good',
      reactionDetail: hasWireTamper
        ? `Even though Eve cannot decrypt RSA ciphertext, modifying ciphertext number(s) [${Array.from(tamperedSet).join(', ')}] corrupted Bob’s decrypted bytes to "${bobOut}". Real systems wrap RSA with OAEP + signatures.`
        : bobWrongKey
          ? `Because e·d ≢ 1 (mod 288) for d=171, Bob’s decryption collapses into nonsense: "${bobOut.slice(0, 18)}".`
          : `Alice locked each byte with Bob’s public exponent e=5 (mod 323). Only Bob’s hidden private exponent d=173 reverses the modular power back to "${bobOut}".`,
      mathSteps: [
        `Public Key: (e=${e}, n=${n}) · Private Key: d=${d} (since 5×173 ≡ 1 mod 288)`,
        `Alice encrypts '${msg[0]}' (${msg.charCodeAt(0)}): ${msg.charCodeAt(0)}^${e} mod ${n} = ${cipherNums[0]}`,
        `Bob decrypts with d=${bobD}: ${modNums[0]}^${bobD} mod ${n} = ${modPow(modNums[0], bobD, n)}`,
      ],
    };
  }

  // AES-256-GCM simulated authenticated stream with byte-accurate tamper reaction
  const nonce = fnv1aHex(nonceSeed + ':nonce').slice(0, 12);
  const keyHash = fnv1aHex(safeKey + ':' + nonce);
  const keyBytes = Array.from(msg).map((_, i) => parseInt(fnv1aHex(`${keyHash}:${i}`).slice(0, 2), 16));
  const cipherBytes = Array.from(msg).map((ch, i) => ch.charCodeAt(0) ^ keyBytes[i]);
  const cipherHex = cipherBytes.map((b) => b.toString(16).padStart(2, '0')).join(' ');
  const authTag = fnv1aHex(`${safeKey}:${nonce}:${cipherHex}:gcm-tag`);

  const modBytes = cipherBytes.map((b, i) => (tamperedSet.has(i) ? b ^ 0x01 : b));
  const wireHex = modBytes.map((b) => b.toString(16).padStart(2, '0')).join(' ');

  const bobKey = bobWrongKey ? safeKey + '_wrong' : safeKey;
  const expectedTag = fnv1aHex(`${bobKey}:${nonce}:${wireHex}:gcm-tag`);
  const tagValid = expectedTag === authTag;

  const wireBytes: WireByteToken[] = cipherBytes.map((b, i) => ({
    index: i,
    originalHex: b.toString(16).padStart(2, '0'),
    wireHex: modBytes[i].toString(16).padStart(2, '0'),
    tampered: tamperedSet.has(i),
  }));

  const reactionTitle = !tagValid
    ? bobWrongKey
      ? 'Wrong decryption key detected — GCM tag mismatch'
      : `Tampering caught! Flipped byte(s) [${Array.from(tamperedSet).join(', ')}] rejected`
    : 'End-to-End Protected · Confidentiality + Integrity Verified';

  const reactionTone: 'good' | 'warn' | 'bad' = !tagValid ? (bobWrongKey ? 'bad' : 'good') : 'good';

  const reactionDetail = !tagValid
    ? bobWrongKey
      ? `Bob’s key produced Tag ${expectedTag.slice(0, 10)} ≠ ${authTag.slice(0, 10)}. AES-GCM immediately rejects the packet instead of displaying garbled text.`
      : `You flipped 1 bit in wire byte(s) [${Array.from(tamperedSet).join(', ')}]. Because GCM seals every byte into its 128-bit auth tag, Bob’s check (${expectedTag.slice(0, 10)} ≠ ${authTag.slice(0, 10)}) caught the forgery and dropped the packet before decryption!`
    : `Ciphertext looks like uniform random bytes to Eve, and Bob verified Auth Tag ${authTag.slice(0, 10)} before revealing "${msg}". Click any ciphertext byte below to flip 1 bit and watch GCM catch it!`;

  return {
    plaintext: msg,
    ciphertext: cipherHex,
    wireBytes,
    nonce,
    authTag,
    expectedTag,
    wirePayload: `[nonce:${nonce}] ${wireHex} [tag:${authTag.slice(0, 12)}]`,
    attackerView:
      hackerMode === 'none' && !hasWireTamper
        ? 'Wire carries sealed AES-256-GCM ciphertext.'
        : hasWireTamper
          ? `Flipped 1 bit on wire → Bob’s GCM tag check caught & dropped the packet!`
          : `Captured random noise: ${cipherHex.slice(0, 32)}… (0 bits of plaintext leaked)`,
    attackerCanRead: false,
    tamperDetected: !tagValid,
    bobOutput: tagValid ? msg : 'PACKET REJECTED · GCM AUTH TAG MISMATCH',
    reactionTitle,
    reactionTone,
    reactionDetail,
    mathSteps: [
      `Keystream derived from 256-bit Key + Unique Nonce (${nonce}).`,
      `Encrypted ${cipherBytes.length} bytes + sealed with 128-bit GHASH tag ${authTag.slice(0, 12)}.`,
      tagValid
        ? `Bob verified Tag ${expectedTag.slice(0, 12)} == ${authTag.slice(0, 12)} → Decrypted cleanly.`
        : `Bob computed Tag ${expectedTag.slice(0, 12)} ≠ ${authTag.slice(0, 12)} → Packet dropped immediately.`,
    ],
  };
}

// ==================== WORKBENCH 3: DIFFIE-HELLMAN LIVE MATH ====================

export interface DhSimulation {
  p: number;
  g: number;
  a: number;
  b: number;
  A: number;
  B: number;
  aliceSecret: number;
  bobSecret: number;
  mitmActive: boolean;
  caPinned: boolean;
  mallorySecretWithAlice: number | null;
  mallorySecretWithBob: number | null;
  reactionTitle: string;
  reactionTone: 'good' | 'warn' | 'bad';
  reactionDetail: string;
}

export function runDhSimulation(opts: {
  p: number;
  g: number;
  a: number;
  b: number;
  mitmActive: boolean;
  caPinned: boolean;
}): DhSimulation {
  const { p, g, a, b, mitmActive, caPinned } = opts;
  const A = modPow(g, a, p);
  const B = modPow(g, b, p);

  if (mitmActive && !caPinned) {
    const m = 7; // Mallory's private exponent
    const M = modPow(g, m, p);
    const sAlice = modPow(M, a, p);
    const sBob = modPow(M, b, p);
    return {
      p,
      g,
      a,
      b,
      A,
      B,
      aliceSecret: sAlice,
      bobSecret: sBob,
      mitmActive,
      caPinned,
      mallorySecretWithAlice: sAlice,
      mallorySecretWithBob: sBob,
      reactionTitle: 'MITM Attack Succeeded! Mallory holds TWO separate keys',
      reactionTone: 'bad',
      reactionDetail: `Unauthenticated Diffie-Hellman does not prove identity! Mallory substituted M=${M}, establishing S₁=${sAlice} with Alice and S₂=${sBob} with Bob. She decrypts every message, reads it, and re-encrypts it. Turn ON CA Certificate Verification to block her!`,
    };
  }

  const shared = modPow(B, a, p);

  if (mitmActive && caPinned) {
    return {
      p,
      g,
      a,
      b,
      A,
      B,
      aliceSecret: shared,
      bobSecret: shared,
      mitmActive,
      caPinned,
      mallorySecretWithAlice: null,
      mallorySecretWithBob: null,
      reactionTitle: 'Mallory Blocked by CA Certificate · Shared Secret S = ' + shared,
      reactionTone: 'good',
      reactionDetail: `Mallory tried to inject her own DH share, but could not sign it with the trusted CA certificate! Alice’s browser rejected Mallory and completed ECDHE directly with Bob, deriving S = ${shared}.`,
    };
  }

  return {
    p,
    g,
    a,
    b,
    A,
    B,
    aliceSecret: shared,
    bobSecret: shared,
    mitmActive,
    caPinned,
    mallorySecretWithAlice: null,
    mallorySecretWithBob: null,
    reactionTitle: `Identical Secret S = ${shared} Created in Public!`,
    reactionTone: 'good',
    reactionDetail: `Eve recorded p=${p}, g=${g}, A=${A}, and B=${B} on the open wire, yet Alice (${B}^${a} mod ${p} = ${shared}) and Bob (${A}^${b} mod ${p} = ${shared}) arrived at the exact same secret without ever transmitting it.`,
  };
}

// ==================== WORKBENCH 4: 8x8 VISUAL X-RAY ECB vs GCM ====================

export type PatternPresetId = 'xray' | 'heart' | 'shield' | 'smile';

export const PIXEL_PRESETS: Record<PatternPresetId, { label: string; grid: number[] }> = {
  xray: {
    label: 'Lung X-Ray',
    grid: [
      0, 0, 1, 1, 1, 1, 0, 0,
      0, 1, 0, 1, 1, 0, 1, 0,
      0, 1, 2, 1, 1, 2, 1, 0,
      0, 1, 2, 1, 1, 2, 1, 0,
      0, 1, 2, 1, 1, 2, 1, 0,
      0, 1, 0, 1, 1, 0, 1, 0,
      0, 0, 0, 1, 1, 0, 0, 0,
      0, 0, 1, 1, 1, 1, 0, 0,
    ],
  },
  heart: {
    label: 'Heart Scan',
    grid: [
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 2, 2, 0, 0, 2, 2, 0,
      2, 2, 2, 2, 2, 2, 2, 2,
      2, 2, 1, 2, 2, 2, 2, 2,
      0, 2, 2, 2, 2, 2, 2, 0,
      0, 0, 2, 2, 2, 2, 0, 0,
      0, 0, 0, 2, 2, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
    ],
  },
  shield: {
    label: 'Key Emblem',
    grid: [
      0, 0, 1, 1, 1, 1, 0, 0,
      0, 1, 2, 2, 2, 2, 1, 0,
      0, 1, 2, 0, 0, 2, 1, 0,
      0, 1, 2, 1, 1, 2, 1, 0,
      0, 1, 2, 2, 2, 2, 1, 0,
      0, 0, 1, 2, 2, 1, 0, 0,
      0, 0, 0, 1, 1, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
    ],
  },
  smile: {
    label: 'Face ID',
    grid: [
      0, 0, 1, 1, 1, 1, 0, 0,
      0, 1, 0, 0, 0, 0, 1, 0,
      1, 0, 2, 0, 0, 2, 0, 1,
      1, 0, 0, 0, 0, 0, 0, 1,
      1, 0, 2, 0, 0, 2, 0, 1,
      1, 0, 0, 2, 2, 0, 0, 1,
      0, 1, 0, 0, 0, 0, 1, 0,
      0, 0, 1, 1, 1, 1, 0, 0,
    ],
  },
};

export function encryptVisualGrid(
  grid: number[],
  mode: 'ecb' | 'gcm',
  nonceIndex: number
): { colors: string[]; hexBlocks: string[]; uniqueBlocks: number } {
  // Deterministic color mapping per ciphertext block
  const ecbPalette: Record<number, { color: string; hex: string }> = {
    0: { color: '#3b4a6b', hex: '9f4c' },
    1: { color: '#d97736', hex: 'e3a1' },
    2: { color: '#5fa876', hex: '1b80' },
  };
  const gcmSwatches = [
    '#2f4858', '#52657a', '#7c6f9c', '#9e5d52', '#4c7c66', '#b8863b', '#3f6a8a', '#6d5d7a',
    '#875b45', '#426b5c', '#a17440', '#58718c', '#734b5e', '#4c787e', '#8f7d4b', '#3a536b',
  ];

  const colors: string[] = [];
  const hexBlocks: string[] = [];
  const seen = new Set<string>();

  grid.forEach((val, idx) => {
    if (mode === 'ecb') {
      const hit = ecbPalette[val] || ecbPalette[0];
      colors.push(hit.color);
      hexBlocks.push(hit.hex);
      seen.add(hit.hex);
    } else {
      const h = fnv1aHex(`gcm:${nonceIndex}:${idx}:${val}`);
      const swatch = gcmSwatches[parseInt(h.slice(0, 2), 16) % gcmSwatches.length];
      const blockHex = h.slice(0, 4);
      colors.push(swatch);
      hexBlocks.push(blockHex);
      seen.add(blockHex);
    }
  });

  return { colors, hexBlocks, uniqueBlocks: seen.size };
}
