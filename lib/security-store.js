'use strict';
const crypto=require('crypto');

const DAY=24*60*60*1000;
function hashToken(token){return crypto.createHash('sha256').update(String(token||'')).digest('hex')}
function prune(store,now=Date.now()){
  store.sessions=store.sessions&&typeof store.sessions==='object'?store.sessions:{};
  store.deviceVerifications=store.deviceVerifications&&typeof store.deviceVerifications==='object'?store.deviceVerifications:{};
  store.adminTokens=store.adminTokens&&typeof store.adminTokens==='object'?store.adminTokens:{};
  for(const [k,v] of Object.entries(store.sessions))if(!v||Number(v.expiresAt||0)<=now)delete store.sessions[k];
  for(const [k,v] of Object.entries(store.deviceVerifications))if(!v||Number(v.expires||0)<=now)delete store.deviceVerifications[k];
  for(const [k,v] of Object.entries(store.adminTokens))if(!v||Number(v.expiresAt||0)<=now)delete store.adminTokens[k];
  return store;
}
function createSession(store,{kind,subject,deviceId='',ip='',userAgent='',ttlMs=30*DAY}){
  prune(store);const token=crypto.randomBytes(32).toString('hex'),hash=hashToken(token),now=Date.now();
  store.sessions[hash]={kind:String(kind),subject:String(subject),deviceId:String(deviceId||'').slice(0,180),ip:String(ip||'').slice(0,100),userAgent:String(userAgent||'').slice(0,240),createdAt:now,lastSeenAt:now,expiresAt:now+ttlMs};
  return {token,record:store.sessions[hash]};
}
function findSession(store,token,kind){
  prune(store);const hash=hashToken(token),s=store.sessions[hash];if(!s||s.kind!==kind)return null;s.lastSeenAt=Date.now();return {hash,session:s};
}
function revokeToken(store,token){const hash=hashToken(token);const existed=Boolean(store.sessions?.[hash]);if(store.sessions)delete store.sessions[hash];return existed}
function revokeSubject(store,kind,subject){let n=0;for(const [k,s] of Object.entries(store.sessions||{}))if(s.kind===kind&&s.subject===String(subject)){delete store.sessions[k];n++}return n}
function listSubject(store,kind,subject,currentToken=''){prune(store);const current=hashToken(currentToken);return Object.entries(store.sessions).filter(([,s])=>s.kind===kind&&s.subject===String(subject)).map(([hash,s])=>({id:hash.slice(0,16),deviceId:s.deviceId||'',createdAt:new Date(s.createdAt).toISOString(),lastSeenAt:new Date(s.lastSeenAt).toISOString(),expiresAt:new Date(s.expiresAt).toISOString(),current:hash===current,userAgent:s.userAgent||''})).sort((a,b)=>String(b.lastSeenAt).localeCompare(String(a.lastSeenAt)))}
function createDeviceVerification(store,key,code,ttlMs=10*60*1000){prune(store);store.deviceVerifications[key]={hash:hashToken(code),expires:Date.now()+ttlMs,tries:0,createdAt:Date.now()};return store.deviceVerifications[key]}
function getDeviceVerification(store,key){prune(store);return store.deviceVerifications[key]||null}
function deleteDeviceVerification(store,key){delete store.deviceVerifications[key]}
function createAdminToken(store,ownerId,ttlMs=30*60*1000){prune(store);const token='OWNER-'+crypto.randomBytes(24).toString('hex'),hash=hashToken(token);store.adminTokens[hash]={ownerId:String(ownerId),role:'admin',createdAt:Date.now(),expiresAt:Date.now()+ttlMs};return token}
function validateAdminToken(store,token){prune(store);return store.adminTokens[hashToken(token)]||null}
module.exports={hashToken,prune,createSession,findSession,revokeToken,revokeSubject,listSubject,createDeviceVerification,getDeviceVerification,deleteDeviceVerification,createAdminToken,validateAdminToken};
