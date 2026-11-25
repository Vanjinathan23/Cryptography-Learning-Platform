import {
  Lesson,
  aliceDev,
  block,
  bobDev,
  cipherBlock,
  crowd,
  db,
  hackerNode,
  keyVault,
  link,
  panel,
  routerNode,
  zone,
} from './cryptoHelpers';

/**
 * SCENARIO 1: Alice Sending a Message to Bob
 * Divided into the 4 core learning subparts:
 * 1. Encryption on Alice's Side
 * 2. Routing to Bob Across the Internet
 * 3. Decryption on Bob's Side
 * 4. Hacker Interception & Cryptographic Defense
 */

export const lessonAliceEncryption: Lesson = {
  id: 'alice-encryption',
  title: '1. Encrypting on Alice’s Side',
  summary:
    'Watch Alice turn a readable message into unreadable ciphertext before a single bit leaves her device.',
  minutes: 8,
  level: 'beginner',
  metrics: ['state', 'algorithm', 'keyType', 'confidentiality'],
  legend: [
    ['mine', 'Plaintext message'],
    ['write', 'Secret key input'],
    ['empty', 'Encrypted ciphertext'],
    ['ping', 'Nonce / auth tag'],
  ],
  goals: [
    { text: 'Distinguish plaintext from ciphertext', step: 0 },
    { text: 'See how a cipher combines message + secret key', step: 2 },
    { text: 'Understand why a fresh nonce prevents identical outputs', step: 4 },
    { text: 'Know why encryption happens before leaving Alice’s device', step: 5 },
  ],
  steps: [
    {
      short: 'Plaintext',
      chapter: 'setup',
      title: 'Alice writes a private message',
      body: [
        'Alice wants to send a private note to Bob: <code>"Meet at Lab 4B at 5 PM"</code>. Right now, this message is <span class="term">plaintext</span> — human-readable characters encoded directly as bytes (UTF-8).',
        'If Alice drops this plaintext straight onto the network, every router, Wi-Fi hotspot, and observer along the path can read it like a postcard.',
      ],
      callout: {
        kind: 'insight',
        text: 'Never trust the network wire. Confidentiality starts inside the sender’s device before transmission.',
      },
      metrics: {
        state: 'Plaintext',
        algorithm: 'None',
        keyType: 'None',
        confidentiality: 'Exposed',
      },
      scene: {
        entities: {
          aliceZone: zone(
            { x0: -14, x1: 6, y0: -10, y1: 10 },
            'Alice’s Device (Trusted Boundary)'
          ),
          alice: aliceDev(-6, 0, [{ text: '"Meet at Lab 4B at 5 PM"', tone: 'amber', icon: 'mail' }]),
          outbox: block(12, 0, {
            color: 'slab',
            glyph: 'globe',
            label: ['Open', 'Internet'],
            sub: 'untrusted',
          }),
          card: panel(
            { x: -6, y: -10, dx: 0, dy: -160 },
            'Raw Plaintext Bytes',
            [
              'Text : "Meet at Lab 4B at 5 PM"',
              'Hex  : 4d 65 65 74 20 61 74 20 ...',
              '! Readable by anyone on the wire',
            ],
            { icon: 'mail' }
          ),
        },
        links: {
          ao: link('alice', 'outbox', ['alice', 'outbox'], {
            style: 'dashed',
            label: 'unprotected wire',
            labelTone: 'red',
          }),
        },
        flows: [{ route: ['ao'], kind: 'mine', rate: 0.7 }],
      },
    },
    {
      short: 'Secret Key',
      chapter: 'technique',
      title: 'Load a secret cryptographic key',
      body: [
        'Before encrypting, Alice’s app loads a <span class="term">secret key</span> — a random 256-bit number (32 bytes) shared exclusively with Bob, never spoken aloud in public.',
        'By <b>Kerckhoffs’s Principle</b>, the encryption algorithm itself can be completely public. Security rests entirely on keeping this key secret and unpredictable.',
      ],
      callout: {
        kind: 'tip',
        text: 'A 256-bit key has 2²⁵⁶ possibilities — more than the number of atoms in the observable universe.',
      },
      changes: ['+ 256-bit Secret Key loaded in local memory', '~ Algorithm stays public; only the key is secret'],
      metrics: {
        state: 'Plaintext',
        algorithm: 'AES-256',
        keyType: '256-bit Symmetric',
        confidentiality: 'Pending',
      },
      scene: {
        entities: {
          aliceZone: zone(
            { x0: -16, x1: 8, y0: -12, y1: 12 },
            'Alice’s Device (Local Crypto Engine)'
          ),
          alice: aliceDev(-11, -2, [{ text: '"Meet at Lab 4B"', icon: 'mail' }]),
          key: keyVault(-1, -10, 'Key K', [{ text: '256-bit secret', tone: 'amber', icon: 'key' }]),
          cipher: cipherBlock(-1, 2, ['AES-256', 'Cipher'], 'encrypt()', [
            { text: 'ready for input', tone: 'blue', icon: 'lock' },
          ]),
          outbox: block(14, 2, {
            color: 'slab',
            glyph: 'globe',
            label: ['Open', 'Internet'],
            sub: 'untrusted',
          }),
        },
        links: {
          ac: link('alice', 'cipher', ['alice', 'cipher'], { label: 'plaintext' }),
          kc: link('key', 'cipher', ['key', 'cipher'], { label: '256-bit key K', labelTone: 'amber' }),
          co: link('cipher', 'outbox', ['cipher', 'outbox'], { style: 'off' }),
        },
        flows: [
          { route: ['ac'], kind: 'mine', rate: 0.7 },
          { route: ['kc'], kind: 'write', rate: 0.6 },
        ],
      },
    },
    {
      short: 'Cipher Engine',
      chapter: 'technique',
      title: 'Confusion & diffusion inside the cipher',
      body: [
        'Alice’s plaintext enters the <span class="term">cipher engine</span> alongside Key K. Over 14 rounds of mathematical substitutions and permutations, every character is scrambled across the entire block.',
        'Two properties make this unbreakable: <b>confusion</b> (hiding the relationship between key and output) and <b>diffusion</b> (changing one input letter scrambles half the output bits).',
      ],
      changes: ['~ Plaintext + Key K enter AES-256 rounds', '+ Confusion & diffusion scramble every byte'],
      metrics: {
        state: 'Encrypting...',
        algorithm: 'AES-256',
        keyType: '256-bit Symmetric',
        confidentiality: 'Protected',
      },
      scene: {
        entities: {
          aliceZone: zone(
            { x0: -16, x1: 8, y0: -12, y1: 12 },
            'Alice’s Device (Local Crypto Engine)'
          ),
          alice: aliceDev(-11, -2, [{ text: 'plaintext input', icon: 'mail' }]),
          key: keyVault(-1, -10, 'Key K', [{ text: '14 round keys', tone: 'amber', icon: 'key' }]),
          cipher: cipherBlock(-1, 2, ['AES-256', 'Cipher'], '14 rounds', [
            { text: 'SubBytes · MixColumns', tone: 'violet', icon: 'braces' },
          ]),
          outbox: block(14, 2, {
            color: 'slab',
            glyph: 'globe',
            label: ['Open', 'Internet'],
            sub: 'untrusted',
          }),
          card: panel(
            { x: 14, y: -10, dx: 0, dy: -160 },
            'Transformation Inside Alice’s Device',
            [
              'Input  : "Meet at Lab 4B at 5 PM"',
              'Key K  : 7c9a...f01e (256-bit)',
              '= Output: 9f4c b10e 3a7d 88e2...',
              '# Looks indistinguishable from noise',
            ],
            { icon: 'lock' }
          ),
        },
        links: {
          ac: link('alice', 'cipher', ['alice', 'cipher'], { label: 'plaintext' }),
          kc: link('key', 'cipher', ['key', 'cipher'], { label: 'key K', labelTone: 'amber' }),
          co: link('cipher', 'outbox', ['cipher', 'outbox'], {
            label: 'ciphertext',
            labelTone: 'green',
          }),
        },
        flows: [
          { route: ['ac'], kind: 'mine', rate: 0.9 },
          { route: ['kc'], kind: 'write', rate: 0.7 },
          { route: ['co'], kind: 'empty', rate: 0.9 },
        ],
      },
    },
    {
      short: 'Nonce & Tag',
      chapter: 'solution',
      title: 'Add a fresh nonce and authentication tag',
      body: [
        'What if Alice sends <code>"Yes"</code> twice with the same key? Without randomness, both messages would produce identical ciphertext — leaking a pattern to observers.',
        'Modern authenticated encryption (<span class="term">AES-GCM</span>) mixes in a fresh random <span class="term">nonce</span> (number used once) every time, and attaches a 128-bit <b>authentication tag</b> so Bob can detect if even 1 bit is altered on the wire.',
      ],
      callout: {
        kind: 'tip',
        text: 'The nonce does not need to be secret — it travels alongside the ciphertext — it just must never be reused with the same key.',
      },
      changes: [
        '+ Random 96-bit Nonce added per message',
        '+ 128-bit Auth Tag seals integrity',
        '~ Identical messages now produce totally different ciphertexts',
      ],
      metrics: {
        state: 'Sealed Ciphertext',
        algorithm: 'AES-256-GCM',
        keyType: '256-bit + Nonce',
        confidentiality: 'Strong',
      },
      scene: {
        entities: {
          aliceZone: zone(
            { x0: -16, x1: 8, y0: -12, y1: 12 },
            'Alice’s Device (AES-GCM Envelope)'
          ),
          alice: aliceDev(-11, -2, [{ text: 'plaintext', icon: 'mail' }]),
          key: keyVault(-1, -10, 'Key K', [{ text: 'secret', tone: 'amber', icon: 'key' }]),
          nonce: block(-11, 9, {
            color: 'green',
            glyph: 'refresh',
            s: 3.2,
            h: 30,
            label: ['Nonce'],
            sub: 'random 96-bit',
          }),
          cipher: cipherBlock(-1, 2, ['AES-GCM', 'Envelope'], 'encrypt + tag', [
            { text: 'sealed + tamper-proof', tone: 'green', icon: 'shield' },
          ]),
          outbox: block(14, 2, {
            color: 'blue',
            glyph: 'globe',
            label: ['Open', 'Internet'],
            sub: 'ready to send',
            tags: [{ text: '9f4c...a8e2 + tag', tone: 'green', icon: 'lock' }],
          }),
        },
        links: {
          ac: link('alice', 'cipher', ['alice', 'cipher'], { label: 'plaintext' }),
          kc: link('key', 'cipher', ['key', 'cipher'], { label: 'key K', labelTone: 'amber' }),
          nc: link('nonce', 'cipher', ['nonce', 'cipher'], { label: 'fresh nonce', labelTone: 'green' }),
          co: link('cipher', 'outbox', ['cipher', 'outbox'], {
            label: 'nonce + ciphertext + tag',
            labelTone: 'green',
          }),
        },
        flows: [
          { route: ['ac'], kind: 'mine', rate: 0.8 },
          { route: ['kc'], kind: 'write', rate: 0.6 },
          { route: ['nc'], kind: 'ping', rate: 0.7 },
          { route: ['co'], kind: 'empty', rate: 1.0 },
        ],
      },
    },
    {
      short: 'Recap',
      chapter: 'recap',
      title: 'Ready to enter the untrusted internet',
      body: [
        'Alice’s original message never touches the Wi-Fi or ISP cables. Only the sealed packet — containing the public nonce, randomized ciphertext, and integrity tag — leaves her device.',
        `<ul class="takeaways">
          <li><b>Plaintext</b> stays strictly inside Alice’s device.</li>
          <li><b>Key K + Cipher</b> transform text into random-looking bytes.</li>
          <li>A fresh <b>Nonce</b> ensures repeated messages look completely different.</li>
          <li>An <b>Auth Tag</b> guarantees any mid-flight tampering will be caught.</li>
        </ul>`,
      ],
      callout: {
        kind: 'next',
        text: 'Next subpart: <b>2. Reaching Bob Across the Internet</b> — how this encrypted packet finds Bob among millions of connected devices.',
      },
      metrics: {
        state: 'Sealed Ciphertext',
        algorithm: 'AES-256-GCM',
        keyType: '256-bit + Nonce',
        confidentiality: 'Protected',
      },
      scene: {
        entities: {
          alice: aliceDev(-12, 0, [{ text: 'encrypted locally', tone: 'green', icon: 'lock' }]),
          cipher: cipherBlock(0, 0, ['AES-GCM'], '9f4c...a8e2', [
            { text: 'sealed packet', tone: 'green', icon: 'shield' },
          ]),
          outbox: block(13, 0, {
            color: 'blue',
            glyph: 'globe',
            label: ['Internet'],
            sub: 'to Bob →',
          }),
          card: panel(
            { x: 0, y: -10, dx: 0, dy: -155 },
            'Wire Packet Structure',
            [
              '[ Nonce: 4a19c0... ] (public)',
              '[ Ciphertext: 9f4cb10e... ] (locked)',
              '[ Auth Tag: d7e3... ] (tamper seal)',
              '= Safe to transmit over public networks',
            ],
            { icon: 'shield' }
          ),
        },
        links: {
          ac: link('alice', 'cipher', ['alice', 'cipher'], { label: 'plaintext' }),
          co: link('cipher', 'outbox', ['cipher', 'outbox'], {
            label: 'sealed packet',
            labelTone: 'green',
          }),
        },
        flows: [
          { route: ['ac'], kind: 'mine', rate: 0.7 },
          { route: ['co'], kind: 'empty', rate: 1.0 },
        ],
      },
    },
  ],
};

export const lessonInternetRouting: Lesson = {
  id: 'internet-routing',
  title: '2. Reaching Bob Across the Internet',
  summary:
    'Millions of users share the same public internet — see how Alice’s encrypted packet is addressed and routed to Bob and nobody else.',
  minutes: 8,
  level: 'beginner',
  metrics: ['hops', 'recipient', 'state', 'confidentiality'],
  legend: [
    ['empty', 'Encrypted packet for Bob'],
    ['ping', 'DNS / address lookup'],
    ['req', 'Other internet traffic'],
    ['res', 'Delivery ACK'],
  ],
  goals: [
    { text: 'Understand why the internet is a shared public network', step: 0 },
    { text: 'See how DNS and IP headers address Bob’s exact device', step: 1 },
    { text: 'Watch routers forward packets hop-by-hop without reading payloads', step: 2 },
    { text: 'Distinguish visible routing headers from encrypted payload', step: 3 },
  ],
  steps: [
    {
      short: 'Crowded Net',
      chapter: 'setup',
      title: 'A shared network of billions of users',
      body: [
        'Alice and Bob are not connected by a private wire. Between them sits the public internet — millions of users, coffee-shop routers, ISPs, and undersea cables all carrying traffic at the same time.',
        'How does Alice’s encrypted message avoid landing on Carol’s laptop or Dave’s phone, and arrive reliably at Bob’s screen?',
      ],
      metrics: {
        hops: '—',
        recipient: 'Unaddressed',
        state: 'Encrypted',
        confidentiality: 'Protected',
      },
      scene: {
        entities: {
          alice: aliceDev(-14, -4, [{ text: 'ciphertext ready', tone: 'green', icon: 'lock' }]),
          others: crowd({ x0: -4, x1: 5, y0: -16, y1: -9 }, 14, 'millions of internet users'),
          bob: bobDev(14, 5, [{ text: 'waiting for message', icon: 'user' }]),
          cloud: zone({ x0: -7, x1: 7, y0: -4, y1: 10 }, 'Public Internet'),
          r1: routerNode(0, 3, ['ISP', 'Backbone'], 'shared routers'),
        },
        links: {
          ar: link('alice', 'r1', ['alice', 'r1'], { style: 'dashed', label: 'where is Bob?' }),
          or: link('others', 'r1', ['others', 'r1'], { style: 'off' }),
        },
        flows: [{ route: ['or'], kind: 'req', rate: 1.6 }],
      },
    },
    {
      short: 'IP Address',
      chapter: 'technique',
      title: 'Envelope addressing: DNS & IP headers',
      body: [
        'Every device or messaging endpoint on the internet has a unique <span class="term">IP address</span> (like <code>203.0.113.42</code>) and a port/user ID. Alice’s device resolves Bob’s destination address via <span class="term">DNS</span> or the messaging server’s directory.',
        'Alice wraps her encrypted payload inside an <b>IP packet header</b> containing <code>From: Alice</code> and <code>To: Bob (203.0.113.42)</code> — just like writing a street address on the outside of a locked steel box.',
      ],
      callout: {
        kind: 'insight',
        text: 'Routing headers must remain readable so routers know where to forward the packet — while the message inside stays completely encrypted!',
      },
      changes: [
        '+ DNS / Directory resolves Bob’s exact IP address',
        '+ Packet wrapped with Source & Destination IP header',
      ],
      metrics: {
        hops: '1 lookup',
        recipient: 'Bob (203.0.113.42)',
        state: 'Addressed Cipher',
        confidentiality: 'Protected',
      },
      scene: {
        entities: {
          alice: aliceDev(-13, 0, [{ text: 'To: 203.0.113.42', tone: 'blue', icon: 'signpost' }]),
          dns: block(-2, -11, {
            color: 'yellow',
            glyph: 'globe',
            s: 3.5,
            h: 36,
            label: ['DNS /', 'Directory'],
            sub: 'bob → 203.0.113.42',
          }),
          bob: bobDev(13, 0, [{ text: 'IP: 203.0.113.42', tone: 'green', icon: 'userCheck' }]),
          card: panel(
            { x: 0, y: 12, dx: 0, dy: 0 },
            'Packet = Clear Header + Locked Body',
            [
              'Header : From 198.51.100.7 → To 203.0.113.42',
              'Port   : 443 (HTTPS / Encrypted)',
              '= Payload: 9f4c b10e 3a7d... (unreadable)',
              '# Routers read ONLY the header',
            ],
            { icon: 'route' }
          ),
        },
        links: {
          ad: link('alice', 'dns', ['alice', 'dns'], {
            heads: 'both',
            label: 'find Bob’s address',
          }),
        },
        flows: [{ route: ['ad'], kind: 'ping', rate: 0.9, bounce: true }],
      },
    },
    {
      short: 'Hop by Hop',
      chapter: 'technique',
      title: 'Routers forward the packet hop by hop',
      body: [
        'Alice’s local Wi-Fi router reads the destination IP, checks its <span class="term">routing table</span>, and hands the packet to the next ISP router closer to Bob.',
        'At each hop, routers ignore the encrypted payload completely. They only inspect the destination IP prefix and forward the packet down the fastest healthy link.',
      ],
      changes: [
        '+ Packet enters Router 1 → Core ISP → Bob’s Gateway',
        '~ Each router checks routing table and forwards',
      ],
      metrics: {
        hops: '3 routers',
        recipient: 'Routing to Bob',
        state: 'Ciphertext in transit',
        confidentiality: 'Protected',
      },
      scene: {
        entities: {
          alice: aliceDev(-15, -3, [{ text: 'sending packet', icon: 'send' }]),
          r1: routerNode(-6, -3, ['Home', 'Router'], 'hop 1'),
          r2: block(2, -3, {
            color: 'blue',
            glyph: 'network',
            s: 4,
            h: 42,
            label: ['ISP Core', 'Router'],
            sub: 'hop 2 · routing table',
            tags: [{ text: '203.0.113.* → East', tone: 'blue', icon: 'signpost' }],
          }),
          r3: routerNode(10, 4, ['Bob’s', 'Gateway'], 'hop 3'),
          others: crowd({ x0: -2, x1: 6, y0: -15, y1: -10 }, 10, 'other users (ignored)'),
          bob: bobDev(16, 10, [{ text: '203.0.113.42', tone: 'green', icon: 'userCheck' }]),
        },
        links: {
          a1: link('alice', 'r1', ['alice', 'r1'], { label: 'Wi-Fi' }),
          r12: link('r1', 'r2', ['r1', 'r2'], { label: 'ISP link' }),
          r23: link('r2', 'r3', ['r2', ['r3', 'r2'], 'r3'], { label: 'matched 203.0.113.*' }),
          r3b: link('r3', 'bob', ['r3', 'bob'], { label: 'local LAN' }),
          r2o: link('r2', 'others', ['r2', 'others'], { style: 'off', label: 'wrong IP · skipped' }),
        },
        flows: [
          { route: ['a1', 'r12', 'r23', 'r3b'], kind: 'empty', rate: 1.0 },
          { route: ['r2o'], kind: 'req', rate: 0.7 },
        ],
      },
    },
    {
      short: 'Exact Delivery',
      chapter: 'solution',
      title: 'Why only Bob receives and opens it',
      body: [
        'When the packet reaches Bob’s gateway router, NAT and local ARP match the exact device MAC address and TCP port waiting for Alice’s session.',
        'Even if a misconfigured router accidentally copied the packet to another user on the internet, <b>no one else holds Bob’s decryption key</b> — so routing gets it to the right door, and cryptography guarantees only Bob can unlock the envelope.',
      ],
      callout: {
        kind: 'tip',
        text: 'TCP sequence numbers and ACKs also guarantee every chunk arrives in exact order without missing bytes.',
      },
      changes: [
        '+ Packet reaches Bob’s exact IP + Port',
        '+ Bob sends back a delivery ACK',
        '~ Other users never receive or cannot read it',
      ],
      metrics: {
        hops: '3 routers',
        recipient: 'Exact Match (Bob)',
        state: 'Delivered Cipher',
        confidentiality: 'Protected',
      },
      scene: {
        entities: {
          alice: aliceDev(-15, -3, [{ text: 'ACK received', tone: 'green', icon: 'check' }]),
          r1: routerNode(-6, -3, ['Home', 'Router'], 'hop 1'),
          r2: block(2, -3, {
            color: 'blue',
            glyph: 'network',
            s: 4,
            h: 42,
            label: ['ISP Core', 'Router'],
            sub: 'sees ciphertext only',
          }),
          r3: routerNode(10, 4, ['Bob’s', 'Gateway'], 'hop 3', [
            { text: 'port 443 → Bob', tone: 'green', icon: 'check' },
          ]),
          bob: bobDev(16, 10, [{ text: 'packet arrived!', tone: 'green', icon: 'inbox' }]),
        },
        links: {
          a1: link('alice', 'r1', ['alice', 'r1'], { heads: 'both' }),
          r12: link('r1', 'r2', ['r1', 'r2'], { heads: 'both' }),
          r23: link('r2', 'r3', ['r2', ['r3', 'r2'], 'r3'], { heads: 'both' }),
          r3b: link('r3', 'bob', ['r3', 'bob'], { heads: 'both', label: 'TCP ACK' }),
        },
        flows: [{ route: ['a1', 'r12', 'r23', 'r3b'], kind: 'empty', rate: 0.9, bounce: true }],
      },
    },
    {
      short: 'Recap',
      chapter: 'recap',
      title: 'Two layers working together',
      body: [
        'Networking and cryptography solve two separate halves of the journey:',
        `<ul class="takeaways">
          <li><b>DNS + IP Headers</b> tell routers exactly which device out of billions should receive the packet.</li>
          <li><b>Hop-by-hop routing</b> steers the packet across untrusted intermediate networks.</li>
          <li><b>Encryption</b> keeps the payload unreadable to every router along the path.</li>
          <li><b>TCP ACKs</b> confirm reliable delivery to Bob’s app.</li>
        </ul>`,
      ],
      callout: {
        kind: 'next',
        text: 'Next subpart: <b>3. Decrypting on Bob’s Side</b> — how Bob verifies integrity and unlocks Alice’s original message.',
      },
      metrics: {
        hops: '3 routers',
        recipient: 'Exact Match (Bob)',
        state: 'Ready to Decrypt',
        confidentiality: 'Protected',
      },
      scene: {
        entities: {
          alice: aliceDev(-13, 0, [{ text: '198.51.100.7', icon: 'lock' }]),
          net: block(0, 0, {
            color: 'blue',
            glyph: 'route',
            label: ['Internet', 'Routers'],
            sub: 'routes by IP header',
            tags: [{ text: 'cannot read payload', tone: 'green', icon: 'eyeOff' }],
          }),
          bob: bobDev(13, 0, [{ text: '203.0.113.42 · received', tone: 'green', icon: 'inbox' }]),
        },
        links: {
          an: link('alice', 'net', ['alice', 'net'], { label: 'header + ciphertext' }),
          nb: link('net', 'bob', ['net', 'bob'], { label: 'exact delivery', labelTone: 'green' }),
        },
        flows: [{ route: ['an', 'nb'], kind: 'empty', rate: 1.0 }],
      },
    },
  ],
};

export const lessonBobDecryption: Lesson = {
  id: 'bob-decryption',
  title: '3. Decrypting on Bob’s Side',
  summary:
    'Follow what happens inside Bob’s device when the ciphertext arrives — verifying tamper seals, applying the matching key, and restoring Alice’s message.',
  minutes: 8,
  level: 'beginner',
  metrics: ['state', 'integrity', 'keyType', 'recipient'],
  legend: [
    ['empty', 'Incoming ciphertext'],
    ['write', 'Bob’s matching key'],
    ['msg', 'Recovered plaintext'],
    ['kill', 'Rejected / wrong key'],
  ],
  goals: [
    { text: 'See why Bob verifies the auth tag BEFORE decrypting', step: 1 },
    { text: 'Watch the inverse cipher + matching key restore plaintext', step: 2 },
    { text: 'Understand what happens if someone tries the wrong key', step: 3 },
  ],
  steps: [
    {
      short: 'Arrival',
      chapter: 'setup',
      title: 'Encrypted bytes arrive at Bob’s device',
      body: [
        'Bob’s messaging app receives the incoming network packet: <code>Nonce: 4a19c0</code>, <code>Ciphertext: 9f4cb10e...</code>, and <code>Auth Tag: d7e3...</code>.',
        'To Bob’s network card, this still looks like meaningless random bytes. Before displaying anything on screen, Bob’s device passes it into its local decryption pipeline.',
      ],
      metrics: {
        state: 'Ciphertext',
        integrity: 'Unchecked',
        keyType: '256-bit Symmetric',
        recipient: 'Bob',
      },
      scene: {
        entities: {
          net: block(-13, 0, {
            color: 'slab',
            glyph: 'globe',
            label: ['Internet'],
            sub: 'incoming packet',
          }),
          bobZone: zone({ x0: -6, x1: 16, y0: -11, y1: 11 }, 'Bob’s Device (Trusted Boundary)'),
          cipher: cipherBlock(1, 0, ['AES-GCM', 'Decrypt'], 'waiting', [
            { text: '9f4c...a8e2 + tag', icon: 'lock' },
          ]),
          bob: bobDev(12, 0, [{ text: 'awaiting plaintext', icon: 'user' }]),
        },
        links: {
          nc: link('net', 'cipher', ['net', 'cipher'], { label: 'ciphertext + nonce + tag' }),
          cb: link('cipher', 'bob', ['cipher', 'bob'], { style: 'off' }),
        },
        flows: [{ route: ['nc'], kind: 'empty', rate: 0.9 }],
      },
    },
    {
      short: 'Verify Tag',
      chapter: 'technique',
      title: 'Step 1: Verify the authentication tag first',
      body: [
        'Bob’s device recomputes the <span class="term">authentication tag</span> over the incoming nonce and ciphertext using his copy of Key K.',
        'If the computed tag matches the packet’s tag (<code>d7e3 == d7e3</code>), Bob knows two vital things immediately: <b>Alice sent this</b> and <b>not a single bit was modified</b> during transit.',
      ],
      callout: {
        kind: 'tip',
        text: 'Golden rule of cryptography: always verify integrity before decrypting or parsing untrusted bytes.',
      },
      changes: ['+ Recompute MAC / Auth Tag with Key K', '+ Tag matches → zero tampering detected'],
      metrics: {
        state: 'Tag Verified',
        integrity: 'Verified',
        keyType: '256-bit Symmetric',
        recipient: 'Bob (Verified)',
      },
      scene: {
        entities: {
          net: block(-14, 0, { color: 'slab', glyph: 'globe', label: ['Internet'] }),
          bobZone: zone({ x0: -6, x1: 16, y0: -12, y1: 12 }, 'Bob’s Device (Verify & Decrypt)'),
          key: keyVault(1, -10, 'Key K', [{ text: 'matching key', tone: 'amber', icon: 'key' }]),
          cipher: cipherBlock(1, 1, ['Tag Check', 'AES-GCM'], 'verify()', [
            { text: 'tag d7e3 ✓ match', tone: 'green', icon: 'circleCheck' },
          ]),
          bob: bobDev(12, 1, [{ text: 'integrity confirmed', tone: 'green', icon: 'shield' }]),
          card: panel(
            { x: -12, y: -10, dx: 0, dy: -140 },
            'Integrity Verification',
            [
              'Packet Tag   : d7e3 90a4 11f8...',
              'Computed Tag : d7e3 90a4 11f8...',
              '= EXACT MATCH · Safe to decrypt',
            ],
            { icon: 'shield' }
          ),
        },
        links: {
          nc: link('net', 'cipher', ['net', 'cipher'], { label: 'ciphertext + tag' }),
          kc: link('key', 'cipher', ['key', 'cipher'], { label: 'matching key K', labelTone: 'amber' }),
          cb: link('cipher', 'bob', ['cipher', 'bob'], { style: 'dashed', label: 'verified' }),
        },
        flows: [
          { route: ['nc'], kind: 'empty', rate: 0.8 },
          { route: ['kc'], kind: 'write', rate: 0.7 },
        ],
      },
    },
    {
      short: 'Decrypt',
      chapter: 'solution',
      title: 'Step 2: Reverse the cipher to recover plaintext',
      body: [
        'Now the engine feeds the ciphertext, the packet’s nonce, and Bob’s Key K through the inverse cipher transformation.',
        'Every mathematical round unwinds in perfect symmetry, restoring the exact original UTF-8 bytes: <code>"Meet at Lab 4B at 5 PM"</code> — displayed cleanly on Bob’s screen.',
      ],
      changes: ['~ Inverse AES rounds unwind ciphertext', '+ Exact plaintext restored on Bob’s screen'],
      metrics: {
        state: 'Decrypted Plaintext',
        integrity: 'Verified',
        keyType: '256-bit Symmetric',
        recipient: 'Bob (Verified)',
      },
      scene: {
        entities: {
          net: block(-14, 0, { color: 'slab', glyph: 'globe', label: ['Internet'] }),
          bobZone: zone({ x0: -6, x1: 16, y0: -12, y1: 12 }, 'Bob’s Device (Plaintext Restored)'),
          key: keyVault(1, -10, 'Key K', [{ text: '256-bit match', tone: 'green', icon: 'key' }]),
          cipher: cipherBlock(1, 1, ['AES-GCM', 'Decrypt'], 'decrypt()', [
            { text: 'unwound cleanly', tone: 'green', icon: 'check' },
          ]),
          bob: bobDev(12, 1, [
            { text: '"Meet at Lab 4B at 5 PM"', tone: 'green', icon: 'mail' },
          ]),
        },
        links: {
          nc: link('net', 'cipher', ['net', 'cipher'], { label: '9f4c...a8e2' }),
          kc: link('key', 'cipher', ['key', 'cipher'], { label: 'key K', labelTone: 'green' }),
          cb: link('cipher', 'bob', ['cipher', 'bob'], {
            label: 'readable plaintext',
            labelTone: 'green',
          }),
        },
        flows: [
          { route: ['nc'], kind: 'empty', rate: 0.9 },
          { route: ['kc'], kind: 'write', rate: 0.6 },
          { route: ['cb'], kind: 'msg', rate: 0.9 },
        ],
      },
    },
    {
      short: 'Wrong Key',
      chapter: 'problem',
      title: 'What if someone tries the wrong key?',
      body: [
        'Suppose another person — or Bob using an outdated key <code>K₂</code> — tries to decrypt Alice’s packet. Even a single flipped bit in the key completely changes every round of the cipher.',
        'The authentication tag check fails immediately, and the cipher refuses to output garbage. Without the exact key K, decryption is mathematically impossible.',
      ],
      callout: {
        kind: 'warn',
        text: 'There is no "close enough" in cryptography: being off by 1 bit out of 256 produces 100% failure.',
      },
      changes: ['− Wrong key K₂ supplied', '− Auth tag mismatch → packet immediately rejected'],
      metrics: {
        state: 'Rejected',
        integrity: 'Tampered / Wrong Key',
        keyType: 'Mismatched Key',
        recipient: 'Wrong Key',
      },
      scene: {
        entities: {
          net: block(-14, 0, { color: 'slab', glyph: 'globe', label: ['Internet'] }),
          key: keyVault(1, -10, 'Wrong K₂', [{ text: '1 bit off!', tone: 'red', icon: 'alert' }]),
          cipher: cipherBlock(1, 1, ['AES-GCM', 'Decrypt'], 'tag mismatch', [
            { text: 'REJECTED · invalid key', tone: 'red', icon: 'ban' },
          ], { heat: 0.75 }),
          bob: bobDev(12, 1, [{ text: 'cannot unlock', tone: 'red', icon: 'lock' }]),
        },
        links: {
          nc: link('net', 'cipher', ['net', 'cipher'], { label: 'ciphertext' }),
          kc: link('key', 'cipher', ['key', 'cipher'], {
            label: 'wrong key K₂',
            labelTone: 'red',
          }),
          cb: link('cipher', 'bob', ['cipher', 'bob'], {
            style: 'cut',
            fail: 1,
            label: 'blocked',
            labelTone: 'red',
          }),
        },
        flows: [
          { route: ['nc'], kind: 'empty', rate: 0.8 },
          { route: ['kc'], kind: 'poison', rate: 0.7 },
          { route: ['cb'], kind: 'kill', rate: 0.8 },
        ],
      },
    },
    {
      short: 'Recap',
      chapter: 'recap',
      title: 'Symmetric encryption & decryption complete',
      body: [
        'Bob recovers Alice’s message safely because both the key and the integrity seal align:',
        `<ul class="takeaways">
          <li><b>Verify first:</b> Bob checks the authentication tag before trusting any bytes.</li>
          <li><b>Matching key:</b> Only the exact key K reverses the cipher cleanly.</li>
          <li><b>Zero leakage:</b> A wrong key fails loudly without revealing partial text.</li>
        </ul>`,
      ],
      callout: {
        kind: 'next',
        text: 'Next subpart: <b>4. Hacker Attack & Confidentiality</b> — see exactly how a hacker attacks the wire and how cryptography defeats them.',
      },
      metrics: {
        state: 'Recovered Plaintext',
        integrity: 'Verified',
        keyType: '256-bit Symmetric',
        recipient: 'Bob (Verified)',
      },
      scene: {
        entities: {
          alice: aliceDev(-13, 0, [{ text: 'Encrypt(M, K)', tone: 'blue', icon: 'lock' }]),
          net: block(0, 0, {
            color: 'purple',
            glyph: 'shield',
            label: ['Encrypted', 'Tunnel'],
            sub: '9f4c...a8e2 + tag',
          }),
          bob: bobDev(13, 0, [{ text: 'Decrypt(C, K) → M', tone: 'green', icon: 'check' }]),
        },
        links: {
          an: link('alice', 'net', ['alice', 'net'], { label: 'ciphertext' }),
          nb: link('net', 'bob', ['net', 'bob'], { label: 'verified plaintext', labelTone: 'green' }),
        },
        flows: [
          { route: ['an'], kind: 'empty', rate: 0.9 },
          { route: ['nb'], kind: 'msg', rate: 0.9 },
        ],
      },
    },
  ],
};

export const lessonHackerInterception: Lesson = {
  id: 'hacker-interception',
  title: '4. Hacker Attack & Confidentiality',
  summary:
    'Watch what happens when Eve sniffs or Mallory alters Alice’s packets in mid-flight — and how cryptography keeps the secret safe.',
  minutes: 10,
  level: 'beginner',
  metrics: ['attackerSees', 'confidentiality', 'integrity', 'attackRisk'],
  legend: [
    ['mine', 'Unencrypted plaintext'],
    ['empty', 'Encrypted ciphertext'],
    ['poison', 'Hacker sniff / tamper'],
    ['kill', 'Tampered packet rejected'],
  ],
  goals: [
    { text: 'Observe passive eavesdropping (packet sniffing) on plaintext', step: 0 },
    { text: 'See active tampering (Man-in-the-Middle) alter a message', step: 1 },
    { text: 'Watch strong encryption turn sniffed traffic into useless noise', step: 2 },
    { text: 'See authenticated encryption catch and drop altered packets', step: 3 },
  ],
  steps: [
    {
      short: 'Sniffing',
      chapter: 'problem',
      title: 'Attack 1: Passive eavesdropping (Packet Sniffing)',
      body: [
        'Imagine Alice sends her message over public café Wi-Fi <b>without encryption</b>. A hacker named <span class="term">Eve</span> sits on the same network running a packet sniffer (like Wireshark).',
        'Eve copies every packet silently. Neither Alice nor Bob notices any slowdown — yet Eve reads <code>"Transfer $500 to Bob"</code> in crystal-clear text.',
      ],
      callout: {
        kind: 'warn',
        text: 'Passive eavesdropping leaves zero trace on the network. You cannot detect a sniffer — you must make captured bytes useless.',
      },
      metrics: {
        attackerSees: 'Full Plaintext!',
        confidentiality: 'Broken',
        integrity: 'None',
        attackRisk: 'Critical',
      },
      scene: {
        entities: {
          alice: aliceDev(-13, -2, [{ text: 'plain HTTP · no lock', tone: 'red', icon: 'eyeOff' }]),
          router: routerNode(0, -2, ['Café', 'Wi-Fi'], 'shared router'),
          bob: bobDev(13, -2, [{ text: 'receives message', icon: 'mail' }]),
          eve: hackerNode(0, 10, 'Eve', [
            { text: 'reads: "Transfer $500"', tone: 'red', icon: 'eye' },
          ]),
        },
        links: {
          ar: link('alice', 'router', ['alice', 'router'], { label: 'plaintext' }),
          rb: link('router', 'bob', ['router', 'bob'], { label: 'plaintext' }),
          re: link('router', 'eve', ['router', 'eve'], {
            style: 'dashed',
            label: 'packet sniffed!',
            labelTone: 'red',
          }),
        },
        flows: [
          { route: ['ar', 'rb'], kind: 'mine', rate: 0.9 },
          { route: ['re'], kind: 'poison', rate: 0.9 },
        ],
      },
    },
    {
      short: 'Tampering',
      chapter: 'problem',
      title: 'Attack 2: Active tampering (Man-in-the-Middle)',
      body: [
        'An active attacker named <span class="term">Mallory</span> goes further than listening. By hijacking the Wi-Fi router (ARP spoofing), Mallory intercepts Alice’s packet, edits the text mid-flight, and forwards the fake version to Bob.',
        'Alice wrote <code>"Pay Bob $50"</code> — but Bob receives <code>"Pay Mallory $5000"</code> and believes it genuinely came from Alice!',
      ],
      callout: {
        kind: 'warn',
        text: 'Without integrity protection, an attacker on the wire doesn’t just spy — they can rewrite your messages silently.',
      },
      changes: [
        '− Mallory intercepts traffic between Alice and Bob',
        '− Message rewritten in transit without Bob knowing',
      ],
      metrics: {
        attackerSees: 'Controls Wire!',
        confidentiality: 'Broken',
        integrity: 'Altered!',
        attackRisk: 'Critical',
      },
      scene: {
        entities: {
          alice: aliceDev(-14, 0, [{ text: 'sent: "Pay Bob $50"', icon: 'mail' }]),
          mallory: hackerNode(0, 0, 'Mallory', [
            { text: 'edits → "Pay Mallory $5000"', tone: 'red', icon: 'bug' },
          ], { heat: 0.8 }),
          bob: bobDev(14, 0, [{ text: 'gets fake message!', tone: 'red', icon: 'alert' }]),
        },
        links: {
          am: link('alice', 'mallory', ['alice', 'mallory'], {
            label: 'intercepted',
            labelTone: 'red',
          }),
          mb: link('mallory', 'bob', ['mallory', 'bob'], {
            label: 'forged payload',
            labelTone: 'red',
          }),
        },
        flows: [
          { route: ['am'], kind: 'mine', rate: 0.8 },
          { route: ['mb'], kind: 'poison', rate: 0.9 },
        ],
      },
    },
    {
      short: 'Encrypt Wire',
      chapter: 'solution',
      title: 'Defense 1: Encryption blinds the sniffer',
      body: [
        'Now turn on <span class="term">AES-256 encryption</span> between Alice and Bob. Eve is still sitting on the café Wi-Fi and still copies 100% of the packets.',
        'But this time Eve’s screen fills with <code>9f4c b10e 3a7d 88e2...</code> — indistinguishable from white noise. Without Key K, Eve cannot recover a single letter.',
      ],
      callout: {
        kind: 'insight',
        text: 'Cryptography does not stop hackers from capturing packets — it makes captured packets completely worthless.',
      },
      changes: [
        '+ AES-256 encryption enabled on Alice’s device',
        '~ Eve captures ciphertext only → zero secrets leaked',
      ],
      metrics: {
        attackerSees: 'Random Bytes',
        confidentiality: 'Protected',
        integrity: 'Unchecked',
        attackRisk: 'Low',
      },
      scene: {
        entities: {
          alice: aliceDev(-13, -2, [{ text: 'AES-256 encrypted', tone: 'green', icon: 'lock' }]),
          router: routerNode(0, -2, ['Café', 'Wi-Fi'], 'shared router'),
          bob: bobDev(13, -2, [{ text: 'decrypts with Key K', tone: 'green', icon: 'key' }]),
          eve: hackerNode(0, 10, 'Eve', [
            { text: 'sees: 9f4c b10e 3a7d…', tone: 'green', icon: 'eyeOff' },
          ]),
        },
        links: {
          ar: link('alice', 'router', ['alice', 'router'], { label: 'ciphertext', labelTone: 'green' }),
          rb: link('router', 'bob', ['router', 'bob'], { label: 'ciphertext', labelTone: 'green' }),
          re: link('router', 'eve', ['router', 'eve'], {
            style: 'dashed',
            label: 'random noise',
            labelTone: 'green',
          }),
        },
        flows: [
          { route: ['ar', 'rb'], kind: 'empty', rate: 0.9 },
          { route: ['re'], kind: 'empty', rate: 0.8 },
        ],
      },
    },
    {
      short: 'Tamper Caught',
      chapter: 'solution',
      title: 'Defense 2: Auth tag catches Mallory’s tampering',
      body: [
        'What if Mallory can’t read the ciphertext, so she flips a few random bytes anyway hoping to corrupt or manipulate Bob’s payment?',
        'With <span class="term">Authenticated Encryption (AEAD / AES-GCM)</span>, flipping even 1 bit invalidates the 128-bit authentication tag. Bob’s device detects the mismatch instantly and drops the tampered packet!',
      ],
      changes: [
        '+ Mallory flips 1 byte in transit',
        '+ Bob’s AES-GCM tag verification fails → tampered packet dropped',
      ],
      metrics: {
        attackerSees: 'Blocked',
        confidentiality: 'Protected',
        integrity: 'Tamper-Proof',
        attackRisk: 'Mitigated',
      },
      scene: {
        entities: {
          alice: aliceDev(-14, 0, [{ text: 'ciphertext + tag', tone: 'green', icon: 'lock' }]),
          mallory: hackerNode(0, 0, 'Mallory', [
            { text: 'flips 1 byte in transit', tone: 'amber', icon: 'bug' },
          ]),
          bob: bobDev(14, 0, [{ text: 'TAG INVALID · DROPPED', tone: 'green', icon: 'shield' }]),
          card: panel(
            { x: 0, y: -11, dx: 0, dy: -155 },
            'How AEAD Stops Tampering',
            [
              'Alice sends  : 9f4c... + Tag(d7e3)',
              'Mallory flips: 9f4d... + Tag(d7e3)',
              'Bob computes : Expected Tag(82a1) ≠ d7e3',
              '= Packet rejected before decryption!',
            ],
            { icon: 'shield' }
          ),
        },
        links: {
          am: link('alice', 'mallory', ['alice', 'mallory'], { label: 'sealed packet' }),
          mb: link('mallory', 'bob', ['mallory', 'bob'], {
            style: 'dashed',
            fail: 0.95,
            label: 'tampered → rejected',
            labelTone: 'red',
          }),
        },
        flows: [
          { route: ['am'], kind: 'empty', rate: 0.9 },
          { route: ['mb'], kind: 'poison', rate: 0.9 },
        ],
      },
    },
    {
      short: 'Recap',
      chapter: 'recap',
      title: 'Scenario 1 Complete: The Alice-to-Bob Lifecycle',
      body: [
        'You have now experienced all four parts of secure messaging from start to finish:',
        `<ul class="takeaways">
          <li><b>1. Alice Encrypts:</b> Plaintext + Key + Nonce become unreadable ciphertext before leaving her device.</li>
          <li><b>2. Internet Routes:</b> DNS &amp; IP headers steer the sealed packet safely across shared routers to Bob.</li>
          <li><b>3. Bob Decrypts:</b> Bob verifies the integrity tag and applies his matching key to recover the message.</li>
          <li><b>4. Hackers Defeated:</b> Eve sees only noise, and Mallory’s tampering is caught and rejected.</li>
        </ul>`,
      ],
      callout: {
        kind: 'next',
        text: 'Next Scenario: <b>02. Symmetric Ciphers</b> — peek inside classical ciphers and modern AES-256 rounds to see how scrambling actually works.',
      },
      metrics: {
        attackerSees: 'Random Bytes',
        confidentiality: 'End-to-End',
        integrity: 'Tamper-Proof',
        attackRisk: 'Mitigated',
      },
      scene: {
        entities: {
          alice: aliceDev(-14, -2, [{ text: '1. Encrypts', tone: 'green', icon: 'lock' }]),
          net: block(0, -2, {
            color: 'blue',
            glyph: 'route',
            label: ['2. Public', 'Internet'],
            sub: 'routes to Bob',
          }),
          bob: bobDev(14, -2, [{ text: '3. Verifies & Decrypts', tone: 'green', icon: 'check' }]),
          eve: hackerNode(0, 10, 'Eve / Mallory', [
            { text: '4. Sees noise · Cannot alter', tone: 'green', icon: 'eyeOff' },
          ]),
        },
        links: {
          an: link('alice', 'net', ['alice', 'net'], { label: 'AES-GCM', labelTone: 'green' }),
          nb: link('net', 'bob', ['net', 'bob'], { label: 'AES-GCM', labelTone: 'green' }),
          ne: link('net', 'eve', ['net', 'eve'], { style: 'dashed', label: 'useless ciphertext' }),
        },
        flows: [
          { route: ['an', 'nb'], kind: 'empty', rate: 1.0 },
          { route: ['ne'], kind: 'empty', rate: 0.7 },
        ],
      },
    },
  ],
};

export const SCENARIO_1_LESSONS: Lesson[] = [
  lessonAliceEncryption,
  lessonInternetRouting,
  lessonBobDecryption,
  lessonHackerInterception,
];
