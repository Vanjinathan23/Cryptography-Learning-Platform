import {
  Lesson,
  block,
  cipherBlock,
  db,
  device,
  hackerNode,
  keyVault,
  link,
  panel,
  queue,
  ring,
  zone,
} from './cryptoHelpers';

/**
 * SCENARIO 5: Hospital Cloud Vault & Smart Mobile Payments
 * Real-world setting:
 * - Parts 1 & 2: Hospital encrypts patient MRI/X-Ray scans (AES Block Modes: ECB Pattern
 *   Leak vs GCM) and stores them in Cloud Storage with isolated Hardware KMS Key Rotation.
 * - Parts 3 & 4: Smart Mobile Wallet ($200 UPI/Payment transfer) using one-time Nonces &
 *   Sequence Numbers to defeat Replay Attacks + 256-bit key space vs Brute-Force GPU clusters.
 */

export const lessonVaultEcbVsGcm: Lesson = {
  id: 'vault-ecb-vs-gcm',
  title: '1. Inside AES: X-Ray Scan Pattern Leak',
  summary:
    'A hospital encrypts patient X-ray scans using AES-256 — yet the bones are still visible in the ciphertext! Peek inside AES modes to fix the ECB trap with GCM.',
  minutes: 8,
  level: 'intermediate',
  metrics: ['algorithm', 'confidentiality', 'attackerSees', 'keySpace'],
  legend: [
    ['mine', '16-byte image blocks'],
    ['poison', 'Identical ECB blocks (pattern!)'],
    ['empty', 'Randomized GCM blocks'],
    ['ping', 'Fresh Nonce + Counter'],
  ],
  goals: [
    { text: 'See AES slice files into 16-byte (4×4) blocks across 14 rounds', step: 0 },
    { text: 'Discover why ECB mode exposes repeated image backgrounds', step: 1 },
    { text: 'Fix the leak with AES-GCM (Nonce + Counter randomization)', step: 2 },
  ],
  steps: [
    {
      short: 'AES Rounds',
      chapter: 'setup',
      title: 'How AES-256 scrambles each 16-byte block',
      body: [
        'City Hospital encrypts patient MRI and X-ray scans before uploading them to the cloud. <span class="term">AES-256</span> chops each image into 16-byte chunks (a 4×4 byte matrix) and runs <b>14 rounds</b> of <code>SubBytes → ShiftRows → MixColumns → AddRoundKey</code>.',
        'Individually, every single 16-byte block is unbreakable. Yet choosing the wrong <b>block cipher mode</b> can still betray patient privacy!',
      ],
      metrics: {
        algorithm: 'AES-256',
        confidentiality: 'Protected',
        attackerSees: 'Random Bytes',
        keySpace: '2^256',
      },
      scene: {
        entities: {
          doc: device(-14, 0, { form: 'laptop', label: 'Radiology', tags: [{ text: 'chest_xray.dcm', icon: 'file' }] }),
          blocks: queue(-4, 0, 4, [1, 0], { label: '16-byte blocks' }),
          aes: cipherBlock(9, 0, ['AES-256', '14 Rounds'], 'Sub · Shift · Mix · XOR', [
            { text: '4×4 state matrix', tone: 'violet', icon: 'boxes' },
          ]),
        },
        links: {
          db: link('doc', 'blocks', ['doc', 'blocks'], { label: 'slice into 16 B' }),
          ba: link('blocks', 'aes', ['blocks', 'aes'], { label: '14 rounds' }),
        },
        flows: [
          { route: ['db'], kind: 'mine', rate: 0.9 },
          { route: ['ba'], kind: 'empty', rate: 0.9 },
        ],
      },
    },
    {
      short: 'ECB Leak',
      chapter: 'problem',
      title: 'The ECB Trap: identical X-ray pixels stay visibly recognizable',
      body: [
        'In <span class="term">ECB (Electronic Codebook) mode</span>, every 16-byte block is encrypted independently with the same key. All dark background pixels look identical before encryption — so they produce the <b>exact same ciphertext block</b> after encryption!',
        'Just like the famous "ECB Penguin", an observer viewing the encrypted cloud file can still clearly see the silhouette of the patient’s chest scan!',
      ],
      callout: {
        kind: 'warn',
        text: 'Never use AES-ECB! Even military-grade AES-256 leaks visual structure if identical blocks map to identical ciphertext.',
      },
      changes: ['− Two identical pixel blocks B1 == B2 output identical ciphertext C1 == C2', '− Visual outline of X-ray scan leaks to attacker'],
      metrics: {
        algorithm: 'AES-256-ECB',
        confidentiality: 'Leaked Pattern',
        attackerSees: 'Patterns!',
        keySpace: '2^256',
      },
      scene: {
        entities: {
          b1: block(-12, -6, { color: 'blue', glyph: 'file', s: 3.4, h: 32, label: ['Pixel Blk 1'], sub: '00 00 00 00…' }),
          b2: block(-12, 6, { color: 'blue', glyph: 'file', s: 3.4, h: 32, label: ['Pixel Blk 2'], sub: '00 00 00 00…' }),
          e1: cipherBlock(0, -6, ['AES-ECB'], 'same key', [], { s: 3.4, h: 32 }),
          e2: cipherBlock(0, 6, ['AES-ECB'], 'same key', [], { s: 3.4, h: 32 }),
          c1: block(12, -6, { color: 'orange', glyph: 'alert', s: 3.4, h: 32, label: ['a9 4f…'], tags: [{ text: 'same output!', tone: 'red', icon: 'eye' }] }),
          c2: block(12, 6, { color: 'orange', glyph: 'alert', s: 3.4, h: 32, label: ['a9 4f…'], tags: [{ text: 'shape visible!', tone: 'red', icon: 'eye' }] }),
        },
        links: {
          l1: link('b1', 'e1', ['b1', 'e1']),
          l2: link('e1', 'c1', ['e1', 'c1']),
          l3: link('b2', 'e2', ['b2', 'e2']),
          l4: link('e2', 'c2', ['e2', 'c2']),
        },
        flows: [
          { route: ['l1', 'l2'], kind: 'poison', rate: 0.8 },
          { route: ['l3', 'l4'], kind: 'poison', rate: 0.8 },
        ],
      },
    },
    {
      short: 'GCM Fix',
      chapter: 'solution',
      title: 'Fix: AES-256-GCM turns every pixel block into pure snow',
      body: [
        'Switching to <span class="term">AES-256-GCM</span> mixes a fresh <b>Nonce + incrementing Counter</b> (<code>ctr = 1, 2, 3…</code>) into every block. Identical background pixels now output completely unrelated random bytes — zero visual shape remains, and an integrated tag blocks tampering.',
      ],
      changes: ['+ Switched mode from ECB → AES-256-GCM', '+ Every block gets a unique Nonce + Counter keystream', '= Encrypted X-ray looks like pure TV static'],
      metrics: {
        algorithm: 'AES-256-GCM',
        confidentiality: 'Strong',
        attackerSees: 'Random Bytes',
        keySpace: '2^256',
      },
      scene: {
        entities: {
          nonce: block(-12, -10, { color: 'green', glyph: 'refresh', s: 3.2, h: 30, label: ['Nonce'], sub: 'fresh 96-bit' }),
          b1: block(-12, 0, { color: 'blue', glyph: 'file', s: 3.4, h: 32, label: ['Pixel Blk 1'], sub: 'ctr = 1' }),
          b2: block(-12, 9, { color: 'blue', glyph: 'file', s: 3.4, h: 32, label: ['Pixel Blk 2'], sub: 'ctr = 2' }),
          gcm: cipherBlock(1, 3, ['AES-GCM'], 'CTR + GHASH', [{ text: 'zero patterns · sealed', tone: 'green', icon: 'shield' }]),
          c1: block(13, -2, { color: 'green', glyph: 'lock', s: 3.4, h: 32, label: ['a9 4f…'] }),
          c2: block(13, 8, { color: 'green', glyph: 'lock', s: 3.4, h: 32, label: ['3d c1…'], sub: 'totally different!' }),
        },
        links: {
          n: link('nonce', 'gcm', ['nonce', 'gcm'], { label: 'nonce', labelTone: 'green' }),
          l1: link('b1', 'gcm', ['b1', 'gcm']),
          l2: link('b2', 'gcm', ['b2', 'gcm']),
          o1: link('gcm', 'c1', ['gcm', 'c1']),
          o2: link('gcm', 'c2', ['gcm', 'c2']),
        },
        flows: [
          { route: ['n'], kind: 'ping', rate: 0.7 },
          { route: ['l1', 'o1'], kind: 'empty', rate: 0.9 },
          { route: ['l2', 'o2'], kind: 'empty', rate: 0.9 },
        ],
      },
    },
  ],
};

export const lessonVaultKmsAtRest: Lesson = {
  id: 'vault-kms-at-rest',
  title: '2. Cloud Storage & KMS Key Separation',
  summary:
    'Even with HTTPS on the wire, what if a cloud storage bucket is accidentally exposed? Learn Envelope Encryption and Hardware KMS separation for data at rest.',
  minutes: 8,
  level: 'intermediate',
  metrics: ['dbState', 'keyType', 'attackerSees', 'attackRisk'],
  legend: [
    ['empty', 'Encrypted patient records'],
    ['write', 'Hardware KMS wrap / unwrap'],
    ['poison', 'Cloud bucket copied by thief'],
  ],
  goals: [
    { text: 'See why keeping the key next to encrypted data fails on disk theft', step: 0 },
    { text: 'Learn Envelope Encryption: per-file Data Keys wrapped by a KMS Master Key', step: 1 },
    { text: 'See how KMS enables instant key rotation without re-encrypting terabytes', step: 2 },
  ],
  steps: [
    {
      short: 'Bucket Leak',
      chapter: 'problem',
      title: 'When a cloud backup bucket is left public',
      body: [
        'TLS only protects data while moving across the internet. Once hospital scans land inside a cloud storage bucket, a single misconfigured permission can let a thief copy terabytes of files.',
        'And if the encryption key is stored inside the same server or bucket, the thief steals <b>both the lock and the key</b>.',
      ],
      metrics: {
        dbState: 'Plaintext / Exposed Key',
        keyType: 'Weak Separation',
        attackerSees: 'Patient Records!',
        attackRisk: 'Critical',
      },
      scene: {
        entities: {
          app: block(-13, -2, { color: 'blue', glyph: 'server', label: ['Hospital', 'App'] }),
          bucket: db(1, -2, { label: 'Cloud Bucket', heat: 0.75, tags: [{ text: 'public misconfig!', tone: 'red', icon: 'alert' }] }),
          thief: hackerNode(13, 8, 'Thief', [{ text: 'copies raw patient files!', tone: 'red', icon: 'eye' }]),
        },
        links: {
          ab: link('app', 'bucket', ['app', 'bucket'], { label: 'writes scans' }),
          bt: link('bucket', 'thief', ['bucket', 'thief'], { style: 'dashed', label: 'bucket dumped!', labelTone: 'red' }),
        },
        flows: [
          { route: ['ab'], kind: 'mine', rate: 0.8 },
          { route: ['bt'], kind: 'poison', rate: 0.9 },
        ],
      },
    },
    {
      short: 'Envelope KMS',
      chapter: 'solution',
      title: 'Envelope Encryption: isolate Master Keys inside a Hardware KMS',
      body: [
        'Each patient file gets its own random <b>Data Encryption Key (DEK)</b>. The file is encrypted with AES-GCM, and the tiny DEK is wrapped (encrypted) by a Master Key locked inside an isolated <span class="term">Key Management Service (KMS)</span>.',
        'The Master Key <b>never leaves the KMS hardware</b>. Even if the thief downloads the entire cloud bucket, every file is unreadable ciphertext — and rotating keys yearly only requires re-wrapping tiny kilobyte DEKs instead of terabytes of scans!',
      ],
      changes: [
        '+ Data encrypted at rest with per-file DEKs',
        '+ Master Key locked inside isolated Hardware KMS',
        '~ Stolen cloud backup yields only useless ciphertext',
      ],
      metrics: {
        dbState: 'Encrypted + KMS',
        keyType: '256-bit Envelope KMS',
        attackerSees: 'Useless Ciphertext',
        attackRisk: 'Mitigated',
      },
      scene: {
        entities: {
          app: block(-14, -2, { color: 'blue', glyph: 'server', label: ['Hospital', 'App'] }),
          bucket: db(0, -2, { label: 'Cloud Vault', tags: [{ text: 'AES-GCM + wrapped DEK', tone: 'green', icon: 'lock' }] }),
          kms: keyVault(0, -13, 'Hardware KMS', [{ text: 'Master Key never leaves', tone: 'green', icon: 'shield' }]),
          thief: hackerNode(13, 8, 'Thief', [{ text: 'steals ciphertext · useless!', tone: 'green', icon: 'eyeOff' }]),
        },
        links: {
          ab: link('app', 'bucket', ['app', 'bucket'], { label: 'encrypted scans', labelTone: 'green' }),
          bk: link('bucket', 'kms', ['bucket', 'kms'], { heads: 'both', label: 'wrap / unwrap DEK' }),
          bt: link('bucket', 'thief', ['bucket', 'thief'], { style: 'dashed', label: 'unreadable bytes' }),
        },
        flows: [
          { route: ['ab'], kind: 'empty', rate: 0.8 },
          { route: ['bk'], kind: 'write', rate: 0.5, bounce: true },
          { route: ['bt'], kind: 'empty', rate: 0.6 },
        ],
      },
    },
  ],
};

export const lessonWalletNonceFreshness: Lesson = {
  id: 'wallet-nonce-freshness',
  title: '3. One-Time Nonces for Smart Payments',
  summary:
    'Switch to a mobile payment app transferring $200. See how attaching a unique Transaction Nonce and Timestamp inside the auth tag guarantees every payment runs exactly once.',
  minutes: 7,
  level: 'advanced',
  metrics: ['replayGuard', 'integrity', 'algorithm', 'attackRisk'],
  legend: [
    ['empty', 'Encrypted payment packet'],
    ['ping', 'Unique Nonce + Timestamp'],
    ['msg', 'Ledger verified → Paid 1×'],
  ],
  goals: [
    { text: 'Understand why confidentiality + integrity alone don’t stop duplicates', step: 0 },
    { text: 'See Nonce + Timestamp + Sequence # sealed inside the AES-GCM / HMAC tag', step: 1 },
  ],
  steps: [
    {
      short: 'Nonce Stamp',
      chapter: 'technique',
      title: 'Stamp every mobile payment with a unique Nonce & Timestamp',
      body: [
        'Maya uses her mobile wallet app to send <code>$200</code> to a merchant. Encryption hides the amount and an auth tag prevents edits — but what stops someone from copying the entire valid packet and sending it again?',
        'To prove <b>freshness</b>, Maya’s app injects two fields inside the authenticated payload: a unique one-time <span class="term">Nonce / TxID</span> (<code>tx_88412</code>) and the exact current <b>Timestamp</b>.',
      ],
      metrics: {
        replayGuard: 'Unique Nonce Active',
        integrity: 'Verified',
        algorithm: 'AES-GCM + Nonce',
        attackRisk: 'Low',
      },
      scene: {
        entities: {
          maya: device(-14, 0, { form: 'phone', label: 'Maya’s Wallet', tags: [{ text: 'Pay $200 · tx_88412', tone: 'green', icon: 'creditCard' }] }),
          nonce: block(-2, -10, { color: 'green', glyph: 'clock', s: 3.3, h: 32, label: ['Nonce +', 'Time'], sub: 'tx_88412 · 14:02:09' }),
          gateway: cipherBlock(-2, 1, ['Payment', 'Gateway'], 'checks tag + nonce', [
            { text: 'freshness verified ✓', tone: 'green', icon: 'shield' },
          ]),
          ledger: db(13, 1, { label: 'Nonce Ledger', tags: [{ text: 'records tx_88412', tone: 'green', icon: 'circleCheck' }] }),
        },
        links: {
          mg: link('maya', 'gateway', ['maya', 'gateway'], { label: 'sealed payment' }),
          ng: link('nonce', 'gateway', ['nonce', 'gateway'], { label: 'unique tx_88412', labelTone: 'green' }),
          gl: link('gateway', 'ledger', ['gateway', 'ledger'], { heads: 'both', label: 'mark tx used' }),
        },
        flows: [
          { route: ['mg'], kind: 'empty', rate: 0.8 },
          { route: ['ng'], kind: 'ping', rate: 0.6 },
          { route: ['gl'], kind: 'msg', rate: 0.8, bounce: true },
        ],
      },
    },
    {
      short: 'Single Use',
      chapter: 'solution',
      title: 'Bank checks the Nonce Ledger before moving a single cent',
      body: [
        'When the Payment Gateway receives <code>tx_88412</code>, it performs 3 checks in order: (1) Valid AES-GCM / HMAC tag? (2) Timestamp within ±30 seconds? (3) Is <code>tx_88412</code> already in the Nonce Ledger?',
        'Only if all three pass does the bank transfer <code>$200</code> and permanently mark <code>tx_88412</code> as spent.',
      ],
      callout: {
        kind: 'next',
        text: 'Final subpart: <b>4. Replay & Brute-Force Attacks</b> — watch an attacker replay Maya’s valid packet 10 times and throw a supercomputer at her 256-bit key.',
      },
      metrics: {
        replayGuard: 'Unique Nonce Active',
        integrity: 'Verified',
        algorithm: 'AES-GCM + Ledger',
        attackRisk: 'Mitigated',
      },
      scene: {
        entities: {
          maya: device(-13, 0, { form: 'phone', label: 'Maya', tags: [{ text: 'Paid $200 (1×) ✓', tone: 'green', icon: 'check' }] }),
          gateway: cipherBlock(0, 0, ['Payment', 'Gateway'], '3-step check'),
          ledger: db(13, 0, { label: 'Nonce Ledger', tags: [{ text: 'tx_88412 = SPENT', tone: 'green', icon: 'lock' }] }),
        },
        links: {
          mg: link('maya', 'gateway', ['maya', 'gateway'], { heads: 'both', label: 'receipt', labelTone: 'green' }),
          gl: link('gateway', 'ledger', ['gateway', 'ledger'], { heads: 'both' }),
        },
        flows: [{ route: ['mg', 'gl'], kind: 'msg', rate: 0.9, bounce: true }],
      },
    },
  ],
};

export const lessonWalletReplayBruteforce: Lesson = {
  id: 'wallet-replay-bruteforce',
  title: '4. Replay & Brute-Force Attacks',
  summary:
    'The attacker can’t decrypt Maya’s $200 payment — so they replay the valid ciphertext 10 times and launch a brute-force key search. Watch both attacks fail completely.',
  minutes: 9,
  level: 'advanced',
  metrics: ['replayGuard', 'keySpace', 'attackerSees', 'attackRisk'],
  legend: [
    ['empty', 'Genuine payment #1'],
    ['poison', 'Replayed duplicate packets'],
    ['kill', 'Blocked by Nonce Ledger'],
    ['slow', 'Brute-force key tries'],
  ],
  goals: [
    { text: 'Watch a Replay Attack duplicate a valid encrypted payment packet', step: 0 },
    { text: 'See the Nonce Ledger drop every replayed duplicate instantly', step: 1 },
    { text: 'Appreciate why 2²⁵⁶ key space makes brute-force physically impossible', step: 2 },
  ],
  steps: [
    {
      short: 'Replay ×10',
      chapter: 'problem',
      title: 'Attack 1: Replaying Maya’s valid encrypted packet 10 times',
      body: [
        'Without a Nonce Ledger, Eve doesn’t need to crack AES at all! She simply records Maya’s genuine, properly signed <code>$200</code> packet on the network and fires the exact same bytes at the bank 10 times in a row.',
        'If the bank only checks encryption and signatures without tracking freshness, Maya gets billed <b>$2,000</b>!',
      ],
      metrics: {
        replayGuard: 'Vulnerable (None)',
        keySpace: '2^256',
        attackerSees: 'Replays Valid Packet!',
        attackRisk: 'Critical',
      },
      scene: {
        entities: {
          maya: device(-14, -4, { form: 'phone', label: 'Maya', tags: [{ text: 'sent 1× ($200)', icon: 'lock' }] }),
          eve: hackerNode(0, 9, 'Replay Bot', [{ text: 're-sends valid packet ×10!', tone: 'red', icon: 'replay' }], { heat: 0.8 }),
          bank: block(14, -4, { color: 'orange', glyph: 'building', label: ['Bank'], tags: [{ text: 'charged $2,000!', tone: 'red', icon: 'alert' }] }),
        },
        links: {
          mb: link('maya', 'bank', ['maya', 'bank'], { label: 'original tx_88412' }),
          me: link('maya', 'eve', ['maya', 'eve'], { style: 'dashed', label: 'copied' }),
          eb: link('eve', 'bank', ['eve', 'bank'], { label: 'replayed ×10!', labelTone: 'red' }),
        },
        flows: [
          { route: ['mb'], kind: 'empty', rate: 0.4 },
          { route: ['eb'], kind: 'poison', rate: 1.5 },
        ],
      },
    },
    {
      short: 'Replay Blocked',
      chapter: 'solution',
      title: 'Defense 1: Nonce Ledger rejects every replayed copy',
      body: [
        'With Maya’s <span class="term">Nonce Ledger</span> active, payment #1 (<code>tx_88412</code>) succeeds and is recorded. When Eve replays <code>tx_88412</code> 20 milliseconds later, the bank spots the duplicate nonce immediately and drops all 9 replays.',
        'And Eve cannot edit <code>tx_88412</code> to <code>tx_88413</code>, because the nonce is sealed inside the AES-GCM authentication tag!',
      ],
      changes: [
        '+ Nonce tx_88412 marked SPENT on first arrival',
        '+ All 9 replayed packets rejected instantly',
      ],
      metrics: {
        replayGuard: 'Nonce Blocked Replay ✓',
        keySpace: '2^256',
        attackerSees: 'Blocked',
        attackRisk: 'Mitigated',
      },
      scene: {
        entities: {
          maya: device(-14, -4, { form: 'phone', label: 'Maya', tags: [{ text: 'billed $200 (1×) ✓', tone: 'green', icon: 'check' }] }),
          eve: hackerNode(0, 9, 'Replay Bot', [{ text: 'replays tx_88412', tone: 'amber', icon: 'replay' }]),
          bank: block(14, -4, { color: 'green', glyph: 'shield', label: ['Bank', 'Nonce Guard'], tags: [{ text: '9 duplicates DROPPED', tone: 'green', icon: 'circleCheck' }] }),
        },
        links: {
          mb: link('maya', 'bank', ['maya', 'bank'], { label: 'tx_88412 (accepted 1×)', labelTone: 'green' }),
          eb: link('eve', 'bank', ['eve', 'bank'], { style: 'dashed', fail: 1, label: 'duplicate → DROPPED', labelTone: 'red' }),
        },
        flows: [
          { route: ['mb'], kind: 'empty', rate: 0.7 },
          { route: ['eb'], kind: 'kill', rate: 1.2 },
        ],
      },
    },
    {
      short: 'Brute-Force Math',
      chapter: 'recap',
      title: 'Defense 2: Why 2²⁵⁶ Key Space defeats every supercomputer',
      body: [
        'Frustrated, the attacker tries brute-forcing Maya’s 256-bit AES key by guessing keys one by one. Even if every computer on Earth tested <b>1 billion keys per second</b>, searching a 2²⁵⁶ key space would still take longer than <b>billions of lifetimes of the universe</b>.',
        `<ul class="takeaways">
          <li><b>Scenario 1:</b> Alice → Bob Messaging (AES-GCM, Routing, Sniffing &amp; Tampering)</li>
          <li><b>Scenario 2:</b> Campus Portal Breach (Hashing, Unique Salts &amp; Argon2id)</li>
          <li><b>Scenario 3:</b> Airport Wi-Fi Banking (Certificates, ECDHE &amp; TLS 1.3 MITM)</li>
          <li><b>Scenario 4:</b> Software Updates (SHA-256 Avalanche &amp; Digital Signatures)</li>
          <li><b>Scenario 5:</b> Cloud Vault &amp; Payments (ECB vs GCM, KMS, Nonces &amp; Brute-Force)</li>
        </ul>`,
      ],
      callout: {
        kind: 'insight',
        text: 'Congratulations! You’ve completed all 5 real-world cryptography scenarios. Try the <b>Crypto Lab</b> or <b>Practice</b> tab in the top bar to test your skills live!',
      },
      metrics: {
        replayGuard: 'Active',
        keySpace: '2^256 (Infeasible)',
        attackerSees: 'Blocked',
        attackRisk: 'Mitigated',
      },
      scene: {
        entities: {
          space: ring(0, 0, 8.8, {
            label: '2²⁵⁶ Key Space Ring',
            keys: [15, 45, 75, 105, 135, 165, 195, 225, 255, 285, 315, 345],
          }),
          gpu: hackerNode(-15, 0, 'GPU Rig', [{ text: '10¹⁸ tries/sec · still 0%', tone: 'green', icon: 'hourglass' }]),
          vault: cipherBlock(15, 0, ['256-Bit', 'AES-GCM'], 'unbreakable', [{ text: 'safe for billions of yrs', tone: 'green', icon: 'shield' }]),
          card: panel(
            { x: 0, y: -12, dx: 0, dy: -145 },
            'Brute-Force Reality Check',
            [
              'Caesar (26 keys)     : < 0.001 ms',
              '64-bit key (2⁶⁴)     : Hours on GPU rig',
              '= 128-bit / 256-bit  : Longer than universe age!',
            ],
            { icon: 'shield' }
          ),
        },
        links: {
          gv: link('gpu', 'vault', ['gpu', 'vault'], { style: 'dashed', fail: 1, label: 'brute-force infeasible', labelTone: 'green' }),
        },
        flows: [{ route: ['gv'], kind: 'slow', rate: 1.0 }],
      },
    },
  ],
};

export const SCENARIO_5_LESSONS: Lesson[] = [
  lessonVaultEcbVsGcm,
  lessonVaultKmsAtRest,
  lessonWalletNonceFreshness,
  lessonWalletReplayBruteforce,
];
