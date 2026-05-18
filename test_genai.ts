import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({});
ai.models.generateContent({
  model: 'gemini-1.5-flash',
  contents: 'hello'
}).then(res => console.log('Without models/: ', !!res))
  .catch(err => console.error('Without models/: ', err.message));

ai.models.generateContent({
  model: 'models/gemini-1.5-flash',
  contents: 'hello'
}).then(res => console.log('With models/: ', !!res))
  .catch(err => console.error('With models/: ', err.message));
