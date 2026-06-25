// shared provider data + a tiny carousel cycler used by every sketch
window.CAPS = [
  { key: 'accounts', label: 'ACCOUNTS', desc: 'secure logins', providers: ['Clerk', 'Auth0', 'Firebase', 'Better Auth'] },
  { key: 'payments', label: 'PAYMENTS', desc: 'take money',    providers: ['Stripe', 'PayPal', 'Shopify', 'RevenueCat'] },
  { key: 'ai',       label: 'AI AGENTS', desc: 'do the work',  providers: ['Claude', 'Gemini', 'Mistral', 'Ollama'] },
  { key: 'content',  label: 'CONTENT',  desc: 'manage it',     providers: ['Sanity', 'Contentful', 'Strapi', 'Notion'] },
  { key: 'hosting',  label: 'HOSTING',  desc: 'runs anywhere',  providers: ['Cloudflare', 'AWS', 'Azure', 'GCP'] },
];
// rotate any .prov element through a list, staggered per element
window.startCycle = (period = 2400) => {
  const els = Array.from(document.querySelectorAll('[data-providers]'));
  els.forEach((el, i) => {
    const list = el.getAttribute('data-providers').split('|');
    let idx = 0;
    el.textContent = list[0];
    const tick = () => {
      idx = (idx + 1) % list.length;
      el.style.transition = 'opacity .3s ease, transform .3s ease';
      el.style.opacity = '0'; el.style.transform = 'translateY(-6px)';
      setTimeout(() => {
        el.textContent = list[idx];
        el.style.transform = 'translateY(6px)';
        requestAnimationFrame(() => { el.style.opacity = '1'; el.style.transform = 'translateY(0)'; });
      }, 300);
    };
    setTimeout(() => setInterval(tick, period), 500 + i * 480);
  });
};
