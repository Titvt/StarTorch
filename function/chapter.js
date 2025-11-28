const axios = require("axios");
const cheerio = require("cheerio");

exports.handler = async (event) => {
  try {
    const { book, index } = event.queryStringParameters;
    const response = await axios.get(
      `http://www.shengxuxu.net/${book}/read_${index}.html`,
      {
        responseType: "arraybuffer",
        timeout: 10000,
      }
    );
    const html = response.data.toString("utf-8");
    const $ = cheerio.load(html);
    const title = $("h1 a").text().trim();
    const div = $("#chaptercontent");
    div.find("br").replaceWith("\n");
    let lines = div.text().split("\n");
    lines = lines.map((line) => line.trim());
    lines = lines.filter((line) => line.length > 0);
    const content = "　　" + lines.join("\n　　");
    const nextIndex = parseInt(index) + 1;
    const next = `/?book=${book}&index=${nextIndex}`;
    return {
      statusCode: 200,
      body: JSON.stringify({
        title: title,
        content: content,
        next: next,
      }),
    };
  } catch {}

  return {
    statusCode: 500,
  };
};
