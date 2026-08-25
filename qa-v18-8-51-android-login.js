const fs=require('fs');
const app=fs.readFileSync('app.js','utf8'), main=fs.readFileSync('android-app/app/src/main/java/com/ispeakconfidence/app/MainActivity.java','utf8'), gradle=fs.readFileSync('android-app/app/build.gradle','utf8');
const checks=[
 ['student touch login', app.includes("accountSubmit.addEventListener('touchend'")],
 ['teacher touch login', app.includes("btn.addEventListener('touchend',ev=>{ev.preventDefault();signIn()")],
 ['application device id', app.includes("deviceId:ispeakDeviceId()")],
 ['api same origin', app.includes("credentials:'same-origin'")],
 ['api no store', app.includes("cache:'no-store'")],
 ['webview cookies', main.includes('CookieManager.getInstance()')],
 ['dom storage', main.includes('setDomStorageEnabled(true)')],
 ['android UA marker', main.includes('iSpeakAndroid/18.8.51')],
 ['secure credential wording', !app.includes('teacher account is now kept in persistent local app data')],
 ['version code 6', /versionCode\s+6/.test(gradle)],
 ['version 18.8.51', /versionName\s+['\"]18\.8\.51['\"]/.test(gradle)]
];
let bad=0;for(const [n,ok] of checks){console.log((ok?'PASS':'FAIL')+' '+n);if(!ok)bad++}if(bad)process.exit(1);console.log(`PASS ${checks.length}/${checks.length}`)
