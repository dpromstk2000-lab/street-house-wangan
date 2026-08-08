(() => {
  'use strict';

  const CONFIG = window.DPRO_SITE_CONFIG || {};
  const API_BASE = String(CONFIG.apiBase || '').replace(/\/+$/, '');
  const SHOP_CODE = String(CONFIG.shopCode || 'street_house_kitsuki');
  const CACHE_KEY = `dproWanganBootstrap:${SHOP_CODE}:v4`;
  const CACHE_MS = Math.max(1, Number(CONFIG.cacheMinutes || 5)) * 60 * 1000;
  const page = document.body?.dataset?.page || 'unknown';

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

  const pick = (obj, keys, fallback = '') => {
    for (const key of keys) {
      const value = obj?.[key];
      if (value !== undefined && value !== null && String(value).trim() !== '') return value;
    }
    return fallback;
  };

  const normalizePhoneHref = (value) => `tel:${String(value || '').replace(/[^0-9+]/g, '')}`;
  const formatPhone = (value) => String(value || CONFIG.defaultPhone || '080-5241-0066');
  const formatTime = (value) => String(value || '').slice(0, 5);
  const formatDate = (ymd, withYear = false) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(ymd || ''))) return String(ymd || '');
    const [y,m,d] = ymd.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const w = ['日','月','火','水','木','金','土'][date.getDay()];
    return withYear ? `${y}年${m}月${d}日（${w}）` : `${m}月${d}日（${w}）`;
  };
  const formatMoney = (value) => value === null || value === undefined || value === ''
    ? '' : `¥${Number(value).toLocaleString('ja-JP')}〜`;

  function ensureGlobalStatusMount() {
    let mount = document.getElementById('dproGlobalStatus');
    if (mount) return mount;
    const header = document.querySelector('.header');
    if (!header) return null;
    mount = document.createElement('div');
    mount.id = 'dproGlobalStatus';
    mount.className = 'dpro-global-status is-loading';
    mount.setAttribute('role', 'status');
    mount.setAttribute('aria-live', 'polite');
    mount.innerHTML = '<div class="dpro-global-status-inner"><span class="dpro-status-dot"></span><b>営業情報を確認中</b><span>営業時間・休業日を読み込んでいます。</span></div>';
    header.insertAdjacentElement('afterend', mount);
    return mount;
  }

  function readCache() {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
      if (parsed && Date.now() - parsed.savedAt < CACHE_MS && parsed.data?.ok) return parsed.data;
    } catch (_) {}
    return null;
  }

  function writeCache(data) {
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), data })); } catch (_) {}
  }

  async function fetchJson(url, options = {}, timeoutMs = 12000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal, headers: { Accept: 'application/json', ...(options.headers || {}) } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.ok === false) throw new Error(data?.message || `HTTP ${response.status}`);
      return data;
    } finally { clearTimeout(timer); }
  }

  async function loadBootstrap() {
    if (window.__DPRO_TEST_PAYLOAD__) return window.__DPRO_TEST_PAYLOAD__;
    const cached = readCache();
    if (cached) return cached;
    if (!API_BASE) throw new Error('API URLが未設定です。');
    const data = await fetchJson(`${API_BASE}/api/public/site-bootstrap?shopCode=${encodeURIComponent(SHOP_CODE)}`);
    writeCache(data);
    return data;
  }

  function resolveRuntime(data) {
    const settings = data?.website_settings || data?.shop_settings || {};
    const legacy = data?.shop_settings || {};
    const phone = formatPhone(pick(legacy, ['phone','phone_number','telephone','tel','shop_phone'], CONFIG.defaultPhone));
    const lineUrl = pick(settings, ['website_line_url'], CONFIG.defaultLineUrl || '');
    const mapUrl = pick(settings, ['website_map_url'], CONFIG.defaultMapUrl || '');
    const baseUrl = pick(settings, ['website_base_url'], '');
    const runtime = { phone, lineUrl, mapUrl, baseUrl, settings, data };
    window.DPRO_RUNTIME = runtime;
    window.dispatchEvent(new CustomEvent('dpro:ready', { detail: runtime }));
    return runtime;
  }

  function updateRobots() {
    const robots = document.querySelector('meta[name="robots"]');
    if (robots) robots.content = CONFIG.searchIndexEnabled ? 'index,follow' : 'noindex,nofollow';
  }

  function updateMetadata(runtime) {
    const current = new URL(location.href);
    current.search = ''; current.hash = '';
    const canonical = document.getElementById('canonicalLink') || document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.href = current.href;
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.content = current.href;
    const pageFile = location.pathname.endsWith('/') ? '' : location.pathname.split('/').pop();
    const rootUrl = String(runtime.baseUrl || CONFIG.siteBaseUrl || new URL(pageFile ? './' : '.', current).href).replace(/\/?$/, '/');
    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) ogImage.content = new URL('ogp.jpg', rootUrl).href;
    const jsonLd = document.getElementById('localBusinessJsonLd');
    if (jsonLd) {
      try {
        const data = JSON.parse(jsonLd.textContent || '{}');
        data.url = rootUrl;
        data.telephone = runtime.phone;
        jsonLd.textContent = JSON.stringify(data);
      } catch (_) {}
    }
  }

  function updateLinks(runtime) {
    document.querySelectorAll('a[href^="tel:"]').forEach(link => {
      link.href = normalizePhoneHref(runtime.phone);
      if (/\d{2,4}[-－]\d{2,4}/.test(link.textContent || '')) link.textContent = runtime.phone;
    });
    document.querySelectorAll('[data-dpro-phone]').forEach(el => {
      el.textContent = runtime.phone;
      if (el.tagName === 'A') el.href = normalizePhoneHref(runtime.phone);
    });
    document.querySelectorAll('[data-dpro-line]').forEach(el => {
      if (runtime.lineUrl) {
        el.href = runtime.lineUrl; el.hidden = false; el.classList.remove('is-disabled');
      } else {
        el.removeAttribute('href'); el.classList.add('is-disabled');
      }
    });
    document.querySelectorAll('[data-dpro-map]').forEach(el => {
      if (runtime.mapUrl) { el.href = runtime.mapUrl; el.hidden = false; }
    });
  }

  function renderGlobalStatus(data) {
    const mount = ensureGlobalStatusMount();
    if (!mount) return;
    const status = data.businessStatus || {};
    const open = status.isOpen === true;
    const closed = status.isOpen === false;
    const hours = status.openTime && status.closeTime ? `${formatTime(status.openTime)}〜${formatTime(status.closeTime)}` : '';
    mount.className = `dpro-global-status ${open ? 'is-open' : closed ? 'is-closed' : 'is-unknown'}`;
    const main = open ? `本日は営業日です${hours ? `　${hours}` : ''}` : closed ? '本日は休業日です' : '本日の営業情報をご確認ください';
    const sub = closed && status.reason ? status.reason : status.nextClosedDate ? `次の休業日：${formatDate(status.nextClosedDate)}${status.nextClosedReason ? `（${status.nextClosedReason}）` : ''}` : '営業日・空き状況は最新情報を自動反映しています。';
    mount.innerHTML = `<div class="dpro-global-status-inner"><span class="dpro-status-dot"></span><b>${escapeHtml(main)}</b><span>${escapeHtml(sub)}</span><a href="about.html#business-calendar">営業カレンダー</a></div>`;
  }

  function renderError(error) {
    const mount = ensureGlobalStatusMount();
    if (mount) {
      mount.className = 'dpro-global-status is-error';
      mount.innerHTML = `<div class="dpro-global-status-inner"><span class="dpro-status-dot"></span><b>営業情報を取得できませんでした</b><span>お急ぎの場合はお電話でご確認ください。</span><a href="${normalizePhoneHref(CONFIG.defaultPhone)}">${escapeHtml(CONFIG.defaultPhone)}</a></div>`;
    }
    document.querySelectorAll('[data-dpro-loading]').forEach(el => {
      el.innerHTML = `<div class="dpro-empty"><b>最新情報を取得できませんでした。</b><span>ページの基本情報はそのままご覧いただけます。時間を置いて再度お試しください。</span></div>`;
    });
    console.warn('WANGAN-BIZ-4 bootstrap failed', error);
  }

  function serviceMode(service) {
    const map = {
      instant: { label: '即時予約', tone: 'instant', action: 'WEB予約へ' },
      provisional: { label: '仮予約', tone: 'provisional', action: '仮予約へ' },
      inquiry: { label: '相談受付', tone: 'inquiry', action: '写真・見積もり相談へ' }
    };
    return map[service.bookingMode] || { label: '相談', tone: 'inquiry', action: '相談する' };
  }

  function serviceCta(service) {
    const mode = serviceMode(service);
    if (!service.isBookingEnabled) return { label: '現在受付停止中', disabled: true };
    if (!service.websiteSwitchEnabled) return { label: 'WEB受付準備中', disabled: true };
    if (!service.availableForWebsite) return { label: '受付状況を確認', disabled: true };
    return { label: mode.action, href: `contact.html?service=${encodeURIComponent(service.code)}#estimate`, disabled: false };
  }

  function serviceCard(service) {
    const mode = serviceMode(service);
    const cta = serviceCta(service);
    const price = formatMoney(service.priceFrom) || service.priceNote || '内容確認後にご案内';
    return `<article class="dpro-service-card" data-service-code="${escapeHtml(service.code)}">
      <div class="dpro-service-top"><span class="dpro-mode ${mode.tone}">${escapeHtml(mode.label)}</span><span class="dpro-duration">${service.durationMinutes ? `${Number(service.durationMinutes)}分` : '日時指定なし'}</span></div>
      <h3>${escapeHtml(service.name)}</h3>
      <p>${escapeHtml(service.summary || '')}</p>
      <dl><div><dt>料金目安</dt><dd>${escapeHtml(price)}</dd></div><div><dt>受付状態</dt><dd>${service.availableForWebsite ? 'WEB受付中' : service.websiteSwitchEnabled ? '要確認' : '準備中'}</dd></div></dl>
      ${cta.disabled ? `<span class="dpro-service-button is-disabled" aria-disabled="true">${escapeHtml(cta.label)}</span>` : `<a class="dpro-service-button" href="${cta.href}">${escapeHtml(cta.label)}</a>`}
    </article>`;
  }

  function filterServices(services, mount) {
    const categories = String(mount.dataset.categories || '').split(',').map(v => v.trim()).filter(Boolean);
    let result = Array.isArray(services) ? services.filter(s => s.isPublic !== false) : [];
    if (categories.length) result = result.filter(s => categories.includes(s.category));
    const limit = Number(mount.dataset.limit || 0);
    if (limit > 0) result = result.slice(0, limit);
    return result;
  }

  function renderServices(data) {
    document.querySelectorAll('[data-dpro-services]').forEach(mount => {
      const services = filterServices(data.services || [], mount);
      if (!services.length) {
        mount.innerHTML = '<div class="dpro-empty"><b>現在公開中のサービスはありません。</b><span>詳しくは店舗へお問い合わせください。</span></div>';
        return;
      }
      mount.innerHTML = `<div class="dpro-service-grid">${services.map(serviceCard).join('')}</div><p class="dpro-sync-note">料金・所要時間・受付状況は最新の店舗情報を反映しています。</p>`;
    });
  }

  function noticeCard(notice) {
    const labels = { closure:'休業案内', hours:'営業時間', campaign:'ご案内', emergency:'緊急案内', general:'お知らせ' };
    return `<article class="dpro-notice-card ${escapeHtml(notice.type || 'general')}"><div><span>${escapeHtml(labels[notice.type] || 'お知らせ')}</span>${notice.publishedFrom ? `<time>${escapeHtml(new Date(notice.publishedFrom).toLocaleDateString('ja-JP'))}</time>` : ''}</div><h3>${escapeHtml(notice.title)}</h3>${notice.body ? `<p>${escapeHtml(notice.body).replaceAll('\n','<br>')}</p>` : ''}</article>`;
  }

  function renderNotices(data) {
    document.querySelectorAll('[data-dpro-notices]').forEach(mount => {
      const notices = Array.isArray(data.notices) ? data.notices : [];
      const limit = Number(mount.dataset.limit || 0);
      const rows = limit > 0 ? notices.slice(0, limit) : notices;
      mount.innerHTML = rows.length ? `<div class="dpro-notice-list">${rows.map(noticeCard).join('')}</div>` : '<div class="dpro-empty compact"><b>現在、臨時のお知らせはありません。</b><span>営業時間や休業日の変更がある場合は、こちらでお知らせします。</span></div>';
    });
  }

  function renderBusinessCards(data, runtime) {
    document.querySelectorAll('[data-dpro-business]').forEach(mount => {
      const s = data.businessStatus || {};
      const open = s.isOpen === true;
      const closed = s.isOpen === false;
      const hours = s.openTime && s.closeTime ? `${formatTime(s.openTime)}〜${formatTime(s.closeTime)}` : '営業時間は店舗へご確認ください';
      const services = Array.isArray(data.services) ? data.services : [];
      const enabled = services.filter(x => x.availableForWebsite).length;
      mount.innerHTML = `<div class="dpro-business-card ${open ? 'open' : closed ? 'closed' : 'unknown'}">
        <span class="dpro-business-label">TODAY / ${escapeHtml(formatDate(s.date || new Date().toISOString().slice(0,10)))}</span>
        <h3>${open ? '本日は営業しています' : closed ? '本日は休業日です' : '本日の営業状況'}</h3>
        <p>${closed && s.reason ? escapeHtml(s.reason) : escapeHtml(hours)}</p>
        <div class="dpro-business-meta"><span>次の休業日</span><b>${s.nextClosedDate ? escapeHtml(formatDate(s.nextClosedDate)) : '未設定'}</b></div>
        <div class="dpro-business-meta"><span>WEB受付中メニュー</span><b>${enabled}件</b></div>
        <div class="dpro-business-actions"><a href="about.html#business-calendar">営業カレンダー</a><a href="${normalizePhoneHref(runtime.phone)}">電話で確認</a></div>
      </div>`;
    });
  }

  function renderPricing(data) {
    document.querySelectorAll('[data-dpro-pricing]').forEach(mount => {
      const services = filterServices(data.services || [], mount);
      mount.innerHTML = services.length ? `<div class="dpro-price-table">${services.map(s => {
        const mode = serviceMode(s);
        const price = formatMoney(s.priceFrom) || s.priceNote || '内容確認後';
        return `<div class="dpro-price-row"><div><span class="dpro-mode ${mode.tone}">${mode.label}</span><b>${escapeHtml(s.name)}</b><small>${escapeHtml(s.summary || '')}</small></div><div><strong>${escapeHtml(price)}</strong><span>${s.durationMinutes ? `目安 ${Number(s.durationMinutes)}分` : '日時指定なし'}</span></div></div>`;
      }).join('')}</div><p class="dpro-sync-note">料金・所要時間は最新の公開情報です。車種・状態・部品により正式なお見積もりは変わる場合があります。</p>` : '<div class="dpro-empty">公開料金を準備中です。</div>';
    });
  }

  function renderCalendar(data) {
    document.querySelectorAll('[data-dpro-calendar]').forEach(mount => {
      const calendar = Array.isArray(data.calendar) ? data.calendar : [];
      if (!calendar.length) {
        mount.innerHTML = '<div class="dpro-empty"><b>営業カレンダーを取得できませんでした。</b><span>お電話でご確認ください。</span></div>';
        return;
      }
      const rows = calendar.slice(0, 35).map(day => {
        const isOpen = Boolean(day.is_open ?? day.available);
        const hours = isOpen && (day.open_time || day.openTime) ? `${formatTime(day.open_time || day.openTime)}〜${formatTime(day.close_time || day.closeTime)}` : '';
        const reason = day.reason || (isOpen ? '営業日' : '休業日');
        return `<article class="dpro-calendar-day ${isOpen ? 'open' : 'closed'}"><time datetime="${escapeHtml(day.date)}">${escapeHtml(formatDate(day.date))}</time><b>${isOpen ? '営業' : '休業'}</b><span>${escapeHtml(hours || reason)}</span></article>`;
      });
      mount.innerHTML = `<div class="dpro-calendar-legend"><span><i class="open"></i>営業日</span><span><i class="closed"></i>休業日・臨時休業</span></div><div class="dpro-calendar-grid">${rows.join('')}</div><p class="dpro-sync-note">定休日・臨時休業・特別営業など、最新の営業予定を表示しています。</p>`;
    });
  }

  function renderContactState(data, runtime) {
    document.querySelectorAll('[data-dpro-contact-state]').forEach(mount => {
      const ws = data.website_settings || {};
      const switches = [
        ['即時予約', Boolean(ws.website_booking_enabled)],
        ['WEB仮予約', Boolean(ws.website_provisional_enabled)],
        ['写真・見積もり相談', Boolean(ws.website_inquiry_enabled)]
      ];
      mount.innerHTML = `<div class="dpro-contact-state"><div><span class="eyebrow">ONLINE RECEPTION</span><h2>ホームページ受付状況</h2><p>現在ご利用いただける受付方法をご案内します。</p></div><div class="dpro-switch-list">${switches.map(([label,on]) => `<div class="${on ? 'on' : 'off'}"><span>${escapeHtml(label)}</span><b>${on ? '受付中' : '準備中'}</b></div>`).join('')}</div><div class="dpro-contact-actions"><a class="btn btn-primary" href="${normalizePhoneHref(runtime.phone)}">電話で相談</a>${runtime.lineUrl ? `<a class="btn btn-outline" href="${escapeHtml(runtime.lineUrl)}" target="_blank" rel="noopener">LINEで相談</a>` : ''}</div></div>`;
    });
  }

  function applyServiceQuery(data) {
    if (page !== 'contact') return;
    const code = new URLSearchParams(location.search).get('service');
    if (!code) return;
    const service = (data.services || []).find(s => s.code === code);
    if (!service) return;
    const kind = document.getElementById('kind');
    const message = document.getElementById('message');
    if (kind) {
      const map = { oil_change:'オイル交換・メンテナンス', tire_service:'オイル交換・メンテナンス', inspection_consult:'故障・不調の相談', shaken_consult:'車検・点検', shaken_dropoff:'車検・点検', repair_dropoff:'故障・不調の相談', parts_consult:'持込パーツ取付', custom_consult:'カスタム・チューニング', photo_estimate:'その他' };
      const desired = map[code];
      [...kind.options].forEach(option => { if (option.textContent.trim() === desired) option.selected = true; });
    }
    if (message && !message.value) message.value = `【${service.name}】について相談したいです。\n`;
    document.querySelectorAll('.js-open-estimate').forEach(btn => btn.dataset.serviceCode = code);
  }

  function updateFooter(data) {
    const s = data.businessStatus || {};
    const hours = s.openTime && s.closeTime ? `${formatTime(s.openTime)}〜${formatTime(s.closeTime)}` : '';
    document.querySelectorAll('[data-dpro-footer-hours]').forEach(el => {
      if (hours) el.textContent = `${hours}／休日は営業カレンダーをご確認ください`;
    });
  }

  async function init() {
    ensureGlobalStatusMount();
    updateRobots();
    try {
      const data = await loadBootstrap();
      const runtime = resolveRuntime(data);
      document.documentElement.dataset.dproState = 'ready';
      renderGlobalStatus(data);
      updateMetadata(runtime);
      updateLinks(runtime);
      renderBusinessCards(data, runtime);
      renderNotices(data);
      renderServices(data);
      renderPricing(data);
      renderCalendar(data);
      renderContactState(data, runtime);
      applyServiceQuery(data);
      updateFooter(data);
    } catch (error) {
      document.documentElement.dataset.dproState = 'error';
      renderError(error);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
