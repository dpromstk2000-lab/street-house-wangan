/**
 * STREET HOUSE WANGAN / Japanese heading line-break audit
 * 2026-08-08
 * Public-facing typography only. No DPRO business logic is changed.
 */
(() => {
  'use strict';

  const STYLE_ID = 'wangan-heading-linebreak-style';

  function installStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      html[lang="ja"] :where(h1,h2,h3).audited-heading,
      html[lang="ja"] :where(h1,h2,h3).heading-balanced {
        text-wrap: pretty !important;
        line-break: strict !important;
        word-break: normal !important;
        overflow-wrap: normal !important;
        hanging-punctuation: allow-end;
      }

      @supports (word-break: auto-phrase) {
        html[lang="ja"] :where(h1,h2,h3).audited-heading,
        html[lang="ja"] :where(h1,h2,h3).heading-balanced {
          word-break: auto-phrase !important;
        }
      }

      .heading-audit-line {
        display: block;
        width: fit-content;
        max-width: 100%;
        white-space: nowrap;
      }

      .heading-audit-nowrap {
        width: max-content;
        max-width: 100%;
        white-space: nowrap !important;
        text-wrap: nowrap !important;
      }

      /* Regular two-column title areas were slightly too narrow for Japanese. */
      @media (min-width:1081px) {
        .business-section:not(.dpro-integration-section):not(.dpro-unified-section) .section-head {
          grid-template-columns: minmax(0, 1.05fr) minmax(0, .95fr) !important;
          gap: clamp(40px, 5vw, 72px) !important;
        }
        .business-section .section-head .heading-audit-nowrap {
          font-size: clamp(36px, 4.05vw, 56px) !important;
        }
      }

      @media (max-width:720px) {
        .heading-audit-line,
        .heading-audit-nowrap {
          width: auto;
          max-width: 100%;
          white-space: normal !important;
          text-wrap: pretty !important;
        }
        @supports (word-break: auto-phrase) {
          .heading-audit-line,
          .heading-audit-nowrap {
            word-break: auto-phrase !important;
          }
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Only headings where a designer-selected break is clearly better than browser auto-wrap.
  const forcedBreaks = new Map([
    ['今日の営業情報を、リアルタイムに。', ['今日の営業情報を、', 'リアルタイムに。']],
    ['現在公開中の受付メニュー。', ['現在公開中の', '受付メニュー。']],
    ['日常も、こだわりも。', ['日常も、', 'こだわりも。']],
    ['車検・整備のWEB受付。', ['車検・整備の', 'WEB受付。']],
    ['必要な情報へ、迷わず進める。', ['必要な情報へ、', '迷わず進める。']],
    ['必要な整備を、優先順位とともに。', ['必要な整備を、', '優先順位とともに。']],
    ['こんな症状はご相談ください。', ['こんな症状は', 'ご相談ください。']],
    ['持込・カスタムの受付状況。', ['持込・カスタムの', '受付状況。']],
    ['持込部品も、事前確認から。', ['持込部品も、', '事前確認から。']],
    ['ご相談時にあるとスムーズです。', ['ご相談時にあると', 'スムーズです。']],
    ['営業日・定休日・臨時休業。', ['営業日・定休日・', '臨時休業。']],
    ['対応できる領域を、視覚的に。', ['対応できる領域を、', '視覚的に。']],
    ['正式な事例は、判断材料まで掲載。', ['正式な事例は、', '判断材料まで掲載。']],
    ['受付方法を選んでください。', ['受付方法を選んで', 'ください。']],
    ['受付後も、LINEとDPROでつながります。', ['受付後も、LINEとDPROで', 'つながります。']]
  ]);

  const keepOnOneLineDesktop = new Set([
    'ホームページ受付メニュー',
    '日常の小さな整備から。',
    '走る目的から考える。',
    '料金の目安。',
    'ご利用の流れ。',
    '料金・受付について。',
    '大切にしていること。',
    '店舗案内。',
    '相談から納車まで。'
  ]);

  function normalizeText(el) {
    return (el.textContent || '').replace(/\s+/g, '').trim();
  }

  function applyHeadingAudit() {
    installStyle();

    document.querySelectorAll('h1.audited-heading,h2.audited-heading,h3.audited-heading,h1.heading-balanced,h2.heading-balanced,h3.heading-balanced').forEach(el => {
      if (el.dataset.headingAuditDone === '1') return;

      // Existing designer-controlled spans are already intentional and should not be rebuilt.
      if (el.querySelector('.heading-line')) {
        el.dataset.headingAuditDone = '1';
        return;
      }

      const original = normalizeText(el);
      if (!original) {
        el.dataset.headingAuditDone = '1';
        return;
      }

      const lines = forcedBreaks.get(original);
      if (lines) {
        el.textContent = '';
        lines.forEach(lineText => {
          const span = document.createElement('span');
          span.className = 'heading-audit-line';
          span.textContent = lineText;
          el.appendChild(span);
        });
      } else if (keepOnOneLineDesktop.has(original)) {
        el.classList.add('heading-audit-nowrap');
      }

      el.dataset.headingAuditDone = '1';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyHeadingAudit, { once: true });
  } else {
    applyHeadingAudit();
  }

  // DPRO can insert cards after page load. Re-apply only to newly added headings.
  const observer = new MutationObserver(() => applyHeadingAudit());
  const startObserver = () => document.body && observer.observe(document.body, { childList: true, subtree: true });
  if (document.body) startObserver();
  else document.addEventListener('DOMContentLoaded', startObserver, { once: true });
})();
