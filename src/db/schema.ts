export interface UserRecord {
  id: string;
  username: string;
  email?: string;
  role: 'student' | 'cryptographer' | 'admin';
  xp: number;
  completedScenarios: string[];
  currentMissionId: string;
  createdAt: string;
  passwordHash?: string;
  salt?: string;
  lastLoginAt?: string;
  avatarColor?: string;
}

export interface ScenarioRecord {
  id: string;
  num: string;
  title: string;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedMinutes: number;
  stagesCount: number;
  description: string;
}

export interface LessonRecord {
  id: string;
  scenarioId: string;
  lessonNum: number;
  title: string;
  contentSummary: string;
  interactiveType: 'cipher' | 'hash' | 'key_exchange' | 'signature' | 'aead';
}

export interface LabBenchmarkRecord {
  id: string;
  workbenchName: string;
  algorithm: string;
  defaultKey: string;
  status: 'optimal' | 'vulnerable' | 'secured';
  lastRunAt: string;
}

export interface AuditLogRecord {
  id: number;
  timestamp: string;
  scenarioId: string;
  actionType: string;
  outcome: string;
  tone: 'good' | 'warn' | 'bad';
}

export interface AppDatabaseSchema {
  users: UserRecord[];
  scenarios: ScenarioRecord[];
  lessons: LessonRecord[];
  labBenchmarks: LabBenchmarkRecord[];
  auditLogs: AuditLogRecord[];
}
