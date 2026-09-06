export default async (request) => {
  try {
    const url = new URL(request.url).searchParams.get("url");

    if (url.startsWith("https://www.pilishuwu.com/")) {
      const base = await fetch(new URL(url).origin + "/", {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36",
        },
        redirect: "follow",
      });
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36",
          Cookie: base.headers
            .getSetCookie()
            .map((cookie) => cookie.split(";")[0])
            .join("; "),
        },
        redirect: "follow",
      });

      if (response.ok) {
        return new Response(await response.text(), { status: 200 });
      }
    }
  } catch {
    // Error
  }

  return new Response("Error", { status: 500 });
};
