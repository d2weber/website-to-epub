import { execFileSync } from 'child_process';
import type { Request, Response, RequestHandler } from 'express';
import express from 'express';
import path from 'path';
const PORT = process.env.PORT || 5000
import { Readability } from '@mozilla/readability';
import { JSDOM } from "jsdom";

const article_for = async function (url: string) {
  try {
    const { document } = (await JSDOM.fromURL(url)).window;
    const article = new Readability(document).parse();
    if (!article) throw Error("Problem with `readability`")
    return ('<h1>' + article.title + '</h1>' + article.content);
  }
  catch(e: unknown) {
    if ( e instanceof Error )
      throw Error(`Error occurred while processing: "${url}". Error message: "${e.message}"`)
    else
      throw Error(`Unknown problem occurred while processing: "${url}".`);
  }
}

async function epubHandler(req: Request, res: Response) {
  let url_list = req.query.src_url;
  if (typeof url_list !== 'string') {
    res.render('pages/index', {error: Error("Invalid URL provided.")})
    return
  }
  // if (!Array.isArray(url_list)) {
  url_list = [url_list]
  // }
  try {
    const stdout = execFileSync(
      'pandoc', ['-f', 'html', '-t', 'epub', '--template', './default.epub3', '--abbreviations', './abbreviations', '--css', './epub.css', '-o', '-'],
      // TODO: sanative input
      // TODO: Fix processing of multiple urls in list
      {input: prefix + (await Promise.all(url_list.map(article_for))).join("")}
    );
    res.attachment('reading_list.epub');
    res.send(stdout).end()
  }
  catch(error) {
    res.render('pages/index', {error: error})
  }
}

const prefix = "<html><head><meta charset='utf-8'><title>Reading list</title></head>";

express()
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (_: Request, res: Response) => res.render('pages/index'))
  .get('/epub', epubHandler as RequestHandler)
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))
