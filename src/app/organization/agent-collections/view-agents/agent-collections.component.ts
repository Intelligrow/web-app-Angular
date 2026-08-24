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
import { of, take } from 'rxjs';
import { catchError } from 'rxjs/operators';

/** Angular Material Imports */
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';

/** Custom Imports */
import { OrganizationService } from '../../organization.service';
import { AGENT_COLLECTION_LIST_COMPONENT_IMPORTS } from '../agent-collections-imports';
import { AGENT_STATUS_OPTIONS, AgentCollectionOption } from '../agent-collections.models';

@Component({
  selector: 'mifosx-agent-collections',
  templateUrl: './agent-collections.component.html',
  styleUrl: './agent-collections.component.scss',
  imports: AGENT_COLLECTION_LIST_COMPONENT_IMPORTS,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AgentCollectionsComponent implements OnInit {
  private organizationService = inject(OrganizationService);
  private formBuilder = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);
  private changeDetectorRef = inject(ChangeDetectorRef);

  statusOptions = AGENT_STATUS_OPTIONS;
  officeOptions: AgentCollectionOption[] = [];
  displayedColumns = [
    'appUserName',
    'staffName',
    'officeName',
    'currencyCode',
    'paymentTypeName',
    'status',
    'actions'
  ];
  dataSource = new MatTableDataSource<any>([]);
  filterForm = this.formBuilder.group({
    officeId: [''],
    status: ['all']
  });

  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
  @ViewChild(MatSort, { static: true }) sort: MatSort;

  ngOnInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.loadTemplate();
    this.loadAgents();
  }

  loadAgents(): void {
    this.organizationService
      .getAgents(this.cleanParams(this.filterForm.value))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response: any) => {
        this.dataSource.data = this.extractList(response);
        this.changeDetectorRef.markForCheck();
      });
  }

  resetFilters(): void {
    this.filterForm.patchValue({ officeId: '', status: 'all' });
    this.loadAgents();
  }

  executeAgentCommand(agentId: string, command: string): void {
    this.organizationService
      .executeAgentCommand(agentId, command)
      .pipe(take(1))
      .subscribe(() => this.loadAgents());
  }

  agentStatus(agent: any): string {
    return agent?.status?.value || agent?.status || (agent?.active ? 'active' : 'inactive');
  }

  optionDisplay(option: AgentCollectionOption): string {
    return option.name || option.displayName || option.value || option.code || `${option.id}`;
  }

  compareOptionIds(value: any, optionValue: any): boolean {
    return `${value}` === `${optionValue}`;
  }

  isAgentActive(agent: any): boolean {
    return agent?.active || agent?.status?.code === 'agentStatusType.active' || agent?.status === 'active';
  }

  private extractList(response: any): any[] {
    return response?.pageItems || response?.data || response || [];
  }

  private loadTemplate(): void {
    this.organizationService
      .getAgentTemplate({ associations: 'offices' })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => of({}))
      )
      .subscribe((template) => {
        this.officeOptions = this.templateOptions(template, 'offices', 'officeOptions');
        this.changeDetectorRef.markForCheck();
      });
  }

  private templateOptions(template: any, ...keys: string[]): AgentCollectionOption[] {
    const matchingKey = keys.find((key) => Array.isArray(template?.[key]));
    return matchingKey ? template[matchingKey] : [];
  }

  private cleanParams(params: any): any {
    return Object.entries(params).reduce(
      (cleaned: any, [
          key,
          value
        ]) => {
        if (value !== null && value !== undefined && value !== '') {
          cleaned[key] = value;
        }
        return cleaned;
      },
      {}
    );
  }
}
