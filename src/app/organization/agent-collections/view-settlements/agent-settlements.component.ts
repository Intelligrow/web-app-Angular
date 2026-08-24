/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  ViewChild,
  inject
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder } from '@angular/forms';

/** rxjs Imports */
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';

/** Angular Material Imports */
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';

/** Custom Imports */
import { OrganizationService } from '../../organization.service';
import { AGENT_COLLECTION_COMPONENT_IMPORTS } from '../agent-collections-imports';
import { AGENT_SETTLEMENT_STATUS_OPTIONS, AgentCollectionOption } from '../agent-collections.models';

@Component({
  selector: 'mifosx-agent-settlements',
  templateUrl: './agent-settlements.component.html',
  styleUrl: './agent-settlements.component.scss',
  imports: AGENT_COLLECTION_COMPONENT_IMPORTS,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AgentSettlementsComponent implements OnInit {
  private organizationService = inject(OrganizationService);
  private formBuilder = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);
  private changeDetectorRef = inject(ChangeDetectorRef);

  statusOptions = AGENT_SETTLEMENT_STATUS_OPTIONS;
  agentOptions: AgentCollectionOption[] = [];
  officeOptions: AgentCollectionOption[] = [];
  displayedColumns = [
    'id',
    'agentName',
    'officeName',
    'settlementDate',
    'expectedAmount',
    'submittedAmount',
    'currencyCode',
    'status',
    'referenceNumber',
    'submittedByUsername',
    'submittedOnDate'
  ];
  columnsWithActions = [
    ...this.displayedColumns,
    'actions'
  ];
  dataSource = new MatTableDataSource<any>([]);
  filterForm = this.formBuilder.group({
    agentId: [''],
    officeId: [''],
    fromDate: [''],
    toDate: [''],
    status: ['all']
  });

  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
  @ViewChild(MatSort, { static: true }) sort: MatSort;

  ngOnInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.loadTemplate();
    this.loadSettlements();
  }

  loadSettlements(): void {
    this.organizationService
      .getAgentSettlements(this.cleanParams(this.filterForm.value))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        this.dataSource.data = response?.pageItems || response?.data || response || [];
        this.changeDetectorRef.markForCheck();
      });
  }

  resetFilters(): void {
    this.filterForm.patchValue({
      agentId: '',
      officeId: '',
      fromDate: '',
      toDate: '',
      status: 'all'
    });
    this.loadSettlements();
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

  displayValue(value: any): string {
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

  private loadTemplate(): void {
    this.organizationService
      .getAgentTemplate({ associations: 'offices,agents' })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => of({}))
      )
      .subscribe((template) => {
        this.agentOptions = this.templateOptions(template, 'agents', 'agentOptions');
        this.officeOptions = this.templateOptions(template, 'offices', 'officeOptions');
        this.changeDetectorRef.markForCheck();
      });
  }

  private templateOptions(template: any, ...keys: string[]): AgentCollectionOption[] {
    const matchingKey = keys.find((key) => Array.isArray(template?.[key]));
    return matchingKey ? template[matchingKey] : [];
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
