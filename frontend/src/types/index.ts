export interface User {
  _id: string;
  name: string;
  email: string;
  token?: string;
}

export interface Event {
  _id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  category: string;
  creator: User;
  attendees: User[];
  maxAttendees: number;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
}