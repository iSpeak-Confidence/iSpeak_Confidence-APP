const fs=require('fs');
const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('styles.css','utf8');
const server=fs.readFileSync('server.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const pkg=require('./package.json');
const gradle=fs.readFileSync('android-app/app/build.gradle','utf8');
const checks=[]; const t=(name,ok)=>checks.push([name,!!ok]);

// Version/cache integrity
t('V18.8.70 package',pkg.version==='18.8.70');
t('V18.8.70 asset cache bust',html.includes('app.js?v=18.8.70')&&html.includes('styles.css?v=18.8.70'));
t('V18.8.70 server status',server.includes("version:'18.8.70'"));
t('Android V18.8.70',/versionCode 23/.test(gradle)&&/versionName '18\.8\.70'/.test(gradle));

// Actual live classroom render shape
const renderStart=app.indexOf('function renderISpeakClassroom');
const renderEnd=app.indexOf('function whiteboardCanvasMetrics',renderStart)>=0?app.indexOf('function whiteboardCanvasMetrics',renderStart):app.indexOf('function ',renderStart+30);
const live=renderStart>=0?app.slice(renderStart,renderEnd>renderStart?renderEnd:Math.min(app.length,renderStart+45000)):'';
t('Live classroom renderer found',renderStart>=0);
t('Shared Notes absent from live classroom',!live.includes('Shared notes')&&!live.includes('roomWorkspace'));
t('Shared Whiteboard absent from live classroom',!live.includes('Shared whiteboard')&&!live.includes('roomWhiteboard')&&!live.includes('data-wb-tool'));
t('No client whiteboard renderer remains',!app.includes('function bindSharedWhiteboard')&&!app.includes('function drawSharedWhiteboard')&&!app.includes('function whiteboardCanvasMetrics'));
t('Lesson files panel retained',live.includes('📎 Lesson files')&&live.includes('id="roomFileList"'));
t('Large lesson-plan panel retained',live.includes('lesson-plan-panel-large')&&live.includes('📖 Lesson plan viewer'));
t('Docked preview retained',live.includes('id="roomFilePreview"')&&live.includes('room-file-preview-large'));
t('PDF preview retained',app.includes('Lesson PDF preview')&&app.includes('/api/classroom-file-preview/'));
t('DOCX inline preview retained',app.includes('docx-text-preview'));
t('Open/download fallback retained',app.includes('Open / download'));
t('Lesson information retained',live.includes('classroom-info-drawer')&&live.includes('Lesson information'));

// Working classroom reliability must remain intact
t('WebRTC peer connection retained',app.includes('new RTCPeerConnection'));
t('Remote track handler retained',app.includes('pc.ontrack=e=>'));
t('Remote audio unmuted retained',app.includes('v.muted=false;v.volume=1'));
t('Tap-for-sound recovery retained',app.includes("Tap for sound"));
t('Presence/media state separation retained',app.includes('Both joined · connecting audio & video…')&&app.includes('Live · both participants connected'));
t('Student renegotiation retained',app.includes('renegotiate-request')&&app.includes("sendSignal('teacher'"));
t('Session-aware poll retained',app.includes("action:'poll',since:c.lastSignalId,sessionId:c.sessionId"));
t('Heartbeat retained',app.includes("action:'heartbeat',sessionId:c.sessionId"));
t('Two-way file revision sync retained',app.includes('updateFiles(d.files||[],d.fileRevision)')&&server.includes('fileRevision:room.fileRevision'));
t('Immediate uploader file update retained',app.includes('File shared with teacher and student.'));

// Mobile layout
t('Mobile classroom stacks vertically',css.includes('dialog.classroom-dialog .ispeak-classroom>main{display:flex!important;flex-direction:column!important'));
t('Mobile videos remain visible first',css.includes('dialog.classroom-dialog .classroom-stage{order:1!important'));
t('Mobile tools follow videos',css.includes('dialog.classroom-dialog .classroom-tools{order:2!important'));
t('Mobile viewer large',css.includes('lesson-plan-panel-large{height:68dvh!important')||css.includes('lesson-plan-panel-large{height:64dvh!important'));
t('No classroom whiteboard mobile selector',!css.includes('dialog.classroom-dialog #roomWhiteboard')&&!css.includes('dialog.classroom-dialog .whiteboard-toolbar'));

// Prejoin copy matches actual tools
t('Prejoin no longer promises notes/whiteboard',!app.includes('use shared files, notes and the whiteboard')&&!app.includes('use shared files, notes and the whiteboard.'));

let pass=0; for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`); if(ok)pass++;}
console.log(`\n${pass}/${checks.length} passed`);
if(pass!==checks.length)process.exit(1);
