import { fetchCatacloudData } from "./catacloud";

export async function generateEmail(token: string): Promise<string> {
  // fetch bank transaction from Catacloud API
  const bankTransactions = await fetchCatacloudData(
    token,
    "2025-11-01T00:00:00.000Z",
    "2025-11-30T23:59:59.000Z"
  );
  // Generate email content using the fetched data and ai
  // const email = await generateEmail(bankTransactions)
  // return email
}
