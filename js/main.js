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
  var grid = document.querySelector(".project-grid");
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

  function setNames(cover, title, on) {
    cover.style.viewTransitionName = on ? "project-cover" : "";
    title.style.viewTransitionName = on ? "project-title" : "";
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

    setNames(parts.cover, parts.title, true);
    var vt = transition("open", function () {
      setNames(parts.cover, parts.title, false);
      fill(item, pushed);
      setNames(dialogCover, dialogTitle, true);
      show();
    });
    if (vt) {
      vt.finished.finally(function () {
        setNames(dialogCover, dialogTitle, false);
      });
    } else {
      setNames(parts.cover, parts.title, false);
    }
  }

  function teardown() {
    var item = current.item;
    var parts = tileParts(item);
    if (dialog.open) dialog.close();
    empty();
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

    setNames(dialogCover, dialogTitle, true);
    var vt = transition("close", function () {
      setNames(dialogCover, dialogTitle, false);
      setNames(parts.cover, parts.title, true);
      teardown();
    });
    if (vt) {
      vt.finished.finally(function () {
        setNames(parts.cover, parts.title, false);
        done();
      });
    } else {
      setNames(dialogCover, dialogTitle, false);
      setNames(parts.cover, parts.title, false);
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

  // Direct link, e.g. index.html#dolor-sit
  var initial = findProject(location.hash.slice(1));
  if (initial) openProject(initial, { animate: false, pushed: false });
})();
