(function () {
  "use strict";

  function enhanceCodeBlocks(root) {
    root.querySelectorAll("pre").forEach(function (pre, index) {
      if (!pre.hasAttribute("tabindex")) {
        pre.setAttribute("tabindex", "0");
      }
      if (!pre.hasAttribute("aria-label")) {
        pre.setAttribute("aria-label", "Scrollable code example " + (index + 1));
      }
    });
  }

  function enhanceDiagrams(root) {
    root.querySelectorAll('img[src*="assets/diagrams/"]').forEach(function (image) {
      if (image.closest(".diagram-frame")) {
        return;
      }

      var source = image.getAttribute("src");
      var alternative = image.getAttribute("alt") || "documentation diagram";
      var parent = image.parentElement;
      var figure = document.createElement("figure");
      figure.className = "diagram-frame";

      if (parent && parent.tagName === "P") {
        parent.replaceWith(figure);
        figure.appendChild(image);
      } else {
        image.replaceWith(figure);
        figure.appendChild(image);
      }

      var toolbar = document.createElement("figcaption");
      toolbar.className = "diagram-frame__toolbar";
      var link = document.createElement("a");
      link.href = source;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = "Open full-size diagram ↗";
      link.setAttribute("aria-label", "Open full-size " + alternative + " in a new tab");
      toolbar.appendChild(link);
      figure.appendChild(toolbar);
    });
  }

  function initialize() {
    var content = document.querySelector(".md-content");
    if (!content) {
      return;
    }
    enhanceCodeBlocks(content);
    enhanceDiagrams(content);
  }

  if (typeof document$ !== "undefined") {
    document$.subscribe(initialize);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();
