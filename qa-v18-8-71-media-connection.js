const fs=require('fs');
const app=fs.readFileSync('app.js','utf8');
const server=fs.readFileSync('server.js','utf8');
const env=fs.readFileSync('.env.example','utf8');
const checks=[
 ['negotiation IDs stored',app.includes('peerNegotiationIds:new Map()')],
 ['peer start/retry timers stored',app.includes('peerStartedAt:new Map()')&&app.includes('peerRetryAt:new Map()')],
 ['offer tagged with negotiation ID',app.includes("type:'offer',sdp:pc.localDescription,negotiationId:nid")],
 ['ICE candidates tagged',app.includes("type:'candidate',candidate:e.candidate,negotiationId:nid")],
 ['answers tagged',app.includes("type:'answer',sdp:pc.localDescription,negotiationId:c.peerNegotiationIds.get(remote)")],
 ['stale incoming signaling rejected',app.includes("c.peerNegotiationIds.get(remote)!==incomingId")],
 ['stuck peer watchdog',app.includes('now-started>9000')],
 ['teacher owns normal student offer',app.includes("maintain('student',!!p.student,true)")],
 ['student requests renegotiation only as fallback',app.includes("maintain('teacher',!!p.teacher,false)")&&app.includes("type:'renegotiate-request'")],
 ['TURN supports multiple endpoints',server.includes("process.env.TURN_URLS||process.env.TURN_URL")&&server.includes("split(',')")],
 ['TURN production guidance present',env.includes('Production WebRTC TURN relay')&&env.includes('TURN_URLS=')],
 ['screen peer path still separate',app.includes('screenPeers:new Map()')&&app.includes('ensureScreenPeer')],
 ['camera and audio tracks still sent',app.includes('localStream.getAudioTracks()')&&app.includes('localStream.getVideoTracks()[0]')],
 ['remote media still attached',app.includes('v.srcObject=stream')&&app.includes('v.muted=false')]
];
let fail=0;for(const [n,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${n}`);if(!ok)fail++}console.log(`${checks.length-fail}/${checks.length} passed`);process.exit(fail?1:0);
