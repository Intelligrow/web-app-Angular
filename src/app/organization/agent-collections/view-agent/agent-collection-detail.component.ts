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
import { ActivatedRoute } from '@angular/router';

/** rxjs Imports */
import { forkJoin, of, take } from 'rxjs';
import { catchError } from 'rxjs/operators';

/** Custom Imports */
import { OrganizationService } from '../../organization.service';
import { AGENT_COLLECTION_COMPONENT_IMPORTS } from '../agent-collections-imports';

@Component({
  selector: 'mifosx-agent-collection-detail',
  templateUrl: './agent-collection-detail.component.html',
  styleUrl: './agent-collection-detail.component.scss',
  imports: AGENT_COLLECTION_COMPONENT_IMPORTS,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AgentCollectionDetailComponent implements OnInit {
  private organizationService = inject(OrganizationService);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  private changeDetectorRef = inject(ChangeDetectorRef);

  agent: any;
  summary: any;
  limitColumns = [
    'transactionType',
    'maximumSingleAmount',
    'maximumDailyAmount',
    'enabled'
  ];
  metricColumns = [
    'metric',
    'value'
  ];

  ngOnInit(): void {
    this.loadAgentView();
  }

  get collectionLimits(): any[] {
    if (this.agent?.transactionLimits?.length) {
      return this.agent.transactionLimits;
    }
    return [
      this.agent?.loanCollectionLimit,
      this.agent?.savingsCollectionLimit
    ].filter(Boolean);
  }

  get collectionRows(): any[] {
    return [
      this.metricRow('labels.inputs.Today Loan Collections', 'todaysLoanCollections'),
      this.metricRow('labels.inputs.Today Savings Collections', 'todaysSavingsCollections'),
      this.metricRow('labels.inputs.Today Total Collections', 'todaysTotalCollections'),
      this.metricRow('labels.inputs.Current Cash In Hand', 'currentCashInHand')
    ];
  }

  get settlementRows(): any[] {
    return [
      this.metricRow('labels.inputs.Pending Settlement Amount', 'pendingSettlementAmount'),
      this.metricRow('labels.inputs.Pending Transaction Count', 'pendingTransactionCount'),
      this.metricRow('labels.inputs.Last Settlement Date', 'lastSettlementDate')
    ];
  }

  get limitRows(): any[] {
    return [
      this.metricRow('labels.inputs.Remaining Loan Daily Limit', 'remainingLoanDailyLimit'),
      this.metricRow('labels.inputs.Remaining Savings Daily Limit', 'remainingSavingsDailyLimit'),
      this.metricRow('labels.inputs.Remaining Total Daily Limit', 'remainingTotalDailyLimit'),
      this.metricRow('labels.inputs.Remaining Cash Capacity', 'remainingCashCapacity')
    ];
  }

  executeAgentCommand(command: string): void {
    this.organizationService
      .executeAgentCommand(this.agent?.id, command)
      .pipe(take(1))
      .subscribe(() => this.loadAgentView());
  }

  agentStatus(agent: any): string {
    return agent?.status?.value || agent?.status || (agent?.active ? 'active' : 'inactive');
  }

  isAgentActive(agent: any): boolean {
    return agent?.active || agent?.status?.code === 'agentStatusType.active' || agent?.status?.value === 'Active';
  }

  transactionTypeDisplay(limit: any): string {
    return limit?.transactionType?.value || limit?.transactionType || '';
  }

  enabledLabelKey(enabled: boolean): string {
    return enabled ? 'tooltips.Yes' : 'tooltips.No';
  }

  private metricRow(label: string, key: string): any {
    return {
      label,
      value: this.summaryValue(key)
    };
  }

  private summaryValue(key: string): string {
    return this.displayValue(this.summary?.[key]);
  }

  private displayValue(value: any): string {
    if (value === null || value === undefined || value === '') {
      return '-';
    }
    if (Array.isArray(value)) {
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
    if (!value) {
      return '-';
    }
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

  private loadAgentView(): void {
    const agentId = this.route.snapshot.paramMap.get('agentId');
    forkJoin({
      agent: this.organizationService.getAgent(agentId),
      summary: this.organizationService.getAgentSummary(agentId, {}).pipe(catchError(() => of(null)))
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        this.agent = data.agent;
        this.summary = data.summary;
        this.changeDetectorRef.markForCheck();
      });
  }
}
