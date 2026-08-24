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
import { ActivatedRoute } from '@angular/router';

/** rxjs Imports */
import { take } from 'rxjs';

/** Angular Material Imports */
import { MatTableDataSource } from '@angular/material/table';

/** Custom Imports */
import { AccountingService } from 'app/accounting/accounting.service';
import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { GlAccountSelectorComponent } from 'app/shared/accounting/gl-account-selector/gl-account-selector.component';
import { GLAccount } from 'app/shared/models/general.model';
import { OrganizationService } from '../../organization.service';
import { AGENT_COLLECTION_COMPONENT_IMPORTS } from '../agent-collections-imports';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'mifosx-agent-settlement-detail',
  templateUrl: './agent-settlement-detail.component.html',
  styleUrl: './agent-settlement-detail.component.scss',
  imports: [
    ...AGENT_COLLECTION_COMPONENT_IMPORTS,
    GlAccountSelectorComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AgentSettlementDetailComponent implements OnInit {
  private organizationService = inject(OrganizationService);
  private accountingService = inject(AccountingService);
  private authenticationService = inject(AuthenticationService);
  private formBuilder = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  private changeDetectorRef = inject(ChangeDetectorRef);
  private translateService = inject(TranslateService);
  settlement: any;
  glAccounts: GLAccount[] = [];
  showRejectForm = false;
  approvalForm = this.formBuilder.group({
    glAccountId: [
      '',
      Validators.required
    ]
  });
  rejectForm = this.formBuilder.group({
    rejectionReason: [
      '',
      Validators.required
    ]
  });
  dataSource = new MatTableDataSource<any>([]);
  displayedColumns = [
    'id',
    'transactionDate',
    'transactionType',
    'amount',
    'currencyCode',
    'status',
    'settlementId'
  ];

  ngOnInit(): void {
    this.loadSettlement();
  }

  loadSettlement(): void {
    this.organizationService
      .getAgentSettlement(this.route.snapshot.paramMap.get('settlementId'))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((settlement) => {
        this.settlement = settlement;
        if (this.settlementStatusCode(settlement?.status) === 'SUBMITTED') {
          this.loadGlAccounts();
        } else {
          this.approvalForm.reset();
        }
        this.dataSource.data = settlement?.transactions || settlement?.collectionTransactions || [];
        this.changeDetectorRef.markForCheck();
      });
  }

  isMaker(): boolean {
    const currentUserId = this.authenticationService.getCredentials()?.userId;
    return Boolean(currentUserId && this.settlement?.submittedByUserId === currentUserId);
  }

  executeCommand(command: string): void {
    this.organizationService
      .executeAgentSettlementCommand(this.settlement.id, command, {})
      .pipe(take(1))
      .subscribe(() => this.loadSettlement());
  }

  approveSettlement(): void {
    if (this.approvalForm.invalid) {
      this.approvalForm.markAllAsTouched();
      return;
    }
    this.organizationService
      .executeAgentSettlementCommand(this.settlement.id, 'approve', this.approvalForm.getRawValue())
      .pipe(take(1))
      .subscribe(() => {
        this.approvalForm.reset();
        this.loadSettlement();
      });
  }

  rejectSettlement(): void {
    if (this.rejectForm.invalid) {
      return;
    }
    this.organizationService
      .executeAgentSettlementCommand(this.settlement.id, 'reject', this.rejectForm.getRawValue())
      .pipe(take(1))
      .subscribe(() => {
        this.showRejectForm = false;
        this.rejectForm.reset();
        this.loadSettlement();
      });
  }

  columnLabel(column: string): string {
    return `labels.inputs.${column}`;
  }

  displayCell(row: any, column: string): string {
    return this.displayValue(row?.[column]);
  }

  private loadGlAccounts(): void {
    if (this.glAccounts.length > 0) {
      return;
    }
    this.accountingService
      .getGlAccounts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((glAccounts) => {
        this.glAccounts = glAccounts || [];
        this.changeDetectorRef.markForCheck();
      });
  }

  settlementStatusCode(status: any): string {
    if (status?.code === 'agentSettlementStatusType.draft') {
      return 'DRAFT';
    }
    if (status?.code === 'agentSettlementStatusType.submitted') {
      return 'SUBMITTED';
    }
    return status?.value?.toUpperCase() || status;
  }

  displayValue(value: any): string {
    if (value === null || value === undefined || value === '') {
      return '-';
    }
    if (Array.isArray(value) && value.length >= 3) {
      const [
        year,
        month,
        day
      ] = value;
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    if (value?.value) {
      return value.value;
    }
    return value;
  }
}
