/* dino.game Google Consent Mode v2. Analytics is off until the visitor
   accepts. Never loads or fires GA on localhost / 127.0.0.1. */
(function () {
  var KEY = 'dino.game.analyticsConsent';
  var GA_ID = 'G-GYZFSQV2F8';
  var host = location.hostname;
  var isProd = host === 'dino.game' || host === 'www.dino.game';
  // DEV-4: set by an inline script that build.mjs adds ONLY when
  // CMP_ENABLED or ADS_ENABLED is true in ads.config.json. When it is
  // absent (this release) every line below behaves exactly as before.
  var ADS = window.DINO_ADS_CONFIG || null;
  var CMP_ON = !!(ADS && ADS.cmp);
  // 'pending' until Google's CMP says whether GDPR (UK/EEA/CH) applies;
  // then 'cmp' (Google's message is the only banner and the only source of
  // truth for analytics and ads) or 'site' (our own analytics banner).
  var mode = CMP_ON ? 'pending' : 'site';
  var resolved = false;
  var resolvedCbs = [];
  function markResolved() {
    if (resolved) {
      return;
    }
    resolved = true;
    var cbs = resolvedCbs.splice(0);
    for (var i = 0; i < cbs.length; i++) {
      try { cbs[i](mode); } catch (e) { /* ignore */ }
    }
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };

  window.gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    wait_for_update: 500
  });

  function loadGa() {
    if (!isProd || window.__DINO_GA_LOADED) {
      return;
    }
    window.__DINO_GA_LOADED = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    if (CMP_ON) {
      s.onload = function () {
        if (window.__dinoRewrapDataLayer) {
          window.__dinoRewrapDataLayer();
        }
      };
    }
    document.head.appendChild(s);
    window.gtag('js', new Date());
    window.gtag('config', GA_ID, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });
  }

  function applyConsent(choice) {
    if (choice === 'granted') {
      window['ga-disable-' + GA_ID] = false;
      window.gtag('consent', 'update', {
        analytics_storage: 'granted',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied'
      });
      loadGa();
    } else {
      window.gtag('consent', 'update', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied'
      });
      window['ga-disable-' + GA_ID] = true;
    }
  }

  function store(choice) {
    try {
      localStorage.setItem(KEY, choice);
    } catch (e) { /* ignore */ }
  }

  function clearStoredChoice() {
    try {
      localStorage.removeItem(KEY);
    } catch (e) { /* ignore */ }
  }

  function clearGaCookies() {
    var names = [];
    var raw = document.cookie ? document.cookie.split(';') : [];
    for (var i = 0; i < raw.length; i++) {
      var name = raw[i].split('=')[0].trim();
      if (name === '_ga' || name === '_gid' || name === '_gat' ||
          name.indexOf('_ga_') === 0 || name.indexOf('_gat_') === 0) {
        names.push(name);
      }
    }
    var hostName = location.hostname;
    var domains = ['', hostName];
    if (hostName.indexOf('.') !== -1) {
      domains.push('.' + hostName);
      var parts = hostName.split('.');
      if (parts.length > 2) {
        domains.push('.' + parts.slice(-2).join('.'));
      }
    }
    names.forEach(function (name) {
      document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
      domains.forEach(function (domain) {
        if (!domain) {
          return;
        }
        document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=' + domain;
      });
    });
  }

  function hideBanner() {
    var el = document.getElementById('consent-banner');
    if (el) {
      el.hidden = true;
    }
    document.body.classList.remove('has-consent-banner');
    syncBannerHeight();
  }

  // The page is padded by the banner's height while it is open (CSS reads
  // --consent-h), so it never sits on top of the header or the last lines.
  function syncBannerHeight() {
    var el = document.getElementById('consent-banner');
    var root = document.documentElement;
    var open = el && !el.hidden;
    // With very large text the copy scrolls inside the banner. When the
    // banner is at the bottom, cap the copy so the whole header (all site
    // links and EN ES PT) stays visible above it, down to about 3 lines.
    var p = open ? el.querySelector('p') : null;
    var header = document.querySelector('.site-header');
    var atTop = window.matchMedia &&
      window.matchMedia('(orientation: landscape) and (max-height: 500px)').matches;
    if (p && header && !atTop) {
      root.style.removeProperty('--consent-p-max');
      var headerBottom = header.getBoundingClientRect().bottom + window.pageYOffset;
      var rest = el.offsetHeight - p.offsetHeight;
      var line = parseFloat(window.getComputedStyle(p).lineHeight) ||
        parseFloat(window.getComputedStyle(p).fontSize) * 1.5;
      var room = window.innerHeight - headerBottom - rest - 8;
      root.style.setProperty('--consent-p-max', Math.max(room, line * 3) + 'px');
    } else {
      root.style.removeProperty('--consent-p-max');
    }
    var h = open ? el.offsetHeight : 0;
    root.style.setProperty('--consent-h', h + 'px');
  }
  window.addEventListener('resize', syncBannerHeight);
  window.addEventListener('orientationchange', syncBannerHeight);

  function placeBanner(el) {
    var skip = document.querySelector('.skip-link');
    if (skip && skip.parentNode) {
      skip.insertAdjacentElement('afterend', el);
    } else if (document.body.firstChild) {
      document.body.insertBefore(el, document.body.firstChild);
    } else {
      document.body.appendChild(el);
    }
  }

  function bindBannerButtons(el) {
    if (el.getAttribute('data-bound') === '1') {
      return;
    }
    el.setAttribute('data-bound', '1');
    var accept = document.getElementById('consent-accept');
    var reject = document.getElementById('consent-reject');
    if (accept) {
      accept.addEventListener('click', function () {
        store('granted');
        applyConsent('granted');
        hideBanner();
        markResolved();
      });
    }
    if (reject) {
      reject.addEventListener('click', function () {
        store('denied');
        applyConsent('denied');
        clearGaCookies();
        hideBanner();
        markResolved();
      });
    }
  }

  // Localised pages put their banner text in #ui-strings (see i18n/).
  // The text is our own build output, not user input.
  function bannerStrings() {
    var t = {
      aria_label: 'Analytics cookies',
      text: 'This site uses Google Analytics only if you accept. No analytics cookies are set until you choose. See the <a href="/privacy/">privacy page</a>, or <a href="#cookie-settings">Cookie settings</a>.',
      accept: 'Accept',
      reject: 'Reject'
    };
    var el = document.getElementById('ui-strings');
    if (!el) {
      return t;
    }
    try {
      var c = JSON.parse(el.textContent || '{}').consent || {};
      for (var k in t) {
        if (typeof c[k] === 'string' && c[k]) {
          t[k] = c[k];
        }
      }
    } catch (err) {
      // keep English
    }
    return t;
  }

  function showBanner() {
    var el = document.getElementById('consent-banner');
    if (!el) {
      el = document.createElement('div');
      el.id = 'consent-banner';
      el.setAttribute('role', 'dialog');
      var t = bannerStrings();
      el.setAttribute('aria-label', t.aria_label);
      el.setAttribute('tabindex', '-1');
      el.innerHTML =
        '<p>' + t.text + '</p>' +
        '<div class="consent-actions">' +
        '<button type="button" id="consent-accept">' + t.accept + '</button>' +
        '<button type="button" id="consent-reject">' + t.reject + '</button>' +
        '</div>';
      placeBanner(el);
    }
    el.hidden = false;
    document.body.classList.add('has-consent-banner');
    syncBannerHeight();
    bindBannerButtons(el);
  }

  function openCookieSettings(event) {
    if (event) {
      event.preventDefault();
    }
    if (mode === 'cmp') {
      // One place for both choices: Google's message (analytics via Consent
      // Mode, ads via TCF). Our banner is never shown alongside it.
      window.googlefc = window.googlefc || {};
      window.googlefc.callbackQueue = window.googlefc.callbackQueue || [];
      window.googlefc.callbackQueue.push(function () {
        if (typeof window.googlefc.showRevocationMessage === 'function') {
          window.googlefc.showRevocationMessage();
        }
      });
      return;
    }
    // Persist denial so a withdrawal is not forgotten on reload.
    // Cookie settings still re-opens the banner so the choice can be changed.
    store('denied');
    applyConsent('denied');
    clearGaCookies();
    showBanner();
    var banner = document.getElementById('consent-banner');
    if (banner) {
      if (!banner.hasAttribute('tabindex')) {
        banner.setAttribute('tabindex', '-1');
      }
      try {
        banner.focus({preventScroll: true});
      } catch (err) {
        banner.focus();
      }
    }
  }

  window.dinoOpenCookieSettings = openCookieSettings;

  function isConsentChoiceButton(el) {
    return !!el && (el.id === 'consent-accept' || el.id === 'consent-reject');
  }

  function isGameKey(e) {
    return e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'ArrowDown' ||
        e.code === 'Enter' || e.key === ' ' || e.key === 'ArrowUp' ||
        e.key === 'ArrowDown' || e.key === 'Enter' || e.key === 'Up' ||
        e.key === 'Down';
  }

  // While the banner itself is focused, Space/Up must not start the game
  // or activate Accept/Reject. Those buttons only respond to Space/Enter
  // after the user has Tabbed to them.
  document.addEventListener('keydown', function (e) {
    var banner = document.getElementById('consent-banner');
    if (!banner || banner.hidden) {
      return;
    }
    var active = document.activeElement;
    if (!active || !banner.contains(active)) {
      return;
    }
    if (!isGameKey(e)) {
      return;
    }
    if (isConsentChoiceButton(active) &&
        (e.code === 'Space' || e.key === ' ' || e.code === 'Enter' || e.key === 'Enter')) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
  }, true);

  document.addEventListener('click', function (event) {
    var link = event.target && event.target.closest &&
        event.target.closest('a[href="#cookie-settings"]');
    if (link) {
      openCookieSettings(event);
    }
  });

  var choice = null;
  try {
    choice = localStorage.getItem(KEY);
  } catch (e) {
    choice = null;
  }

  function initSite() {
    mode = 'site';
    if (choice === 'granted' || choice === 'denied') {
      applyConsent(choice);
      hideBanner();
      markResolved();
    } else {
      showBanner();
    }
  }

  // ---- DEV-4: Google's certified CMP (Funding Choices), only if CMP_ON ----
  // Where GDPR applies (UK, EEA, Switzerland) Google's message is the single
  // source of truth: its Consent Mode updates (analytics_storage and the
  // three ad signals) decide whether GA loads, and its TCF string decides
  // ads. Our banner and our stored analytics choice are not used there, so
  // the two can never contradict each other. Elsewhere the CMP shows no
  // message and our analytics banner works exactly as without the CMP.
  var pendingAnalytics = null;
  var cmpFallback = false;
  function watchConsentModeUpdates() {
    function inspect(args) {
      if (!args || args[0] !== 'consent' || args[1] !== 'update' || !args[2] ||
          !args[2].analytics_storage) {
        return;
      }
      if (mode === 'pending') {
        // The CMP can answer before we know GDPR applies; replay it then.
        pendingAnalytics = args[2].analytics_storage;
        return;
      }
      if (mode !== 'cmp') {
        return;
      }
      if (args[2].analytics_storage === 'granted') {
        window['ga-disable-' + GA_ID] = false;
        loadGa();
      } else if (args[2].analytics_storage === 'denied') {
        clearGaCookies();
      }
    }
    function wrap() {
      var dl = window.dataLayer;
      if (dl.push.__dinoWrapped) {
        return;
      }
      var orig = dl.push;
      var wrapped = function () {
        for (var i = 0; i < arguments.length; i++) {
          inspect(arguments[i]);
        }
        return orig.apply(dl, arguments);
      };
      wrapped.__dinoWrapped = true;
      dl.push = wrapped;
    }
    wrap();
    // gtag.js replaces dataLayer.push when it loads; wrap it again.
    window.__dinoRewrapDataLayer = wrap;
  }

  function initCmp() {
    watchConsentModeUpdates();
    var decided = false;
    function decide(gdprApplies) {
      if (decided) {
        return;
      }
      decided = true;
      if (gdprApplies) {
        mode = 'cmp';
        hideBanner();
        if (pendingAnalytics === 'granted') {
          window['ga-disable-' + GA_ID] = false;
          loadGa();
        }
        // An analytics choice made in our old banner is not carried over.
        clearStoredChoice();
      } else {
        initSite();
      }
    }
    // If Google's CMP never answers (blocked, offline, account off), fall
    // back to our own banner: GA stays opt-in and no ads are requested.
    var timer = setTimeout(function () {
      // Never request ads after a fallback: we can't tell whether GDPR applies.
      cmpFallback = true;
      decide(false);
    }, ADS.cmpTimeoutMs || 4000);
    var tries = 0;
    (function waitTcf() {
      if (typeof window.__tcfapi !== 'function') {
        if (++tries < 80) {
          setTimeout(waitTcf, 50);
        }
        return;
      }
      window.__tcfapi('addEventListener', 2.2, function (tc, ok) {
        if (!ok || !tc) {
          return;
        }
        if (typeof tc.gdprApplies === 'boolean') {
          clearTimeout(timer);
          decide(tc.gdprApplies);
        }
        if (mode === 'cmp' && (tc.eventStatus === 'tcloaded' || tc.eventStatus === 'useractioncomplete')) {
          markResolved();
        }
      });
    })();
  }

  // For js/ads.js: calls back once consent is settled (a stored or new
  // banner choice, or the CMP's loaded/completed TC data).
  window.dinoConsent = {
    onResolved: function (cb) {
      if (resolved) {
        cb(mode);
      } else {
        resolvedCbs.push(cb);
      }
    },
    mode: function () { return mode; },
    // true when Google's CMP never answered and our banner took over.
    cmpFallback: function () { return cmpFallback; }
  };

  function init() {
    if (CMP_ON) {
      initCmp();
    } else {
      initSite();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
