interface GeminiMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
    };
  }>;
}

export class GeminiService {
  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async sendMessage(
    message: string, 
    conversationHistory: GeminiMessage[] = [],
    petContext?: { name: string; age: number; species?: string; breed?: string }
  ): Promise<string> {
    try {
      const systemPrompt = this.buildSystemPrompt(petContext);
      const contents = [
        {
          role: 'user',
          parts: [{ text: systemPrompt }]
        },
        ...conversationHistory,
        {
          role: 'user',
          parts: [{ text: message }]
        }
      ];

      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data: GeminiResponse = await response.json();
      
      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No response from Gemini API');
      }

      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      throw new Error('Failed to get response from Dr. Purr. Please try again.');
    }
  }

  private buildSystemPrompt(petContext?: {
  name: string;
  age: number;
  species?: string;
  breed?: string;
  vaccines?: { name: string; date: string; nextDue: string; id?: string }[];
  records?: { title: string; description: string; date: string; id?: string }[];
}): string {
  let prompt = `You are Dr. Purr, a friendly and knowledgeable AI veterinary assistant. You provide helpful advice about pet health and well-being, but you always remind users that you're not a replacement for professional veterinary care.

Your personality:
- Warm, caring, and professional
- Use simple, easy-to-understand language
- Be encouraging and supportive
- Show empathy for pet owners' concerns

Important guidelines:
- Always recommend seeing a real veterinarian for serious symptoms or emergencies
- Never diagnose specific medical conditions
- Provide general health advice and educational information
- Ask clarifying questions when needed
- Be concise but thorough in your responses.`;

  if (petContext) {
    // Full raw dump for inspection / debugging
    prompt += `\n\nYou are currently helping with the following pet context:\n\n${JSON.stringify(petContext, null, 2)}\n\nUse this information to provide more personalized advice.`;
  }

  return prompt;
}

}