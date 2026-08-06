(() => {
  'use strict';

  // STEP WANGAN-BIZ-8-R2: 本番公開前の受付情報整理・追跡URL分離

  const CONFIG = window.DPRO_SITE_CONFIG || {};
  const API_BASE = String(CONFIG.apiBase || 'https://dpro-wangan-biz-api.dpromstk2000.workers.dev').replace(/\/+$/, '');
  const SHOP_CODE = String(CONFIG.shopCode || 'street_house_kitsuki');
  const ENVIRONMENT = String(CONFIG.environment || 'demo');
  const MAX_FILES = 5;
  const MAX_FILE_BYTES = 8 * 1024 * 1024;
  const DRAFT_KEY = `wanganBiz8R2Draft:${SHOP_CODE}`;
  const REQUEST_KEY = `wanganBiz8R2RequestId:${SHOP_CODE}`;

  const modeInfo = {
    instant: {
      label: '即時予約',
      title: '空き時間から予約',
      lead: 'DPROの空き枠を選択し、入庫予定へ登録します。',
      success: '予約を受け付けました。',
      status: '入庫予定'
    },
    provisional: {
      label: 'WEB仮予約',
      title: '入庫希望を仮受付',
      lead: '希望日時を仮受付し、店舗確認後に正式確定します。',
      success: '仮予約を受け付けました。',
      status: '仮入庫'
    },
    inquiry: {
      label: '写真付き相談',
      title: '写真付き見積もり相談',
      lead: '写真と車両情報をDPRO相談一覧へ登録します。',
      success: '写真付き相談を受け付けました。',
      status: '相談受付'
    }
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const els = {
    modal: $('#estimateModal'), panel: $('#estimateModal .modal-panel'), form: $('#estimateForm'), scroll: $('#modalScroll'),
    title: $('#estimateTitle'), lead: $('#estimateLead'), apiStatus: $('#apiStatus'), apiStatusText: $('#apiStatusText'), envChip: $('#environmentChip'),
    modeSummary: $('#selectedModeSummary'), service: $('#serviceCode'), serviceHelp: $('#serviceHelp'), serviceDetail: $('#serviceDetail'),
    reservationFields: $('#reservationFields'), inquiryFields: $('#inquiryFields'), reservationDate: $('#reservationDate'), reservationTime: $('#reservationTime'), slotStatus: $('#slotStatus'),
    preferredVisitDate: $('#preferredVisitDate'), photoInput: $('#photoInput'), photoList: $('#photoList'), uploadStatus: $('#uploadStatus'),
    step3Title: $('#step3Title'), step3Lead: $('#step3Lead'), draftStatus: $('#draftStatus'), footerStep: $('#footerStepLabel'),
    back: $('#backStep'), next: $('#nextStep'), send: $('#sendEstimate'), clear: $('#clearDraft'),
    result: $('#apiResult'), resultTitle: $('#apiResultTitle'), resultText: $('#apiResultText'), reference: $('#apiReference'), completionIcon: $('#completionIcon'), completionFlow: $('#completionFlow'), completionCaution: $('#completionCaution'),
    confirmReception: $('#confirmReception'), confirmCustomer: $('#confirmCustomer'), confirmRequest: $('#confirmRequest'),
    successPhone: $('#successPhone'), receipt: $('#downloadReceipt'), newRequest: $('#newRequest'), closeSuccess: $('#closeSuccess'), toast: $('.toast'),
    submitOverlay: $('#submitOverlay'), submitOverlayTitle: $('#submitOverlayTitle'), submitOverlayText: $('#submitOverlayText')
  };

  let bootstrap = null;
  let services = [];
  let currentMode = 'instant';
  let currentStep = 1;
  let selectedFiles = [];
  let isSubmitting = false;
  let completed = false;
  let completionData = null;
  let lastFocused = null;
  let draftTimer = null;
  let volatileRequestId = '';
  let volatileRequestFingerprint = '';
  let submitSlowTimer = null;

  const storageGet = key => { try { return window.localStorage?.getItem(key) || ''; } catch (_) { return ''; } };
  const storageSet = (key, value) => { try { window.localStorage?.setItem(key, value); return true; } catch (_) { return false; } };
  const storageRemove = key => { try { window.localStorage?.removeItem(key); } catch (_) {} };
  const makeUuid = () => {
    try { if (typeof crypto?.randomUUID === 'function') return crypto.randomUUID(); } catch (_) {}
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  };

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

  const showToast = (message) => {
    if (!els.toast) return;
    els.toast.textContent = message;
    els.toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => els.toast.classList.remove('show'), 2800);
  };

  const nextPaint = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  const revealResult = () => {
    setTimeout(() => {
      try { els.result.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (_) { els.scroll.scrollTop = els.scroll.scrollHeight; }
    }, 40);
  };

  const setSubmittingState = (active, title = 'DPROへ送信しています', text = '受付内容を登録しています。この画面を閉じずにお待ちください。') => {
    clearTimeout(submitSlowTimer);
    submitSlowTimer = null;
    els.form.setAttribute('aria-busy', String(Boolean(active)));
    els.panel.classList.toggle('is-submitting', Boolean(active));
    if (!els.submitOverlay) return;
    els.submitOverlay.hidden = !active;
    els.submitOverlay.classList.toggle('show', Boolean(active));
    if (els.submitOverlayTitle) els.submitOverlayTitle.textContent = title;
    if (els.submitOverlayText) els.submitOverlayText.textContent = text;
    if (active) {
      submitSlowTimer = setTimeout(() => {
        if (!isSubmitting || !els.submitOverlayText) return;
        els.submitOverlayText.textContent = '通信に少し時間がかかっています。二重送信を防ぐため、ボタンを押し直さずそのままお待ちください。';
      }, 8000);
    }
  };

  const fetchJson = async (url, options = {}, timeout = 20000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      const text = await response.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
      if (!response.ok || data.ok === false) {
        const error = new Error(data.message || `HTTP ${response.status}`);
        error.code = data.code || '';
        error.status = response.status;
        throw error;
      }
      return data;
    } finally {
      clearTimeout(timer);
    }
  };

  const modeServices = (mode, includeStopped = false) => services.filter(service =>
    service.bookingMode === mode && service.isPublic && service.isBookingEnabled &&
    (includeStopped || service.availableForWebsite)
  );

  const selectedService = () => services.find(service => service.code === els.service.value) || null;

  const setApiState = (state, text) => {
    els.apiStatus.className = `api-status ${state}`;
    els.apiStatusText.textContent = text;
  };

  const setModeCards = () => {
    ['instant', 'provisional', 'inquiry'].forEach(mode => {
      const available = modeServices(mode);
      const configured = modeServices(mode, true);
      const button = $(`[data-open-mode="${mode}"]`);
      const status = $(`[data-mode-status="${mode}"]`);
      const card = $(`[data-mode-card="${mode}"]`);
      if (!button || !status || !card) return;
      if (available.length) {
        button.disabled = false;
        button.textContent = `${modeInfo[mode].label}を開く`;
        status.textContent = `${available.length}サービス受付中`;
        card.classList.add('is-available');
        card.classList.remove('is-stopped');
      } else {
        button.disabled = true;
        button.textContent = configured.length ? '現在受付停止中' : '対象サービスなし';
        status.textContent = configured.length ? 'オーナー画面の受付スイッチがOFFです。' : '公開サービスが設定されていません。';
        card.classList.remove('is-available');
        card.classList.add('is-stopped');
      }
    });
  };

  const loadBootstrap = async () => {
    setApiState('checking', 'DPRO受付設定を確認中');
    try {
      bootstrap = await fetchJson(`${API_BASE}/api/public/site-bootstrap?shopCode=${encodeURIComponent(SHOP_CODE)}`, { headers: { Accept: 'application/json' } });
      services = Array.isArray(bootstrap.services) ? bootstrap.services : [];
      setModeCards();
      setApiState('connected', `DPRO接続済み｜${services.filter(s => s.availableForWebsite).length}サービス受付中`);
      maybeOpenFromUrl();
    } catch (error) {
      setApiState('failed', 'DPRO受付情報を取得できません');
      ['instant', 'provisional', 'inquiry'].forEach(mode => {
        const status = $(`[data-mode-status="${mode}"]`);
        if (status) status.textContent = '時間を置いて再読み込みするか、電話でお問い合わせください。';
      });
      console.warn('WANGAN-BIZ-5-R3 bootstrap failed', error);
    }
  };

  const getJstDate = (offsetDays = 0) => {
    const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
    now.setUTCDate(now.getUTCDate() + offsetDays);
    return now.toISOString().slice(0, 10);
  };

  const applyDateLimits = () => {
    const settings = bootstrap?.website_settings || {};
    const sameDay = Boolean(settings.same_day_booking_enabled);
    const horizon = Math.max(1, Number(settings.booking_horizon_days || 90));
    const min = getJstDate(sameDay ? 0 : 1);
    const max = getJstDate(horizon);
    els.reservationDate.min = min;
    els.reservationDate.max = max;
    els.preferredVisitDate.min = getJstDate(0);
    els.preferredVisitDate.max = max;
  };

  const fillServiceOptions = (mode, preferredCode = '') => {
    currentMode = mode;
    const list = modeServices(mode);
    els.service.innerHTML = '<option value="">サービスを選択</option>';
    list.forEach(service => {
      const option = document.createElement('option');
      option.value = service.code;
      const duration = service.durationMinutes ? `／${service.durationMinutes}分` : '';
      option.textContent = `${service.name}${duration}`;
      els.service.appendChild(option);
    });
    const validPreferred = list.some(service => service.code === preferredCode) ? preferredCode : '';
    els.service.value = validPreferred || (list.length === 1 ? list[0].code : '');
    updateModeUi();
    updateServiceDetail();
  };

  const updateModeUi = () => {
    const info = modeInfo[currentMode];
    els.title.textContent = info.title;
    els.lead.textContent = info.lead;
    els.modeSummary.innerHTML = `<span class="biz5-mode-badge ${currentMode}">${escapeHtml(info.label)}</span><div><b>${escapeHtml(info.title)}</b><span>${escapeHtml(info.lead)}</span></div>`;
    const reservation = currentMode !== 'inquiry';
    els.reservationFields.hidden = !reservation;
    els.inquiryFields.hidden = reservation;
    els.reservationDate.required = reservation;
    els.reservationTime.required = reservation;
    els.step3Title.textContent = reservation ? '予約日時・作業内容' : '写真・相談内容';
    els.step3Lead.textContent = reservation ? 'DPROの空き時間を先に選択してください。' : '写真と相談内容を先に入力してください。写真なしでも送信できます。';
    const step2Label = $('[data-step-indicator="2"] span:last-child');
    if (step2Label) step2Label.textContent = reservation ? '日時・内容' : '写真・相談';
    applyDateLimits();
  };

  const formatMoney = value => value === null || value === undefined || value === '' ? '' : `¥${Number(value).toLocaleString('ja-JP')}〜`;

  const updateServiceDetail = () => {
    const service = selectedService();
    if (!service) {
      els.serviceDetail.innerHTML = '<p>サービスを選択すると、所要時間・料金目安・受付方法を表示します。</p>';
      return;
    }
    const price = formatMoney(service.priceFrom) || service.priceNote || '内容確認後にご案内';
    els.serviceDetail.innerHTML = `<div><span>受付方法</span><b>${escapeHtml(modeInfo[service.bookingMode]?.label || '相談')}</b></div><div><span>所要時間</span><b>${service.durationMinutes ? `${service.durationMinutes}分` : '日時指定なし'}</b></div><div><span>料金目安</span><b>${escapeHtml(price)}</b></div><p>${escapeHtml(service.summary || '')}</p>`;
    els.reservationDate.value = '';
    resetTimeOptions('先に日付を選択');
  };

  const openModal = (mode = 'instant', serviceCode = '') => {
    if (!modeServices(mode).length) {
      showToast('この受付は現在停止中です。');
      return;
    }
    lastFocused = document.activeElement;
    fillServiceOptions(mode, serviceCode);
    completed = false;
    completionData = null;
    resetResult();
    showStep(1, false);
    els.modal.classList.add('open');
    els.modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(() => els.service.focus(), 60);
  };

  const closeModal = () => {
    if (isSubmitting) {
      showToast('DPROへ送信中です。完了するまで画面を閉じずにお待ちください。');
      return;
    }
    els.modal.classList.remove('open');
    els.modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    lastFocused?.focus?.();
  };

  const maybeOpenFromUrl = () => {
    const params = new URLSearchParams(location.search);
    const code = params.get('service') || '';
    const service = services.find(item => item.code === code && item.availableForWebsite);
    const requestedMode = params.get('mode');
    const mode = service?.bookingMode || (modeInfo[requestedMode] ? requestedMode : '');
    if ((service || mode) && location.hash === '#estimate') {
      setTimeout(() => openModal(mode || 'instant', service?.code || ''), 120);
    }
  };

  const resetTimeOptions = (message = '先に日付を選択') => {
    els.reservationTime.innerHTML = `<option value="">${escapeHtml(message)}</option>`;
    els.reservationTime.disabled = true;
    els.slotStatus.className = 'slot-status';
    els.slotStatus.textContent = 'DPROから空き時間を取得します。';
  };

  const loadSlots = async () => {
    const service = selectedService();
    const date = els.reservationDate.value;
    if (!service || !date || currentMode === 'inquiry') return resetTimeOptions();
    els.reservationTime.innerHTML = '<option value="">空き時間を読み込み中...</option>';
    els.reservationTime.disabled = true;
    els.slotStatus.className = 'slot-status loading';
    els.slotStatus.textContent = `${service.durationMinutes}分連続して確保できる枠を確認しています。`;
    try {
      const data = await fetchJson(`${API_BASE}/api/public/reservation-time-options?shopCode=${encodeURIComponent(SHOP_CODE)}&serviceCode=${encodeURIComponent(service.code)}&date=${encodeURIComponent(date)}`, { headers: { Accept: 'application/json' } });
      const slots = Array.isArray(data.slots) ? data.slots.filter(slot => !slot.isFull && Number(slot.remaining || 0) > 0) : [];
      if (!data.available || !slots.length) throw new Error(data.reason || '選択できる空き時間がありません。');
      els.reservationTime.innerHTML = '<option value="">希望時間を選択</option>';
      slots.forEach(slot => {
        const option = document.createElement('option');
        option.value = String(slot.time || '').slice(0, 5);
        const end = slot.endTime ? `〜${String(slot.endTime).slice(0, 5)}` : '';
        option.textContent = `${option.value}${end}（残り${Number(slot.remaining || 1)}）`;
        els.reservationTime.appendChild(option);
      });
      els.reservationTime.disabled = false;
      els.slotStatus.className = 'slot-status ok';
      els.slotStatus.textContent = `現在の空き枠を取得しました。所要時間は約${service.durationMinutes}分です。`;
    } catch (error) {
      resetTimeOptions(error.message || '空き時間を取得できませんでした。');
      els.slotStatus.className = 'slot-status ng';
      els.slotStatus.textContent = `${error.message || '空き時間を取得できませんでした。'} 別の日を選ぶか、電話でご確認ください。`;
    }
  };

  const formData = () => Object.fromEntries(new FormData(els.form).entries());

  const validateStep = step => {
    $$('[aria-invalid="true"]').forEach(field => field.removeAttribute('aria-invalid'));
    const panel = $(`[data-step-panel="${step}"]`);
    const error = $(`[data-step-error="${step}"]`);
    let valid = true;
    if (step === 1) {
      const service = selectedService();
      valid = Boolean(service?.availableForWebsite && service.bookingMode === currentMode);
      els.service.setAttribute('aria-invalid', String(!valid));
    } else if (step === 2) {
      const message = $('#message');
      const privacy = $('#privacyAgree');
      if (!message.value.trim()) { message.setAttribute('aria-invalid', 'true'); valid = false; }
      if (!privacy.checked) { privacy.setAttribute('aria-invalid', 'true'); valid = false; }
      if (currentMode !== 'inquiry') {
        if (!els.reservationDate.value) { els.reservationDate.setAttribute('aria-invalid', 'true'); valid = false; }
        if (!els.reservationTime.value) { els.reservationTime.setAttribute('aria-invalid', 'true'); valid = false; }
      }
    } else if (step === 3) {
      ['customerName', 'phone'].forEach(id => {
        const field = $(`#${id}`);
        const okay = field.checkValidity();
        field.setAttribute('aria-invalid', String(!okay));
        if (!okay) valid = false;
      });
      const digits = $('#phone').value.replace(/\D/g, '').replace(/^81/, '0');
      if (!/^0\d{9,10}$/.test(digits)) {
        $('#phone').setAttribute('aria-invalid', 'true');
        valid = false;
      }
    }
    error?.classList.toggle('show', !valid);
    if (!valid) panel?.querySelector('[aria-invalid="true"]')?.focus();
    return valid;
  };

  const pair = (label, value, className = '') => `<div><dt>${escapeHtml(label)}</dt><dd class="${className}">${escapeHtml(value || '未入力')}</dd></div>`;

  const updateConfirmation = () => {
    const d = formData();
    const service = selectedService();
    els.confirmReception.innerHTML = [pair('受付方法', modeInfo[currentMode].label), pair('サービス', service?.name), pair('所要時間', service?.durationMinutes ? `${service.durationMinutes}分` : '日時指定なし'), pair('料金目安', formatMoney(service?.priceFrom) || service?.priceNote || '内容確認後')].join('');
    els.confirmCustomer.innerHTML = [pair('お名前', d.customerName), pair('電話番号', d.phone), pair('メール', d.email), pair('連絡方法', d.contactMethod), pair('車両', [d.carMaker, d.carModel, d.carYear].filter(Boolean).join(' / ')), pair('ナンバー下4桁', d.plateLast4), pair('走行距離', d.mileageKm ? `${d.mileageKm}km` : '')].join('');
    const dateTime = currentMode === 'inquiry' ? (d.preferredVisitDate ? `${d.preferredVisitDate} ${d.preferredVisitTime || ''}` : '指定なし') : `${d.reservationDate || ''} ${d.reservationTime || ''}`;
    els.confirmRequest.innerHTML = [pair('希望日時', dateTime), pair('持込部品等', d.partsInfo || 'なし'), pair('添付写真', currentMode === 'inquiry' ? `${selectedFiles.length}枚` : '対象外'), pair('内容', d.message, 'confirm-message')].join('');
  };

  const showStep = (step, focus = true) => {
    currentStep = Math.max(1, Math.min(4, step));
    $$('[data-step-panel]').forEach(panel => panel.classList.toggle('active', Number(panel.dataset.stepPanel) === currentStep));
    $$('[data-step-indicator]').forEach(item => {
      const number = Number(item.dataset.stepIndicator);
      item.classList.toggle('active', number === currentStep);
      item.classList.toggle('done', number < currentStep);
    });
    els.back.hidden = currentStep === 1 || completed;
    els.next.hidden = currentStep === 4 || completed;
    els.send.hidden = currentStep !== 4 || completed;
    els.clear.hidden = completed;
    els.successPhone.hidden = !completed;
    els.receipt.hidden = !completed;
    els.newRequest.hidden = !completed;
    els.closeSuccess.hidden = !completed;
    els.footerStep.textContent = `${currentStep} / 4`;
    if (currentStep === 4) updateConfirmation();
    els.scroll.scrollTop = 0;
    if (focus) setTimeout(() => $(`[data-step-panel="${currentStep}"] input, [data-step-panel="${currentStep}"] select, [data-step-panel="${currentStep}"] textarea, [data-step-panel="${currentStep}"] button`)?.focus(), 30);
  };

  const addPhotos = files => {
    const candidates = [...files];
    for (const file of candidates) {
      if (selectedFiles.length >= MAX_FILES) { showToast(`写真は最大${MAX_FILES}枚までです。`); break; }
      if (!/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type)) { showToast(`${file.name}は対応していない形式です。`); continue; }
      if (file.size > 15 * 1024 * 1024) { showToast(`${file.name}は容量が大きすぎます。`); continue; }
      const duplicate = selectedFiles.some(item => item.file.name === file.name && item.file.size === file.size && item.file.lastModified === file.lastModified);
      if (duplicate) continue;
      selectedFiles.push({ id: makeUuid(), file, preview: URL.createObjectURL(file), status: 'ready', attachmentId: '' });
    }
    els.photoInput.value = '';
    renderPhotos();
    saveDraftSoon();
  };

  const removePhoto = id => {
    const item = selectedFiles.find(photo => photo.id === id);
    if (item) URL.revokeObjectURL(item.preview);
    selectedFiles = selectedFiles.filter(photo => photo.id !== id);
    renderPhotos();
  };

  const renderPhotos = () => {
    if (!selectedFiles.length) {
      els.photoList.innerHTML = '<div class="biz5-photo-empty">写真はまだ選択されていません。</div>';
      return;
    }
    els.photoList.innerHTML = selectedFiles.map(item => `<article class="biz5-photo-item"><img src="${item.preview}" alt="選択した写真"><div><b>${escapeHtml(item.file.name)}</b><span>${(item.file.size / 1024 / 1024).toFixed(1)}MB</span><em class="${item.status}">${item.status === 'uploaded' ? 'アップロード済み' : item.status === 'uploading' ? '送信中' : item.status === 'error' ? '失敗' : '送信待ち'}</em></div><button type="button" data-remove-photo="${item.id}" ${item.status === 'uploading' ? 'disabled' : ''}>削除</button></article>`).join('');
    $$('[data-remove-photo]', els.photoList).forEach(button => button.addEventListener('click', () => removePhoto(button.dataset.removePhoto)));
  };

  const imageToUploadFile = async file => {
    if (/image\/(heic|heif)/i.test(file.type)) {
      if (file.size > MAX_FILE_BYTES) throw new Error(`${file.name}は8MB以下にしてください。`);
      return file;
    }
    try {
      const bitmap = await createImageBitmap(file);
      const maxSide = 1800;
      const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d', { alpha: false }).drawImage(bitmap, 0, 0, width, height);
      bitmap.close?.();
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.84));
      if (blob && blob.size <= MAX_FILE_BYTES) return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg', lastModified: file.lastModified });
    } catch (_) {}
    if (file.size > MAX_FILE_BYTES) throw new Error(`${file.name}は圧縮できませんでした。8MB以下の写真を選択してください。`);
    return file;
  };

  const hashText = value => {
    let hash = 2166136261;
    const text = String(value || '');
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  };

  const submissionFingerprint = () => {
    const d = formData();
    const normalized = {
      mode: currentMode,
      serviceCode: d.serviceCode || '',
      reservationDate: d.reservationDate || '',
      reservationTime: d.reservationTime || '',
      preferredVisitDate: d.preferredVisitDate || '',
      preferredVisitTime: d.preferredVisitTime || '',
      customerName: String(d.customerName || '').trim(),
      phone: String(d.phone || '').replace(/\D/g, '').replace(/^81/, '0'),
      email: String(d.email || '').trim().toLowerCase(),
      contactMethod: d.contactMethod || '',
      carMaker: String(d.carMaker || '').trim(),
      carModel: String(d.carModel || '').trim(),
      carYear: String(d.carYear || '').trim(),
      plateLast4: String(d.plateLast4 || '').trim(),
      mileageKm: String(d.mileageKm || '').trim(),
      shakenYear: String(d.shakenYear || '').trim(),
      shakenMonth: String(d.shakenMonth || '').trim(),
      partsInfo: String(d.partsInfo || '').trim(),
      message: String(d.message || '').trim(),
      files: selectedFiles.map(item => ({
        name: item.file?.name || '',
        size: Number(item.file?.size || 0),
        lastModified: Number(item.file?.lastModified || 0)
      }))
    };
    return hashText(JSON.stringify(normalized));
  };

  const readRequestState = () => {
    const raw = storageGet(REQUEST_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.id === 'string' && typeof parsed.fingerprint === 'string') return parsed;
    } catch (_) {}
    // R4以前の文字列形式は別内容へ使い回されるため破棄する。
    storageRemove(REQUEST_KEY);
    return null;
  };

  const requestId = () => {
    const fingerprint = submissionFingerprint();
    const stored = readRequestState();
    if (stored?.fingerprint === fingerprint && stored.id) {
      volatileRequestId = stored.id;
      volatileRequestFingerprint = fingerprint;
      return stored.id;
    }
    if (volatileRequestId && volatileRequestFingerprint === fingerprint) return volatileRequestId;
    const id = `wangan-biz5-${makeUuid()}`;
    volatileRequestId = id;
    volatileRequestFingerprint = fingerprint;
    storageSet(REQUEST_KEY, JSON.stringify({ id, fingerprint, createdAt: Date.now() }));
    return id;
  };

  const resetRequestId = () => {
    volatileRequestId = '';
    volatileRequestFingerprint = '';
    storageRemove(REQUEST_KEY);
  };

  const uploadPhotos = async () => {
    if (currentMode !== 'inquiry' || !selectedFiles.length) return [];
    const ids = [];
    for (let index = 0; index < selectedFiles.length; index += 1) {
      const item = selectedFiles[index];
      if (item.attachmentId) { ids.push(item.attachmentId); continue; }
      item.status = 'uploading'; renderPhotos();
      els.uploadStatus.className = 'biz5-upload-status show';
      els.uploadStatus.textContent = `写真を送信中 ${index + 1} / ${selectedFiles.length}`;
      try {
        const uploadFile = await imageToUploadFile(item.file);
        const body = new FormData();
        body.append('shopCode', SHOP_CODE);
        body.append('serviceCode', selectedService()?.code || 'photo_estimate');
        body.append('webRequestId', requestId());
        body.append('file', uploadFile, uploadFile.name);
        const result = await fetchJson(`${API_BASE}/api/public/web-uploads`, { method: 'POST', headers: { Accept: 'application/json' }, body }, 45000);
        item.attachmentId = result.attachmentId;
        item.status = 'uploaded';
        ids.push(result.attachmentId);
      } catch (error) {
        item.status = 'error'; renderPhotos();
        els.uploadStatus.className = 'biz5-upload-status show error';
        els.uploadStatus.textContent = error.message || '写真を送信できませんでした。';
        throw error;
      }
      renderPhotos();
    }
    els.uploadStatus.className = 'biz5-upload-status show success';
    els.uploadStatus.textContent = `${ids.length}枚の写真を安全にアップロードしました。`;
    return ids;
  };

  const utm = () => {
    const params = new URLSearchParams(location.search);
    return { utmSource: params.get('utm_source') || '', utmMedium: params.get('utm_medium') || '', utmCampaign: params.get('utm_campaign') || '' };
  };

  const buildPayload = attachmentIds => {
    const d = formData();
    const common = {
      shopCode: SHOP_CODE,
      serviceCode: d.serviceCode,
      name: String(d.customerName || '').trim(),
      phone: String(d.phone || '').trim(),
      maker: String(d.carMaker || '').trim(),
      carName: String(d.carModel || '').trim(),
      vehicleLabel: [d.carMaker, d.carModel, d.carYear].filter(Boolean).join(' / '),
      plateLast4: String(d.plateLast4 || '').trim(),
      mileageKm: String(d.mileageKm || '').trim(),
      preferredContactMethod: d.contactMethod || '電話',
      detail: [d.email ? `メール：${d.email}` : '', d.partsInfo ? `持込部品等：${d.partsInfo}` : '', d.message || ''].filter(Boolean).join('\n'),
      message: [d.email ? `メール：${d.email}` : '', d.partsInfo ? `持込部品等：${d.partsInfo}` : '', d.message || ''].filter(Boolean).join('\n'),
      shakenYear: d.shakenYear || '', shakenMonth: d.shakenMonth || '',
      privacyAgreed: true, privacyAgreedAt: new Date().toISOString(),
      sourceChannel: 'WEBSITE',
      sourcePage: CONFIG.stripTrackingFromOperationalRecords === false ? `${location.pathname}${location.search}` : location.pathname,
      pageUrl: CONFIG.stripTrackingFromOperationalRecords === false ? location.href : `${location.origin}${location.pathname}`,
      idempotencyKey: requestId(), ...utm()
    };
    if (currentMode === 'inquiry') return { ...common, preferredVisitDate: d.preferredVisitDate || '', preferredVisitTime: d.preferredVisitTime || '', attachmentIds, customerMode: 'new', vehicleMode: 'new' };
    return { ...common, reservationDate: d.reservationDate, reservationTime: d.reservationTime, nextShakenDate: d.shakenYear && d.shakenMonth ? `${d.shakenYear}-${String(d.shakenMonth).padStart(2, '0')}-01` : '' };
  };

  const resetResult = () => {
    setSubmittingState(false);
    els.panel.classList.remove('completed');
    els.result.className = 'api-result';
    els.resultTitle.textContent = 'DPRO受付結果';
    els.resultText.textContent = '';
    els.reference.className = 'api-reference';
    els.reference.textContent = '';
    els.completionIcon.hidden = true;
    els.completionFlow.hidden = true;
    els.completionCaution.hidden = true;
  };

  const complete = result => {
    completed = true;
    setSubmittingState(false);
    els.panel.classList.add('completed');
    completionData = { result, mode: currentMode, service: selectedService(), values: formData(), photoCount: selectedFiles.length };
    const info = modeInfo[currentMode];
    const reference = result.reservationId || result.inquiryId || result.requestId || '';
    els.result.className = 'api-result show completion success';
    els.completionIcon.hidden = false;
    els.resultTitle.textContent = result.replayed ? '同じ受付を確認しました' : info.success;
    els.resultText.textContent = result.message || (currentMode === 'inquiry' ? '内容を確認後、店舗からご連絡します。' : '選択した日時でDPROへ登録しました。');
    els.reference.className = 'api-reference show';
    els.reference.textContent = `受付番号：${reference}`;
    els.completionFlow.hidden = false;
    els.completionFlow.innerHTML = currentMode === 'instant'
      ? '<div><b>01　予約受付完了</b><span>DPROの入庫予定へ登録しました。</span></div><div><b>02　店舗で確認</b><span>車両・作業内容を確認します。</span></div><div><b>03　ご来店</b><span>変更が必要な場合は店舗から連絡します。</span></div>'
      : currentMode === 'provisional'
        ? '<div><b>01　仮予約受付完了</b><span>DPROへ「仮入庫」で登録しました。</span></div><div><b>02　店舗で内容確認</b><span>車両・作業内容・所要時間を確認します。</span></div><div><b>03　正式確定</b><span>店舗からの連絡をもって確定します。</span></div>'
        : `<div><b>01　相談受付完了</b><span>DPRO相談一覧へ登録しました。</span></div><div><b>02　写真・内容確認</b><span>${selectedFiles.length}枚の写真と相談内容を確認します。</span></div><div><b>03　店舗から連絡</b><span>見積もりや次の手順をご案内します。</span></div>`;
    els.completionCaution.hidden = false;
    els.completionCaution.textContent = currentMode === 'instant' ? '受付内容の変更・キャンセルは店舗へお電話ください。' : currentMode === 'provisional' ? 'この時点では正式確定ではありません。店舗からの確認連絡をお待ちください。' : '写真の確認URLは店舗管理用です。お客様の画面には公開されません。';
    storageRemove(DRAFT_KEY);
    resetRequestId();
    showStep(4, false);
    revealResult();
    showToast(`${info.success} 受付番号を画面に表示しました。`);
  };

  const submit = async event => {
    event.preventDefault();
    if (isSubmitting) {
      showToast('現在送信中です。完了するまでそのままお待ちください。');
      return;
    }
    if (completed) {
      showToast('この受付は送信済みです。受付番号をご確認ください。');
      revealResult();
      return;
    }

    const invalidStep = [1, 2, 3].find(step => !validateStep(step));
    if (invalidStep) {
      showStep(invalidStep);
      showToast('未入力または確認が必要な項目があります。赤枠の項目をご確認ください。');
      return;
    }

    isSubmitting = true;
    els.send.disabled = true;
    const oldText = els.send.textContent;
    const firstTitle = currentMode === 'inquiry' && selectedFiles.length ? '写真を安全に送信しています' : 'DPROへ送信しています';
    const firstText = currentMode === 'inquiry' && selectedFiles.length
      ? '写真のアップロード後、相談内容をDPROへ登録します。この画面を閉じずにお待ちください。'
      : '予約内容をDPROへ登録しています。この画面を閉じずにお待ちください。';

    els.send.textContent = currentMode === 'inquiry' && selectedFiles.length ? '写真を送信中...' : 'DPROへ送信中...';
    resetResult();
    els.result.className = 'api-result show sending';
    els.resultTitle.textContent = firstTitle;
    els.resultText.textContent = firstText;
    setSubmittingState(true, firstTitle, firstText);
    revealResult();
    await nextPaint();

    try {
      const attachmentIds = await uploadPhotos();
      els.send.textContent = 'DPROへ登録中...';
      setSubmittingState(true, 'DPROへ登録しています', '受付番号を発行し、店舗の管理画面へ登録しています。');
      const payload = buildPayload(attachmentIds);
      const endpoint = currentMode === 'inquiry' ? '/api/public/web-inquiries' : '/api/public/web-reservations';
      const result = await fetchJson(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'Idempotency-Key': requestId() },
        body: JSON.stringify(payload)
      }, 45000);
      complete(result);
      setApiState('connected', 'DPRO接続済み｜受付登録完了');
    } catch (error) {
      setSubmittingState(false);
      els.panel.classList.remove('completed');
      els.result.className = 'api-result show failure';
      const keyConflict = error?.code === 'IDEMPOTENCY_CONFLICT' || /同じ送信キー/.test(String(error?.message || ''));
      if (keyConflict) {
        resetRequestId();
        if (currentMode === 'inquiry') {
          selectedFiles.forEach(item => {
            item.attachmentId = '';
            if (item.status === 'uploaded') item.status = 'ready';
          });
          renderPhotos();
        }
        els.resultTitle.textContent = '送信情報を新しくしました';
        els.resultText.textContent = '古い二重送信防止情報を自動で解除しました。今回の受付はまだ登録されていません。内容を確認し、「DPROへ送信」をもう一度だけ押してください。';
        setApiState('connected', 'DPRO接続済み｜再送準備完了');
        showToast('送信情報を更新しました。もう一度だけ送信してください。');
      } else {
        els.resultTitle.textContent = 'DPROへ送信できませんでした';
        els.resultText.textContent = error.message || '通信状態を確認して再度お試しください。';
        setApiState('failed', 'DPRO送信エラー');
        showToast(error.message || '受付を送信できませんでした。');
      }
      revealResult();
    } finally {
      isSubmitting = false;
      setSubmittingState(false);
      if (!completed) { els.send.disabled = false; els.send.textContent = oldText; }
    }
  };


  const receiptText = () => {
    if (!completionData) return '';
    const { result, mode, service, values, photoCount } = completionData;
    return [
      'STREET HOUSE WANGAN DPRO WEB受付控え', '====================================',
      `受付方法：${modeInfo[mode].label}`, `サービス：${service?.name || ''}`,
      `受付番号：${result.reservationId || result.inquiryId || result.requestId || ''}`,
      `状態：${result.status || modeInfo[mode].status}`,
      `お名前：${values.customerName || ''}`, `電話番号：${values.phone || ''}`,
      `車両：${[values.carMaker, values.carModel, values.carYear].filter(Boolean).join(' / ')}`,
      `希望日時：${mode === 'inquiry' ? `${values.preferredVisitDate || '指定なし'} ${values.preferredVisitTime || ''}` : `${values.reservationDate || ''} ${values.reservationTime || ''}`}`,
      `添付写真：${photoCount}枚`, `内容：${values.message || ''}`,
      `受付日時：${new Date().toLocaleString('ja-JP')}`,
      '', '変更・キャンセル：080-5241-0066'
    ].join('\n');
  };

  const downloadReceipt = () => {
    const blob = new Blob([receiptText()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `WANGAN_WEB受付控え_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  const draftData = () => {
    const d = formData();
    return { mode: currentMode, ...d, savedAt: Date.now(), photoCount: selectedFiles.length };
  };

  const saveDraftSoon = () => {
    clearTimeout(draftTimer);
    draftTimer = setTimeout(() => {
      if (completed) return;
      if (storageSet(DRAFT_KEY, JSON.stringify(draftData()))) els.draftStatus.textContent = selectedFiles.length ? '入力内容を保存済み（写真は再選択が必要）' : '入力内容を端末内へ保存済み';
    }, 350);
  };

  const restoreDraft = () => {
    try {
      const draft = JSON.parse(storageGet(DRAFT_KEY) || 'null');
      if (!draft || Date.now() - Number(draft.savedAt || 0) > 7 * 24 * 60 * 60 * 1000) return;
      const mode = modeInfo[draft.mode] ? draft.mode : currentMode;
      fillServiceOptions(mode, draft.serviceCode || '');
      Object.entries(draft).forEach(([name, value]) => {
        const field = els.form.elements.namedItem(name);
        if (!field || ['mode', 'savedAt', 'photoCount'].includes(name)) return;
        if (field.type === 'checkbox') field.checked = Boolean(value);
        else if (typeof value === 'string') field.value = value;
      });
      if (draft.photoCount) els.draftStatus.textContent = `入力内容を復元しました。写真${draft.photoCount}枚は再選択してください。`;
      else els.draftStatus.textContent = '前回の入力内容を復元しました';
      updateModeUi(); updateServiceDetail();
      if (els.reservationDate.value) loadSlots();
    } catch (_) {}
  };

  const resetForm = (keepModal = true) => {
    selectedFiles.forEach(item => URL.revokeObjectURL(item.preview));
    selectedFiles = [];
    els.form.reset();
    renderPhotos();
    els.uploadStatus.className = 'biz5-upload-status'; els.uploadStatus.textContent = '';
    storageRemove(DRAFT_KEY); resetRequestId();
    completed = false; completionData = null; resetResult();
    els.form.setAttribute('aria-busy', 'false');
    els.send.disabled = false;
    els.send.textContent = 'DPROへ送信';
    fillServiceOptions(currentMode);
    showStep(1, false);
    els.draftStatus.textContent = '新しい受付を入力できます';
    if (keepModal) setTimeout(() => els.service.focus(), 30);
  };

  $$('[data-open-mode]').forEach(button => button.addEventListener('click', () => openModal(button.dataset.openMode)));
  $$('[data-close-modal]').forEach(item => item.addEventListener('click', closeModal));
  els.service.addEventListener('change', () => { updateServiceDetail(); saveDraftSoon(); });
  els.reservationDate.addEventListener('change', loadSlots);
  els.photoInput.addEventListener('change', event => addPhotos(event.target.files));
  els.next.addEventListener('click', () => { if (validateStep(currentStep)) showStep(currentStep + 1); else showToast('未入力または確認が必要な項目があります。赤枠の項目をご確認ください。'); });
  els.back.addEventListener('click', () => showStep(currentStep - 1));
  els.form.addEventListener('submit', submit);
  els.form.addEventListener('input', event => { event.target.setAttribute?.('aria-invalid', 'false'); saveDraftSoon(); });
  els.form.addEventListener('change', event => { event.target.setAttribute?.('aria-invalid', 'false'); saveDraftSoon(); });
  els.clear.addEventListener('click', () => { if (confirm('入力内容をすべて消去しますか？')) resetForm(); });
  els.receipt.addEventListener('click', downloadReceipt);
  els.newRequest.addEventListener('click', () => resetForm());
  els.closeSuccess.addEventListener('click', closeModal);
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && els.modal.classList.contains('open')) closeModal(); });

  const populateYears = () => {
    const select = $('#shakenYear');
    const year = new Date().getFullYear();
    for (let value = year - 1; value <= year + 8; value += 1) {
      const option = document.createElement('option'); option.value = value; option.textContent = `${value}年`; select.appendChild(option);
    }
  };

  console.info('WANGAN-BIZ-8-R2 proposal reception active / no search registration');
  if (els.envChip) {
    const showEnvironmentBadge = CONFIG.showPublicEnvironmentBadge === true;
    els.envChip.hidden = !showEnvironmentBadge;
    if (showEnvironmentBadge) {
      els.envChip.textContent = ENVIRONMENT === 'production' ? 'PRODUCTION' : ENVIRONMENT.toUpperCase();
      els.envChip.classList.toggle('production', ENVIRONMENT === 'production');
    }
  }
  populateYears(); renderPhotos(); resetTimeOptions();
  loadBootstrap().then(restoreDraft);
})();
