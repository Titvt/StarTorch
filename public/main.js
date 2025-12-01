async function getData(book, index) {
  try {
    const url = `http://www.shengxuxu.net/${book}/read_${index}.html`;
    const response = await fetch(`/fetch?url=${encodeURIComponent(url)}`);

    if (response.ok) {
      const html = new DOMParser().parseFromString(
        await response.text(),
        "text/html"
      );
      const title = html.querySelector("h1 a").textContent.trim();
      const div = html.getElementById("chaptercontent");
      div.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
      let lines = div.textContent.split("\n");
      lines = lines.map((line) => line.trim());
      lines = lines.filter((line) => line.length > 0);
      const content = "　　" + lines.join("\n　　");
      const next = `/?book=${book}&index=${parseInt(index) + 1}`;
      return {
        title: title,
        content: content,
        next: next,
      };
    }
  } catch {
    // Error
  }

  return null;
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const book = params.get("book");
    const index = params.get("index");
    const main = document.getElementById("main");
    const title = document.getElementById("title");
    const content = document.getElementById("content");
    const next = document.getElementById("next");
    const currentCache = localStorage.getItem("currentCache");
    const currentData = currentCache ? JSON.parse(currentCache) : null;
    const nextCache = localStorage.getItem("nextCache");
    const nextData = nextCache ? JSON.parse(nextCache) : null;
    let data = null;

    if (
      currentData &&
      currentData.book === book &&
      currentData.index === index
    ) {
      data = currentData.data;
    }

    if (
      !data &&
      nextData &&
      nextData.book === book &&
      nextData.index === index
    ) {
      data = nextData.data;
      localStorage.setItem(
        "currentCache",
        JSON.stringify({
          book: book,
          index: index,
          data: data,
        })
      );
    }

    if (!data) {
      data = await getData(book, index);
      localStorage.setItem(
        "currentCache",
        JSON.stringify({
          book: book,
          index: index,
          data: data,
        })
      );
    }

    document.title = data.title;
    title.textContent = data.title;
    content.textContent = data.content;
    next.onclick = () => {
      window.location.href = data.next;
    };
    main.hidden = false;
    const nextUrl = new URL(data.next, window.location.href);
    const nextBook = nextUrl.searchParams.get("book");
    const nextIndex = nextUrl.searchParams.get("index");

    if (
      !nextData ||
      nextData.book !== nextBook ||
      nextData.index !== nextIndex
    ) {
      localStorage.setItem(
        "nextCache",
        JSON.stringify({
          book: nextBook,
          index: nextIndex,
          data: await getData(nextBook, nextIndex),
        })
      );
    }

    return;
  } catch {
    // Error
  }

  localStorage.removeItem("currentCache");
  localStorage.removeItem("nextCache");
});
