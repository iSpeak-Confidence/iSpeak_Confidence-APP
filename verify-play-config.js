const fs=require('fs');
const g=fs.readFileSync('android-app/app/build.gradle','utf8');
const m=fs.readFileSync('android-app/app/src/main/AndroidManifest.xml','utf8');
const j=fs.readFileSync('android-app/app/src/main/java/com/ispeakconfidence/app/MainActivity.java','utf8');
let fail=0;function check(name,re,text){const ok=re.test(text);console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)fail++}
check('applicationId com.ispeakconfidence.app',/applicationId 'com\.ispeakconfidence\.app'/,g);
check('versionCode 3',/versionCode 3/,g);
check('versionName 18.8.46',/versionName '18\.8\.46'/,g);
check('targetSdk 36',/targetSdk 36/,g);
check('Internet permission',/android\.permission\.INTERNET/,m);
check('Camera permission',/android\.permission\.CAMERA/,m);
check('Microphone permission',/android\.permission\.RECORD_AUDIO/,m);
check('Native TTS bridge',/addJavascriptInterface\(new AndroidAudioBridge\(\),"iSpeakAndroid"\)/,j);
check('Native TTS rate bridge',/speakWithRate/,j);
process.exit(fail?1:0);
