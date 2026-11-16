#!/usr/bin/env python3
# Web Ajanı kaydından toplanan yanıtları ham hâliyle JSON Lines dosyasına çıkarır.
# Çıktı değer içerir (ör. sağlık kaydı); sohbete basılmaz, sunucuda kodla işlenir.
# Kullanım: cikar.py KAYIT.json CIKTI.jsonl [--istek "POST /api/x"] [--tur toplama|istek]
import json, sys

args = sys.argv[1:]
if len(args) < 2:
    sys.exit('Kullanım: cikar.py KAYIT.json CIKTI.jsonl [--istek "YONTEM /yol"] [--tur toplama|istek]')
giris, cikis = args[0], args[1]
istek = args[args.index('--istek') + 1] if '--istek' in args else None
tur = args[args.index('--tur') + 1] if '--tur' in args else 'toplama'
veri = json.load(open(giris, encoding='utf-8'))
son_istek = None
n = bayt = 0
with open(cikis, 'w', encoding='utf-8') as f:
    for o in veri.get('olaylar', []):
        if o['tur'] == 'toplama' and o.get('basladi'):
            son_istek = o.get('istek')
        if o['tur'] != tur or not o.get('yanit'):
            continue
        ad = son_istek if tur == 'toplama' else '%s %s' % (o.get('yontem'), o.get('adres', '').split('?')[0])
        if istek and ad != istek:
            continue
        kayit = {'istek': ad, 'degerler': o.get('degerler'), 'adres': o.get('adres'), 'durum': o.get('durum'), 'zaman': o.get('zaman')}
        y = o['yanit']
        try:
            kayit['json'] = json.loads(y)
        except ValueError:
            kayit['metin'] = y
        f.write(json.dumps(kayit, ensure_ascii=False) + '\n')
        n += 1; bayt += len(y)
print('%d yanıt, %d KB → %s' % (n, bayt // 1024, cikis))
