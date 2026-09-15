# LinkDesk 0.1

Consent-based remote screen control for Windows, macOS and Android, with a separate iOS PWA controller. Preview release; see the honest support matrix in `web/guide.html`.

## Build

Node 24: `npm ci`, `npm run build:web`, `npm test`, `npm run dist:win`. macOS runner: `npm run dist:mac`. Mac binaries are ad-hoc/unsigned and not notarized. Do not disable system protections globally.

Android: JDK 21, Android SDK 35, Gradle 8.14.3. Set `ANDROID_HOME`, `LINKDESK_KEYSTORE`, `LINKDESK_STORE_PASSWORD`, `LINKDESK_KEY_PASSWORD`; run `gradle -p android assembleRelease`. Preserve the signing key to publish compatible updates. Never commit it. The APK includes Android TV launcher support.

`npm run build:web` creates `dist/site` and `dist/ios`. Deploy each as a static Vercel project. URLs live in `web/config.js`. Source is kept in GitHub; release assets carry SHA-256 checksums.

## Server

Apply `server/schema.sql` to Supabase. Deploy `server/index.ts` as the `linkdesk` Edge Function with `verify_jwt=false`: this endpoint implements its own session capability authentication (random host/guest tokens, hashed server-side, separate from encryption keys), rate limiting and one-controller locking. It deliberately requires no Supabase user account. Only the service role can read/write tables; no anon/authenticated grants or permissive RLS policies. Existing project tables are untouched.

Registration is public but limited to 15 sessions/IP/hour and 500 live rooms overall. There is a one-hour session expiry and a 20-second native watchdog. External provider rate/egress limits still apply. For high-volume production, replace database frame relay with a dedicated TURN/media server, add CAPTCHA at registration and scheduled retention cleanup, and commission an independent security audit before broader rollout.

## Protocol / limitations

PBKDF2-SHA256 separates authentication and AES-GCM keys. AAD binds directions and frame context. A bounded sequence window rejects replay while allowing signalling and direct-channel packets to arrive out of order. Signaling and relay payloads are encrypted; WebRTC carries native desktop/Android video with a 60fps target and hardware encoding where available. Encrypted input uses an ordered data channel. Desktop system audio is a media track; Android 10+ system playback uses a bounded, unreliable PCM channel (48kHz mono), never microphone input. Apps may forbid audio capture. JPEG is retained only as a ~1fps fallback. Actual FPS are shown in the controller. Desktop supports mouse, keyboard, Unicode text, multi-monitor selection; Android uses explicit MediaProjection consent + AccessibilityService. No shell execution endpoint, persistence, unattended control or background startup.

Android orientation changes end the session to prevent mismatched input coordinates. Some OEM TV firmwares do not expose the required APIs. Samsung Tizen/LG webOS receiver integrations and exact factory remote replicas are not implemented. Audio, binary file transfer and waking powered-off hardware are not implemented. Never advertise unrestricted system control.

## Validation

`npm test` includes crypto tampering/context tests and a live disposable backend authorization test. Native packaging can be checked in CI, but physical Mac/Android/TV and iOS hardware tests must be recorded separately. A successful build is not proof of full platform behavior.
