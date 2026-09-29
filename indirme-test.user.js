// ==UserScript==
// @name         Indirme Test
// @namespace    local
// @version      1.1
// @description  Medya Indir simge testi: sabit simge ile dokununca beliren simgeyi karsilastirir. Gecici betik.
// @match        *://*/*
// @run-at       document-end
// @noframes
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @connect      *
// @updateURL    https://raw.githubusercontent.com/mtnseven/browser-tampermonkey/main/indirme-test.user.js
// @downloadURL  https://raw.githubusercontent.com/mtnseven/browser-tampermonkey/main/indirme-test.user.js
// ==/UserScript==

(function(){
var Z=2147483647,KT=null;

function N(t,s){
  if(!KT){KT=document.createElement('div');KT.style.cssText='position:fixed;left:50%;bottom:90px;transform:translateX(-50%);display:flex;flex-direction:column;gap:6px;z-index:'+Z+';max-width:92%';document.body.appendChild(KT)}
  var d=document.createElement('div');d.textContent=t;
  d.style.cssText='background:#222;color:#fff;padding:10px 14px;border-radius:8px;font:14px sans-serif;word-break:break-all';
  KT.appendChild(d);setTimeout(function(){d.remove()},(s||8)*1000)
}

function R(){
  var b=null,m=0;
  document.querySelectorAll('img').forEach(function(i){
    var a=i.naturalWidth*i.naturalHeight;
    if(a>m&&i.currentSrc&&i.currentSrc.indexOf('data:')!==0){m=a;b=i}
  });
  return b
}

function A(u){
  var p=(u.split('?')[0].split('/').pop()||'resim').replace(/[^\w.\-]/g,'_');
  if(!/\.(jpe?g|png|gif|webp)$/i.test(p))p+='.jpg';
  return p
}

function B(i){
  var u=i.currentSrc||i.src,ss=i.getAttribute('srcset'),m=0;
  if(ss)ss.split(',').forEach(function(p){
    var q=p.trim().split(/\s+/),w=parseFloat(q[1])||0;
    if(q[0]&&w>m){m=w;u=new URL(q[0],location.href).href}
  });
  return u
}

function Y(u){
  N('Indiriliyor...',3);
  GM_xmlhttpRequest({method:'GET',url:u,responseType:'blob',anonymous:true,headers:{Referer:location.href},
    onload:function(r){
      if(r.status!==200){N('Durum '+r.status+', yeni sekmede aciliyor');window.open(u,'_blank');return}
      var x=URL.createObjectURL(r.response),a=document.createElement('a');
      a.href=x;a.download=A(u);document.body.appendChild(a);a.click();a.remove();
      setTimeout(function(){URL.revokeObjectURL(x)},30000);
      N('Indirildi ('+Math.round(r.response.size/1024)+' KB)')
    },
    onerror:function(){N('Ag hatasi')}
  })
}

var MOD=GM_getValue('mod','sabit'),ES=100,HR=new Map();

function S(i){
  var r=i.getBoundingClientRect();
  if(r.width<ES||r.height<ES)return null;
  var k=HR.get(i);
  if(!k){
    k=document.createElement('div');k.textContent='\u2B07';
    k.style.cssText='position:absolute;width:28px;height:28px;border-radius:50%;background:rgba(0,0,0,.6);color:#fff;font:16px sans-serif;display:flex;align-items:center;justify-content:center;z-index:'+Z+';cursor:pointer';
    k.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();Y(B(i))},true);
    document.body.appendChild(k);HR.set(i,k)
  }
  k.style.top=(r.top+scrollY+4)+'px';k.style.left=(r.right+scrollX-32)+'px';
  return k
}

function T(){
  HR.forEach(function(k,i){if(!i.isConnected||MOD!=='sabit'){k.remove();HR.delete(i)}});
  if(MOD==='sabit')document.querySelectorAll('img').forEach(S)
}

document.addEventListener('click',function(e){
  if(MOD!=='dokun')return;
  var i=e.target.closest&&e.target.closest('img');
  if(!i)return;
  var k=HR.get(i);
  if(k&&k.isConnected)return;
  k=S(i);if(!k)return;
  e.preventDefault();e.stopPropagation();
  setTimeout(function(){k.remove();HR.delete(i)},4000)
},true);

var b=document.createElement('div');
b.style.cssText='position:fixed;left:14px;bottom:90px;padding:10px 14px;border-radius:22px;background:#1565c0;color:#fff;font:bold 14px sans-serif;z-index:'+Z+';box-shadow:0 2px 6px rgba(0,0,0,.4);cursor:pointer';
function E(){b.textContent=MOD==='sabit'?'Mod: SABIT':'Mod: DOKUN'}
b.onclick=function(){MOD=MOD==='sabit'?'dokun':'sabit';GM_setValue('mod',MOD);E();T();N('Mod degisti: '+MOD,3)};
E();document.body.appendChild(b);

T();setInterval(T,1500);
addEventListener('resize',T);
})();
