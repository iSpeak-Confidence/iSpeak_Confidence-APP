const fs=require('fs');
const app=fs.readFileSync('app.js','utf8'),server=fs.readFileSync('server.js','utf8'),css=fs.readFileSync('styles.css','utf8'),gradle=fs.readFileSync('android-app/app/build.gradle','utf8');
const checks=[
 ['client classroom session id',/sessionId:`S-/.test(app)],
 ['join sends session id',/action:'join',consent:true,sessionId:p\.sessionId/.test(app)],
 ['poll sends session id',/action:'poll',since:c\.lastSignalId,sessionId:c\.sessionId/.test(app)],
 ['heartbeat sends session id',/action:'heartbeat',sessionId:c\.sessionId/.test(app)],
 ['leave sends session id',/action:'leave',sessionId:c\.sessionId/.test(app)],
 ['server stores role session',/sessionId:sid/.test(server)],
 ['server clears stale role signals on rejoin',/room\.signals=.*filter\(x=>x\.from!==access\.role&&x\.to!==access\.role\)/.test(server)],
 ['signals target active session',/toSession=room\.presence\?\.\[to\]\?\.sessionId/.test(server)],
 ['poll filters signal session',/x\.toSession===sid/.test(server)],
 ['student renegotiation fallback',/renegotiate-request/.test(app)&&/sendSignal\(role,\{type:'renegotiate-request'\}/.test(app)],
 ['presence/media status separated',/Both joined · connecting audio & video/.test(app)],
 ['remote audio recovery control',/roomAudio/.test(app)&&/Tap for sound/.test(app)],
 ['remote video explicit play',/attempt=v\.play/.test(app)],
 ['file revision returned by server',/fileRevision:room\.fileRevision/.test(server)],
 ['file revision polled',/fileRevision:Number\(room\.fileRevision\|\|0\)/.test(server)],
 ['client file revision sync',/updateFiles\(d\.files\|\|\[\],d\.fileRevision\)/.test(app)],
 ['uploader immediate shared file update',/File shared with teacher and student/.test(app)],
 ['mobile stacked classroom',/V18\.8\.62 classroom reliability/.test(css)&&/flex-direction:column!important/.test(css)],
 ['mobile video aspect ratio',/classroom-video-tile\{aspect-ratio:4\/3!important/.test(css)],
 ['mobile tools non-overlay',/live-tools-heading\{position:static!important/.test(css)],
 ['mobile controls sticky',/classroom-controls\{position:sticky!important/.test(css)],
 ['android version bumped',/versionCode 24/.test(gradle)&&/versionName '18\.8\.71'/.test(gradle)]
];
let pass=0;for(const [n,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${n}`);if(ok)pass++}console.log(`${pass}/${checks.length}`);if(pass!==checks.length)process.exit(1);
