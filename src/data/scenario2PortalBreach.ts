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
  zone,
} from './cryptoHelpers';

/**
 * SCENARIO 2: University Portal Login & Database Breach
 * Real-world setting: Campus web portal authentication, password hashing, salting,
 * login verification, and surviving a stolen SQL user database.
 */

export const lessonPortalPasswordHash: Lesson = {
  id: 'portal-password-hash',
  title: '1. Hashing Passwords at Signup',
  summary:
    'A student registers on the university portal. See why the server never stores the real password and instead converts it into a one-way cryptographic hash.',
  minutes: 7,
  level: 'beginner',
  metrics: ['dbState', 'algorithm', 'crackTime', 'attackerSees'],
  legend: [
    ['mine', 'Raw password (TLS)'],
    ['msg', 'One-way hash digest'],
    ['poison', 'Plaintext exposure risk'],
  ],
  goals: [
    { text: 'See why storing plaintext passwords is catastrophic', step: 0 },
    { text: 'Understand one-way cryptographic hashing (irreversible)', step: 1 },
    { text: 'Distinguish hashing (no key, one-way) from encryption (two-way)', step: 2 },
  ],
  steps: [
    {
      short: 'Bad Storage',
      chapter: 'problem',
      title: 'The rookie mistake: saving passwords as plaintext',
      body: [
        'Priya registers on her college portal with password <code>"Campus@2026"</code>. A careless developer writes that exact string straight into the <code>users</code> SQL table.',
        'Now anyone with database read access — a rogue admin, an exposed backup, or a SQL injection hacker — can read every student’s real password immediately (and reuse them on Gmail and banking sites).',
      ],
      callout: {
        kind: 'warn',
        text: 'Even the website’s own engineers should never be able to read your password.',
      },
      metrics: {
        dbState: 'Plaintext!',
        algorithm: 'None',
        crackTime: '0 ms (instant)',
        attackerSees: 'All Passwords!',
      },
      scene: {
        entities: {
          student: device(-14, 0, {
            form: 'laptop',
            label: 'Priya',
            tags: [{ text: 'signup: "Campus@2026"', tone: 'amber', icon: 'user' }],
          }),
          portal: block(-1, 0, {
            color: 'blue',
            glyph: 'server',
            label: ['Campus', 'Portal'],
            sub: 'auth API',
          }),
          userDb: db(13, 0, {
            label: 'Users DB',
            heat: 0.7,
            tags: [{ text: 'priya : "Campus@2026"', tone: 'red', icon: 'alert' }],
          }),
        },
        links: {
          sp: link('student', 'portal', ['student', 'portal'], { label: 'POST /signup' }),
          pd: link('portal', 'userDb', ['portal', 'userDb'], {
            label: 'INSERT raw password',
            labelTone: 'red',
          }),
        },
        flows: [
          { route: ['sp'], kind: 'mine', rate: 0.8 },
          { route: ['pd'], kind: 'poison', rate: 0.9 },
        ],
      },
    },
    {
      short: 'One-Way Hash',
      chapter: 'solution',
      title: 'Pass the password through a one-way hash function',
      body: [
        'Instead of saving <code>"Campus@2026"</code>, the portal feeds it into a <span class="term">one-way cryptographic hash</span>. Out comes a fixed-length scrambled digest: <code>8c6976e5b541...</code>.',
        'The original password is thrown away from memory immediately. Unlike encryption, there is <b>no decryption key</b> — you cannot run a hash backward to recover the password.',
      ],
      changes: [
        '+ Hash Engine computes irreversible digest',
        '− Raw password discarded from RAM',
        '~ Database stores only the fixed-length hash',
      ],
      metrics: {
        dbState: 'Unsalted Hash',
        algorithm: 'SHA-256',
        crackTime: 'Hours (needs salt)',
        attackerSees: 'Hash Digest',
      },
      scene: {
        entities: {
          student: device(-14, 0, {
            form: 'laptop',
            label: 'Priya',
            tags: [{ text: '"Campus@2026"', icon: 'key' }],
          }),
          hasher: cipherBlock(-1, 0, ['Hash', 'Engine'], 'one-way only', [
            { text: 'cannot be reversed', tone: 'violet', icon: 'fingerprint' },
          ]),
          userDb: db(13, 0, {
            label: 'Users DB',
            tags: [{ text: 'priya : 8c6976e5…', tone: 'green', icon: 'hash' }],
          }),
          card: panel(
            { x: 0, y: -11, dx: 0, dy: -145 },
            'Hashing vs. Encryption',
            [
              'Encryption : 2-way (needs key to unlock)',
              'Hashing    : 1-way (no key, irreversible)',
              '= "Campus@2026" → 8c6976e5b541...',
            ],
            { icon: 'fingerprint' }
          ),
        },
        links: {
          sh: link('student', 'hasher', ['student', 'hasher'], { label: 'password (HTTPS)' }),
          hd: link('hasher', 'userDb', ['hasher', 'userDb'], {
            label: 'digest only',
            labelTone: 'green',
          }),
        },
        flows: [
          { route: ['sh'], kind: 'mine', rate: 0.8 },
          { route: ['hd'], kind: 'msg', rate: 0.9 },
        ],
      },
    },
    {
      short: 'Deterministic',
      chapter: 'insight',
      title: 'Why one flaw still hides inside plain hashing',
      body: [
        'Plain hashing is <b>deterministic</b>: the exact same password always produces the exact same hash. If two students both pick <code>"Password123"</code>, their database rows look identical.',
        'Even worse, hackers precompute billions of common passwords into lookup charts called <b>Rainbow Tables</b>. We need one more ingredient to break that pattern.',
      ],
      callout: {
        kind: 'next',
        text: 'Next subpart: <b>2. Adding a Unique Salt</b> — how random per-user seasoning defeats identical-password leaks.',
      },
      metrics: {
        dbState: 'Unsalted Hash',
        algorithm: 'SHA-256',
        crackTime: 'Seconds (common pw)',
        attackerSees: 'Duplicate Hashes',
      },
      scene: {
        entities: {
          s1: device(-14, -6, { form: 'phone', label: 'Priya', tags: [{ text: '"Pass123"', icon: 'key' }] }),
          s2: device(-14, 6, { form: 'phone', label: 'Rohan', tags: [{ text: '"Pass123"', icon: 'key' }] }),
          hasher: cipherBlock(-1, 0, ['Plain', 'SHA-256'], 'no salt'),
          userDb: db(13, 0, {
            label: 'Users DB',
            tags: [{ text: '2 identical hashes!', tone: 'amber', icon: 'alert' }],
          }),
        },
        links: {
          l1: link('s1', 'hasher', ['s1', 'hasher']),
          l2: link('s2', 'hasher', ['s2', 'hasher']),
          hd: link('hasher', 'userDb', ['hasher', 'userDb'], {
            label: 'same digest for both!',
            labelTone: 'amber',
          }),
        },
        flows: [
          { route: ['l1', 'hd'], kind: 'mine', rate: 0.7 },
          { route: ['l2', 'hd'], kind: 'mine', rate: 0.7 },
        ],
      },
    },
  ],
};

export const lessonPortalUniqueSalt: Lesson = {
  id: 'portal-unique-salt',
  title: '2. Salting Identical Passwords',
  summary:
    'Priya and Rohan accidentally choose the exact same password. Watch how a unique random salt makes their stored digests look completely unrelated.',
  minutes: 7,
  level: 'beginner',
  metrics: ['dbState', 'algorithm', 'crackTime', 'attackerSees'],
  legend: [
    ['mine', 'Same password input'],
    ['ping', 'Unique random salt'],
    ['msg', 'Totally unique salted hash'],
  ],
  goals: [
    { text: 'Understand what a cryptographic Salt is', step: 0 },
    { text: 'See two identical passwords produce totally different stored hashes', step: 1 },
    { text: 'Learn why slow memory-hard hashes (Argon2id) beat fast SHA-256 for passwords', step: 2 },
  ],
  steps: [
    {
      short: 'Random Salt',
      chapter: 'technique',
      title: 'Generate a fresh 128-bit random salt per user',
      body: [
        'When each student signs up, the server asks its cryptographic random generator for a unique <span class="term">salt</span> — a random string like <code>s1 = 9a4f2c</code> for Priya and <code>s2 = 7e1b80</code> for Rohan.',
        'The salt is glued onto the password <b>before</b> hashing: <code>Hash(salt + password)</code>. The salt does not need to be secret — it is stored right next to the hash.',
      ],
      metrics: {
        dbState: 'Salted Hash',
        algorithm: 'Salt + Hash',
        crackTime: 'Years',
        attackerSees: 'No Pattern Match',
      },
      scene: {
        entities: {
          s1: device(-14, -6, { form: 'phone', label: 'Priya', tags: [{ text: '"Pass123" + 9a4f', tone: 'blue', icon: 'key' }] }),
          s2: device(-14, 6, { form: 'phone', label: 'Rohan', tags: [{ text: '"Pass123" + 7e1b', tone: 'violet', icon: 'key' }] }),
          rng: block(-2, -11, {
            color: 'green',
            glyph: 'refresh',
            s: 3.2,
            h: 30,
            label: ['CSPRNG'],
            sub: 'fresh 128-bit salts',
          }),
          hasher: cipherBlock(-1, 1, ['Salted', 'Hasher'], 'Hash(salt + pw)', [
            { text: 'avalanche separates outputs', tone: 'green', icon: 'zap' },
          ]),
          userDb: db(13, 1, {
            label: 'Users DB',
            tags: [{ text: 'unique per row ✓', tone: 'green', icon: 'circleCheck' }],
          }),
        },
        links: {
          r1: link('rng', 'hasher', ['rng', 'hasher'], { label: 'unique salts', labelTone: 'green' }),
          l1: link('s1', 'hasher', ['s1', 'hasher']),
          l2: link('s2', 'hasher', ['s2', 'hasher']),
          hd: link('hasher', 'userDb', ['hasher', 'userDb'], { label: '2 totally different digests', labelTone: 'green' }),
        },
        flows: [
          { route: ['r1'], kind: 'ping', rate: 0.7 },
          { route: ['l1', 'hd'], kind: 'msg', rate: 0.8 },
          { route: ['l2', 'hd'], kind: 'empty', rate: 0.8 },
        ],
      },
    },
    {
      short: 'Slow KDF',
      chapter: 'solution',
      title: 'Why passwords need a deliberately SLOW hash (Argon2id)',
      body: [
        'SHA-256 is designed to be lightning fast — a single gaming GPU can test <b>20 billion SHA-256 hashes per second</b>! Speed helps file integrity, but hurts password defense.',
        'Password hashing uses a deliberately slow, memory-hard <span class="term">Key Derivation Function</span> like <b>Argon2id</b> or <b>bcrypt</b>. Taking 150 ms per login is invisible to a human student, yet slows a hacker’s GPU rig down by over <b>1,000,000×</b>!',
      ],
      callout: {
        kind: 'insight',
        text: 'Use SHA-256 for files and digital signatures; ALWAYS use Argon2id or bcrypt for user passwords.',
      },
      changes: [
        '+ Switched from fast SHA-256 to memory-hard Argon2id',
        '~ Human login still takes ~150 ms; GPU brute force drops 1,000,000×',
      ],
      metrics: {
        dbState: 'Salted Argon2id',
        algorithm: 'Argon2id',
        crackTime: 'Centuries',
        attackerSees: 'Useless Hashes',
      },
      scene: {
        entities: {
          fast: block(-11, -5, {
            color: 'orange',
            glyph: 'zap',
            s: 3.6,
            h: 36,
            label: ['SHA-256'],
            sub: '20B guesses / sec',
            tags: [{ text: 'too fast for passwords!', tone: 'red', icon: 'alert' }],
          }),
          slow: cipherBlock(-11, 7, ['Argon2id'], '64 MB RAM · 150 ms', [
            { text: 'GPU-resistant ✓', tone: 'green', icon: 'shield' },
          ]),
          userDb: db(12, 1, {
            label: 'Users DB',
            tags: [{ text: 'salt + Argon2id hash', tone: 'green', icon: 'lock' }],
          }),
          card: panel(
            { x: 1, y: -11, dx: 0, dy: -140 },
            'Stored Database Row',
            [
              'User : priya@campus.edu',
              'Salt : 9a4f2c810d7e...',
              'Hash : $argon2id$m=65536$t=3$...',
              '= Unique & GPU-hardened',
            ],
            { icon: 'database' }
          ),
        },
        links: {
          sd: link('slow', 'userDb', ['slow', 'userDb'], { label: 'stored safely', labelTone: 'green' }),
        },
        flows: [{ route: ['sd'], kind: 'msg', rate: 0.7 }],
      },
    },
    {
      short: 'Recap',
      chapter: 'recap',
      title: 'Salting + Argon2id complete',
      body: [
        `<ul class="takeaways">
          <li><b>Unique Salt:</b> Ensures identical passwords never produce identical hashes and kills precomputed Rainbow Tables.</li>
          <li><b>Memory-Hard Argon2id:</b> Slows down automated cracking rigs without annoying real users.</li>
        </ul>`,
      ],
      callout: {
        kind: 'next',
        text: 'Next subpart: <b>3. Verifying Login Without Knowing the Password</b> — how Priya logs back in tomorrow.',
      },
      metrics: {
        dbState: 'Salted Argon2id',
        algorithm: 'Argon2id',
        crackTime: 'Centuries',
        attackerSees: 'Useless Hashes',
      },
      scene: {
        entities: {
          s1: device(-13, 0, { form: 'laptop', label: 'Priya', tags: [{ text: 'registered ✓', tone: 'green', icon: 'check' }] }),
          argon: cipherBlock(0, 0, ['Argon2id'], 'salt + 64 MB RAM'),
          userDb: db(13, 0, { label: 'Users DB', tags: [{ text: 'zero plaintext', tone: 'green', icon: 'shield' }] }),
        },
        links: {
          sa: link('s1', 'argon', ['s1', 'argon']),
          ad: link('argon', 'userDb', ['argon', 'userDb']),
        },
        flows: [{ route: ['sa', 'ad'], kind: 'msg', rate: 0.8 }],
      },
    },
  ],
};

export const lessonPortalLoginVerify: Lesson = {
  id: 'portal-login-verify',
  title: '3. Login Verification on the Server',
  summary:
    'If the server threw away Priya’s password and cannot reverse the hash, how does it know she typed the right password the next day?',
  minutes: 7,
  level: 'beginner',
  metrics: ['dbState', 'integrity', 'trust', 'algorithm'],
  legend: [
    ['mine', 'Login password attempt'],
    ['write', 'Stored salt fetched'],
    ['msg', 'Hash match → Session granted'],
    ['kill', 'Wrong password → Denied'],
  ],
  goals: [
    { text: 'Watch the server fetch Priya’s stored salt and recompute the hash', step: 0 },
    { text: 'See constant-time comparison grant a login session', step: 1 },
    { text: 'Understand why wrong passwords never leak partial hints', step: 2 },
  ],
  steps: [
    {
      short: 'Fetch Salt',
      chapter: 'setup',
      title: 'Step 1: Look up Priya’s stored salt & hash',
      body: [
        'Priya types <code>"Campus@2026"</code> into the login form over HTTPS. The portal queries the database for <code>priya@campus.edu</code> and fetches two values: her <b>stored salt</b> (<code>9a4f2c</code>) and her <b>stored hash</b>.',
      ],
      metrics: {
        dbState: 'Salted Argon2id',
        integrity: 'Checking',
        trust: 'Pending',
        algorithm: 'Argon2id',
      },
      scene: {
        entities: {
          priya: device(-14, 0, { form: 'laptop', label: 'Priya', tags: [{ text: 'login: "Campus@2026"', icon: 'key' }] }),
          auth: block(0, 0, { color: 'blue', glyph: 'server', label: ['Auth', 'Server'], sub: 'fetches salt' }),
          userDb: db(14, 0, { label: 'Users DB', tags: [{ text: 'salt: 9a4f2c + hash', icon: 'database' }] }),
        },
        links: {
          pa: link('priya', 'auth', ['priya', 'auth'], { label: 'POST /login (HTTPS)' }),
          ad: link('auth', 'userDb', ['auth', 'userDb'], { heads: 'both', label: 'SELECT salt, hash' }),
        },
        flows: [
          { route: ['pa'], kind: 'mine', rate: 0.7 },
          { route: ['ad'], kind: 'write', rate: 0.8, bounce: true },
        ],
      },
    },
    {
      short: 'Re-Hash',
      chapter: 'solution',
      title: 'Step 2: Re-hash the attempt & compare in constant time',
      body: [
        'The Auth Server runs <code>Argon2id("9a4f2c" + "Campus@2026")</code> on the fly and compares the fresh output against the database hash using a <span class="term">constant-time comparison</span> (preventing timing side-channel leaks).',
        'Both hashes match bit-for-bit! The server issues Priya an authenticated session token — without ever storing or knowing her actual password.',
      ],
      changes: [
        '+ Recomputed hash matches stored hash bit-for-bit',
        '+ Session cookie issued to Priya’s browser',
      ],
      metrics: {
        dbState: 'Salted Argon2id',
        integrity: 'Verified',
        trust: 'Authentic',
        algorithm: 'Argon2id',
      },
      scene: {
        entities: {
          priya: device(-14, 0, { form: 'laptop', label: 'Priya', tags: [{ text: 'Logged in ✓', tone: 'green', icon: 'circleCheck' }] }),
          auth: cipherBlock(0, 0, ['Verify()', 'Argon2id'], 'hash == stored', [
            { text: 'EXACT MATCH ✓', tone: 'green', icon: 'check' },
          ]),
          userDb: db(14, 0, { label: 'Users DB' }),
        },
        links: {
          pa: link('priya', 'auth', ['priya', 'auth'], { heads: 'both', label: 'session granted', labelTone: 'green' }),
          ad: link('auth', 'userDb', ['auth', 'userDb'], { style: 'off' }),
        },
        flows: [{ route: ['pa'], kind: 'msg', rate: 0.9, bounce: true }],
      },
    },
    {
      short: 'Wrong PW',
      chapter: 'problem',
      title: 'What if an imposter guesses 1 character wrong?',
      body: [
        'Suppose someone tries <code>"Campus@2025"</code> (just 1 digit off). Because of the hash’s avalanche effect, the resulting Argon2id digest looks completely unrelated to Priya’s stored hash.',
        'The server immediately rejects the login and applies rate limiting / MFA to stop online guessing.',
      ],
      metrics: {
        dbState: 'Salted Argon2id',
        integrity: 'Verified',
        trust: 'Forged Attempt',
        algorithm: 'Argon2id + Rate Limit',
      },
      scene: {
        entities: {
          imposter: hackerNode(-14, 0, 'Imposter', [{ text: 'tries "Campus@2025"', tone: 'red', icon: 'alert' }]),
          auth: cipherBlock(0, 0, ['Verify()', 'Argon2id'], 'mismatch!', [
            { text: '401 UNAUTHORIZED', tone: 'red', icon: 'ban' },
          ], { heat: 0.7 }),
          userDb: db(14, 0, { label: 'Users DB' }),
        },
        links: {
          ia: link('imposter', 'auth', ['imposter', 'auth'], { fail: 0.95, label: 'hash mismatch → denied', labelTone: 'red' }),
          ad: link('auth', 'userDb', ['auth', 'userDb'], { style: 'off' }),
        },
        flows: [{ route: ['ia'], kind: 'kill', rate: 0.9 }],
      },
    },
  ],
};

export const lessonPortalDbBreach: Lesson = {
  id: 'portal-db-breach',
  title: '4. Hacker Steals the Database',
  summary:
    'Worst-case day: an attacker dumps the entire university Users table. Compare what happens with unsalted SHA-256 versus salted Argon2id.',
  minutes: 8,
  level: 'intermediate',
  metrics: ['dbState', 'crackTime', 'attackerSees', 'attackRisk'],
  legend: [
    ['poison', 'Stolen DB dump'],
    ['slow', 'GPU cracking attempts'],
    ['empty', 'Uncrackable salted hashes'],
  ],
  goals: [
    { text: 'See how Rainbow Tables crack millions of unsalted hashes instantly', step: 0 },
    { text: 'Watch Unique Salts invalidate every precomputed Rainbow Table', step: 1 },
    { text: 'See Argon2id turn a catastrophic breach into a contained incident', step: 2 },
  ],
  steps: [
    {
      short: 'Rainbow Table',
      chapter: 'problem',
      title: 'Attack: Rainbow Table cracks unsalted hashes in seconds',
      body: [
        'A hacker exploits a misconfigured cloud backup and downloads all 50,000 student rows. If the portal stored <b>unsalted SHA-256</b>, the hacker loads a precomputed <span class="term">Rainbow Table</span> containing billions of common passwords.',
        'One instant lookup cracks 70% of all student passwords in minutes — because every user with the same password had the exact same hash.',
      ],
      callout: {
        kind: 'warn',
        text: 'Never rely on plain MD5, SHA-1, or unsalted SHA-256 for passwords. Hackers precomputed those tables years ago.',
      },
      metrics: {
        dbState: 'Unsalted SHA-256',
        crackTime: 'Seconds',
        attackerSees: 'Plaintext Passwords!',
        attackRisk: 'Critical',
      },
      scene: {
        entities: {
          userDb: db(-13, 0, { label: 'Leaked DB', heat: 0.8, tags: [{ text: '50,000 unsalted rows', tone: 'red', icon: 'alert' }] }),
          rainbow: block(0, -9, { color: 'orange', glyph: 'layers', s: 3.6, h: 34, label: ['Rainbow', 'Table'], sub: '10B precomputed hashes' }),
          hacker: hackerNode(12, 0, 'Cracker', [{ text: '35,000 passwords cracked!', tone: 'red', icon: 'skull' }], { heat: 0.9 }),
        },
        links: {
          dh: link('userDb', 'hacker', ['userDb', 'hacker'], { label: 'stolen dump', labelTone: 'red' }),
          rh: link('rainbow', 'hacker', ['rainbow', 'hacker'], { label: 'instant O(1) lookup', labelTone: 'red' }),
        },
        flows: [
          { route: ['dh'], kind: 'poison', rate: 1.0 },
          { route: ['rh'], kind: 'poison', rate: 1.0 },
        ],
      },
    },
    {
      short: 'Salt + Argon2id',
      chapter: 'solution',
      title: 'Defense: Unique Salt + Argon2id stalls the GPU rig',
      body: [
        'Now replay the exact same database breach — except the portal used <b>Unique 128-bit Salts + Argon2id</b>. The hacker’s Rainbow Table is immediately <b>100% useless</b> because every single student has a different salt.',
        'Forced to brute-force each student individually at 64 MB RAM per guess, the hacker’s GPU cluster slows to a crawl. Students have plenty of time to rotate passwords safely with zero compromise.',
      ],
      changes: [
        '+ Unique Salt renders precomputed Rainbow Tables useless',
        '+ Argon2id memory-hardness bottlenecks GPU cracking',
        '= Zero usable passwords leaked from the stolen backup',
      ],
      metrics: {
        dbState: 'Salted Argon2id',
        crackTime: 'Centuries',
        attackerSees: 'Useless Hashes',
        attackRisk: 'Mitigated',
      },
      scene: {
        entities: {
          userDb: db(-13, 0, { label: 'Leaked DB', tags: [{ text: 'salt + Argon2id', tone: 'green', icon: 'shield' }] }),
          gpu: block(0, 0, { color: 'slab', glyph: 'cpu', s: 3.8, h: 38, label: ['GPU Rig'], sub: 'RAM bottlenecked', tags: [{ text: 'stalled!', tone: 'green', icon: 'hourglass' }] }),
          hacker: hackerNode(13, 0, 'Cracker', [{ text: '0 passwords cracked', tone: 'green', icon: 'eyeOff' }]),
        },
        links: {
          dg: link('userDb', 'gpu', ['userDb', 'gpu'], { label: 'salted hashes' }),
          gh: link('gpu', 'hacker', ['gpu', 'hacker'], { style: 'dashed', fail: 0.9, label: 'too slow · blocked', labelTone: 'green' }),
        },
        flows: [
          { route: ['dg'], kind: 'empty', rate: 0.6 },
          { route: ['gh'], kind: 'slow', rate: 0.4 },
        ],
      },
    },
    {
      short: 'Recap',
      chapter: 'recap',
      title: 'Scenario 2 Complete: Password Security',
      body: [
        `<ul class="takeaways">
          <li><b>Never store plaintext:</b> Convert passwords into irreversible one-way hashes.</li>
          <li><b>Always add a unique per-user Salt:</b> Kills Rainbow Tables and hides duplicate passwords.</li>
          <li><b>Use Argon2id / bcrypt:</b> Deliberately slow &amp; memory-hard to neutralize GPU cracking after a breach.</li>
        </ul>`,
      ],
      callout: {
        kind: 'next',
        text: 'Next Scenario: <b>03. Airport Wi-Fi Banking</b> — prove who a website really is and build an encrypted HTTPS tunnel in front of hackers.',
      },
      metrics: {
        dbState: 'Salted Argon2id',
        crackTime: 'Centuries',
        attackerSees: 'Nothing Usable',
        attackRisk: 'Mitigated',
      },
      scene: {
        entities: {
          priya: device(-13, 0, { form: 'laptop', label: 'Student' }),
          portal: cipherBlock(0, 0, ['Auth', 'Argon2id'], 'Salt + Verify', [{ text: 'breach-resilient', tone: 'green', icon: 'shield' }]),
          userDb: db(13, 0, { label: 'Users DB', tags: [{ text: 'safe even if leaked', tone: 'green', icon: 'lock' }] }),
        },
        links: {
          pa: link('priya', 'portal', ['priya', 'portal'], { heads: 'both' }),
          ad: link('portal', 'userDb', ['portal', 'userDb'], { heads: 'both' }),
        },
        flows: [{ route: ['pa', 'ad'], kind: 'msg', rate: 0.8, bounce: true }],
      },
    },
  ],
};

export const SCENARIO_2_LESSONS: Lesson[] = [
  lessonPortalPasswordHash,
  lessonPortalUniqueSalt,
  lessonPortalLoginVerify,
  lessonPortalDbBreach,
];
