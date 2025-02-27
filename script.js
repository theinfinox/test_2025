// Required packages: axios, cheerio, fs
// Install them with: npm install axios cheerio

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function parseQuestions(url) {
  try {
    // Fetch the HTML content from the URL
    const { data: html } = await axios.get(url);
    // Load the HTML into Cheerio
    const $ = cheerio.load(html);
    // Get the full body text (the page seems to be text based)
    const bodyText = $('body').text();
    
    // Use a regex to split the text into question blocks.
    // Assumes each question starts with "Q.<number>"
    const questionRegex = /Q\.(\d+)([\s\S]*?)(?=Q\.(\d+)|$)/g;
    const questions = [];
    let match;
    
    while ((match = questionRegex.exec(bodyText)) !== null) {
      const qNumber = match[1].trim();
      const block = match[2];
      
      // Initialize a question object with default fields
      const question = {
         questionNumber: qNumber,
         options: [],
         questionType: null,
         questionID: null,
         status: null,
         chosenOption: null,
         answerText: null
      };
      
      // Extract fields using regular expressions
      
      // Question Type
      const qTypeMatch = block.match(/Question Type\s*:\s*(.*)/i);
      if(qTypeMatch) {
         question.questionType = qTypeMatch[1].trim();
      }
      
      // Question ID
      const qIDMatch = block.match(/Question ID\s*:\s*(.*)/i);
      if(qIDMatch) {
         question.questionID = qIDMatch[1].trim();
      }
      
      // Status
      const statusMatch = block.match(/Status\s*:\s*(.*)/i);
      if(statusMatch) {
         question.status = statusMatch[1].trim();
      }
      
      // Chosen Option (if provided)
      const chosenMatch = block.match(/Chosen Option\s*:\s*(.*)/i);
      if(chosenMatch) {
         question.chosenOption = chosenMatch[1].trim();
      }
      
      // For numeric answer types, look for a line starting with "Give n Ans wer :"
      const natMatch = block.match(/Give\s*n\s*Ans\s*wer\s*:\s*(.*)/i);
      if(natMatch) {
         question.answerText = natMatch[1].trim();
      }
      
      // Extract options:
      // First, split the block into lines and look for the "Options" section.
      const lines = block.split('\n').map(line => line.trim()).filter(line => line !== '');
      let optionsStarted = false;
      for (let line of lines) {
         if (line.toLowerCase() === "options") {
            optionsStarted = true;
            continue;
         }
         if (optionsStarted) {
            // Stop if we hit a marker for another section (like "Question Type", "Question ID", etc.)
            if (/^(Question Type|Question ID|Status|Chosen Option|Give)/i.test(line)) {
              break;
            }
            // Match option lines, e.g., "A. some text" or "A" by itself
            const optionMatch = line.match(/^([A-D])\.?\s*(.*)/);
            if(optionMatch) {
               question.options.push({
                 label: optionMatch[1],
                 text: optionMatch[2].trim()
               });
            }
         }
      }
      
      questions.push(question);
    }
    
    // Write the output to a JSON file
    fs.writeFileSync('questions.json', JSON.stringify(questions, null, 2));
    console.log('Questions JSON created successfully: questions.json');
    
  } catch (error) {
    console.error('Error fetching or processing the URL:', error);
  }
}

// Get the URL from the command-line arguments
const url = process.argv[2];
if (!url) {
  console.error('Usage: node parseQuestions.js <URL>');
  process.exit(1);
}

parseQuestions(url);
