import 'vanilla-cookieconsent/dist/cookieconsent.css';
import * as CookieConsent from 'vanilla-cookieconsent';

declare function gtag(...args: unknown[]): void;

// Bridge the banner's category choices to Google Consent Mode v2. GTM-injected
// GA + Clarity read analytics_storage; AdSense (adsbygoogle.js) reads the ad_*
// signals. Everything starts denied (see Consent.astro defaults) and flips here.
function updateGtagConsent() {
  const analytics = CookieConsent.acceptedCategory('analytics');
  const ads = CookieConsent.acceptedCategory('ads');

  gtag('consent', 'update', {
    analytics_storage: analytics ? 'granted' : 'denied',
    ad_storage: ads ? 'granted' : 'denied',
    ad_user_data: ads ? 'granted' : 'denied',
    ad_personalization: ads ? 'granted' : 'denied',
  });
}

document.documentElement.classList.add('cc--darkmode');

CookieConsent.run({
  guiOptions: {
    consentModal: { layout: 'bar inline', position: 'bottom', equalWeightButtons: true },
    preferencesModal: { layout: 'box', position: 'right', equalWeightButtons: true },
  },

  categories: {
    necessary: { enabled: true, readOnly: true },
    analytics: {
      autoClear: {
        cookies: [
          { name: /^_ga/ },
          { name: '_gid' },
          { name: /^_clck/ },
          { name: /^_clsk/ },
          { name: 'CLID' },
          { name: 'ANONCHK' },
          { name: 'MR' },
          { name: 'MUID' },
          { name: 'SM' },
        ],
      },
    },
    ads: {
      autoClear: {
        cookies: [
          { name: /^__gads/ },
          { name: /^__gpi/ },
          { name: /^__eoi/ },
          { name: 'IDE' },
          { name: 'test_cookie' },
        ],
      },
    },
  },

  onFirstConsent: updateGtagConsent,
  onConsent: updateGtagConsent,
  onChange: updateGtagConsent,

  language: {
    default: 'en',
    translations: {
      en: {
        consentModal: {
          title: 'We use cookies',
          description:
            'We use cookies to analyse traffic and to show ads. You can accept or reject the non-essential categories.',
          acceptAllBtn: 'Accept All',
          acceptNecessaryBtn: 'Reject All',
          showPreferencesBtn: 'Manage Preferences',
        },
        preferencesModal: {
          title: 'Cookie Preferences',
          acceptAllBtn: 'Accept All',
          acceptNecessaryBtn: 'Reject All',
          savePreferencesBtn: 'Save Preferences',
          sections: [
            {
              title: 'Cookie Usage',
              description:
                'We use cookies for basic site functionality, traffic analytics, and advertising. Choose which categories to allow.',
            },
            {
              title: 'Strictly Necessary Cookies',
              description:
                'Essential for the site to function and cannot be switched off.',
              linkedCategory: 'necessary',
            },
            {
              title: 'Analytics Cookies',
              description:
                'Help us understand how visitors use the site (Google Analytics, Microsoft Clarity). Data is collected anonymously.',
              linkedCategory: 'analytics',
              cookieTable: {
                headers: {
                  name: 'Name',
                  domain: 'Provider',
                  description: 'Purpose',
                  expiration: 'Duration',
                },
                body: [
                  { name: '_ga', domain: 'Google Analytics', description: 'Distinguishes unique users.', expiration: '2 years' },
                  { name: '_gid', domain: 'Google Analytics', description: 'Distinguishes users per page.', expiration: '24 hours' },
                  { name: '_clck', domain: 'Microsoft Clarity', description: 'Persists the Clarity user ID.', expiration: '1 year' },
                  { name: '_clsk', domain: 'Microsoft Clarity', description: 'Connects page views into one session recording.', expiration: '1 day' },
                  { name: 'CLID', domain: 'Microsoft Clarity', description: 'Identifies first-time Clarity users.', expiration: '1 year' },
                ],
              },
            },
            {
              title: 'Advertising Cookies',
              description:
                'Used by Google AdSense to show ads and measure their performance. Rejecting limits ads to non-personalised.',
              linkedCategory: 'ads',
              cookieTable: {
                headers: {
                  name: 'Name',
                  domain: 'Provider',
                  description: 'Purpose',
                  expiration: 'Duration',
                },
                body: [
                  { name: '__gads', domain: 'Google AdSense', description: 'Measures ad interactions and frequency.', expiration: '13 months' },
                  { name: '__gpi', domain: 'Google AdSense', description: 'Stores an ad personalisation identifier.', expiration: '13 months' },
                  { name: 'IDE', domain: 'Google DoubleClick', description: 'Used for ad targeting and measurement.', expiration: '13 months' },
                ],
              },
            },
            {
              title: 'More Information',
              description:
                'For questions about our cookie policy, <a class="cc-link" href="mailto:info@snazzie.space">contact us</a>.',
            },
          ],
        },
      },
    },
  },
});
