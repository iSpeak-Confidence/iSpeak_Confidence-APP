'use strict';
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
function makeRequestId(){return 'req_'+crypto.randomBytes(8).toString('hex')}
function safeLog(logFile,entry){try{fs.mkdirSync(path.dirname(logFile),{recursive:true});fs.appendFileSync(logFile,JSON.stringify({...entry,at:new Date().toISOString()})+'\n')}catch{}}
function copyIfExists(src,dst){if(!fs.existsSync(src))return false;fs.copyFileSync(src,dst);return true}
function createBackup({dataDir,files,label='manual'}){const stamp=new Date().toISOString().replace(/[:.]/g,'-'),dir=path.join(dataDir,'backups',`${stamp}-${String(label).replace(/[^a-z0-9_-]/gi,'_')}`);fs.mkdirSync(dir,{recursive:true});const copied=[];for(const file of files){const src=path.join(dataDir,file),dst=path.join(dir,file);if(copyIfExists(src,dst))copied.push(file)}const manifest={createdAt:new Date().toISOString(),files:copied};fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,2));return {dir,manifest}}
function verifyBackup(dir){try{const m=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));for(const f of m.files||[])JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'));return {ok:true,files:m.files||[],createdAt:m.createdAt}}catch(e){return {ok:false,error:e.message}}}
module.exports={makeRequestId,safeLog,createBackup,verifyBackup};
