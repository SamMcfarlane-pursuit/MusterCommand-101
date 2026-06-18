# MusterCommand — User Guide

A digital life-safety / evacuation-accountability system for a single office floor
(pilot: **ConEdison Floor 7, 4 Irving Plaza, NYC**). During a drill or real evacuation
it answers one question fast: **who is on the floor, where are they, and who still
needs help?** — backed by an offline-capable, cryptographically-audited headcount.

Regulatory frameworks: **NYC Local Law 26 (RS-17)** and **OSHA 29 CFR 1910.38**.

---

## 1. Run it

> Use **`npm run dev`** — it starts an Express server that serves **both** the app
> **and** the `/api/...` endpoints on one port. Do **not** use plain `vite`; that
> would not serve `/api/vault/decrypt`, so login would fail and the app would look
> like it "won't load."

```bash
cd MusterCommand-101
npm install        # first time only
npm run dev
```

Wait for:

```
  MusterCommand (Life-Safety OS) is running.
  ▶ Open your browser at:  http://localhost:3000
```

Then open **http://localhost:3000**.

- Port in use? Start on another port: `PORT=3001 npm run dev` → open `http://localhost:3001`.
- Free a stuck instance: `pkill -f "tsx server.ts"`.

Production build / serve:

```bash
npm run build
npm start
```

Typecheck only: `npm run lint`.

---

## 2. Log in

The gateway accepts three methods:

- **Quick Demo Access cards** — Fire Safety Director / Floor Warden / Standard Occupant.
- **Manual Vault Token** entry.
- **Biometric** (WebAuthn) — only if your device/browser supports it.

| Token | Person | Auto-routes to |
|-------|--------|----------------|
| `usr_d4e3f2a1` | Marcus Lee — F-89 Fire Safety Director | Command Deck |
| `usr_a7f8c9d1` | Jane Doe — F-58 Floor Warden (NW) | Warden Tablet |
| `usr_b3c7d6e5` | Alice Smith — Occupant (NE Legal) | Occupant phone |

After login you can switch to **any** view from the top toolbar (Split Grid /
Occupant Handheld / Warden Tablet / Command Deck). It's a multi-perspective demo.

---

## 3. How it works (architecture)

| Layer | Tech | Role |
|-------|------|------|
| Frontend | React 19 + Vite + Tailwind 4 | The 3 dashboards |
| Server | Express via `tsx server.ts` (port 3000) | Vault decryption + ledger verify API |
| Data | `src/data.ts` | 300-person roster (12 scripted + 288 generated) + seed ledger |

Four core mechanisms:

1. **Tokenization at rest** — the roster stores only masked names (`A•••• S••••`).
   Real PII lives in the server "Vault" and is revealed only via **Just-In-Time (JIT)
   decryption** when an authorized Warden/FSD clicks a person. On the Warden tablet the
   decrypted profile **auto-wipes from RAM after 5 seconds**.
   - `POST /api/vault/decrypt` with `{ token, requesterId }`. Only `fsd_admin` and
     `warden_NW` pass RBAC; unknown/out-of-range tokens return **404**.
2. **Hash-chained ledger** — every status change is a block
   `SHA-256(index + timestamp + event + prevHash)`, each linked to the previous hash.
   The client re-verifies the whole chain on every change, so tampering is detected
   instantly. (`POST /api/ledger/verify`.)
3. **Offline BLE-mesh ("Blackout")** — when the network drops, updates are HMAC-signed
   and queued locally, then auto-synced into the ledger when connectivity returns.
4. **OSHA telemetry** — fall detection, Area of Rescue Assistance (ARA) staging for
   mobility-impaired people, and drill-participation tracking.

Statuses (color-coded everywhere): `ACCOUNTED` (green), `MISSING` (gray),
`MEDICAL` (red), `ARA_STAGING` (blue).

---

## 4. The three views

### A. Occupant Handheld (phone) 📱
- ONLINE/OFFLINE indicator + big **Your Status** banner.
- **Evacuation Order** banner — the live FSD directive (+ a red Stair-B-blocked warning).
- **🚨 EMERGENCY** panic button (always visible).
- **Check In / My QR Pass** toggle:
  - *Check In:* **I'M SAFE**, **♿ NEED ASSISTANCE** (mobility-impaired only),
    **I Need Medical Help**, optional badge/notes, muster-zone selector, and an
    **OSHA fall-sensor** simulator.
  - *My QR Pass:* a dynamic muster QR pass to present to a Warden scanner.

### B. Warden Tablet 📟
- **SOS banner** (auto-appears on a fall/panic) with **LOCATE & UNSEAL**.
- **FDNY Directive** banner with ACK & RUN / CONFIRM CLEAR.
- **Scanner:** RFID keypad (prefix + digits + ENTER) or QR reader; valid scans mark
  ACCOUNTED and JIT-decrypt the person (5-second RAM auto-wipe + NULLIFY RAM).
- **Interactive Roster Ledger:** search, MISSING/ACCOUNTED tabs, click to decrypt,
  **ATTEST QUADRANT SAFE**, **NOTIFY HOST**.

### C. Command Station Deck (FSD) 🖥️
- Incident clock, **BLOCK STAIR B**, **DECLARE CLEAR**.
- **ARA evac-chair priority board** (clickable to unseal).
- **Situation & Checklist** + **F-89 Directive Dispatcher** (presets + custom).
- **Interactive Floor Map** (click quadrant to filter, click occupant to unseal,
  toggle Stair B).
- **Headcount & Locator** (search / tabs / sector pills / pagination / JIT unseal) +
  **GENERATE PRE-ARRIVAL FDNY REPORT**.
- **Hash-Chained Audit Ledger** with **SIMULATE LEDGER ATTACK** / **SECURE RESYNC**.

---

## 5. 5-minute demo script

1. **Log in as Occupant** (Alice). Read the evacuation-order banner → tap **My QR Pass**
   to show the muster pass → switch back to **Check In** and tap **I'M SAFE** → toggle
   the **Fall Sensor** to fire a critical alert.
2. Switch to **Split Grid** and watch Alice's status propagate to the Warden and FSD
   panels in real time.
3. **Warden Tablet** — see the SOS banner from the fall, hit **LOCATE & UNSEAL** (watch
   the 5-second RAM auto-wipe), scan badge **`NW112233`** (keypad: `NW` then `112233`,
   ENTER), then **ATTEST QUADRANT SAFE**.
4. **Command Deck** — dispatch the **"Whole Floor Evacuation"** preset (it appears on the
   phone instantly), toggle **BLOCK STAIR B** (red warning hits the phone), click a
   quadrant then an occupant on the map to unseal (card shows in the Locator panel),
   then **GENERATE FDNY REPORT**.
5. **Trigger Blackout** in the header — update a status offline (it queues with HMAC),
   then turn blackout off and watch the mesh queue auto-sync into the ledger.
6. **SIMULATE LEDGER ATTACK** → integrity flips to **TAMPERED** → **SECURE RESYNC** to
   restore **INTEGRITY 100% PASS**. Finish with **DECLARE CLEAR**.

---

## 6. Troubleshooting

| Symptom | Cause / fix |
|--------|-------------|
| Connection refused / page won't open | The `npm run dev` terminal isn't running. Start it and keep it open. |
| Loads but login fails / stuck on sign-in | You started plain `vite` (port 5173) which doesn't serve `/api/...`. Use `npm run dev` on port 3000. |
| Blank white page | Open DevTools → Console; check for a red error. |
| `EADDRINUSE` port 3000 | `pkill -f "tsx server.ts"` then `npm run dev`, or `PORT=3001 npm run dev`. |
| Avatars don't load for generated occupants | They use a remote avatar service; needs internet. Identity text still resolves. |
