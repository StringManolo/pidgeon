export interface User {
  alias: string;
  pubKey: string;
  inbox: Message[];
}

export interface Message {
  sender: string;
  content: string;
  timestamp: number;
}

