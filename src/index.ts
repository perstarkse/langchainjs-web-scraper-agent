import puppeteer from 'puppeteer';
import { JSDOM } from 'jsdom';
import { initializeAgentExecutorWithOptions } from "langchain/agents";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { DynamicTool } from 'langchain/tools';

const parseArticle = (rawHTML: any) => {
  const { window } = new JSDOM(rawHTML);
  const { document } = window;

  const titleElement = document.querySelector('.teaser__search-title a');
  const descriptionElement = document.querySelector('.teaser__standfirst');
  const linkElement = document.querySelector('.block-link-overlay');

  return {
    title: titleElement ? titleElement.textContent : '',
    description: descriptionElement ? descriptionElement.textContent : '',
    link: linkElement ? `https://na.se${linkElement.getAttribute('href')}` : ''
  };
};

const scrapeMainPage = async (query: string): Promise<any> => {
  console.log('Searching na.se for ', query)
  const browser = await puppeteer.launch({ headless: "new", executablePath: 'chromium' });
  const page = await browser.newPage();
  await page.goto(`https://na.se/sok?query=${query}`, { waitUntil: 'networkidle2' });

  const articles = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('article.teaser'));
    return elements.map(element => element.innerHTML);
  });

  const parsedArticles = articles.map(parseArticle);

  console.log(`Found ${parsedArticles.length} articles.`);

  await browser.close();

  return JSON.stringify(parsedArticles)
};

const scrapePage = async (link: string): Promise<any> => {
  console.log('Entering ', link, ' to get additional details')
  try {
    const browser = await puppeteer.launch({ headless: 'new', executablePath: 'chromium' });
    const page = await browser.newPage();
    await page.goto(link, { waitUntil: 'networkidle2' });

    const articleText = await page.evaluate(() => {
      document.querySelectorAll('.paywall, .article__footer, lcl-newsletter-widget').forEach(el => el.remove());
      const articleDiv = document.querySelector('.article__inner');
      return articleDiv ? articleDiv.textContent : '';
    });

    await browser.close();

    if (articleText)
      return articleText.toString();
  } catch (error) {
    return `Error occurred while scraping: ${error}`;
  }
};

const tellHuman = async (message: string): Promise<any> => {
  console.log(message)
}

const tools = [
  new DynamicTool({
    name: "getHeadlines",
    description: "Returns news headlines with links. Should be parsed and used for the next step, takes an input which is the search query. Remember this is a swedish site, the query should be written in swedish.",
    func: scrapeMainPage
  }),
  new DynamicTool({
    name: "getDetails",
    description: "Takes URL from getHeadlines. Returns detailed article.",
    func: scrapePage
  }),
  new DynamicTool({
    name: "notify",
    description: "Sends a message if there's an issue.",
    func: tellHuman
  })
];

async function main() {
  const chat = new ChatOpenAI({ temperature: 0 });

  const query = process.argv[2] || 'default query';
  let verboseBool = false;

  const verboseIndex = process.argv.indexOf('--verbose');
  if (verboseIndex !== -1 && process.argv[verboseIndex + 1]) {
    verboseBool = process.argv[verboseIndex + 1] === 'true';
  }

  const executor = await initializeAgentExecutorWithOptions(tools, chat, {
    agentType: "openai-functions",
    verbose: verboseBool,
  });

  const result = await executor.run(`Are there any news about ${query} in örebro? Get the specific details from three articles and present it to me in english`);

  console.log(result)
}

main()