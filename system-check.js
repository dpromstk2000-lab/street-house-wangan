(() => {
  'use strict';
  const cfg = window.DPRO_SITE_CONFIG || {};
  const pages = ['index.html','services.html','maintenance.html','custom.html','pricing.html','works.html','about.html','contact.html','privacy.html'];
  const tbody = document.getElementById('results');
  const totals = {pass:0,warn:0,fail:0};
  const esc = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  const add = (name,status,detail) => {
    totals[status]++;
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${esc(name)}</td><td><span class="check-status ${status}">${status==='pass'?'合格':status==='warn'?'注意':'失敗'}</span></td><td>${esc(detail)}</td>`;
    tbody.appendChild(tr);
  };
  const getJson = async url => { const response=await fetch(url,{cache:'no-store'}); const data=await response.json(); return {response,data}; };
  const run = async () => {
    tbody.innerHTML=''; totals.pass=totals.warn=totals.fail=0;
    add('サイト設定バージョン',cfg.version==='WANGAN-BIZ-5-SITE-20260806'?'pass':'fail',cfg.version||'未設定');
    add('公開API URL',/^https:\/\//.test(cfg.apiBase||'')?'pass':'fail',cfg.apiBase||'未設定');
    for (const page of pages) {
      try {
        const response=await fetch(page,{cache:'no-store'});
        if(!response.ok){add(page,'fail',`HTTP ${response.status}`);continue;}
        const html=await response.text(); const doc=new DOMParser().parseFromString(html,'text/html');
        add(`${page} / title`,doc.title.length>=12?'pass':'warn',doc.title||'未設定');
        add(`${page} / H1`,doc.querySelectorAll('h1').length===1?'pass':'fail',`${doc.querySelectorAll('h1').length}件`);
        add(`${page} / config.js`,doc.querySelector('script[src="config.js"]')?'pass':'fail','共有公開設定');
        add(`${page} / DPRO動的連携`,doc.querySelector('script[src="dpro-site.js"]')?'pass':'fail','営業時間・休日・サービス連携');
        const missing=[...doc.images].filter(img=>!img.getAttribute('alt'));
        add(`${page} / 画像alt`,missing.length===0?'pass':'warn',`${missing.length}件不足`);
        if(page==='contact.html'){
          add('WEB受付 / 4段階フォーム',doc.querySelectorAll('[data-step-panel]').length===4?'pass':'fail',`${doc.querySelectorAll('[data-step-panel]').length}画面`);
          add('WEB受付 / 3受付方式',doc.querySelectorAll('[data-open-mode]').length===3?'pass':'fail','即時予約・仮予約・写真相談');
          add('WEB受付 / 写真入力',doc.querySelector('#photoInput[multiple]')?'pass':'fail','最大5枚');
          add('WEB受付 / 実装JS',doc.querySelector('script[src="estimate.js"]')?'pass':'fail','DPRO登録・画像圧縮・二重送信防止');
        }
      } catch(error){add(page,'fail',error.message);}
    }
    try {
      const {response,data}=await getJson(`${cfg.apiBase}/health?step=WANGAN-BIZ-5`);
      add('DPRO Worker health',response.ok&&data.ok?'pass':'fail',`${data.version||'不明'} / ${data.status||'不明'}`);
      add('Service Binding',data.legacyOk&&data.legacyTransport==='service-binding'?'pass':'fail',data.legacyTransport||'不明');
      add('DBバージョン',data.versionOk?'pass':'fail',`${data.databaseVersion||'不明'} / expected ${data.expectedDatabaseVersion||'不明'}`);
      add('写真保存基盤',data.photoUploadReady?'pass':'fail',data.photoBucket||'未確認');
      const switches=data.switches||{};
      const enabled=[switches.booking,switches.provisional,switches.inquiry].filter(Boolean).length;
      add('WEB受付スイッチ',enabled===3?'pass':'warn',`ON ${enabled}/3（公開前OFFは正常）`);
    } catch(error){add('DPRO Worker health','fail',error.message);}
    try {
      const {response,data}=await getJson(`${cfg.apiBase}/api/public/site-bootstrap?shopCode=${encodeURIComponent(cfg.shopCode)}`);
      add('サイト初期情報API',response.ok&&data.ok?'pass':'fail',`${data.shopCode||''} / ${data.version||''}`);
      const services=Array.isArray(data.services)?data.services:[];
      add('公開サービス',services.length>=9?'pass':'warn',`${services.length}件`);
      add('即時予約サービス',services.some(item=>item.bookingMode==='instant')?'pass':'fail',`${services.filter(item=>item.bookingMode==='instant').length}件`);
      add('仮予約サービス',services.some(item=>item.bookingMode==='provisional')?'pass':'fail',`${services.filter(item=>item.bookingMode==='provisional').length}件`);
      add('写真相談サービス',services.some(item=>item.code==='photo_estimate'&&item.bookingMode==='inquiry')?'pass':'fail','photo_estimate');
      add('営業カレンダー',Array.isArray(data.calendar)&&data.calendar.length>0?'pass':'warn',`${data.calendar?.length||0}日分`);
    } catch(error){add('サイト初期情報API','fail',error.message);}
    document.getElementById('pass').textContent=totals.pass;
    document.getElementById('warn').textContent=totals.warn;
    document.getElementById('fail').textContent=totals.fail;
  };
  document.getElementById('run').addEventListener('click',run);
  run();
})();
