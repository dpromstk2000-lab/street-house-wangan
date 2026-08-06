/**
 * STREET HOUSE WANGAN Website Public Config
 * STEP WANGAN-BIZ-8-R3
 *
 * 契約前の提案確認用サイトです。
 * 検索エンジン登録・サイトマップ送信・正式公開は行いません。
 * Supabaseキー、Service Role、管理コード、秘密情報は置きません。
 */
window.DPRO_SITE_CONFIG = Object.freeze({
  version: 'WANGAN-BIZ-8-R3-SITE-20260806',
  environment: 'staging',
  releaseStage: 'proposal',
  contractStatus: 'not_contracted',

  apiBase: 'https://dpro-wangan-biz-api.dpromstk2000.workers.dev',
  shopCode: 'street_house_kitsuki',
  timezone: 'Asia/Tokyo',

  siteBaseUrl: 'https://dpromstk2000-lab.github.io/street-house-wangan/',
  searchIndexEnabled: false,
  goLiveApproved: false,
  searchEngineRegistrationEnabled: false,
  sitemapSubmissionEnabled: false,
  showPublicEnvironmentBadge: false,
  stripTrackingFromOperationalRecords: true,
  schemaOpeningHours: Object.freeze([
    'Mo,Tu,We,Fr,Sa 09:00-19:00',
    'Su 09:00-18:00'
  ]),
  ogImage: 'ogp.jpg',

  shopName: 'ストリートハウス湾岸通り',
  shopNameEnglish: 'STREET HOUSE WANGAN',
  businessCategoryLabel: '自動車修理・チューニング・自動車販売',
  storeInfoAuthority: 'verified_static',
  rejectDynamicPlaceholderPhone: true,
  placeholderPhones: Object.freeze([
    '0978-00-0000',
    '0978000000',
    '000-0000-0000',
    '0000000000'
  ]),
  defaultPhone: '080-5241-0066',
  primaryPhone: '080-5241-0066',
  fixedPhone: '0978-63-8706',

  postalCode: '873-0033',
  addressRegion: '大分県',
  addressLocality: '杵築市',
  streetAddress: '大字守江1291-3',
  fullAddress: '大分県杵築市大字守江1291-3',

  openingHoursLabel: '月・火・水・金・土 9:00〜19:00／日曜・祝日 9:00〜18:00',
  regularHolidayLabel: '木曜日',
  emergencyHoursLabel: '',

  lineIntegrationEnabled: true,
  lineIntegrationMode: 'proposal',
  lineOfficialAccountConfigured: false,
  linePendingLabel: 'LINE公式連携対応',
  linePendingNote: '契約・設定後に開通',
  lineConnectedLabel: 'LINEで相談',
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
  sourceDetail: 'street-house-wangan-r3-store-info-and-responsive-audit'
});
