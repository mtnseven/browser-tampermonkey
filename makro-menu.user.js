// ==UserScript==
// @name         Makro Menü
// @namespace    local
// @version      6.2
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
  ]],
  ['\u{1F5BC}','Medya',[
    ['\u{1F50E}','Kaynaklar\u0131 listele','kaynakListe']
  ]]
];

// ===== ISLER =====
var ISLER={
  mdKopya:function(){K(MD(),'Markdown')},
  txtKopya:function(){K(document.body.innerText,'Metin')},
  mdIndir:function(){IN(MD(),'.md','text/markdown')},
  htmlIndir:function(){IN(document.documentElement.outerHTML,'.html','text/html')},
  kaynakListe:function(){LS()}
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

// LS: sayfadaki medya kaynaklarini listeler (acik ise kapatir)
// Mantik: gyng/list-sources, MIT, Copyright (c) 2017 Ng Guoyou
function LS(){
  var P=document.getElementById('__ls');
  if(P){P.parentNode.removeChild(P);return}
  var gor={},say=0,renk={img:'#45a1ff',video:'#ff0039',audio:'#30e60b',tara:'#0ff'};
  P=document.createElement('div');
  P.id='__ls';
  P.style.cssText='position:fixed;top:0;right:0;width:100%;max-width:480px;height:100%;overflow-y:auto;background:#1e1e1e;color:#ddd;font:13px sans-serif;z-index:2147483647;padding:8px;box-sizing:border-box';
  var kp=document.createElement('div');
  kp.textContent='\u2715  Kapat';
  kp.style.cssText='padding:10px;color:'+AYAR.vurgu+';font-weight:bold';
  kp.onclick=function(){P.parentNode.removeChild(P)};
  P.appendChild(kp);

  function satir(u,tip,el){
    if(!u||gor[u])return null;
    gor[u]=1;say++;
    var r=document.createElement('div');
    r.style.cssText='display:flex;align-items:center;margin:4px 0;border-left:3px solid '+renk[tip]+';padding-left:4px';
    var t=null;
    if(say<150){
      t=document.createElement(tip=='img'?'img':(tip=='audio'?'audio':'video'));
      t.style.cssText='width:40px;height:40px;min-width:40px;object-fit:contain;margin-right:6px;background:#000';
      t.setAttribute('preload','metadata');
      t.src=u;
      r.appendChild(t);
    }
    var sag=document.createElement('div');
    sag.style.cssText='min-width:0;flex:1';
    var a=document.createElement('a');
    a.href=u;a.target='_blank';
    a.textContent=u.indexOf('data:')==0?u.substr(0,60)+'\u2026':u;
    a.style.cssText='display:block;color:#6cb6ff;text-decoration:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
    var alt=document.createElement('div');
    alt.style.cssText='color:#888;margin-top:2px';
    var bil=document.createElement('span');
    function dg(y,f){var d=document.createElement('span');d.textContent=y;d.style.cssText='margin-right:12px;font-size:16px';d.onclick=f;alt.appendChild(d)}
    if(el&&el!==document.body)dg('\u{1F441}',function(){
      P.parentNode.removeChild(P);
      el.scrollIntoView({behavior:'smooth',block:'center'});
      var o=el.style.outline;el.style.outline='5px solid #ff0039';
      setTimeout(function(){el.style.outline=o},3000);
    });
    dg('\u{1F4CB}',function(){K(u,'Adres')});
    alt.appendChild(bil);
    if(t){
      if(tip=='img')t.onload=function(){bil.textContent=t.naturalWidth+'\u00d7'+t.naturalHeight};
      else t.onloadedmetadata=function(){
        var x=t.duration&&isFinite(t.duration)?Math.round(t.duration)+'s':'';
        if(t.videoHeight)x+=(x?' \u00b7 ':'')+t.videoWidth+'\u00d7'+t.videoHeight;
        bil.textContent=x;
      };
    }
    sag.appendChild(a);sag.appendChild(alt);r.appendChild(sag);
    return r;
  }

  function bolum(ad,liste,tip){
    var b=document.createElement('div'),n=0;
    for(var i=0;i<liste.length;i++){
      var r=satir(liste[i][0],tip,liste[i][1]);
      if(r){b.appendChild(r);n++}
    }
    if(!n)return;
    var h=document.createElement('div');
    h.textContent=ad+' ('+n+')';
    h.style.cssText='font:bold 15px sans-serif;margin:12px 0 6px;color:#fff';
    P.appendChild(h);P.appendChild(b);
  }

  function medya(sec){
    var l=[],E=document.querySelectorAll(sec);
    for(var i=0;i<E.length;i++){
      var e=E[i],u=e.currentSrc||e.src;
      if(u)l.push([u,e]);
      var s=e.querySelectorAll('source');
      for(var j=0;j<s.length;j++)if(s[j].src)l.push([s[j].src,e]);
    }
    return l;
  }

  var res=[],T=document.querySelectorAll('*');
  for(var i=0;i<T.length;i++){
    var e=T[i];
    if(e.tagName=='IMG'&&(e.currentSrc||e.src))res.push([e.currentSrc||e.src,e]);
    var bg=getComputedStyle(e).backgroundImage;
    if(bg&&bg!='none'){
      var m,rx=/url\(["']?(.*?)["']?\)/g;
      while((m=rx.exec(bg)))res.push([m[1],e]);
    }
  }

  var tar=[],R=performance.getEntriesByType?performance.getEntriesByType('resource'):[];
  for(var k=0;k<R.length;k++){
    if(/\.(mp4|webm|m4a|m4v|mp3|ogg|oga|wav|flac|mov|m3u8|mpd)(\?|#|$)/i.test(R[k].name)||R[k].initiatorType=='video'||R[k].initiatorType=='audio')tar.push([R[k].name,null]);
  }

  bolum('\u{1F3A5} Video',medya('video'),'video');
  bolum('\u{1F4FB} Ses',medya('audio'),'audio');
  bolum('\u{1F50E} Taranan',tar,'tara');
  bolum('\u{1F4F7} Resim',res,'img');
  if(!say){var y=document.createElement('div');y.textContent='Medya bulunamad\u0131';y.style.cssText='padding:10px';P.appendChild(y)}
  document.body.appendChild(P);
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
