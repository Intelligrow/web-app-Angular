/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

/** rxjs Imports */
import { of, take } from 'rxjs';
import { catchError } from 'rxjs/operators';

/** Angular Material Imports */
import { MatTableDataSource } from '@angular/material/table';

/** Custom Imports */
import { OrganizationService } from '../../organization.service';
import { AGENT_COLLECTION_COMPONENT_IMPORTS } from '../agent-collections-imports';
import { AgentCollectionOption } from '../agent-collections.models';

@Component({
  selector: 'mifosx-agent-settlement-form',
  templateUrl: './agent-settlement-form.component.html',
  styleUrl: './agent-settlement-form.component.scss',
  imports: AGENT_COLLECTION_COMPONENT_IMPORTS,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AgentSettlementFormComponent implements OnInit {
  private organizationService = inject(OrganizationService);
  private formBuilder = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  private changeDetectorRef = inject(ChangeDetectorRef);

  agentOptions: AgentCollectionOption[] = [];
  selectedTransactionIds = new Set<number>();
  selectedTransactions: any[] = [];
  displayedColumns = [
    'id',
    'transactionDate',
    'transactionType',
    'amount',
    'currencyCode',
    'status',
    'settlementId'
  ];
  columnsWithSelect = [
    'select',
    ...this.displayedColumns
  ];
  dataSource = new MatTableDataSource<any>([]);
  settlementForm = this.formBuilder.group({
    locale: ['en'],
    dateFormat: ['yyyy-MM-dd'],
    agentId: [
      '',
      Validators.required
    ],
    settlementDate: [
      '',
      Validators.required
    ],
    submittedAmount: [
      '',
      [
        Validators.required,
        Validators.min(0.01)
      ]
    ],
    referenceNumber: [''],
    notes: ['']
  });

  ngOnInit(): void {
    this.loadTemplate();
    const agentId = this.route.snapshot.queryParamMap.get('agentId');
    if (agentId) {
      this.settlementForm.patchValue({ agentId });
      this.loadPendingTransactions();
    }
  }

  get expectedAmount(): number {
    return this.selectedTransactions.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  }

  get amountDifference(): number {
    return Number(this.settlementForm.value.submittedAmount || 0) - this.expectedAmount;
  }

  get selectableTransactions(): any[] {
    return this.dataSource.data.filter((transaction) => this.isSelectable(transaction));
  }

  get allSelectableTransactionsSelected(): boolean {
    return (
      this.selectableTransactions.length > 0 &&
      this.selectableTransactions.every((transaction) => this.selectedTransactionIds.has(transaction.id))
    );
  }

  get someSelectableTransactionsSelected(): boolean {
    return (
      this.selectableTransactions.some((transaction) => this.selectedTransactionIds.has(transaction.id)) &&
      !this.allSelectableTransactionsSelected
    );
  }

  loadPendingTransactions(): void {
    this.organizationService
      .getAgentCollectionTransactions({
        agentId: this.settlementForm.value.agentId,
        status: 'PENDING'
      })
      .pipe(take(1))
      .subscribe((response) => {
        this.dataSource.data = response?.pageItems || response?.data || response || [];
        this.selectedTransactionIds.clear();
        this.selectedTransactions = [];
        this.updateSubmittedAmount();
        this.changeDetectorRef.markForCheck();
      });
  }

  isSelectable(transaction: any): boolean {
    return this.statusCode(transaction.status) === 'PENDING' && !transaction.settlementId;
  }

  selectionReason(transaction: any): string {
    return this.isSelectable(transaction)
      ? 'labels.text.Available for settlement'
      : 'labels.text.Transaction cannot be selected for settlement';
  }

  toggleTransaction(transaction: any, checked: boolean): void {
    if (checked) {
      this.selectedTransactionIds.add(transaction.id);
      this.selectedTransactions = [
        ...this.selectedTransactions,
        transaction
      ];
    } else {
      this.selectedTransactionIds.delete(transaction.id);
      this.selectedTransactions = this.selectedTransactions.filter((item) => item.id !== transaction.id);
    }
    this.updateSubmittedAmount();
  }

  toggleAllTransactions(checked: boolean): void {
    this.selectedTransactionIds.clear();
    this.selectedTransactions = checked ? this.selectableTransactions : [];
    this.selectedTransactions.forEach((transaction) => this.selectedTransactionIds.add(transaction.id));
    this.updateSubmittedAmount();
  }

  createSettlement(): void {
    const payload = {
      ...this.settlementForm.getRawValue(),
      settlementDate: this.formatDateValue(this.settlementForm.value.settlementDate),
      transactionIds: Array.from(this.selectedTransactionIds)
    };
    this.organizationService
      .createAgentSettlement(payload)
      .pipe(take(1))
      .subscribe((response: any) => {
        const settlementId = response?.resourceId || response?.settlementId || response?.id;
        this.router.navigate(
          settlementId ? [
                '../',
                settlementId
              ] : ['../'],
          { relativeTo: this.route }
        );
      });
  }

  columnLabel(column: string): string {
    return `labels.inputs.${column}`;
  }

  optionDisplay(option: AgentCollectionOption): string {
    return option.name || option.displayName || option.value || option.code || `${option.id}`;
  }

  compareOptionIds(value: any, optionValue: any): boolean {
    return `${value}` === `${optionValue}`;
  }

  displayCell(row: any, column: string): string {
    return this.displayValue(row?.[column]);
  }

  private loadTemplate(): void {
    this.organizationService
      .getAgentTemplate({ associations: 'agents' })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => of({}))
      )
      .subscribe((template) => {
        this.agentOptions = this.templateOptions(template, 'agents', 'agentOptions');
        this.changeDetectorRef.markForCheck();
      });
  }

  private templateOptions(template: any, ...keys: string[]): AgentCollectionOption[] {
    const matchingKey = keys.find((key) => Array.isArray(template?.[key]));
    return matchingKey ? template[matchingKey] : [];
  }

  private statusCode(status: any): string {
    if (status?.code === 'agentCollectionTransactionStatusType.pending') {
      return 'PENDING';
    }
    return status?.value?.toUpperCase() || status;
  }

  private updateSubmittedAmount(): void {
    this.settlementForm.patchValue({ submittedAmount: `${this.expectedAmount}` }, { emitEvent: false });
    this.changeDetectorRef.markForCheck();
  }

  private displayValue(value: any): string {
    if (value === null || value === undefined || value === '') {
      return '-';
    }
    if (value instanceof Date || Array.isArray(value)) {
      return this.formatDateValue(value);
    }
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    if (value?.value) {
      return value.value;
    }
    return value;
  }

  private formatDateValue(value: any): string {
    if (value instanceof Date) {
      return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(
        value.getDate()
      ).padStart(2, '0')}`;
    }
    if (Array.isArray(value) && value.length >= 3) {
      const [
        year,
        month,
        day
      ] = value;
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    return value;
  }
}
