function decodeSegment(segment) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function getNovelPath(book) {
  return `/novels/${encodeURIComponent(book)}`;
}

function getChapterUrl(book, title) {
  return `${getNovelPath(book)}/${encodeURIComponent(title)}.txt`;
}

function parseLines(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

const pathSegments = location.pathname.split("/").filter(Boolean);
const state = {
  book: pathSegments.length > 0 ? decodeSegment(pathSegments.pop()) : null,
  currentUrl: localStorage.getItem("currentUrl"),
  chapterList: [],
  loadingUrls: new Set(),
};

const elements = {
  container: document.getElementById("chapters-container"),
  menuContainer: document.getElementById("menu-container"),
  menuBtn: document.getElementById("menu-btn"),
  menuPanel: document.getElementById("menu-panel"),
  chapterList: document.getElementById("chapter-list"),
  chapterListWrapper: document.getElementById("chapter-list-wrapper"),
};

elements.menuContainer.style.display = "none";

function showMenu() {
  elements.menuBtn.hidden = true;
  elements.menuPanel.hidden = false;
  elements.menuContainer.classList.add("expanded");
  renderChapterList();
  const activeItem = elements.chapterList.querySelector(".chapter-item.active");

  if (activeItem) {
    activeItem.scrollIntoView({ block: "center" });
  }
}

function hideMenu() {
  elements.menuBtn.hidden = false;
  elements.menuPanel.hidden = true;
  elements.menuContainer.classList.remove("expanded");
}

elements.menuBtn.onclick = (e) => {
  e.stopPropagation();
  showMenu();
};

elements.menuPanel.onclick = (e) => {
  e.stopPropagation();
};

document.addEventListener("click", () => {
  if (elements.menuContainer.classList.contains("expanded")) {
    hideMenu();
  }
});

async function loadChapterList(book) {
  try {
    const response = await fetch(`${getNovelPath(book)}/menu.txt`);

    if (response.ok) {
      const seen = new Map();

      state.chapterList = parseLines(await response.text()).map((title) => {
        const count = (seen.get(title) || 0) + 1;
        seen.set(title, count);
        return {
          title: title,
          url: getChapterUrl(book, count > 1 ? `${title}_${count}` : title),
        };
      });

      document.title = book || "StarTorch";
      renderChapterList();
      return true;
    }
  } catch {
    // Error
  }

  return false;
}

async function loadNovelList() {
  try {
    const response = await fetch("/novels/novels.txt");

    if (response.ok) {
      const books = parseLines(await response.text());

      if (books.length > 0) {
        renderBookList(books);
        return true;
      }
    }
  } catch {
    // Error
  }

  return false;
}

function renderBookList(books) {
  const list = document.createElement("div");
  list.id = "book-list";

  books.forEach((book) => {
    const div = document.createElement("div");
    div.className = "book-item";
    div.textContent = book;
    div.onclick = () => {
      location.assign(`/${encodeURIComponent(book)}`);
    };
    list.appendChild(div);
  });

  elements.container.appendChild(list);
}

function renderChapterList() {
  elements.chapterList.innerHTML = "";

  if (state.chapterList.length > 0) {
    elements.chapterListWrapper.style.display = "flex";
  } else {
    elements.chapterListWrapper.style.display = "none";
  }

  state.chapterList.forEach((chapter) => {
    const div = document.createElement("div");
    div.className = `chapter-item ${chapter.url === state.currentUrl ? "active" : ""}`;
    div.textContent = chapter.title;
    div.onclick = async () => {
      if (chapter.url === state.currentUrl) {
        hideMenu();
        return;
      }

      hideMenu();
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
    const response = await fetch(url);

    if (response.ok) {
      const lines = parseLines(await response.text());

      if (lines.length > 0) {
        const chapter = state.chapterList.find((c) => c.url === url);
        const fileName = url.split("/").pop().replace(/\.txt$/, "");
        return {
          title: chapter ? chapter.title : decodeSegment(fileName),
          content: "　　" + lines.join("\n　　"),
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
  if (!state.book) {
    await loadNovelList();
    return;
  }

  const success = await loadChapterList(state.book);

  if (success && state.chapterList.length > 0) {
    if (!state.currentUrl || !state.chapterList.some((c) => c.url === state.currentUrl)) {
      state.currentUrl = state.chapterList[0].url;
      localStorage.setItem("currentUrl", state.currentUrl);
      localStorage.removeItem("readingProgress");
    }

    const chapterLoaded = await loadChapter(state.currentUrl);

    if (chapterLoaded) {
      elements.menuContainer.style.display = "";
    }

    const currentIndex = state.chapterList.findIndex((c) => c.url === state.currentUrl);

    if (currentIndex !== -1 && currentIndex < state.chapterList.length - 1) {
      loadChapter(state.chapterList[currentIndex + 1].url);
    }

    return;
  }
});
