iSpeak Confidence Android / Google Play closed-beta update
Package: com.ispeakconfidence.app
Version code: 3
Version name: 18.8.46
Target SDK: 36
Minimum SDK: 26

IMPORTANT
- This Android shell loads the production web app at https://ispeakconfidence.com so the website must be deployed with the matching V18.8.46 files before/alongside the Play update.
- This update adds the native Android TextToSpeech bridge needed for reliable audio in WebView.
- Do NOT create a new package/application ID.
- Do NOT create a new signing/upload key if you still have the key used for versionCode 1. Google Play requires updates to be signed with the accepted upload key.

To create the CLOSED TEST AAB on the Windows PC that has the existing upload keystore:
1. Open this android-app folder in Android Studio.
2. Let Gradle sync; install Android SDK 36 if prompted.
3. Build > Generate Signed App Bundle / APK.
4. Choose Android App Bundle.
5. Select the SAME keystore/key alias used for the first iSpeak closed-test AAB.
6. Choose release and generate.
7. Verify the generated bundle reports:
   applicationId: com.ispeakconfidence.app
   versionCode: 3
   versionName: 18.8.46
8. Upload app-release.aab to the EXISTING Closed testing track, not a new app.
9. Review warnings/errors before rollout.

If the original upload keystore cannot be located, do not generate a random replacement and upload it. Use Play Console's upload-key reset/recovery process instead.

Post-upload real-device checks:
- Master & next writing progression.
- Learning audio and IELTS audio.
- Admin teacher pricing.
- Login/progress persistence.
- Teacher/student messaging.
- Camera/microphone classroom permissions.
- File upload/download.
- Privacy/terms/delete-account.
