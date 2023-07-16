export interface User {
  alias: string;
  pubKey: string;
  inbox: Message[];
  deleteKey?: string; 
}

export interface Message {
  sender: string;
  content: string;
  timestamp: number;
}

export interface RandomString {
  randomString: string;
  id: string;
}
