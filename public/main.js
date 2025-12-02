const state = {
  book: localStorage.getItem("book"),
  index: parseInt(localStorage.getItem("index")) || 0,
  loadingIndices: new Set(),
};

const elements = {
  container: document.getElementById("chapters-container"),
  settingsContainer: document.getElementById("settings-container"),
  settingsBtn: document.getElementById("settings-btn"),
  settingsPanel: document.getElementById("settings-panel"),
  bookInput: document.getElementById("book-input"),
  indexInput: document.getElementById("index-input"),
  confirmBtn: document.getElementById("confirm-btn"),
};

function showSettings() {
  elements.settingsPanel.hidden = false;
  elements.settingsContainer.classList.add("expanded");
  elements.bookInput.value = state.book || "";
  elements.indexInput.value = state.index || "";
}

function hideSettings() {
  elements.settingsContainer.classList.remove("expanded");
  setTimeout(() => {
    if (!elements.settingsContainer.classList.contains("expanded")) {
      elements.settingsPanel.hidden = true;
    }
  }, 300);
}

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
});

elements.confirmBtn.onclick = async () => {
  const book = elements.bookInput.value.trim();
  const index = elements.indexInput.value.trim();

  if (book && index) {
    state.book = book;
    state.index = parseInt(index);
    localStorage.setItem("book", state.book);
    localStorage.setItem("index", state.index);
    elements.container.innerHTML = "";
    hideSettings();

    if (await loadChapter(state.index)) {
      loadChapter(state.index + 1);
    }
  }
};

async function getData(book, index) {
  try {
    const url = `http://www.shengxuxu.net/${book}/read_${index}.html`;
    const response = await fetch(`/fetch?url=${encodeURIComponent(url)}`);

    if (response.ok) {
      const html = new DOMParser().parseFromString(await response.text(), "text/html");
      const title = html.querySelector("h1 a").textContent.trim();
      const div = html.getElementById("chaptercontent");
      div.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
      let lines = div.textContent.split("\n");
      lines = lines.map((line) => line.trim());
      lines = lines.filter((line) => line.length > 0);
      const content = "　　" + lines.join("\n　　");
      return {
        title: title,
        content: content,
        book: book,
        index: index,
      };
    }
  } catch {
    // Error
  }

  return null;
}

function createChapterElement(data) {
  const article = document.createElement("article");
  article.className = "chapter";
  article.dataset.index = data.index;
  article.dataset.book = data.book;
  const h1 = document.createElement("h1");
  h1.textContent = data.title;
  const div = document.createElement("div");
  div.className = "content";
  div.textContent = data.content;
  article.appendChild(h1);
  article.appendChild(div);
  return article;
}

async function loadChapter(index) {
  if (state.loadingIndices.has(index)) {
    return false;
  }

  if (document.querySelector(`.chapter[data-index="${index}"]`)) {
    return false;
  }

  state.loadingIndices.add(index);
  const data = await getData(state.book, index);
  state.loadingIndices.delete(index);

  if (data) {
    if (document.querySelector(`.chapter[data-index="${index}"]`)) {
      return true;
    }

    const el = createChapterElement(data);
    elements.container.appendChild(el);
    observeChapter(el);
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
        handleChapterVisible(parseInt(entry.target.dataset.index));
      }
    });
  },
  { rootMargin: "-5% 0px -95% 0px" }
);

async function handleChapterVisible(index) {
  if (state.index !== index) {
    state.index = index;
    localStorage.setItem("index", index);
  }

  loadChapter(index + 1);
  const oldChapter = document.querySelector(`.chapter[data-index="${index - 2}"]`);

  if (oldChapter) {
    observer.unobserve(oldChapter);
    oldChapter.remove();
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  if (state.book && state.index && (await loadChapter(state.index))) {
    await loadChapter(state.index + 1);
    return;
  }

  showSettings();
});
