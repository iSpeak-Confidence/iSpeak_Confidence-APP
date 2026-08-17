'use strict';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function fetchWithTimeout(url,options={},timeoutMs=15000){const c=new AbortController(),t=setTimeout(()=>c.abort(),timeoutMs);try{return await fetch(url,{...options,signal:c.signal})}finally{clearTimeout(t)}}
async function geminiGenerate({key,model,payload,retries=2,timeoutMs=18000}){let last;for(let i=0;i<=retries;i++){try{const r=await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify(payload)},timeoutMs);if(r.ok||![429,500,502,503,504].includes(r.status))return r;last=new Error(`Gemini temporary error ${r.status}`)}catch(e){last=e}if(i<retries)await sleep(300*Math.pow(2,i))}throw last||new Error('Gemini request failed')}
module.exports={geminiGenerate};
