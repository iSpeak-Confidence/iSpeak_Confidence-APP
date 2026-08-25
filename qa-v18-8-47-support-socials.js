const fs=require('fs'),path=require('path');
const root=__dirname;
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const css=fs.readFileSync(path.join(root,'styles.css'),'utf8');
const server=fs.readFileSync(path.join(root,'server.js'),'utf8');
const java=fs.readFileSync(path.join(root,'android-app/app/src/main/java/com/ispeakconfidence/app/MainActivity.java'),'utf8');
const gradle=fs.readFileSync(path.join(root,'android-app/app/build.gradle'),'utf8');
const checks=[
 ['support hub',app.includes('function openSupportHub()')&&app.includes("supportChatBtn.onclick=openSupportHub")],
 ['our socials view',app.includes('function openOurSocials()')&&app.includes('socials-shell')],
 ['YouTube iSpeak',app.includes('https://youtube.com/@ispeakconfidence?si=Sw2KN4qWLX4VDvHq')],
 ['YouTube Live Rich Cambodia',app.includes('https://youtube.com/@michael-live.rich.cambodia?si=VnXCIbNcDCmG59Oo')],
 ['TikTok iSpeak',app.includes('https://www.tiktok.com/@ispeakconfidence?')],
 ['Facebook iSpeak',app.includes('https://www.facebook.com/share/1DFc5Jv4ui/')],
 ['social styling',css.includes('.socials-shell')&&css.includes('.social-link-card')&&css.includes('@media(max-width:680px)')],
 ['web external opener',app.includes('function openExternalLink(url)')&&app.includes("window.open(safe,'_blank','noopener,noreferrer')")],
 ['Android current-build external navigation',app.includes("/Android/i.test(navigator.userAgent||'')")&&java.includes('shouldOverrideUrlLoading')&&java.includes('Intent.ACTION_VIEW')],
 ['teacher login const reassignment fixed',!server.includes("const token=newToken();token=issueSession")&&server.includes("const token=issueSession(req,'teacher',id,deviceId)")],
 ['Play build remains submitted V18.8.46',gradle.includes('versionCode 3')&&gradle.includes("versionName '18.8.46'")]
];
let fail=0; for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'}: ${name}`); if(!ok)fail++;} process.exitCode=fail?1:0;
