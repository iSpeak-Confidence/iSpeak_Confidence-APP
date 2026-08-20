iSpeak Confidence Android / Google Play build
Package: com.ispeakconfidence.app
Version code: 1
Version name: 18.8.38
Target SDK: 36 (Android 16), chosen because production access will occur after the 31 Aug 2026 Play deadline.
Minimum SDK: 26

IMPORTANT: This Android shell intentionally points to the existing production app at https://ispeakconfidence.com so there is one source of truth and no duplicated learning/business logic. Existing website behavior was not redesigned.

Before uploading to Play:
1. Open this android-app folder in the latest Android Studio.
2. Let Gradle sync and install Android SDK 36 if prompted.
3. Build > Generate Signed App Bundle / APK > Android App Bundle.
4. Create and securely retain your upload keystore. Do not commit or share it.
5. Build the release AAB and upload it to Closed testing.
6. Test on at least one real Android phone: sign-up/login, learning, audio/mic, teacher chat, payment handoff, camera/mic classroom, file upload, certificate download, privacy/terms, back navigation.

Google Play account requirement shown by Play Console: 12 opted-in closed testers for at least 14 days before production application.
