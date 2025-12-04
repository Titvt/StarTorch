const state = {
  book: localStorage.getItem("book"),
  currentUrl: localStorage.getItem("currentUrl"),
  chapterList: [],
  loadingUrls: new Set(),
};

const elements = {
  container: document.getElementById("chapters-container"),
  settingsContainer: document.getElementById("settings-container"),
  settingsBtn: document.getElementById("settings-btn"),
  settingsPanel: document.getElementById("settings-panel"),
  appearanceContainer: document.getElementById("appearance-container"),
  appearanceBtn: document.getElementById("appearance-btn"),
  appearancePanel: document.getElementById("appearance-panel"),
  fontDecrease: document.getElementById("font-decrease"),
  fontIncrease: document.getElementById("font-increase"),
  fontSizeDisplay: document.getElementById("font-size-display"),
  bookInput: document.getElementById("book-input"),
  confirmBtn: document.getElementById("confirm-btn"),
  chapterList: document.getElementById("chapter-list"),
  chapterListWrapper: document.getElementById("chapter-list-wrapper"),
  searchResults: document.getElementById("search-results"),
  autoScrollControls: document.getElementById("auto-scroll-controls"),
  autoScrollToggle: document.getElementById("auto-scroll-toggle"),
  speedDecrease: document.getElementById("speed-decrease"),
  speedIncrease: document.getElementById("speed-increase"),
  speedDisplay: document.getElementById("scroll-speed-display"),
};

let autoScrollState = {
  active: false,
  speed: parseInt(localStorage.getItem("autoScrollSpeed")) || 60,
  lastTime: 0,
  accumulator: 0,
  animationFrameId: null,
};

let appearanceState = {
  fontSize: parseInt(localStorage.getItem("fontSize")) || 24,
};

function updateAutoScrollUI() {
  const span = elements.autoScrollToggle.querySelector("span");
  span.textContent = autoScrollState.active ? "停止翻页" : "自动翻页";
  elements.speedDisplay.textContent = autoScrollState.speed;
}

function autoScrollLoop(timestamp) {
  if (!autoScrollState.active) {
    return;
  }

  if (!autoScrollState.lastTime) {
    autoScrollState.lastTime = timestamp;
  }

  const deltaTime = timestamp - autoScrollState.lastTime;
  autoScrollState.lastTime = timestamp;
  const safeDelta = Math.min(deltaTime, 50);
  const pixelsToScroll = (autoScrollState.speed * safeDelta) / 1000;
  autoScrollState.accumulator += pixelsToScroll;
  const step = Math.floor(autoScrollState.accumulator);

  if (step > 0) {
    window.scrollBy(0, step);
    autoScrollState.accumulator -= step;
  }

  autoScrollState.animationFrameId = requestAnimationFrame(autoScrollLoop);
}

function startAutoScroll() {
  if (autoScrollState.active) {
    return;
  }

  autoScrollState.active = true;
  autoScrollState.lastTime = 0;
  autoScrollState.accumulator = 0;
  document.body.classList.add("auto-scrolling");
  updateAutoScrollUI();
  autoScrollState.animationFrameId = requestAnimationFrame(autoScrollLoop);
}

function stopAutoScroll() {
  if (!autoScrollState.active) {
    return;
  }

  autoScrollState.active = false;
  document.body.classList.remove("auto-scrolling");
  updateAutoScrollUI();

  if (autoScrollState.animationFrameId) {
    cancelAnimationFrame(autoScrollState.animationFrameId);
    autoScrollState.animationFrameId = null;
  }
}

elements.autoScrollToggle.onclick = (e) => {
  e.stopPropagation();

  if (autoScrollState.active) {
    stopAutoScroll();
  } else {
    startAutoScroll();
  }
};

elements.speedDecrease.onclick = (e) => {
  e.stopPropagation();

  if (autoScrollState.speed > 30) {
    autoScrollState.speed -= 5;
    localStorage.setItem("autoScrollSpeed", autoScrollState.speed);
    updateAutoScrollUI();
  }
};

elements.speedIncrease.onclick = (e) => {
  e.stopPropagation();

  if (autoScrollState.speed < 120) {
    autoScrollState.speed += 5;
    localStorage.setItem("autoScrollSpeed", autoScrollState.speed);
    updateAutoScrollUI();
  }
};

function updateFontSizeUI() {
  elements.fontSizeDisplay.textContent = appearanceState.fontSize;
  document.documentElement.style.setProperty("--font-size", `${appearanceState.fontSize}px`);
}

elements.fontDecrease.onclick = (e) => {
  e.stopPropagation();

  if (appearanceState.fontSize > 12) {
    appearanceState.fontSize--;
    localStorage.setItem("fontSize", appearanceState.fontSize);
    updateFontSizeUI();
  }
};

elements.fontIncrease.onclick = (e) => {
  e.stopPropagation();

  if (appearanceState.fontSize < 36) {
    appearanceState.fontSize++;
    localStorage.setItem("fontSize", appearanceState.fontSize);
    updateFontSizeUI();
  }
};

function showSettings() {
  if (elements.appearanceContainer.classList.contains("expanded")) {
    hideAppearance();
  }

  elements.bookInput.value = "";
  elements.settingsPanel.hidden = false;
  elements.settingsContainer.classList.add("expanded");
  updateAutoScrollUI();
  renderChapterList();
  const activeItem = elements.chapterList.querySelector(".chapter-item.active");

  if (activeItem) {
    activeItem.scrollIntoView({ block: "center" });
  }
}

function hideSettings() {
  elements.settingsContainer.classList.remove("expanded");
  setTimeout(() => {
    if (!elements.settingsContainer.classList.contains("expanded")) {
      elements.settingsPanel.hidden = true;
    }
  }, 200);
}

function showAppearance() {
  if (elements.settingsContainer.classList.contains("expanded")) {
    hideSettings();
  }

  elements.appearancePanel.hidden = false;
  elements.appearanceContainer.classList.add("expanded");
  updateFontSizeUI();
  updateAutoScrollUI();
}

function hideAppearance() {
  elements.appearanceContainer.classList.remove("expanded");
  setTimeout(() => {
    if (!elements.appearanceContainer.classList.contains("expanded")) {
      elements.appearancePanel.hidden = true;
    }
  }, 200);
}

elements.appearanceBtn.onclick = (e) => {
  e.stopPropagation();
  showAppearance();
};

elements.appearancePanel.onclick = (e) => {
  e.stopPropagation();
};

elements.settingsBtn.onclick = (e) => {
  e.stopPropagation();
  showSettings();
};

elements.settingsPanel.onclick = (e) => {
  e.stopPropagation();
};

document.addEventListener("click", () => {
  if (elements.settingsContainer.classList.contains("expanded")) {
    hideSettings();
  }

  if (elements.appearanceContainer.classList.contains("expanded")) {
    hideAppearance();
  }
});

elements.confirmBtn.onclick = async () => {
  hideSettings();
  const keyword = elements.bookInput.value.trim();

  if (keyword) {
    await searchNovels(keyword);
  }
};

elements.bookInput.onkeydown = (e) => {
  if (e.key === "Enter") {
    elements.confirmBtn.click();
  }
};

async function searchNovels(keyword) {
  try {
    elements.searchResults.innerHTML = "";
    elements.container.hidden = true;
    elements.searchResults.hidden = false;
    const url = `http://www.shengxuxu.net/search.html?searchtype=novelname&searchkey=${encodeURIComponent(keyword)}`;
    const response = await fetch(`/fetch?url=${encodeURIComponent(url)}`);

    if (response.ok) {
      const htmlString = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlString, "text/html");
      const listItems = doc.querySelectorAll("ul.librarylist li");
      const results = Array.from(listItems)
        .map((li) => {
          const link = li.querySelector(".pt-ll-l a");
          const nameEl = li.querySelector(".novelname");
          const infoSpans = li.querySelectorAll(".info span");

          if (!link || !nameEl) {
            return null;
          }

          const href = link.getAttribute("href");
          const match = href.match(/\/(\d+)\/?$/);
          const id = match ? match[1] : href.replace(/\//g, "");
          const name = nameEl.textContent.trim();
          let author = "未知作者";
          const authorSpan = Array.from(infoSpans).find((span) => span.textContent.startsWith("作者："));

          if (authorSpan) {
            author = authorSpan.textContent.trim();
          }

          return { id, name, author };
        })
        .filter((item) => item !== null);

      renderSearchResults(results);
    }
  } catch {
    // Error
  }
}

function renderSearchResults(results) {
  if (results.length === 0) {
    return;
  }

  results.forEach((novel) => {
    const div = document.createElement("div");
    div.className = "search-item";
    const title = document.createElement("div");
    title.className = "search-item-title";
    title.textContent = novel.name;
    const author = document.createElement("div");
    author.className = "search-item-author";
    author.textContent = novel.author;
    div.appendChild(title);
    div.appendChild(author);
    div.onclick = async () => {
      elements.searchResults.hidden = true;
      elements.container.hidden = false;

      try {
        if (novel.id !== state.book) {
          elements.container.innerHTML = "";
          const success = await loadChapterList(novel.id);

          if (success && state.chapterList.length > 0) {
            state.book = novel.id;
            localStorage.setItem("book", state.book);
            state.currentUrl = null;
            localStorage.removeItem("currentUrl");
            localStorage.removeItem("readingProgress");
            state.currentUrl = state.chapterList[0].url;
            localStorage.setItem("currentUrl", state.currentUrl);
            await loadChapter(state.currentUrl);
            const currentIndex = state.chapterList.findIndex((c) => c.url === state.currentUrl);

            if (currentIndex !== -1 && currentIndex < state.chapterList.length - 1) {
              loadChapter(state.chapterList[currentIndex + 1].url);
            }
          }
        } else {
          if (state.currentUrl && elements.container.children.length === 0) {
            await loadChapter(state.currentUrl);
          }
        }
      } catch {
        // Error
      }
    };

    elements.searchResults.appendChild(div);
  });
}

async function loadChapterList(book) {
  try {
    const url = `http://www.shengxuxu.net/${book}/`;
    const response = await fetch(`/fetch?url=${encodeURIComponent(url)}`);

    if (response.ok) {
      const htmlString = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlString, "text/html");
      const dirLists = doc.querySelectorAll("ul.dirlist.clearfix");
      let links = [];

      if (dirLists.length >= 2) {
        const chapterListUl = dirLists[1];
        links = Array.from(chapterListUl.querySelectorAll("li a"));
      } else if (dirLists.length > 0) {
        links = Array.from(dirLists[dirLists.length - 1].querySelectorAll("li a"));
      }

      state.chapterList = links.map((link) => {
        const href = link.getAttribute("href");
        const fullUrl = href.startsWith("http") ? href : `http://www.shengxuxu.net${href}`;
        return {
          title: link.textContent.trim(),
          url: fullUrl,
        };
      });

      const metaTitle = doc.querySelector('meta[property="og:novel:book_name"]');

      if (metaTitle) {
        document.title = metaTitle.content;
      }

      renderChapterList();
      return true;
    }
  } catch {
    // Error
  }

  return false;
}

function renderChapterList() {
  elements.chapterList.innerHTML = "";

  if (state.chapterList.length > 0) {
    elements.chapterListWrapper.style.display = "flex";
    elements.autoScrollControls.style.display = "flex";
  } else {
    elements.chapterListWrapper.style.display = "none";
    elements.autoScrollControls.style.display = "none";
  }

  state.chapterList.forEach((chapter) => {
    const div = document.createElement("div");
    div.className = `chapter-item ${chapter.url === state.currentUrl ? "active" : ""}`;
    div.textContent = chapter.title;
    div.onclick = async () => {
      if (!elements.searchResults.hidden) {
        elements.searchResults.hidden = true;
        elements.container.hidden = false;
      } else if (chapter.url === state.currentUrl) {
        hideSettings();
        return;
      }

      hideSettings();
      localStorage.removeItem("readingProgress");
      state.currentUrl = chapter.url;
      localStorage.setItem("currentUrl", state.currentUrl);
      elements.container.innerHTML = "";
      await loadChapter(state.currentUrl);
      const currentIndex = state.chapterList.findIndex((c) => c.url === state.currentUrl);

      if (currentIndex !== -1 && currentIndex < state.chapterList.length - 1) {
        loadChapter(state.chapterList[currentIndex + 1].url);
      }

      renderChapterList();
    };
    elements.chapterList.appendChild(div);
  });
}

async function getData(url) {
  try {
    const response = await fetch(`/fetch?url=${encodeURIComponent(url)}`);

    if (response.ok) {
      const html = new DOMParser().parseFromString(await response.text(), "text/html");
      const rawTitle = html.querySelector("h1").textContent.trim();
      const title = rawTitle.substring(rawTitle.indexOf(" ") + 1).trim();
      const div = html.getElementById("chaptercontent");

      if (div) {
        div.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
        let lines = div.textContent.split("\n");
        lines = lines.map((line) => line.trim());
        lines = lines.filter((line) => line.length > 0);
        const content = "　　" + lines.join("\n　　");
        return {
          title: title,
          content: content,
          url: url,
        };
      }
    }
  } catch {
    // Error
  }

  return null;
}

function createChapterElement(data) {
  const article = document.createElement("article");
  article.className = "chapter";
  article.dataset.url = data.url;
  const h1 = document.createElement("h1");
  h1.textContent = data.title;
  const div = document.createElement("div");
  div.className = "content";
  div.textContent = data.content;
  article.appendChild(h1);
  article.appendChild(div);
  return article;
}

async function loadChapter(url) {
  if (!url || state.loadingUrls.has(url)) {
    return false;
  }

  if (document.querySelector(`.chapter[data-url="${CSS.escape(url)}"]`)) {
    return false;
  }

  state.loadingUrls.add(url);
  const data = await getData(url);
  state.loadingUrls.delete(url);

  if (data) {
    if (document.querySelector(`.chapter[data-url="${CSS.escape(url)}"]`)) {
      return true;
    }

    const el = createChapterElement(data);
    elements.container.appendChild(el);
    observeChapter(el);

    if (url === state.currentUrl) {
      const savedProgress = localStorage.getItem("readingProgress");

      if (savedProgress) {
        setTimeout(() => {
          window.scrollTo({
            top: el.offsetTop + parseInt(savedProgress),
            behavior: "auto",
          });
        }, 0);
      }
    }

    return true;
  } else {
    if (elements.container.children.length === 0) {
      showSettings();
    }

    return false;
  }
}

function observeChapter(el) {
  observer.observe(el);
}

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        handleChapterVisible(entry.target.dataset.url);
      }
    });
  },
  { rootMargin: "-5% 0px -95% 0px" }
);

async function handleChapterVisible(url) {
  if (state.currentUrl !== url) {
    state.currentUrl = url;
    localStorage.setItem("currentUrl", url);
    renderChapterList();
  }

  const currentIndex = state.chapterList.findIndex((c) => c.url === url);

  if (currentIndex !== -1 && currentIndex < state.chapterList.length - 1) {
    const nextUrl = state.chapterList[currentIndex + 1].url;
    loadChapter(nextUrl);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  updateFontSizeUI();

  if (state.book) {
    const success = await loadChapterList(state.book);

    if (success && state.chapterList.length > 0) {
      if (!state.currentUrl) {
        state.currentUrl = state.chapterList[0].url;
        localStorage.setItem("currentUrl", state.currentUrl);
      }

      await loadChapter(state.currentUrl);
      const currentIndex = state.chapterList.findIndex((c) => c.url === state.currentUrl);

      if (currentIndex !== -1 && currentIndex < state.chapterList.length - 1) {
        loadChapter(state.chapterList[currentIndex + 1].url);
      }

      return;
    }
  }

  showSettings();
});
let scrollTimeout = null;
window.addEventListener("scroll", () => {
  if (scrollTimeout || !state.currentUrl) {
    return;
  }

  scrollTimeout = setTimeout(() => {
    const currentChapterEl = document.querySelector(`.chapter[data-url="${CSS.escape(state.currentUrl)}"]`);

    if (currentChapterEl) {
      const relativeTop = window.scrollY - currentChapterEl.offsetTop;

      if (relativeTop >= 0) {
        localStorage.setItem("readingProgress", relativeTop);
      }
    }

    scrollTimeout = null;
  }, 1000);
});
