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
import { ActivatedRoute } from '@angular/router';

/** Angular Material Imports */
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';

/** Custom Imports */
import { OrganizationService } from '../../organization.service';
import { AGENT_COLLECTION_COMPONENT_IMPORTS } from '../agent-collections-imports';

@Component({
  selector: 'mifosx-agent-collection-statement',
  templateUrl: './agent-collection-statement.component.html',
  styleUrl: './agent-collection-statement.component.scss',
  imports: AGENT_COLLECTION_COMPONENT_IMPORTS,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AgentCollectionStatementComponent implements OnInit {
  private organizationService = inject(OrganizationService);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  private changeDetectorRef = inject(ChangeDetectorRef);

  displayedColumns = [
    'transactionDate',
    'transactionType',
    'amount',
    'status',
    'settlementId',
    'runningBalance',
    'externalId',
    'mobileReference'
  ];
  dataSource = new MatTableDataSource<any>([]);

  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
  @ViewChild(MatSort, { static: true }) sort: MatSort;

  ngOnInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.organizationService
      .getAgentStatement(this.route.snapshot.paramMap.get('agentId'), {})
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        this.dataSource.data = response?.pageItems || response?.data || response || [];
        this.changeDetectorRef.markForCheck();
      });
  }

  columnLabel(column: string): string {
    return `labels.inputs.${column}`;
  }

  displayCell(row: any, column: string): string {
    const value = row?.[column];
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
