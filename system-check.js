(() => {
  'use strict';
  const cfg = window.DPRO_SITE_CONFIG || {};
  const pages = ['index.html','services.html','maintenance.html','custom.html','pricing.html','works.html','about.html','contact.html','privacy.html'];
  const tbody = document.getElementById('results');
  const totals = {pass:0,warn:0,fail:0};
  const esc = v => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  const add = (name,status,detail) => {
    totals[status]++;
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${esc(name)}</td><td><span class="check-status ${status}">${status==='pass'?'合格':status==='warn'?'注意':'失敗'}</span></td><td>${esc(detail)}</td>`;
    tbody.appendChild(tr);
  };
  const getJson = async url => { const r=await fetch(url,{cache:'no-store'}); const d=await r.json(); return {r,d}; };
  const run = async () => {
    tbody.innerHTML=''; totals.pass=totals.warn=totals.fail=0;
    add('サイト設定バージョン',cfg.version==='WANGAN-BIZ-4-SITE-20260805'?'pass':'fail',cfg.version||'未設定');
    add('公開API URL',/^https:\/\//.test(cfg.apiBase||'')?'pass':'fail',cfg.apiBase||'未設定');
    for (const page of pages) {
      try {
        const res=await fetch(page,{cache:'no-store'});
        if(!res.ok){add(page,'fail',`HTTP ${res.status}`);continue;}
        const html=await res.text(); const doc=new DOMParser().parseFromString(html,'text/html');
        add(`${page} / title`,doc.title.length>=12?'pass':'warn',doc.title||'未設定');
        add(`${page} / H1`,doc.querySelectorAll('h1').length===1?'pass':'fail',`${doc.querySelectorAll('h1').length}件`);
        add(`${page} / config.js`,doc.querySelector('script[src="config.js"]')?'pass':'fail','共有公開設定');
        add(`${page} / DPRO動的連携`,doc.querySelector('script[src="dpro-site.js"]')?'pass':'fail','営業時間・休日・サービス連携');
        const missing=[...doc.images].filter(img=>!img.getAttribute('alt'));
        add(`${page} / 画像alt`,missing.length===0?'pass':'warn',`${missing.length}件不足`);
      } catch(e){add(page,'fail',e.message);}
    }
    try {
      const {r,d}=await getJson(`${cfg.apiBase}/health?step=WANGAN-BIZ-4`);
      add('DPRO Worker health',r.ok&&d.ok?'pass':'fail',`${d.version||'不明'} / ${d.status||'不明'}`);
      add('Service Binding',d.legacyOk&&d.legacyTransport==='service-binding'?'pass':'fail',`${d.legacyTransport||'不明'}`);
      add('DBバージョン',d.versionOk?'pass':'fail',d.databaseVersion||'不明');
    } catch(e){add('DPRO Worker health','fail',e.message);}
    try {
      const {r,d}=await getJson(`${cfg.apiBase}/api/public/site-bootstrap?shopCode=${encodeURIComponent(cfg.shopCode)}`);
      add('サイト初期情報API',r.ok&&d.ok?'pass':'fail',`${d.shopCode||''} / ${d.version||''}`);
      add('公開サービス',Array.isArray(d.services)&&d.services.length>0?'pass':'warn',`${d.services?.length||0}件`);
      add('営業カレンダー',Array.isArray(d.calendar)&&d.calendar.length>0?'pass':'warn',`${d.calendar?.length||0}日分`);
      add('公開お知らせ',Array.isArray(d.notices)?'pass':'fail',`${d.notices?.length||0}件`);
    } catch(e){add('サイト初期情報API','fail',e.message);}
    document.getElementById('pass').textContent=totals.pass; document.getElementById('warn').textContent=totals.warn; document.getElementById('fail').textContent=totals.fail;
  };
  document.getElementById('run').addEventListener('click',run); run();
})();
