// pages/api/parseQuestions.js

import axios from 'axios';
import cheerio from 'cheerio';

export default async function handler(req, res) {
  // Retrieve the URL from the query parameters (e.g., ?url=...)
  const { url } = req.query;
  if (!url) {
    res.status(400).json({ error: 'URL parameter is required' });
    return;
  }

  try {
    // Fetch the HTML content from the provided URL
    const { data: html } = await axios.get(url);
    // Load the HTML into Cheerio
    const $ = cheerio.load(html);
    // Extract the entire body text
    const bodyText = $('body').text();

    // Example: Use a regex to split the text into question blocks.
    // This example assumes each question begins with "Q.<number>"
    const questionRegex = /Q\.(\d+)([\s\S]*?)(?=Q\.(\d+)|$)/g;
    const questions = [];
    let match;

    while ((match = questionRegex.exec(bodyText)) !== null) {
      const qNumber = match[1].trim();
      const block = match[2];

      // Build a question object with default fields
      const question = {
        questionNumber: qNumber,
        options: [],
        questionType: null,
        questionID: null,
        status: null,
        chosenOption: null,
        answerText: null
      };

      // Extract details using regex:
      const qTypeMatch = block.match(/Question Type\s*:\s*(.*)/i);
      if (qTypeMatch) question.questionType = qTypeMatch[1].trim();

      const qIDMatch = block.match(/Question ID\s*:\s*(.*)/i);
      if (qIDMatch) question.questionID = qIDMatch[1].trim();

      const statusMatch = block.match(/Status\s*:\s*(.*)/i);
      if (statusMatch) question.status = statusMatch[1].trim();

      const chosenMatch = block.match(/Chosen Option\s*:\s*(.*)/i);
      if (chosenMatch) question.chosenOption = chosenMatch[1].trim();

      const natMatch = block.match(/Give\s*n\s*Ans\s*wer\s*:\s*(.*)/i);
      if (natMatch) question.answerText = natMatch[1].trim();

      // Extract options:
      const lines = block.split('\n').map(line => line.trim()).filter(Boolean);
      let optionsStarted = false;
      for (const line of lines) {
        if (line.toLowerCase() === 'options') {
          optionsStarted = true;
          continue;
        }
        if (optionsStarted && /^(Question Type|Question ID|Status|Chosen Option|Give)/i.test(line)) {
          break;
        }
        const optionMatch = line.match(/^([A-D])\.?\s*(.*)/);
        if (optionMatch) {
          question.options.push({
            label: optionMatch[1],
            text: optionMatch[2].trim()
          });
        }
      }

      questions.push(question);
    }

    // Return the parsed questions as JSON
    res.status(200).json({ questions });
  } catch (error) {
    console.error('Error fetching or parsing the URL:', error);
    res.status(500).json({ error: 'Failed to fetch or parse the URL' });
  }
}
