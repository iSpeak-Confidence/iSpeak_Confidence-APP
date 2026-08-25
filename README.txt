iSpeak Confidence V18.8.52
===========================

CURRENT WINDOWS START FILE
Double-click: start-v18-8-52.bat
Then open: http://localhost:3000

CURRENT RELEASE
Web: 18.8.52
Android: versionCode 7 / versionName 18.8.52
Package: com.ispeakconfidence.app

MAIN V18.8.52 FIXES
- IELTS level selection and Skills Lab are now directly linked.
- Selecting Level 1–6 changes the active units, topics, difficulty and Skills Lab content.
- Academic and General Training visibly change the current IELTS path.
- Academic uses academic Reading and Academic Writing Task 1 content.
- General Training uses practical/workplace Reading and General Training letter Task 1 content.
- Students can switch to any easier or harder IELTS level at any time; the currently selected level alone drives the active Skills Lab.
- Our Socials is a separate navigation item directly below Support.
- Android login, rotation, native audio fallback, mobile writing touch support and learning auto-scroll fixes from prior releases are retained.

RELEASE CHECKS
Run: npm run release-gate
The release gate validates IELTS path wiring/content separation, the 7-language 150-unit curriculum, progression, certificates, booking/payment, admin/classroom behavior, teacher message email logic, account deletion and certificate previews.

ANDROID BUILD
Open android-app in Android Studio and generate a signed App Bundle using the SAME Google Play upload keystore already accepted for iSpeak Confidence. Do not create a new signing key just for this update.

PRODUCTION CONFIGURATION
Use environment variables for secrets. Do not put passwords, SMTP credentials, API keys or signing keys into the source project.

Important: automated/source checks cannot replace final testing on a real Android device. Before Play rollout, install the signed V18.8.52 test build and verify login, IELTS Academic/General switching, IELTS level switching, Skills Lab content, learning audio, writing touch input and rotation on-device.
