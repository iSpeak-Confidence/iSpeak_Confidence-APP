(()=>{
  'use strict';
  const $=s=>document.querySelector(s);
  const loginForm=$('#loginForm'),verifyForm=$('#verifyForm'),confirmPanel=$('#confirmPanel'),status=$('#status');
  let token='',email='';
  const deviceKey='isc-public-delete-device-id';
  let deviceId='';
  try{deviceId=localStorage.getItem(deviceKey)||'';if(!deviceId){deviceId='delete-'+(crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(16).slice(2));localStorage.setItem(deviceKey,deviceId)}}catch{deviceId='delete-'+Date.now()}
  const message=(text,type='')=>{status.textContent=text||'';status.className='status'+(type?' '+type:'')};
  async function request(path,options={}){const r=await fetch(path,{...options,headers:{'Content-Type':'application/json','X-Device-ID':deviceId,...(options.headers||{})}});let d={};try{d=await r.json()}catch{}if(!r.ok)throw new Error(d.error||'The request could not be completed.');return d}
  function readyForDelete(nextToken){token=nextToken;verifyForm.hidden=true;loginForm.hidden=true;confirmPanel.hidden=false;$('#signedInAs').textContent=`Signed in as ${email}.`;message('Account verified. Review the final confirmation below.','success')}
  loginForm.addEventListener('submit',async e=>{e.preventDefault();email=$('#email').value.trim().toLowerCase();const password=$('#password').value;if(!email||!password)return message('Enter your account email and password.','error');const btn=$('#loginBtn');btn.disabled=true;message('Checking your account…');try{const d=await request('/api/account/login',{method:'POST',body:JSON.stringify({email,password,deviceId})});if(d.verificationRequired){loginForm.hidden=true;verifyForm.hidden=false;message('Enter the verification code sent to your email.');$('#code').focus()}else if(d.token){readyForDelete(d.token)}else throw new Error('Sign-in could not be completed.')}catch(err){message(err.message,'error')}finally{btn.disabled=false}});
  verifyForm.addEventListener('submit',async e=>{e.preventDefault();const code=$('#code').value.replace(/\D/g,'').slice(0,6);if(code.length!==6)return message('Enter the complete 6-digit verification code.','error');const btn=$('#verifyBtn');btn.disabled=true;message('Verifying code…');try{const d=await request('/api/device-verification/confirm',{method:'POST',body:JSON.stringify({kind:'student',email,deviceId,code})});if(!d.token)throw new Error('Verification did not return a valid session.');readyForDelete(d.token)}catch(err){message(err.message,'error')}finally{btn.disabled=false}});
  $('#startOver').addEventListener('click',()=>{token='';email='';verifyForm.hidden=true;confirmPanel.hidden=true;loginForm.hidden=false;$('#code').value='';message('')});
  $('#confirmDelete').addEventListener('change',e=>{$('#deleteBtn').disabled=!e.target.checked});
  $('#deleteBtn').addEventListener('click',async()=>{if(!token||!$('#confirmDelete').checked)return;const btn=$('#deleteBtn');btn.disabled=true;message('Deleting your account and cloud data…');try{await request('/api/account',{method:'DELETE',headers:{Authorization:`Bearer ${token}`},body:'{}'});token='';confirmPanel.innerHTML='<h2>Account deleted</h2><p>Your iSpeak Confidence student account and cloud learning data have been deleted. You can close this page.</p>';message('Deletion completed successfully.','success')}catch(err){message(err.message,'error');btn.disabled=false}});
})();
