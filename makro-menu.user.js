// ==UserScript==
// @name         Makro Menü
// @namespace    local
// @version      7.1
// @description  Yüzen iki katmanlı makro menü: kategori seç, maddeyi çalıştır
// @match        *://*/*
// @run-at       document-end
// @noframes
// @grant        GM_xmlhttpRequest
// @connect      *
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

// ===== KATEGORI =====
// Kategori: [ikon, ad, [maddeler]]. Madde: [ikon, ad, is anahtari].
// Ana menude dogrudan madde de durabilir (ucuncu oge is anahtari).
// Sira satir yeriyle degisir.
var KATEGORI=[
  ['\u{1F50E}','Kaynaklar\u0131 listele','kaynakListe'],
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

// ID: adresteki dosyayi indirir. Baska alandaysa GM_xmlhttpRequest ile
// blob cekilir (tarayici capraz alanda download'u yok sayar).
function ID(u){
  var ad=(u.split(/[?#]/)[0].split('/').pop()||'dosya');
  try{ad=decodeURIComponent(ad)}catch(e){}
  ad=ad.replace(/[\\\/:*?"<>|]/g,'_').substr(0,80)||'dosya';
  function ver(h,a){
    var x=document.createElement('a');
    x.href=h;x.download=a;
    document.body.appendChild(x);x.click();x.parentNode.removeChild(x);
  }
  if(/^(blob|data):/.test(u)){ver(u,ad.indexOf('.')<0?ad+'.bin':ad);N('indiriliyor');return}
  if(typeof GM_xmlhttpRequest!='function'){window.open(u,'_blank');return}
  N('indiriliyor\u2026');
  GM_xmlhttpRequest({method:'GET',url:u,responseType:'blob',anonymous:true,
    onload:function(r){
      if(r.status<200||r.status>=300||!r.response){N('indirilemedi ('+r.status+'), a\u00e7\u0131l\u0131yor');window.open(u,'_blank');return}
      var b=r.response;
      if(ad.indexOf('.')<0&&b.type)ad+='.'+b.type.split('/')[1].split(/[;+]/)[0];
      var h=URL.createObjectURL(b);
      ver(h,ad);
      setTimeout(function(){URL.revokeObjectURL(h)},60000);
      N('indirildi: '+Math.round(b.size/1024)+' KB');
    },
    onerror:function(){N('indirilemedi, a\u00e7\u0131l\u0131yor');window.open(u,'_blank')}
  });
}

// LS: sayfadaki medya kaynaklarini listeler (acik ise kapatir)
// Mobil (dokunmatik veya dar ekran): panel alttan acilir, tutamacla
// kucuk / %40 / tam ekran; onizleme ustte yuzen pencerede.
// Mantik: gyng/list-sources, MIT, Copyright (c) 2017 Ng Guoyou
// Arayuz Shadow DOM icinde: sayfanin CSS'i listeye karismaz.
function LS(){
  var H=document.getElementById('__ls');
  if(H){if(!(H.__ac&&H.__ac()))H.parentNode.removeChild(H);return}
  H=document.createElement('div');H.id='__ls';
  H.style.cssText='position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647';
  var D=H.attachShadow?H.attachShadow({mode:'open'}):H;
  var st=document.createElement('style');
  st.textContent='*{box-sizing:border-box;margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}'+
    '.p{position:fixed;top:0;right:0;width:100%;max-width:460px;height:100%;display:flex;flex-direction:column;background:#16181d;color:#e6e6e6;font-size:13px;box-shadow:-4px 0 24px rgba(0,0,0,.5);border-left:1px solid #2a2d35}'+
    '.bs{flex:none;padding:12px 14px 10px;background:#1c1f26;border-bottom:1px solid #2a2d35}'+
    '.ust{display:flex;align-items:center;justify-content:space-between;gap:10px}'+
    '.bl{font-size:16px;font-weight:600}.bl small{font-size:12px;font-weight:400;color:#9aa0aa;margin-left:6px}'+
    '.kp{flex:none;width:36px;height:36px;border-radius:50%;border:0;background:#2a2d35;color:#fff;font-size:16px;cursor:pointer}.kp:hover{background:#e5484d}'+
    '.sek{display:flex;gap:6px;margin-top:10px;overflow-x:auto}'+
    '.sk{flex:none;padding:5px 11px;border-radius:14px;background:#2a2d35;color:#bbb;font-size:12px;cursor:pointer;border:0}.sk.a{background:#3b82f6;color:#fff}'+
    '.on{flex:none;display:none;position:relative;background:#000;border-bottom:1px solid #2a2d35}'+
    '.on video,.on img,.on audio{display:block;max-width:100%;max-height:38vh;margin:0 auto}'+
    '.on .uy{padding:14px;color:#f99}'+
    '.onk{position:absolute;top:6px;right:6px;z-index:1;width:30px;height:30px;border-radius:50%;border:0;background:rgba(0,0,0,.7);color:#fff;cursor:pointer}'+
    '.gv{flex:1;overflow-y:auto;position:relative;padding:4px 10px 24px}'+
    '.bb{margin:14px 2px 6px;font-size:11px;font-weight:600;color:#9aa0aa;text-transform:uppercase;letter-spacing:.6px}'+
    '.kart{display:flex;gap:10px;padding:8px;margin:6px 0;background:#1f222a;border-radius:10px;border-left:3px solid #555}'+
    '.kart.yeni{animation:y 2.5s}@keyframes y{from{background:#34405a}to{background:#1f222a}}'+
    '.kc{width:56px;height:56px;flex:none;border-radius:6px;background:#000;object-fit:contain}'+
    '.ki{min-width:0;flex:1}'+
    '.ka{display:block;color:#8ab4ff;text-decoration:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
    '.kb{color:#888;font-size:11px;margin-top:3px}'+
    '.dg{display:flex;gap:6px;margin-top:7px;flex-wrap:wrap}'+
    '.d{padding:5px 9px;border-radius:6px;background:#2a2d35;color:#ddd;font-size:12px;cursor:pointer;border:0}.d:hover{background:#3b82f6;color:#fff}'+
    '.bos{padding:16px;color:#888}'+
    '.p.sol{right:auto;left:0;border-left:0;border-right:1px solid #2a2d35}'+
    '.tt,.ad{display:none}'+
    '.cs{position:fixed;display:none;pointer-events:none;border:4px solid #ff0039;border-radius:8px;box-shadow:0 0 0 2px rgba(255,255,255,.85),0 0 18px 4px rgba(255,0,57,.6);transition:opacity .4s;animation:cs 1s ease-in-out 3}'+
    '@keyframes cs{50%{border-color:#ffd60a}}'+
    '.p.m{top:auto;left:0;right:0;max-width:none;height:40%;border-left:0;border-top:1px solid #2a2d35;border-radius:14px 14px 0 0;box-shadow:0 -4px 24px rgba(0,0,0,.5);font-size:14px}'+
    '.p.m.an{transition:height .2s,top .2s}'+
    '.p.m .bs{padding:12px 14px 8px}'+
    '.p.m .tt{display:block;margin:-12px -14px 0;padding:8px 0 6px;touch-action:none}'+
    '.p.m .tt i{display:block;width:44px;height:5px;margin:0 auto;border-radius:3px;background:#555}'+
    '.p.m .ust{touch-action:none}'+
    '.p.m .kp{width:40px;height:40px}'+
    '.p.m .sk{padding:7px 12px;font-size:13px}'+
    '.p.m .gv{padding:2px 8px 24px}'+
    '.p.m .kart{padding:6px;margin:4px 0;gap:8px}'+
    '.p.m .kart.ac{background:#262a33}'+
    '.p.m .kc{width:48px;height:48px}'+
    '.p.m .ka{display:none}.p.m .ad{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#cfd6e4}'+
    '.p.m .dg{display:none}.p.m .kart.ac .dg{display:flex}'+
    '.p.m .d{padding:9px 12px;font-size:13px}'+
    '.on.f{position:fixed;left:8px;right:8px;border:1px solid #2a2d35;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.6)}'+
    '.on.f video,.on.f img{max-height:var(--mh)}'+
    '.on.f audio{width:calc(100% - 64px);margin:8px}'+
    '.on.f .onk{width:44px;height:44px;font-size:18px;top:6px;right:6px}';
  D.appendChild(st);
  function el(t,c,y){var e=document.createElement(t);if(c)e.className=c;if(y)e.textContent=y;return e}

  var gor={},say=0,filtre='',renk={video:'#ff4d6d',audio:'#30e60b',tara:'#22d3ee',img:'#60a5fa'};
  var ADI={video:'Video',audio:'Ses',tara:'Taranan',img:'Resim'},SIRA=['video','audio','tara','img'];
  var P=el('div','p'),BS=el('div','bs'),UST=el('div','ust'),BL=el('div','bl','Kaynaklar'),SAY=el('small');
  BL.appendChild(SAY);
  var KP=el('button','kp','\u2715');KP.title='Kapat';
  KP.onclick=function(){H.parentNode.removeChild(H)};
  var TT=el('div','tt');TT.appendChild(el('i'));BS.appendChild(TT);
  UST.appendChild(BL);UST.appendChild(KP);BS.appendChild(UST);
  var SEK=el('div','sek');BS.appendChild(SEK);
  var ON=el('div','on'),G=el('div','gv'),Y=el('div','bos','Medya bulunamad\u0131 (liste a\u00e7\u0131kken taramaya devam ediyor)');
  P.appendChild(BS);P.appendChild(ON);P.appendChild(G);
  D.appendChild(P);

  // Mobil duzen: dokunmatik (masaustu sitesi modu dahil) veya dar ekran
  var mq1=matchMedia('(pointer:coarse)'),mq2=matchMedia('(max-width:600px)'),MOB=null,dur='y',acik=null;
  function vh(){return window.visualViewport?visualViewport.height:innerHeight}
  function yuk(d){d=d||dur;return d=='t'?vh():(d=='k'?BS.offsetHeight:Math.round(vh()*.4))}
  function konum(h){
    if(!MOB){P.style.height='';P.style.top='';ON.style.top='';return}
    var ot=window.visualViewport?visualViewport.offsetTop:0;
    if(h==null)h=yuk();
    P.style.height=h+'px';P.style.top=(ot+vh()-h)+'px';
    ON.style.top=(ot+8)+'px';ON.style.setProperty('--mh',Math.max(vh()-h-24,120)+'px');
  }
  function durum(d){dur=d;P.classList.add('an');konum();setTimeout(function(){P.classList.remove('an')},250)}
  function uygula(){
    var m=mq1.matches||mq2.matches;
    if(m===MOB)return;
    MOB=m;
    if(m){P.classList.add('m');P.classList.remove('sol');ON.classList.add('f');D.appendChild(ON)}
    else{P.classList.remove('m');ON.classList.remove('f');P.insertBefore(ON,G);if(acik){acik.classList.remove('ac');acik=null}}
    konum();
  }
  // Tutamac: surukleme en yakin duraga oturur; dokunma k>y>t>y dongusu
  var cy=0,ch=0,cb=false,cs=false;
  function bas(x){if(!MOB||x.target===KP)return;cb=true;cs=false;cy=x.clientY;ch=P.offsetHeight;try{x.currentTarget.setPointerCapture(x.pointerId)}catch(e){}}
  function cek(x){
    if(!cb)return;var dy=cy-x.clientY;
    if(Math.abs(dy)>6)cs=true;
    if(cs)konum(Math.max(yuk('k'),Math.min(yuk('t'),ch+dy)));
  }
  function birak(){
    if(!cb)return;cb=false;
    if(!cs){durum(dur=='k'?'y':(dur=='y'?'t':'y'));return}
    var h=P.offsetHeight,en='y',fm=1e9;
    ['k','y','t'].forEach(function(d){var f=Math.abs(yuk(d)-h);if(f<fm){fm=f;en=d}});
    durum(en);
  }
  [TT,UST].forEach(function(z){
    z.addEventListener('pointerdown',bas);z.addEventListener('pointermove',cek);
    z.addEventListener('pointerup',birak);z.addEventListener('pointercancel',birak);
  });
  function kz(){if(!cb)konum()}
  function mqd(q,f){if(q.addEventListener)q[f?'addEventListener':'removeEventListener']('change',uygula);else q[f?'addListener':'removeListener'](uygula)}
  // Menuden tekrar cagrilinca: kucultulmusse kapatmak yerine acar
  H.__ac=function(){if(MOB&&dur=='k'){durum('y');return true}return false};

  var sec={},skD={};
  function sekme(k,ad){
    var b=el('button','sk',ad);b.onclick=function(){filtre=k;cizF()};
    SEK.appendChild(b);skD[k]=b;
  }
  function cizF(){
    for(var k in skD)skD[k].className='sk'+(k==filtre?' a':'');
    for(var i=0;i<SIRA.length;i++){var s=sec[SIRA[i]];var g=s.n&&(!filtre||filtre==SIRA[i]);s.h.style.display=g?'block':'none';s.b.style.display=g?'block':'none'}
    G.scrollTop=0;
  }
  function sayac(){
    SAY.textContent=say+' \u00f6\u011fe';skD[''].textContent='T\u00fcm\u00fc '+say;
    for(var i=0;i<SIRA.length;i++){var s=sec[SIRA[i]];skD[SIRA[i]].textContent=ADI[SIRA[i]]+' '+s.n;skD[SIRA[i]].style.display=s.n?'':'none'}
  }

  var onU='';
  function izle(u,tip){
    ON.textContent='';
    if(onU==u){ON.style.display='none';onU='';return}
    onU=u;ON.style.display='block';
    if(MOB&&dur=='t')durum('y');
    var k=el('button','onk','\u2715');k.onclick=function(){ON.textContent='';ON.style.display='none';onU=''};
    ON.appendChild(k);
    if(/^(blob|mediastream):/.test(u)||/\.(m3u8|mpd)(\?|#|$)/i.test(u)){ON.appendChild(el('div','uy','Ak\u0131\u015f kayna\u011f\u0131, burada oynat\u0131lamaz'));return}
    var v=el(tip=='img'?'img':(tip=='audio'?'audio':'video'));
    v.onerror=function(){ON.appendChild(el('div','uy','Oynat\u0131lamad\u0131 (kaynak reddetti veya bi\u00e7im desteklenmiyor)'))};
    if(tip!='img'){v.controls=true;v.setAttribute('playsinline','')}
    v.src=u;ON.appendChild(v);
    if(tip!='img'&&v.play){var pr=v.play();if(pr&&pr.catch)pr.catch(function(){})}
  }
  // Cerceve: ogenin kendi stiline dokunmaz; ust ogenin overflow kirpmasi
  // ve sitenin CSS'i etkilemez. 4 sn ogeyi izler, sonra soner.
  var CS=el('div','cs'),csZ=0,csO=null;D.insertBefore(CS,P);
  function cerceve(e){
    csO=e;csZ=Date.now()+4000;CS.style.opacity='1';
    (function iz(){
      if(csO!==e)return;
      var r=e.getBoundingClientRect();
      CS.style.top=(r.top-6)+'px';CS.style.left=(r.left-6)+'px';CS.style.width=(r.width+12)+'px';CS.style.height=(r.height+12)+'px';
      CS.style.display='block';
      if(Date.now()<csZ)requestAnimationFrame(iz);
      else{CS.style.opacity='0';setTimeout(function(){if(csO===e){CS.style.display='none';csO=null}},400)}
    })();
  }

  // Panel kapanmaz. Mobil: oge panelin ustundeki alanin ortasina gelir.
  // PC: oge panelin arkasinda kaliyorsa panel karsi kenara gecer.
  function goster(e){
    if(MOB){if(dur=='t')durum('y');ON.textContent='';ON.style.display='none';onU=''}
    e.scrollIntoView({block:'center'});
    var r=e.getBoundingClientRect(),alan=MOB?vh()-yuk():vh();
    window.scrollBy(0,Math.round(r.top+r.height/2-alan/2));
    if(!MOB){
      var x=r.left+r.width/2,w=P.offsetWidth,sol=P.classList.contains('sol');
      if(sol?x<w:x>innerWidth-w)P.classList.toggle('sol');
    }
    cerceve(e);
  }

  // Ayni adres once Taranan'da cikip sonra video ogesinde bulunursa Video'ya tasinir
  function satir(u,tip,e){
    if(!u)return null;
    var g=gor[u];
    if(g){
      if(!(g.t=='tara'&&(tip=='video'||tip=='audio')))return null;
      if(g.r.parentNode)g.r.parentNode.removeChild(g.r);
      sec.tara.n--;say--;sec.tara.h.textContent=ADI.tara+' ('+sec.tara.n+')';cizF2('tara');
    }
    say++;
    var r=el('div','kart');r.style.borderLeftColor=renk[tip];
    var t=null;
    if(say<150){
      t=el(tip=='img'?'img':(tip=='audio'?'audio':'video'),'kc');
      t.setAttribute('preload','metadata');t.muted=true;t.src=u;
      r.appendChild(t);
    }
    var ki=el('div','ki'),a=el('a','ka',u.indexOf('data:')==0?u.substr(0,60)+'\u2026':u);
    a.href=u;a.target='_blank';a.title=u;
    var dn=u.indexOf('data:')==0?'data: '+ADI[tip]:(u.split(/[?#]/)[0].split('/').pop()||u);
    try{dn=decodeURIComponent(dn)}catch(x){}
    var ad=el('div','ad',dn);
    var kb=el('div','kb',ADI[tip]),dg=el('div','dg');
    function d(y,f,ip){var b=el('button','d',y);b.title=ip;b.onclick=function(x){x.stopPropagation();f()};dg.appendChild(b)}
    d('\u25B6 \u0130zle',function(){izle(u,tip)},'Listenin \u00fcst\u00fcnde \u00f6nizle');
    d('\u2B07 \u0130ndir',function(){ID(u)},'Dosyay\u0131 indir');
    if(e&&e!==document.body)d('\u{1F441} G\u00f6ster',function(){goster(e)},'Sayfada nerede oldu\u011funu g\u00f6ster');
    d('\u{1F4CB} Kopyala',function(){K(u,'Adres')},'Adresi kopyala');
    if(t){
      if(tip=='img')t.onload=function(){kb.textContent=ADI[tip]+' \u00b7 '+t.naturalWidth+'\u00d7'+t.naturalHeight};
      else t.onloadedmetadata=function(){
        var x=ADI[tip];
        if(t.duration&&isFinite(t.duration))x+=' \u00b7 '+Math.round(t.duration)+' sn';
        if(t.videoHeight)x+=' \u00b7 '+t.videoWidth+'\u00d7'+t.videoHeight;
        kb.textContent=x;
      };
    }
    ki.appendChild(a);ki.appendChild(ad);ki.appendChild(kb);ki.appendChild(dg);r.appendChild(ki);
    r.onclick=function(){
      if(!MOB)return;
      if(acik&&acik!==r)acik.classList.remove('ac');
      r.classList.toggle('ac');acik=r.classList.contains('ac')?r:null;
    };
    gor[u]={t:tip,r:r};
    return r;
  }

  // yeni: tarama sirasinda bulunan video/taranan ogesi; en uste konur, liste oraya kayar
  function ekle(u,tip,e,yeni){
    var s=sec[tip],r=satir(u,tip,e);
    if(!r)return;
    if(yeni&&(tip=='video'||tip=='tara')){
      s.b.insertBefore(r,s.b.firstChild);r.className+=' yeni';
    }else s.b.appendChild(r);
    s.n++;s.h.textContent=ADI[tip]+' ('+s.n+')';
    if(Y.parentNode)Y.parentNode.removeChild(Y);
    sayac();cizF2(tip);
    if(yeni&&(tip=='video'||tip=='tara')&&(!filtre||filtre==tip))G.scrollTop=Math.max(0,s.h.offsetTop-6);
  }
  function cizF2(tip){var s=sec[tip],g=s.n&&(!filtre||filtre==tip);s.h.style.display=g?'block':'none';s.b.style.display=g?'block':'none'}

  sekme('','T\u00fcm\u00fc');
  for(var q=0;q<SIRA.length;q++){
    var h=el('div','bb'),b=el('div');h.style.display='none';
    G.appendChild(h);G.appendChild(b);
    sec[SIRA[q]]={h:h,b:b,n:0};
    sekme(SIRA[q],ADI[SIRA[q]]);
  }

  function medyaMi(e){return /\.(mp4|webm|m4a|m4v|mp3|ogg|oga|wav|flac|mov|m3u8|mpd)(\?|#|$)/i.test(e.name)||e.initiatorType=='video'||e.initiatorType=='audio'}
  function medya(sc){
    var l=[],E=document.querySelectorAll(sc);
    for(var i=0;i<E.length;i++){
      var e=E[i],u=e.currentSrc||e.src;
      if(u)l.push([u,e]);
      var s=e.querySelectorAll('source');
      for(var j=0;j<s.length;j++)if(s[j].src)l.push([s[j].src,e]);
    }
    return l;
  }
  function yukle(l,tip){for(var i=0;i<l.length;i++)ekle(l[i][0],tip,l[i][1])}

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
  for(var k=0;k<R.length;k++)if(medyaMi(R[k]))tar.push([R[k].name,null]);

  yukle(medya('video'),'video');
  yukle(medya('audio'),'audio');
  yukle(tar,'tara');
  yukle(res,'img');
  if(!say)G.appendChild(Y);
  sayac();cizF();
  document.body.appendChild(H);
  uygula();
  mqd(mq1,1);mqd(mq2,1);
  if(window.visualViewport){visualViewport.addEventListener('resize',kz);visualViewport.addEventListener('scroll',kz)}
  addEventListener('resize',kz);

  // Liste acikken surekli tarama: oynatilan video, yeni yuklenen dosya, yeni resim
  function tekrar(){
    var l=medya('video');for(var i=0;i<l.length;i++)ekle(l[i][0],'video',l[i][1],1);
    l=medya('audio');for(i=0;i<l.length;i++)ekle(l[i][0],'audio',l[i][1]);
    var I=document.querySelectorAll('img');
    for(i=0;i<I.length;i++)ekle(I[i].currentSrc||I[i].src,'img',I[i]);
  }
  function olay(e){var t=e.target;if(t&&(t.tagName=='VIDEO'||t.tagName=='AUDIO'))setTimeout(tekrar,300)}
  var gz=null;
  try{if(performance.setResourceTimingBufferSize)performance.setResourceTimingBufferSize(3000)}catch(e){}
  try{
    gz=new PerformanceObserver(function(L){
      var E=L.getEntries();
      for(var i=0;i<E.length;i++)if(medyaMi(E[i]))ekle(E[i].name,'tara',null,1);
    });
    gz.observe({entryTypes:['resource']});
  }catch(e){gz=null}
  document.addEventListener('loadstart',olay,true);
  document.addEventListener('play',olay,true);
  var zm=setInterval(function(){
    if(!document.getElementById('__ls')){
      clearInterval(zm);
      if(gz)gz.disconnect();
      document.removeEventListener('loadstart',olay,true);
      document.removeEventListener('play',olay,true);
      mqd(mq1,0);mqd(mq2,0);
      if(window.visualViewport){visualViewport.removeEventListener('resize',kz);visualViewport.removeEventListener('scroll',kz)}
      removeEventListener('resize',kz);
      return;
    }
    tekrar();
  },1500);
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

// Maddeyi calistirir
function CAL(t){
  M.style.display='none';
  try{ISLER[t[2]]()}catch(x){N('hata: '+x.message)}
}

// k yoksa ana liste (kategoriler + dogrudan maddeler), varsa o kategorinin maddeleri
function CIZ(k){
  M.textContent='';
  if(!k){
    for(var i=0;i<KATEGORI.length;i++)(function(c){
      if(typeof c[2]=='string')S(c[0]+'  '+c[1],function(){CAL(c)});
      else S(c[0]+'  '+c[1]+'  \u203A',function(){CIZ(c)});
    })(KATEGORI[i]);
    return;
  }
  S('\u2039  '+k[1],function(){CIZ()},'color:'+AYAR.vurgu);
  for(var j=0;j<k[2].length;j++)(function(t){
    S(t[0]+'  '+t[1],function(){CAL(t)});
  })(k[2][j]);
}

B.onclick=function(e){
  e.stopPropagation();
  if(M.style.display=='block'){M.style.display='none';return}
  CIZ();
  M.style.display='block';
};
document.onclick=function(){M.style.display='none'};
