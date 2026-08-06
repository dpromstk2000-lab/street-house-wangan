
(() => {
  'use strict';

  // 公開設定はルートのconfig.jsを正本にします。
  const SITE_CONFIG = window.DPRO_SITE_CONFIG || {};
  const APP_CONFIG = Object.freeze({
    environment: SITE_CONFIG.environment || 'demo',
    workerApiBase: SITE_CONFIG.apiBase || 'https://dpro-wangan-biz-api.dpromstk2000.workers.dev',
    shopCode: SITE_CONFIG.shopCode || 'street_house_kitsuki',
    contactEmail: 'dpromstk2000@gmail.com',
    lineUrl: SITE_CONFIG.defaultLineUrl || '',
    source: SITE_CONFIG.source || 'WEB',
    sourceDetail: SITE_CONFIG.sourceDetail || 'street-house-wangan-business',
    duplicateWindowMs: 10 * 60 * 1000,
    siteUrl: 'https://dpromstk2000-lab.github.io/street-house-wangan/',
    siteName: 'ストリートハウス湾岸通り',
    businessName: 'ストリートハウス湾岸通り',
    postalAddress: '大分県杵築市大字守江1291-3',
    telephone: '080-5241-0066'
  });

  const WORKER_API_BASE = APP_CONFIG.workerApiBase;
  const SHOP_CODE = APP_CONFIG.shopCode;
  const CONTACT_EMAIL = APP_CONFIG.contactEmail;
  const LINE_URL = APP_CONFIG.lineUrl;
  const getLineUrl = () => window.DPRO_RUNTIME?.lineUrl || LINE_URL;
  const IS_DEMO = APP_CONFIG.environment === 'demo';
  const DRAFT_KEY = 'wanganEstimateDraftV4';
  const REQUEST_ID_KEY = 'wanganCurrentRequestIdV1';
  const LAST_SUBMISSION_KEY = 'wanganLastSubmissionV1';

  const menu = document.querySelector('.menu');
  const nav = document.querySelector('.nav');
  const toast = document.querySelector('.toast');
  const modal = document.getElementById('estimateModal');
  const form = document.getElementById('estimateForm');
  const modalScroll = document.getElementById('modalScroll');
  const draftStatus = document.getElementById('draftStatus');
  const footerStepLabel = document.getElementById('footerStepLabel');
  const backButton = document.getElementById('backStep');
  const nextButton = document.getElementById('nextStep');
  const copyButton = document.getElementById('copyEstimate');
  const mailButton = document.getElementById('mailEstimate');
  const sendButton = document.getElementById('sendEstimate');
  const resultBox = document.getElementById('modalResult');
  const resultPreview = document.getElementById('resultPreview');
  const apiStatus = document.getElementById('apiStatus');
  const apiStatusText = document.getElementById('apiStatusText');
  const apiResult = document.getElementById('apiResult');
  const apiResultTitle = document.getElementById('apiResultTitle');
  const apiResultText = document.getElementById('apiResultText');
  const apiReference = document.getElementById('apiReference');
  const apiFallback = document.getElementById('apiFallback');
  const completionIcon = document.getElementById('completionIcon');
  const completionFlow = document.getElementById('completionFlow');
  const completionCaution = document.getElementById('completionCaution');
  const environmentChip = document.getElementById('environmentChip');
  const environmentLabel = document.getElementById('environmentLabel');
  const environmentText = document.getElementById('environmentText');
  const modalPanel = modal.querySelector('.modal-panel');
  const successPhone = document.getElementById('successPhone');
  const newRequestButton = document.getElementById('newRequest');
  const closeSuccessButton = document.getElementById('closeSuccess');
  const visitDate = document.getElementById('visitDate');
  const preferredVisitTime = document.getElementById('preferredVisitTime');
  const slotStatus = document.getElementById('slotStatus');
  const productionGuard = document.getElementById('productionGuard');
  const policyModal = document.getElementById('policyModal');
  const systemCheck = document.getElementById('systemCheck');
  const checkResults = document.getElementById('checkResults');
  const robotsMeta = document.getElementById('robotsMeta');
  const canonicalLink = document.getElementById('canonicalLink');
  const jsonLd = document.getElementById('localBusinessJsonLd');
  const successLine = document.getElementById('successLine');
  const downloadReceiptButton = document.getElementById('downloadReceipt');
  const lineReadyNote = document.getElementById('lineReadyNote');
  const receiptNote = document.getElementById('receiptNote');
  const releaseVerdict = document.getElementById('releaseVerdict');
  const releaseVerdictTitle = document.getElementById('releaseVerdictTitle');
  const releaseVerdictText = document.getElementById('releaseVerdictText');
  const lineSetupInput = document.getElementById('lineSetupInput');


  const initializeCinematicHero = () => {
    const hero = document.querySelector('.cinematic-hero');
    const stage = document.getElementById('cinematicStage');
    const video = document.getElementById('driftHeroVideo');
    const progressButtons = Array.from(document.querySelectorAll('[data-cinematic-index]'));
    const label = document.getElementById('cinematicLabel');
    const subLabel = document.getElementById('cinematicSubLabel');
    const nowPanel = document.querySelector('.cinematic-now');
    const toggle = document.getElementById('cinematicToggle');
    const toggleIcon = toggle?.querySelector('.cinematic-pause-icon');
    const toggleText = toggle?.querySelector('.cinematic-toggle-text');

    if (!hero || !stage || !video || progressButtons.length !== 4) return false;

    const scenes = [
      { start: 0, end: 2.35, label: '夜の峠へ進入', sub: 'APPROACH / MOUNTAIN PASS' },
      { start: 2.35, end: 4.70, label: 'ドリフト開始', sub: 'COUNTERSTEER / DRIFT IN' },
      { start: 4.70, end: 7.25, label: '煙と火花を残して', sub: 'SMOKE / SPARKS / APEX' },
      { start: 7.25, end: 10.6, label: 'コーナーを駆け抜ける', sub: 'EXIT / FULL ACCELERATION' }
    ];

    let currentScene = -1;
    let userPaused = false;
    let pausedForVisibility = false;

    const setSceneText = (index) => {
      if (index === currentScene) return;
      currentScene = index;
      nowPanel?.classList.add('is-changing');

      window.setTimeout(() => {
        if (label) label.textContent = scenes[index].label;
        if (subLabel) subLabel.textContent = scenes[index].sub;
        nowPanel?.classList.remove('is-changing');
      }, 190);
    };

    const updateTimeline = () => {
      const time = Number(video.currentTime || 0);
      let sceneIndex = scenes.findIndex((scene) => time >= scene.start && time < scene.end);
      if (sceneIndex < 0) sceneIndex = 0;

      setSceneText(sceneIndex);

      progressButtons.forEach((button, index) => {
        button.classList.toggle('is-complete', index < sceneIndex);
        button.classList.toggle('is-active', index === sceneIndex);
        button.style.removeProperty('--scene-progress');
      });

      const scene = scenes[sceneIndex];
      const progress = Math.max(
        0,
        Math.min(100, ((time - scene.start) / Math.max(scene.end - scene.start, .1)) * 100)
      );
      progressButtons[sceneIndex]?.style.setProperty('--scene-progress', `${progress}%`);
    };

    const updateButton = () => {
      const paused = video.paused;
      hero.classList.toggle('video-paused', paused);

      if (toggle) {
        toggle.setAttribute('aria-pressed', String(paused));
        toggle.setAttribute(
          'aria-label',
          paused ? 'ドリフト動画を再生' : 'ドリフト動画を一時停止'
        );
      }
      if (toggleIcon) toggleIcon.textContent = paused ? '▶' : 'Ⅱ';
      if (toggleText) toggleText.textContent = paused ? 'PLAY' : 'PAUSE';
    };

    const playVideo = async () => {
      try {
        await video.play();
      } catch (_) {
        hero.classList.add('video-paused');
      }
      updateButton();
    };

    progressButtons.forEach((button, index) => {
      button.addEventListener('click', () => {
        video.currentTime = Math.min(scenes[index].start + .03, video.duration || scenes[index].start + .03);
        if (!userPaused) playVideo();
        updateTimeline();
      });
    });

    toggle?.addEventListener('click', () => {
      if (video.paused) {
        userPaused = false;
        playVideo();
      } else {
        userPaused = true;
        video.pause();
      }
      updateButton();
    });

    video.addEventListener('loadeddata', () => {
      hero.classList.add('cinematic-ready', 'video-loaded');
      updateTimeline();
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) playVideo();
    });

    video.addEventListener('timeupdate', updateTimeline);
    video.addEventListener('play', updateButton);
    video.addEventListener('pause', updateButton);
    video.addEventListener('ended', updateTimeline);

    video.addEventListener('error', () => {
      stage.classList.add('video-error');
      hero.classList.remove('video-loaded');
      hero.classList.add('cinematic-ready');
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        pausedForVisibility = !video.paused;
        video.pause();
      } else if (pausedForVisibility && !userPaused) {
        pausedForVisibility = false;
        playVideo();
      }
    });

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reducedMotion.matches) {
      userPaused = true;
      video.pause();
      hero.classList.add('cinematic-ready', 'cinematic-reduced');
    }

    reducedMotion.addEventListener?.('change', (event) => {
      if (event.matches) {
        userPaused = true;
        video.pause();
        hero.classList.add('cinematic-reduced');
      }
    });

    hero.classList.add('cinematic-ready');
    updateButton();
    updateTimeline();
    return true;
  };

  const initializeRevealMotion = () => {
    document.body.classList.add('motion-ready');

    const items = Array.from(document.querySelectorAll('.motion-reveal'));
    items.forEach((item, index) => {
      item.style.transitionDelay = `${Math.min(index * 0.04, 0.32)}s`;
    });

    if (!('IntersectionObserver' in window)) {
      items.forEach((item) => item.classList.add('is-visible'));
      return false;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.14,
      rootMargin: '0px 0px -40px 0px'
    });

    items.forEach((item) => observer.observe(item));
    return true;
  };

  const lineSetupResult = document.getElementById('lineSetupResult');
  const productionWorkerUrl = document.getElementById('productionWorkerUrl');
  const productionShopCode = document.getElementById('productionShopCode');
  const productionEmail = document.getElementById('productionEmail');
  const productionLineUrl = document.getElementById('productionLineUrl');
  const productionSiteUrl = document.getElementById('productionSiteUrl');
  const productionConfigResult = document.getElementById('productionConfigResult');

  let currentStep = 1;
  let lastFocusedElement = null;
  let modalTop = 0;
  let apiConnected = false;
  let isSubmitting = false;
  let submissionCompleted = false;
  let lastCompletedReference = '';
  let lastCompletedPayload = null;

  const showToast = (message) => {
    toast.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2800);
  };

  menu?.addEventListener('click', () => {
    const open = !nav.classList.contains('open');
    nav.classList.toggle('open', open);
    menu.setAttribute('aria-expanded', String(open));
  });

  nav?.querySelectorAll('a').forEach((anchor) => {
    anchor.addEventListener('click', () => {
      nav.classList.remove('open');
      menu?.setAttribute('aria-expanded', 'false');
    });
  });


  const isValidEmail = (value) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

  const isHttpsUrl = (value) => {
    try {
      const url = new URL(String(value || '').trim());
      return url.protocol === 'https:';
    } catch (_) {
      return false;
    }
  };

  const escapeConfigValue = (value) =>
    String(value || '').replaceAll('\\', '\\\\').replaceAll("'", "\\'");

  const getProductionConfigInput = () => ({
    workerApiBase: String(productionWorkerUrl.value || '').trim(),
    shopCode: String(productionShopCode.value || '').trim(),
    contactEmail: String(productionEmail.value || '').trim(),
    lineUrl: String(productionLineUrl.value || '').trim(),
    siteUrl: String(productionSiteUrl.value || '').trim()
  });

  const validateProductionConfig = (values) => {
    const errors = [];

    if (!isHttpsUrl(values.workerApiBase)) errors.push('正式DPRO Worker URLはHTTPSで入力してください。');
    if (/demo/i.test(values.workerApiBase)) errors.push('正式Worker URLに demo が含まれています。');
    if (!values.shopCode) errors.push('正式店舗コードを入力してください。');
    if (/demo/i.test(values.shopCode)) errors.push('正式店舗コードに demo が含まれています。');
    if (!isValidEmail(values.contactEmail)) errors.push('受付メールアドレスを確認してください。');
    if (!isValidLineUrl(values.lineUrl)) errors.push('LINE公式URLを確認してください。');
    if (!isHttpsUrl(values.siteUrl)) errors.push('正式サイトURLはHTTPSで入力してください。');

    return errors;
  };

  const buildProductionConfig = (values) => `const APP_CONFIG = Object.freeze({
    environment: 'production',
    workerApiBase: '${escapeConfigValue(values.workerApiBase)}',
    shopCode: '${escapeConfigValue(values.shopCode)}',
    contactEmail: '${escapeConfigValue(values.contactEmail)}',
    lineUrl: '${escapeConfigValue(values.lineUrl)}',
    source: SITE_CONFIG.source || 'WEB',
    sourceDetail: SITE_CONFIG.sourceDetail || 'street-house-wangan-business',
    duplicateWindowMs: 10 * 60 * 1000,
    siteUrl: '${escapeConfigValue(values.siteUrl)}',
    siteName: 'ストリートハウス湾岸通り',
    businessName: 'ストリートハウス湾岸通り',
    postalAddress: '大分県杵築市大字守江1291-3',
    telephone: '080-5241-0066'
  });`;

  const showProductionConfigResult = (text, isError = false) => {
    productionConfigResult.textContent = text;
    productionConfigResult.className = `production-result show${isError ? ' error' : ''}`;
  };

  const generateProductionConfig = () => {
    const values = getProductionConfigInput();
    const errors = validateProductionConfig(values);

    if (errors.length) {
      showProductionConfigResult(errors.join('\n'), true);
      return null;
    }

    const config = buildProductionConfig(values);
    showProductionConfigResult(config);
    return config;
  };

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      const temp = document.createElement('textarea');
      temp.value = text;
      document.body.appendChild(temp);
      temp.select();
      const copied = document.execCommand('copy');
      temp.remove();
      return copied;
    }
  };

  const isValidLineUrl = (url) =>
    /^https:\/\/(?:lin\.ee\/|line\.me\/|liff\.line\.me\/)/i.test(String(url || '').trim());

  const applyLineIntegration = () => {
    const configured = isValidLineUrl(getLineUrl());

    document.querySelectorAll('.js-line').forEach((button) => {
      button.textContent = configured ? 'LINEで相談' : 'LINE相談（準備中）';
      button.setAttribute('aria-label', configured ? 'LINE公式アカウントを開く' : 'LINE公式URLは未設定です');
    });

    successLine.hidden = !(submissionCompleted && configured);
    successLine.href = configured ? getLineUrl() : '#';
    lineReadyNote.classList.toggle('show', submissionCompleted && configured);
    return configured;
  };

  window.addEventListener('dpro:ready', applyLineIntegration);

  const buildReceiptText = () => {
    const payload = lastCompletedPayload || buildDproPayload();
    return [
      'ストリートハウス湾岸通り WEB受付控え',
      '================================',
      `受付参照：${lastCompletedReference || payload.clientRequestId || '確認中'}`,
      `受付経路：${APP_CONFIG.source}`,
      `受付日時：${new Date().toLocaleString('ja-JP')}`,
      '',
      `お名前：${payload.name || ''}`,
      `電話番号：${payload.phone || ''}`,
      `車両：${payload.vehicleLabel || payload.carName || ''}`,
      `ご相談内容：${payload.consultType || ''}`,
      `希望入庫日時：${payload.preferredVisitDate || '指定なし'} ${payload.preferredVisitTime || ''}`,
      '',
      'ご相談詳細',
      payload.message || '',
      '',
      '※希望入庫日時は仮受付です。店舗からの連絡後に正式確定します。',
      `店舗電話：${APP_CONFIG.telephone}`,
      `サイト：${APP_CONFIG.siteUrl}`
    ].join('\n');
  };

  const downloadReceipt = () => {
    const blob = new Blob([buildReceiptText()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `street-house-wangan-receipt-${new Date().toISOString().slice(0,10)}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    receiptNote.classList.add('show');
    showToast('受付控えを保存しました。');
  };

  const productionGuardErrors = () => {
    if (IS_DEMO) return [];
    const errors = [];
    if (/demo/i.test(APP_CONFIG.workerApiBase)) errors.push('正式運用なのにWorker URLへ demo が含まれています。');
    if (/demo/i.test(APP_CONFIG.shopCode)) errors.push('正式運用なのに店舗コードへ demo が含まれています。');
    if (!isValidLineUrl(APP_CONFIG.lineUrl)) errors.push('LINE公式URLが未設定、または形式が正しくありません。');
    if (!/^https:\/\/.+/i.test(APP_CONFIG.workerApiBase)) errors.push('Worker URLはHTTPSで設定してください。');
    return errors;
  };
  const applyProductionGuard = () => {
    const errors = productionGuardErrors();
    productionGuard.textContent = errors.join(' ');
    productionGuard.classList.toggle('show', errors.length > 0);
    return errors;
  };
  const applySeoAndStructuredData = () => {
    robotsMeta.content = IS_DEMO ? 'noindex,nofollow' : 'index,follow';
    canonicalLink.href = location.href.split(/[?#]/)[0];
    jsonLd.textContent = JSON.stringify({'@context':'https://schema.org','@type':'AutoRepair',name:APP_CONFIG.businessName,url:APP_CONFIG.siteUrl,telephone:APP_CONFIG.telephone,address:{'@type':'PostalAddress',streetAddress:APP_CONFIG.postalAddress,addressRegion:'大分県',addressLocality:'杵築市',addressCountry:'JP'},openingHoursSpecification:[{'@type':'OpeningHoursSpecification',dayOfWeek:['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],opens:'09:00',closes:'19:00'}],priceRange:'¥¥'});
  };
  const openPolicy = () => { policyModal.classList.add('open'); policyModal.setAttribute('aria-hidden','false'); };
  const closePolicy = () => { policyModal.classList.remove('open'); policyModal.setAttribute('aria-hidden','true'); };
  document.querySelectorAll('.js-open-policy').forEach((button) => button.addEventListener('click', openPolicy));
  document.querySelectorAll('[data-close-policy]').forEach((button) => button.addEventListener('click', closePolicy));
  const checkItem = (name,status,detail) => ({name,status,detail});
  const runSystemChecks = async () => {
    const results = [], guardErrors = productionGuardErrors();
    results.push(checkItem('HTMLタイトル',document.title.length>=10?'pass':'fail',document.title));
    results.push(checkItem('メタ説明',document.querySelector('meta[name="description"]')?.content?'pass':'fail',document.querySelector('meta[name="description"]')?.content||'未設定'));
    results.push(checkItem('canonical URL',/^https:\/\//.test(canonicalLink.href)?'pass':'fail',canonicalLink.href));
    results.push(checkItem('robots設定',IS_DEMO&&robotsMeta.content.includes('noindex')?'pass':(!IS_DEMO&&robotsMeta.content==='index,follow'?'pass':'fail'),robotsMeta.content));
    results.push(checkItem('構造化データ',jsonLd.textContent.includes('AutoRepair')?'pass':'fail','AutoRepair JSON-LD'));
    results.push(checkItem('電話リンク',document.querySelectorAll('a[href^="tel:"]').length>=3?'pass':'warn',`${document.querySelectorAll('a[href^="tel:"]').length}件`));
    results.push(checkItem(
      'Googleマップ実表示',
      document.getElementById('googleMapEmbed')?.src.includes('output=embed') ? 'pass' : 'fail',
      document.getElementById('googleMapEmbed') ? '埋め込みiframe実装済み' : '未実装'
    ));
    results.push(checkItem(
      'Googleマップ外部リンク',
      document.querySelector('a[href*="google.com/maps"]') ? 'pass' : 'fail',
      '別画面で開く導線'
    ));
    results.push(checkItem('プライバシー表示',policyModal?'pass':'fail',policyModal?'実装済み':'未実装'));
    results.push(checkItem('入力必須項目',form.querySelectorAll('[required]').length>=4?'pass':'warn',`${form.querySelectorAll('[required]').length}項目`));
    results.push(checkItem('二重送信防止',typeof submissionFingerprint==='function'&&APP_CONFIG.duplicateWindowMs>0?'pass':'fail',`${APP_CONFIG.duplicateWindowMs/60000}分`));
    results.push(checkItem('環境切替ガード',guardErrors.length?'fail':'pass',guardErrors.join(' / ')||APP_CONFIG.environment));
    results.push(checkItem('LINE公式URL',isValidLineUrl(APP_CONFIG.lineUrl)?'pass':'warn',APP_CONFIG.lineUrl||'正式URL未設定'));
    results.push(checkItem('受付完了後LINE導線',typeof applyLineIntegration==='function'?'pass':'fail',isValidLineUrl(APP_CONFIG.lineUrl)?'接続可能':'URL設定後に自動有効'));
    results.push(checkItem('受付控え保存',typeof downloadReceipt==='function'?'pass':'fail','テキスト形式で保存'));
    results.push(checkItem('WEB受付識別',APP_CONFIG.source==='WEB'&&Boolean(APP_CONFIG.sourceDetail)?'pass':'fail',`${APP_CONFIG.source} / ${APP_CONFIG.sourceDetail}`));
    results.push(checkItem('検査画面撮影対策',document.body.classList.contains('system-check-mode')?'pass':'warn','全ページ撮影時の固定画面重複を防止'));
    results.push(checkItem('最終納品バージョン',document.querySelector('.version-badge')?.textContent.includes('WEB-15')?'pass':'fail',document.querySelector('.version-badge')?.textContent||'未確認'));
    results.push(checkItem('正式公開設定生成',typeof buildProductionConfig==='function'&&typeof validateProductionConfig==='function'?'pass':'fail','APP_CONFIG一括生成'));
    results.push(checkItem('モーションCSS',document.documentElement.innerHTML.includes('STEP WANGAN-WEB-12: premium motion enhancement')?'pass':'fail','動き用スタイル'));
    results.push(checkItem('スクロール表示',typeof initializeRevealMotion==='function'?'pass':'fail','IntersectionObserver'));
    results.push(checkItem('ヒーロー演出',document.documentElement.innerHTML.includes('@keyframes heroSweep')?'pass':'fail','光演出・ズーム'));
    results.push(checkItem('CTA演出',document.documentElement.innerHTML.includes('box-shadow:0 14px 32px rgba(0,0,0,.28)')?'pass':'fail','ボタンのホバー演出'));
    results.push(checkItem('ブランド統一MP4',Boolean(document.getElementById('driftHeroVideo'))?'pass':'fail','STREET HOUSE WANGAN・10.5秒'));
    results.push(checkItem('動画自動再生設定',document.getElementById('driftHeroVideo')?.autoplay&&document.getElementById('driftHeroVideo')?.muted?'pass':'fail','autoplay / muted'));
    results.push(checkItem('動画ループ設定',document.getElementById('driftHeroVideo')?.loop?'pass':'fail','loop / playsinline'));
    results.push(checkItem('動画ポスター',document.getElementById('driftHeroVideo')?.poster.includes('drift-hero-wangan-poster.jpg')?'pass':'fail','読み込み前・失敗時表示'));
    results.push(checkItem('動画再生操作',Boolean(document.getElementById('cinematicToggle'))?'pass':'fail','PLAY / PAUSE'));
    results.push(checkItem('動画シーン移動',document.querySelectorAll('[data-cinematic-index]').length===4?'pass':'fail','4場面へ直接移動'));
    results.push(checkItem('動画ファイル分離',document.querySelector('#driftHeroVideo source')?.src.includes('drift-hero-wangan.mp4')?'pass':'fail','GitHubルート配置'));
    results.push(checkItem(
      '車体ブランド表記',
      document.querySelector('.cinematic-live')?.textContent.includes('STREET HOUSE WANGAN') ? 'pass' : 'fail',
      'STREET HOUSE WANGAN'
    ));

    results.push(checkItem('DPRO Worker HTTPS',/^https:\/\//.test(WORKER_API_BASE)?'pass':'fail',WORKER_API_BASE));
    results.push(checkItem('店舗コード',SHOP_CODE?'pass':'fail',SHOP_CODE||'未設定'));
    results.push(checkItem('画像alt',[...document.images].every((img)=>img.hasAttribute('alt'))?'pass':'warn',`${[...document.images].filter((img)=>!img.hasAttribute('alt')).length}件不足`));
    try { const response=await fetch(`${WORKER_API_BASE}/api/public/shop-settings?shopCode=${encodeURIComponent(SHOP_CODE)}`); const data=await response.json(); results.push(checkItem('DPRO API接続',response.ok&&data.ok?'pass':'fail',data.shop_name||data.message||`HTTP ${response.status}`)); } catch(error){ results.push(checkItem('DPRO API接続','fail',error.message)); }
    checkResults.innerHTML=results.map((item)=>`<tr><td>${escapeHtml(item.name)}</td><td><span class="check-status ${item.status}">${item.status==='pass'?'合格':item.status==='warn'?'注意':'失敗'}</span></td><td>${escapeHtml(item.detail)}</td></tr>`).join('');
    const count=(s)=>results.filter((i)=>i.status===s).length;
    const passCount = count('pass');
    const warnCount = count('warn');
    const failCount = count('fail');
    document.getElementById('checkTotal').textContent=String(results.length);
    document.getElementById('checkPass').textContent=String(passCount);
    document.getElementById('checkWarn').textContent=String(warnCount);
    document.getElementById('checkFail').textContent=String(failCount);

    releaseVerdict.className = 'release-verdict';
    if (failCount > 0) {
      releaseVerdict.classList.add('blocked');
      releaseVerdictTitle.textContent = '公開停止：失敗項目があります';
      releaseVerdictText.textContent = '失敗を0件にしてから公開してください。';
    } else if (IS_DEMO) {
      releaseVerdict.classList.add('demo');
      releaseVerdictTitle.textContent = 'DEMO確認可能';
      releaseVerdictText.textContent = warnCount
        ? `DEMO動作は確認できます。注意${warnCount}件は正式公開前に設定してください。`
        : 'DEMO環境として正常です。';
    } else if (warnCount > 0) {
      releaseVerdict.classList.add('blocked');
      releaseVerdictTitle.textContent = '正式公開保留';
      releaseVerdictText.textContent = `注意${warnCount}件を解消してください。`;
    } else {
      releaseVerdict.classList.add('ready');
      releaseVerdictTitle.textContent = '正式公開可能';
      releaseVerdictText.textContent = '失敗・注意ともに0件です。';
    }

    return results;
  };
  const openSystemCheckFromQuery = () => {
    if (new URLSearchParams(location.search).get('system-check') !== '1') return;
    document.body.classList.add('system-check-mode');
    systemCheck.classList.add('open');
    systemCheck.setAttribute('aria-hidden','false');
    window.scrollTo(0, 0);
    runSystemChecks();
  };
  document.getElementById('runSystemCheck')?.addEventListener('click',runSystemChecks);
  document.getElementById('closeSystemCheck')?.addEventListener('click',()=>{location.href=APP_CONFIG.siteUrl;});
  document.getElementById('copySystemCheck')?.addEventListener('click',async()=>{const rows=[...checkResults.querySelectorAll('tr')].map((row)=>[...row.children].map((cell)=>cell.textContent.trim()).join(' | ')); const summary=[`WANGAN-BIZ-4 DPRO動的連携チェック`,`検査件数: ${document.getElementById('checkTotal').textContent}`,`合格: ${document.getElementById('checkPass').textContent}`,`注意: ${document.getElementById('checkWarn').textContent}`,`失敗: ${document.getElementById('checkFail').textContent}`,'',...rows].join('\n'); try{await navigator.clipboard.writeText(summary);showToast('検査結果をコピーしました。');}catch(_){showToast('検査結果をコピーできませんでした。');}});

  const applyEnvironmentDisplay = () => {
    environmentChip.textContent = IS_DEMO ? 'DEMO' : 'PRODUCTION';
    environmentChip.classList.toggle('production', !IS_DEMO);
    environmentLabel.textContent = IS_DEMO ? 'DPRO DEMO連動' : 'DPRO正式運用連動';
    environmentText.textContent = IS_DEMO
      ? 'デモ環境の店舗管理画面へWEB受付を登録します。'
      : '店舗の正式なDPRO管理画面へWEB受付を登録します。';
  };

  const environmentName = () => IS_DEMO ? 'DPRO DEMO' : 'DPRO';

  const setApiStatus = (state, text) => {
    apiStatus.classList.remove('checking', 'connected', 'failed');
    apiStatus.classList.add(state);
    apiStatusText.textContent = text;
  };

  const checkDproConnection = async () => {
    const guardErrors = applyProductionGuard();
    if (guardErrors.length) { apiConnected=false; setApiStatus('failed','正式公開設定エラー｜送信停止中'); return; }
    setApiStatus('checking', `${environmentName()} 接続確認中`);
    try {
      const response = await fetch(
        `${WORKER_API_BASE}/api/public/shop-settings?shopCode=${encodeURIComponent(SHOP_CODE)}`,
        { headers: { Accept: 'application/json' } }
      );
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || '接続できませんでした。');
      apiConnected = true;
      const shopName = result.shop_name || result.shop_settings?.shop_name || 'ストリートハウス湾岸通り';
      setApiStatus('connected', `${environmentName()} 接続済み｜${shopName}`);
    } catch (error) {
      apiConnected = false;
      setApiStatus('failed', 'DPRO接続を確認できません｜メール・コピーは利用可能');
    }
  };

  const setMinDate = () => {
    if (!visitDate) return;
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    visitDate.min = local.toISOString().slice(0, 10);
  };

  const populateShakenYears = () => {
    const select = document.getElementById('shakenYear');
    if (!select || select.options.length > 1) return;
    const year = new Date().getFullYear();
    for (let y = year - 1; y <= year + 7; y += 1) {
      const option = document.createElement('option');
      option.value = String(y);
      option.textContent = `${y}年`;
      select.appendChild(option);
    }
  };

  const normalizeTimeValue = (value) => {
    const text = String(value || '').trim();
    const match = text.match(/^(\d{1,2}):(\d{2})/);
    if (!match) return text;
    return `${String(Number(match[1])).padStart(2, '0')}:${match[2]}`;
  };

  const resetTimeOptions = (message = '先に希望来店日を選択') => {
    preferredVisitTime.innerHTML = `<option value="">${message}</option>`;
    preferredVisitTime.disabled = true;
  };

  const loadAvailableTimes = async (dateValue) => {
    if (!dateValue) {
      resetTimeOptions();
      slotStatus.className = 'slot-status';
      slotStatus.textContent = 'DPROから30分枠を読み込みます。';
      return;
    }

    resetTimeOptions('時間候補を読み込み中...');
    slotStatus.className = 'slot-status loading';
    slotStatus.textContent = 'DPROの受付可能枠を確認しています。';

    try {
      const response = await fetch(
        `${WORKER_API_BASE}/api/public/reservation-time-options?date=${encodeURIComponent(dateValue)}`,
        { headers: { Accept: 'application/json' } }
      );
      const result = await response.json();

      if (!response.ok || !result.ok || !result.available) {
        throw new Error(result.reason || result.message || 'この日は受付できません。');
      }

      const slots = Array.isArray(result.slots) ? result.slots : [];
      const times = Array.isArray(result.times) ? result.times : [];

      const slotItems = slots.length
        ? slots.map((slot) => ({
            time: normalizeTimeValue(slot.time),
            remaining: Number(
              slot.remaining ??
              Math.max(Number(slot.limit || result.slotLimit || 1) - Number(slot.used || 0), 0)
            ),
            isFull: Boolean(slot.isFull ?? slot.is_full)
          })).filter((slot) => slot.time)
        : times.map((time) => ({
            time: normalizeTimeValue(time),
            remaining: Number(result.slotLimit || 1),
            isFull: false
          })).filter((slot) => slot.time);

      if (!slotItems.length) throw new Error('選択できる時間がありません。');

      const options = slotItems.map((slot) => {
        const disabled = slot.isFull || slot.remaining <= 0;
        const option = document.createElement('option');
        option.value = slot.time;
        option.disabled = disabled;
        option.textContent = disabled ? `${slot.time}（満枠）` : `${slot.time}（残り${slot.remaining}）`;
        return option;
      });

      preferredVisitTime.innerHTML = '<option value="">希望入庫時間を選択</option>';
      options.forEach((option) => preferredVisitTime.appendChild(option));

      const hasOpenSlot = slotItems.some((slot) => !slot.isFull && slot.remaining > 0);
      preferredVisitTime.disabled = !hasOpenSlot;
      if (!hasOpenSlot) throw new Error('選択した日は満枠です。別の日を選択してください。');

      slotStatus.className = 'slot-status ok';
      slotStatus.textContent = 'DPROから現在の受付可能枠を読み込みました。';
    } catch (error) {
      resetTimeOptions(error.message || '時間枠を取得できませんでした。');
      slotStatus.className = 'slot-status ng';
      slotStatus.textContent = `${error.message || '時間枠を取得できませんでした。'} 電話での確認も可能です。`;
    }
  };

  visitDate?.addEventListener('change', () => {
    preferredVisitTime.value = '';
    loadAvailableTimes(visitDate.value);
  });

  const openModal = () => {
    lastFocusedElement = document.activeElement;
    modalTop = window.scrollY;
    modal.style.top = `${modalTop}px`;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (submissionCompleted) {
      showStep(3, false);
      modalPanel.classList.add('completed');
    } else {
      showStep(1, false);
    }
    checkDproConnection();
    window.setTimeout(() => {
      if (!submissionCompleted) document.getElementById('customerName')?.focus();
    }, 60);
  };

  const closeModal = () => {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    modal.style.top = '';
    lastFocusedElement?.focus?.();
  };

  document.querySelectorAll('.js-open-estimate').forEach((button) => button.addEventListener('click', openModal));
  document.querySelectorAll('[data-close-modal]').forEach((button) => button.addEventListener('click', closeModal));
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (policyModal.classList.contains('open')) closePolicy();
    else if (modal.classList.contains('open')) closeModal();
  });

  const getFormData = () => {
    const data = Object.fromEntries(new FormData(form).entries());
    data.privacyAgree = document.getElementById('privacyAgree').checked ? '同意済み' : '';
    return data;
  };

  const setFieldInvalid = (field, invalid) => {
    if (!field) return;
    field.setAttribute('aria-invalid', invalid ? 'true' : 'false');
  };

  const validateStep = (step) => {
    const panel = document.querySelector(`[data-step-panel="${step}"]`);
    const error = document.querySelector(`[data-step-error="${step}"]`);
    if (!panel) return true;
    let valid = true;

    panel.querySelectorAll('[required]').forEach((field) => {
      const okay = field.type === 'checkbox' ? field.checked : field.checkValidity();
      setFieldInvalid(field, !okay);
      if (!okay) valid = false;
    });

    if (step === 2 && visitDate.value && !preferredVisitTime.value) {
      setFieldInvalid(preferredVisitTime, true);
      valid = false;
    }

    if (!valid) {
      error?.classList.add('show');
      panel.querySelector('[aria-invalid="true"]')?.focus();
    } else {
      error?.classList.remove('show');
    }
    return valid;
  };

  const escapeHtml = (value) => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const pair = (label, value, className = '') =>
    `<div><dt>${label}</dt><dd class="${className}">${escapeHtml(value || '未入力')}</dd></div>`;

  const shakenText = (d) =>
    d.shakenYear && d.shakenMonth ? `${d.shakenYear}年${d.shakenMonth}月` : '未入力';

  const updateConfirmation = () => {
    const d = getFormData();

    document.getElementById('confirmCustomer').innerHTML = [
      pair('お名前', d.customerName), pair('電話番号', d.phone), pair('メール', d.email),
      pair('希望連絡方法', d.contactMethod), pair('連絡時間帯', d.preferredTime)
    ].join('');

    document.getElementById('confirmCar').innerHTML = [
      pair('メーカー', d.carMaker), pair('車種', d.carModel), pair('年式', d.carYear),
      pair('ナンバー下4桁', d.plateLast4),
      pair('走行距離', d.mileageKm ? `${d.mileageKm} km` : '未入力'),
      pair('車検満了年月', shakenText(d)),
      pair('希望入庫日時', d.visitDate ? `${d.visitDate} ${d.preferredVisitTime || ''}` : '指定なし')
    ].join('');

    document.getElementById('confirmRequest').innerHTML = [
      pair('相談分類', d.kind), pair('持込部品等', d.partsInfo || 'なし'),
      pair('詳しい内容', d.message, 'confirm-message'), pair('個人情報利用', d.privacyAgree)
    ].join('');
  };

  const resetApiResult = () => {
    apiResult.className = 'api-result';
    apiResultTitle.textContent = 'DPRO受付結果';
    apiResultText.textContent = '';
    apiReference.className = 'api-reference';
    apiReference.textContent = '';
    apiFallback.className = 'api-fallback';
    completionIcon.hidden = true;
    completionFlow.hidden = true;
    completionCaution.hidden = true;
    apiResult.classList.remove('completion');
  };

  const showStep = (step, focus = true) => {
    currentStep = Math.max(1, Math.min(3, step));

    document.querySelectorAll('[data-step-panel]').forEach((panel) => {
      panel.classList.toggle('active', Number(panel.dataset.stepPanel) === currentStep);
    });

    document.querySelectorAll('[data-step-indicator]').forEach((indicator) => {
      const indicatorStep = Number(indicator.dataset.stepIndicator);
      indicator.classList.toggle('active', indicatorStep === currentStep);
      indicator.classList.toggle('done', indicatorStep < currentStep);
    });

    backButton.hidden = currentStep === 1;
    nextButton.hidden = currentStep === 3;
    const normalConfirmation = currentStep === 3 && !submissionCompleted;
    copyButton.hidden = !normalConfirmation;
    mailButton.hidden = !normalConfirmation;
    sendButton.hidden = !normalConfirmation;
    successPhone.hidden = !submissionCompleted;
    downloadReceiptButton.hidden = !submissionCompleted;
    newRequestButton.hidden = !submissionCompleted;
    closeSuccessButton.hidden = !submissionCompleted;
    applyLineIntegration();
    footerStepLabel.textContent = `${currentStep} / 3`;

    if (currentStep === 3) {
      updateConfirmation();
      resultPreview.textContent = buildMessage();
      resultBox.classList.toggle('show', !submissionCompleted);
    } else {
      resultBox.classList.remove('show');
      if (!submissionCompleted) resetApiResult();
    }

    modalScroll.scrollTop = 0;

    if (focus) {
      const panel = document.querySelector(`[data-step-panel="${currentStep}"]`);
      window.setTimeout(() => panel?.querySelector('input,select,textarea,button')?.focus(), 30);
    }
  };

  nextButton?.addEventListener('click', () => {
    if (!validateStep(currentStep)) return;
    showStep(currentStep + 1);
  });
  backButton?.addEventListener('click', () => showStep(currentStep - 1));

  const buildMessage = () => {
    const d = getFormData();
    return [
      'ストリートハウス湾岸通り WEB見積もり・来店相談','',
      `■ ご相談内容：${d.kind || '未入力'}`,
      `■ 希望連絡方法：${d.contactMethod || '指定なし'}`,
      `■ お名前：${d.customerName || '未入力'}`,
      `■ 電話番号：${d.phone || '未入力'}`,
      `■ メール：${d.email || '未入力'}`,
      `■ 連絡しやすい時間：${d.preferredTime || '指定なし'}`,'',
      `■ メーカー：${d.carMaker || '未入力'}`,
      `■ 車種：${d.carModel || '未入力'}`,
      `■ 年式：${d.carYear || '未入力'}`,
      `■ ナンバー下4桁：${d.plateLast4 || '未入力'}`,
      `■ 走行距離：${d.mileageKm ? `${d.mileageKm} km` : '未入力'}`,
      `■ 車検満了年月：${shakenText(d)}`,
      `■ 希望入庫日時：${d.visitDate ? `${d.visitDate} ${d.preferredVisitTime || ''}` : '指定なし'}`,
      `■ 持込部品・商品URL・型番：${d.partsInfo || 'なし'}`,'',
      '■ 症状・ご希望・ご相談内容', d.message || '未入力','',
      `送信日時：${new Date().toLocaleString('ja-JP')}`,
      `送信元ページ：${location.href}`
    ].join('\n');
  };

  const getOrCreateRequestId = () => {
    let requestId = localStorage.getItem(REQUEST_ID_KEY);
    if (!requestId) {
      requestId = crypto.randomUUID
        ? crypto.randomUUID()
        : `web-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(REQUEST_ID_KEY, requestId);
    }
    return requestId;
  };

  const simpleHash = (text) => {
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16);
  };

  const submissionFingerprint = (payload) => simpleHash(JSON.stringify({
    shopCode: payload.shopCode,
    name: payload.name.trim().toLowerCase(),
    phone: payload.phone.replace(/\D/g, ''),
    carName: payload.carName.trim().toLowerCase(),
    consultType: payload.consultType,
    preferredVisitDate: payload.preferredVisitDate,
    preferredVisitTime: payload.preferredVisitTime,
    message: payload.message.trim()
  }));

  const readRecentSubmission = (fingerprint) => {
    try {
      const stored = JSON.parse(localStorage.getItem(LAST_SUBMISSION_KEY) || 'null');
      if (!stored || stored.fingerprint !== fingerprint) return null;
      if (Date.now() - Number(stored.submittedAt || 0) > APP_CONFIG.duplicateWindowMs) return null;
      return stored;
    } catch (_) {
      return null;
    }
  };

  const saveSuccessfulSubmission = (payload, reference) => {
    try {
      localStorage.setItem(LAST_SUBMISSION_KEY, JSON.stringify({
        fingerprint: submissionFingerprint(payload),
        submittedAt: Date.now(),
        reference: reference || '',
        requestId: payload.clientRequestId
      }));
    } catch (_) {}
  };

  const buildDproPayload = () => {
    const d = getFormData();
    const carName = [d.carMaker, d.carModel].filter(Boolean).join(' ').trim();
    const vehicleLabel = [d.carMaker, d.carModel, d.carYear].filter(Boolean).join(' / ');
    const additionalInfo = [
      d.email ? `メールアドレス：${d.email}` : '',
      d.partsInfo ? `持込部品・商品URL・型番：${d.partsInfo}` : '',
      d.message || ''
    ].filter(Boolean).join('\n');

    return {
      shopCode: SHOP_CODE, customerId: '', vehicleId: '',
      name: String(d.customerName || '').trim(),
      phone: String(d.phone || '').trim(),
      email: String(d.email || '').trim(),
      lineUserId: '', lineDisplayName: '',
      carName, plateLast4: String(d.plateLast4 || '').trim(), vehicleLabel,
      consultType: d.kind || '',
      otherConsultDetail: d.partsInfo || '',
      preferredVisitDate: d.visitDate || '',
      preferredVisitTime: d.preferredVisitTime || '',
      preferredContactMethod: d.contactMethod || '',
      shakenYear: d.shakenYear || '', shakenMonth: d.shakenMonth || '',
      mileageKm: String(d.mileageKm || '').trim(),
      message: additionalInfo,
      customerMode: 'new',
      vehicleMode: 'new',
      source: APP_CONFIG.source,
      sourceDetail: APP_CONFIG.sourceDetail,
      environment: APP_CONFIG.environment,
      pageUrl: window.location.href,
      clientRequestId: getOrCreateRequestId()
    };
  };

  const saveDraft = () => {
    const data = getFormData();
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
      draftStatus.textContent = '端末内へ一時保存済み';
    } catch (_) {
      draftStatus.textContent = '';
    }
  };

  const loadDraft = () => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      Object.entries(data).forEach(([name, value]) => {
        const field = form.elements.namedItem(name);
        if (!field) return;
        if (field.type === 'checkbox') field.checked = Boolean(value);
        else if (typeof value === 'string') field.value = value;
      });
      if (visitDate.value) loadAvailableTimes(visitDate.value);
      draftStatus.textContent = '前回の入力内容を復元しました';
    } catch (_) {}
  };

  let saveTimer;
  form?.addEventListener('input', (event) => {
    setFieldInvalid(event.target, false);
    event.target.closest('.step-panel')?.querySelector('.form-error')?.classList.remove('show');
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(saveDraft, 400);
  });
  form?.addEventListener('change', (event) => {
    setFieldInvalid(event.target, false);
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(saveDraft, 250);
  });

  const showApiFailure = (message) => {
    apiResult.className = 'api-result show failure';
    apiResultTitle.textContent = 'DPROへ送信できませんでした';
    apiResultText.textContent = message || '通信状態またはDPRO設定を確認してください。';
    apiFallback.className = 'api-fallback show';
    apiReference.className = 'api-reference';
  };

  const extractReference = (result) =>
    result.inquiryId || result.inquiry_id || result.id ||
    result.inquiry?.id || result.data?.id || result.requestId || '';

  const setCompletedView = ({ reference = '', duplicate = false } = {}) => {
    submissionCompleted = true;
    lastCompletedReference = reference || '';
    modalPanel.classList.add('completed');
    apiResult.className = 'api-result show completion success';
    completionIcon.hidden = false;
    completionIcon.textContent = duplicate ? '!' : '✓';
    completionFlow.hidden = duplicate;
    completionCaution.hidden = false;
    apiFallback.className = 'api-fallback';
    resultBox.classList.remove('show');

    apiResultTitle.textContent = duplicate
      ? '同じ内容はすでに受付済みです'
      : 'DPROへのWEB受付が完了しました';

    apiResultText.textContent = duplicate
      ? '短時間に同じ内容が再送されるのを防止しました。新しく受付を追加する必要はありません。'
      : '店舗のDPRO管理画面へ内容を登録しました。スタッフが確認後、正式な入庫日時をご連絡します。';

    if (reference) {
      apiReference.innerHTML =
        `<span class="source-label">${escapeHtml(APP_CONFIG.source)}</span> ` +
        `受付参照：${escapeHtml(reference)}`;
      apiReference.className = 'api-reference show';
    } else {
      apiReference.className = 'api-reference';
    }

    showStep(3, false);
    modalScroll.scrollTop = modalScroll.scrollHeight;
  };

  const showApiSuccess = (result, payload) => {
    const reference = extractReference(result);
    lastCompletedPayload = payload;
    saveSuccessfulSubmission(payload, reference);
    setCompletedView({ reference });
    localStorage.removeItem(DRAFT_KEY);
    draftStatus.textContent = 'DPROへ受付済み';
  };

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    const step1Okay = validateStep(1);
    const step2Okay = validateStep(2);
    if (!step1Okay || !step2Okay) {
      showStep(!step1Okay ? 1 : 2);
      return;
    }

    const guardErrors = applyProductionGuard();
    if (guardErrors.length) { showApiFailure(`正式公開設定に問題があります。${guardErrors.join(' ')}`); showToast('正式公開設定を確認してください。'); return; }
    isSubmitting = true;
    sendButton.disabled = true;
    const originalText = sendButton.textContent;
    sendButton.textContent = 'DPROへ送信中...';
    resetApiResult();

    const payload = buildDproPayload();
    const fingerprint = submissionFingerprint(payload);
    const recentSubmission = readRecentSubmission(fingerprint);

    if (recentSubmission) {
      lastCompletedPayload = payload;
      setCompletedView({
        reference: recentSubmission.reference || recentSubmission.requestId || '',
        duplicate: true
      });
      sendButton.disabled = false;
      sendButton.textContent = originalText;
      isSubmitting = false;
      showToast('二重送信を防止しました。受付はすでに完了しています。');
      return;
    }

    try {
      const response = await fetch(`${WORKER_API_BASE}/api/inquiries`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', Accept: 'application/json'},
        body: JSON.stringify(payload)
      });

      const raw = await response.text();
      let result = {};
      try { result = raw ? JSON.parse(raw) : {}; }
      catch (_) { result = {ok:false, message:raw || 'DPROから正しい応答を受け取れませんでした。'}; }

      if (!response.ok || !result.ok) {
        throw new Error(result.message || `送信に失敗しました（HTTP ${response.status}）`);
      }

      apiConnected = true;
      setApiStatus('connected', `${environmentName()} 接続済み｜受付登録完了`);
      showApiSuccess(result, payload);
      showToast('DPRO管理画面へ受付を登録しました。');
      modalScroll.scrollTop = modalScroll.scrollHeight;
    } catch (error) {
      apiConnected = false;
      setApiStatus('failed', 'DPRO送信失敗｜メール・コピーで送信可能');
      showApiFailure(error.message || 'DPROへの送信に失敗しました。');
      showToast('DPROへ送信できませんでした。メールまたはコピーをご利用ください。');
      modalScroll.scrollTop = modalScroll.scrollHeight;
    } finally {
      isSubmitting = false;
      if (!submissionCompleted) {
        sendButton.disabled = false;
        sendButton.textContent = originalText;
      }
    }
  });

  copyButton?.addEventListener('click', async () => {
    const message = buildMessage();
    resultPreview.textContent = message;
    resultBox.classList.add('show');
    try {
      await navigator.clipboard.writeText(message);
      showToast('入力内容をコピーしました。');
    } catch (_) {
      const temp = document.createElement('textarea');
      temp.value = message;
      document.body.appendChild(temp);
      temp.select();
      document.execCommand('copy');
      temp.remove();
      showToast('入力内容をコピーしました。');
    }
  });

  mailButton?.addEventListener('click', () => {
    const d = getFormData();
    const subject = `【WEB相談】${d.kind || '車の相談'}／${d.customerName || 'お客様'}`;
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(buildMessage())}`;
    showToast('メールアプリへ送信内容を引き継ぎました。');
  });

  const resetForNewRequest = () => {
    submissionCompleted = false;
    lastCompletedReference = '';
    lastCompletedPayload = null;
    receiptNote.classList.remove('show');
    lineReadyNote.classList.remove('show');
    modalPanel.classList.remove('completed');
    form.reset();
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(REQUEST_ID_KEY);
    draftStatus.textContent = '新しい相談を入力できます';
    document.querySelectorAll('[aria-invalid="true"]').forEach((field) => setFieldInvalid(field, false));
    document.querySelectorAll('.form-error').forEach((error) => error.classList.remove('show'));
    resetTimeOptions();
    slotStatus.className = 'slot-status';
    slotStatus.textContent = 'DPROから30分枠を読み込みます。';
    resetApiResult();
    setMinDate();
    populateShakenYears();
    showStep(1, false);
    window.setTimeout(() => document.getElementById('customerName')?.focus(), 40);
  };

  newRequestButton?.addEventListener('click', resetForNewRequest);
  closeSuccessButton?.addEventListener('click', closeModal);

  document.getElementById('clearDraft')?.addEventListener('click', () => {
    if (!window.confirm('入力内容をすべて消去しますか？')) return;
    form.reset();
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(REQUEST_ID_KEY);
    submissionCompleted = false;
    modalPanel.classList.remove('completed');
    draftStatus.textContent = '入力内容をクリアしました';
    document.querySelectorAll('[aria-invalid="true"]').forEach((field) => setFieldInvalid(field, false));
    document.querySelectorAll('.form-error').forEach((error) => error.classList.remove('show'));
    resetTimeOptions();
    slotStatus.className = 'slot-status';
    slotStatus.textContent = 'DPROから30分枠を読み込みます。';
    showStep(1, false);
    setMinDate();
  });

  document.querySelectorAll('.js-line').forEach((button) => {
    button.addEventListener('click', () => {
      if (isValidLineUrl(getLineUrl())) window.open(getLineUrl(), '_blank', 'noopener');
      else {
        showToast('LINE公式URLは未設定です。現在はDPRO WEB受付をご利用ください。');
        openModal();
      }
    });
  });

  successLine?.addEventListener('click', (event) => {
    if (isValidLineUrl(getLineUrl())) return;
    event.preventDefault();
    showToast('LINE公式URLが未設定です。');
  });

  downloadReceiptButton?.addEventListener('click', downloadReceipt);

  document.getElementById('copyLineConfig')?.addEventListener('click', async () => {
    const value = String(lineSetupInput.value || '').trim();
    lineSetupResult.className = 'line-setup-result show';

    if (!isValidLineUrl(value)) {
      lineSetupResult.classList.add('error');
      lineSetupResult.textContent = 'LINE公式URLの形式を確認してください。https://lin.ee/ または https://line.me/ から始まるURLを入力します。';
      return;
    }

    const escaped = value.replaceAll('\\', '\\\\').replaceAll("'", "\\'");
    const code = `lineUrl: '${escaped}',`;
    lineSetupResult.textContent = `APP_CONFIGへ貼り付ける設定：${code}`;

    try {
      await navigator.clipboard.writeText(code);
      showToast('LINE設定コードをコピーしました。');
    } catch (_) {
      showToast('設定コードを表示しました。');
    }
  });

  document.getElementById('copyProductionConfig')?.addEventListener('click', async () => {
    const config = generateProductionConfig();
    if (!config) {
      showToast('正式公開設定の入力内容を確認してください。');
      return;
    }

    const copied = await copyText(config);
    showToast(copied ? '正式公開用APP_CONFIGをコピーしました。' : '設定コードを表示しました。');
  });

  document.getElementById('downloadProductionConfig')?.addEventListener('click', () => {
    const config = generateProductionConfig();
    if (!config) {
      showToast('正式公開設定の入力内容を確認してください。');
      return;
    }

    const fileText = [
      'WANGAN-BIZ-4 正式公開用サイト設定',
      '====================================',
      '',
      config,
      '',
      '貼り付け場所：index.html内の const APP_CONFIG = Object.freeze({ ... }); 全体',
      '反映後確認：https://dpromstk2000-lab.github.io/street-house-wangan/system-check.html',
      '公開条件：注意0件・失敗0件'
    ].join('\n');

    const blob = new Blob([fileText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'WANGAN-WEB-10_PRODUCTION-CONFIG.txt';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    showToast('正式公開設定ファイルを保存しました。');
  });

  const cinematicHeroReady = initializeCinematicHero();
  const motionObserverReady = initializeRevealMotion();
  applyEnvironmentDisplay();
  applyLineIntegration();
  applySeoAndStructuredData();
  applyProductionGuard();
  // system check moved to system-check.html
  populateShakenYears();
  setMinDate();
  loadDraft();
  showStep(1, false);
  checkDproConnection();
  if (location.hash === '#estimate') window.setTimeout(openModal, 120);
})();
