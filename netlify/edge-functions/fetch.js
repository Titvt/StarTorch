const SITES = ["http://www.shengxuxu.net/"];

export default async (request) => {
  try {
    const url = new URL(request.url).searchParams.get("url");

    if (SITES.some((site) => url.startsWith(site))) {
      const response = await fetch(url);

      if (response.ok) {
        return new Response(
          new TextDecoder("utf-8").decode(await response.arrayBuffer()),
          { status: 200 }
        );
      }
    }
  } catch {
    // Error
  }

  return new Response("Error", { status: 500 });
};
