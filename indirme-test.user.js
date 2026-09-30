// ==UserScript==
// @name         Indirme Test
// @namespace    local
// @version      1.6
// @description  Medya Indir simge testi: sabit simge resim ve videoda; video kaynak turu testi. Gecici betik.
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
  if(!/\.(jpe?g|png|gif|webp|mp4|webm|ogv|mov)$/i.test(p))p+='.jpg';
  return p
}

function B(i){
  if(i.tagName==='VIDEO'){
    var v=i.currentSrc||i.src;
    if(!v){var so=i.querySelector('source[src]');if(so)v=so.src}
    if(!v)v=i.getAttribute('data-src')||'';
    if(!v){
      var e=performance.getEntriesByType('resource').filter(function(x){return /\.(mp4|webm|ogv|mov)(\?|$)/i.test(x.name)});
      if(e.length){v=e[e.length-1].name;N('Kaynak sayfa kayitlarindan bulundu',4)}
    }
    return v||''
  }
  var u=i.currentSrc||i.src,ss=i.getAttribute('srcset'),m=0;
  if(ss)ss.split(',').forEach(function(p){
    var q=p.trim().split(/\s+/),w=parseFloat(q[1])||0;
    if(q[0]&&w>m){m=w;u=new URL(q[0],location.href).href}
  });
  return u
}

function V(i){
  var u=B(i);
  if(!u){N('\u00d6nce videoyu ba\u015flat, sonra simgeye tekrar bas',5);return}
  if(u.indexOf('blob:')===0||u.indexOf('mediastream:')===0){N('Video: akis (blob:), desteklenmiyor');return}
  var p=A(u);if(!/\.(mp4|webm|ogv|mov)$/i.test(p))p=p.replace(/\.jpg$/,'')+'.mp4';
  N('Video: dogrudan adres, indiriliyor',4);Y(u,p)
}

function Y(u,ad){
  N('Indiriliyor...',3);
  GM_xmlhttpRequest({method:'GET',url:u,responseType:'blob',anonymous:true,headers:{Referer:location.href},
    onload:function(r){
      if(r.status!==200){N('Durum '+r.status+', yeni sekmede aciliyor');window.open(u,'_blank');return}
      var x=URL.createObjectURL(r.response),a=document.createElement('a');
      a.href=x;a.download=ad||A(u);document.body.appendChild(a);a.click();a.remove();
      setTimeout(function(){URL.revokeObjectURL(x)},30000);
      N('Indirildi ('+Math.round(r.response.size/1024)+' KB)')
    },
    onerror:function(){N('Ag hatasi')},
    onprogress:function(e){if(e.total>5e6&&e.loaded%(5e6)<2e5)N(Math.round(e.loaded/1048576)+' / '+Math.round(e.total/1048576)+' MB',2)}
  })
}

var MOD=GM_getValue('mod','sabit'),ES=100,HR=new Map(),VR=[];

function O(r){
  return VR.some(function(v){
    var w=Math.min(r.right,v.right)-Math.max(r.left,v.left),h=Math.min(r.bottom,v.bottom)-Math.max(r.top,v.top);
    return w>0&&h>0&&w*h>=0.5*r.width*r.height
  })
}

// GR: oge ekranda gercekten gorunuyor mu. Gorunen alanin ortasindaki
// katmanlara bakilir; ustte ogenin kendi kartina (4 ust oge) ait olmayan bir
// katman varsa (yuzen video penceresi) ya da nokta ogenin disinda kaldiysa
// (kaydirmali seritte kirpilmis, gizli) simge konmaz.
function GR(i,r){
  var x1=Math.max(r.left,0),x2=Math.min(r.right,innerWidth),y1=Math.max(r.top,0),y2=Math.min(r.bottom,innerHeight);
  if(x2-x1<ES/2||y2-y1<ES/2)return false;
  var L=document.elementsFromPoint((x1+x2)/2,(y1+y2)/2),a=i,n=0;
  while(a.parentElement&&a.parentElement!==document.body&&a.parentElement!==document.documentElement&&n<4){a=a.parentElement;n++}
  for(var j=0;j<L.length;j++){
    var e=L[j];
    if(e.__ik)continue;
    if(e===i)return true;
    if(e.contains(i))return getComputedStyle(i).pointerEvents==='none';
    if(!a.contains(e))return false;
  }
  return false
}

function S(i){
  var r=i.getBoundingClientRect();
  var k=HR.get(i);
  if(r.width<ES||r.height<ES||(i.tagName==='IMG'&&O(r))||!GR(i,r)){if(k){k.remove();HR.delete(i)}return null}
  if(!k){
    k=document.createElement('div');k.textContent='\u2B07';k.__ik=1;
    k.style.cssText='position:absolute;width:28px;height:28px;border-radius:50%;background:rgba(0,0,0,.6);color:#fff;font:16px sans-serif;display:flex;align-items:center;justify-content:center;z-index:'+Z+';cursor:pointer';
    k.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();if(i.tagName==='VIDEO')V(i);else Y(B(i))},true);
    document.body.appendChild(k);HR.set(i,k)
  }
  var f=document.fullscreenElement,kp=f||document.body;
  if(k.parentNode!==kp)kp.appendChild(k);
  k.style.position=f?'fixed':'absolute';
  k.style.top=(r.top+(f?0:scrollY)+4)+'px';k.style.left=(r.right+(f?0:scrollX)-32)+'px';
  return k
}

function T(){
  HR.forEach(function(k,i){if(!i.isConnected||MOD!=='sabit'){k.remove();HR.delete(i)}});
  VR=[];document.querySelectorAll('video').forEach(function(v){var q=v.getBoundingClientRect();if(q.width>=ES&&q.height>=ES)VR.push(q)});
  if(MOD==='sabit')document.querySelectorAll('img,video').forEach(S)
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
var ZT;addEventListener('scroll',function(){clearTimeout(ZT);ZT=setTimeout(T,150)},true);
document.addEventListener('fullscreenchange',function(){setTimeout(T,300)});
})();
