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
  var dialogCover = dialog.querySelector(".dialog__cover");
  var dialogTitle = dialog.querySelector(".dialog__title");
  var dialogSlot = dialog.querySelector(".dialog__slot");
  var closeButton = dialog.querySelector(".dialog__close");
  var grid = document.getElementById("projects");
  var pageTitle = document.title;

  // The project currently shown: { item, details, pushed }
  var current = null;
  var closing = false;

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
  // and right edges, so no white box shows around it mid-flight.
  var SHADOW_OFF = "0 1.5rem 5rem rgb(0 0 0 / 0)";
  var SHADOW_ON = "0 1.5rem 5rem rgb(0 0 0 / 0.35)";

  function setBox(on) {
    dialog.style.viewTransitionName = on ? "project-box" : "";
    closeButton.style.viewTransitionName = on ? "project-close" : "";
  }

  // Where the tile sits relative to the dialog box, as inset() values for the CSS keyframes
  function setTileInsets(tileRect) {
    var box = dialog.getBoundingClientRect();
    root.style.setProperty("--vt-t", tileRect.top - box.top + "px");
    root.style.setProperty("--vt-r", box.right - tileRect.right + "px");
    root.style.setProperty("--vt-b", box.bottom - tileRect.bottom + "px");
    root.style.setProperty("--vt-l", tileRect.left - box.left + "px");
  }

  // The shadow would be clipped during the transition and pop in at the end, so it is
  // held back while the box moves and then faded in
  function restoreShadow() {
    dialog.style.boxShadow = "";
    dialog.animate([{ boxShadow: SHADOW_OFF }, { boxShadow: SHADOW_ON }], {
      duration: 250,
      easing: "ease-out"
    });
  }

  // Moves the project's details into the dialog (moved, not cloned, so ids stay unique)
  function fill(item, pushed) {
    var parts = tileParts(item);
    var details = item.querySelector(".project__details");
    dialogCover.src = parts.cover.currentSrc || parts.cover.src;
    dialogTitle.textContent = parts.title.textContent;
    dialogSlot.appendChild(details);
    document.title = parts.title.textContent + ", " + pageTitle;
    current = { item: item, details: details, pushed: pushed };
  }

  function empty() {
    var item = current.item;
    item.appendChild(current.details);
    document.title = pageTitle;
    current = null;
  }

  function show() {
    dialog.showModal();
    dialog.scrollTop = 0;
    dialogTitle.focus({ preventScroll: true });
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
      dialog.style.boxShadow = "none";
      show();
      setTileInsets(tileRect);
      setBox(true);
    });
    if (vt) {
      vt.finished.finally(function () {
        setName(dialogCover, false);
        setBox(false);
        restoreShadow();
      });
    } else {
      setName(parts.cover, false);
      setBox(false);
      dialog.style.boxShadow = "";
    }
  }

  function teardown() {
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
    setTileInsets(parts.tile.getBoundingClientRect());
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
})();
