const state = {
  book: location.pathname.split("/").filter(Boolean).pop() || null,
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
    const url = `https://www.pilishuwu.com/1/${book}/menu/1.html`;
    const response = await fetch(`/fetch?url=${encodeURIComponent(url)}`);

    if (response.ok) {
      const htmlString = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlString, "text/html");
      const links = Array.from(doc.querySelectorAll("ol.works-chapter-list span.works-chapter-item a"));
      state.chapterList = links.map((link) => {
        const href = link.getAttribute("href");
        const fullUrl = href.startsWith("http") ? href : `https://www.pilishuwu.com${href}`;
        return {
          title: link.getAttribute("title") || link.textContent.trim(),
          url: fullUrl,
        };
      });

      const metaTitle = doc.querySelector("title");

      if (metaTitle) {
        document.title = metaTitle.textContent.split("_")[0].replace(/章节目录$/, "").trim() || "StarTorch";
      }

      renderChapterList();
      return true;
    }
  } catch {
    // Error
  }

  return false;
}

async function loadRanking() {
  try {
    const url = `https://www.pilishuwu.com/top/list/1/4/1.html`;
    const response = await fetch(`/fetch?url=${encodeURIComponent(url)}`);

    if (response.ok) {
      const html = new DOMParser().parseFromString(await response.text(), "text/html");
      const tabcon = html.querySelector(".rank-tabcon");
      const links = tabcon
        ? Array.from(tabcon.querySelectorAll("ul.rank-ul li a[href*='/info.html']")).slice(0, 100)
        : [];
      const books = links
        .map((link) => {
          const match = (link.getAttribute("href") || "").match(/\/(\d+)\/info\.html/);
          const title = link.getAttribute("title") || link.textContent.trim();
          return match ? { id: match[1], title } : null;
        })
        .filter((item) => item !== null);

      if (books.length > 0) {
        renderBookList(books);
      }
    }
  } catch {
    // Error
  }
}

function renderBookList(books) {
  const list = document.createElement("div");
  list.id = "book-list";

  books.forEach((book) => {
    const div = document.createElement("div");
    div.className = "book-item";
    div.textContent = book.title;
    div.onclick = () => {
      location.assign(`/${book.id}`);
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
    const response = await fetch(`/fetch?url=${encodeURIComponent(url)}`);

    if (response.ok) {
      const html = new DOMParser().parseFromString(await response.text(), "text/html");
      const titleEl = html.querySelector("h3.j_chapterName");
      const title = titleEl ? titleEl.textContent.trim() : "";
      const div = html.querySelector(".read-content.j_readContent");

      if (div) {
        let lines = Array.from(div.querySelectorAll("p"))
          .map((p) => p.textContent.trim())
          .filter((line) => line.length > 0);
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
    await loadRanking();
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
