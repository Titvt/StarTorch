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
      const response = await fetch(
        `/.netlify/functions/chapter?book=${book}&index=${index}`
      );
      data = await response.json();
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
      const nextResponse = await fetch(
        `/.netlify/functions/chapter?book=${nextBook}&index=${nextIndex}`
      );
      localStorage.setItem(
        "nextCache",
        JSON.stringify({
          book: nextBook,
          index: nextIndex,
          data: await nextResponse.json(),
        })
      );
    }
  } catch {
    localStorage.removeItem("currentCache");
    localStorage.removeItem("nextCache");
  }
});
