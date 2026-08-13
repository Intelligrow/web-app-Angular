/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export const AGENT_COLLECTION_TRANSACTION_TYPES = [
  { value: 'LOAN_REPAYMENT', label: 'labels.inputs.Loan Repayment' },
  { value: 'SAVINGS_DEPOSIT', label: 'labels.inputs.Savings Deposit' }
];

export const AGENT_COLLECTION_TRANSACTION_STATUS_OPTIONS = [
  'all',
  'PENDING',
  'SETTLED',
  'REVERSED',
  'DISPUTED'
];

export const AGENT_SETTLEMENT_STATUS_OPTIONS = [
  'all',
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'REJECTED',
  'CANCELLED'
];

export const AGENT_STATUS_OPTIONS = [
  'all',
  'active',
  'inactive'
];

export interface AgentCollectionTransactionLimit {
  transactionType: string;
  maximumSingleAmount: number;
  maximumDailyAmount: number;
  enabled: boolean;
}

export interface AgentCollectionOption {
  id?: number | string;
  value?: string;
  code?: string;
  name?: string;
  displayName?: string;
}
