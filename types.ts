export interface Scene {
  caption: string;
  visualPrompt: string;
}

export interface ScriptureResponse {
  reference: string;
  verseText: string;
  explanation: string;
  scenes: Scene[];
}

export interface AudioBlob {
  data: string;
  mimeType: string;
}

export enum AppState {
  IDLE = 'IDLE',
  LOADING_TEXT = 'LOADING_TEXT',
  READY = 'READY',
  ERROR = 'ERROR',
}

export interface StickmanImage {
  base64: string;
  prompt: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
}