const fs=require('fs');let fail=0;const ok=(n,v)=>{console.log((v?'PASS ':'FAIL ')+n);if(!v)fail++};
const a=fs.readFileSync('app.js','utf8'),s=fs.readFileSync('server.js','utf8');
ok('password reset UI exists',a.includes("function openPasswordReset(kind='student')")&&a.includes('passwordResetCodeStep'));
ok('student forgot button wired',a.includes("openPasswordReset('student')"));
ok('teacher forgot button wired',a.includes("openPasswordReset('teacher')"));
ok('reset code stored persistently with account',s.includes('passwordReset=reset')&&!s.includes('PASSWORD_RESETS.set(key'));
ok('reset email send is awaited',s.includes('try{await smtpSendMail'));
ok('reset code 10 minute expiry',s.includes('10*60*1000'));
ok('reset attempts limited',s.includes('r.tries>6'));
ok('reset code one use',s.includes('delete u.passwordReset')&&s.includes('delete a.passwordReset'));
for(const x of ['french','spanish','mandarin','japanese','arabic','khmer']){
 const re=new RegExp(`const ${x==='mandarin'?'zh':x==='japanese'?'ja':x==='arabic'?'ar':x==='khmer'?'km':x==='spanish'?'es':x==='french'?'fr':x}=libraryBooks\\.${x}\\[0\\];libraryBooks\\.${x}=makeClassicVolumes`);
 ok(`${x} expanded shelf`,re.test(a));
}
ok('non-English shelves have Intermediate level entries',(a.match(/level:'Intermediate'/g)||[]).length>=12);
ok('advanced originals preserved',/level:"Advanced"/.test(a));
ok('version updated',s.includes("version:'V18.8.0'"));
process.exitCode=fail?1:0;
