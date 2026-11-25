export default function CheatsheetsView() {
  return (
    <div className="cheats-wrap">
      <div className="lesson-head">
        <div className="crumb">
          Quick Reference <span>/</span> 5 Real-World Cryptography Scenarios
        </div>
        <div className="lesson-head__row">
          <h1 className="title">Cryptography Cheatsheets</h1>
          <div className="tags">
            <span className="tag tag--sand">5 Distinct Scenarios</span>
            <span className="tag tag--violet">20 Interactive Lessons</span>
          </div>
        </div>
        <p className="subtitle">
          Side-by-side reference covering all five real-world scenarios: Private Messaging, Portal Password Security, Airport HTTPS Banking, Signed Software Updates, and Cloud Vault / Payments.
        </p>
      </div>

      <div className="cheats-grid">
        <section className="card cheats-card">
          <div className="eyebrow">01 · Algorithm Families</div>
          <h2>Symmetric vs. Asymmetric vs. Hashing</h2>
          <table className="compare">
            <thead>
              <tr>
                <th>Family</th>
                <th>Key Model</th>
                <th>Examples</th>
                <th>Used In</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><b>Symmetric (AEAD)</b></td>
                <td>1 shared secret key</td>
                <td>AES-256-GCM, ChaCha20</td>
                <td>Scenario 01 Chat · Scenario 03 TLS · Scenario 05 Vault</td>
              </tr>
              <tr>
                <td><b>Asymmetric (PKI)</b></td>
                <td>Public + Private pair</td>
                <td>ECDHE, Ed25519, RSA-2048</td>
                <td>Scenario 03 Banking · Scenario 04 Software Updates</td>
              </tr>
              <tr>
                <td><b>Cryptographic Hash</b></td>
                <td>No key (one-way)</td>
                <td>SHA-256, SHA-3, BLAKE3</td>
                <td>Scenario 04 File Fingerprints &amp; Avalanche Check</td>
              </tr>
              <tr>
                <td><b>Password KDF</b></td>
                <td>Password + Random Salt</td>
                <td>Argon2id, bcrypt, scrypt</td>
                <td>Scenario 02 University Portal Password Storage</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="card cheats-card">
          <div className="eyebrow">02 · The 5 Real-World Scenarios</div>
          <h2>What Each Simulation Teaches</h2>
          <table className="compare">
            <thead>
              <tr>
                <th>Scenario</th>
                <th>Real-World Story</th>
                <th>Primary Defense</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><b>01. Alice to Bob</b></td>
                <td>Private message over public internet</td>
                <td>AES-256-GCM + IP Routing + Auth Tag</td>
              </tr>
              <tr>
                <td><b>02. Portal Breach</b></td>
                <td>Campus login &amp; stolen Users SQL DB</td>
                <td>One-Way Hashing + Unique Salt + Argon2id</td>
              </tr>
              <tr>
                <td><b>03. Airport Bank</b></td>
                <td>HTTPS banking on rogue airport Wi-Fi</td>
                <td>X.509 Certificates + ECDHE + TLS 1.3</td>
              </tr>
              <tr>
                <td><b>04. OS Update</b></td>
                <td>Downloading 400 MB patch from public CDN</td>
                <td>SHA-256 Avalanche + Ed25519 Signatures</td>
              </tr>
              <tr>
                <td><b>05. Vault &amp; Pay</b></td>
                <td>Hospital X-rays &amp; $200 mobile payment</td>
                <td>GCM Mode + Hardware KMS + Nonce Ledger</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="card cheats-card cheats-card--wide">
          <div className="eyebrow">03 · Threat-to-Defense Matrix</div>
          <h2>Every Cyberattack &amp; Its Cryptographic Countermeasure</h2>
          <table className="compare">
            <thead>
              <tr>
                <th>Cyberattack</th>
                <th>Scenario</th>
                <th>What Fails</th>
                <th>Cryptographic Defense</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><b>Café Wi-Fi Sniffing (Eve)</b></td>
                <td>01 · Alice to Bob</td>
                <td>Plain HTTP / Base64</td>
                <td>AES-256-GCM encryption before leaving device</td>
              </tr>
              <tr>
                <td><b>Active Bit Tampering</b></td>
                <td>01 · Alice to Bob</td>
                <td>Unauthenticated ciphers</td>
                <td>128-bit AEAD Authentication Tag (GCM / HMAC)</td>
              </tr>
              <tr>
                <td><b>Database Rainbow Table</b></td>
                <td>02 · Portal Breach</td>
                <td>Plaintext or unsalted SHA-256</td>
                <td>Unique per-user Salt + memory-hard Argon2id</td>
              </tr>
              <tr>
                <td><b>Evil-Twin Fake Hotspot (MITM)</b></td>
                <td>03 · Airport Bank</td>
                <td>Unauthenticated Diffie-Hellman</td>
                <td>CA-Signed X.509 Certificates + TLS 1.3 verification</td>
              </tr>
              <tr>
                <td><b>Supply-Chain CDN Trojan</b></td>
                <td>04 · OS Update</td>
                <td>Unsigned download / plain mirror hash</td>
                <td>Ed25519 Digital Signature verified with Public Key</td>
              </tr>
              <tr>
                <td><b>X-Ray Pattern &amp; Disk Theft</b></td>
                <td>05 · Cloud Vault</td>
                <td>AES-ECB mode &amp; key stored with data</td>
                <td>AES-256-GCM + Envelope Encryption in Hardware KMS</td>
              </tr>
              <tr>
                <td><b>Payment Replay &amp; Brute-Force</b></td>
                <td>05 · Smart Pay</td>
                <td>Stateless decryption / small key space</td>
                <td>One-Time Nonce Ledger + 256-bit key space (2²⁵⁶)</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
