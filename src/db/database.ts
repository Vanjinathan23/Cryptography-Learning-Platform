import initSqlJs, { Database as SqliteDatabase, BindParams, SqlValue } from 'sql.js';
import {
  AppDatabaseSchema,
  UserRecord,
  ScenarioRecord,
  LessonRecord,
  LabBenchmarkRecord,
  AuditLogRecord,
} from './schema';

const STORAGE_KEY = 'cryptoscale_sqlite_bin_v1';
const ACTIVE_USER_KEY = 'cryptoscale_active_user_v2';

const INITIAL_USER: UserRecord = {
  id: 'usr_student_01',
  username: 'CryptoStudent',
  email: 'student@cryptoscale.edu',
  role: 'student',
  xp: 450,
  completedScenarios: ['m1-chat'],
  currentMissionId: 'm2-portal',
  createdAt: '2026-11-20T10:00:00Z',
  salt: '7a9f1b2c3d4e5f60',
  passwordHash: 'cc1cd6672771caa512ef3cc57ffa6d0087287caa3dd2a853e8b58c661a4db2c6',
  lastLoginAt: '2026-11-25T08:00:00Z',
  avatarColor: '#2e7d32',
};

const INITIAL_SCENARIOS: ScenarioRecord[] = [
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
];

class SqliteDatabaseManager {
  private sqliteDb: SqliteDatabase | null = null;
  private isReady = false;
  private initPromise: Promise<void> | null = null;

  // Synchronous fallback cache to guarantee immediate rendering during first tick
  private userCache: UserRecord = INITIAL_USER;
  private scenariosCache: ScenarioRecord[] = INITIAL_SCENARIOS;
  private auditLogsCache: AuditLogRecord[] = [
    {
      id: 1,
      timestamp: new Date().toLocaleTimeString(),
      scenarioId: 'm1-chat',
      actionType: 'Database Initialization',
      outcome: 'SQLite WASM database initialized successfully with relational tables',
      tone: 'good',
    },
  ];

  constructor() {
    this.initPromise = this.initSqlite();
  }

  private async initSqlite(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const SQL = await initSqlJs({
        locateFile: (file) => `/${file}`,
      });

      // Check if existing SQLite binary is saved in localStorage
      const savedBase64 = localStorage.getItem(STORAGE_KEY);
      if (savedBase64) {
        try {
          const binaryStr = atob(savedBase64);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          this.sqliteDb = new SQL.Database(bytes);
        } catch {
          this.sqliteDb = new SQL.Database();
        }
      } else {
        this.sqliteDb = new SQL.Database();
      }

      this.createTables();
      this.syncCachesFromSql();
      this.isReady = true;
      console.log('⚡ [CryptoScale SQLite WASM] Relational database loaded and ready.');
    } catch (err) {
      console.warn('SQLite WASM initialization fallback to memory store:', err);
    }
  }

  // Real SQL DDL (Schema Creation)
  private createTables(): void {
    if (!this.sqliteDb) return;

    this.sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT,
        role TEXT NOT NULL DEFAULT 'student',
        xp INTEGER NOT NULL DEFAULT 450,
        completed_scenarios TEXT NOT NULL DEFAULT '["m1-chat"]',
        current_mission_id TEXT NOT NULL DEFAULT 'm2-portal',
        created_at TEXT NOT NULL,
        salt TEXT,
        password_hash TEXT,
        last_login_at TEXT,
        avatar_color TEXT
      );

      CREATE TABLE IF NOT EXISTS scenarios (
        id TEXT PRIMARY KEY,
        num TEXT NOT NULL,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        difficulty TEXT NOT NULL,
        estimated_minutes INTEGER NOT NULL,
        stages_count INTEGER NOT NULL,
        description TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        scenario_id TEXT NOT NULL,
        action_type TEXT NOT NULL,
        outcome TEXT NOT NULL,
        tone TEXT NOT NULL
      );
    `);

    // Seed users table if empty
    const checkUser = this.sqliteDb.exec('SELECT COUNT(*) as count FROM users');
    const userCount = checkUser[0]?.values[0]?.[0] as number;
    if (!userCount || userCount === 0) {
      this.sqliteDb.run(
        `INSERT INTO users (
          id, username, email, role, xp, completed_scenarios, current_mission_id, created_at, salt, password_hash, last_login_at, avatar_color
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          INITIAL_USER.id,
          INITIAL_USER.username,
          INITIAL_USER.email || '',
          INITIAL_USER.role,
          INITIAL_USER.xp,
          JSON.stringify(INITIAL_USER.completedScenarios),
          INITIAL_USER.currentMissionId,
          INITIAL_USER.createdAt,
          INITIAL_USER.salt || '',
          INITIAL_USER.passwordHash || '',
          INITIAL_USER.lastLoginAt || '',
          INITIAL_USER.avatarColor || '#2e7d32',
        ]
      );
    }

    // Seed scenarios table if empty
    const checkScenarios = this.sqliteDb.exec('SELECT COUNT(*) as count FROM scenarios');
    const scenarioCount = checkScenarios[0]?.values[0]?.[0] as number;
    if (!scenarioCount || scenarioCount === 0) {
      for (const s of INITIAL_SCENARIOS) {
        this.sqliteDb.run(
          `INSERT INTO scenarios (
            id, num, title, category, difficulty, estimated_minutes, stages_count, description
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [s.id, s.num, s.title, s.category, s.difficulty, s.estimatedMinutes, s.stagesCount, s.description]
        );
      }
    }

    this.persistSqlite();
  }

  // Persists SQLite binary database to localStorage
  private persistSqlite(): void {
    if (!this.sqliteDb || typeof window === 'undefined') return;
    try {
      const data = this.sqliteDb.export();
      let binaryStr = '';
      for (let i = 0; i < data.length; i++) {
        binaryStr += String.fromCharCode(data[i]);
      }
      localStorage.setItem(STORAGE_KEY, btoa(binaryStr));
    } catch (err) {
      console.error('Failed to persist SQLite binary:', err);
    }
  }

  // Syncs in-memory React caches from SQLite tables
  private syncCachesFromSql(): void {
    if (!this.sqliteDb) return;

    try {
      const activeId = this.getActiveUserId();
      const userRes = this.sqliteDb.exec(`
        SELECT id, username, email, role, xp, completed_scenarios, current_mission_id, created_at, salt, password_hash, last_login_at, avatar_color
        FROM users WHERE id = '${activeId}' LIMIT 1
      `);

      if (userRes[0]?.values[0]) {
        const v = userRes[0].values[0];
        this.userCache = {
          id: String(v[0]),
          username: String(v[1]),
          email: String(v[2]),
          role: v[3] as 'student' | 'cryptographer' | 'admin',
          xp: Number(v[4]),
          completedScenarios: JSON.parse(String(v[5] || '[]')),
          currentMissionId: String(v[6]),
          createdAt: String(v[7]),
          salt: String(v[8]),
          passwordHash: String(v[9]),
          lastLoginAt: String(v[10]),
          avatarColor: String(v[11]),
        };
      }

      // Sync scenarios
      const scenRes = this.sqliteDb.exec(`
        SELECT id, num, title, category, difficulty, estimated_minutes, stages_count, description
        FROM scenarios ORDER BY num ASC
      `);

      if (scenRes[0]?.values) {
        this.scenariosCache = scenRes[0].values.map((v) => ({
          id: String(v[0]),
          num: String(v[1]),
          title: String(v[2]),
          category: String(v[3]),
          difficulty: v[4] as 'Beginner' | 'Intermediate' | 'Advanced',
          estimatedMinutes: Number(v[5]),
          stagesCount: Number(v[6]),
          description: String(v[7]),
        }));
      }

      // Sync audit logs
      const logRes = this.sqliteDb.exec(`
        SELECT id, timestamp, scenario_id, action_type, outcome, tone
        FROM audit_logs ORDER BY id DESC LIMIT 50
      `);

      if (logRes[0]?.values) {
        this.auditLogsCache = logRes[0].values.map((v) => ({
          id: Number(v[0]),
          timestamp: String(v[1]),
          scenarioId: String(v[2]),
          actionType: String(v[3]),
          outcome: String(v[4]),
          tone: v[5] as 'good' | 'warn' | 'bad',
        }));
      }
    } catch (e) {
      console.warn('Error reading SQLite tables:', e);
    }
  }

  // Execute arbitrary raw SQL query and return objects
  public runSqlQuery<T = Record<string, unknown>>(query: string, params: SqlValue[] = []): T[] {
    if (!this.sqliteDb) {
      console.warn('SQLite not yet mounted; using memory cache.');
      return [];
    }

    try {
      const res = this.sqliteDb.exec(query, params as BindParams);
      if (!res[0]) return [];
      const { columns, values } = res[0];
      return values.map((row) => {
        const obj: Record<string, unknown> = {};
        columns.forEach((col, idx) => {
          obj[col] = row[idx];
        });
        return obj as T;
      });
    } catch (err) {
      console.error('SQL Execution Error:', err);
      return [];
    }
  }

  public getActiveUserId(): string {
    if (typeof window === 'undefined') return INITIAL_USER.id;
    return localStorage.getItem(ACTIVE_USER_KEY) || INITIAL_USER.id;
  }

  public setActiveUserId(userId: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ACTIVE_USER_KEY, userId);
    this.syncCachesFromSql();
  }

  // SQL Query: SELECT * FROM users WHERE id = ?
  public getUser(): UserRecord {
    if (this.sqliteDb) {
      this.syncCachesFromSql();
    }
    return this.userCache;
  }

  public getUsers(): UserRecord[] {
    if (!this.sqliteDb) return [this.userCache];
    const rows = this.runSqlQuery<{
      id: string;
      username: string;
      email: string;
      role: 'student' | 'cryptographer' | 'admin';
      xp: number;
      completed_scenarios: string;
      current_mission_id: string;
      created_at: string;
      salt: string;
      password_hash: string;
      last_login_at: string;
      avatar_color: string;
    }>('SELECT * FROM users ORDER BY created_at ASC');

    return rows.map((r) => ({
      id: r.id,
      username: r.username,
      email: r.email,
      role: r.role,
      xp: Number(r.xp),
      completedScenarios: JSON.parse(r.completed_scenarios || '[]'),
      currentMissionId: r.current_mission_id,
      createdAt: r.created_at,
      salt: r.salt,
      passwordHash: r.password_hash,
      lastLoginAt: r.last_login_at,
      avatarColor: r.avatar_color,
    }));
  }

  // SQL Query: SELECT * FROM users WHERE LOWER(username) = ? OR LOWER(email) = ?
  public authenticate(
    usernameOrEmail: string,
    passwordHash?: string
  ): { success: boolean; user?: UserRecord; error?: string } {
    const clean = usernameOrEmail.trim().toLowerCase();

    if (this.sqliteDb) {
      const rows = this.runSqlQuery<{
        id: string;
        username: string;
        email: string;
        role: 'student' | 'cryptographer' | 'admin';
        xp: number;
        completed_scenarios: string;
        current_mission_id: string;
        created_at: string;
        salt: string;
        password_hash: string;
        last_login_at: string;
        avatar_color: string;
      }>('SELECT * FROM users WHERE LOWER(username) = ? OR LOWER(email) = ? LIMIT 1', [clean, clean]);

      if (rows.length > 0) {
        const r = rows[0];
        const user: UserRecord = {
          id: r.id,
          username: r.username,
          email: r.email,
          role: r.role,
          xp: Number(r.xp),
          completedScenarios: JSON.parse(r.completed_scenarios || '[]'),
          currentMissionId: r.current_mission_id,
          createdAt: r.created_at,
          salt: r.salt,
          passwordHash: r.password_hash,
          lastLoginAt: new Date().toISOString(),
          avatarColor: r.avatar_color,
        };

        // SQL UPDATE last_login_at
        this.sqliteDb.run('UPDATE users SET last_login_at = ? WHERE id = ?', [user.lastLoginAt || '', user.id]);
        this.persistSqlite();
        this.setActiveUserId(user.id);
        this.logAction('auth', 'SQL Authenticated', `User ${user.username} authenticated via SQLite`, 'good');
        return { success: true, user };
      }
    }

    // Fallback check against memory cache
    if (this.userCache.username.toLowerCase() === clean || this.userCache.email?.toLowerCase() === clean) {
      this.setActiveUserId(this.userCache.id);
      return { success: true, user: this.userCache };
    }

    return { success: false, error: 'User not found in SQLite database.' };
  }

  // SQL Query: INSERT INTO users VALUES (...)
  public register(
    username: string,
    email: string,
    passwordHash: string,
    salt: string,
    role: 'student' | 'cryptographer' | 'admin' = 'student'
  ): { success: boolean; user?: UserRecord; error?: string } {
    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();
    const newId = `usr_${Date.now()}`;
    const now = new Date().toISOString();

    if (this.sqliteDb) {
      // Check duplicate
      const existing = this.runSqlQuery('SELECT id FROM users WHERE LOWER(username) = ? OR LOWER(email) = ? LIMIT 1', [
        cleanUsername.toLowerCase(),
        cleanEmail,
      ]);

      if (existing.length > 0) {
        return { success: false, error: 'A user with that handle or email already exists in SQLite.' };
      }

      this.sqliteDb.run(
        `INSERT INTO users (
          id, username, email, role, xp, completed_scenarios, current_mission_id, created_at, salt, password_hash, last_login_at, avatar_color
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newId,
          cleanUsername,
          cleanEmail,
          role,
          100,
          JSON.stringify([]),
          'm1-chat',
          now,
          salt,
          passwordHash,
          now,
          '#2e7d32',
        ]
      );

      this.persistSqlite();
    }

    const newUser: UserRecord = {
      id: newId,
      username: cleanUsername,
      email: cleanEmail,
      role,
      xp: 100,
      completedScenarios: [],
      currentMissionId: 'm1-chat',
      createdAt: now,
      salt,
      passwordHash,
      lastLoginAt: now,
      avatarColor: '#2e7d32',
    };

    this.userCache = newUser;
    this.setActiveUserId(newId);
    this.logAction('auth', 'SQL User Inserted', `New user registered into SQLite: ${cleanUsername}`, 'good');

    return { success: true, user: newUser };
  }

  // SQL Query: UPDATE users SET xp = xp + ?, completed_scenarios = ? WHERE id = ?
  public updateUserProgress(completedScenarioId: string, earnedXp: number): UserRecord {
    const activeUser = this.getUser();
    const completed = new Set(activeUser.completedScenarios);
    completed.add(completedScenarioId);
    const newScenarios = Array.from(completed);
    const newXp = activeUser.xp + earnedXp;

    if (this.sqliteDb) {
      this.sqliteDb.run('UPDATE users SET xp = ?, completed_scenarios = ? WHERE id = ?', [
        newXp,
        JSON.stringify(newScenarios),
        activeUser.id,
      ]);
      this.persistSqlite();
    }

    activeUser.xp = newXp;
    activeUser.completedScenarios = newScenarios;
    this.userCache = { ...activeUser };
    return this.userCache;
  }

  // SQL Query: SELECT * FROM scenarios ORDER BY num ASC
  public getScenarios(): ScenarioRecord[] {
    if (this.sqliteDb) {
      this.syncCachesFromSql();
    }
    return this.scenariosCache;
  }

  // SQL Query: SELECT * FROM audit_logs ORDER BY id DESC LIMIT 50
  public getAuditLogs(): AuditLogRecord[] {
    if (this.sqliteDb) {
      this.syncCachesFromSql();
    }
    return this.auditLogsCache;
  }

  // SQL Query: INSERT INTO audit_logs VALUES (...)
  public logAction(
    scenarioId: string,
    actionType: string,
    outcome: string,
    tone: 'good' | 'warn' | 'bad'
  ): AuditLogRecord {
    const now = new Date().toLocaleTimeString();

    if (this.sqliteDb) {
      this.sqliteDb.run(
        'INSERT INTO audit_logs (timestamp, scenario_id, action_type, outcome, tone) VALUES (?, ?, ?, ?, ?)',
        [now, scenarioId, actionType, outcome, tone]
      );
      this.persistSqlite();
    }

    const newLog: AuditLogRecord = {
      id: Date.now(),
      timestamp: now,
      scenarioId,
      actionType,
      outcome,
      tone,
    };

    this.auditLogsCache = [newLog, ...this.auditLogsCache].slice(0, 50);
    return newLog;
  }

  public resetDatabase(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(ACTIVE_USER_KEY);
    }
    if (this.sqliteDb) {
      this.sqliteDb.run('DROP TABLE IF EXISTS users; DROP TABLE IF EXISTS scenarios; DROP TABLE IF EXISTS audit_logs;');
      this.createTables();
    }
    this.userCache = INITIAL_USER;
    this.scenariosCache = INITIAL_SCENARIOS;
    console.log('⚡ [CryptoScale SQLite] Database reset to baseline schema.');
  }
}

export const db = new SqliteDatabaseManager();
