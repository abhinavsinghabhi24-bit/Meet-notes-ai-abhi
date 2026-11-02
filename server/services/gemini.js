const { GoogleGenerativeAI } = require('@google/generative-ai');

const SYSTEM_PROMPT = `You are an expert AI meeting analyst. Your task is to analyze meeting transcripts and extract structured information.

IMPORTANT RULES:
1. Only extract information that is EXPLICITLY mentioned in the transcript.
2. NEVER hallucinate or invent names, deadlines, tasks, or any other details.
3. If owner is not mentioned for a task, use "Not specified".
4. If deadline is not mentioned for a task, use "Not specified".
5. Keep the summary concise and factual.
6. Extract ALL discussion points, even brief ones.
7. Extract ALL action items, even if incomplete.

You MUST respond with a valid JSON object in EXACTLY this format - no markdown, no code blocks, just raw JSON:

{
  "summary": "A concise 2-3 paragraph summary covering the meeting purpose, key decisions made, and overall outcome",
  "discussion_points": [
    "First important discussion point or topic",
    "Second important discussion point or topic"
  ],
  "action_items": [
    {
      "task": "Clear description of the task to be done",
      "owner": "Person's name or 'Not specified'",
      "deadline": "Deadline mentioned or 'Not specified'",
      "status": "Pending"
    }
  ]
}

Ensure the JSON is valid and parseable. Do not include any text before or after the JSON.`;

/**
 * Analyzes a meeting transcript using Google Gemini AI
 * @param {string} transcript - The raw meeting transcript text
 * @param {string} title - The meeting title for context
 * @returns {Promise<Object>} - Parsed AI analysis results
 */
async function analyzeTranscript(transcript, title = '') {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY is not configured. Please add your API key to server/.env');
  }

  // Lazy-initialize Gemini client so it reads the key at call time
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const preferredModel = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  const candidateModels = [preferredModel, 'gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];
  const uniqueModels = [...new Set(candidateModels)];

  const userPrompt = `Please analyze the following meeting transcript${title ? ` titled "${title}"` : ''} and extract structured information:

TRANSCRIPT:
${transcript}

Remember to respond with ONLY valid JSON, no markdown or code blocks.`;

  const fullPrompt = `${SYSTEM_PROMPT}\n\n${userPrompt}`;

  let retries = 3;
  let lastError;

  for (const modelName of uniqueModels) {
    const model = genAI.getGenerativeModel({ model: modelName });
    try {
      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      const text = response.text();

      // Clean the response - remove potential markdown code blocks
      let cleanedText = text.trim();
      
      // Remove ```json ... ``` or ``` ... ``` wrappers if present
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.slice(7);
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.slice(3);
      }
      if (cleanedText.endsWith('```')) {
        cleanedText = cleanedText.slice(0, -3);
      }
      cleanedText = cleanedText.trim();

      // Parse and validate JSON
      let parsed;
      try {
        parsed = JSON.parse(cleanedText);
      } catch (parseError) {
        // Try to extract JSON from the text if it's embedded
        const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('AI returned invalid JSON. Raw response: ' + cleanedText.substring(0, 200));
        }
      }

      // Validate required fields
      if (!parsed.summary || typeof parsed.summary !== 'string') {
        throw new Error('AI response missing required "summary" field');
      }
      if (!Array.isArray(parsed.discussion_points)) {
        parsed.discussion_points = [];
      }
      if (!Array.isArray(parsed.action_items)) {
        parsed.action_items = [];
      }

      // Normalize action items
      parsed.action_items = parsed.action_items.map(item => ({
        task: item.task || 'Unspecified task',
        owner: item.owner || 'Not specified',
        deadline: item.deadline || 'Not specified',
        status: item.status || 'Pending'
      }));

      return parsed;

    } catch (error) {
      lastError = error;
      retries--;
      
      // Check for rate limit errors
      if (error.message && (error.message.includes('429') || error.message.includes('quota') || error.message.includes('rate'))) {
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
        throw new Error('Gemini API rate limit exceeded. Please wait a moment and try again.');
      }
      
      // Check for API key errors
      if (error.message && (error.message.includes('API_KEY') || error.message.includes('401') || error.message.includes('403'))) {
        throw new Error('Invalid Gemini API key. Please check your GEMINI_API_KEY in server/.env');
      }
      
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  throw lastError || new Error('Failed to analyze transcript after multiple attempts');
}

module.exports = { analyzeTranscript };
