// Global fetch is available in Node 18+

const CATACLOUD_API_URL = "https://api.catacloud.com/graphql";

const LEDGER_QUERY = `
query getLedgerData($options: AccountReportOptions!) {
  ledgerReport(options: $options) {
    account {
      id
      name
    }
    transactions {
      id
      voucherId
      voucherNumber
      invoiceId
      invoiceNumber
      description
      transactionDate
      bankTransactionLockId
      amount
      customer {
        id
        name
      }
      supplier {
        id
        name
      }
    }
    incomingBalance
    change
    outgoingBalance
  }
}
`;

const BANK_TRANSACTIONS_QUERY = `
fragment bankTransactionFragment on BankTransaction {
  id
  transactionCode
  description
  bookingDate
  valueDate
  amount
  currencyCode
  currencyAmount
  exchangeRate
  creditorData
  debtorData
  status
  type
  createdAt
  archiveReference
  otherReference
  bankTransactionLockId
}

query getBankTransactions($options: BankTransactionOptions!) {
  bankTransactions(options: $options) {
    ...bankTransactionFragment
  }
}
`;

interface GraphQLResponse<T> {
  data: T;
  errors?: any[];
}

async function graphqlRequest<T>(
  query: string,
  variables: any,
  token: string
): Promise<T> {
  const response = await fetch(CATACLOUD_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.statusText}`);
  }

  const result = (await response.json()) as GraphQLResponse<T>;

  if (result.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
  }

  return result.data;
}

interface LedgerReportResponse {
  ledgerReport: {
    account: {
      id: number;
      name: string;
    };
    transactions: {
      id: number;
      voucherId: number;
      voucherNumber: number;
      invoiceId: number;
      invoiceNumber: number;
      description: string;
      transactionDate: string;
      bankTransactionLockId: number;
      amount: number;
      customer: {
        id: number;
        name: string;
      };
      supplier: {
        id: number;
        name: string;
      };
    }[];
    incomingBalance: number;
    change: number;
    outgoingBalance: number;
  };
}

interface BankTransactionsResponse {
  bankTransactions: {
    id: number;
    transactionCode: string;
    description: string;
    bookingDate: string;
    valueDate: string;
    amount: number;
    currencyCode: string;
    currencyAmount: number;
    exchangeRate: number;
    creditorData: string;
    debtorData: string;
    status: string;
    type: string;
    createdAt: string;
    archiveReference: string;
    otherReference: string;
    bankTransactionLockId: number;
  }[];
}

export async function fetchCatacloudData(
  token: string,
  from: string,
  to: string,
  account: number,
  bankAccountId: number
) {
  const ledgerVariables = {
    options: {
      account,
      corrections: false,
      from,
      to,
    },
  };

  const bankVariables = {
    options: {
      bankAccountId,
      from,
      to,
    },
  };

  const [ledgerData, bankTransactions] = await Promise.all([
    graphqlRequest<LedgerReportResponse>(LEDGER_QUERY, ledgerVariables, token),
    graphqlRequest<BankTransactionsResponse>(
      BANK_TRANSACTIONS_QUERY,
      bankVariables,
      token
    ),
  ]);

  return {
    ledgerData: ledgerData.ledgerReport,
    bankTransactions: bankTransactions.bankTransactions,
  };
}
