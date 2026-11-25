import {
  Lesson,
  block,
  cipherBlock,
  device,
  hackerNode,
  keyVault,
  link,
  panel,
  zone,
} from './cryptoHelpers';

/**
 * SCENARIO 4: OS Software Update & Supply-Chain Security
 * Real-world setting: A software company builds a 400 MB update and hosts it on public
 * mirror servers worldwide — SHA-256 Avalanche Effect, Private-Key Digital Signatures,
 * Public-Key Verification before install, and catching a compromised CDN Trojan.
 */

export const lessonUpdateAvalancheHash: Lesson = {
  id: 'update-avalanche-hash',
  title: '1. Fingerprinting the Installer',
  summary:
    'Before releasing OS Update v4.2 (400 MB) to public mirrors, the publisher creates a unique 256-bit SHA-256 fingerprint — sensitive to even a single altered bit.',
  minutes: 7,
  level: 'beginner',
  metrics: ['algorithm', 'avalanche', 'integrity', 'signatureStatus'],
  legend: [
    ['mine', '400 MB installer file'],
    ['msg', '256-bit SHA-256 digest'],
    ['poison', '1-byte modified file'],
  ],
  goals: [
    { text: 'See SHA-256 compress a 400 MB file into an exact 64-hex-char fingerprint', step: 0 },
    { text: 'Witness the Avalanche Effect when 1 single byte changes', step: 1 },
  ],
  steps: [
    {
      short: 'File Digest',
      chapter: 'setup',
      title: 'Step 1: Compute a 256-bit fingerprint of OS_Update_4.2.pkg',
      body: [
        'NovaOS builds a 400 MB security patch and uploads it to dozens of third-party university and CDN mirror servers around the world so downloads are fast.',
        'How can your laptop tell if a mirror altered even 1 byte? First, the build server hashes the entire 400 MB file with <span class="term">SHA-256</span> into a tiny 32-byte digest: <code>f3a9 1c80 44b2…</code>.',
      ],
      metrics: {
        algorithm: 'SHA-256',
        avalanche: '0% (original)',
        integrity: 'Verified',
        signatureStatus: 'Unsigned yet',
      },
      scene: {
        entities: {
          build: block(-13, 0, {
            color: 'blue',
            glyph: 'packageCheck',
            label: ['OS_4.2.pkg'],
            sub: '400 MB build',
            tags: [{ text: 'genuine release', tone: 'green', icon: 'check' }],
          }),
          sha: cipherBlock(0, 0, ['SHA-256', 'Digest'], 'hashes 400 MB', [
            { text: 'collision-resistant', tone: 'violet', icon: 'fingerprint' },
          ]),
          digest: block(13, 0, {
            color: 'green',
            glyph: 'hash',
            label: ['Digest'],
            sub: 'f3a9 1c80 44b2…',
            tags: [{ text: 'always 256 bits', tone: 'green', icon: 'hash' }],
          }),
        },
        links: {
          bs: link('build', 'sha', ['build', 'sha'], { label: '400 MB binary' }),
          sd: link('sha', 'digest', ['sha', 'digest'], { label: '32-byte fingerprint', labelTone: 'green' }),
        },
        flows: [
          { route: ['bs'], kind: 'mine', rate: 0.9 },
          { route: ['sd'], kind: 'msg', rate: 0.9 },
        ],
      },
    },
    {
      short: 'Avalanche',
      chapter: 'insight',
      title: 'The Avalanche Effect: 1 hidden byte flips ~50% of the hash',
      body: [
        'Suppose someone changes just <b>one single bit</b> inside that 400 MB installer (for example, flipping a permission check from <code>0</code> to <code>1</code>).',
        'Thanks to SHA-256’s <span class="term">avalanche effect</span>, the digest does not nudge slightly — roughly half of all 256 bits flip unpredictably: <code>f3a9 1c80…</code> explodes into <code>7e2b 9d04…</code>.',
      ],
      callout: {
        kind: 'insight',
        text: 'Even though the hash detects edits, if a hacker hacks the mirror server, couldn’t they replace BOTH the file AND the posted SHA-256 hash? Yes — that is why we need Digital Signatures next!',
      },
      changes: [
        '~ 1 single bit flipped out of 3,200,000,000 bits',
        '~ Resulting SHA-256 digest changes ~50% of its bits completely',
      ],
      metrics: {
        algorithm: 'SHA-256',
        avalanche: '~50% bits flipped',
        integrity: 'Tamper-Proof',
        signatureStatus: 'Needs Signature',
      },
      scene: {
        entities: {
          orig: block(-12, -6, { color: 'green', glyph: 'packageCheck', s: 3.5, h: 34, label: ['Clean Build'], sub: '0 bytes changed' }),
          mod: block(-12, 6, { color: 'orange', glyph: 'bug', s: 3.5, h: 34, label: ['1-Bit Edit'], sub: '0x00 → 0x01' }),
          sha: cipherBlock(0, 0, ['SHA-256'], 'avalanche'),
          h1: block(13, -6, { color: 'green', glyph: 'hash', s: 3.5, h: 34, label: ['f3a9 1c80…'] }),
          h2: block(13, 6, { color: 'orange', glyph: 'alert', s: 3.5, h: 34, label: ['7e2b 9d04…'], tags: [{ text: '50% bits flipped!', tone: 'red', icon: 'zap' }] }),
        },
        links: {
          l1: link('orig', 'sha', ['orig', 'sha']),
          l2: link('mod', 'sha', ['mod', 'sha']),
          o1: link('sha', 'h1', ['sha', 'h1']),
          o2: link('sha', 'h2', ['sha', 'h2']),
        },
        flows: [
          { route: ['l1', 'o1'], kind: 'msg', rate: 0.8 },
          { route: ['l2', 'o2'], kind: 'poison', rate: 0.8 },
        ],
      },
    },
  ],
};

export const lessonUpdatePrivateSign: Lesson = {
  id: 'update-private-sign',
  title: '2. Signing with Publisher’s Private Key',
  summary:
    'Watch NovaOS lock the installer’s SHA-256 digest inside an offline Hardware Security Module (HSM) using its secret private signing key.',
  minutes: 8,
  level: 'intermediate',
  metrics: ['algorithm', 'keyType', 'signatureStatus', 'trust'],
  legend: [
    ['msg', 'SHA-256 file digest'],
    ['write', 'Publisher Private Key (HSM)'],
    ['push', 'Unforgeable Digital Signature σ'],
  ],
  goals: [
    { text: 'See why signing uses the Private Key (opposite of RSA encryption)', step: 0 },
    { text: 'Understand why only the digest is signed, not all 400 MB directly', step: 1 },
    { text: 'See the installer + signature published together on untrusted CDN mirrors', step: 2 },
  ],
  steps: [
    {
      short: 'Private Sign',
      chapter: 'technique',
      title: 'Sign the 32-byte digest with NovaOS’s Private Key',
      body: [
        'In encryption, you lock with a recipient’s <b>public</b> key. A <span class="term">digital signature</span> flips the keys around: NovaOS locks the file’s 32-byte SHA-256 digest using its own <b>Private Signing Key</b> stored inside a locked offline Hardware Security Module (HSM).',
        'Signing just the 32-byte hash (instead of all 400 MB) takes under 1 millisecond and produces a 64-byte <span class="term">Ed25519 signature σ</span>.',
      ],
      callout: {
        kind: 'tip',
        text: 'Because the Private Key never leaves NovaOS’s secure HSM vault, no mirror server or hacker on Earth can generate a matching signature σ.',
      },
      metrics: {
        algorithm: 'Ed25519 + SHA-256',
        keyType: 'Private Signing Key',
        signatureStatus: 'Signed ✓',
        trust: 'Authentic',
      },
      scene: {
        entities: {
          vaultZone: zone({ x0: -15, x1: 6, y0: -12, y1: 12 }, 'NovaOS Secure Build Vault'),
          digest: block(-11, 2, { color: 'green', glyph: 'hash', s: 3.4, h: 34, label: ['Digest'], sub: 'f3a9 1c80…' }),
          hsm: keyVault(-1, -9, 'Private Key', [{ text: 'offline HSM · secret', tone: 'amber', icon: 'key' }]),
          signer: cipherBlock(-1, 2, ['Sign()', 'Ed25519'], 'produces σ', [
            { text: 'unforgeable seal σ', tone: 'violet', icon: 'fingerprint' },
          ]),
          cdn: block(14, 2, {
            color: 'blue',
            glyph: 'globe',
            label: ['Public CDN', 'Mirror'],
            sub: 'hosts .pkg + .sig',
            tags: [{ text: 'OS_4.2.pkg + σ', tone: 'green', icon: 'packageCheck' }],
          }),
        },
        links: {
          ds: link('digest', 'signer', ['digest', 'signer'], { label: '32-byte hash' }),
          hs: link('hsm', 'signer', ['hsm', 'signer'], { label: 'private key', labelTone: 'amber' }),
          sc: link('signer', 'cdn', ['signer', 'cdn'], { label: 'upload .pkg + σ', labelTone: 'violet' }),
        },
        flows: [
          { route: ['ds'], kind: 'msg', rate: 0.7 },
          { route: ['hs'], kind: 'write', rate: 0.6 },
          { route: ['sc'], kind: 'push', rate: 0.9 },
        ],
      },
    },
    {
      short: 'Public Mirror',
      chapter: 'insight',
      title: 'Now even untrusted download mirrors can serve the file safely',
      body: [
        'NovaOS distributes <code>OS_4.2.pkg</code> plus its signature file <code>OS_4.2.sig</code> to hundreds of public CDN servers worldwide.',
        'The CDN mirrors do NOT hold the private key — they can serve the bytes fast, but they can never forge a new signature if they tamper with the file.',
      ],
      callout: {
        kind: 'next',
        text: 'Next subpart: <b>3. Verifying Before Installing</b> — watch your laptop check the signature before executing a single line of code.',
      },
      metrics: {
        algorithm: 'Ed25519 + SHA-256',
        keyType: 'Asymmetric Pair',
        signatureStatus: 'Signed ✓',
        trust: 'Authentic',
      },
      scene: {
        entities: {
          nova: block(-14, 0, { color: 'purple', glyph: 'fileKey', label: ['NovaOS', 'Publisher'], sub: 'keeps Private Key' }),
          m1: block(0, -7, { color: 'slab', glyph: 'server', s: 3.4, h: 32, label: ['Mirror EU'], sub: '.pkg + σ' }),
          m2: block(0, 7, { color: 'slab', glyph: 'server', s: 3.4, h: 32, label: ['Mirror Asia'], sub: '.pkg + σ' }),
          user: device(14, 0, { form: 'laptop', label: 'Your Laptop', tags: [{ text: 'has NovaOS Public Key', tone: 'green', icon: 'key' }] }),
        },
        links: {
          n1: link('nova', 'm1', ['nova', 'm1']),
          n2: link('nova', 'm2', ['nova', 'm2']),
          m1u: link('m1', 'user', ['m1', 'user'], { style: 'dashed' }),
          m2u: link('m2', 'user', ['m2', 'user'], { label: 'downloads .pkg + σ' }),
        },
        flows: [
          { route: ['n1'], kind: 'push', rate: 0.5 },
          { route: ['n2', 'm2u'], kind: 'push', rate: 0.9 },
        ],
      },
    },
  ],
};

export const lessonUpdatePublicVerify: Lesson = {
  id: 'update-public-verify',
  title: '3. Verifying Before Installing',
  summary:
    'Your laptop downloads the update from a public mirror. Watch how the OS uses NovaOS’s embedded Public Key to guarantee authenticity and zero tampering.',
  minutes: 7,
  level: 'intermediate',
  metrics: ['signatureStatus', 'integrity', 'trust', 'algorithm'],
  legend: [
    ['mine', 'Downloaded 400 MB file'],
    ['push', 'Signature σ from mirror'],
    ['write', 'Built-in Public Key'],
    ['msg', 'Verified → Safe to install'],
  ],
  goals: [
    { text: 'Watch your laptop independently re-hash the downloaded installer', step: 0 },
    { text: 'See Public Key verification prove both Authorship and Integrity', step: 1 },
  ],
  steps: [
    {
      short: 'Re-Hash',
      chapter: 'technique',
      title: 'Step 1: Independently hash the downloaded file & unlock σ',
      body: [
        'Before running the installer, your laptop’s updater performs two quick checks in parallel:',
        `<ul class="takeaways">
          <li>Computes its own local <b>SHA-256 hash</b> of the downloaded 400 MB file.</li>
          <li>Runs <code>Verify(localHash, σ, NovaOS_Public_Key)</code> using the publisher’s public key already trusted by your OS.</li>
        </ul>`,
      ],
      metrics: {
        signatureStatus: 'Verifying…',
        integrity: 'Checking',
        trust: 'Pending',
        algorithm: 'Ed25519 + SHA-256',
      },
      scene: {
        entities: {
          mirror: block(-14, 0, { color: 'slab', glyph: 'server', label: ['Public', 'Mirror'], sub: 'OS_4.2.pkg + σ' }),
          laptopZone: zone({ x0: -6, x1: 16, y0: -12, y1: 12 }, 'Your Laptop (OS Updater)'),
          pubKey: keyVault(1, -10, 'NovaOS PubKey', [{ text: 'pre-installed in OS', tone: 'green', icon: 'key' }]),
          verifier: cipherBlock(1, 1, ['Verify()', 'Ed25519'], 'checks Hash + σ'),
          os: device(12, 1, { form: 'laptop', label: 'OS Installer', tags: [{ text: 'waiting for ✓', icon: 'hourglass' }] }),
        },
        links: {
          mv: link('mirror', 'verifier', ['mirror', 'verifier'], { label: 'file + σ' }),
          pv: link('pubKey', 'verifier', ['pubKey', 'verifier'], { label: 'public key', labelTone: 'green' }),
          vo: link('verifier', 'os', ['verifier', 'os'], { style: 'dashed' }),
        },
        flows: [
          { route: ['mv'], kind: 'push', rate: 0.8 },
          { route: ['pv'], kind: 'write', rate: 0.6 },
        ],
      },
    },
    {
      short: 'Safe Install',
      chapter: 'solution',
      title: 'Step 2: Valid signature guarantees 3 security properties',
      body: [
        '<code>Verify()</code> returns <b>TRUE</b>! With one mathematical check, your laptop has proven all three pillars of digital trust:',
        `<ul class="takeaways">
          <li><b>Authentication:</b> Only NovaOS (holder of the private key) could have signed this.</li>
          <li><b>Integrity:</b> Not a single bit of the 400 MB installer was altered since signing.</li>
          <li><b>Non-Repudiation:</b> NovaOS cannot later deny publishing this signed release.</li>
        </ul>`,
      ],
      callout: {
        kind: 'next',
        text: 'Next subpart: <b>4. Supply-Chain Malware Attack</b> — watch what happens when a hacker compromises the public mirror and injects a Trojan.',
      },
      metrics: {
        signatureStatus: 'Valid ✓',
        integrity: 'Verified',
        trust: 'Authentic (NovaOS)',
        algorithm: 'Ed25519 + SHA-256',
      },
      scene: {
        entities: {
          mirror: block(-14, 0, { color: 'slab', glyph: 'server', label: ['Public', 'Mirror'] }),
          verifier: cipherBlock(0, 0, ['Verify()', 'Ed25519'], 'MATCH ✓', [
            { text: 'genuine & untouched', tone: 'green', icon: 'circleCheck' },
          ]),
          os: device(14, 0, { form: 'laptop', label: 'Your Laptop', tags: [{ text: 'Installing safely ✓', tone: 'green', icon: 'shield' }] }),
        },
        links: {
          mv: link('mirror', 'verifier', ['mirror', 'verifier']),
          vo: link('verifier', 'os', ['verifier', 'os'], { label: 'verified · install', labelTone: 'green' }),
        },
        flows: [
          { route: ['mv'], kind: 'push', rate: 0.8 },
          { route: ['vo'], kind: 'msg', rate: 0.9 },
        ],
      },
    },
  ],
};

export const lessonUpdateTrojanAttack: Lesson = {
  id: 'update-trojan-attack',
  title: '4. Supply-Chain Malware Attack',
  summary:
    'A hacker breaks into the public download mirror and injects a hidden backdoor into OS_4.2.pkg. Watch digital signature verification halt the Trojan automatically.',
  minutes: 8,
  level: 'intermediate',
  metrics: ['signatureStatus', 'integrity', 'attackerSees', 'attackRisk'],
  legend: [
    ['poison', 'Trojan-infected installer'],
    ['kill', 'Signature mismatch → Blocked'],
    ['push', 'Genuine signature σ'],
  ],
  goals: [
    { text: 'See a hacker inject stealth malware into a third-party mirror server', step: 0 },
    { text: 'Watch the SHA-256 avalanche break the signature instantly', step: 1 },
    { text: 'Understand why the hacker cannot forge a replacement signature', step: 2 },
  ],
  steps: [
    {
      short: 'Trojan Injected',
      chapter: 'problem',
      title: 'Attack: Hacker hacks the CDN mirror & slips in a Trojan',
      body: [
        'A cybercriminal breaks into the Asian CDN mirror and splices 200 bytes of ransomware into <code>OS_4.2.pkg</code>. The filename, size, and website look 100% normal.',
        'The hacker tries to serve the poisoned installer alongside NovaOS’s original signature file <code>σ</code> (or tries signing it with their own fake key).',
      ],
      metrics: {
        signatureStatus: 'Tampered!',
        integrity: 'Altered!',
        attackerSees: 'Poisoned Mirror',
        attackRisk: 'Critical',
      },
      scene: {
        entities: {
          hacker: hackerNode(-13, 9, 'Attacker', [{ text: 'injects 200 B Trojan!', tone: 'red', icon: 'bug' }], { heat: 0.85 }),
          mirror: block(-13, -3, { color: 'orange', glyph: 'server', label: ['Hacked', 'CDN Mirror'], tags: [{ text: 'infected OS_4.2.pkg', tone: 'red', icon: 'alert' }] }),
          laptop: device(13, -3, { form: 'laptop', label: 'Your Laptop', tags: [{ text: 'downloading update…', tone: 'amber', icon: 'inbox' }] }),
        },
        links: {
          hm: link('hacker', 'mirror', ['hacker', 'mirror'], { label: 'inject backdoor', labelTone: 'red' }),
          ml: link('mirror', 'laptop', ['mirror', 'laptop'], { label: 'infected .pkg + old σ', labelTone: 'red' }),
        },
        flows: [
          { route: ['hm'], kind: 'poison', rate: 0.7 },
          { route: ['ml'], kind: 'poison', rate: 0.9 },
        ],
      },
    },
    {
      short: 'Install Halted',
      chapter: 'solution',
      title: 'Defense: Signature verification catches the Trojan & deletes it',
      body: [
        'Your laptop hashes the infected file: the 200-byte Trojan flipped ~50% of the SHA-256 digest (<code>7e2b 9d04…</code> instead of <code>f3a9 1c80…</code>).',
        'When checked against NovaOS’s Public Key, the signature fails immediately! The hacker cannot forge a valid signature without stealing NovaOS’s offline HSM private key. The installer is quarantined before a single malicious instruction executes.',
      ],
      callout: {
        kind: 'insight',
        text: 'Digital signatures power Apple Gatekeeper, Windows Authenticode, Linux apt/rpm packages, and official digitally signed university diplomas!',
      },
      changes: [
        '+ Local hash 7e2b… ≠ signed hash f3a9…',
        '+ Ed25519 Verify() returns FALSE',
        '+ Trojan installer deleted automatically before running',
      ],
      metrics: {
        signatureStatus: 'Mismatch → Blocked',
        integrity: 'Tamper-Proof',
        attackerSees: 'Cannot Forge',
        attackRisk: 'Mitigated',
      },
      scene: {
        entities: {
          mirror: block(-14, 0, { color: 'orange', glyph: 'server', label: ['Hacked', 'Mirror'], sub: 'Trojan .pkg' }),
          verifier: cipherBlock(0, 0, ['Verify()', 'Ed25519'], 'HASH MISMATCH!', [
            { text: 'SIGNATURE INVALID · BLOCKED', tone: 'green', icon: 'shield' },
          ]),
          laptop: device(14, 0, { form: 'laptop', label: 'Your Laptop', tags: [{ text: 'Protected! Trojan deleted', tone: 'green', icon: 'circleCheck' }] }),
          card: panel(
            { x: 0, y: -11, dx: 0, dy: -140 },
            'Why the Trojan Failed',
            [
              'Signed Hash   : f3a9 1c80 44b2...',
              'Infected Hash : 7e2b 9d04 a18c...',
              '! Hacker lacks NovaOS Private Key',
              '= Install aborted safely!',
            ],
            { icon: 'shield' }
          ),
        },
        links: {
          mv: link('mirror', 'verifier', ['mirror', 'verifier'], { label: 'Trojan .pkg', labelTone: 'red' }),
          vl: link('verifier', 'laptop', ['verifier', 'laptop'], { style: 'cut', fail: 1, label: 'blocked!', labelTone: 'red' }),
        },
        flows: [
          { route: ['mv'], kind: 'poison', rate: 0.9 },
          { route: ['vl'], kind: 'kill', rate: 0.9 },
        ],
      },
    },
    {
      short: 'Recap',
      chapter: 'recap',
      title: 'Scenario 4 Complete: Digital Signatures & Integrity',
      body: [
        `<ul class="takeaways">
          <li><b>SHA-256 Avalanche:</b> 1 altered byte changes ~50% of the fingerprint.</li>
          <li><b>Private-Key Signing:</b> Only the genuine author can seal the hash into signature <code>σ</code>.</li>
          <li><b>Public-Key Verification:</b> Anyone can verify authenticity and block supply-chain malware without trusting the download mirror.</li>
        </ul>`,
      ],
      callout: {
        kind: 'next',
        text: 'Final Scenario: <b>05. Cloud Vault & Smart Payments</b> — explore AES block modes on X-ray scans, Hardware KMS vaults, and blocking mobile payment Replay Attacks.',
      },
      metrics: {
        signatureStatus: 'Verified Only',
        integrity: 'Tamper-Proof',
        attackerSees: 'Cannot Forge',
        attackRisk: 'Mitigated',
      },
      scene: {
        entities: {
          nova: block(-13, 0, { color: 'purple', glyph: 'fileKey', label: ['Publisher'], sub: 'signs with PrivKey' }),
          cdn: block(0, 0, { color: 'slab', glyph: 'globe', label: ['Public CDN'], sub: 'untrusted relay' }),
          laptop: device(13, 0, { form: 'laptop', label: 'User', tags: [{ text: 'verifies with PubKey ✓', tone: 'green', icon: 'shield' }] }),
        },
        links: {
          nc: link('nova', 'cdn', ['nova', 'cdn']),
          cl: link('cdn', 'laptop', ['cdn', 'laptop'], { label: 'only valid σ installs', labelTone: 'green' }),
        },
        flows: [{ route: ['nc', 'cl'], kind: 'push', rate: 0.9 }],
      },
    },
  ],
};

export const SCENARIO_4_LESSONS: Lesson[] = [
  lessonUpdateAvalancheHash,
  lessonUpdatePrivateSign,
  lessonUpdatePublicVerify,
  lessonUpdateTrojanAttack,
];
