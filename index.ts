import { execFileSync } from "child_process";
import type { Request, Response, RequestHandler } from "express";
import express from "express";
import path from "path";
const PORT = process.env.PORT || 5000;
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
const Epub = require("epub-gen");

const article_for = async function (url: string) {
  try {
    const { document } = (await JSDOM.fromURL(url)).window;
    const article = new Readability(document).parse();
    if (!article) throw Error("Problem with `readability`");
    return article;
  } catch (e: unknown) {
    if (e instanceof Error)
      throw Error(
        `Error occurred while processing: "${url}". Error message: "${e.message}"`
      );
    else throw Error(`Unknown problem occurred while processing: "${url}".`);
  }
};

async function epubHandler(req: Request, res: Response) {
  const url = req.query.src_url;
  if (typeof url !== "string") {
    res.render("pages/index", { error: Error("Invalid URL provided.") });
    return;
  }
  // TODO: Fix processing of multiple urls in list
  // if (!Array.isArray(url_list)) {
  // url_list = [url_list];
  // }
  try {
    const article = await article_for(url);

    // todo: avoid race conditions on file
    await new Epub({
      title: "hello",
      content: [{ title: article.title, data: article.content }],
      output: filename,
    }).promise
      .then(
        () => console.log("Ebook Generated Successfully!"),
        (err: any) => {
          console.error("Failed to generate Ebook because of ", err);
        }
      )
      .then(() =>
        res.sendFile(filename, (err) => {
          if (err != undefined) throw err;
        })
      );
  } catch (error) {
    res.render("pages/index", { error: error });
  }
}

const filename = "/tmp/reading_list.epub";

express()
  .use(express.static(path.join(__dirname, "public")))
  .set("views", path.join(__dirname, "views"))
  .set("view engine", "ejs")
  .get("/", (_: Request, res: Response) => res.render("pages/index"))
  .get("/epub", epubHandler as RequestHandler)
  .listen(PORT, () => console.log(`Listening on ${PORT}`));
