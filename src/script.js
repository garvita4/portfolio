(function () {
  "use strict";

  var NAME = "GARVITA\nARORA";

  var DATA = {
    web: {
      title: "Web projects",
      color: "#ffb3e1",
      items: [
        {
          title: "ROADS UNTAKEN",
          desc: "A cinematic journey through city streets worldwide. Explore, tune into local radio, and experience each city by car or by foot.",
          tags: ["HTML", "CSS", "JavaScript"],
          link: "https://roads-untaken.vercel.app/",
        },
        {
          title: "PROJECT VOID",
          desc: "An AI powered tool that detects scams and helps user identify digital threats.",
          tags: ["React", "API"],
          link: "https://ai.studio/apps/drive/1K12EhnRbxH7sBYARQeCvqZ6gQ94njk5R",
        },
        {
          title: "APPLE CLONE",
          desc: "apple.com clone",
          tags: ["Node", "Database"],
          link: "https://github.com/garvita4/Apple-clone",
        },
      ],
    },
    hardware: {
      title: "Hardware projects",
      color: "#7dffc4",
      items: [
        {
          title: "Split Keyboard",
          desc: "a custom split keyboard with the 1.8inch tft diaply and rotatory encoder and also with nfc based lock system with controlable backlight.",
          tags: ["Arduino", "Sensors", "ESP32"],
          link: "https://github.com/garvita4/split-keyboard",
        },
        {
          title: "synthesizer",
          desc: "A portable standalone digital synthesizer and musical workstation featuring a 30-key hot-swap mechanical keyboard, 5x EC11 rotatory encoders, and a vibrant TFT display.",
          tags: ["ESP32", "C++"],
          link: "https://github.com/garvita4/synthesizer",
        },
        {
          title: "LORA",
          desc: "A long range communication device using an SX1262 radio module and RP2040 microcontroller for wireless signal transmission and reception over ISM radio frequencies.",
          tags: ["Raspberry Pi", "Python"],
          link: "https://github.com/garvita4/loRa-puck",
        },
      ],
    },
    games: {
      title: "Games",
      color: "#ff8a3d",
      items: [
        {
          title: "DSA KAIZEN (ongoing)",
          desc: "AN immersive 3D adventure where you explore, learn and solve DSA challenges and survive your way.",
          tags: ["Unity", "C#", "Blender"],
          link: "#",
        },
        {
          title: "AFTERPATH",
          desc: "What you leave behind, becomes the path.",
          tags: ["Godot", "2D"],
          link: "#",
        },
        {
          title: "Game three",
          desc: "One sentence about what it is.",
          tags: ["JavaScript", "Canvas"],
          link: "#",
        },
      ],
    },
  };

  var $ = function (s) {
    return document.querySelector(s);
  };
  var reduce = matchMedia("(prefers-reduced-motion:reduce)").matches;
  var T = reduce ? 0 : 600;

  var nameEl = $("#name"),
    device = $("#device"),
    screen = $("#screen"),
    hint = $("#hint");
  var big = $("#big"),
    menu = $("#menu"),
    grid = $("#grid"),
    mtitle = $("#mtitle"),
    project = $("#project");
  var tabs = [].slice.call(document.querySelectorAll(".tab"));
  var pageEls = [$("header"), $("main")];
  var cur = null,
    sel = 0,
    cards = [],
    inProject = false,
    opener = null,
    busy = false;

  project.inert = true;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c];
    });
  }

  NAME.split("").forEach(function (c) {
    if (c === "\n") {
      nameEl.appendChild(document.createElement("br"));
      return;
    }
    var s = document.createElement("span");
    s.textContent = c;
    nameEl.appendChild(s);
  });

  function photoOnly() {
    var on = screen.classList.toggle("only");
    hint.textContent = on
      ? "Just me. Press the plus again for the label."
      : "Press A, B or C. Press the plus for just me.";
    if (!reduce) {
      device.classList.remove("flip");
      void device.offsetWidth;
      device.classList.add("flip");
    }
  }
  [].forEach.call(document.querySelectorAll("#dpad button"), function (b) {
    b.addEventListener("click", photoOnly);
  });
  device.addEventListener("animationend", function (e) {
    if (e.animationName === "flip") device.classList.remove("flip");
  });

  function screenRect() {
    var el = opener && opener.closest(".skills") ? opener : screen;
    var r = el.getBoundingClientRect();
    return (
      "translate(" +
      (r.left + r.width / 2 - innerWidth / 2) +
      "px," +
      (r.top + r.height / 2 - innerHeight / 2) +
      "px) scale(" +
      r.width / innerWidth +
      "," +
      r.height / innerHeight +
      ")"
    );
  }

  function select(i, noFocus) {
    sel = (i + cards.length) % cards.length;
    cards.forEach(function (c, n) {
      c.classList.toggle("sel", n === sel);
    });
    if (!noFocus) cards[sel].focus();
  }

  function render(key) {
    cur = DATA[key];
    tabs.forEach(function (t) {
      t.setAttribute("aria-selected", String(t.dataset.open === key));
    });
    mtitle.textContent = cur.title;
    grid.innerHTML = "";
    cards = cur.items.map(function (it, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "card";
      b.style.setProperty("--c", cur.color);
      b.innerHTML =
        '<span class="ct">' +
        esc(it.title) +
        '</span><span class="cd">' +
        esc(it.desc) +
        "</span>";
      b.addEventListener("click", function () {
        select(i, true);
        openProject(i);
      });
      grid.appendChild(b);
      return b;
    });
    select(0, true);
  }

  function openBig(key, from) {
    if (busy || !big.hidden) return;
    busy = true;
    opener = from || null;
    render(key);
    big.hidden = false;
    big.style.transition = "none";
    big.style.transform = screenRect();
    void big.offsetWidth;
    big.style.transition = "";
    big.style.transform = "none";
    document.body.classList.add("lock");
    pageEls.forEach(function (e) {
      e.inert = true;
    });
    setTimeout(function () {
      big.classList.add("ready");
      busy = false;
      cards[0].focus();
    }, T);
  }

  function closeBig() {
    if (busy || big.hidden) return;
    busy = true;
    resetProject();
    big.classList.remove("ready");
    setTimeout(
      function () {
        big.style.transform = screenRect();
        setTimeout(function () {
          big.hidden = true;
          big.style.transform = "";
          document.body.classList.remove("lock");
          pageEls.forEach(function (e) {
            e.inert = false;
          });
          busy = false;
          if (opener) opener.focus();
        }, T);
      },
      reduce ? 0 : 250,
    );
  }

  function openProject(i) {
    if (inProject) return;
    var it = cur.items[i];
    var link = it.link || "#";
    project.style.setProperty("--c", cur.color);
    project.innerHTML =
      '<div class="ptext"><h3>' +
      esc(it.title) +
      "</h3><p>" +
      esc(it.desc) +
      "</p>" +
      '<ul class="tags">' +
      it.tags
        .map(function (t) {
          return "<li>" + esc(t) + "</li>";
        })
        .join("") +
      "</ul>" +
      '<div class="acts"><a class="pill" href="' +
      esc(link) +
      '" target="_blank" rel="noopener">Open project</a>' +
      '<button type="button" class="pill back">Back</button></div></div>' +
      '<div class="shot" aria-hidden="true"><div class="dots"><i></i><i></i><i></i></div><span>Screenshot or demo goes here</span></div>';

    var vr = $("#views").getBoundingClientRect(),
      cr = cards[i].getBoundingClientRect();
    menu.style.transformOrigin =
      cr.left +
      cr.width / 2 -
      vr.left +
      "px " +
      (cr.top + cr.height / 2 - vr.top) +
      "px";
    inProject = true;
    menu.inert = true;
    project.inert = false;
    menu.classList.add("dive");
    project.classList.add("show");
    setTimeout(function () {
      var b = project.querySelector(".back");
      if (b && inProject) b.focus();
    }, T + 150);
  }

  function resetProject() {
    inProject = false;
    menu.classList.remove("dive");
    project.classList.remove("show");
    menu.inert = false;
    project.inert = true;
  }

  function backToMenu() {
    if (!inProject) return;
    resetProject();
    setTimeout(function () {
      if (cards[sel]) cards[sel].focus();
    }, T);
  }

  project.addEventListener("click", function (e) {
    if (e.target.closest(".back")) backToMenu();
  });
  $("#exit").addEventListener("click", closeBig);

  tabs.forEach(function (t) {
    t.addEventListener("click", function () {
      if (inProject) resetProject();
      render(t.dataset.open);
    });
  });

  [].forEach.call(document.querySelectorAll(".btns button"), function (b) {
    b.addEventListener("click", function () {
      openBig(b.dataset.open, b);
    });
  });
  $("#navWork").addEventListener("click", function (e) {
    e.preventDefault();
    openBig("web", e.currentTarget);
  });

  var KEYS = { a: "web", b: "hardware", c: "games" };
  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (!big.hidden) {
      if (e.key === "Escape") {
        e.preventDefault();
        if (inProject) backToMenu();
        else closeBig();
      } else if (!inProject && !busy) {
        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          e.preventDefault();
          select(sel + 1);
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          e.preventDefault();
          select(sel - 1);
        }
      }
      return;
    }
    var key = KEYS[e.key.toLowerCase()];
    if (key)
      openBig(
        key,
        document.querySelector('.btns button[data-open="' + key + '"]'),
      );
  });

  if (!reduce) {
    addEventListener("pointermove", function (e) {
      if (!big.hidden) return;
      var x = e.clientX / innerWidth - 0.5,
        y = e.clientY / innerHeight - 0.5;
      device.style.transform =
        "rotateY(" + x * 16 + "deg) rotateX(" + -y * 12 + "deg)";
    });
  }
  [].forEach.call(
    document.querySelectorAll(".skills [data-open]"),
    function (b) {
      b.addEventListener("click", function () {
        openBig(b.dataset.open, b);
      });
    },
  );
})();
