import { processTransactions } from './process-transactions';
import mockBankTransactions from './mock/bank-transaction';

async function testMockTransactions() {
  const customerEmail = 'kunde@example.com';
  const customerToken = 'customer-token-123';

  console.log('Prosesserer transaksjoner...\n');

  const results = await processTransactions(
    mockBankTransactions,
    customerEmail,
    customerToken
  );

  console.log('=== RESULTATER ===\n');

  const needsEmail = results.filter(r => r.shouldSendEmail);
  const subscriptions = results.filter(r => r.isSubscriptionOrRecurring);
  const sufficient = results.filter(r => r.isDescriptionSufficient);

  console.log(`Totalt: ${results.length} transaksjoner`);
  console.log(`Tilstrekkelig beskrivelse: ${sufficient.length}`);
  console.log(`Abonnementer/recurring: ${subscriptions.length}`);
  console.log(`E-post sendt: ${needsEmail.length}\n`);

  console.log('=== TRANSAKSJONER SOM FIKK E-POST ===\n');
  needsEmail.forEach(r => {
    console.log(`ID: ${r.transactionId}`);
    console.log(`Beskrivelse: ${r.description}`);
    console.log(`E-post emne: ${r.analysis.email_subject}`);
    console.log('---\n');
  });

  console.log('=== ABONNEMENTER (INGEN E-POST) ===\n');
  subscriptions.forEach(r => {
    console.log(`ID: ${r.transactionId}`);
    console.log(`Beskrivelse: ${r.description}`);
    console.log(`Grunn: ${r.analysis.reason}`);
    console.log('---\n');
  });
}

testMockTransactions().catch(console.error);
