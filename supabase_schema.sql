-- ============================================================================
-- CryptoScale: Interactive Applied Cryptography Platform
-- Complete Supabase PostgreSQL Schema & Mock Data
-- Paste and Run in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- ============================================================================

-- 1. CLEANUP (Drop tables if re-running script)
DROP TABLE IF EXISTS security_audit_logs CASCADE;
DROP TABLE IF EXISTS cryptographic_benchmarks CASCADE;
DROP TABLE IF EXISTS curriculum_lessons CASCADE;
DROP TABLE IF EXISTS scenarios CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 2. TABLE DEFINITIONS
-- ============================================================================

-- Table 1: Users & Security Clearance Profiles
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'cryptographer', 'admin')),
    xp INTEGER NOT NULL DEFAULT 100 CHECK (xp >= 0),
    completed_scenarios TEXT[] DEFAULT ARRAY['m1-chat'],
    current_mission_id VARCHAR(50) DEFAULT 'm2-portal',
    salt VARCHAR(64) NOT NULL,
    password_hash VARCHAR(128) NOT NULL,
    avatar_color VARCHAR(10) DEFAULT '#2e7d32',
    last_login_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 2: Interactive Threat Defense Scenarios
CREATE TABLE scenarios (
    id VARCHAR(50) PRIMARY KEY,
    num VARCHAR(10) NOT NULL,
    title VARCHAR(100) NOT NULL,
    category VARCHAR(80) NOT NULL,
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
    estimated_minutes INTEGER NOT NULL,
    stages_count INTEGER NOT NULL,
    description TEXT NOT NULL
);

-- Table 3: Structured Curriculum Lessons
CREATE TABLE curriculum_lessons (
    id VARCHAR(50) PRIMARY KEY,
    scenario_id VARCHAR(50) REFERENCES scenarios(id) ON DELETE CASCADE,
    lesson_num INTEGER NOT NULL,
    title VARCHAR(120) NOT NULL,
    interactive_type VARCHAR(40) NOT NULL CHECK (interactive_type IN ('cipher', 'hash', 'key_exchange', 'signature', 'aead')),
    content_summary TEXT NOT NULL
);

-- Table 4: Cryptographic Workbenches & Primitive Benchmarks
CREATE TABLE cryptographic_benchmarks (
    id VARCHAR(50) PRIMARY KEY,
    workbench_name VARCHAR(80) NOT NULL,
    algorithm VARCHAR(50) NOT NULL,
    key_size_bits INTEGER NOT NULL,
    cipher_mode VARCHAR(20) NOT NULL,
    avalanche_entropy_pct NUMERIC(5, 2) NOT NULL,
    security_status VARCHAR(20) NOT NULL CHECK (security_status IN ('optimal', 'vulnerable', 'deprecated', 'secured')),
    nist_compliance_standard VARCHAR(80) NOT NULL,
    last_evaluated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 5: Security Audit Logs & Incident Timeline
CREATE TABLE security_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    scenario_id VARCHAR(50) REFERENCES scenarios(id) ON DELETE SET NULL,
    action_type VARCHAR(80) NOT NULL,
    outcome TEXT NOT NULL,
    tone VARCHAR(10) NOT NULL CHECK (tone IN ('good', 'warn', 'bad')),
    threat_level VARCHAR(20) NOT NULL CHECK (threat_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    client_ip_hash VARCHAR(64) DEFAULT '0x9a8f...b4c1',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. MOCK DATA SEEDING
-- ============================================================================

-- Seed Users
INSERT INTO users (id, username, email, role, xp, completed_scenarios, current_mission_id, salt, password_hash, avatar_color, created_at)
VALUES
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'CryptoStudent', 'student@cryptoscale.edu', 'student', 450, ARRAY['m1-chat'], 'm2-portal', '7a9f1b2c3d4e5f60', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', '#2e7d32', NOW() - INTERVAL '5 days'),
    ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Alice_SecOps', 'alice@cyberdefense.io', 'cryptographer', 1250, ARRAY['m1-chat', 'm2-portal', 'm3-bank'], 'm4-update', 'c1d2e3f405162738', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', '#d0683a', NOW() - INTERVAL '10 days'),
    ('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'Prof_Ada', 'ada@mit.edu', 'admin', 3400, ARRAY['m1-chat', 'm2-portal', 'm3-bank', 'm4-update', 'm5-vault'], 'm5-vault', '99aa88bb77cc66dd', '04f8996da763b7a969b1028ee3007569eaf3a635486ddab211d512c85b9df8fb', '#5f8cd0', NOW() - INTERVAL '30 days');

-- Seed Scenarios
INSERT INTO scenarios (id, num, title, category, difficulty, estimated_minutes, stages_count, description)
VALUES
    ('m1-chat', '01', 'Café Wi-Fi Messaging', 'Symmetric AEAD & Integrity', 'Beginner', 10, 5, 'Intercept unencrypted messages on open café Wi-Fi, inject bit flips, and verify why AES-GCM AEAD tags reject tampered packets.'),
    ('m2-portal', '02', 'Campus Portal DB Breach', 'Password Hashing & Salting', 'Intermediate', 12, 5, 'Execute rainbow table lookups on unsalted MD5/SHA-256 password dumps, and upgrade database authentication to Argon2id with 128-bit unique salts.'),
    ('m3-bank', '03', 'Airport Wi-Fi Banking', 'TLS Handshake & Forward Secrecy', 'Intermediate', 15, 5, 'Detect Evil-Twin rogue hotspot SSL certificate spoofing, enforce Trusted Root Certificate Authorities, and simulate an ECDHE Diffie-Hellman key exchange.'),
    ('m4-update', '04', 'Software Update Hijack', 'SHA-256 Avalanche & Code Signing', 'Advanced', 15, 5, 'Witness how changing a single byte in a payload flips 50% of SHA-256 hash bits (the avalanche effect), and defend automated CDN updates using Ed25519 digital signatures.'),
    ('m5-vault', '05', 'Cloud Vault & Tap-to-Pay', 'AEAD Nonces & Replay Protection', 'Advanced', 18, 5, 'Expose electronic codebook (ECB) image silhouette leaks, enforce isolated Hardware Security Modules (KMS), and prevent contactless NFC payment replay attacks.');

-- Seed Lessons
INSERT INTO curriculum_lessons (id, scenario_id, lesson_num, title, interactive_type, content_summary)
VALUES
    ('l1_01', 'm1-chat', 1, 'Cleartext Packet Inspection', 'cipher', 'Exposing UTF-8 credentials traveling over unencrypted public Wi-Fi access points.'),
    ('l1_02', 'm1-chat', 2, 'Bit-Flipping on Stream Ciphers', 'cipher', 'Flipping ciphertext bits in flight without knowing the private decryption key.'),
    ('l1_03', 'm1-chat', 3, 'AEAD Authentication Tag Verification', 'aead', 'Verifying message integrity using Galois/Counter Mode (GCM) 128-bit MAC tags.'),
    ('l2_01', 'm2-portal', 1, 'Rainbow Table Collision Attack', 'hash', 'Cracking identical unsalted password hashes within milliseconds using precomputed lookup tables.'),
    ('l2_02', 'm2-portal', 2, 'Salt Injection & Argon2id Defense', 'hash', 'Salting passwords with unique pseudo-random nonces to neutralize lookup dictionaries.'),
    ('l3_01', 'm3-bank', 1, 'Rogue CA Certificate Forgery', 'key_exchange', 'Analyzing fake self-signed SSL/TLS certificates injected by local network adversaries.'),
    ('l3_02', 'm3-bank', 2, 'Diffie-Hellman Ephemeral Key Exchange', 'key_exchange', 'Calculating discrete log shared secrets over public wires to guarantee Perfect Forward Secrecy (PFS).'),
    ('l4_01', 'm4-update', 1, '256-Bit SHA Avalanche Matrix', 'signature', 'Visualizing bit-level cascade entropy when a single bit is modified in binary code.'),
    ('l4_02', 'm4-update', 2, 'Asymmetric Ed25519 Code Signing', 'signature', 'Validating digital signatures with public keys to block man-in-the-middle CDN update hijacks.');

-- Seed Cryptographic Benchmarks
INSERT INTO cryptographic_benchmarks (id, workbench_name, algorithm, key_size_bits, cipher_mode, avalanche_entropy_pct, security_status, nist_compliance_standard)
VALUES
    ('bench_01', 'Wire Transmission Lab', 'AES-256-GCM', 256, 'GCM (AEAD)', 50.12, 'optimal', 'NIST SP 800-38D (Approved)'),
    ('bench_02', 'Pattern Leakage Lab', 'AES-128-ECB', 128, 'ECB (Vulnerable)', 12.45, 'vulnerable', 'NIST Deprecated for Multi-block Payloads'),
    ('bench_03', 'Integrity Avalanche Lab', 'SHA-256', 256, 'Digest', 50.04, 'optimal', 'FIPS 180-4 Secure Hash Standard'),
    ('bench_04', 'Asymmetric Key Exchange', 'ECDHE (Curve25519)', 256, 'Asymmetric', 49.98, 'secured', 'RFC 7748 / NIST SP 800-56A'),
    ('bench_05', 'Password Storage Lab', 'Argon2id (m=64MB, t=3, p=4)', 256, 'KDF', 50.20, 'optimal', 'RFC 9106 / OWASP Recommended');

-- Seed Security Audit Logs
INSERT INTO security_audit_logs (user_id, scenario_id, action_type, outcome, tone, threat_level, client_ip_hash, created_at)
VALUES
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'm1-chat', 'Wire Tap Injection', 'Attacker flipped bit 0x03 in ciphertext; AEAD tag mismatch rejected transmission', 'good', 'MEDIUM', '0x7e81...2a4f', NOW() - INTERVAL '15 minutes'),
    ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'm2-portal', 'Rainbow Table Attack Simulation', 'Unsalted MD5 database crack simulated successfully in 120ms', 'warn', 'HIGH', '0x3c99...88fe', NOW() - INTERVAL '1 hour'),
    ('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'm3-bank', 'Certificate Chain Verification', 'Untrusted root certificate rejected by TLS 1.3 client engine', 'good', 'CRITICAL', '0x99aa...b421', NOW() - INTERVAL '3 hours'),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'm4-update', 'Payload Tamper Check', '1-byte binary modification detected via SHA-256 avalanche checksum failure', 'good', 'HIGH', '0x7e81...2a4f', NOW() - INTERVAL '6 hours');

-- ============================================================================
-- 4. VERIFICATION QUERY (Displays summary of created tables)
-- ============================================================================
SELECT 
    'users' AS table_name, COUNT(*) AS record_count FROM users
UNION ALL
SELECT 
    'scenarios', COUNT(*) FROM scenarios
UNION ALL
SELECT 
    'curriculum_lessons', COUNT(*) FROM curriculum_lessons
UNION ALL
SELECT 
    'cryptographic_benchmarks', COUNT(*) FROM cryptographic_benchmarks
UNION ALL
SELECT 
    'security_audit_logs', COUNT(*) FROM security_audit_logs;
