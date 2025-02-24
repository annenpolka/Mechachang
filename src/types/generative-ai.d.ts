declare module '@google/generative-ai' {
  export class GoogleGenerativeAI {
    constructor(apiKey: string);
    getGenerativeModel(options: GenerativeModelOptions): GenerativeModel;
  }

  export interface GenerativeModelOptions {
    model: string;
    safetySettings?: SafetySetting[];
  }

  export interface SafetySetting {
    category: HarmCategory;
    threshold: HarmBlockThreshold;
  }

  export enum HarmCategory {
    HARM_CATEGORY_UNSPECIFIED = 'HARM_CATEGORY_UNSPECIFIED',
    HARM_CATEGORY_HATE_SPEECH = 'HARM_CATEGORY_HATE_SPEECH',
    HARM_CATEGORY_SEXUALLY_EXPLICIT = 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
    HARM_CATEGORY_HARASSMENT = 'HARM_CATEGORY_HARASSMENT',
    HARM_CATEGORY_DANGEROUS_CONTENT = 'HARM_CATEGORY_DANGEROUS_CONTENT'
  }

  export enum HarmBlockThreshold {
    HARM_BLOCK_THRESHOLD_UNSPECIFIED = 'HARM_BLOCK_THRESHOLD_UNSPECIFIED',
    BLOCK_LOW_AND_ABOVE = 'BLOCK_LOW_AND_ABOVE',
    BLOCK_MEDIUM_AND_ABOVE = 'BLOCK_MEDIUM_AND_ABOVE',
    BLOCK_ONLY_HIGH = 'BLOCK_ONLY_HIGH',
    BLOCK_NONE = 'BLOCK_NONE'
  }

  export interface GenerativeModel {
    generateContent(prompt: string | ContentPart[]): Promise<GenerateContentResult>;
    startChat(options?: ChatOptions): ChatSession;
  }

  export interface ContentPart {
    text?: string;
    inlineData?: {
      mimeType: string;
      data: string;
    };
  }

  export interface ChatOptions {
    history?: ChatTurn[];
    generationConfig?: GenerationConfig;
  }

  export interface ChatTurn {
    role: 'user' | 'model';
    parts: ContentPart[];
  }

  export interface ChatSession {
    sendMessage(message: string | ContentPart[]): Promise<GenerateContentResult>;
  }

  export interface GenerationConfig {
    temperature?: number;
    topK?: number;
    topP?: number;
    maxOutputTokens?: number;
    stopSequences?: string[];
  }

  export interface GenerateContentResult {
    response: {
      text(): string;
      promptFeedback?: {
        blockReason?: string;
        safetyRatings?: SafetyRating[];
      };
    };
  }

  export interface SafetyRating {
    category: HarmCategory;
    probability: string;
  }
}