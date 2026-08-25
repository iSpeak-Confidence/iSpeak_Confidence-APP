const fs=require('fs');
const app=fs.readFileSync('app.js','utf8');
const java=fs.readFileSync('android-app/app/src/main/java/com/ispeakconfidence/app/MainActivity.java','utf8');
const gradle=fs.readFileSync('android-app/app/build.gradle','utf8');
let p=0,f=0;function t(n,c){if(c){console.log('PASS',n);p++}else{console.error('FAIL',n);f++}}
t('Central device speech helper exists',/function playDeviceSpeech\(/.test(app));
t('Native Android bridge preferred',/window\.iSpeakAndroid/.test(app)&&/speakWithRate/.test(app));
t('IELTS learning listening uses device speech',/playDeviceSpeech\(u\.listening\.script,'en-GB',\.92\)/.test(app));
t('IELTS diagnostic uses device speech',/playDeviceSpeech\(x\.script,'en-GB',\.94\)/.test(app));
t('IELTS mock uses device speech',/function speakMockScript[\s\S]*playDeviceSpeech\(clean,'en-GB',\.92\)/.test(app));
t('Native bridge supports speech rate',/@JavascriptInterface public void speakWithRate/.test(java));
t('Android app ID unchanged',/applicationId 'com\.ispeakconfidence\.app'/.test(gradle));
t('Closed beta version code is 2',/versionCode 2/.test(gradle));
t('Version name is 18.8.45',/versionName '18\.8\.45'/.test(gradle));
console.log(`\nV18.8.45 Android audio QA: ${p}/${p+f} passed`);process.exit(f?1:0);
