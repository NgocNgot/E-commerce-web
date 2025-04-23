import { User } from "@/../types/users";

const API_URL = "http://localhost:1337/api";

export async function fetchUsers(): Promise<User[]> {
  const response = await fetch(`${API_URL}/users`);
  if (!response.ok) {
    throw new Error("Failed to fetch users");
  }
  const data = await response.json();
  return data;
}

export async function fetchUserById(id: number): Promise<User | undefined> {
  const response = await fetch(`${API_URL}/users/${id}`);
  if (!response.ok) {
    console.error(`Failed to fetch user with ID: ${id}`);
    return undefined;
  }
  const data = await response.json();
  return data;
}
