/* Bach Media, Brikken-system transplant. Vanilla, no deps.
   Native scroll; scrubbed values are read in a passive scroll handler and
   written in one rAF, lerped for the pinned stages. Mobile (<768) gets the
   static twins, no pin work at all. */
(function () {
  "use strict";

  var mdUp = window.matchMedia("(min-width: 768px)");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  /* JS owns anchor smoothness; kill CSS smooth so programmatic jumps stay jumps */
  document.documentElement.classList.add("js-smooth");
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };

  /* ===== custom cursor (fine pointers, desktop) ===== */
  var finePointer = window.matchMedia("(pointer: fine)").matches;
  if (finePointer && !reduceMotion) {
    document.body.classList.add("cursor-on");
    var cursor = document.getElementById("cursor");
    var cx = -20, cy = -20, tx = -20, ty = -20, moved = false;
    window.addEventListener("mousemove", function (e) { tx = e.clientX; ty = e.clientY; moved = true; }, { passive: true });
    (function cursorTick() {
      cx = lerp(cx, tx, 0.32); cy = lerp(cy, ty, 0.32);
      cursor.style.transform = "translate3d(" + cx + "px," + cy + "px,0)";
      if (moved) {
        moved = false;
        var el = document.elementFromPoint(tx, ty);
        var dark = el && el.closest("#thjonustan, #contact, #gate, #reel-modal, .hero__reel, .m-reel__card, .btn--red");
        cursor.classList.toggle("is-light", !!dark);
      }
      requestAnimationFrame(cursorTick);
    })();
  }

  /* ===== GATE: their loader, click to enter, split exit ===== */
  var gate = document.getElementById("gate");
  var gateOpen = false;
  document.body.classList.add("gate-locked");

  function openGate() {
    if (gateOpen) return;
    gateOpen = true;
    /* unlock hero audio inside the click gesture: starts low, swells with
       the zoom, dissipates before the page continues (curve in frame()) */
    var rp = document.getElementById("reel-preview");
    if (rp && !reduceMotion && window.matchMedia("(min-width: 768px)").matches) {
      rp.muted = false;
      rp.volume = 0.15;
      rp.play().catch(function () { rp.muted = true; rp.play().catch(function () {}); });
    }
    gate.classList.add("is-open");
    document.body.classList.remove("gate-locked");
    window.scrollTo(0, 0);
    setTimeout(function () {
      gate.classList.add("is-gone");
      startHeroIntro();
    }, reduceMotion ? 0 : 950);
  }
  gate.addEventListener("click", openGate);
  gate.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openGate(); }
  });

  /* ===== hero intro cascade (post-gate) ===== */
  var heroHeadline = document.getElementById("hero-headline");
  var heroMark = document.getElementById("hero-mark");
  var heroCopy = document.getElementById("hero-copy");
  var heroReel = document.getElementById("hero-reel");
  var reelPreview = document.getElementById("reel-preview");
  [heroHeadline, heroMark, heroCopy, heroReel].forEach(function (el) {
    if (!el) return;
    el.style.opacity = "0";
  });
  function enter(el, delay, y) {
    if (!el) return;
    if (reduceMotion) { el.style.opacity = "1"; return; }
    el.style.transform = "translateY(" + (y || 26) + "px)";
    el.style.transition = "opacity .9s cubic-bezier(.16,1,.3,1) " + delay + "ms, transform .9s cubic-bezier(.16,1,.3,1) " + delay + "ms";
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        el.style.opacity = "1";
        el.style.transform = "translateY(0)";
      });
    });
  }
  var introDone = false;
  function startHeroIntro() {
    if (introDone) return;
    introDone = true;
    enter(heroHeadline, 0, 34);
    enter(heroMark, 350, 40);
    enter(heroCopy, 700, 22);
    enter(heroReel, 700, 0);
    if (reelPreview && !reduceMotion) reelPreview.play().catch(function () {});
    setTimeout(function () {
      [heroHeadline, heroMark, heroCopy, heroReel].forEach(function (el) {
        if (el) { el.style.transition = ""; }
      });
      introSettled = true;
    }, reduceMotion ? 0 : 1700);
  }
  var introSettled = false;

  /* ===== nav pill ===== */
  var navwrap = document.getElementById("navwrap");
  var burger = document.getElementById("burger");
  var navMenu = document.getElementById("nav-menu");
  function updateNav(y) {
    var show = y > 20 && gateOpen;
    navwrap.classList.toggle("is-in", show);
    navwrap.setAttribute("aria-hidden", show ? "false" : "true");
  }
  if (burger) {
    burger.addEventListener("click", function () {
      var open = !navMenu.classList.contains("is-open");
      navMenu.classList.toggle("is-open", open);
      burger.classList.toggle("is-open", open);
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      burger.setAttribute("aria-label", open ? "Loka valmynd" : "Opna valmynd");
    });
  }
  function closeMenu() {
    if (navMenu) {
      navMenu.classList.remove("is-open");
      burger.classList.remove("is-open");
      burger.setAttribute("aria-expanded", "false");
    }
  }
  document.querySelectorAll("[data-anchor]").forEach(function (a) {
    a.addEventListener("click", function (e) {
      var href = a.getAttribute("href");
      if (!href || href.charAt(0) !== "#") return;
      e.preventDefault();
      closeMenu();
      anchorScrolling = true;
      clearTimeout(anchorTimer);
      anchorTimer = setTimeout(function () { anchorScrolling = false; }, 1600);
      if (href === "#top") { window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }); return; }
      var t = document.querySelector(href);
      if (t) t.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    });
  });

  /* ===== word splitters ===== */
  function splitWords(el, cls) {
    var words = el.textContent.trim().split(/\s+/);
    el.textContent = "";
    words.forEach(function (w, i) {
      var s = document.createElement("span");
      s.className = cls;
      s.textContent = w;
      el.appendChild(s);
      if (i < words.length - 1) el.appendChild(document.createTextNode(" "));
    });
    return Array.prototype.slice.call(el.querySelectorAll("." + cls));
  }
  var aboutFill = document.getElementById("wordfill-about");
  var aboutWords = splitWords(aboutFill, "w");
  var chipRows = Array.prototype.slice.call(document.querySelectorAll(".manifesto__chips li"));
  var finaleEl = document.getElementById("wordfill-finale");
  var finaleWords = splitWords(finaleEl, "w");

  /* ===== stage elements ===== */
  var stage = document.getElementById("stage");
  var chantWords = Array.prototype.slice.call(document.querySelectorAll(".stage__chant span[data-word]"));
  var chantEl = document.getElementById("chant");
  var chantTag = document.getElementById("chant-tag");
  var stageCards = Array.prototype.slice.call(document.querySelectorAll(".stage__card"));
  var stageFinale = document.getElementById("stage-finale");
  var crossPaths = Array.prototype.slice.call(document.querySelectorAll(".stage__cross circle, .stage__cross line"));
  var thjon = document.getElementById("thjonustan");
  var clients = document.getElementById("clients");

  /* card phases: start / mid / end of stage progress (Brikken grammar) */
  var CARD_PHASES = [
    { start: 0.06, mid: 0.17, end: 0.30 },
    { start: 0.30, mid: 0.41, end: 0.54 },
    { start: 0.54, mid: 0.65, end: 0.78 }
  ];
  /* word spotlight: word i is "on" while card i runs; all on before/after */
  function chantState(p) {
    if (p < 0.05 || p > 0.8) return [true, true, true];
    var states = [false, false, false];
    for (var i = 0; i < 3; i++) {
      var ph = CARD_PHASES[i];
      if (p >= ph.start - 0.02 && p <= ph.end + 0.02) states[i] = true;
    }
    if (!states[0] && !states[1] && !states[2]) return [true, true, true];
    return states;
  }

  /* ===== hero reel growth constants ===== */
  var reelState = { w: 0, h: 0, r: 0, b: 0 };
  function heroRest(vw, vh) {
    var w = Math.min(360, vw * 0.26);
    return { w: w, h: (w * 9) / 16, r: vw * 0.035, b: vh * 0.06 };
  }

  /* ===== footer fixed reveal ===== */
  var footer = document.getElementById("contact");
  var page = document.getElementById("page");
  function updateFooterMode() {
    var fits = footer.offsetHeight <= window.innerHeight;
    footer.classList.toggle("is-fixed", fits);
    document.body.style.paddingBottom = fits ? footer.offsetHeight + "px" : "";
  }
  if ("ResizeObserver" in window) {
    new ResizeObserver(updateFooterMode).observe(footer);
  }
  window.addEventListener("resize", updateFooterMode);
  updateFooterMode();

  /* ===== hero glide-past tween (cancelled by any user input) ===== */
  var gliding = false, glideDone = false, glideRaf = 0;
  var lastP = 0, anchorScrolling = false, anchorTimer = 0, holdSince = 0;
  function cancelGlide() {
    if (!gliding) return;
    gliding = false;
    cancelAnimationFrame(glideRaf);
  }
  window.addEventListener("wheel", function (e) {
    if (e.deltaY < 0) cancelGlide(); /* scrolling back up takes over */
  }, { passive: true });
  ["touchstart", "keydown", "pointerdown"].forEach(function (ev) {
    window.addEventListener(ev, cancelGlide, { passive: true });
  });
  function startGlide(targetY) {
    gliding = true;
    glideDone = true;
    var fromY = window.scrollY;
    var dist = targetY - fromY;
    if (dist <= 0) { gliding = false; return; }
    var t0 = performance.now();
    var dur = Math.min(1400, 500 + dist * 0.45);
    function step(now) {
      if (!gliding) return;
      var t = clamp((now - t0) / dur, 0, 1);
      var e = 1 - Math.pow(1 - t, 4); /* easeOutQuart, house anchor curve */
      window.scrollTo(0, fromY + dist * e);
      if (t < 1) glideRaf = requestAnimationFrame(step);
      else gliding = false;
    }
    glideRaf = requestAnimationFrame(step);
  }

  /* ===== main scroll/rAF engine ===== */
  var docEl = document.documentElement;
  var lastY = -1, ticking = false;
  var smoothStageP = 0;

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(frame);
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });

  function frame() {
    ticking = false;
    var y = window.scrollY;
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    updateNav(y);

    var desktop = mdUp.matches;

    /* --- hero pin choreography (desktop) --- */
    var hero = document.getElementById("hero");
    if (desktop && hero) {
      var travel = hero.offsetHeight - vh;
      var p = travel > 0 ? clamp(y / travel, 0, 1) : 0;
      var exit = clamp(p / 0.2, 0, 1);
      if (introSettled || p > 0) {
        heroHeadline.style.transform = "translateY(" + (-160 * exit) + "px)";
        heroHeadline.style.opacity = String(1 - exit);
        heroMark.style.transform = "translateY(" + (-60 * exit) + "px)";
        heroMark.style.opacity = String(1 - exit);
        heroCopy.style.transform = "translateY(" + (70 * exit) + "px)";
        heroCopy.style.opacity = String(1 - exit);
        if (heroRec) heroRec.style.opacity = String(1 - exit);
      }
      var rest = heroRest(vw, vh);
      var Q = clamp((p - 0.06) / (0.66 - 0.06), 0, 1);
      var w = lerp(rest.w, vw - 32, Q);
      var h = lerp(rest.h, vh - 32, Q);
      var r = lerp(rest.r, 16, Q);
      var b = lerp(rest.b, 16, Q);
      if (Math.abs(w - reelState.w) > 0.5 || Math.abs(h - reelState.h) > 0.5) {
        heroReel.style.width = w + "px";
        heroReel.style.height = h + "px";
        heroReel.style.right = r + "px";
        heroReel.style.bottom = b + "px";
        reelState = { w: w, h: h, r: r, b: b };
      }
      /* slow zoom into the footage while the frame grows */
      if (reelPreview && !reduceMotion) {
        reelPreview.style.transform = "scale(" + (1 + 0.14 * Q) + ")";
        /* sound swells with the zoom, then dissipates before the page moves on:
           0.15 at rest, up to 1.0 at full-bleed, faded out by p = 0.95 */
        if (!reelPreview.muted) {
          var swell = 0.15 + 0.85 * Q;
          var fade = 1 - clamp((p - 0.72) / 0.23, 0, 1);
          reelPreview.volume = clamp(swell * fade, 0, 1);
        }
      }
      /* glide past the hold: if the user keeps scrolling once full-bleed is
         reached, carry them to the next section; if they stop, they stay
         and watch. Fires only on real incremental scrolling, never on jumps
         (anchor links, programmatic scrolls), and any input cancels it. */
      if (!reduceMotion) {
        var step = lastY >= 0 ? y - lastY : 0;
        var now = performance.now();
        if (p >= 0.66 && p < 0.98) {
          if (!holdSince) holdSince = now;
        } else {
          holdSince = 0;
        }
        /* only glide when the user has actually dwelled in the hold band:
           a smooth sweep or scrollbar drag passes through in one motion */
        if (holdSince && now - holdSince > 400 &&
            p >= 0.74 && p < 0.98 && step > 0 && step < 250 &&
            !anchorScrolling && !glideDone && !gliding) {
          startGlide(hero.offsetHeight);
        }
        if (p < 0.5) glideDone = false;
        lastP = p;
      }
    }

    /* --- manifesto word-fill --- */
    var mRect = aboutFill.getBoundingClientRect();
    var mStart = vh * 0.8, mEnd = vh * 0.35;
    var mp = clamp((mStart - mRect.top) / (mStart - mEnd + mRect.height), 0, 1);
    var total = aboutWords.length;
    var onCount = Math.round(mp * total);
    for (var i = 0; i < total; i++) {
      aboutWords[i].classList.toggle("is-on", i < onCount);
    }
    var chipP = clamp((mp - 0.75) / 0.25, 0, 1);
    chipRows.forEach(function (li, idx) {
      li.classList.toggle("is-on", chipP > idx / chipRows.length);
    });

    /* --- page background flip near the stage --- */
    if (thjon) {
      var tRect = thjon.getBoundingClientRect();
      var onBlack = tRect.top < vh * 0.85 && tRect.bottom > 0;
      document.body.classList.toggle("on-black", onBlack);
    }

    /* --- stage choreography (desktop) --- */
    if (desktop && stage) {
      var sRect = stage.getBoundingClientRect();
      var sTravel = stage.offsetHeight - vh;
      var sp = sTravel > 0 ? clamp(-sRect.top / sTravel, 0, 1) : 0;
      smoothStageP = reduceMotion ? sp : lerp(smoothStageP, sp, 0.18);
      var P = smoothStageP;

      var states = chantState(P);
      chantWords.forEach(function (wEl, wi) {
        wEl.classList.toggle("is-dim", !states[wi]);
      });
      if (chantTag) chantTag.classList.toggle("is-dim", P > 0.14 && P < 0.76);

      stageCards.forEach(function (card, ci) {
        var ph = CARD_PHASES[ci];
        var cp;
        if (P <= ph.mid) cp = (P - ph.start) / (ph.mid - ph.start);
        else cp = 1 + (P - ph.mid) / (ph.end - ph.mid);
        var yv;
        if (cp < 0) yv = 100;
        else if (cp <= 1) yv = lerp(100, 18, clamp(cp, 0, 1));
        else yv = lerp(18, -90, clamp(cp - 1, 0, 1));
        var op = 0;
        if (P >= ph.start && P <= ph.end) {
          op = Math.min(clamp((P - ph.start) / 0.03, 0, 1), clamp((ph.end - P) / 0.03, 0, 1));
        }
        card.style.transform = "translateY(" + yv + "vh)";
        card.style.opacity = String(op);
      });

      /* crosshair draws over the whole run */
      var draw = clamp((P - 0.08) / 0.72, 0, 1);
      crossPaths.forEach(function (pth, pi) {
        var local = clamp(draw * 1.6 - pi * 0.2, 0, 1);
        pth.style.strokeDashoffset = String(1 - local);
      });

      /* finale */
      var chantOut = clamp((P - 0.8) / 0.06, 0, 1);
      chantEl.style.transform = "translateY(" + (-22 * chantOut) + "%)";
      chantEl.style.opacity = String(1 - chantOut);
      var finIn = clamp((P - 0.86) / 0.02, 0, 1);
      stageFinale.style.opacity = String(finIn);
      var fillP = clamp((P - 0.88) / 0.1, 0, 1);
      var fOn = Math.round(fillP * finaleWords.length);
      finaleWords.forEach(function (wEl, wi) {
        wEl.classList.toggle("is-on", wi < fOn);
      });
    }

    /* keep smoothing while the stage settles */
    if (desktop && stage && Math.abs(smoothStageP - (stage.offsetHeight - vh > 0 ? clamp(-stage.getBoundingClientRect().top / (stage.offsetHeight - vh), 0, 1) : 0)) > 0.001) {
      requestAnimationFrame(frame);
      ticking = true;
    }
    lastY = y;
  }
  frame();

  /* ===== entrance reveals ===== */
  var revEls = [
    ".work__title", ".work__lede", ".wsel li", ".wstrip", ".proof__title", ".proof__rows li",
    ".studio__media", ".studio__body", ".faq__wrap>h2", ".faq__list li",
    ".footer__body h2", ".footer__body p", ".footer__body .btn", ".footer__mark-sm"
  ];
  revEls.forEach(function (sel) {
    document.querySelectorAll(sel).forEach(function (el, i) {
      el.classList.add("rev");
      el.style.transitionDelay = (i % 3) * 90 + "ms";
    });
  });
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
    });
  }, { rootMargin: "-40px 0px" });
  document.querySelectorAll(".rev").forEach(function (el) { io.observe(el); });

  /* mobile lazy reel autoplay */
  if (!reduceMotion) {
    var lazyIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.play().catch(function () {}); lazyIO.unobserve(en.target); }
      });
    }, { rootMargin: "300px" });
    document.querySelectorAll("[data-lazyplay]").forEach(function (v) { lazyIO.observe(v); });
  }

  /* ===== FAQ accordion (first open) ===== */
  var faqItems = Array.prototype.slice.call(document.querySelectorAll(".faq__list li"));
  function setFaq(li, open) {
    var btn = li.querySelector(".faq__q");
    var a = li.querySelector(".faq__a");
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      a.hidden = false;
      if (!reduceMotion) {
        a.style.height = "0px";
        a.style.transition = "height .3s cubic-bezier(.25,.46,.45,.94)";
        requestAnimationFrame(function () { a.style.height = a.scrollHeight + "px"; });
        setTimeout(function () { a.style.height = ""; a.style.transition = ""; }, 320);
      }
    } else {
      if (!reduceMotion && !a.hidden) {
        a.style.height = a.scrollHeight + "px";
        a.style.transition = "height .3s cubic-bezier(.25,.46,.45,.94)";
        requestAnimationFrame(function () { a.style.height = "0px"; });
        setTimeout(function () { a.hidden = true; a.style.height = ""; a.style.transition = ""; }, 320);
      } else {
        a.hidden = true;
      }
    }
  }
  faqItems.forEach(function (li, idx) {
    var btn = li.querySelector(".faq__q");
    setFaq(li, idx === 0);
    btn.addEventListener("click", function () {
      var isOpen = btn.getAttribute("aria-expanded") === "true";
      faqItems.forEach(function (other) { if (other !== li) setFaq(other, false); });
      setFaq(li, !isOpen);
    });
  });

  /* ===== modals ===== */
  var contactModal = document.getElementById("contact-modal");
  var reelModal = document.getElementById("reel-modal");
  var reelFull = document.getElementById("reel-full");
  var lastFocus = null;

  function openModal(modal) {
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.documentElement.style.overflow = "hidden";
    requestAnimationFrame(function () { modal.classList.add("is-in"); });
    var closeBtn = modal.querySelector(".modal-close");
    if (closeBtn) closeBtn.focus();
  }
  function closeModal(modal) {
    modal.classList.remove("is-in");
    document.documentElement.style.overflow = "";
    setTimeout(function () { modal.hidden = true; }, reduceMotion ? 0 : 360);
    if (lastFocus) lastFocus.focus();
  }
  ["nav-contact", "nav-contact-m", "hero-cta", "footer-cta"].forEach(function (id) {
    var b = document.getElementById(id);
    if (b) b.addEventListener("click", function () { closeMenu(); openModal(contactModal); });
  });
  document.getElementById("contact-close").addEventListener("click", function () { closeModal(contactModal); });

  ["reel-open-m"].forEach(function (id) {
    var b = document.getElementById(id);
    if (b) b.addEventListener("click", function () {
      reelFull.src = "assets/reel.mp4";
      openModal(reelModal);
      reelFull.currentTime = 0;
      reelFull.muted = false;
      reelFull.play().catch(function () {});
    });
  });
  document.getElementById("reel-close").addEventListener("click", function () {
    reelFull.pause();
    closeModal(reelModal);
  });
  reelModal.addEventListener("click", function (e) {
    if (e.target === reelModal) { reelFull.pause(); closeModal(reelModal); }
  });
  window.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (!contactModal.hidden) closeModal(contactModal);
    if (!reelModal.hidden) { reelFull.pause(); closeModal(reelModal); }
  });

  /* ===== company selector: hover previews beside the list, click commits,
     leaving the list reverts to the committed company ===== */
  var wselRows = Array.prototype.slice.call(document.querySelectorAll(".wsel__row"));
  var wselList = document.getElementById("wsel");
  var wstrip = document.getElementById("wstrip");
  var stripVideos = document.getElementById("wstrip-videos");
  var stripEmpty = document.getElementById("wstrip-empty");
  var wselTimer = 0;
  var committedBtn = document.querySelector(".wsel__row.is-active") || wselRows[0];
  if (committedBtn) committedBtn.classList.add("is-committed");
  function showClient(btn) {
    if (!btn || btn.classList.contains("is-active")) return;
    wselRows.forEach(function (r) { r.classList.toggle("is-active", r === btn); });
    var showVideos = btn.getAttribute("data-client") === "tekaffi";
    if (reduceMotion) {
      stripVideos.hidden = !showVideos;
      stripEmpty.hidden = showVideos;
      return;
    }
    wstrip.classList.add("is-switching");
    clearTimeout(wselTimer);
    wselTimer = setTimeout(function () {
      stripVideos.hidden = !showVideos;
      stripEmpty.hidden = showVideos;
      wstrip.classList.remove("is-switching");
    }, 300);
  }
  function commitClient(btn) {
    committedBtn = btn;
    wselRows.forEach(function (r) {
      var on = r === btn;
      r.classList.toggle("is-committed", on);
      r.setAttribute("aria-pressed", on ? "true" : "false");
    });
    showClient(btn);
  }
  wselRows.forEach(function (btn) {
    btn.addEventListener("click", function () { commitClient(btn); });
    if (finePointer) {
      btn.addEventListener("mouseenter", function () { showClient(btn); });
      btn.addEventListener("focus", function () { showClient(btn); });
    }
  });
  if (wselList && finePointer) {
    wselList.addEventListener("mouseleave", function () { showClient(committedBtn); });
  }

  /* ===== hero REC timecode ===== */
  var recTime = document.getElementById("rec-time");
  var heroRec = document.getElementById("hero-rec");
  if (recTime && !reduceMotion) {
    var recSeconds = 0;
    setInterval(function () {
      if (document.hidden) return;
      recSeconds++;
      var h = String(Math.floor(recSeconds / 3600)).padStart(2, "0");
      var m = String(Math.floor((recSeconds % 3600) / 60)).padStart(2, "0");
      var sec = String(recSeconds % 60).padStart(2, "0");
      recTime.textContent = h + ":" + m + ":" + sec;
    }, 1000);
  }

  /* ===== work grid: card opens the takeover player with sound ===== */
  document.querySelectorAll(".work__card button[data-video]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var n = btn.getAttribute("data-video");
      reelFull.src = "assets/work-" + n + ".mp4";
      openModal(reelModal);
      reelFull.currentTime = 0;
      reelFull.muted = false;
      reelFull.play().catch(function () {});
    });
  });

  /* contact form: honest mailto handoff */
  document.getElementById("contact-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var f = e.target;
    var subject = "Fyrirspurn af vefnum: " + f.service.value;
    var body = "Nafn: " + f.name.value +
      "\nNetfang: " + f.email.value +
      (f.phone.value ? "\nSími: " + f.phone.value : "") +
      "\nÞjónusta: " + f.service.value +
      "\n\n" + f.message.value;
    window.location.href = "mailto:Bachmedia@bachmedia.is?subject=" +
      encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  });

  /* breakpoint change: clear inline scrub styles so modes don't weld (Holt lore) */
  mdUp.addEventListener("change", function () {
    [heroHeadline, heroMark, heroCopy].forEach(function (el) {
      el.style.transform = ""; el.style.opacity = introDone ? "1" : "0";
    });
    heroReel.style.width = ""; heroReel.style.height = "";
    heroReel.style.right = ""; heroReel.style.bottom = "";
    reelState = { w: 0, h: 0, r: 0, b: 0 };
    stageCards.forEach(function (c) { c.style.transform = ""; c.style.opacity = ""; });
    chantEl.style.transform = ""; chantEl.style.opacity = "";
    stageFinale.style.opacity = "";
    frame();
  });
})();
