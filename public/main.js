document.addEventListener("DOMContentLoaded", async () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const book = params.get("book");
    const index = params.get("index");
    const main = document.getElementById("main");
    const title = document.getElementById("title");
    const content = document.getElementById("content");
    const next = document.getElementById("next");
    const response = await fetch(
      `/.netlify/functions/chapter?book=${book}&index=${index}`
    );
    const data = await response.json();
    document.title = data.title;
    title.textContent = data.title;
    content.textContent = data.content;
    next.onclick = () => {
      window.location.href = data.next;
    };
    main.hidden = false;
  } catch {}
});
