LinkDesk 0.1.1 — video, audio and easier control

- Native Android WebRTC screen video, target 60 FPS; desktop system audio and Android 10+ playback audio. Press “Включить звук” in the controller.
- Actual WebRTC FPS and network RTT displayed. Stable 60 FPS are not guaranteed; Android and network performance need physical-device testing.
- Android horizontal scroll, arrow-key swipes, Tab/Shift+Tab highlighting and Enter activation; visible on-device pointer and conservative assistance near isolated buttons.
- Phone-to-computer precise trackpad by default; double-tap-and-hold drag; enlarged pointer; coalesced mouse movement.
- Reinstall 0.1.1 on both native devices; reopen the iOS PWA. Existing local consent, password, stop and timeout controls remain enforced.

Validation: signed Android release build and Java compile passed; Windows installer built. A real Windows screen + loopback audio session reached a WebRTC browser receiver without JavaScript errors (60 FPS capture requested; receiver sample 18 FPS on the observed desktop). Crypto and input-ordering tests passed. Physical Android/iOS/macOS/TV runtime tests have not been performed. No bypass of exam lockdown/security software is included.
