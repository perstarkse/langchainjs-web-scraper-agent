"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const puppeteer_1 = __importDefault(require("puppeteer"));
const jsdom_1 = require("jsdom");
const agents_1 = require("langchain/agents");
const openai_1 = require("langchain/chat_models/openai");
const tools_1 = require("langchain/tools");
const parseArticle = (rawHTML) => {
    const { window } = new jsdom_1.JSDOM(rawHTML);
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
const scrapeMainPage = (query) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('Searching na.se for ', query);
    const browser = yield puppeteer_1.default.launch({ headless: "new", executablePath: 'chromium' });
    const page = yield browser.newPage();
    yield page.goto(`https://na.se/sok?query=${query}`, { waitUntil: 'networkidle2' });
    const articles = yield page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('article.teaser'));
        return elements.map(element => element.innerHTML);
    });
    const parsedArticles = articles.map(parseArticle);
    console.log(`Found ${parsedArticles.length} articles.`);
    yield browser.close();
    return JSON.stringify(parsedArticles);
});
const scrapePage = (link) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('Entering ', link, ' to get additional details');
    try {
        const browser = yield puppeteer_1.default.launch({ headless: 'new', executablePath: 'chromium' });
        const page = yield browser.newPage();
        yield page.goto(link, { waitUntil: 'networkidle2' });
        const articleText = yield page.evaluate(() => {
            document.querySelectorAll('.paywall, .article__footer, lcl-newsletter-widget').forEach(el => el.remove());
            const articleDiv = document.querySelector('.article__inner');
            return articleDiv ? articleDiv.textContent : '';
        });
        yield browser.close();
        if (articleText)
            return articleText.toString();
    }
    catch (error) {
        return `Error occurred while scraping: ${error}`;
    }
});
const tellHuman = (message) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(message);
});
const tools = [
    new tools_1.DynamicTool({
        name: "getHeadlines",
        description: "Returns news headlines with links. Should be parsed and used for the next step, takes an input which is the search query. Remember this is a swedish site, the query should be written in swedish.",
        func: scrapeMainPage
    }),
    new tools_1.DynamicTool({
        name: "getDetails",
        description: "Takes URL from getHeadlines. Returns detailed article.",
        func: scrapePage
    }),
    new tools_1.DynamicTool({
        name: "notify",
        description: "Sends a message if there's an issue.",
        func: tellHuman
    })
];
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const chat = new openai_1.ChatOpenAI({ temperature: 0 });
        const query = process.argv[2] || 'default query';
        let verboseBool = false;
        const verboseIndex = process.argv.indexOf('--verbose');
        if (verboseIndex !== -1 && process.argv[verboseIndex + 1]) {
            verboseBool = process.argv[verboseIndex + 1] === 'true';
        }
        const executor = yield (0, agents_1.initializeAgentExecutorWithOptions)(tools, chat, {
            agentType: "openai-functions",
            verbose: verboseBool,
        });
        const result = yield executor.run(`Are there any news about ${query} in örebro? Get the specific details from three articles and present it to me in english`);
        console.log(result);
    });
}
main();
