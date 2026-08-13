iSpeak Confidence V18.5.0 — Deep Audit Release
================================================

QUICK START (WINDOWS)
Double-click: start-v18-5-0.bat
Then open: http://localhost:3000

COMMAND LINE
1. Install Node.js 18 or newer.
2. Run: npm start
3. Open: http://localhost:3000
4. Run release checks any time with: npm run qa

WHAT THIS RELEASE CONTAINS
V18.5.0 retains the full international learning app, IELTS centre, multilingual library,
individual teacher accounts, teacher applications/profile review, tutor booking, iSpeak
Classroom, verified lesson reviews, admin quality monitoring, and protected classroom replay.

DEEP-AUDIT REPAIRS IN V18.5.0
- Repaired PWA/offline cache versioning and included all core runtime learning dependencies,
  including IELTS and language-support data.
- Removed the retired shared teacher-PIN login path. Teachers use individual accounts.
- Synchronized visible release labels, package.json, package-lock.json and startup metadata.
- Repaired obvious tiny pagination fragments in processed library books without rewriting
  or inventing source-language content.
- Added missing accessible labels to library search/sort and conversation input controls.
- Corrected an Arabic question-mark punctuation error.
- Expanded automated release QA from 35 to 59 checks, including local-reference integrity,
  curriculum structure/repetition, library integrity, authentication retirement and offline core.


ADMIN PORTAL (LOCAL / TESTING)
Open: http://localhost:3000/admin
The local development PIN defaults to: 1357
For production, set ADMIN_PORTAL_PIN to your own strong value.

To create Nathan's teacher login:
1. Open /admin and sign in.
2. Choose Teachers & Applications.
3. Under Create login for an existing teacher, select Nathan.
4. Enter Nathan's email and a temporary password (8+ characters).
5. Nathan then uses Teacher Portal with that email/password and is forced to choose his own password.

PRODUCTION CONFIGURATION
Copy the required values from .env.example into your production environment rather than
committing secrets to the app folder.

- ADMIN_PORTAL_PIN: Set a strong unique value before production. Production admin endpoints
  reject access if this variable is not configured.
- DATA_DIR: Point this at persistent storage in production.
- SMTP_*: Required for direct server email/certificate delivery.
- GEMINI_API_KEY: Required for configured Gemini-backed AI functions.
- TURN_URL / TURN_USERNAME / TURN_CREDENTIAL: Strongly recommended for reliable classroom
  video on restrictive school, hotel, corporate and mobile networks. STUN remains available.

CLASSROOM PRIVACY / RECORDINGS
Classroom monitoring and recording are disclosed to teachers and learners at entry. Recording
requires the classroom acknowledgement flow. Replay endpoints are admin-protected. Before a
commercial launch, set a documented recording-retention/deletion policy and review consent,
children's privacy, monitoring and recording requirements for every target jurisdiction.

TRANSLATION / KHMER CONTENT RULE
The app deliberately falls back to English when a verified support translation is unavailable.
No unverified Khmer learner-facing translation was invented during this audit. Khmer learning
content should continue to use only approved source material and verified audio/text.

QUALITY STATUS
The release is validated by qa-v18.js plus a clean-server end-to-end account/booking/classroom/
review/recording workflow, JavaScript syntax validation and npm dependency auditing. See
QA_REPORT_V18.5.0_ADMIN_PORTAL.txt for the exact audit scope and limitations.
