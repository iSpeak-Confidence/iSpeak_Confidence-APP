const fs=require('fs');const path=require('path');const root=__dirname;
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const manifest=fs.readFileSync(path.join(root,'android-app/app/src/main/AndroidManifest.xml'),'utf8');
const java=fs.readFileSync(path.join(root,'android-app/app/src/main/java/com/ispeakconfidence/app/MainActivity.java'),'utf8');
const gradle=fs.readFileSync(path.join(root,'android-app/app/build.gradle'),'utf8');
let fail=0;function ok(name,v){console.log((v?'PASS ':'FAIL ')+name);if(!v)fail++}
ok('language selection retries scroll after render',app.includes('setTimeout(land,260)')&&app.includes("scrollIntoView({block:'start'"));
ok('writing canvas has Android touch fallback',app.includes('c.ontouchstart=')&&app.includes('c.ontouchmove='));
ok('recorded audio uses Android native bridge',app.includes("typeof window.iSpeakAndroid.playAudioUrl==='function'"));
ok('Android exposes native media playback',java.includes('playAudioUrl(String url)')&&java.includes('MediaPlayer'));
ok('rotation does not recreate WebView Activity',manifest.includes('android:configChanges="orientation|screenSize|screenLayout|smallestScreenSize|keyboardHidden"')&&java.includes('onConfigurationChanged'));
ok('new Play version code/name',gradle.includes('versionCode 4')&&gradle.includes("versionName '18.8.48'"));
process.exitCode=fail?1:0;
