const fs=require('fs');
const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('styles.css','utf8');
const server=fs.readFileSync('server.js','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const gradle=fs.readFileSync('android-app/app/build.gradle','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const main=fs.readFileSync('android-app/app/src/main/java/com/ispeakconfidence/app/MainActivity.java','utf8');
const service=fs.readFileSync('android-app/app/src/main/java/com/ispeakconfidence/app/ScreenShareService.java','utf8');
const checks=[
 ['share control',app.includes('id="roomShareScreen"')],
 ['large shared stage',app.includes('id="roomSharedScreen"')&&app.includes('id="roomSharedScreenVideo"')],
 ['camera stream never replaced',!app.includes('replaceOutgoingVideo')&&!app.includes('sender.replaceTrack(track)')],
 ['normal camera sender preserved',app.includes('const videoTrack=localStream.getVideoTracks()[0]')],
 ['dedicated screen peer connection',app.includes('screenPeers:new Map()')&&app.includes('ensureScreenPeer')],
 ['dedicated screen signaling',app.includes("type:'screen-offer'")&&app.includes("type:'screen-answer'")&&app.includes("type:'screen-candidate'")],
 ['screen stop signaling',app.includes("type:'screen-stop'")],
 ['remote screen isolated from camera stream',app.includes('screenRemoteStreams:new Map()')&&app.includes('setSharedVideo(stream,remoteRole')],
 ['local camera preview stays local stream',app.includes('localVideo.srcObject=localStream')],
 ['screen capture API',app.includes('navigator.mediaDevices?.getDisplayMedia')],
 ['browser stop handler',app.includes('track.onended=')],
 ['both camera tiles float during sharing',css.includes('.classroom-stage.screen-share-active .classroom-videos')&&css.includes('grid-template-columns:repeat(2,minmax(0,1fr))')],
 ['shared screen uses contain fit',css.includes('.classroom-shared-screen video,.classroom-shared-screen>img')&&css.includes('object-fit:contain')],
 ['mobile dual camera overlay',css.includes('@media(max-width:520px)')&&css.includes('height:96px!important')],
 ['android native share kept',app.includes('window.iSpeakAndroid?.startScreenShare')&&main.includes('startScreenShare(String bookingId, String authToken)')],
 ['android projection service kept',service.includes('MediaProjection')&&service.includes('createVirtualDisplay')],
 ['native remote screen uses main stage',app.includes('c.nativeRemoteScreenOwner=x.role')&&app.includes('shareImage.src=x.dataUrl')],
 ['native frame endpoint kept',server.includes('classroom-screen-frame')],
 ['screen cleanup closes screen peers',app.includes('c.screenPeers?.values?.()')],
 ['version package',pkg.version==='18.8.69'],
 ['version assets',html.includes('app.js?v=18.8.69')&&html.includes('styles.css?v=18.8.69')],
 ['version server',server.includes("version:'18.8.69'")],
 ['version android',gradle.includes('versionCode 22')&&gradle.includes("versionName '18.8.69'")&&main.includes('iSpeakAndroid/18.8.69')],
 ['version service worker',sw.includes('ispeak-v18-8-69')&&sw.includes("version:'18.8.69'")]
];
let fail=0;
for(const[n,ok]of checks){console.log(`${ok?'PASS':'FAIL'} ${n}`);if(!ok)fail++}
console.log(`${checks.length-fail}/${checks.length} passed`);
process.exit(fail?1:0);
