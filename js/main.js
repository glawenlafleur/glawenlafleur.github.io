(function () {
  "use strict";

  var root = document.documentElement;
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function canTransition() {
    return "startViewTransition" in document && !reducedMotion.matches;
  }

  // Runs `update` inside a view transition tagged with `kind` (open, close, theme).
  // Falls back to calling `update` directly. Returns the transition or null.
  function transition(kind, update) {
    if (!canTransition()) {
      update();
      return null;
    }
    root.dataset.vt = kind;
    var vt = document.startViewTransition(update);
    vt.finished.finally(function () {
      delete root.dataset.vt;
    });
    return vt;
  }


  /* Smoothed corners
     CSS border-radius is a plain circular arc. Figma-style "corner smoothing" (the iOS look)
     eases into the corner over a longer stretch of the edge. There is no cross-browser CSS for
     that, so the shape is drawn as a clip-path: path() computed from the element's size.
     The path keeps the same command structure at every size, so it can be animated. */

  var SMOOTHING = 0.6;

  var smoothing =
    window.CSS &&
    CSS.supports &&
    CSS.supports("clip-path", 'path("M0 0L1 0L1 1Z")') &&
    !window.matchMedia("(forced-colors: active), (prefers-contrast: more)").matches;

  // Corner geometry from figma-squircle: the curve starts p from the corner (p = (1 + smoothing) * r),
  // runs through two bezier sections (a, b, c, d) around a shortened circular arc of length L.
  function cornerGeometry(w, h, r) {
    var s = SMOOTHING;
    var maxR = Math.min(w, h) / 2;
    r = Math.max(0, Math.min(r, maxR));
    if (r === 0) return { r: 0, s: 0, p: 0, a: 0, b: 0, c: 0, d: 0, L: 0 };
    var p = (1 + s) * r;
    s = Math.min(s, maxR / r - 1);
    p = Math.min(p, maxR);
    var rad = Math.PI / 180;
    var arc = 90 * (1 - s);
    var L = Math.sin((arc * rad) / 2) * r * Math.SQRT2;
    var alpha = (90 - arc) / 2;
    var p3 = r * Math.tan((alpha * rad) / 2);
    var beta = 45 * s;
    var c = p3 * Math.cos(beta * rad);
    var d = c * Math.tan(beta * rad);
    var b = (p - L - c - d) / 3;
    return { r: r, s: s, p: p, a: 2 * b, b: b, c: c, d: d, L: L };
  }

  function num(n) {
    return String(Math.round(n * 100) / 100);
  }

  // SVG path for a rectangle with smoothed corners, drawn clockwise from the top-left
  function smoothPath(x, y, w, h, r) {
    var k = cornerGeometry(w, h, r);
    // corner x, y, then the direction of travel into the corner (t) and out of it (n)
    var corners = [
      [x, y, 0, -1, 1, 0],
      [x + w, y, 1, 0, 0, 1],
      [x + w, y + h, 0, 1, -1, 0],
      [x, y + h, -1, 0, 0, -1]
    ];
    var d = "M " + num(x + k.p) + " " + num(y) + " ";
    for (var i = 1; i <= 4; i++) {
      var q = corners[i % 4];
      var cx = q[0], cy = q[1], tx = q[2], ty = q[3], nx = q[4], ny = q[5];
      var at = function (u, v) {
        return num(cx + (u - k.p) * tx + v * nx) + " " + num(cy + (u - k.p) * ty + v * ny);
      };
      var ab = k.a + k.b;
      var abc = ab + k.c;
      d += "L " + at(0, 0) +
        " C " + at(k.a, 0) + " " + at(ab, 0) + " " + at(abc, k.d) +
        " A " + num(k.r) + " " + num(k.r) + " 0 0 1 " + at(abc + k.L, k.d + k.L) +
        " C " + at(k.p, k.p - ab) + " " + at(k.p, k.p - k.a) + " " + at(k.p, k.p) + " ";
    }
    return d + "Z";
  }

  // A circular radius whose corner passes through the same diagonal point as the smoothed one
  function matchingRadius(w, h, r) {
    var k = cornerGeometry(w, h, r);
    if (k.r === 0) return 0;
    var sag = k.r * (1 - Math.cos((90 * (1 - k.s) * Math.PI) / 360));
    var mx = k.a + k.b + k.c + k.L / 2;
    var my = k.d + k.L / 2;
    return (Math.hypot(k.p - mx, my) - sag) / (Math.SQRT2 - 1);
  }

  // The element's corner radius in px, from its --sq-r custom property (e.g. "3rem" or "0px")
  function cornerRadius(style) {
    var raw = style.getPropertyValue("--sq-r").trim();
    var value = parseFloat(raw);
    if (!value) return 0;
    if (/rem$/.test(raw)) return value * parseFloat(getComputedStyle(root).fontSize);
    return value;
  }

  function pathValue(d) {
    return 'path("' + d + '")';
  }

  var smooth = [];

  // Measures the element and (re)writes its clip paths. Sets data-sq so the CSS swaps
  // border-radius for the clip; elements with no radius or no size keep plain CSS.
  function applySmoothing(el) {
    var style = getComputedStyle(el);
    var w = parseFloat(style.width);
    var h = parseFloat(style.height);
    var r = cornerRadius(style);
    if (!(w > 1 && h > 1 && r > 0)) {
      el.removeAttribute("data-sq");
      return;
    }
    el.style.setProperty("--sq-clip", pathValue(smoothPath(0, 0, w, h, r)));
    if (el.classList.contains("tile")) {
      // Hairline: the ring between the outer shape and the same shape inset by 1px
      el.style.setProperty(
        "--sq-hair",
        'path(evenodd, "' + smoothPath(0, 0, w, h, r) + " " + smoothPath(1, 1, w - 2, h - 2, r - 1) + '")'
      );
      // Hover ring: 4px thick, 4px clear of the tile (the pseudo-element is the tile + 8px each side)
      el.parentNode.style.setProperty(
        "--sq-ring",
        'path(evenodd, "' + smoothPath(0, 0, w + 16, h + 16, r + 8) + " " +
          smoothPath(4, 4, w + 8, h + 8, r + 4) + '")'
      );
    }
    el.setAttribute("data-sq", "");
  }

  if (smoothing) {
    var observer = "ResizeObserver" in window
      ? new ResizeObserver(function (entries) {
          entries.forEach(function (entry) {
            applySmoothing(entry.target);
          });
        })
      : null;
    document.querySelectorAll(".tile, .profile, .dialog__box").forEach(function (el) {
      smooth.push(el);
      applySmoothing(el);
      if (observer) observer.observe(el);
    });
  }

  /* Theme: Auto follows the system; Light/Dark are saved overrides */

  var THEME_KEY = "theme";

  function readTheme() {
    try {
      var saved = localStorage.getItem(THEME_KEY);
      return saved === "light" || saved === "dark" ? saved : "auto";
    } catch (e) {
      return "auto";
    }
  }

  function saveTheme(mode) {
    try {
      if (mode === "auto") localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, mode);
    } catch (e) {}
  }

  function applyTheme(mode) {
    if (mode === "auto") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", mode);
  }

  var themeInputs = document.querySelectorAll('input[name="theme"]');
  var currentTheme = readTheme();

  themeInputs.forEach(function (input) {
    input.checked = input.value === currentTheme;
    input.addEventListener("change", function () {
      if (!input.checked) return;
      saveTheme(input.value);
      transition("theme", function () {
        applyTheme(input.value);
      });
    });
  });

  /* Project dialog */

  var dialog = document.getElementById("project-dialog");
  var dialogShade = dialog.querySelector(".dialog__shade");
  var dialogBox = dialog.querySelector(".dialog__box");
  var dialogScroll = dialog.querySelector(".dialog__scroll");
  var dialogCover = dialog.querySelector(".dialog__cover");
  var dialogArt = dialog.querySelector(".dialog__art");
  var dialogTitle = dialog.querySelector(".dialog__title");
  var dialogSlot = dialog.querySelector(".dialog__slot");
  var closeButton = dialog.querySelector(".dialog__close");
  var grid = document.getElementById("projects");
  var pageTitle = document.title;

  // The bottom fade is a hint that there is more below. Its strength follows the scroll position
  // (--more, 0 to 1): full at the top of the content, gone after about 80px of scrolling, so it
  // fades out smoothly instead of switching off, and never washes over images further down.
  function syncMore() {
    var remaining = dialogScroll.scrollHeight - dialogScroll.scrollTop - dialogScroll.clientHeight;
    var more = remaining > 8 ? Math.max(0, Math.min(1, 1 - dialogScroll.scrollTop / 80)) : 0;
    dialogBox.style.setProperty("--more", more);
  }

  // The cover sits outside the scroller and follows the scroll position, but only upward: when the
  // scroller rubber-bands past the top (scrollTop is zero or negative), the cover stays at the top
  // edge and only the text bounces.
  function syncCover() {
    var y = "0 " + -Math.max(0, dialogScroll.scrollTop) + "px";
    dialogCover.style.translate = y;
    dialogArt.style.translate = y;
  }

  // Same for the project list on desktop, where it is the scroller. The fade (--fade-a) strengthens
  // as a project reaches further past the bottom edge, over about 96px, and is zero once the last
  // project is fully in view, so the empty padding after it never gets a fade.
  var projectTiles = grid.querySelectorAll(".project");

  function syncGridMore() {
    var last = projectTiles[projectTiles.length - 1];
    var past = last ? last.getBoundingClientRect().bottom - grid.getBoundingClientRect().bottom : 0;
    grid.style.setProperty("--fade-a", Math.max(0, Math.min(1, past / 96)));
  }

  grid.addEventListener("scroll", syncGridMore, { passive: true });
  window.addEventListener("resize", syncGridMore);
  syncGridMore();
  if ("ResizeObserver" in window) new ResizeObserver(syncGridMore).observe(grid);

  dialogScroll.addEventListener("scroll", function () {
    syncCover();
    syncMore();
  }, { passive: true });
  if ("ResizeObserver" in window) {
    var moreObserver = new ResizeObserver(syncMore);
    moreObserver.observe(dialogScroll);
    moreObserver.observe(dialogScroll.querySelector(".dialog__content"));
  }

  // What the dialog currently shows: { item, details, pushed } for a project, or
  // { kind: "changelog", details, pushed } for the changelog
  var current = null;
  var closing = false;

  // The changelog lives in the footer and is moved into the dialog while it is open. After closing,
  // it is moved back once the dialog has finished fading out.
  var changelog = document.getElementById("changelog");
  var changelogHome = changelog.parentNode;
  var changelogLink = document.querySelector(".site-footer__link");
  var changelogTimer = 0;

  // The footer shows the newest version in the changelog, so the two cannot drift apart
  var versionLabel = document.querySelector(".site-footer__version");
  var latest = /Version (\d+(?:\.\d+)*)/.exec(changelog.querySelector("h3").textContent);
  if (versionLabel && latest) versionLabel.textContent = "v" + latest[1];

  function flushChangelog() {
    clearTimeout(changelogTimer);
    if (changelog.parentNode !== changelogHome) changelogHome.appendChild(changelog);
    dialog.classList.remove("dialog--changelog");
  }

  function findProject(slug) {
    if (!slug) return null;
    var item = document.getElementById(slug);
    return item && grid.contains(item) && item.classList.contains("project") ? item : null;
  }

  function tileParts(item) {
    var tile = item.querySelector(".tile");
    return {
      tile: tile,
      cover: tile.querySelector(".tile__cover"),
      title: tile.querySelector(".tile__title")
    };
  }

  // Only the cover is shared between tile and dialog; each title is its own element and stays put
  function setName(cover, on) {
    cover.style.viewTransitionName = on ? "project-cover" : "";
  }

  // The dialog's own box is part of the transition too: it is revealed from (and retracts to)
  // the tile's rectangle, in step with the cover. The cover is flush with the box's top, left
  // and right edges, so no white box shows around it mid-flight. The shadow is a separate layer
  // (.dialog__shade) so the box's reveal clip doesn't cut it off: it fades in and out with the motion.
  function setBox(on) {
    dialog.style.viewTransitionName = on ? "project-box" : "";
    dialogShade.style.viewTransitionName = on ? "project-shadow" : "";
    closeButton.style.viewTransitionName = on ? "project-close" : "";
  }

  // Where the tile sits relative to the dialog box: the clip paths the box opens from and
  // settles on, and the circular corner radii for the cover that travels between them
  function setTileInsets(tile, tileRect) {
    var box = dialog.getBoundingClientRect();
    var tileR = cornerRadius(getComputedStyle(tile));
    var boxR = cornerRadius(getComputedStyle(dialogBox));
    var x = tileRect.left - box.left;
    var y = tileRect.top - box.top;
    var w = tileRect.width;
    var h = tileRect.height;
    var from, to;
    if (smoothing) {
      from = pathValue(smoothPath(x, y, w, h, tileR));
      to = pathValue(smoothPath(0, 0, box.width, box.height, boxR));
    } else {
      from = "inset(" + y + "px " + (box.right - tileRect.right) + "px " + (box.bottom - tileRect.bottom) +
        "px " + x + "px round " + tileR + "px)";
      to = "inset(0 round " + boxR + "px)";
    }
    // The close button sits in the dialog's top-right corner, so it travels with that corner
    root.style.setProperty("--vt-close-dx", tileRect.right - box.right + "px");
    root.style.setProperty("--vt-close-dy", tileRect.top - box.top + "px");
    root.style.setProperty("--vt-from", from);
    root.style.setProperty("--vt-to", to);
    root.style.setProperty("--vt-cr-tile", (smoothing ? matchingRadius(w, h, tileR) : tileR) + "px");
    root.style.setProperty("--vt-cr-dialog", (smoothing ? matchingRadius(box.width, box.height, boxR) : boxR) + "px");
  }

  // Samples the cover for its dominant colour and hands it to the role chip as --cover-rgb.
  // Colourful, mid-tone pixels count most, so a dark background or white glare doesn't win.
  // The stylesheet turns the sample into a tint and an ink with fixed lightness, so contrast
  // holds whatever the cover. If sampling fails, the chip keeps its iris fallback.
  function sampleCover(img, details) {
    var targets = [].concat(details);
    function run() {
      try {
        var c = document.createElement("canvas");
        c.width = c.height = 24;
        var ctx = c.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, 24, 24);
        var px = ctx.getImageData(0, 0, 24, 24).data;
        var r = 0, g = 0, b = 0, total = 0;
        for (var i = 0; i < px.length; i += 4) {
          var max = Math.max(px[i], px[i + 1], px[i + 2]) / 255;
          var min = Math.min(px[i], px[i + 1], px[i + 2]) / 255;
          var light = (max + min) / 2;
          var sat = max === min ? 0 : (max - min) / (1 - Math.abs(2 * light - 1));
          var w = sat * sat * (1 - Math.abs(2 * light - 1));
          r += px[i] * w; g += px[i + 1] * w; b += px[i + 2] * w; total += w;
        }
        if (total < 0.5) return;
        var rgb = Math.round(r / total) + " " + Math.round(g / total) + " " + Math.round(b / total);
        targets.forEach(function (el) { el.style.setProperty("--cover-rgb", rgb); });
      } catch (e) { /* tainted canvas or no pixel access: keep the fallback */ }
    }
    if (img.complete && img.naturalWidth) run();
    else img.addEventListener("load", run, { once: true });
  }

  // The tiles' role chips take the same tint, so sample every cover up front
  projectTiles.forEach(function (item) {
    var tile = item.querySelector(".tile");
    if (tile) sampleCover(tile.querySelector(".tile__cover"), tile);
  });

  // Moves the project's details into the dialog (moved, not cloned, so ids stay unique)
  function fill(item, pushed) {
    flushChangelog();
    var parts = tileParts(item);
    var details = item.querySelector(".project__details");
    dialogCover.src = parts.cover.currentSrc || parts.cover.src;
    dialogTitle.textContent = parts.title.textContent;
    sampleCover(parts.cover, details);
    dialogSlot.appendChild(details);
    document.title = parts.title.textContent + ", " + pageTitle;
    current = { item: item, details: details, pushed: pushed };
  }

  function empty() {
    if (current.kind === "changelog") {
      document.title = pageTitle;
      current = null;
      changelogTimer = setTimeout(flushChangelog, 400);
      return;
    }
    var item = current.item;
    item.appendChild(current.details);
    document.title = pageTitle;
    current = null;
  }

  function show() {
    dialog.showModal();
    dialogScroll.scrollTop = 0;
    if (smoothing) applySmoothing(dialogBox);
    syncCover();
    syncMore();
    dialogTitle.focus({ preventScroll: true });
  }

  // The changelog grows out of the footer link when it opens and shrinks back into it when it
  // closes (the project modals do the same with their tiles). Opened any other way, it scales in
  // gently from its own centre. With reduced motion it only fades.
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

  // The hidden end of the animation: faded out and, from the link, shrunk and moved onto it
  function changelogHidden(fromLink) {
    if (reduceMotion.matches) return { opacity: 0 };
    var link = changelogLink.getBoundingClientRect();
    var box = dialog.getBoundingClientRect();
    var dx = fromLink ? link.left + link.width / 2 - (box.left + box.width / 2) : 0;
    var dy = fromLink ? link.top + link.height / 2 - (box.top + box.height / 2) : 0;
    return { opacity: 0, transform: "translate(" + dx + "px, " + dy + "px) scale(" + (fromLink ? 0.12 : 0.96) + ")" };
  }

  function openChangelog(pushed, fromLink) {
    if (current) return;
    flushChangelog();
    dialog.classList.add("dialog--changelog");
    dialogTitle.textContent = "Changelog";
    dialogSlot.appendChild(changelog);
    document.title = "Changelog, " + pageTitle;
    current = { kind: "changelog", details: changelog, pushed: pushed };
    show();
    // The backdrop fades in through the stylesheet; this is the dialog itself
    dialog.animate([changelogHidden(fromLink), { opacity: 1, transform: "none" }], {
      duration: reduceMotion.matches ? 120 : 450,
      easing: reduceMotion.matches ? "linear" : EASE
    });
  }

  // Plays the closing motion, then finishes. The dialog stays open until the motion is done.
  function closeChangelog(animate) {
    closing = true;
    function finish() {
      teardown();
      closing = false;
    }
    if (!animate || !dialog.open) {
      finish();
      return;
    }
    var duration = reduceMotion.matches ? 120 : 350;
    var motion = dialog.animate([{ opacity: 1, transform: "none" }, changelogHidden(true)], {
      duration: duration,
      easing: reduceMotion.matches ? "linear" : EASE,
      fill: "forwards"
    });
    var fade = null;
    try {
      fade = dialog.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: duration,
        easing: "ease-out",
        fill: "forwards",
        pseudoElement: "::backdrop"
      });
    } catch (e) { /* no backdrop animation: it simply disappears at the end */ }
    function cleanup() {
      motion.cancel();
      if (fade) fade.cancel();
    }
    motion.finished.then(function () {
      finish();
      cleanup();
    }, function () {
      finish();
    });
  }

  function openProject(item, options) {
    if (current) return;
    var parts = tileParts(item);
    var pushed = options.pushed;

    if (!options.animate) {
      fill(item, pushed);
      show();
      return;
    }

    var tileRect = parts.tile.getBoundingClientRect();
    setName(parts.cover, true);
    var vt = transition("open", function () {
      setName(parts.cover, false);
      fill(item, pushed);
      setName(dialogCover, true);
      show();
      setTileInsets(parts.tile, tileRect);
      setBox(true);
    });
    if (vt) {
      vt.finished.finally(function () {
        setName(dialogCover, false);
        setBox(false);
      });
    } else {
      setName(parts.cover, false);
      setBox(false);
    }
  }

  function teardown() {
    if (current.kind === "changelog") {
      if (dialog.open) dialog.close();
      empty();
      changelogLink.focus({ preventScroll: true });
      return;
    }
    var item = current.item;
    var parts = tileParts(item);
    if (dialog.open) dialog.close();
    empty();
    // Focus returns to the tile for keyboard continuity, but without the selected look
    parts.tile.dataset.restored = "";
    parts.tile.addEventListener("blur", function () {
      delete parts.tile.dataset.restored;
    }, { once: true });
    parts.tile.focus({ preventScroll: true });
    return parts;
  }

  function closeProject(animate) {
    if (!current || closing) return;
    if (current.kind === "changelog") {
      closeChangelog(animate);
      return;
    }
    closing = true;
    var item = current.item;
    var parts = tileParts(item);

    function done() {
      closing = false;
    }

    if (!animate) {
      teardown();
      done();
      return;
    }

    setName(dialogCover, true);
    setTileInsets(parts.tile, parts.tile.getBoundingClientRect());
    setBox(true);
    var vt = transition("close", function () {
      setName(dialogCover, false);
      setBox(false);
      setName(parts.cover, true);
      teardown();
    });
    if (vt) {
      vt.finished.finally(function () {
        setName(parts.cover, false);
        done();
      });
    } else {
      setName(dialogCover, false);
      setBox(false);
      setName(parts.cover, false);
      done();
    }
  }

  // Esc, the close button, and a backdrop click all end up here
  function requestClose() {
    if (!current || closing) return;
    if (current.pushed) {
      history.back(); // popstate closes the dialog
    } else {
      history.replaceState(null, "", location.pathname + location.search);
      closeProject(true);
    }
  }

  grid.addEventListener("click", function (event) {
    var tile = event.target.closest(".tile");
    if (!tile || event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    var item = tile.closest(".project");
    history.pushState(null, "", "#" + item.id);
    openProject(item, { animate: true, pushed: true });
  });

  changelogLink.addEventListener("click", function (event) {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (current) return;
    history.pushState(null, "", "#changelog");
    openChangelog(true, true);
  });

  closeButton.addEventListener("click", requestClose);

  dialog.addEventListener("cancel", function (event) {
    event.preventDefault();
    requestClose();
  });

  dialog.addEventListener("click", function (event) {
    if (event.target !== dialog) return;
    var box = dialog.getBoundingClientRect();
    var outside =
      event.clientX < box.left ||
      event.clientX > box.right ||
      event.clientY < box.top ||
      event.clientY > box.bottom;
    if (outside) requestClose();
  });

  // Safety net: if the dialog is closed some other way, restore the details
  dialog.addEventListener("close", function () {
    if (current && !closing && !dialog.open) empty();
  });

  window.addEventListener("popstate", function () {
    if (location.hash === "#changelog") {
      if (current && current.kind !== "changelog") closeProject(false);
      if (!current) openChangelog(true, false);
      return;
    }
    var item = findProject(location.hash.slice(1));
    if (!item) {
      closeProject(true);
    } else if (!current) {
      openProject(item, { animate: false, pushed: true });
    } else if (current.item !== item) {
      closeProject(false);
      openProject(item, { animate: false, pushed: true });
    }
  });

  /* Profile bio: clipped text offers "Read more", which swaps the contact buttons for the full text */

  var profile = document.querySelector(".profile");
  var bio = document.getElementById("profile-bio");
  var more = profile.querySelector(".profile__more");

  function syncBio() {
    var expanded = profile.hasAttribute("data-expanded");
    var clipped = !expanded && bio.scrollHeight > bio.clientHeight + 1;
    bio.toggleAttribute("data-clipped", clipped);
    more.hidden = !(expanded || clipped);
  }

  more.addEventListener("click", function () {
    var expanded = profile.toggleAttribute("data-expanded");
    more.setAttribute("aria-expanded", String(expanded));
    more.textContent = expanded ? "Show Links" : "Read more";
    syncBio();
    if (!expanded) bio.scrollTop = 0;
  });

  if ("ResizeObserver" in window) {
    new ResizeObserver(syncBio).observe(profile);
  }
  window.addEventListener("resize", syncBio);
  syncBio();

  // Direct link, e.g. index.html#dolor-sit
  var initial = findProject(location.hash.slice(1));
  if (initial) openProject(initial, { animate: false, pushed: false });
  else if (location.hash === "#changelog") openChangelog(false, false);
})();
