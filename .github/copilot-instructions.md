# AWS Hackathon 2025 – Automated Bank Attestation

## Overview

This project is a prototype for an **automated attestation process within the bank statement module** of an accounting system. The focus is on helping accountants and small businesses handle **unmatched bank transactions** more efficiently and in a structured way. [oai_citation:0‡Hackatlon2025AWS.docx](sediment://file_00000000604871f48512707bd9beb1ad)

> Note: `transactionDate` is treated as the same as `bookingDate` in this prototype.

---

## Problem Description

When bank transactions are imported into the accounting system, many lines do **not** automatically match existing vouchers or documents. Today, these require manual work:

- Identify what the payment actually is (expense, income, salary, tax, etc.)
- Request missing documentation (receipts/invoices) from the customer
- Document the justification in the system for audit and compliance

This is time-consuming and error-prone.

---

## Goal

The goal of this project is to **automate as much as possible** of the attestation process:

1. **Import bank transaction data** from the bank.
2. **Attempt to match** transactions with existing vouchers in the accounting system.
3. For **unmatched transactions**:
   - Trigger an **email** to the customer asking for details and documentation (receipt).
   - Allow the customer to provide this information back to the accountant.
   - Let the accountant store this information in the system and **mark the transaction as attested/locked**.

---

## Data Model – Bank Data (Imported)

### Conceptual Schema

```ts
{
  id: int!,
  description: String,
  bookingDate: Date,
  amount: Int,
  Currency: String,
  CurrencyAmount: Int,
  ExcehangeRate: Double,
  bankTransactionLock: Int  ,
  accountantType: Boolean (credit or debit)
}
```
