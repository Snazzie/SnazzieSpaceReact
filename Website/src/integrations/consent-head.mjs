// Injects Consent Mode v2 defaults + the AdSense/Google-CMP loader into the
// <head> of EVERY page automatically — single source of truth, no per-page
// component to remember. Runs before GTM (injected externally).
//
// Region-scoped defaults: consent is legally required only in the EEA, UK and
// Switzerland, so we deny there (Google's CMP prompts and flips these on
// accept). Everywhere else there's no prior-consent requirement, so we grant by
// default — otherwise GA/Clarity would stay denied forever for visitors who
// never see a prompt.
const PUBLISHER = 'ca-pub-8304271204200662';

// EEA (EU27 + Iceland, Liechtenstein, Norway) + UK + Switzerland.
const CONSENT_REGION = [
  'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT',
  'LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE',
  'IS','LI','NO','GB','CH',
];

const HEAD_SCRIPT = `
window.dataLayer = window.dataLayer || [];
function gtag(){ dataLayer.push(arguments); }
// EEA/UK/Switzerland — deny until Google's CMP prompt updates consent.
gtag('consent','default',{
  analytics_storage:'denied',
  ad_storage:'denied',
  ad_user_data:'denied',
  ad_personalization:'denied',
  region:${JSON.stringify(CONSENT_REGION)},
  wait_for_update:500
});
// Rest of the world — no prior-consent requirement, allow by default.
gtag('consent','default',{
  analytics_storage:'granted',
  ad_storage:'granted',
  ad_user_data:'granted',
  ad_personalization:'granted'
});
// The consultation pages carry no ad units — skip the AdSense loader there.
if (!location.pathname.startsWith('/consultation')) {
  var s=document.createElement('script');
  s.async=true;
  s.src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${PUBLISHER}';
  s.crossOrigin='anonymous';
  document.head.appendChild(s);
}
`;

export default function consentHeadIntegration() {
  return {
    name: 'consent-head',
    hooks: {
      'astro:config:setup': ({ injectScript }) => {
        // 'head-inline' = a plain inline <script> in <head> of every page,
        // not bundled or processed by Astro.
        injectScript('head-inline', HEAD_SCRIPT);
      },
    },
  };
}
