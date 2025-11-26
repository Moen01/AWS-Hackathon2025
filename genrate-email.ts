import { fetchCatacloudData } from "./catacloud";

export async function generateEmail(token: string): Promise<string> {
  // fetch bank transaction from Catacloud API
  const bankTransactions = await fetchCatacloudData(token);
  //
  // Generate email content using the fetched data and ai
  // const email = await generateEmail(bankTransactions)
  // return email
}
