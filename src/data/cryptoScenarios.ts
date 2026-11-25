export type ExperimentChoice = {
  id: string;
  label: string;
  badge: string;
};

export type StepVisualState = {
  // General scene mode
  sceneType: 'scenario1' | 'scenario2' | 'scenario3' | 'scenario4' | 'scenario5';
  subpartIndex: number; // 0 to 4
  stepIndex: number; // 0 to 3
  cameraPreset: 'wide' | 'alice' | 'bob' | 'eve' | 'routers' | 'firewall' | 'ca';
  // Dynamic 3D animation descriptors
  showCertBeam?: boolean;
  showKeyGears?: boolean;
  publicKeyExchange?: boolean;
  deriveGoldKey?: boolean;
  showPlaintextCard?: string;
  showNonceDice?: string;
  showAesCube?: boolean;
  aesScrambledHex?: string;
  showGhashSeal?: string;
  showIpEnvelope?: string;
  showGlobalGrid?: boolean;
  activeRouterHop?: number; // 1..4
  eveSiphonActive?: boolean;
  eveBruteForce?: boolean;
  eveBitFlip?: boolean;
  bobVerifyGate?: 'checking' | 'rejected' | 'verified';
  replayCapture?: boolean;
  replayDuplicate?: boolean;
  signatureSeal?: boolean;
  firewallInspect?: 'normal' | 'dos_flood' | 'blocked' | 'protected';
  activeActors: ('alice' | 'bob' | 'eve' | 'routers' | 'ca' | 'firewall')[];
  packetProgress?: number; // 0..1 along path
  packetColor?: 'plain' | 'blue_key' | 'purple_cipher' | 'tampered_red' | 'signed_gold' | 'replay_amber';
};

export type LessonStep = {
  label: string;
  chapter: string;
  chapterTone: 'sand' | 'red' | 'green' | 'blue' | 'amber' | 'violet' | 'ink';
  title: string;
  explanation: string;
  hud: {
    label: string;
    value: string;
    level?: 'good' | 'warn' | 'bad';
  }[];
  algorithmDecision: {
    algorithm: string;
    ruleTitle: string;
    decisionRule: string;
  };
  hexInspector: {
    label: string;
    value: string;
    tone?: 'normal' | 'cipher' | 'key' | 'alert' | 'good';
  }[];
  changes: {
    type: 'add' | 'del' | 'mod';
    text: string;
  }[];
  callout?: {
    type: 'tip' | 'warn' | 'insight';
    title: string;
    text: string;
  };
  visual: StepVisualState;
};

export type LessonSubpart = {
  id: string;
  number: string;
  title: string;
  shortTitle: string;
  subtitle: string;
  moduleId: string;
  moduleTitle: string;
  tags: {
    label: string;
    tone: 'sand' | 'violet' | 'mint';
  }[];
  learningGoals: string[];
  experiment?: {
    label: string;
    modes: [ExperimentChoice, ExperimentChoice];
    modeOverrides?: {
      [modeId: string]: {
        stepIndex: number;
        title?: string;
        explanation?: string;
        hud?: { label: string; value: string; level?: 'good' | 'warn' | 'bad' }[];
        hexInspector?: { label: string; value: string; tone?: 'normal' | 'cipher' | 'key' | 'alert' | 'good' }[];
        visualPatch?: Partial<StepVisualState>;
      }[];
    };
  };
  steps: LessonStep[];
};

export type ScenarioModule = {
  id: string;
  number: string;
  title: string;
  folderColor: 'sand' | 'violet' | 'green' | 'orange' | 'blue' | 'teal' | 'rose';
  description: string;
  lessons: LessonSubpart[];
};

export const SCENARIO_MODULES: ScenarioModule[] = [
  {
    id: 'scenario-1',
    number: '01',
    title: 'Scenario 1: Secure Message Transmission (Alice & Bob)',
    folderColor: 'green',
    description: 'Complete step-by-step demonstration of key exchange, AES-256-GCM encryption, internet routing, Eve interception, and authenticated decryption.',
    lessons: [
      {
        id: 's1-subpart-1',
        number: '01',
        title: 'Key Setup & Handshake (ECDH + Digital Certificates)',
        shortTitle: '01. Key Setup & Handshake',
        subtitle: 'Before sending a secret message over an untrusted network, Alice and Bob agree on a shared secret key without transmitting it openly.',
        moduleId: 'scenario-1',
        moduleTitle: 'Scenario 1 · Alice & Bob',
        tags: [
          { label: 'ECDHE Curve25519', tone: 'mint' },
          { label: 'X.509 Certificate', tone: 'violet' },
          { label: 'Key Exchange', tone: 'sand' },
        ],
        learningGoals: [
          'Verify Bob’s server identity using a CA-signed X.509 TLS Certificate',
          'Generate ephemeral private (Red) and public (Blue) Elliptic Curve keys',
          'Observe why Eve cannot derive the secret from two public keys alone',
          'Forge an identical 256-bit Gold Master AES Key independently on both desks',
        ],
        experiment: {
          label: 'CA Verification Mode',
          modes: [
            { id: 'verified', label: 'Valid CA Certificate', badge: 'TRUSTED CA' },
            { id: 'unverified', label: 'Unsigned Self-Cert (MITM Risk)', badge: 'UNTRUSTED' },
          ],
          modeOverrides: {
            unverified: [
              {
                stepIndex: 0,
                title: 'Warning: Self-Signed Certificate Detected!',
                explanation: 'Without a trusted Certificate Authority (CA) signature, Alice cannot verify if the blue public key truly belongs to Bob or to Eve impersonating Bob.',
                hud: [
                  { label: 'TLS CERT', value: 'UNVERIFIED (Self-Signed)', level: 'bad' },
                  { label: 'CURVE', value: 'X25519 (256-bit)', level: 'warn' },
                  { label: 'EVE STATUS', value: 'MITM Spoofing Ready', level: 'bad' },
                ],
                hexInspector: [
                  { label: 'CERT ISSUER', value: 'UNKNOWN_SELF_ISSUER (No CA Chain)', tone: 'alert' },
                  { label: 'WARNING', value: 'ERR_CERT_AUTHORITY_INVALID', tone: 'alert' },
                ],
              },
            ],
          },
        },
        steps: [
          {
            label: 'Identity Check',
            chapter: 'STEP 01 · X.509 IDENTITY CHECK',
            chapterTone: 'blue',
            title: 'Bob’s server presents a glowing CA-signed TLS Certificate',
            explanation: 'Before any key math starts, Bob’s server emits a glowing blue TLS Certificate badge signed by a trusted Certificate Authority (CA). A verification beam shoots to Alice’s laptop, where a green checkmark confirms Bob’s public identity.',
            hud: [
              { label: 'TLS CERT', value: 'X.509 CA-Verified ✓', level: 'good' },
              { label: 'CURVE', value: 'Curve25519 (ECDHE)', level: 'good' },
              { label: 'SHARED KEY', value: 'Not Derived Yet' },
              { label: 'EVE INTERCEPT', value: 'Listening on Wire', level: 'warn' },
            ],
            algorithmDecision: {
              algorithm: 'ECDHE (Elliptic Curve Diffie-Hellman Ephemeral) + RSA/Ed25519 CA Cert',
              ruleTitle: 'WHY CERTIFICATES BEFORE KEY EXCHANGE?',
              decisionRule: 'Can we start Diffie-Hellman with an anonymous node? NO — Eve could sit in the middle and perform two separate key exchanges. The CA signature proves the public parameter belongs to Bob.',
            },
            hexInspector: [
              { label: 'CA ISSUER', value: 'CN=DigiCert Global Root G3, O=Trusted CA', tone: 'good' },
              { label: 'BOB CERT HASH', value: 'SHA256: 4a8b9c1f02e7...d831b490', tone: 'normal' },
              { label: 'SIGNATURE STATUS', value: 'VALID_CA_CHAIN (RSA-2048 Verified)', tone: 'good' },
            ],
            changes: [
              { type: 'add', text: 'Bob transmits X.509 Certificate signed by Trusted Root CA' },
              { type: 'add', text: 'Alice validates certificate signature chain with CA Public Key' },
            ],
            callout: {
              type: 'tip',
              title: 'Zero-Trust First Principle',
              text: 'Encryption without authentication is vulnerable. Always verify who sits at the other end of the fiber before negotiating keys.',
            },
            visual: {
              sceneType: 'scenario1',
              subpartIndex: 0,
              stepIndex: 0,
              cameraPreset: 'wide',
              showCertBeam: true,
              activeActors: ['alice', 'bob', 'ca', 'eve'],
            },
          },
          {
            label: 'Key Generation',
            chapter: 'STEP 02 · EPHEMERAL KEYPAIR',
            chapterTone: 'violet',
            title: 'Elliptic Curve gears spin up private Red & public Blue keys',
            explanation: 'Inside Alice’s glass workstation, a precision Elliptic Curve gear spins to generate a Red Private Key (which stays locked inside her desk) and a Blue Public Key (which floats above her terminal). Bob’s workstation independently generates his own Red private and Blue public gear pair.',
            hud: [
              { label: 'ALICE PRIV KEY', value: 'Locked in RAM (Red)', level: 'good' },
              { label: 'ALICE PUB KEY', value: '0x8f31...c49a (Blue)', level: 'good' },
              { label: 'BOB PUB KEY', value: '0x2d7e...91b0 (Blue)', level: 'good' },
              { label: 'EVE VIEW', value: '0 Private Keys Visible' },
            ],
            algorithmDecision: {
              algorithm: 'ECDHE Scalar Multiplication (Q = d · G on Curve25519)',
              ruleTitle: 'ONE-WAY TRAPDOOR FUNCTION',
              decisionRule: 'Given private scalar d and base point G, computing public point Q = d·G takes microseconds. Reversing Q back into d (Elliptic Curve Discrete Logarithm Problem) is computationally infeasible.',
            },
            hexInspector: [
              { label: 'ALICE PRIVATE (a)', value: '[LOCKED_LOCAL] 0x7a91e4...f012 (256-bit)', tone: 'alert' },
              { label: 'ALICE PUBLIC (a·G)', value: '0x8f31b7d209c4...e184c49a', tone: 'key' },
              { label: 'BOB PRIVATE (b)', value: '[LOCKED_LOCAL] 0x3c09b8...a741 (256-bit)', tone: 'alert' },
              { label: 'BOB PUBLIC (b·G)', value: '0x2d7e55a198f3...c02191b0', tone: 'key' },
            ],
            changes: [
              { type: 'add', text: 'Alice generates ephemeral private key a & public point A = a·G' },
              { type: 'add', text: 'Bob generates ephemeral private key b & public point B = b·G' },
            ],
            visual: {
              sceneType: 'scenario1',
              subpartIndex: 0,
              stepIndex: 1,
              cameraPreset: 'wide',
              showKeyGears: true,
              activeActors: ['alice', 'bob', 'eve'],
            },
          },
          {
            label: 'Public Exchange',
            chapter: 'STEP 03 · OPEN WIRE EXCHANGE',
            chapterTone: 'amber',
            title: 'Alice and Bob swap Blue Public Keys in plain sight of Eve',
            explanation: 'Alice and Bob trade their Blue Public Keys across the open 3D network grid. Eve (sitting in the middle) intercepts copies of both blue keys, but her attacker console flashes "INSUFFICIENT DATA — Discrete Log Trapdoor Locked".',
            hud: [
              { label: 'WIRE TRAFFIC', value: 'Public Points A & B', level: 'good' },
              { label: 'EVE CAPTURED', value: 'Pub A + Pub B Only', level: 'warn' },
              { label: 'EVE CRACK Status', value: 'INSUFFICIENT DATA', level: 'good' },
              { label: 'PRIVATE KEYS', value: 'Never Left Desks', level: 'good' },
            ],
            algorithmDecision: {
              algorithm: 'ECDHE Public Parameter Exchange over Untrusted Channel',
              ruleTitle: 'CAN WE SEND THE AES KEY DIRECTLY?',
              decisionRule: 'NO — Eve would copy it off the fiber line. Instead, exchange public curve points A = a·G and B = b·G so Eve only sees public coordinates without either private multiplier.',
            },
            hexInspector: [
              { label: 'WIRE PACKET 1 (A→B)', value: 'ECDHE_CLIENT_KEY_SHARE: 0x8f31b7d2...c49a', tone: 'key' },
              { label: 'WIRE PACKET 2 (B→A)', value: 'ECDHE_SERVER_KEY_SHARE: 0x2d7e55a1...91b0', tone: 'key' },
              { label: 'EVE SNIFFER LOG', value: 'ERROR: Cannot compute a·b·G from (a·G, b·G)', tone: 'alert' },
            ],
            changes: [
              { type: 'add', text: 'Blue Public Keys cross the internet backbone in plain view' },
              { type: 'mod', text: 'Eve clones both public points but cannot solve for private scalar a or b' },
            ],
            callout: {
              type: 'insight',
              title: 'Why Eve Is Stuck',
              text: 'Knowing (a·G) and (b·G) does not let Eve multiply them together to get (a·b·G). She needs at least one red private gear.',
            },
            visual: {
              sceneType: 'scenario1',
              subpartIndex: 0,
              stepIndex: 2,
              cameraPreset: 'wide',
              showKeyGears: true,
              publicKeyExchange: true,
              eveSiphonActive: true,
              activeActors: ['alice', 'bob', 'eve', 'routers'],
              packetProgress: 0.5,
              packetColor: 'blue_key',
            },
          },
          {
            label: 'Gold Master Key',
            chapter: 'STEP 04 · SHARED SECRET DERIVATION',
            chapterTone: 'green',
            title: 'Both desks independently forge the identical Gold 256-bit AES Key',
            explanation: 'Aliceand Bob never send their secret password across the internet. Inside both desks, their private Red gear meshes with the received Blue gear—independently forging the exact same Gold Master Key (256-bit AES Key) while leaving Eve with useless halves.',
            hud: [
              { label: 'ALICE AES KEY', value: '0xD4F9...8E21 (Gold)', level: 'good' },
              { label: 'BOB AES KEY', value: '0xD4F9...8E21 (Gold)', level: 'good' },
              { label: 'KEY MATCH', value: '100% Identical (256b)', level: 'good' },
              { label: 'EVE AES KEY', value: '0x0000...NULL (Failed)', level: 'good' },
            ],
            algorithmDecision: {
              algorithm: 'ECDHE Shared Secret (S = a · B = b · A) + HKDF-SHA256',
              ruleTitle: 'MATHEMATICAL SYMMETRY',
              decisionRule: 'Alice computes a · (b·G) = (a·b)·G. Bob computes b · (a·G) = (a·b)·G. Both arrive at the exact same curve coordinate and pass it through HKDF-SHA256 to derive the 256-bit Gold AES Key.',
            },
            hexInspector: [
              { label: 'ALICE COMPUTES (a·B)', value: 'GOLD_AES_256: 0xd4f98a01c37e4b19...90a28e21', tone: 'good' },
              { label: 'BOB COMPUTES (b·A)', value: 'GOLD_AES_256: 0xd4f98a01c37e4b19...90a28e21', tone: 'good' },
              { label: 'EVE TERMINAL', value: 'ACCESS DENIED — No Shared Secret Derived', tone: 'alert' },
            ],
            changes: [
              { type: 'add', text: 'Alice combines Red Private (a) + Bob Blue Public (B) → Gold AES Key' },
              { type: 'add', text: 'Bob combines Red Private (b) + Alice Blue Public (A) → Gold AES Key' },
            ],
            callout: {
              type: 'tip',
              title: 'Subpart 01 Takeaway',
              text: 'Alice and Bob never send their secret password across the internet. Using ECDHE math, they trade public values in plain sight and independently arrive at the exact same Gold AES Key.',
            },
            visual: {
              sceneType: 'scenario1',
              subpartIndex: 0,
              stepIndex: 3,
              cameraPreset: 'wide',
              showKeyGears: true,
              deriveGoldKey: true,
              activeActors: ['alice', 'bob', 'eve'],
            },
          },
        ],
      },
      {
        id: 's1-subpart-2',
        number: '02',
        title: "Alice's Message Encryption (AES-256-GCM)",
        shortTitle: '02. Message Encryption (AES-GCM)',
        subtitle: 'How readable plaintext is transformed into randomized ciphertext and sealed with a mathematical 128-bit GHASH integrity tag.',
        moduleId: 'scenario-1',
        moduleTitle: 'Scenario 1 · Alice & Bob',
        tags: [
          { label: 'AES-256-GCM', tone: 'violet' },
          { label: '96-bit Nonce', tone: 'sand' },
          { label: 'GHASH Auth Tag', tone: 'mint' },
        ],
        learningGoals: [
          'Observe Alice composing a sensitive plaintext transfer order',
          'Roll a unique 96-bit Nonce (IV) so identical messages never produce identical ciphertext',
          'Pass plaintext blocks through 14 rounds inside the translucent 3D AES-GCM Encryption Cube',
          'Stamp a 128-bit GHASH Authentication Tag onto the armored purple capsule',
        ],
        experiment: {
          label: 'Cipher Mode Comparison',
          modes: [
            { id: 'gcm', label: 'AES-256-GCM (Authenticated + Nonce)', badge: 'SECURE GCM' },
            { id: 'ecb', label: 'AES-ECB (Legacy No-Nonce / No-Tag)', badge: 'VULNERABLE ECB' },
          ],
          modeOverrides: {
            ecb: [
              {
                stepIndex: 2,
                title: 'Danger: AES-ECB Mode Leaves Patterns Visible & Unsealed!',
                explanation: 'Without a Nonce or Galois Counter chaining, identical 128-bit plaintext blocks encrypt into identical ciphertext blocks—and there is no integrity tag to stop Eve from splicing bytes!',
                hud: [
                  { label: 'CIPHER MODE', value: 'AES-256-ECB (Insecure)', level: 'bad' },
                  { label: 'PATTERN LEAK', value: 'Identical Blocks Leak', level: 'bad' },
                  { label: 'AUTH TAG', value: 'NONE (Tamperable)', level: 'bad' },
                ],
                hexInspector: [
                  { label: 'ECB WARNING', value: 'Repeated blocks produce identical hex: 0x44a1... == 0x44a1...', tone: 'alert' },
                  { label: 'INTEGRITY SEAL', value: 'MISSING — Vulnerable to silent byte modification', tone: 'alert' },
                ],
              },
            ],
          },
        },
        steps: [
          {
            label: 'Plaintext Input',
            chapter: 'STEP 01 · PLAINTEXT CREATION',
            chapterTone: 'sand',
            title: 'Alice types confidential message: "Transfer $500 to Bob"',
            explanation: 'A crisp white floating message card appears above Alice’s keyboard reading: "Transfer $500 to Bob". Right now it is raw UTF-8 plaintext—if sent directly onto the network, any router or hacker could read or alter the dollar amount.',
            hud: [
              { label: 'MESSAGE STATE', value: 'Raw UTF-8 Plaintext', level: 'warn' },
              { label: 'PAYLOAD', value: '"Transfer $500 to Bob"' },
              { label: 'SIZE', value: '20 Bytes (160 bits)' },
              { label: 'KEY LOADED', value: 'Gold AES-256 Ready', level: 'good' },
            ],
            algorithmDecision: {
              algorithm: 'UTF-8 Byte Serialization → Pre-Encryption Buffer',
              ruleTitle: 'WHY CAN’T WE SEND THIS DIRECTLY?',
              decisionRule: 'Plaintext over TCP/IP exposes every ASCII character to ISP routers, Wi-Fi sniffers, and Autonomous System transit hubs.',
            },
            hexInspector: [
              { label: 'ASCII PLAINTEXT', value: '"Transfer $500 to Bob"', tone: 'normal' },
              { label: 'RAW HEX BYTES', value: '54 72 61 6e 73 66 65 72 20 24 35 30 30 20 74 6f 20 42 6f 62', tone: 'normal' },
              { label: 'CONFIDENTIALITY', value: '0% (Human Readable)', tone: 'alert' },
            ],
            changes: [
              { type: 'add', text: 'Alice creates 20-byte confidential message in workstation memory' },
            ],
            visual: {
              sceneType: 'scenario1',
              subpartIndex: 1,
              stepIndex: 0,
              cameraPreset: 'alice',
              showPlaintextCard: 'Transfer $500 to Bob',
              deriveGoldKey: true,
              activeActors: ['alice'],
            },
          },
          {
            label: 'Nonce Roll',
            chapter: 'STEP 02 · 96-BIT NONCE (IV) GENERATION',
            chapterTone: 'blue',
            title: 'Silver Entropy Dice rolls a unique 96-bit Nonce (IV)',
            explanation: 'A silver cryptographic dice rolls next to Alice’s message, generating a fresh 96-bit Nonce (Initialization Vector). Even if Alice sends "Transfer $500 to Bob" ten times in a row, the Nonce ensures every encrypted capsule looks completely different.',
            hud: [
              { label: 'NONCE (IV)', value: '0x7c89f201a4e3 (96b)', level: 'good' },
              { label: 'UNICITY', value: 'Fresh Per Message ✓', level: 'good' },
              { label: 'REPLAY GUARD', value: 'Counter Initialized', level: 'good' },
            ],
            algorithmDecision: {
              algorithm: 'CSPRNG 96-bit Initialization Vector (NIST SP 800-38D)',
              ruleTitle: 'WHY DO WE NEED A NONCE?',
              decisionRule: 'Deterministic encryption leaks whether two messages are identical. Injecting a unique 96-bit Nonce into the AES counter block guarantees semantic security.',
            },
            hexInspector: [
              { label: '96-BIT NONCE (IV)', value: '0x7c89f201a4e3b81209d4551a', tone: 'key' },
              { label: 'COUNTER BLOCK J0', value: 'Nonce || 0x00000001 (128-bit Initial Counter)', tone: 'normal' },
              { label: 'GOLD KEY', value: '0xd4f98a01c37e4b19...90a28e21', tone: 'good' },
            ],
            changes: [
              { type: 'add', text: 'Generated unique 96-bit Nonce (0x7c89f201a4e3b81209d4551a)' },
              { type: 'add', text: 'Initialized 128-bit AES Counter Block with Nonce + Counter=1' },
            ],
            visual: {
              sceneType: 'scenario1',
              subpartIndex: 1,
              stepIndex: 1,
              cameraPreset: 'alice',
              showPlaintextCard: 'Transfer $500 to Bob',
              showNonceDice: 'IV: 0x7c89f201a4e3',
              deriveGoldKey: true,
              activeActors: ['alice'],
            },
          },
          {
            label: 'AES-GCM Cube',
            chapter: 'STEP 03 · 14-ROUND AES-256 CHAMBER',
            chapterTone: 'violet',
            title: 'The white card enters the 3D AES Cube and exits as a dark-purple capsule',
            explanation: 'The white plaintext card enters a translucent 3D Encryption Cube powered by the Gold Key. Inside, the data splits into 128-bit blocks, undergoes 14 rounds of SubBytes, ShiftRows, MixColumns, and XOR key mixing, and exits as a scrambled dark-purple armored capsule (0x9f84c1...).',
            hud: [
              { label: 'ALGORITHM', value: 'AES-256-GCM (14 Rnds)', level: 'good' },
              { label: 'CIPHERTEXT', value: '0x9f84c1e7...3b02', level: 'good' },
              { label: 'SHANNON ENTROPY', value: '7.99 bits/byte (Max)', level: 'good' },
            ],
            algorithmDecision: {
              algorithm: 'AES-256-GCM (Galois/Counter Mode)',
              ruleTitle: 'WHY GCM INSTEAD OF ECB OR CBC?',
              decisionRule: 'ECB leaves patterns visible and allows silent tampering. CBC is vulnerable to padding-oracle attacks if not paired with HMAC. GCM encrypts in parallel CTR mode and computes a hardware-accelerated Galois integrity tag.',
            },
            hexInspector: [
              { label: 'INPUT PLAINTEXT', value: '54 72 61 6e 73 66 65 72 20 24 35 30 30 20 74 6f 20 42 6f 62', tone: 'normal' },
              { label: 'KEYSTREAM XOR', value: 'cb f6 a0 89 e1 2a 9d 11 88 99 1a 44 e2 01 19 9a 44 c1 22 60', tone: 'key' },
              { label: 'OUTPUT CIPHERTEXT', value: '9f 84 c1 e7 92 4c f8 63 a8 bd 2f 74 d2 21 6d f5 64 83 4d 02', tone: 'cipher' },
            ],
            changes: [
              { type: 'mod', text: 'Transformed "Transfer $500 to Bob" into unreadable purple ciphertext 0x9f84c1e7...' },
            ],
            visual: {
              sceneType: 'scenario1',
              subpartIndex: 1,
              stepIndex: 2,
              cameraPreset: 'alice',
              showAesCube: true,
              aesScrambledHex: '0x9f84c1e7924cf863...',
              deriveGoldKey: true,
              activeActors: ['alice'],
            },
          },
          {
            label: 'GHASH Seal',
            chapter: 'STEP 04 · 128-BIT AUTHENTICATION TAG',
            chapterTone: 'green',
            title: 'The cube stamps a glowing 128-bit GHASH Integrity Seal onto the capsule',
            explanation: 'AES-GCM locks Alice’s message inside an unreadable purple capsule and attaches a mathematical 128-bit GHASH tamper-seal onto the back. If even a single bit of ciphertext changes during delivery, that seal will break at Bob’s gate.',
            hud: [
              { label: 'PAYLOAD', value: 'Locked Purple Capsule', level: 'good' },
              { label: 'GHASH TAG', value: '0xE81B...49C0 (128b)', level: 'good' },
              { label: 'TAMPER SEAL', value: 'AEAD Armed ✓', level: 'good' },
            ],
            algorithmDecision: {
              algorithm: 'GHASH Polynomial Multiplication over GF(2^128)',
              ruleTitle: 'AUTHENTICATED ENCRYPTION WITH ASSOCIATED DATA (AEAD)',
              decisionRule: 'Multiply each ciphertext block and header length by secret hash subkey H in Galois Field GF(2^128). The resulting 128-bit tag binds the ciphertext, nonce, and Gold Key together.',
            },
            hexInspector: [
              { label: 'CIPHERTEXT PAYLOAD', value: '0x9f84c1e7924cf863a8bd2f74d2216df564834d02', tone: 'cipher' },
              { label: 'PUBLIC NONCE (IV)', value: '0x7c89f201a4e3b81209d4551a', tone: 'key' },
              { label: '128-BIT GHASH TAG', value: '0xe81b7740c29a11f58302d4e977b149c0 [SEALED]', tone: 'good' },
            ],
            changes: [
              { type: 'add', text: 'Stamped 128-bit GHASH Authentication Tag (0xe81b...49c0) onto capsule' },
            ],
            callout: {
              type: 'tip',
              title: 'Subpart 02 Takeaway',
              text: 'AES-GCM locks Alice’s message inside an unreadable purple capsule and attaches a mathematical tamper-seal. If even a single bit changes during delivery, that seal will break.',
            },
            visual: {
              sceneType: 'scenario1',
              subpartIndex: 1,
              stepIndex: 3,
              cameraPreset: 'alice',
              showAesCube: true,
              aesScrambledHex: '0x9f84c1e7924cf863...',
              showGhashSeal: 'TAG: 0xE81B...49C0',
              deriveGoldKey: true,
              activeActors: ['alice'],
            },
          },
        ],
      },
      {
        id: 's1-subpart-3',
        number: '03',
        title: 'Internet Routing & Delivery (IP + TLS Tunnel)',
        shortTitle: '03. Internet Routing & Delivery',
        subtitle: 'How one specific encrypted packet finds Bob among millions of global users without getting lost or exposing its contents.',
        moduleId: 'scenario-1',
        moduleTitle: 'Scenario 1 · Alice & Bob',
        tags: [
          { label: 'IPv4 / BGP Routing', tone: 'sand' },
          { label: 'TLS 1.3 Record', tone: 'mint' },
          { label: 'Port 443 Tunnel', tone: 'violet' },
        ],
        learningGoals: [
          'Wrap the purple encrypted capsule inside a transparent TCP/IP outer routing envelope',
          'Visualize the packet traversing a 3D isometric backbone of intermediate Router Towers',
          'Understand why routers can read the outer IP destination label while the inner payload stays opaque',
          'Lock onto Bob’s exact workstation IP (172.217.14.206:443)',
        ],
        steps: [
          {
            label: 'Packet Wrapping',
            chapter: 'STEP 01 · TCP/IP ENCAPSULATION',
            chapterTone: 'blue',
            title: 'A transparent IP envelope wraps around the purple encrypted capsule',
            explanation: 'Around the purple encrypted capsule, a semi-transparent outer envelope wraps around it displaying public routing metadata: Src IP 192.168.1.4 → Dst IP 172.217.14.206, Port 443.',
            hud: [
              { label: 'OUTER HEADER', value: '192.168.1.4 → 172.217.14.206', level: 'good' },
              { label: 'TLS PORT', value: 'TCP/443 (HTTPS)', level: 'good' },
              { label: 'INNER PAYLOAD', value: 'Opaque AES-GCM Capsule', level: 'good' },
            ],
            algorithmDecision: {
              algorithm: 'TLS 1.3 Record Layer inside TCP/IPv4 Packet',
              ruleTitle: 'LAYER SEPARATION (OSI MODEL)',
              decisionRule: 'Routers need to see where the packet is going (IP Header), but they do not need to see what is inside (Encrypted Payload).',
            },
            hexInspector: [
              { label: 'IPv4 HEADER (CLEAR)', value: 'SRC: 192.168.1.4 | DST: 172.217.14.206 | TTL: 64 | PROTO: TCP(6)', tone: 'normal' },
              { label: 'TCP/TLS HEADER', value: 'SPORT: 51924 → DPORT: 443 | TLS_APPLICATION_DATA (0x17)', tone: 'normal' },
              { label: 'ENCRYPTED PAYLOAD', value: '0x9f84c1e7924cf863... + TAG: 0xe81b...49c0', tone: 'cipher' },
            ],
            changes: [
              { type: 'add', text: 'Encapsulated purple AES-GCM payload inside TCP/IPv4 routing header' },
            ],
            visual: {
              sceneType: 'scenario1',
              subpartIndex: 2,
              stepIndex: 0,
              cameraPreset: 'alice',
              showIpEnvelope: 'DST: 172.217.14.206:443',
              aesScrambledHex: '0x9f84c1e7...',
              showGhashSeal: 'TAG: 0xE81B',
              activeActors: ['alice', 'routers', 'bob'],
              packetProgress: 0.08,
              packetColor: 'purple_cipher',
            },
          },
          {
            label: 'Global Grid',
            chapter: 'STEP 02 · THE GLOBAL INTERNET GRID',
            chapterTone: 'sand',
            title: 'Entering the 3D global fiber mesh of ISP & backbone routers',
            explanation: 'The camera zooms out to show a 3D isometric network grid of glowing nodes and autonomous router towers. Millions of packets flow across the mesh, guided by BGP routing tables.',
            hud: [
              { label: 'TOPOLOGY', value: '4 Backbone Hops (BGP)', level: 'good' },
              { label: 'ROUTING TABLE', value: 'Longest Prefix Match' },
              { label: 'PAYLOAD EXPOSURE', value: '0 Bits Leaked to ISP', level: 'good' },
            ],
            algorithmDecision: {
              algorithm: 'BGP / OSPF Longest-Prefix IP Routing',
              ruleTitle: 'HOW DOES THE PACKET FIND BOB?',
              decisionRule: 'Each router compares Dst IP 172.217.14.206 against its CIDR prefix table (172.217.14.0/24) and forwards the frame along the lowest-cost fiber hop.',
            },
            hexInspector: [
              { label: 'HOP 1 (EDGE ISP)', value: 'Match 172.217.0.0/16 → Forward to Core Router R2', tone: 'normal' },
              { label: 'INNER CAPSULE', value: '[LOCKED_AES_256_GCM] ISP cannot inspect financial content', tone: 'good' },
            ],
            changes: [
              { type: 'add', text: 'Packet leaves Alice’s LAN gateway onto fiber-optic internet backbone' },
            ],
            visual: {
              sceneType: 'scenario1',
              subpartIndex: 2,
              stepIndex: 1,
              cameraPreset: 'wide',
              showGlobalGrid: true,
              showIpEnvelope: 'DST: 172.217.14.206:443',
              activeRouterHop: 1,
              activeActors: ['alice', 'routers', 'bob'],
              packetProgress: 0.28,
              packetColor: 'purple_cipher',
            },
          },
          {
            label: 'Router Hops',
            chapter: 'STEP 03 · MULTI-HOP FIBER TRANSIT',
            chapterTone: 'violet',
            title: 'Scanners at 4 Router Towers read the IP header while the capsule stays locked',
            explanation: 'Alice’s packet shoots along glowing fiber-optic lines, bouncing across 4 intermediate Router Towers (R1 → R2 → R3 → R4). At each tower, a green laser scanner reads only the outer IP envelope while the inner purple payload remains opaque and locked.',
            hud: [
              { label: 'ACTIVE HOP', value: 'Router R2 → Router R3', level: 'good' },
              { label: 'HEADER SCAN', value: 'IP/TCP Header Valid ✓', level: 'good' },
              { label: 'TTL COUNTER', value: '64 → 62 → 60' },
              { label: 'CAPSULE INTEGRITY', value: 'Sealed & Untouched', level: 'good' },
            ],
            algorithmDecision: {
              algorithm: 'Hop-by-Hop IP Forwarding + End-to-End TLS Encryption',
              ruleTitle: 'END-TO-END VS. HOP-BY-HOP',
              decisionRule: 'Outer IP headers are processed hop-by-hop by untrusted intermediate routers. Inner AES-GCM ciphertext is end-to-end encrypted—only Alice and Bob hold the Gold Key.',
            },
            hexInspector: [
              { label: 'R2 SCANNER READS', value: 'DST_IP=172.217.14.206 | TTL=62 | CHECKSUM=0x4c11', tone: 'normal' },
              { label: 'R2 PAYLOAD VIEW', value: '0x9f84c1e7924cf863... [OPAQUE CIPHERTEXT]', tone: 'cipher' },
              { label: 'GHASH TAG', value: '0xe81b7740c29a11f5... [INTACT]', tone: 'good' },
            ],
            changes: [
              { type: 'mod', text: 'Routers R1, R2, R3 decrement IP TTL and switch packet toward Bob’s subnet' },
            ],
            visual: {
              sceneType: 'scenario1',
              subpartIndex: 2,
              stepIndex: 2,
              cameraPreset: 'routers',
              showGlobalGrid: true,
              showIpEnvelope: 'TTL:61 | 172.217.14.206',
              activeRouterHop: 3,
              activeActors: ['alice', 'routers', 'bob'],
              packetProgress: 0.65,
              packetColor: 'purple_cipher',
            },
          },
          {
            label: 'Destination Match',
            chapter: 'STEP 04 · ENDPOINT DELIVERY',
            chapterTone: 'green',
            title: 'The packet bypasses millions of nodes and locks onto Bob’s terminal',
            explanation: 'The internet works like a postal system using locked steel briefcases. Routers read the address label on the outside to guide the packet to Bob’s exact IP and Port 443, while cryptography keeps the contents invisible at every hop.',
            hud: [
              { label: 'DESTINATION', value: '172.217.14.206:443 ✓', level: 'good' },
              { label: 'HOPS COMPLETED', value: '4 / 4 Routers', level: 'good' },
              { label: 'LATENCY', value: '18.4 ms Fiber Transit', level: 'good' },
            ],
            algorithmDecision: {
              algorithm: 'TCP Socket Demultiplexing (Dst IP + Port 443)',
              ruleTitle: 'PRECISE SOCKET DELIVERY',
              decisionRule: 'Bob’s network card matches the destination MAC and IP 172.217.14.206, strips the outer IP/TCP envelope, and hands the locked purple TLS capsule to Bob’s decryption engine.',
            },
            hexInspector: [
              { label: 'ENVELOPE STRIPPED', value: 'IP/TCP Headers removed at 172.217.14.206:443', tone: 'normal' },
              { label: 'DELIVERED CAPSULE', value: 'NONCE: 0x7c89... | CIPHER: 0x9f84... | TAG: 0xe81b...', tone: 'good' },
            ],
            changes: [
              { type: 'add', text: 'Packet delivered to Bob’s TLS socket on Port 443' },
            ],
            callout: {
              type: 'tip',
              title: 'Subpart 03 Takeaway',
              text: 'Routers read the address label on the outside to guide the packet to Bob, while cryptography keeps the contents invisible at every hop.',
            },
            visual: {
              sceneType: 'scenario1',
              subpartIndex: 2,
              stepIndex: 3,
              cameraPreset: 'bob',
              showGlobalGrid: true,
              activeRouterHop: 4,
              activeActors: ['alice', 'routers', 'bob'],
              packetProgress: 0.95,
              packetColor: 'purple_cipher',
            },
          },
        ],
      },
      {
        id: 's1-subpart-4',
        number: '04',
        title: "Mid-Transit Interception & Tampering (Eve's Attack)",
        shortTitle: "04. Eve's Interception & Tampering",
        subtitle: 'What a Man-in-the-Middle attacker actually sees on the wire and what happens when they try to brute-force or alter the packet.',
        moduleId: 'scenario-1',
        moduleTitle: 'Scenario 1 · Alice & Bob',
        tags: [
          { label: 'MITM Packet Sniffer', tone: 'sand' },
          { label: '2^256 Brute Force', tone: 'violet' },
          { label: 'Bit-Flipping Attack', tone: 'mint' },
        ],
        learningGoals: [
          'Watch Eve attach a red fiber siphon beam between Router 2 and Router 3',
          'Experience why brute-forcing a 256-bit AES key takes billions of years',
          'Simulate an active Bit-Flipping Tampering Attack on the encrypted hex payload',
          'Toggle between Passive Sniffing and Active Bit-Flipping in real time',
        ],
        experiment: {
          label: 'Toggle Attack Mode',
          modes: [
            { id: 'bitflip', label: 'Active Bit-Flip Tampering', badge: 'ACTIVE TAMPER' },
            { id: 'passive', label: 'Passive Wire Sniffing Only', badge: 'PASSIVE SNIFF' },
          ],
          modeOverrides: {
            passive: [
              {
                stepIndex: 2,
                title: 'Passive Sniff Mode: Eve observes without altering bytes',
                explanation: 'In Passive Sniff Mode, Eve records a copy of the encrypted packet onto her drive hoping to crack it later, but lets the original untampered purple capsule continue cleanly toward Bob.',
                hud: [
                  { label: 'ATTACK MODE', value: 'Passive Eavesdropping', level: 'warn' },
                  { label: 'BYTES ALTERED', value: '0 Bytes Modified', level: 'good' },
                  { label: 'EVE READABLE', value: '0% (Encrypted)', level: 'good' },
                ],
                hexInspector: [
                  { label: 'CAPTURED PCAP', value: '0x9f84c1e7924cf863a8bd2f74d2216df564834d02', tone: 'cipher' },
                  { label: 'FORWARDED PACKET', value: '0x9f84c1e7... [UNTAMPERED — Original GHASH Tag Valid]', tone: 'good' },
                ],
                visualPatch: {
                  eveBitFlip: false,
                  packetColor: 'purple_cipher',
                },
              },
            ],
          },
        },
        steps: [
          {
            label: 'Packet Sniffing',
            chapter: 'STEP 01 · FIBER SIPHON INTERCEPTION',
            chapterTone: 'red',
            title: 'Between Router 2 and Router 3, Eve attaches a red siphon beam to clone the packet',
            explanation: 'Between Router 2 and Router 3, a dark-red Attacker Node (Eve) attaches a glowing red siphon beam to the public fiber line, cloning the passing packet directly into her sniffer terminal.',
            hud: [
              { label: 'INTERCEPT POINT', value: 'Link R2 ↔ R3 Tapped', level: 'bad' },
              { label: 'CAPTURED BYTES', value: '64 Bytes Cloned', level: 'warn' },
              { label: 'PAYLOAD VIEW', value: '0x9f84c1e7... (Locked)', level: 'good' },
            ],
            algorithmDecision: {
              algorithm: 'Promiscuous Fiber Tap / BGP Route Hijack',
              ruleTitle: 'ASSUME THE NETWORK IS HOSTILE',
              decisionRule: 'In Kerckhoffs’s Principle and Shannon’s maxim, the enemy knows the system and controls the communication channel. Security must depend solely on the secrecy of the Gold Key.',
            },
            hexInspector: [
              { label: 'EVE WIRESHARK DUMP', value: 'IP 192.168.1.4.51924 > 172.217.14.206.443: TLSv1.3 Application Data', tone: 'alert' },
              { label: 'CAPTURED CIPHERTEXT', value: '9f 84 c1 e7 92 4c f8 63 a8 bd 2f 74 d2 21 6d f5 64 83 4d 02', tone: 'cipher' },
              { label: 'PLAINTEXT LEAKED', value: 'NONE — Looks indistinguishable from random noise', tone: 'good' },
            ],
            changes: [
              { type: 'add', text: 'Eve taps backbone fiber between R2 and R3 and clones Alice’s packet' },
            ],
            visual: {
              sceneType: 'scenario1',
              subpartIndex: 3,
              stepIndex: 0,
              cameraPreset: 'eve',
              eveSiphonActive: true,
              activeRouterHop: 2,
              activeActors: ['alice', 'routers', 'eve', 'bob'],
              packetProgress: 0.5,
              packetColor: 'purple_cipher',
            },
          },
          {
            label: 'Brute-Force Attempt',
            chapter: 'STEP 02 · 2^256 BRUTE-FORCE WALL',
            chapterTone: 'amber',
            title: 'Eve’s key cracker spins through 2^256 combinations—estimated time: billions of years',
            explanation: 'Eve tries to unlock the purple payload by guessing the Gold AES Key. A high-speed key counter spins on her console (2^256 possible keys ≈ 1.15 × 10^77), showing an estimated crack time of billions of years—the capsule stays shut.',
            hud: [
              { label: 'KEYSPACE', value: '2^256 (1.15×10^77)', level: 'good' },
              { label: 'EVE HASHRATE', value: '10^15 Keys / sec' },
              { label: 'EST. CRACK TIME', value: '3.6 × 10^54 Years', level: 'good' },
              { label: 'CAPSULE STATUS', value: 'Unbroken ✓', level: 'good' },
            ],
            algorithmDecision: {
              algorithm: 'AES-256 Exhaustive Key Search Resistance',
              ruleTitle: 'WHY 256 BITS OF ENTROPY?',
              decisionRule: 'Even if Eve built a supercomputer the size of a planet testing a quadrillion keys per second, she would not guess the Gold Key before the heat death of the universe.',
            },
            hexInspector: [
              { label: 'TRY #00049182731', value: 'KEY: 0x118a4f02... → OUTPUT: 0x09ff12a0... (Garbage)', tone: 'alert' },
              { label: 'TRY #00049182732', value: 'KEY: 0x7c90e155... → OUTPUT: 0xb481c003... (Garbage)', tone: 'alert' },
              { label: 'BRUTE FORCE RESULT', value: 'ABORTED — Keyspace Exhaustion Impossible', tone: 'good' },
            ],
            changes: [
              { type: 'mod', text: 'Eve runs exhaustive brute-force attack against AES-256; 0% progress' },
            ],
            callout: {
              type: 'insight',
              title: 'Thermodynamic Security',
              text: '2^256 is roughly the number of atoms in the observable universe. Network access is never enough to break modern symmetric encryption.',
            },
            visual: {
              sceneType: 'scenario1',
              subpartIndex: 3,
              stepIndex: 1,
              cameraPreset: 'eve',
              eveSiphonActive: true,
              eveBruteForce: true,
              activeActors: ['alice', 'routers', 'eve', 'bob'],
              packetProgress: 0.5,
              packetColor: 'purple_cipher',
            },
          },
          {
            label: 'Bit-Flipping Attack',
            chapter: 'STEP 03 · ACTIVE CIPHERTEXT TAMPERING',
            chapterTone: 'red',
            title: 'Frustrated, Eve fires a red laser pulse to flip 2 hex bytes inside the ciphertext',
            explanation: 'Unable to read the message, Eve attempts a Bit-Flipping Tampering Attack. She injects a red laser pulse that flips 2 hex bytes inside the purple ciphertext (0x9f84... → 0x9fFF...), hoping to corrupt the $500 transfer amount, and forwards the modified packet toward Bob.',
            hud: [
              { label: 'ATTACK TYPE', value: 'Active Bit-Flip (MITM)', level: 'bad' },
              { label: 'ORIGINAL HEX', value: '0x9f84c1e7...' },
              { label: 'TAMPERED HEX', value: '0x9fFFc1e7... (2B Flipped)', level: 'bad' },
              { label: 'GHASH SEAL', value: 'MISMATCH CREATED!', level: 'warn' },
            ],
            algorithmDecision: {
              algorithm: 'Malleability Attack on Stream/CTR Ciphertext vs. GHASH Tag',
              ruleTitle: 'WHAT HAPPENS WHEN CIPHERTEXT IS ALTERED?',
              decisionRule: 'In raw CTR mode without authentication, flipping bit i of ciphertext flips bit i of decrypted plaintext. That is why AES-GCM pairs CTR with GHASH so any byte change invalidates the 128-bit authentication tag.',
            },
            hexInspector: [
              { label: 'ORIGINAL CIPHER', value: '9f [84] c1 e7 92 4c f8 63 a8 bd 2f 74 d2 21 6d f5', tone: 'cipher' },
              { label: 'EVE INJECTED XOR', value: '00 [7B] 00 00 00 00 00 00 00 00 00 00 00 00 00 00', tone: 'alert' },
              { label: 'CORRUPTED CIPHER', value: '9f [FF] c1 e7 92 4c f8 63 a8 bd 2f 74 d2 21 6d f5 → Sent to Bob', tone: 'alert' },
            ],
            changes: [
              { type: 'mod', text: 'Eve mutates ciphertext byte 0x84 → 0xFF and injects corrupted packet onto fiber' },
            ],
            callout: {
              type: 'warn',
              title: 'Subpart 04 Takeaway',
              text: 'Eve easily captures the packet off the public network, proving that network access is not enough to break encryption. Frustrated, she modifies a few bytes of ciphertext to test if Bob will blindly trust corrupted data.',
            },
            visual: {
              sceneType: 'scenario1',
              subpartIndex: 3,
              stepIndex: 2,
              cameraPreset: 'eve',
              eveSiphonActive: true,
              eveBitFlip: true,
              activeActors: ['alice', 'routers', 'eve', 'bob'],
              packetProgress: 0.72,
              packetColor: 'tampered_red',
            },
          },
        ],
      },
      {
        id: 's1-subpart-5',
        number: '05',
        title: "Bob's Verification, Decryption & Defense",
        shortTitle: "05. Bob's Verification & Decryption",
        subtitle: "How Bob's computer uses the Authentication Tag to catch Eve's attack before decrypting, and how clean packets unlock safely.",
        moduleId: 'scenario-1',
        moduleTitle: 'Scenario 1 · Alice & Bob',
        tags: [
          { label: 'Verify-Then-Decrypt', tone: 'mint' },
          { label: 'AEADBadTagException', tone: 'sand' },
          { label: 'Zero-Trust Defense', tone: 'violet' },
        ],
        learningGoals: [
          'Feed the incoming packet into Bob’s GCM Verification Gate before allowing decryption',
          'Watch Bob’s engine catch Eve’s 2-byte bit-flip and vaporize the forged packet',
          'Replay a clean, untampered packet and verify matching 128-bit GHASH tags in green',
          'Unlock the purple capsule back into readable plaintext: "Transfer $500 to Bob"',
        ],
        experiment: {
          label: 'Packet Delivery Stream',
          modes: [
            { id: 'tampered', label: 'Deliver Eve’s Tampered Packet', badge: 'EVE BIT-FLIP' },
            { id: 'clean', label: 'Send Clean Untampered Packet', badge: 'CLEAN REPLAY' },
          ],
          modeOverrides: {
            clean: [
              {
                stepIndex: 1,
                title: 'Clean Packet Replay: GHASH Seals Match in Bright Green!',
                explanation: 'When an untampered packet arrives, Bob’s recalculated GHASH tag matches the capsule’s seal (0xE81B...49C0 == 0xE81B...49C0). The shield opens and unlocks "Transfer $500 to Bob"!',
                hud: [
                  { label: 'COMPUTED TAG', value: '0xE81B...49C0', level: 'good' },
                  { label: 'RECEIVED TAG', value: '0xE81B...49C0', level: 'good' },
                  { label: 'GATE DECISION', value: 'VERIFIED & UNLOCKED ✓', level: 'good' },
                ],
                hexInspector: [
                  { label: 'TAG COMPARISON', value: 'Computed(0xe81b...49c0) === Received(0xe81b...49c0) [MATCH]', tone: 'good' },
                  { label: 'DECRYPTED OUTPUT', value: '"Transfer $500 to Bob"', tone: 'good' },
                ],
                visualPatch: {
                  bobVerifyGate: 'verified',
                  packetColor: 'purple_cipher',
                  showPlaintextCard: 'Transfer $500 to Bob',
                },
              },
            ],
          },
        },
        steps: [
          {
            label: 'Integrity Check First',
            chapter: 'STEP 01 · GCM VERIFICATION GATE',
            chapterTone: 'blue',
            title: 'Bob’s terminal feeds the incoming packet into his GCM Verification Gate',
            explanation: 'Bob’s terminal receives the packet from Router 4 and feeds it into his GCM Verification Gate using his matching Gold AES Key. Crucially, Bob never decrypts ciphertext until its integrity seal is verified first.',
            hud: [
              { label: 'RULE', value: 'Verify-Then-Decrypt', level: 'good' },
              { label: 'BOB GOLD KEY', value: '0xD4F9...8E21 Loaded', level: 'good' },
              { label: 'GATE STATUS', value: 'Computing GHASH...', level: 'warn' },
            ],
            algorithmDecision: {
              algorithm: 'AEAD Verify-Then-Decrypt Pipeline',
              ruleTitle: 'WHY VERIFY BEFORE DECRYPTING?',
              decisionRule: 'Does Computed_Tag == Received_Tag? If we decrypted unverified data first, attackers could exploit parser bugs or timing side-channels (Chosen-Ciphertext Attacks).',
            },
            hexInspector: [
              { label: 'INCOMING CAPSULE', value: 'CIPHER: 0x9fFFc1e7... | ATTACHED_TAG: 0xe81b7740...49c0', tone: 'cipher' },
              { label: 'GHASH ENGINE', value: 'Recalculating polynomial hash over received ciphertext with Gold Key...', tone: 'key' },
            ],
            changes: [
              { type: 'add', text: 'Bob loads Gold AES-256 Key and passes received ciphertext into GHASH verifier' },
            ],
            visual: {
              sceneType: 'scenario1',
              subpartIndex: 4,
              stepIndex: 0,
              cameraPreset: 'bob',
              bobVerifyGate: 'checking',
              deriveGoldKey: true,
              activeActors: ['bob'],
              packetProgress: 0.92,
              packetColor: 'tampered_red',
            },
          },
          {
            label: 'Tamper Rejected!',
            chapter: 'STEP 02A · TAMPER DETECTED & VAPORIZED',
            chapterTone: 'red',
            title: 'Alarms flash red! GHASH tags do not match — corrupted packet vaporized',
            explanation: 'Bob’s system recalculates the GHASH tag over Eve’s altered bytes (0x3A09...F112) and compares it to the capsule’s original seal (0xE81B...49C0). They do not match! Alarms flash red, a shield slams shut, and the corrupted packet is dropped before ever touching Bob’s screen (Error: AEADBadTagException).',
            hud: [
              { label: 'COMPUTED TAG', value: '0x3A09...F112', level: 'bad' },
              { label: 'RECEIVED TAG', value: '0xE81B...49C0', level: 'warn' },
              { label: 'EXCEPTION', value: 'AEADBadTagException', level: 'bad' },
              { label: 'DEFENSE ACTION', value: 'Packet Vaporized ✓', level: 'good' },
            ],
            algorithmDecision: {
              algorithm: 'Constant-Time 128-bit Tag Comparison (CRYPTO_memcmp)',
              ruleTitle: 'AUTOMATIC TAMPER REJECTION',
              decisionRule: 'Computed_Tag (0x3a09...f112) != Received_Tag (0xe81b...49c0) → Return FALSE immediately, zero out buffers, and drop packet.',
            },
            hexInspector: [
              { label: 'EXPECTED SEAL', value: '0xe81b7740c29a11f58302d4e977b149c0', tone: 'normal' },
              { label: 'ACTUAL COMPUTED', value: '0x3a09e41188b023c19940a11200f8f112 [MISMATCH!]', tone: 'alert' },
              { label: 'KERNEL ACTION', value: 'DROP_PACKET: AEADBadTagException — Eve Bit-Flip Blocked', tone: 'alert' },
            ],
            changes: [
              { type: 'del', text: 'GHASH mismatch detected! Bob’s shield drops Eve’s modified packet' },
            ],
            callout: {
              type: 'warn',
              title: 'Zero Blind Trust',
              text: 'Even though Eve didn’t know the key, she tried to corrupt the data. The 128-bit GHASH seal caught the 2-byte change immediately.',
            },
            visual: {
              sceneType: 'scenario1',
              subpartIndex: 4,
              stepIndex: 1,
              cameraPreset: 'bob',
              bobVerifyGate: 'rejected',
              deriveGoldKey: true,
              activeActors: ['bob', 'eve'],
              packetProgress: 0.96,
              packetColor: 'tampered_red',
            },
          },
          {
            label: 'Clean Packet Unlock',
            chapter: 'STEP 02B · CLEAN PACKET VERIFIED & DECRYPTED',
            chapterTone: 'green',
            title: 'Clean Packet Replay: GHASH seals match in bright green and unlock "Transfer $500 to Bob"',
            explanation: 'A second, untampered packet arrives from Alice. Both 128-bit GHASH seals match in bright green! The purple capsule unlocks inside Bob’s AES chamber and unfolds back into the crisp white card: "Transfer $500 to Bob".',
            hud: [
              { label: 'TAG VERIFY', value: '0xE81B == 0xE81B ✓', level: 'good' },
              { label: 'AES-GCM UNLOCK', value: '14 Rounds Reversed', level: 'good' },
              { label: 'PLAINTEXT', value: '"Transfer $500 to Bob"', level: 'good' },
              { label: 'CIA TRIAD', value: '100% Protected ✓', level: 'good' },
            ],
            algorithmDecision: {
              algorithm: 'AES-256-GCM Authenticated Decryption',
              ruleTitle: 'VERIFY-THEN-DECRYPT SUCCEEDED',
              decisionRule: 'Does Computed_Tag == Received_Tag? TRUE! Generate the identical AES-CTR keystream using Gold Key + 96-bit Nonce and XOR with ciphertext to recover exact plaintext.',
            },
            hexInspector: [
              { label: 'GHASH VERIFIED', value: '0xe81b7740c29a11f58302d4e977b149c0 === VALID ✓', tone: 'good' },
              { label: 'CIPHER XOR STREAM', value: '9f 84 c1 e7... XOR cb f6 a0 89... → 54 72 61 6e 73 66 65 72...', tone: 'key' },
              { label: 'RECOVERED MESSAGE', value: '"Transfer $500 to Bob" (Delivered to Bob’s Terminal)', tone: 'good' },
            ],
            changes: [
              { type: 'add', text: 'Verified clean GHASH seal (0xe81b...49c0)' },
              { type: 'add', text: 'Unlocked purple capsule using Gold Key + Nonce → "Transfer $500 to Bob"' },
            ],
            callout: {
              type: 'tip',
              title: 'Scenario 1 Complete!',
              text: 'Modern cryptography protects both secrecy and integrity. Because Eve altered the ciphertext, the authentication tag failed verification—allowing Bob’s system to reject the fake message automatically and only unlock authentic data.',
            },
            visual: {
              sceneType: 'scenario1',
              subpartIndex: 4,
              stepIndex: 2,
              cameraPreset: 'bob',
              bobVerifyGate: 'verified',
              showPlaintextCard: 'Transfer $500 to Bob',
              deriveGoldKey: true,
              activeActors: ['alice', 'bob'],
              packetProgress: 1.0,
              packetColor: 'purple_cipher',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'scenario-2',
    number: '02',
    title: 'Scenario 2: Replay Attack & Timestamp Nonce Defense',
    folderColor: 'orange',
    description: 'How attackers capture valid encrypted packets and re-send them to duplicate transactions—and how cryptographic sequence numbers & nonces defeat replay attacks.',
    lessons: [
      {
        id: 's2-subpart-1',
        number: '01',
        title: 'Capturing a Valid Encrypted Transaction',
        shortTitle: '01. Capturing Valid Packet',
        subtitle: 'Why encryption alone does not stop an attacker from recording a legitimate packet and re-injecting it onto the wire.',
        moduleId: 'scenario-2',
        moduleTitle: 'Scenario 2 · Replay Defense',
        tags: [
          { label: 'Packet Cloning', tone: 'sand' },
          { label: 'Replay Vulnerability', tone: 'violet' },
        ],
        learningGoals: [
          'Observe Eve recording a 100% valid, authenticated encrypted payment packet',
          'Understand why Eve does not need to decrypt the packet to replay it',
        ],
        steps: [
          {
            label: 'Valid Payment Sent',
            chapter: 'STEP 01 · LEGITIMATE ENCRYPTED PAYMENT',
            chapterTone: 'blue',
            title: 'Alice sends an encrypted "$500 Transfer" capsule to Bob’s Bank Server',
            explanation: 'Alice sends a legitimate encrypted capsule authorizing a $500 transfer. Even though it is encrypted with AES-256, Eve records the exact byte stream as it passes through Router 2.',
            hud: [
              { label: 'PACKET #1', value: 'Valid Encrypted Auth', level: 'good' },
              { label: 'EVE RECORDER', value: 'Cloned 64 Bytes', level: 'warn' },
            ],
            algorithmDecision: {
              algorithm: 'Stateless Ciphertext Cloning',
              ruleTitle: 'WHY CAN EVE REPLAY WITHOUT THE KEY?',
              decisionRule: 'If the receiver only checks whether the ciphertext decrypts cleanly under the session key, an identical copy of the packet will also decrypt cleanly.',
            },
            hexInspector: [
              { label: 'ORIGINAL PACKET', value: 'CIPHER: 0x9f84c1e7... | TAG: 0xe81b...49c0', tone: 'cipher' },
              { label: 'EVE BUFFER', value: 'Saved exact byte clone into replay_buffer.pcap', tone: 'alert' },
            ],
            changes: [
              { type: 'add', text: 'Alice transmits valid encrypted $500 transfer packet' },
              { type: 'add', text: 'Eve clones the raw encrypted frame into her replay buffer' },
            ],
            visual: {
              sceneType: 'scenario2',
              subpartIndex: 0,
              stepIndex: 0,
              cameraPreset: 'wide',
              eveSiphonActive: true,
              replayCapture: true,
              activeActors: ['alice', 'routers', 'eve', 'bob'],
              packetProgress: 0.55,
              packetColor: 'purple_cipher',
            },
          },
          {
            label: 'First Transfer Processed',
            chapter: 'STEP 02 · LEGITIMATE EXECUTION',
            chapterTone: 'green',
            title: 'Bob’s server verifies Packet #1 and transfers the first $500',
            explanation: 'Packet #1 reaches Bob’s server, passes tag verification, and transfers $500. However, Eve still holds an exact copy of that valid encrypted capsule in her terminal.',
            hud: [
              { label: 'BANK LEDGER', value: 'Transferred $500 (#1)', level: 'good' },
              { label: 'EVE REPLAY GUN', value: 'Armed with Clone #1', level: 'bad' },
            ],
            algorithmDecision: {
              algorithm: 'Stateful vs. Stateless Session Verification',
              ruleTitle: 'THE REPLAY THREAT',
              decisionRule: 'Without a monotonic sequence number or single-use nonce cache, a server cannot distinguish a fresh packet from an old recording.',
            },
            hexInspector: [
              { label: 'BOB LEDGER', value: 'TX_01: -$500 from Alice → +$500 to Bob [COMPLETED]', tone: 'good' },
              { label: 'EVE TERMINAL', value: 'READY TO RE-INJECT CLONED PACKET', tone: 'alert' },
            ],
            changes: [
              { type: 'add', text: 'Bob executes first $500 transfer; Eve prepares duplicate injection' },
            ],
            visual: {
              sceneType: 'scenario2',
              subpartIndex: 0,
              stepIndex: 1,
              cameraPreset: 'bob',
              replayCapture: true,
              bobVerifyGate: 'verified',
              activeActors: ['alice', 'eve', 'bob'],
              packetProgress: 0.95,
              packetColor: 'purple_cipher',
            },
          },
        ],
      },
      {
        id: 's2-subpart-2',
        number: '02',
        title: 'Duplicate Packet Injection & Double-Spend Risk',
        shortTitle: '02. Replay Attack Execution',
        subtitle: 'Watch what happens when Eve fires the recorded encrypted capsule a second time without replay protection.',
        moduleId: 'scenario-2',
        moduleTitle: 'Scenario 2 · Replay Defense',
        tags: [
          { label: 'Replay Injection', tone: 'sand' },
          { label: 'Double Withdrawal', tone: 'violet' },
        ],
        learningGoals: [
          'See Eve inject the exact cloned ciphertext packet onto the wire',
          'Contrast vulnerable stateless acceptance against stateful nonce rejection',
        ],
        experiment: {
          label: 'Replay Protection Toggle',
          modes: [
            { id: 'protected', label: 'Nonce & Sequence Guard ON', badge: 'REPLAY BLOCKED' },
            { id: 'vulnerable', label: 'No Replay Guard (Stateless)', badge: 'DOUBLE SPEND!' },
          ],
          modeOverrides: {
            vulnerable: [
              {
                stepIndex: 1,
                title: 'VULNERABLE: Bob accepts the replayed packet and drains $1,000!',
                explanation: 'Because Nonce tracking is OFF, Bob’s server sees a valid AES key and valid tag, so it executes the $500 transfer a second time—draining $1,000 total from Alice!',
                hud: [
                  { label: 'REPLAY GUARD', value: 'DISABLED (Vulnerable)', level: 'bad' },
                  { label: 'BANK LEDGER', value: '$1,000 Drained! (2×$500)', level: 'bad' },
                ],
                hexInspector: [
                  { label: 'DUPLICATE ACCEPTED', value: 'TX_02 EXECUTED: Another $500 deducted without Alice’s consent!', tone: 'alert' },
                ],
                visualPatch: {
                  bobVerifyGate: 'verified',
                },
              },
            ],
          },
        },
        steps: [
          {
            label: 'Eve Fires Clone',
            chapter: 'STEP 01 · REPLAY INJECTION',
            chapterTone: 'red',
            title: 'Eve injects the recorded encrypted capsule back onto the fiber toward Bob',
            explanation: 'Seconds later, Eve transmits the exact recorded purple capsule toward Bob. It has Alice’s genuine Gold-Key encryption and genuine GHASH signature.',
            hud: [
              { label: 'INJECTED PACKET', value: 'Clone of Seq #1042', level: 'bad' },
              { label: 'CIPHER & TAG', value: 'Cryptographically Valid', level: 'warn' },
            ],
            algorithmDecision: {
              algorithm: 'Replay Attack (CWE-294: Authentication Bypass by Capture-Replay)',
              ruleTitle: 'WHY DOES THE TAG STILL PASS?',
              decisionRule: 'Because Eve did not flip any bits! The ciphertext and GHASH tag are 100% authentic—they are simply stale.',
            },
            hexInspector: [
              { label: 'REPLAYED FRAME', value: 'SEQ: 1042 | NONCE: 0x7c89f201a4e3 | CIPHER: 0x9f84c1e7...', tone: 'alert' },
            ],
            changes: [
              { type: 'add', text: 'Eve re-transmits captured packet Seq #1042 toward Bob’s server' },
            ],
            visual: {
              sceneType: 'scenario2',
              subpartIndex: 1,
              stepIndex: 0,
              cameraPreset: 'eve',
              replayDuplicate: true,
              eveSiphonActive: true,
              activeActors: ['eve', 'routers', 'bob'],
              packetProgress: 0.65,
              packetColor: 'replay_amber',
            },
          },
          {
            label: 'Nonce Cache Blocks Replay',
            chapter: 'STEP 02 · SLIDING WINDOW NONCE DEFENSE',
            chapterTone: 'green',
            title: 'Bob’s Nonce & Sequence Guard spots duplicate Seq #1042 and blocks the replay!',
            explanation: 'Bob’s TLS 1.3 engine checks its 64-packet sliding window cache. It sees that Nonce 0x7c89f201a4e3 (Seq #1042) was already spent 4 seconds ago—slamming the gate shut with ERR_REPLAY_DETECTED!',
            hud: [
              { label: 'PACKET SEQ', value: '#1042 (Already Spent!)', level: 'bad' },
              { label: 'EXPECTED SEQ', value: '#1043 or Higher', level: 'good' },
              { label: 'DEFENSE ACTION', value: 'REPLAY REJECTED ✓', level: 'good' },
            ],
            algorithmDecision: {
              algorithm: 'TLS 1.3 Per-Record 64-bit Sequence Counter + Anti-Replay Sliding Window',
              ruleTitle: 'MONOTONIC SEQUENCE ENFORCEMENT',
              decisionRule: 'If Incoming_Seq <= Last_Seen_Seq OR Nonce in Seen_Cache: Reject immediately as a Replay Attack before executing application logic.',
            },
            hexInspector: [
              { label: 'NONCE CACHE LOOKUP', value: '0x7c89f201a4e3 FOUND_IN_CACHE (Timestamp: T-4.2s)', tone: 'alert' },
              { label: 'VERDICT', value: 'DROP_REPLAY: Duplicate sequence number #1042 rejected', tone: 'good' },
            ],
            changes: [
              { type: 'del', text: 'Bob’s Anti-Replay Guard rejects duplicate Nonce 0x7c89f201a4e3' },
            ],
            callout: {
              type: 'tip',
              title: 'Scenario 2 Takeaway',
              text: 'Binding every encrypted message to a strictly increasing 64-bit sequence number and fresh timestamp nonce renders captured packets useless the moment they are used once.',
            },
            visual: {
              sceneType: 'scenario2',
              subpartIndex: 1,
              stepIndex: 1,
              cameraPreset: 'bob',
              replayDuplicate: true,
              bobVerifyGate: 'rejected',
              activeActors: ['eve', 'bob'],
              packetProgress: 0.95,
              packetColor: 'tampered_red',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'scenario-3',
    number: '03',
    title: 'Scenario 3: SHA-256 Hashing & Digital Signatures (RSA / Ed25519)',
    folderColor: 'violet',
    description: 'How cryptographic hash functions (SHA-256) and Asymmetric Digital Signatures guarantee non-repudiation and detect single-character forgery.',
    lessons: [
      {
        id: 's3-subpart-1',
        number: '01',
        title: 'SHA-256 Avalanche Effect & Message Digest',
        shortTitle: '01. SHA-256 Avalanche Effect',
        subtitle: 'How a 1-bit change in a contract completely scrambles the 256-bit cryptographic fingerprint.',
        moduleId: 'scenario-3',
        moduleTitle: 'Scenario 3 · Hashing & Signatures',
        tags: [
          { label: 'SHA-256 Digest', tone: 'violet' },
          { label: 'Avalanche Effect', tone: 'mint' },
        ],
        learningGoals: [
          'Feed a digital document into the 64-round SHA-256 compression chamber',
          'Test the Avalanche Effect by changing "$500" to "$5000" and watching 50% of hash bits flip',
        ],
        experiment: {
          label: 'Input Document Mutation',
          modes: [
            { id: 'orig', label: 'Original: "Pay Bob $500"', badge: 'ORIGINAL DOC' },
            { id: 'forged', label: 'Mutated: "Pay Bob $5000"', badge: '1 CHAR CHANGED' },
          ],
          modeOverrides: {
            forged: [
              {
                stepIndex: 0,
                title: 'Avalanche Effect: Adding one "0" scrambles 129 of 256 hash bits!',
                explanation: 'Changing "Pay Bob $500" to "Pay Bob $5000" causes the SHA-256 digest to change completely from 0x8f1c...9a02 to 0x3d7e...11b8. There is zero visual similarity!',
                hud: [
                  { label: 'INPUT DOC', value: '"Pay Bob $5000"', level: 'warn' },
                  { label: 'SHA-256 DIGEST', value: '0x3d7e91b4...11b8', level: 'bad' },
                  { label: 'BITS FLIPPED', value: '129 / 256 Bits (50.4%)', level: 'good' },
                ],
                hexInspector: [
                  { label: 'ORIGINAL SHA-256', value: '8f1c4409a2b7e108d455c31900a8f712c94401e8b321a904f7c1d82200e19a02', tone: 'normal' },
                  { label: 'MUTATED SHA-256', value: '3d7e91b4c0082a7f91e34401b892c761a0093f44d128e750c219a03377f411b8', tone: 'alert' },
                ],
              },
            ],
          },
        },
        steps: [
          {
            label: 'SHA-256 Digest',
            chapter: 'STEP 01 · CRYPTOGRAPHIC FINGERPRINTING',
            chapterTone: 'violet',
            title: 'Alice hashes her contract through the 64-round SHA-256 chamber',
            explanation: 'Alice feeds her contract ("Pay Bob $500") into the SHA-256 chamber. Using 64 rounds of bitwise rotations and modular additions, it outputs a fixed 256-bit fingerprint (digest).',
            hud: [
              { label: 'INPUT', value: '"Pay Bob $500"' },
              { label: 'SHA-256 HASH', value: '0x8f1c4409...9a02', level: 'good' },
              { label: 'PRE-IMAGE SAFE', value: 'One-Way Irreversible', level: 'good' },
            ],
            algorithmDecision: {
              algorithm: 'SHA-256 (Merkle–Damgård 64-Round Compression)',
              ruleTitle: 'COLLISION RESISTANCE & AVALANCHE EFFECT',
              decisionRule: 'Flipping even 1 bit of the input document flips ~50% of the output bits randomly, making it impossible to forge a different contract with the same hash.',
            },
            hexInspector: [
              { label: 'DOCUMENT BYTES', value: '"Pay Bob $500" (12 bytes)', tone: 'normal' },
              { label: 'SHA-256 DIGEST', value: '8f1c4409a2b7e108d455c31900a8f712c94401e8b321a904f7c1d82200e19a02', tone: 'good' },
            ],
            changes: [
              { type: 'add', text: 'Computed 256-bit SHA-256 digest of Alice’s contract' },
            ],
            visual: {
              sceneType: 'scenario3',
              subpartIndex: 0,
              stepIndex: 0,
              cameraPreset: 'alice',
              showPlaintextCard: 'Pay Bob $500',
              showAesCube: true,
              aesScrambledHex: 'SHA256: 0x8f1c...9a02',
              activeActors: ['alice'],
            },
          },
          {
            label: 'Private Key Signing',
            chapter: 'STEP 02 · ASYMMETRIC DIGITAL SIGNATURE',
            chapterTone: 'green',
            title: 'Alice signs the SHA-256 digest using her Red Private Signing Key',
            explanation: 'A hash alone can be recalculated by Eve if Eve modifies the message! To lock the hash, Alice seals the SHA-256 digest with her Red Private Key—creating an unforgeable Gold Digital Signature.',
            hud: [
              { label: 'SIGNING KEY', value: 'Alice Red Private Key', level: 'good' },
              { label: 'SIGNATURE', value: 'Ed25519 / RSA-PSS Seal', level: 'good' },
              { label: 'NON-REPUDIATION', value: 'Provably Alice ✓', level: 'good' },
            ],
            algorithmDecision: {
              algorithm: 'Ed25519 / RSA-PSS Digital Signature (Sign = Enc_Priv(SHA256(M)))',
              ruleTitle: 'WHY SIGN THE HASH INSTEAD OF JUST HASHING?',
              decisionRule: 'Anyone can compute a SHA-256 hash. Only Alice possesses her Red Private Signing Key, while the whole world can verify the signature using her Blue Public Key.',
            },
            hexInspector: [
              { label: 'INPUT DIGEST', value: '0x8f1c4409a2b7e108...9a02', tone: 'normal' },
              { label: 'DIGITAL SIGNATURE', value: 'SIG_ALICE: 0x55a9c012e84f...77b3d109 [SIGNED BY ALICE_PRIV]', tone: 'key' },
            ],
            changes: [
              { type: 'add', text: 'Alice signs the 256-bit digest with her Private Key → Gold Signature Seal' },
            ],
            visual: {
              sceneType: 'scenario3',
              subpartIndex: 0,
              stepIndex: 1,
              cameraPreset: 'wide',
              signatureSeal: true,
              showGhashSeal: 'SIG: 0x55A9...D109',
              activeActors: ['alice', 'bob'],
              packetProgress: 0.45,
              packetColor: 'signed_gold',
            },
          },
          {
            label: 'Bob Public Verification',
            chapter: 'STEP 03 · PUBLIC KEY SIGNATURE VERIFICATION',
            chapterTone: 'blue',
            title: 'Bob verifies Alice’s signature with her Blue Public Key and catches forgery',
            explanation: 'Bob unlocks the signature seal with Alice’s Blue Public Key to reveal Alice’s original SHA-256 hash, then independently hashes the received document. Because they match, Bob has mathematical proof that Alice wrote it and not a single bit changed.',
            hud: [
              { label: 'VERIFY KEY', value: 'Alice Blue Public Key', level: 'good' },
              { label: 'HASH MATCH', value: '0x8f1c == 0x8f1c ✓', level: 'good' },
              { label: 'AUTHENTICITY', value: 'Verified Genuine ✓', level: 'good' },
            ],
            algorithmDecision: {
              algorithm: 'Asymmetric Signature Verification (Verify(Pub_A, M, Sig))',
              ruleTitle: 'PUBLIC VERIFIABILITY',
              decisionRule: 'Does SHA256(Received_Doc) == Verify(Alice_Public_Key, Signature)? If Eve altered "$500" to "$5000", the hashes diverge and Eve cannot forge a new signature without Alice’s Red Private Key.',
            },
            hexInspector: [
              { label: 'UNLOCKED SIG HASH', value: '0x8f1c4409a2b7e108d455c31900a8f712...9a02', tone: 'good' },
              { label: 'LOCAL DOC SHA-256', value: '0x8f1c4409a2b7e108d455c31900a8f712...9a02 [100% MATCH]', tone: 'good' },
            ],
            changes: [
              { type: 'add', text: 'Bob verifies Ed25519 signature using Alice’s Public Key → Authentic' },
            ],
            callout: {
              type: 'tip',
              title: 'Scenario 3 Takeaway',
              text: 'SHA-256 detects any change to the data, while Asymmetric Digital Signatures prove who authored that data.',
            },
            visual: {
              sceneType: 'scenario3',
              subpartIndex: 0,
              stepIndex: 2,
              cameraPreset: 'bob',
              signatureSeal: true,
              bobVerifyGate: 'verified',
              activeActors: ['alice', 'bob'],
              packetProgress: 0.95,
              packetColor: 'signed_gold',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'scenario-4',
    number: '04',
    title: 'Scenario 4: Active MITM Certificate Spoofing & PKI Chain Defense',
    folderColor: 'blue',
    description: 'How an attacker intercepts a connection by presenting a fake public key—and how X.509 Certificate Authorities and mTLS stop impersonation.',
    lessons: [
      {
        id: 's4-subpart-1',
        number: '01',
        title: 'Eve’s Rogue Key Substitution vs. X.509 CA Chain',
        shortTitle: '01. MITM Key Spoofing vs. PKI',
        subtitle: 'Why raw Diffie-Hellman without certificates falls prey to an active Man-in-the-Middle proxy, and how PKI certificate chains defeat it.',
        moduleId: 'scenario-4',
        moduleTitle: 'Scenario 4 · PKI & MITM Defense',
        tags: [
          { label: 'X.509 PKI Chain', tone: 'mint' },
          { label: 'MITM Key Spoofing', tone: 'sand' },
        ],
        learningGoals: [
          'See how Eve intercepts unauthenticated public keys and substitutes her own rogue key',
          'Watch the Root Certificate Authority (CA) signature check expose Eve’s forged certificate',
        ],
        steps: [
          {
            label: 'Eve Key Substitution',
            chapter: 'STEP 01 · ROGUE PUBLIC KEY INTERCEPTION',
            chapterTone: 'red',
            title: 'Eve intercepts Bob’s Public Key and tries to substitute her own Rogue Key',
            explanation: 'In an active Man-in-the-Middle attack, Eve does not just listen—she blocks Bob’s Blue Public Key and sends her own Rogue Key to Alice, hoping Alice will establish an encrypted tunnel straight into Eve’s trap!',
            hud: [
              { label: 'MITM ACTION', value: 'Rogue Key Injected', level: 'bad' },
              { label: 'FAKE CERT', value: 'CN=bob.bank.com (Forged)', level: 'bad' },
            ],
            algorithmDecision: {
              algorithm: 'Active Man-in-the-Middle (MITM) Split-Tunnel Attack',
              ruleTitle: 'THE UNAUTHENTICATED DH FLAW',
              decisionRule: 'If Alice accepts any public key on the wire without checking a CA signature, she unwittingly derives a shared key with Eve instead of Bob.',
            },
            hexInspector: [
              { label: 'GENUINE BOB KEY', value: '0x2d7e55a198f3... [INTERCEPTED BY EVE]', tone: 'normal' },
              { label: 'EVE ROGUE KEY', value: '0xdeadbeef9912... [SPOOFED AS BOB]', tone: 'alert' },
            ],
            changes: [
              { type: 'mod', text: 'Eve intercepts handshake and injects forged certificate with her own public key' },
            ],
            visual: {
              sceneType: 'scenario4',
              subpartIndex: 0,
              stepIndex: 0,
              cameraPreset: 'eve',
              eveSiphonActive: true,
              eveBitFlip: true,
              activeActors: ['alice', 'eve', 'bob', 'ca'],
              packetProgress: 0.5,
              packetColor: 'tampered_red',
            },
          },
          {
            label: 'PKI Chain Catches Forgery',
            chapter: 'STEP 02 · X.509 CA SIGNATURE VERIFICATION',
            chapterTone: 'green',
            title: 'Alice checks the Root CA signature—exposing Eve’s forged certificate immediately!',
            explanation: 'Alice’s browser verifies the certificate signature against the pinned Root Certificate Authority (CA) public key. Because Eve does not possess the Root CA’s private signing key, the signature verification fails with ERR_CERT_AUTHORITY_INVALID and Alice aborts the connection before sending a single byte!',
            hud: [
              { label: 'CA SIGNATURE', value: 'INVALID FORGERY!', level: 'bad' },
              { label: 'BROWSER GUARD', value: 'Connection Aborted ✓', level: 'good' },
              { label: 'DATA LEAKED', value: '0 Bytes Sent', level: 'good' },
            ],
            algorithmDecision: {
              algorithm: 'X.509 Hierarchical PKI Verification (Root CA → Intermediate → Leaf)',
              ruleTitle: 'WHY CAN’T EVE FORGE A VALID CERTIFICATE?',
              decisionRule: 'A valid TLS certificate binds "bob.bank.com" + Bob’s Public Key inside an RSA/ECDSA signature created by the Root CA’s offline Hardware Security Module (HSM).',
            },
            hexInspector: [
              { label: 'CA VERIFY CHECK', value: 'Verify(DigiCert_Root_Pub, Eve_Fake_Cert) === FALSE', tone: 'alert' },
              { label: 'TLS ALERT SENT', value: 'FATAL_ALERT(48): unknown_ca — Handshake Terminated Safely', tone: 'good' },
            ],
            changes: [
              { type: 'del', text: 'X.509 CA validation catches Eve’s rogue key; TLS handshake aborted safely' },
            ],
            callout: {
              type: 'tip',
              title: 'Scenario 4 Takeaway',
              text: 'Public Key Infrastructure (PKI) bridges the gap between math and real-world identity, ensuring you only run Diffie-Hellman with the true server.',
            },
            visual: {
              sceneType: 'scenario4',
              subpartIndex: 0,
              stepIndex: 1,
              cameraPreset: 'wide',
              showCertBeam: true,
              bobVerifyGate: 'rejected',
              activeActors: ['alice', 'ca', 'eve', 'bob'],
              packetProgress: 0.35,
              packetColor: 'tampered_red',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'scenario-5',
    number: '05',
    title: 'Scenario 5: Network Perimeter Defense (Firewall & IDS/IPS Inspection)',
    folderColor: 'teal',
    description: 'How enterprise Firewalls and Intrusion Detection & Prevention Systems (IDS/IPS) filter malicious floods and anomalies before they reach Bob’s server.',
    lessons: [
      {
        id: 's5-subpart-1',
        number: '01',
        title: 'Stateful Firewall & Automated IPS Threat Blocking',
        shortTitle: '01. Firewall & IDS/IPS Shield',
        subtitle: 'Combining cryptographic security with network-layer Firewall packet filtering and real-time IDS/IPS anomaly prevention.',
        moduleId: 'scenario-5',
        moduleTitle: 'Scenario 5 · Firewall & IDS/IPS',
        tags: [
          { label: 'Stateful Firewall', tone: 'mint' },
          { label: 'IDS/IPS Engine', tone: 'violet' },
          { label: 'Zero-Downtime Defense', tone: 'sand' },
        ],
        learningGoals: [
          'Observe Eve launching high-rate port scans and malformed flood packets toward Bob',
          'Watch the Stateful Firewall & IPS Gate inspect packet headers and drop malicious traffic',
          'Allow Alice’s authenticated TLS 1.3 traffic on Port 443 to pass cleanly through the shield',
        ],
        experiment: {
          label: 'Perimeter IPS Policy',
          modes: [
            { id: 'enforcing', label: 'IPS Inline Blocking + Firewall ON', badge: 'IPS ENFORCING' },
            { id: 'monitor', label: 'IDS Passive Alert Only (No Block)', badge: 'IDS PASSIVE' },
          ],
          modeOverrides: {
            monitor: [
              {
                stepIndex: 1,
                title: 'IDS Passive Mode: Alerts fire, but flood packets still hit Bob’s server!',
                explanation: 'In passive IDS mode, the sensor logs an alert when Eve floods Port 22/443, but does not drop the packets inline—causing Bob’s server CPU to spike to 98%!',
                hud: [
                  { label: 'MODE', value: 'IDS Alert Only (Passive)', level: 'warn' },
                  { label: 'BOB CPU LOAD', value: '98% (Flooded!)', level: 'bad' },
                ],
                hexInspector: [
                  { label: 'IDS ALERT LOG', value: '[SID:2019401] SYN Flood Detected from 10.66.6.13 — NO DROP RULE', tone: 'alert' },
                ],
              },
            ],
          },
        },
        steps: [
          {
            label: 'Malicious Probe & Flood',
            chapter: 'STEP 01 · NETWORK RECON & SYN FLOOD',
            chapterTone: 'red',
            title: 'Eve launches unauthorized port probes (Port 22/3389) and malformed flood packets',
            explanation: 'When Eve realizes she cannot break AES-256-GCM or forge X.509 certificates, she switches to network attacks—firing unauthorized SSH/RDP probes and high-rate flood packets toward Bob’s server.',
            hud: [
              { label: 'ATTACK VECTOR', value: 'Port Scan + SYN Flood', level: 'bad' },
              { label: 'TARGET PORTS', value: 'TCP 22, 3389, 443', level: 'warn' },
              { label: 'EVE PPS RATE', value: '48,000 pkt/sec', level: 'bad' },
            ],
            algorithmDecision: {
              algorithm: 'Defense-in-Depth (Network Perimeter + Cryptographic Layer)',
              ruleTitle: 'WHY CRYPTOGRAPHY NEEDS NETWORK SECURITY',
              decisionRule: 'Encryption protects confidentiality and integrity, but availability requires Firewalls and IPS to drop unauthorized ports and flood anomalies before they exhaust server sockets.',
            },
            hexInspector: [
              { label: 'EVE PROBE #1', value: 'SRC: 10.66.6.13 → DST: 172.217.14.206:22 [SYN_SCAN]', tone: 'alert' },
              { label: 'EVE PROBE #2', value: 'SRC: 10.66.6.13 → DST: 172.217.14.206:3389 [MALFORMED_PAYLOAD]', tone: 'alert' },
            ],
            changes: [
              { type: 'add', text: 'Eve floods Bob’s perimeter with unauthorized port probes and malformed packets' },
            ],
            visual: {
              sceneType: 'scenario5',
              subpartIndex: 0,
              stepIndex: 0,
              cameraPreset: 'firewall',
              firewallInspect: 'dos_flood',
              eveSiphonActive: true,
              activeActors: ['alice', 'eve', 'firewall', 'bob'],
              packetProgress: 0.55,
              packetColor: 'tampered_red',
            },
          },
          {
            label: 'Firewall & IPS Block',
            chapter: 'STEP 02 · STATEFUL FIREWALL & INLINE IPS',
            chapterTone: 'green',
            title: 'The 3D Firewall & IPS Shield vaporizes Eve’s attack while passing Alice’s TLS capsule',
            explanation: 'Bob’s perimeter Firewall blocks all non-443 ports instantly, while the inline Intrusion Prevention System (IPS) fingerprints Eve’s flood signature, blacklists Eve’s IP (10.66.6.13), and lets Alice’s legitimate TLS 1.3 encrypted capsule glide cleanly through to Bob!',
            hud: [
              { label: 'FIREWALL RULE', value: 'ALLOW TCP/443 ONLY ✓', level: 'good' },
              { label: 'IPS ENGINE', value: '10.66.6.13 Quarantined ✓', level: 'good' },
              { label: 'ALICE TLS FLOW', value: 'Delivered Cleanly (14ms)', level: 'good' },
              { label: 'BOB UPTIME', value: '100% Protected ✓', level: 'good' },
            ],
            algorithmDecision: {
              algorithm: 'Stateful Packet Inspection (SPI) + Signature/Anomaly IPS + TLS 1.3',
              ruleTitle: 'COMPLETE CIA TRIAD PROTECTION',
              decisionRule: '1. Confidentiality: AES-256-GCM + ECDHE. 2. Integrity & Authenticity: GHASH Tag + SHA-256 + X.509 Signatures. 3. Availability: Stateful Firewall + Inline IPS.',
            },
            hexInspector: [
              { label: 'FIREWALL ACL', value: 'DENY 10.66.6.13 → ANY [Dropped 48,000 malicious packets]', tone: 'good' },
              { label: 'ALICE TLS PACKET', value: 'PERMIT 192.168.1.4 → 172.217.14.206:443 [AES-256-GCM Verified]', tone: 'good' },
            ],
            changes: [
              { type: 'del', text: 'Stateful Firewall & IPS block Eve’s IP and drop all malformed flood packets' },
              { type: 'add', text: 'Alice’s encrypted TLS 1.3 capsule passes perimeter inspection and unlocks at Bob’s terminal' },
            ],
            callout: {
              type: 'tip',
              title: 'All 5 Scenarios Complete!',
              text: 'Don’t just learn how cryptography works — you have experienced, explored, and understood the full pipeline from ECDHE and AES-256-GCM to Replay Defense, SHA-256 Signatures, PKI, and IDS/IPS.',
            },
            visual: {
              sceneType: 'scenario5',
              subpartIndex: 0,
              stepIndex: 1,
              cameraPreset: 'wide',
              firewallInspect: 'protected',
              bobVerifyGate: 'verified',
              showPlaintextCard: 'Transfer $500 to Bob',
              activeActors: ['alice', 'firewall', 'bob', 'eve'],
              packetProgress: 0.95,
              packetColor: 'purple_cipher',
            },
          },
        ],
      },
    ],
  },
];

export const ALL_LESSONS: LessonSubpart[] = SCENARIO_MODULES.flatMap((m) => m.lessons);
