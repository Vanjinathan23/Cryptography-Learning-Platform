import {
  Lesson,
  block,
  cipherBlock,
  device,
  hackerNode,
  keyVault,
  link,
  panel,
  routerNode,
  zone,
} from './cryptoHelpers';

/**
 * SCENARIO 3: Online Banking on Public Airport Wi-Fi
 * Real-world setting: Traveler connects to https://mybank.com on an untrusted airport
 * hotspot — Digital Certificates (CA), Diffie-Hellman (ECDHE), TLS 1.3 Tunnel, Evil-Twin MITM.
 */

export const lessonBankCertVerify: Lesson = {
  id: 'bank-cert-verify',
  title: '1. Proving It’s Really the Bank',
  summary:
    'Before typing a single credit-card digit on airport Wi-Fi, watch how your browser verifies the bank’s X.509 Certificate through a trusted Certificate Authority.',
  minutes: 8,
  level: 'intermediate',
  metrics: ['certStatus', 'trust', 'algorithm', 'attackRisk'],
  legend: [
    ['ping', 'ClientHello request'],
    ['write', 'X.509 Certificate'],
    ['msg', 'CA signature verified'],
  ],
  goals: [
    { text: 'Understand why encryption is useless if you encrypt to an imposter', step: 0 },
    { text: 'See how a Certificate Authority signs the bank’s public key', step: 1 },
    { text: 'Watch the browser verify the certificate chain automatically', step: 2 },
  ],
  steps: [
    {
      short: 'Who Is It?',
      chapter: 'setup',
      title: 'Step 1: Traveler opens https://mybank.com at the airport',
      body: [
        'Arjun sits in an airport lounge and types <code>https://mybank.com</code> to pay a bill. The router belongs to the airport — Arjun has zero reason to trust the network.',
        'Before sending his password or card number, Arjun’s browser demands cryptographic proof: <b>“Prove you are truly mybank.com, and give me your real public key.”</b>',
      ],
      metrics: {
        certStatus: 'Pending',
        trust: 'Unknown',
        algorithm: 'TLS 1.3',
        attackRisk: 'Medium',
      },
      scene: {
        entities: {
          arjun: device(-14, 0, { form: 'laptop', label: 'Arjun', tags: [{ text: 'https://mybank.com', icon: 'globe' }] }),
          wifi: routerNode(0, 0, ['Airport', 'Wi-Fi'], 'untrusted network'),
          bank: block(14, 0, { color: 'blue', glyph: 'building', label: ['MyBank', 'Server'], sub: 'mybank.com' }),
        },
        links: {
          aw: link('arjun', 'wifi', ['arjun', 'wifi'], { label: 'ClientHello' }),
          wb: link('wifi', 'bank', ['wifi', 'bank'], { label: 'prove your identity' }),
        },
        flows: [{ route: ['aw', 'wb'], kind: 'ping', rate: 0.9 }],
      },
    },
    {
      short: 'X.509 Cert',
      chapter: 'technique',
      title: 'Step 2: Bank sends its CA-signed Digital Certificate',
      body: [
        'MyBank replies with its <span class="term">X.509 Digital Certificate</span> — an official digital passport containing: the domain name (<code>mybank.com</code>), the bank’s public key, an expiry date, and a <b>digital signature from a trusted Certificate Authority (CA)</b>.',
        'Arjun’s operating system already comes pre-loaded with the Root CA’s public key, so the browser can verify the CA’s signature offline in milliseconds.',
      ],
      changes: [
        '+ Bank presents CA-signed X.509 Certificate',
        '+ Browser checks domain match, expiry date & CA signature',
      ],
      metrics: {
        certStatus: 'CA-Signed Valid',
        trust: 'CA-Signed Verified',
        algorithm: 'X.509 PKI',
        attackRisk: 'Low',
      },
      scene: {
        entities: {
          arjun: device(-14, 2, { form: 'laptop', label: 'Arjun', tags: [{ text: '🔒 padlock verified ✓', tone: 'green', icon: 'lock' }] }),
          ca: block(0, -10, {
            color: 'yellow',
            glyph: 'fileKey',
            s: 3.6,
            h: 36,
            label: ['Root CA'],
            sub: 'pre-trusted in browser',
            tags: [{ text: 'signed mybank.com ✓', tone: 'green', icon: 'circleCheck' }],
          }),
          bank: block(14, 2, {
            color: 'green',
            glyph: 'building',
            label: ['MyBank', 'Server'],
            tags: [{ text: 'Cert + Public Key', tone: 'green', icon: 'idCard' }],
          }),
          card: panel(
            { x: 0, y: 12, dx: 0, dy: 0 },
            'Inside the X.509 Certificate',
            [
              'Domain  : mybank.com',
              'PubKey  : 04a8f1... (Bank’s key)',
              'Issuer  : Trusted Root CA',
              '= Browser verifies CA signature ✓',
            ],
            { icon: 'fileKey' }
          ),
        },
        links: {
          ba: link('bank', 'arjun', ['bank', 'arjun'], { label: 'X.509 Certificate', labelTone: 'green' }),
          caA: link('ca', 'arjun', ['ca', 'arjun'], { style: 'dashed', label: 'checks Root CA key' }),
        },
        flows: [
          { route: ['ba'], kind: 'write', rate: 0.9 },
          { route: ['caA'], kind: 'msg', rate: 0.6 },
        ],
      },
    },
    {
      short: 'Verified',
      chapter: 'recap',
      title: 'Identity confirmed — ready to negotiate session keys',
      body: [
        'Arjun’s browser now knows with mathematical certainty that it holds MyBank’s genuine public key — not a hacker’s.',
        'Next, Arjun and MyBank must create a shared secret key right across the airport Wi-Fi without letting eavesdroppers discover it.',
      ],
      callout: {
        kind: 'next',
        text: 'Next subpart: <b>2. Creating a Secret Key in Public (Diffie-Hellman)</b>.',
      },
      metrics: {
        certStatus: 'CA-Signed Valid',
        trust: 'CA-Signed Verified',
        algorithm: 'X.509 PKI',
        attackRisk: 'Mitigated',
      },
      scene: {
        entities: {
          arjun: device(-13, 0, { form: 'laptop', label: 'Arjun', tags: [{ text: 'Bank identity verified ✓', tone: 'green', icon: 'shield' }] }),
          bank: block(13, 0, { color: 'green', glyph: 'building', label: ['MyBank', 'Server'], tags: [{ text: 'authentic', tone: 'green', icon: 'circleCheck' }] }),
        },
        links: {
          ab: link('arjun', 'bank', ['arjun', 'bank'], { heads: 'both', label: 'authenticated peer', labelTone: 'green' }),
        },
        flows: [{ route: ['ab'], kind: 'msg', rate: 0.8, bounce: true }],
      },
    },
  ],
};

export const lessonBankDhKeyExchange: Lesson = {
  id: 'bank-dh-key-exchange',
  title: '2. Creating a Secret Key in Public',
  summary:
    'The magic of Diffie-Hellman (ECDHE): Arjun’s laptop and MyBank agree on the exact same 256-bit secret key while an eavesdropper watches every packet.',
  minutes: 9,
  level: 'intermediate',
  metrics: ['algorithm', 'keyType', 'attackerSees', 'confidentiality'],
  legend: [
    ['ping', 'Public curve / prime (p, g)'],
    ['write', 'Public mixed shares (A ↔ B)'],
    ['empty', 'Identical shared secret S'],
  ],
  goals: [
    { text: 'See why a shared key cannot simply be sent across airport Wi-Fi', step: 0 },
    { text: 'Watch both sides mix private random numbers with public parameters', step: 1 },
    { text: 'Verify both compute identical secret S = g^(ab) mod p locally', step: 2 },
  ],
  steps: [
    {
      short: 'Open Wire',
      chapter: 'problem',
      title: 'Why you can’t just send an AES key over airport Wi-Fi',
      body: [
        'Arjun’s browser wants to encrypt his credit card with blazing-fast AES-256. Both Arjun and MyBank need the same secret key <code>S</code>.',
        'But an eavesdropper on the airport Wi-Fi records every single packet. If Arjun simply sends <code>S</code>, the hacker copies it too.',
      ],
      metrics: {
        algorithm: 'None',
        keyType: 'Exposed',
        attackerSees: 'Steals Key!',
        confidentiality: 'Broken',
      },
      scene: {
        entities: {
          arjun: device(-13, -2, { form: 'laptop', label: 'Arjun', tags: [{ text: 'needs shared key S', icon: 'key' }] }),
          bank: block(13, -2, { color: 'blue', glyph: 'building', label: ['MyBank'] }),
          eve: hackerNode(0, 10, 'Sniffer', [{ text: 'recording all Wi-Fi packets', tone: 'red', icon: 'eye' }]),
        },
        links: {
          ab: link('arjun', 'bank', ['arjun', 'bank'], { label: 'send key in clear?', labelTone: 'red' }),
          ae: link('arjun', 'eve', ['arjun', ['eve', 'arjun'], 'eve'], { style: 'dashed' }),
        },
        flows: [
          { route: ['ab'], kind: 'poison', rate: 0.7 },
          { route: ['ae'], kind: 'poison', rate: 0.7 },
        ],
      },
    },
    {
      short: 'Public Shares',
      chapter: 'technique',
      title: 'Swap one-way mixed shares (A and B) openly',
      body: [
        'Using <span class="term">Diffie-Hellman (ECDHE)</span>, both start with a public base <code>g</code> and prime <code>p</code>. Arjun picks a temporary private secret <code>a</code> and sends <code>A = gᵃ mod p</code>. MyBank picks a private secret <code>b</code> and sends <code>B = gᵇ mod p</code>.',
        'The airport sniffer sees <code>p, g, A, B</code> — yet reversing <code>A</code> back into <code>a</code> (the Discrete Logarithm Problem) is mathematically infeasible.',
      ],
      changes: ['+ Arjun sends public share A = gᵃ mod p', '+ Bank sends public share B = gᵇ mod p'],
      metrics: {
        algorithm: 'ECDHE / DH',
        keyType: 'Ephemeral DH',
        attackerSees: 'Public (A, B) Only',
        confidentiality: 'Protected',
      },
      scene: {
        entities: {
          arjun: device(-13, -2, { form: 'laptop', label: 'Arjun', tags: [{ text: 'secret a → sends A', tone: 'blue', icon: 'key' }] }),
          pub: block(0, -10, { color: 'yellow', glyph: 'globe', s: 3.4, h: 32, label: ['Public', 'p, g'], sub: 'known to all' }),
          bank: block(13, -2, { color: 'blue', glyph: 'building', label: ['MyBank'], tags: [{ text: 'secret b → sends B', tone: 'violet', icon: 'key' }] }),
          eve: hackerNode(0, 10, 'Sniffer', [{ text: 'captures A & B (stuck!)', icon: 'eye' }]),
        },
        links: {
          pa: link('pub', 'arjun', ['pub', 'arjun'], { style: 'dashed' }),
          pb: link('pub', 'bank', ['pub', 'bank'], { style: 'dashed' }),
          ab: link('arjun', 'bank', ['arjun', 'bank'], { heads: 'both', label: 'swap A ↔ B' }),
          ae: link('arjun', 'eve', ['arjun', ['eve', 'arjun'], 'eve'], { style: 'dashed' }),
        },
        flows: [
          { route: ['pa'], kind: 'ping', rate: 0.5 },
          { route: ['pb'], kind: 'ping', rate: 0.5 },
          { route: ['ab'], kind: 'write', rate: 0.9, bounce: true },
        ],
      },
    },
    {
      short: 'Same Secret',
      chapter: 'solution',
      title: 'Both independently compute the exact same secret S',
      body: [
        'Arjun computes <code>S = Bᵃ mod p = gᵇᵃ mod p</code>. MyBank computes <code>S = Aᵇ mod p = gᵃᵇ mod p</code>.',
        'Because multiplication in the exponent commutes (<code>a·b == b·a</code>), both now hold the <b>identical 256-bit secret key S</b> — and <code>S</code> never once crossed the airport Wi-Fi!',
      ],
      callout: {
        kind: 'insight',
        text: 'Because a and b are deleted right after the session, even if the bank’s long-term server key leaks next year, today’s traffic stays unreadable (Perfect Forward Secrecy).',
      },
      changes: ['+ Arjun computes S = Bᵃ mod p', '+ Bank computes S = Aᵇ mod p', '= Identical AES-256 session key established'],
      metrics: {
        algorithm: 'ECDHE (X25519)',
        keyType: 'Ephemeral 256-bit',
        attackerSees: 'Cannot Compute S',
        confidentiality: 'Forward Secret',
      },
      scene: {
        entities: {
          arjun: device(-13, -2, { form: 'laptop', label: 'Arjun', tags: [{ text: 'derived Key S ✓', tone: 'green', icon: 'lock' }] }),
          bank: block(13, -2, { color: 'green', glyph: 'building', label: ['MyBank'], tags: [{ text: 'derived Key S ✓', tone: 'green', icon: 'lock' }] }),
          eve: hackerNode(0, 10, 'Sniffer', [{ text: 'cannot compute gᵃᵇ mod p', tone: 'green', icon: 'eyeOff' }]),
          card: panel(
            { x: 0, y: -11, dx: 0, dy: -140 },
            'Live Modular Math (p=23, g=5)',
            [
              'Arjun a=6  → A = 5⁶ mod 23 = 8',
              'Bank  b=15 → B = 5¹⁵ mod 23 = 19',
              'Arjun: 19⁶ mod 23 = 2',
              'Bank :  8¹⁵ mod 23 = 2  (= SAME KEY!)',
            ],
            { icon: 'sparkles' }
          ),
        },
        links: {
          ab: link('arjun', 'bank', ['arjun', 'bank'], { heads: 'both', label: 'shared secret S (never sent)', labelTone: 'green' }),
        },
        flows: [{ route: ['ab'], kind: 'empty', rate: 0.9, bounce: true }],
      },
    },
  ],
};

export const lessonBankTlsTunnel: Lesson = {
  id: 'bank-tls-tunnel',
  title: '3. Hybrid TLS 1.3 Checkout Tunnel',
  summary:
    'Combine asymmetric authentication with symmetric speed: watch Arjun’s credit-card checkout flow through a 1-RTT TLS 1.3 encrypted tunnel.',
  minutes: 8,
  level: 'intermediate',
  metrics: ['algorithm', 'keyType', 'confidentiality', 'integrity'],
  legend: [
    ['write', 'Asymmetric 1-RTT Handshake'],
    ['empty', 'AES-256-GCM HTTPS Data'],
    ['res', 'Encrypted Bank Receipt'],
  ],
  goals: [
    { text: 'See why HTTPS uses Hybrid Crypto (Asymmetric + Symmetric)', step: 0 },
    { text: 'Watch credit-card data stream safely through the TLS 1.3 tunnel', step: 1 },
  ],
  steps: [
    {
      short: 'Hybrid Split',
      chapter: 'technique',
      title: 'Why TLS 1.3 uses two different cryptosystems together',
      body: [
        'Asymmetric math (RSA / Elliptic Curves) is brilliant for certificates and key exchange, but ~1,000× slower than AES for bulk web pages and API calls.',
        'So <span class="term">TLS 1.3</span> uses a <b>Hybrid Architecture</b>: (1) Asymmetric PKI + ECDHE runs once in 1 round trip to prove identity and agree on Key S, then (2) <b>AES-256-GCM</b> encrypts all HTTP requests, cookies, and card numbers at gigabit speed.',
      ],
      metrics: {
        algorithm: 'TLS 1.3 Hybrid',
        keyType: 'Hybrid',
        confidentiality: 'Forward Secret',
        integrity: 'Tamper-Proof',
      },
      scene: {
        entities: {
          arjun: device(-14, 0, { form: 'laptop', label: 'Arjun', tags: [{ text: 'card: 4111 ••••', tone: 'green', icon: 'creditCard' }] }),
          handshake: block(-1, -7, { color: 'purple', glyph: 'fileKey', s: 3.6, h: 34, label: ['1. Handshake'], sub: 'Cert + ECDHE (once)' }),
          aes: cipherBlock(-1, 6, ['2. AES-GCM'], 'all HTTPS traffic', [{ text: '1000× faster · sealed', tone: 'green', icon: 'zap' }]),
          bank: block(14, 0, { color: 'green', glyph: 'building', label: ['MyBank'], tags: [{ text: 'processes payment ✓', tone: 'green', icon: 'check' }] }),
        },
        links: {
          ah: link('arjun', 'handshake', ['arjun', 'handshake'], { heads: 'both', label: '1-RTT setup' }),
          hb: link('handshake', 'bank', ['handshake', 'bank'], { heads: 'both' }),
          aa: link('arjun', 'aes', ['arjun', 'aes'], { heads: 'both', label: 'HTTPS requests' }),
          ab: link('aes', 'bank', ['aes', 'bank'], { heads: 'both', label: 'encrypted stream', labelTone: 'green' }),
        },
        flows: [
          { route: ['ah', 'hb'], kind: 'write', rate: 0.4, bounce: true },
          { route: ['aa', 'ab'], kind: 'empty', rate: 1.2, bounce: true },
        ],
      },
    },
    {
      short: 'Protected Pay',
      chapter: 'solution',
      title: 'Card payment travels safely across airport Wi-Fi',
      body: [
        'Arjun clicks <b>Pay $240</b>. Every byte of the HTTP request — headers, session token, card number, and CVV — is sealed inside AES-256-GCM.',
        'The airport Wi-Fi router forwards the packets blindly; the bank decrypts, verifies the auth tag, processes the payment, and returns an encrypted receipt.',
      ],
      callout: {
        kind: 'next',
        text: 'Next subpart: <b>4. Fake Airport Wi-Fi (Evil-Twin MITM Attack)</b> — what happens when a hacker impersonates MyBank on a rogue hotspot?',
      },
      metrics: {
        algorithm: 'AES-256-GCM (TLS 1.3)',
        keyType: 'Ephemeral 256-bit',
        confidentiality: 'Forward Secret',
        integrity: 'Tamper-Proof',
      },
      scene: {
        entities: {
          arjun: device(-14, -2, { form: 'laptop', label: 'Arjun', tags: [{ text: '🔒 https://mybank.com', tone: 'green', icon: 'lock' }] }),
          wifi: routerNode(0, -2, ['Airport', 'Wi-Fi'], 'sees only ciphertext'),
          bank: block(14, -2, { color: 'green', glyph: 'building', label: ['MyBank'], tags: [{ text: 'Paid $240 ✓', tone: 'green', icon: 'circleCheck' }] }),
          sniffer: hackerNode(0, 10, 'Wi-Fi Spy', [{ text: 'sees random bytes', tone: 'green', icon: 'eyeOff' }]),
        },
        links: {
          aw: link('arjun', 'wifi', ['arjun', 'wifi'], { heads: 'both', label: 'TLS 1.3', labelTone: 'green' }),
          wb: link('wifi', 'bank', ['wifi', 'bank'], { heads: 'both', label: 'TLS 1.3', labelTone: 'green' }),
          ws: link('wifi', 'sniffer', ['wifi', 'sniffer'], { style: 'dashed', label: 'useless noise' }),
        },
        flows: [
          { route: ['aw', 'wb'], kind: 'empty', rate: 1.0, bounce: true },
          { route: ['ws'], kind: 'empty', rate: 0.7 },
        ],
      },
    },
  ],
};

export const lessonBankEvilTwinMitm: Lesson = {
  id: 'bank-evil-twin-mitm',
  title: '4. Fake Airport Wi-Fi (MITM Attack)',
  summary:
    'An attacker launches a rogue "Free_Airport_WiFi" hotspot and tries to intercept Arjun’s banking login. Watch how PKI Certificate verification stops the Man-in-the-Middle cold.',
  minutes: 8,
  level: 'intermediate',
  metrics: ['certStatus', 'attackerSees', 'attackRisk', 'trust'],
  legend: [
    ['poison', 'Fake certificate / MITM'],
    ['kill', 'Browser blocks connection'],
    ['empty', 'Genuine bank traffic'],
  ],
  goals: [
    { text: 'See how an Evil-Twin hotspot attempts a Man-in-the-Middle key swap', step: 0 },
    { text: 'Watch the browser reject the attacker’s self-signed fake certificate', step: 1 },
    { text: 'Understand why you must never click "Proceed anyway" on TLS warnings', step: 2 },
  ],
  steps: [
    {
      short: 'Evil Twin',
      chapter: 'problem',
      title: 'Attack: Rogue hotspot intercepts the TLS handshake',
      body: [
        'Mallory sets up a laptop broadcasting <code>"Free_Airport_WiFi_5G"</code>. Arjun’s laptop connects automatically and tries to reach <code>mybank.com</code>.',
        'Mallory intercepts the request and pretends to BE MyBank — attempting to negotiate <b>Key K₁</b> with Arjun while opening a second connection with <b>Key K₂</b> to the real bank!',
      ],
      metrics: {
        certStatus: 'Forged!',
        attackerSees: 'Attempting MITM',
        attackRisk: 'Critical',
        trust: 'Spoofed',
      },
      scene: {
        entities: {
          arjun: device(-14, 0, { form: 'laptop', label: 'Arjun', tags: [{ text: 'connects to rogue Wi-Fi', tone: 'amber', icon: 'wifi' }] }),
          mallory: hackerNode(0, 0, 'Evil Twin', [{ text: 'sends fake mybank.com cert!', tone: 'red', icon: 'bug' }], { heat: 0.85 }),
          bank: block(14, 0, { color: 'blue', glyph: 'building', label: ['Real', 'MyBank'] }),
        },
        links: {
          am: link('arjun', 'mallory', ['arjun', 'mallory'], { heads: 'both', label: 'forged cert', labelTone: 'red' }),
          mb: link('mallory', 'bank', ['mallory', 'bank'], { style: 'dashed', label: 'relay attempt' }),
        },
        flows: [{ route: ['am'], kind: 'poison', rate: 1.0, bounce: true }],
      },
    },
    {
      short: 'Cert Blocked',
      chapter: 'solution',
      title: 'Defense: Browser checks CA signature & slams the brakes',
      body: [
        'Mallory does NOT have a trusted Certificate Authority’s private key — she cannot forge a valid CA signature for <code>mybank.com</code>.',
        'Arjun’s browser checks her fake certificate against its trusted Root CAs, sees <b>INVALID SIGNATURE</b>, drops the handshake immediately, and flashes a full-screen <code>"Your connection is not private"</code> warning — before a single password leaves Arjun’s laptop!',
      ],
      callout: {
        kind: 'warn',
        text: 'Never bypass a browser certificate warning on public Wi-Fi — that red shield is literally catching a live Man-in-the-Middle attack.',
      },
      changes: [
        '+ Browser checks CA signature on incoming certificate',
        '+ Forged cert rejected → handshake aborted before sending credentials',
      ],
      metrics: {
        certStatus: 'Invalid → Blocked',
        attackerSees: 'Blocked',
        attackRisk: 'Mitigated',
        trust: 'Authentic Only',
      },
      scene: {
        entities: {
          arjun: device(-14, 0, { form: 'laptop', label: 'Arjun', tags: [{ text: 'BLOCKED · Fake Cert Caught!', tone: 'green', icon: 'shield' }] }),
          mallory: hackerNode(0, 0, 'Evil Twin', [{ text: 'cannot forge CA signature', tone: 'green', icon: 'ban' }]),
          ca: block(-14, -10, { color: 'yellow', glyph: 'fileKey', s: 3.3, h: 32, label: ['Root CA'], sub: 'signature mismatch!' }),
          bank: block(14, 0, { color: 'blue', glyph: 'building', label: ['Real', 'MyBank'], tags: [{ text: 'credentials safe', tone: 'green', icon: 'lock' }] }),
        },
        links: {
          am: link('arjun', 'mallory', ['arjun', 'mallory'], { style: 'cut', fail: 1, label: 'connection aborted', labelTone: 'red' }),
          caA: link('ca', 'arjun', ['ca', 'arjun'], { style: 'dashed', label: 'CA verify failed' }),
        },
        flows: [{ route: ['am'], kind: 'kill', rate: 0.9 }],
      },
    },
    {
      short: 'Recap',
      chapter: 'recap',
      title: 'Scenario 3 Complete: Public Wi-Fi HTTPS Banking',
      body: [
        `<ul class="takeaways">
          <li><b>Certificates &amp; Root CAs:</b> Prove you are talking to the genuine bank, not an Evil-Twin hotspot.</li>
          <li><b>Diffie-Hellman (ECDHE):</b> Creates a fresh shared secret key over untrusted Wi-Fi with Forward Secrecy.</li>
          <li><b>Hybrid TLS 1.3:</b> Combines asymmetric trust with fast AES-256-GCM encryption for your card data.</li>
        </ul>`,
      ],
      callout: {
        kind: 'next',
        text: 'Next Scenario: <b>04. Software Updates & Signed Files</b> — prove who built an app update and stop supply-chain Trojans.',
      },
      metrics: {
        certStatus: 'CA-Signed Valid',
        attackerSees: 'Blocked',
        attackRisk: 'Mitigated',
        trust: 'CA-Signed Verified',
      },
      scene: {
        entities: {
          arjun: device(-13, 0, { form: 'laptop', label: 'Arjun', tags: [{ text: '🔒 Verified HTTPS', tone: 'green', icon: 'lock' }] }),
          tls: cipherBlock(0, 0, ['TLS 1.3'], 'PKI + ECDHE + AES-GCM', [{ text: 'MITM-proof', tone: 'green', icon: 'shield' }]),
          bank: block(13, 0, { color: 'green', glyph: 'building', label: ['MyBank'] }),
        },
        links: {
          at: link('arjun', 'tls', ['arjun', 'tls'], { heads: 'both' }),
          tb: link('tls', 'bank', ['tls', 'bank'], { heads: 'both' }),
        },
        flows: [{ route: ['at', 'tb'], kind: 'empty', rate: 0.9, bounce: true }],
      },
    },
  ],
};

export const SCENARIO_3_LESSONS: Lesson[] = [
  lessonBankCertVerify,
  lessonBankDhKeyExchange,
  lessonBankTlsTunnel,
  lessonBankEvilTwinMitm,
];
