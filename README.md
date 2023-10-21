# langchainjs-web-scraper-agent

A CLI-based web scraping tool using Langchain, OpenAI, Puppeteer, and JSDOM. Fetch and parse information from the web. This program is written for the purpose of demonstrating a simple example of how one could use a LLM to call functions and return a response to the user with retrieval.

## Prerequisites

- An OpenAI API key must be available in the environment as `OPENAI_API_KEY`.

## Installation

```bash
npm install
```

## Before usage

- Compile it 
```bash
npx tsc
```
  
## Usage

Run the tool with a query to search for articles:

```bash
node index.js 'your query here'
```

### Tools

- **getHeadlines**: Retrieves news headlines based on a query. 
- **getDetails**: Takes a URL from `getHeadlines` and returns detailed articles.
- **notify**: Sends a message if there's an issue. Can be viewed as a fallback/debug function.

## License
MIT
