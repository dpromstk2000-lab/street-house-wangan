(() => {
  'use strict';

  const CONFIG = window.DPRO_SITE_CONFIG || {};
  const ROOT = String(CONFIG.siteBaseUrl || 'https://dpromstk2000-lab.github.io/street-house-wangan/')
    .replace(/\/?$/, '/');

  const normalizePhoneHref = value => `tel:${String(value || '').replace(/[^0-9+]/g, '')}`;
  const currentPage = () => {
    const file = location.pathname.split('/').pop();
    return file || 'index.html';
  };
  const absolutePageUrl = () => currentPage() === 'index.html' ? ROOT : new URL(currentPage(), ROOT).href;

  function setMeta(selector, attribute, value) {
    const el = document.querySelector(selector);
    if (el && value) el.setAttribute(attribute, value);
  }

  function replaceExactText(root, from, to) {
    if (!root || !from || !to || from === to) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      if (node.nodeValue && node.nodeValue.includes(from)) {
        node.nodeValue = node.nodeValue.split(from).join(to);
      }
    });
  }

  const PHONE_TEXT_RE = /(?:0\d{1,4}[-－ー]?\d{1,4}[-－ー]?\d{3,4})/g;

  function compactPhone(value) {
    return String(value || '').replace(/[^\d+]/g, '');
  }

  function isPlaceholderPhone(value) {
    const compact = compactPhone(value);
    const configured = Array.isArray(CONFIG.placeholderPhones) ? CONFIG.placeholderPhones : [];
    const blocked = configured.map(compactPhone);
    return !compact
      || blocked.includes(compact)
      || /^0+$/.test(compact)
      || /^(?:0978)?0{6,}$/.test(compact);
  }

  function verifiedPhone(kind = 'primary') {
    const value = kind === 'fixed'
      ? String(CONFIG.fixedPhone || '')
      : String(CONFIG.primaryPhone || CONFIG.defaultPhone || '');
    return value;
  }

  function phoneLooksNumeric(text) {
    return /^[\s\d０-９\-－ー()（）+]+$/.test(String(text || '').trim());
  }

  function replacePhonePlaceholders(root, replacement) {
    if (!root || !replacement) return;
    const placeholders = [
      ...(Array.isArray(CONFIG.placeholderPhones) ? CONFIG.placeholderPhones : []),
      '0978-00-0000',
      '0978000000'
    ].filter(Boolean);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const parent = node.parentElement;
      if (!parent || ['SCRIPT','STYLE','TEXTAREA'].includes(parent.tagName)) return;
      let value = node.nodeValue || '';
      placeholders.forEach(bad => {
        value = value.split(bad).join(replacement);
      });
      if (node.nodeValue !== value) node.nodeValue = value;
    });
  }

  function applyVerifiedStoreInfo() {
    const primary = verifiedPhone('primary');
    const fixed = verifiedPhone('fixed');
    if (!primary) return;

    replacePhonePlaceholders(document.body, primary);

    document.querySelectorAll('a[href^="tel:"], [data-store-phone]').forEach(el => {
      const kind = el.dataset.storePhone === 'fixed' ? 'fixed' : 'primary';
      const value = kind === 'fixed' && fixed ? fixed : primary;
      const expectedHref = normalizePhoneHref(value);

      if (el.tagName === 'A' && el.getAttribute('href') !== expectedHref) {
        el.setAttribute('href', expectedHref);
      }

      const currentText = (el.textContent || '').trim();
      if (phoneLooksNumeric(currentText) || isPlaceholderPhone(currentText)) {
        if (currentText !== value) el.textContent = value;
      }
    });

    // Fixed/mobile rows are always restored even after dpro-site.js updates every tel link.
    document.querySelectorAll('dt').forEach(dt => {
      const label = (dt.textContent || '').trim();
      const link = dt.parentElement?.querySelector('dd a');
      if (!link) return;
      if (label === '固定電話' && fixed) {
        link.dataset.storePhone = 'fixed';
        if (link.getAttribute('href') !== normalizePhoneHref(fixed)) link.href = normalizePhoneHref(fixed);
        if ((link.textContent || '').trim() !== fixed) link.textContent = fixed;
      }
      if (label === '携帯電話') {
        link.dataset.storePhone = 'primary';
        if (link.getAttribute('href') !== normalizePhoneHref(primary)) link.href = normalizePhoneHref(primary);
        if ((link.textContent || '').trim() !== primary) link.textContent = primary;
      }
    });

    const jsonLd = document.getElementById('localBusinessJsonLd');
    if (jsonLd) {
      try {
        const data = JSON.parse(jsonLd.textContent || '{}');
        if (data.telephone !== primary) {
          data.telephone = primary;
          jsonLd.textContent = JSON.stringify(data);
        }
      } catch (_) {}
    }
  }

  let storeInfoObserver = null;
  let storeInfoQueued = false;
  function initVerifiedStoreInfoGuard() {
    if (!document.body || storeInfoObserver) return;
    storeInfoObserver = new MutationObserver(() => {
      if (storeInfoQueued) return;
      storeInfoQueued = true;
      requestAnimationFrame(() => {
        storeInfoQueued = false;
        applyVerifiedStoreInfo();
      });
    });
    storeInfoObserver.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['href']
    });
  }

  function applyPublicBusinessInfo(runtime = window.DPRO_RUNTIME || {}) {
    const primaryPhone = String(CONFIG.primaryPhone || runtime.phone || CONFIG.defaultPhone || '');
    const fixedPhone = String(CONFIG.fixedPhone || '');
    const fullAddress = String(CONFIG.fullAddress || '');
    const openingHours = String(CONFIG.openingHoursLabel || '');
    const regularHoliday = String(CONFIG.regularHolidayLabel || '');

    if (fullAddress) {
      replaceExactText(document.body, '大分県杵築市大字守江1291-3', fullAddress);
      replaceExactText(document.body, '〒873-0033 大分県杵築市大字守江1291-3',
        `〒${CONFIG.postalCode || '873-0033'} ${fullAddress}`);
    }

    document.querySelectorAll('[data-dpro-phone]').forEach(el => {
      el.textContent = primaryPhone;
      if (el.tagName === 'A') el.href = normalizePhoneHref(primaryPhone);
    });

    // dpro-site.jsが一般のtelリンクを更新した後でも、固定電話欄だけは固定電話へ戻します。
    document.querySelectorAll('dt').forEach(dt => {
      if ((dt.textContent || '').trim() !== '固定電話') return;
      const link = dt.parentElement?.querySelector('dd a[href^="tel:"]');
      if (link && fixedPhone) {
        link.textContent = fixedPhone;
        link.href = normalizePhoneHref(fixedPhone);
        link.dataset.dproStaticPhone = 'fixed';
      }
    });

    applyLineIntegration(runtime);

    document.querySelectorAll('[data-dpro-map]').forEach(el => {
      const mapUrl = String(runtime.mapUrl || CONFIG.defaultMapUrl || '');
      if (mapUrl) {
        el.href = mapUrl;
        el.hidden = false;
      }
    });


    // 契約前の提案サイトでは、旧公式サイトで確認できた営業時間を静的正本として表示します。
    document.querySelectorAll('[data-dpro-footer-hours]').forEach(el => {
      if (openingHours) el.textContent = `${openingHours}${regularHoliday ? `／${regularHoliday}定休` : ''}`;
    });

    document.querySelectorAll('dt').forEach(dt => {
      const label = (dt.textContent || '').trim();
      const dd = dt.parentElement?.querySelector('dd');
      if (!dd) return;
      if (label === '営業時間' && openingHours) dd.textContent = openingHours;
      if (label === '定休日' && regularHoliday) dd.textContent = regularHoliday;
    });

    applyVerifiedStoreInfo();
  }

  function validPublicUrl(value) {
    try {
      const url = new URL(String(value || ''), location.href);
      return /^https?:$/.test(url.protocol) ? url.href : '';
    } catch (_) {
      return '';
    }
  }

  function ensureLineToast() {
    let toast = document.getElementById('lineIntegrationToast');
    if (toast) return toast;
    toast = document.createElement('div');
    toast.id = 'lineIntegrationToast';
    toast.className = 'line-integration-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.innerHTML = '<b>LINE公式連携対応</b><br>契約後に店舗のLINE公式URLを設定すると、このボタンからLINE相談を開始できます。';
    document.body.appendChild(toast);
    return toast;
  }

  let lineToastTimer = 0;
  function showLinePendingNotice() {
    const toast = ensureLineToast();
    clearTimeout(lineToastTimer);
    toast.classList.add('show');
    lineToastTimer = window.setTimeout(() => toast.classList.remove('show'), 3600);
  }

  function applyLineIntegration(runtime = window.DPRO_RUNTIME || {}) {
    const configuredUrl = validPublicUrl(runtime.lineUrl || CONFIG.defaultLineUrl || '');
    const connected = Boolean(CONFIG.lineIntegrationEnabled !== false && configuredUrl);
    const pendingMain = String(CONFIG.linePendingLabel || 'LINE公式連携対応');
    const pendingSub = String(CONFIG.linePendingNote || '契約・設定後に開通');
    const connectedMain = String(CONFIG.lineConnectedLabel || 'LINEで相談');

    document.body.dataset.lineIntegration = connected ? 'connected' : 'pending';

    document.querySelectorAll('[data-dpro-line]').forEach(el => {
      el.hidden = false;
      el.classList.toggle('is-line-connected', connected);
      el.classList.toggle('is-line-pending', !connected);
      el.classList.remove('is-disabled');

      const main = el.querySelector('.line-main');
      const sub = el.querySelector('.line-sub');
      if (main) main.textContent = connected ? connectedMain : pendingMain;
      if (sub) {
        sub.textContent = connected ? 'LINE公式を開く' : pendingSub;
        sub.hidden = false;
      }

      if (connected) {
        el.href = configuredUrl;
        el.target = '_blank';
        el.rel = 'noopener noreferrer';
        el.removeAttribute('aria-disabled');
        el.title = connectedMain;
      } else {
        el.removeAttribute('href');
        el.removeAttribute('target');
        el.removeAttribute('rel');
        el.setAttribute('aria-disabled', 'true');
        el.setAttribute('role', 'button');
        el.tabIndex = 0;
        el.title = `${pendingMain}（${pendingSub}）`;
      }
    });

    document.querySelectorAll('[data-line-integration-status]').forEach(el => {
      el.textContent = connected
        ? 'LINE公式への導線は開通しています。'
        : 'LINE公式URLは契約・設定後に登録します。現在は連携機能のご案内表示です。';
    });
  }

  function initLineIntegrationInteraction() {
    const activate = target => {
      if (!target?.matches?.('[data-dpro-line][aria-disabled="true"]')) return;
      showLinePendingNotice();
    };
    document.addEventListener('click', event => {
      const target = event.target.closest?.('[data-dpro-line]');
      if (!target || target.getAttribute('aria-disabled') !== 'true') return;
      event.preventDefault();
      activate(target);
    });
    document.addEventListener('keydown', event => {
      if (!['Enter', ' '].includes(event.key)) return;
      const target = event.target.closest?.('[data-dpro-line]');
      if (!target || target.getAttribute('aria-disabled') !== 'true') return;
      event.preventDefault();
      activate(target);
    });
  }

  function applySeo(runtime = window.DPRO_RUNTIME || {}) {
    const indexable = CONFIG.searchIndexEnabled === true;
    const pageUrl = absolutePageUrl();
    const ogImage = new URL(CONFIG.ogImage || 'ogp.jpg', ROOT).href;
    const phone = String(CONFIG.primaryPhone || CONFIG.defaultPhone || runtime.phone || '');

    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement('meta');
      robots.name = 'robots';
      document.head.appendChild(robots);
    }
    robots.content = indexable
      ? 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1'
      : 'noindex,nofollow';

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = pageUrl;

    setMeta('meta[property="og:url"]', 'content', pageUrl);
    setMeta('meta[property="og:image"]', 'content', ogImage);
    setMeta('meta[name="twitter:image"]', 'content', ogImage);

    const jsonLd = document.getElementById('localBusinessJsonLd');
    if (jsonLd) {
      let data = {};
      try { data = JSON.parse(jsonLd.textContent || '{}'); } catch (_) {}
      data['@context'] = 'https://schema.org';
      data['@type'] = 'AutoRepair';
      data.name = CONFIG.shopName || data.name;
      data.url = ROOT;
      data.telephone = phone;
      data.image = ogImage;
      data.address = {
        '@type': 'PostalAddress',
        streetAddress: CONFIG.streetAddress || '',
        addressLocality: CONFIG.addressLocality || '',
        addressRegion: CONFIG.addressRegion || '',
        postalCode: CONFIG.postalCode || '',
        addressCountry: 'JP'
      };
      data.priceRange = data.priceRange || '¥¥';
      if (CONFIG.schemaOpeningHours) data.openingHours = CONFIG.schemaOpeningHours;
      else { delete data.openingHours; delete data.openingHoursSpecification; }
      const sameAs = [runtime.lineUrl || CONFIG.defaultLineUrl].filter(Boolean);
      if (sameAs.length) data.sameAs = sameAs;
      else delete data.sameAs;
      jsonLd.textContent = JSON.stringify(data);
    }

    document.body.dataset.releaseStage = CONFIG.releaseStage || 'staging';
    document.body.dataset.environment = CONFIG.environment || 'demo';
    document.body.dataset.contractStatus = CONFIG.contractStatus || 'unknown';
  }

  function applyNavigationAccessibility() {
    document.querySelectorAll('.nav a.active').forEach(link => link.setAttribute('aria-current', 'page'));
    document.querySelectorAll('a[target="_blank"]').forEach(link => {
      const rel = new Set(String(link.rel || '').split(/\s+/).filter(Boolean));
      rel.add('noopener');
      rel.add('noreferrer');
      link.rel = [...rel].join(' ');
    });
  }

  function initMenu() {
    const menu = document.querySelector('.menu');
    const nav = document.querySelector('.nav');
    const close = () => {
      nav?.classList.remove('open');
      menu?.setAttribute('aria-expanded', 'false');
    };
    menu?.addEventListener('click', () => {
      const open = nav?.classList.toggle('open');
      menu.setAttribute('aria-expanded', String(Boolean(open)));
    });
    nav?.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') close();
    });
    document.addEventListener('click', event => {
      if (!nav?.classList.contains('open')) return;
      if (nav.contains(event.target) || menu?.contains(event.target)) return;
      close();
    });
  }

  function initReveal() {
    const reveal = [...document.querySelectorAll('.motion-reveal')];
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      }), { threshold: .12, rootMargin: '0px 0px -35px' });
      reveal.forEach(el => observer.observe(el));
    } else {
      reveal.forEach(el => el.classList.add('is-visible'));
    }
  }

  function initHeroVideo() {
    const video = document.getElementById('heroVideo');
    const toggle = document.getElementById('heroVideoToggle');
    if (!video) return;

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      video.pause();
      if (toggle) {
        toggle.textContent = '▶ PLAY';
        toggle.setAttribute('aria-pressed', 'true');
      }
    }

    toggle?.addEventListener('click', async () => {
      if (video.paused) {
        try { await video.play(); } catch (_) {}
      } else {
        video.pause();
      }
      toggle.textContent = video.paused ? '▶ PLAY' : 'Ⅱ PAUSE';
      toggle.setAttribute('aria-pressed', String(video.paused));
    });
    video.addEventListener('play', () => {
      if (toggle) toggle.textContent = 'Ⅱ PAUSE';
    });
    video.addEventListener('pause', () => {
      if (toggle) toggle.textContent = '▶ PLAY';
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && !video.paused) video.pause();
    });
  }

  function applyAll(runtime) {
    applySeo(runtime);
    applyPublicBusinessInfo(runtime);
    applyNavigationAccessibility();
  }

  document.addEventListener('DOMContentLoaded', () => {
    initMenu();
    initReveal();
    initHeroVideo();
    initLineIntegrationInteraction();
    initVerifiedStoreInfoGuard();
    applyAll();
    setTimeout(applyVerifiedStoreInfo, 1200);
    setTimeout(applyVerifiedStoreInfo, 3000);

    // DPROの動的店舗情報反映後に、共通情報と固定電話を最終整合させます。
    window.addEventListener('dpro:ready', event => {
      const runtime = event.detail || window.DPRO_RUNTIME || {};
      setTimeout(() => applyAll(runtime), 0);
      setTimeout(() => applyAll(runtime), 250);
      setTimeout(() => applyAll(runtime), 800);
    }, { passive: true });
  });

  window.addEventListener('pageshow', () => {
    setTimeout(() => {
      applyAll();
      applyVerifiedStoreInfo();
    }, 0);
  });
})();
