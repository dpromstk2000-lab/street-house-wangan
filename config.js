/**
 * STREET HOUSE WANGAN Website Public Config
 * STEP WANGAN-BIZ-8
 *
 * 公開してよい店舗情報だけを置きます。
 * Supabaseキー、Service Role、管理コード、秘密情報は置きません。
 *
 * BIZ-8では本番運用モードへ切り替えますが、検索公開はまだOFFです。
 * 最終承認後のSTEPで searchIndexEnabled と goLiveApproved をONにします。
 */
window.DPRO_SITE_CONFIG = Object.freeze({
  version: 'WANGAN-BIZ-8-SITE-20260806',
  environment: 'production',
  releaseStage: 'ready',

  apiBase: 'https://dpro-wangan-biz-api.dpromstk2000.workers.dev',
  shopCode: 'street_house_kitsuki',
  timezone: 'Asia/Tokyo',

  siteBaseUrl: 'https://dpromstk2000-lab.github.io/street-house-wangan/',
  searchIndexEnabled: false,
  goLiveApproved: false,
  showPublicEnvironmentBadge: false,
  stripTrackingFromOperationalRecords: true,
  schemaOpeningHours: '',
  ogImage: 'ogp.jpg',

  shopName: 'ストリートハウス湾岸通り',
  shopNameEnglish: 'STREET HOUSE WANGAN',
  defaultPhone: '080-5241-0066',
  primaryPhone: '080-5241-0066',
  fixedPhone: '0978-63-8706',

  postalCode: '873-0033',
  addressRegion: '大分県',
  addressLocality: '杵築市',
  streetAddress: '大字守江1291-3',
  fullAddress: '大分県杵築市大字守江1291-3',

  openingHoursLabel: '9:00〜19:00',
  emergencyHoursLabel: '夜間・休日は緊急時応相談',

  defaultLineUrl: '',
  defaultMapUrl: 'https://www.google.com/maps/search/?api=1&query=%E5%A4%A7%E5%88%86%E7%9C%8C%E6%9D%B5%E7%AF%89%E5%B8%82%E5%A4%A7%E5%AD%97%E5%AE%88%E6%B1%9F1291-3',

  publicPages: Object.freeze([
    'index.html',
    'services.html',
    'maintenance.html',
    'custom.html',
    'pricing.html',
    'works.html',
    'about.html',
    'contact.html',
    'privacy.html'
  ]),

  cacheMinutes: 5,
  source: 'WEB',
  sourceDetail: 'street-house-wangan-business'
});
