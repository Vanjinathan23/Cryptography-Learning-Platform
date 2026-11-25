# Cryptography-Learning-Platform

An interactive 3D applied cryptography and cybersecurity learning platform. Master real-world ciphers, system design, and threat defenses through hands-on simulations.

## Features
- **3D Isometric Simulations**: Visualize packets, routers, and eavesdropping wire-taps.
- **Attack-First Pedagogy**: Exploit ECB mode leaks, test replay attacks, crack unsalted hashes, and verify AEAD integrity tags.
- **Tactile Workbenches**: Real-time bit-flipping, 256-bit SHA avalanche matrices, and Diffie-Hellman modulus sliders.
- **Professional Client-Side Authentication**: Web Crypto API password hashing with 128-bit salts and instant 1-Click Fast Login.
- **5 Threat Defense Scenarios & 20+ Curriculum Lessons**: Guided interactive workshops with Prof. Ada hints.

## Tech Stack
- **Framework**: React 19 + TypeScript + Vite
- **3D Graphics**: Three.js
- **Styling**: Tailwind CSS & Design System Tokens
- **Icons**: Lucide React
- **Security**: Native Web Crypto API (SHA-256, AES-GCM)

## Getting Started

### 1. Install Dependencies
```bash
npm install --legacy-peer-deps
```

### 2. Configure Environment
```bash
cp .env.example .env.local
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production
```bash
npm run build
```
