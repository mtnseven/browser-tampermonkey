// ==UserScript==
// @name         Makro Menü
// @namespace    local
// @version      6.1
// @description  Yüzen iki katmanlı makro menü: kategori seç, maddeyi çalıştır
// @match        *://*/*
// @run-at       document-end
// @grant        none
// @updateURL    https://raw.githubusercontent.com/mtnseven/browser-tampermonkey/main/makro-menu.user.js
// @downloadURL  https://raw.githubusercontent.com/mtnseven/browser-tampermonkey/main/makro-menu.user.js
// ==/UserScript==

// ===== AYARLAR =====
var AYAR={
  simge:'\u2699',      // yuzen dugmenin ikonu
  sag:10,              // sagdan uzaklik (px)
  alt:100,             // alttan uzaklik (px)
  boy:44,              // dugme capi (px)
  zemin:'#222',
  yazi:'#fff',
  vurgu:'#0f0'
};

// ===== KATEGORI: [ikon, ad, [maddeler]] =====
// Madde: [ikon, ad, is anahtari]. Sira satir yeriyle degisir.
var KATEGORI=[
  ['\u{1F4E4}','D\u0131\u015fa aktar',[
    ['\u{1F4BE}','Markdown indir','mdIndir'],
    ['\u{1F4CB}','Markdown kopyala','mdKopya'],
    ['\u{1F4C4}','Metin kopyala','txtKopya'],
    ['\u{1F310}','HTML indir','htmlIndir']
  ]]
];

// ===== ISLER =====
var ISLER={
  mdKopya:function(){K(MD(),'Markdown')},
  txtKopya:function(){K(document.body.innerText,'Metin')},
  mdIndir:function(){IN(MD(),'.md','text/markdown')},
  htmlIndir:function(){IN(document.documentElement.outerHTML,'.html','text/html')}
};

// ===== YARDIMCILAR =====
function N(m){
  var n=document.createElement('div');
  n.textContent=m;
  n.style.cssText='position:fixed;left:50%;transform:translateX(-50%);bottom:'+(AYAR.alt+70)+'px;background:#000;color:'+AYAR.vurgu+';padding:8px 14px;border-radius:6px;font:13px sans-serif;z-index:2147483647';
  document.body.appendChild(n);
  setTimeout(function(){if(n.parentNode)n.parentNode.removeChild(n)},2000);
}

function K(t,ad){
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(t).then(function(){N(ad+': '+t.length)},function(){KE(t,ad)});
  }else KE(t,ad);
}

function KE(t,ad){
  var a=document.createElement('textarea');
  a.value=t;
  a.style.cssText='position:fixed;left:-9999px;top:0';
  document.body.appendChild(a);
  a.focus();a.select();
  var ok=false;
  try{ok=document.execCommand('copy')}catch(e){}
  a.parentNode.removeChild(a);
  N(ok?(ad+': '+t.length):(ad+' KOPYALANAMADI'));
}

function IN(t,uzanti,tip){
  var u=URL.createObjectURL(new Blob([t],{type:tip}));
  var a=document.createElement('a');
  a.href=u;
  a.download=(document.title||'sayfa').replace(/[^\w\u00c0-\u024f -]/g,'').substr(0,50)+uzanti;
  document.body.appendChild(a);
  a.click();
  a.parentNode.removeChild(a);
  setTimeout(function(){URL.revokeObjectURL(u)},4000);
  N('indiriliyor');
}

function MD(){
  var c=document.body.cloneNode(true);
  var s=c.querySelectorAll('script,style,noscript,svg,iframe');
  for(var i=0;i<s.length;i++)s[i].parentNode.removeChild(s[i]);
  var L=c.querySelectorAll('a');
  for(var j=0;j<L.length;j++){
    var h=L[j].href||'';
    var y=L[j].textContent.replace(/\s+/g,' ');
    L[j].textContent=' ['+(y||h)+']('+h+') ';
  }
  c.style.position='fixed';
  c.style.left='-9999px';
  c.style.top='0';
  c.style.width='800px';
  document.body.appendChild(c);
  var r=c.innerText;
  c.parentNode.removeChild(c);
  return '# '+document.title+'\n'+location.href+'\n\n'+r;
}

// ===== ARAYUZ =====
var B=document.createElement('div');
B.textContent=AYAR.simge;
B.style.cssText='position:fixed;right:'+AYAR.sag+'px;bottom:'+AYAR.alt+'px;width:'+AYAR.boy+'px;height:'+AYAR.boy+'px;line-height:'+AYAR.boy+'px;text-align:center;background:'+AYAR.zemin+';color:'+AYAR.yazi+';font:20px sans-serif;z-index:2147483647;border-radius:50%;opacity:.85';

var M=document.createElement('div');
M.style.cssText='position:fixed;right:'+AYAR.sag+'px;bottom:'+(AYAR.alt+AYAR.boy+6)+'px;background:'+AYAR.zemin+';color:'+AYAR.yazi+';font:14px sans-serif;z-index:2147483647;border-radius:8px;display:none;min-width:180px';

document.body.appendChild(B);
document.body.appendChild(M);

// Tek satir: yazi ve tiklaninca ne olacagi
function S(y,f,ek){
  var d=document.createElement('div');
  d.textContent=y;
  d.style.cssText='padding:11px 14px;border-bottom:1px solid #3a3a3a;'+(ek||'');
  d.onclick=function(e){e.stopPropagation();f()};
  M.appendChild(d);
}

// k yoksa kategori listesi, varsa o kategorinin maddeleri
function CIZ(k){
  M.textContent='';
  if(!k){
    for(var i=0;i<KATEGORI.length;i++)(function(c){
      S(c[0]+'  '+c[1]+'  \u203A',function(){CIZ(c)});
    })(KATEGORI[i]);
    return;
  }
  S('\u2039  '+k[1],function(){CIZ()},'color:'+AYAR.vurgu);
  for(var j=0;j<k[2].length;j++)(function(t){
    S(t[0]+'  '+t[1],function(){
      M.style.display='none';
      try{ISLER[t[2]]()}catch(x){N('hata: '+x.message)}
    });
  })(k[2][j]);
}

B.onclick=function(e){
  e.stopPropagation();
  if(M.style.display=='block'){M.style.display='none';return}
  CIZ();
  M.style.display='block';
};
document.onclick=function(){M.style.display='none'};
