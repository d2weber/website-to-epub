const { execFileSync } = require('child_process');
const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000
const { Readability } = require('@mozilla/readability');
const { JSDOM } = require("jsdom");

const article_for = async function (url) {
  try {
    let { document } = (await JSDOM.fromURL(url, {features: {
          FetchExternalResources: false,
          ProcessExternalResources: false}})).window;
    let article = new Readability(document).parse();
    return ('<h1>' + article.title + '</h1>' + article.content);
  }
  catch(e) {
    throw Error(`Error occured while processing: "${url}". Error message: "${e.message}"`)
  }
}

const prefix = "<html><head><meta charset='utf-8'><title>Reading list</title></head>";

express()
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
  .get('/epub', async (req, res) => {
    var url_list = req.query.src_url
    if (!url_list) {
      res.status(400).send("Missing src_url").end()
    }
    if (!url_list.isArray) {
      url_list = [url_list]
    }
    try {
      const stdout = execFileSync(
        'pandoc', ['-f', 'html', '-t', 'epub', '-o', '-'],
        // TODO: sanatize input
        // TODO: Fix porcessing of multiple urls in list
        {input: prefix + (await Promise.all(url_list.map(article_for))).join("")}
      );
      res.attachment('reading_list.epub');
      res.send(stdout).end();
    }
    catch(error) {
      res.status(400).send(error.message).end()
    }
  })
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))
