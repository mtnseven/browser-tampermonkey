// ==UserScript==
// @name         Indirme Test
// @namespace    local
// @version      1.0
// @description  Medya Indir on kosulu: GM_download ve blob indirme yollarini mobilde sinar. Gecici betik.
// @match        *://*/*
// @run-at       document-end
// @noframes
// @grant        GM_download
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

function Y1(u){
  try{
    GM_download({url:u,name:'test1_'+A(u),headers:{Referer:location.href},
      onload:function(){N('1 GM_download: TAMAM')},
      onerror:function(e){N('1 GM_download: HATA '+(e&&(e.error||e.details)||'?'))}
    })
  }catch(e){N('1 GM_download: '+e.message)}
}

function Y2(u){
  GM_xmlhttpRequest({method:'GET',url:u,responseType:'blob',anonymous:true,
    onload:function(r){
      if(r.status!==200){N('2 blob: durum '+r.status);return}
      var x=URL.createObjectURL(r.response),a=document.createElement('a');
      a.href=x;a.download='test2_'+A(u);document.body.appendChild(a);a.click();a.remove();
      setTimeout(function(){URL.revokeObjectURL(x)},30000);
      N('2 blob: tiklandi ('+Math.round(r.response.size/1024)+' KB)')
    },
    onerror:function(){N('2 blob: ag hatasi')}
  })
}

var b=document.createElement('div');
b.textContent='\u2B07\uFE0F';
b.style.cssText='position:fixed;left:14px;bottom:90px;width:46px;height:46px;border-radius:50%;background:#1565c0;color:#fff;font-size:22px;display:flex;align-items:center;justify-content:center;z-index:'+Z+';box-shadow:0 2px 6px rgba(0,0,0,.4);cursor:pointer';
b.onclick=function(){
  var i=R();
  if(!i){N('Sayfada resim bulunamadi');return}
  var u=i.currentSrc;
  N('Hedef: '+i.naturalWidth+'x'+i.naturalHeight+' '+u,10);
  Y1(u);
  setTimeout(function(){Y2(u)},3000)
};
document.body.appendChild(b);
})();
