// Injects the Consent Mode v2 defaults + AdSense/Google-CMP loader into the
// <head> of EVERY page automatically — single source of truth, no per-page
// component to remember. Runs before GTM (injected externally), so analytics
// and ad tags stay denied until Google's CMP updates the consent signals.
const PUBLISHER = 'ca-pub-8304271204200662';

const HEAD_SCRIPT = `
window.dataLayer = window.dataLayer || [];
function gtag(){ dataLayer.push(arguments); }
gtag('consent','default',{
  analytics_storage:'denied',
  ad_storage:'denied',
  ad_user_data:'denied',
  ad_personalization:'denied',
  wait_for_update:500
});
var s=document.createElement('script');
s.async=true;
s.src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${PUBLISHER}';
s.crossOrigin='anonymous';
document.head.appendChild(s);
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
