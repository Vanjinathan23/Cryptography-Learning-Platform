import {
  AppDatabaseSchema,
  UserRecord,
  ScenarioRecord,
  LessonRecord,
  LabBenchmarkRecord,
  AuditLogRecord,
} from './schema';

const STORAGE_KEY = 'cryptoscale_db_v2';
const ACTIVE_USER_KEY = 'cryptoscale_active_user_v2';

const INITIAL_DB: AppDatabaseSchema = {
  users: [
    {
      id: 'usr_student_01',
      username: 'CryptoStudent',
      email: 'student@cryptoscale.edu',
      role: 'student',
      xp: 450,
      completedScenarios: ['m1-chat'],
      currentMissionId: 'm2-portal',
      createdAt: '2026-11-20T10:00:00Z',
      salt: '7a9f1b2c3d4e5f60',
      passwordHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      lastLoginAt: '2026-11-25T08:00:00Z',
      avatarColor: '#2e7d32',
    },
  ],
  scenarios: [
    {
      id: 'm1-chat',
      num: '01',
      title: 'Café Wi-Fi Messaging',
      category: 'Symmetric AEAD & Integrity',
      difficulty: 'Beginner',
      estimatedMinutes: 10,
      stagesCount: 5,
      description: 'Intercept plain messages on public Wi-Fi, test AES-CTR bit-flipping, and verify AEAD tag rejection.',
    },
    {
      id: 'm2-portal',
      num: '02',
      title: 'Campus Portal DB Breach',
      category: 'Password Hashing & Salting',
      difficulty: 'Intermediate',
      estimatedMinutes: 12,
      stagesCount: 5,
      description: 'Run rainbow tables on unsalted SHA-256 hashes and defend accounts using Argon2id with unique 128-bit salts.',
    },
    {
      id: 'm3-bank',
      num: '03',
      title: 'Airport Wi-Fi Banking',
      category: 'TLS Handshake & Forward Secrecy',
      difficulty: 'Intermediate',
      estimatedMinutes: 15,
      stagesCount: 5,
      description: 'Detect Evil-Twin cert spoofing, enforce Trusted Root CAs, and perform manual Diffie-Hellman ECDHE key exchange.',
    },
    {
      id: 'm4-update',
      num: '04',
      title: 'Software Update Hijack',
      category: 'SHA-256 Avalanche & Code Signing',
      difficulty: 'Advanced',
      estimatedMinutes: 15,
      stagesCount: 5,
      description: 'Experience SHA-256 avalanche bit-scrambling and stop a 1-byte CDN Trojan using Ed25519 signatures and offline HSMs.',
    },
    {
      id: 'm5-vault',
      num: '05',
      title: 'Cloud Vault & Tap-to-Pay',
      category: 'AEAD Nonces & Replay Protection',
      difficulty: 'Advanced',
      estimatedMinutes: 18,
      stagesCount: 5,
      description: 'Uncover AES-ECB X-ray silhouette leaks, isolate Master Keys in KMS, and block NFC tap-to-pay replay attacks.',
    },
  ],
  lessons: [
    { id: 'l1', scenarioId: 'm1-chat', lessonNum: 1, title: 'Spotting Cleartext Leak', contentSummary: 'Exposing unencrypted UTF-8 payloads on public Wi-Fi routers.', interactiveType: 'cipher' },
    { id: 'l2', scenarioId: 'm2-portal', lessonNum: 1, title: 'Rainbow Table Collisions', contentSummary: 'Demonstrating how identical unsalted hashes crack instantly.', interactiveType: 'hash' },
    { id: 'l3', scenarioId: 'm3-bank', lessonNum: 1, title: 'Evil-Twin Certificate Spoofing', contentSummary: 'Inspect self-signed certs and bypass prompts.', interactiveType: 'key_exchange' },
    { id: 'l4', scenarioId: 'm4-update', lessonNum: 1, title: 'The Avalanche Effect', contentSummary: 'Observing 50% bit flips from a single character edit.', interactiveType: 'signature' },
    { id: 'l5', scenarioId: 'm5-vault', lessonNum: 1, title: 'ECB Ciphertext Pattern Leak', contentSummary: 'Why electronic codebook mode preserves visual image outlines.', interactiveType: 'aead' },
  ],
  labBenchmarks: [
    { id: 'b1', workbenchName: 'Cipher & Wire', algorithm: 'AES-256-GCM', defaultKey: 'cafe-secret-256', status: 'optimal', lastRunAt: new Date().toISOString() },
    { id: 'b2', workbenchName: 'Hash & Avalanche', algorithm: 'SHA-256', defaultKey: 'payload-hash-check', status: 'optimal', lastRunAt: new Date().toISOString() },
    { id: 'b3', workbenchName: 'Key Exchange (DH)', algorithm: 'Diffie-Hellman (p=23, g=5)', defaultKey: 'a=6, b=15', status: 'secured', lastRunAt: new Date().toISOString() },
    { id: 'b4', workbenchName: 'ECB vs GCM Visual', algorithm: 'AES-256-GCM + Nonce', defaultKey: 'hospital-xray-key', status: 'optimal', lastRunAt: new Date().toISOString() },
  ],
  auditLogs: [
    { id: 1, timestamp: new Date().toLocaleTimeString(), scenarioId: 'm1-chat', actionType: 'Database Initialization', outcome: 'Database tables populated successfully', tone: 'good' },
  ],
};

class DatabaseManager {
  private getDb(): AppDatabaseSchema {
    if (typeof window === 'undefined') return INITIAL_DB;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DB));
        return INITIAL_DB;
      }
      const parsed = JSON.parse(raw);
      // Migrate existing single-user data if needed
      if (!parsed.users || parsed.users.length < INITIAL_DB.users.length) {
        parsed.users = INITIAL_DB.users;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      }
      return parsed;
    } catch {
      return INITIAL_DB;
    }
  }

  private saveDb(db: AppDatabaseSchema): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch (e) {
      console.error('Failed to persist database state', e);
    }
  }

  public getActiveUserId(): string {
    if (typeof window === 'undefined') return INITIAL_DB.users[0].id;
    return localStorage.getItem(ACTIVE_USER_KEY) || INITIAL_DB.users[0].id;
  }

  public setActiveUserId(userId: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ACTIVE_USER_KEY, userId);
  }

  public getUsers(): UserRecord[] {
    const db = this.getDb();
    return db.users;
  }

  public getUser(): UserRecord {
    const db = this.getDb();
    const activeId = this.getActiveUserId();
    const found = db.users.find((u) => u.id === activeId);
    if (found) return found;
    return db.users[0] || INITIAL_DB.users[0];
  }

  public switchUser(userId: string): UserRecord {
    const db = this.getDb();
    const target = db.users.find((u) => u.id === userId);
    if (!target) {
      throw new Error(`User ${userId} not found`);
    }
    this.setActiveUserId(userId);
    this.logAction('auth', 'Session Switched', `Active session switched to ${target.username} (${target.role})`, 'good');
    return target;
  }

  public authenticate(
    usernameOrEmail: string,
    passwordHash?: string
  ): { success: boolean; user?: UserRecord; error?: string } {
    const db = this.getDb();
    const cleanIdentifier = usernameOrEmail.trim().toLowerCase();

    const matchedUser = db.users.find(
      (u) =>
        u.username.toLowerCase() === cleanIdentifier ||
        (u.email && u.email.toLowerCase() === cleanIdentifier)
    );

    if (!matchedUser) {
      this.logAction('auth', 'Login Failed', `Account "${usernameOrEmail}" not found`, 'bad');
      return { success: false, error: 'Account not found. Please check your username or register.' };
    }

    // Update last login timestamp
    matchedUser.lastLoginAt = new Date().toISOString();
    this.saveDb(db);
    this.setActiveUserId(matchedUser.id);
    this.logAction('auth', 'Login Succeeded', `User ${matchedUser.username} authenticated successfully`, 'good');

    return { success: true, user: matchedUser };
  }

  public register(
    username: string,
    email: string,
    passwordHash: string,
    salt: string,
    role: 'student' | 'cryptographer' | 'admin' = 'student'
  ): { success: boolean; user?: UserRecord; error?: string } {
    const db = this.getDb();
    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    // Check duplicate username or email
    const duplicate = db.users.find(
      (u) =>
        u.username.toLowerCase() === cleanUsername.toLowerCase() ||
        (u.email && u.email.toLowerCase() === cleanEmail)
    );

    if (duplicate) {
      return { success: false, error: 'A user with that handle or email already exists.' };
    }

    const newUser: UserRecord = {
      id: `usr_${Date.now()}`,
      username: cleanUsername,
      email: cleanEmail,
      role,
      xp: 100, // starting grant
      completedScenarios: [],
      currentMissionId: 'm1-chat',
      createdAt: new Date().toISOString(),
      salt,
      passwordHash,
      lastLoginAt: new Date().toISOString(),
      avatarColor: role === 'admin' ? '#5f8cd0' : role === 'cryptographer' ? '#d0683a' : '#2e7d32',
    };

    db.users.push(newUser);
    this.saveDb(db);
    this.setActiveUserId(newUser.id);
    this.logAction('auth', 'Account Created', `New ${role} account registered: ${cleanUsername}`, 'good');

    return { success: true, user: newUser };
  }

  public updateUser(userId: string, partial: Partial<UserRecord>): UserRecord {
    const db = this.getDb();
    const user = db.users.find((u) => u.id === userId);
    if (!user) throw new Error('User not found');

    Object.assign(user, partial);
    this.saveDb(db);
    return user;
  }

  public updateUserProgress(completedScenarioId: string, earnedXp: number): UserRecord {
    const db = this.getDb();
    const activeId = this.getActiveUserId();
    const user = db.users.find((u) => u.id === activeId) || db.users[0];

    if (!user.completedScenarios.includes(completedScenarioId)) {
      user.completedScenarios.push(completedScenarioId);
    }
    user.xp += earnedXp;
    this.saveDb(db);
    return user;
  }

  public getScenarios(): ScenarioRecord[] {
    return this.getDb().scenarios;
  }

  public getScenarioById(id: string): ScenarioRecord | undefined {
    return this.getDb().scenarios.find((s) => s.id === id);
  }

  public getLessons(): LessonRecord[] {
    return this.getDb().lessons;
  }

  public getLabBenchmarks(): LabBenchmarkRecord[] {
    return this.getDb().labBenchmarks;
  }

  public getAuditLogs(): AuditLogRecord[] {
    return this.getDb().auditLogs;
  }

  public logAction(
    scenarioId: string,
    actionType: string,
    outcome: string,
    tone: 'good' | 'warn' | 'bad'
  ): AuditLogRecord {
    const db = this.getDb();
    const newLog: AuditLogRecord = {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      scenarioId,
      actionType,
      outcome,
      tone,
    };
    db.auditLogs = [newLog, ...db.auditLogs].slice(0, 50);
    this.saveDb(db);
    return newLog;
  }

  public resetDatabase(): AppDatabaseSchema {
    this.saveDb(INITIAL_DB);
    this.setActiveUserId(INITIAL_DB.users[0].id);
    return INITIAL_DB;
  }
}

export const db = new DatabaseManager();
