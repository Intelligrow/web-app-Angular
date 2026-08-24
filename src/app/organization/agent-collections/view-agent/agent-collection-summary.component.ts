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
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

/** Custom Imports */
import { OrganizationService } from '../../organization.service';
import { AGENT_COLLECTION_COMPONENT_IMPORTS } from '../agent-collections-imports';

@Component({
  selector: 'mifosx-agent-collection-summary',
  templateUrl: './agent-collection-summary.component.html',
  styleUrl: './agent-collection-summary.component.scss',
  imports: AGENT_COLLECTION_COMPONENT_IMPORTS,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AgentCollectionSummaryComponent implements OnInit {
  private organizationService = inject(OrganizationService);
  private route = inject(ActivatedRoute);
  private formBuilder = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);
  private changeDetectorRef = inject(ChangeDetectorRef);

  summary: any;
  filterForm = this.formBuilder.group({ businessDate: [''] });
  agentSummaryColumns = [
    'agent',
    'staff',
    'office',
    'currencyCode',
    'status',
    'businessDate'
  ];
  metricColumns = [
    'metric',
    'value'
  ];

  get formattedBusinessDate(): string {
    return this.formatDateValue(this.summary?.businessDate);
  }

  get agentSummaryRows(): any[] {
    const agent = this.summary?.agent || {};
    return [
      {
        agent: agent.appUserName || agent.appUserId || '-',
        staff: agent.staffName || agent.staffId || '-',
        office: agent.officeName || agent.officeId || '-',
        currencyCode: agent.currencyCode || '-',
        status: this.displayValue(agent.status),
        businessDate: this.formattedBusinessDate
      }
    ];
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

  ngOnInit(): void {
    this.loadSummary();
  }

  loadSummary(): void {
    this.organizationService
      .getAgentSummary(this.route.snapshot.paramMap.get('agentId'), this.cleanParams(this.filterForm.value))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((summary) => {
        this.summary = summary;
        this.changeDetectorRef.markForCheck();
      });
  }

  agentSummaryColumnLabel(column: string): string {
    const labels: any = {
      agent: 'labels.inputs.Agent',
      staff: 'labels.inputs.Staff',
      office: 'labels.inputs.Office',
      currencyCode: 'labels.inputs.Currency',
      status: 'labels.inputs.Status',
      businessDate: 'labels.inputs.Business Date'
    };
    return labels[column];
  }

  private metricRow(label: string, key: string): any {
    return {
      label,
      value: this.summaryValue(key)
    };
  }

  private summaryValue(key: string): string {
    const value = this.summary?.[key];
    return this.displayValue(value);
  }

  displayValue(value: any): string {
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

  private cleanParams(params: any): any {
    return Object.entries(params).reduce(
      (cleaned: any, [
          key,
          value
        ]) => {
        if (value !== null && value !== undefined && value !== '') {
          cleaned[key] = this.formatDateValue(value);
        }
        return cleaned;
      },
      {}
    );
  }
}
