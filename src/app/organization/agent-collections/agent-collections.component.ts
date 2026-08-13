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
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

/** rxjs Imports */
import { forkJoin, of, take } from 'rxjs';
import { catchError } from 'rxjs/operators';

/** Font Awesome Imports */
import { FaIconComponent } from '@fortawesome/angular-fontawesome';

/** Angular Material Imports */
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';

/** Custom Imports */
import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { OrganizationService } from '../organization.service';
import {
  AGENT_COLLECTION_TRANSACTION_STATUS_OPTIONS,
  AGENT_COLLECTION_TRANSACTION_TYPES,
  AGENT_SETTLEMENT_STATUS_OPTIONS,
  AGENT_STATUS_OPTIONS,
  AgentCollectionOption
} from './agent-collections.models';

const AGENT_COLLECTION_COMPONENT_IMPORTS = [
  ...STANDALONE_SHARED_IMPORTS,
  MatButtonModule,
  MatCardModule,
  MatCheckboxModule,
  MatFormFieldModule,
  MatInputModule,
  MatPaginatorModule,
  MatSelectModule,
  MatSortModule,
  MatTableModule,
  MatTabsModule,
  MatTooltipModule
];
const AGENT_COLLECTION_LIST_COMPONENT_IMPORTS = [
  ...AGENT_COLLECTION_COMPONENT_IMPORTS,
  FaIconComponent
];

@Component({
  selector: 'mifosx-agent-collections',
  template: `
    <div class="container m-b-20 layout-row align-end gap-20px responsive-column">
      <button mat-raised-button color="primary" [routerLink]="['create']" *mifosxHasPermission="'CREATE_AGENT'">
        {{ 'labels.buttons.Create Agent' | translate }}
      </button>
      <button mat-button color="primary" [routerLink]="['transactions']" *mifosxHasPermission="'READ_AGENT'">
        {{ 'labels.buttons.View Transactions' | translate }}
      </button>
      <button mat-button color="primary" [routerLink]="['settlements']" *mifosxHasPermission="'READ_AGENT_SETTLEMENT'">
        {{ 'labels.buttons.View Settlements' | translate }}
      </button>
    </div>

    <div class="container">
      <mat-card>
        <mat-card-content>
          <form [formGroup]="filterForm" class="layout-row responsive-column gap-20px">
            <mat-form-field class="flex-30">
              <mat-label>{{ 'labels.inputs.Office' | translate }}</mat-label>
              <mat-select formControlName="officeId" [compareWith]="compareOptionIds">
                <mat-option value="">{{ 'labels.buttons.All' | translate }}</mat-option>
                @for (office of officeOptions; track office.id) {
                  <mat-option [value]="office.id">{{ optionDisplay(office) }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field class="flex-30">
              <mat-label>{{ 'labels.inputs.Status' | translate }}</mat-label>
              <mat-select formControlName="status">
                @for (status of statusOptions; track status) {
                  <mat-option [value]="status">{{ status }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <div class="layout-row align-center gap-20px">
              <button mat-raised-button color="primary" type="button" (click)="loadAgents()">
                {{ 'labels.buttons.Search' | translate }}
              </button>
              <button mat-button type="button" (click)="resetFilters()">
                {{ 'labels.buttons.Reset' | translate }}
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    </div>

    <div class="container">
      <div class="mat-elevation-z8 table-container">
        <table mat-table [dataSource]="dataSource" matSort>
          <ng-container matColumnDef="appUserName">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'labels.inputs.Agent User' | translate }}</th>
            <td mat-cell *matCellDef="let agent">{{ agent.appUserName || agent.username || agent.appUserId }}</td>
          </ng-container>
          <ng-container matColumnDef="staffName">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'labels.inputs.Staff' | translate }}</th>
            <td mat-cell *matCellDef="let agent">{{ agent.staffName || agent.staffId }}</td>
          </ng-container>
          <ng-container matColumnDef="officeName">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'labels.inputs.Office' | translate }}</th>
            <td mat-cell *matCellDef="let agent">{{ agent.officeName || agent.officeId }}</td>
          </ng-container>
          <ng-container matColumnDef="currencyCode">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'labels.inputs.Currency' | translate }}</th>
            <td mat-cell *matCellDef="let agent">{{ agent.currencyCode }}</td>
          </ng-container>
          <ng-container matColumnDef="paymentTypeName">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'labels.inputs.Payment Type' | translate }}</th>
            <td mat-cell *matCellDef="let agent">{{ agent.paymentTypeName || agent.paymentTypeId }}</td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'labels.inputs.Status' | translate }}</th>
            <td mat-cell *matCellDef="let agent">{{ agentStatus(agent) }}</td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>{{ 'labels.inputs.Actions' | translate }}</th>
            <td mat-cell *matCellDef="let agent" class="layout-row gap-2px">
              <button
                mat-icon-button
                color="primary"
                [routerLink]="[agent.id]"
                [matTooltip]="'labels.buttons.View' | translate"
                *mifosxHasPermission="'READ_AGENT'"
              >
                <fa-icon icon="eye"></fa-icon>
              </button>
              <button
                mat-icon-button
                color="primary"
                [routerLink]="['settlements', 'create']"
                [queryParams]="{ agentId: agent.id }"
                [matTooltip]="'labels.buttons.Create Settlement' | translate"
                *mifosxHasPermission="'CREATE_AGENT_SETTLEMENT'"
              >
                <fa-icon icon="money-bill-alt"></fa-icon>
              </button>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
        </table>
        <mat-paginator [pageSizeOptions]="[10, 25, 50, 100]" showFirstLastButtons></mat-paginator>
      </div>
    </div>
  `,
  styles: [
    `
      .table-container {
        overflow: auto;
      }

      table {
        min-width: 1280px;
        width: 100%;
      }
    `
  ],
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

@Component({
  selector: 'mifosx-agent-collection-form',
  template: `
    <div class="container">
      <mat-card>
        <mat-card-content>
          <form [formGroup]="agentForm" (ngSubmit)="submit()">
            <div class="layout-row responsive-column gap-20px">
              <mat-form-field class="flex-fill">
                <mat-label>{{ 'labels.inputs.App User' | translate }}</mat-label>
                <mat-select formControlName="appUserId" [compareWith]="compareOptionIds" required>
                  @for (user of appUsers; track user.id) {
                    <mat-option [value]="user.id">{{ userDisplay(user) }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field class="flex-fill">
                <mat-label>{{ 'labels.inputs.Staff' | translate }}</mat-label>
                <mat-select formControlName="staffId" [compareWith]="compareOptionIds" required>
                  @for (staff of staffOptions; track staff.id) {
                    <mat-option [value]="staff.id">{{ optionDisplay(staff) }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field class="flex-fill">
                <mat-label>{{ 'labels.inputs.Office' | translate }}</mat-label>
                <mat-select formControlName="officeId" [compareWith]="compareOptionIds" required>
                  @for (office of officeOptions; track office.id) {
                    <mat-option [value]="office.id">{{ optionDisplay(office) }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>

            <div class="layout-row responsive-column gap-20px">
              <mat-form-field class="flex-fill">
                <mat-label>{{ 'labels.inputs.Payment Type' | translate }}</mat-label>
                <mat-select formControlName="paymentTypeId" [compareWith]="compareOptionIds" required>
                  @for (paymentType of paymentTypeOptions; track paymentType.id) {
                    <mat-option [value]="paymentType.id">{{ optionDisplay(paymentType) }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field class="flex-fill">
                <mat-label>{{ 'labels.inputs.Currency' | translate }}</mat-label>
                <mat-select formControlName="currencyCode" [compareWith]="compareOptionIds" required>
                  @for (currency of currencyOptions; track currency.id || currency.code || currency.value) {
                    <mat-option [value]="currency.id || currency.code || currency.value">{{
                      optionDisplay(currency)
                    }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              @if (!isEdit) {
                <mat-checkbox class="flex-fill m-t-24" formControlName="active">
                  {{ 'labels.inputs.Active' | translate }}
                </mat-checkbox>
              }
            </div>

            <div class="layout-row responsive-column gap-20px">
              <mat-form-field class="flex-fill">
                <mat-label>{{ 'labels.inputs.Maximum Cash In Hand' | translate }}</mat-label>
                <input matInput type="number" formControlName="maximumCashInHand" required />
                <mat-error>{{ 'labels.commons.Greater than zero' | translate }}</mat-error>
              </mat-form-field>
              <mat-form-field class="flex-fill">
                <mat-label>{{ 'labels.inputs.Maximum Daily Total Collection' | translate }}</mat-label>
                <input matInput type="number" formControlName="maximumDailyTotalCollection" required />
                <mat-error>{{ 'labels.commons.Greater than zero' | translate }}</mat-error>
              </mat-form-field>
            </div>

            <mat-card class="m-b-20">
              <mat-card-content formArrayName="transactionLimits">
                @for (limit of transactionLimits.controls; track limit; let i = $index) {
                  <div [formGroupName]="i" class="layout-row responsive-column gap-20px">
                    <mat-checkbox class="flex-20 m-t-24" formControlName="enabled">
                      {{ transactionTypeLabel(limit.value.transactionType) | translate }}
                    </mat-checkbox>
                    <mat-form-field class="flex-fill">
                      <mat-label>{{ 'labels.inputs.Maximum Single Amount' | translate }}</mat-label>
                      <input matInput type="number" formControlName="maximumSingleAmount" />
                    </mat-form-field>
                    <mat-form-field class="flex-fill">
                      <mat-label>{{ 'labels.inputs.Maximum Daily Amount' | translate }}</mat-label>
                      <input matInput type="number" formControlName="maximumDailyAmount" />
                    </mat-form-field>
                  </div>
                }
              </mat-card-content>
            </mat-card>

            <mat-card-actions class="layout-row align-end gap-20px">
              <button mat-button type="button" [routerLink]="['../']">
                {{ 'labels.buttons.Cancel' | translate }}
              </button>
              <button mat-raised-button color="primary" type="submit" [disabled]="agentForm.invalid">
                {{ 'labels.buttons.Submit' | translate }}
              </button>
            </mat-card-actions>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  imports: AGENT_COLLECTION_COMPONENT_IMPORTS,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AgentCollectionFormComponent implements OnInit {
  private organizationService = inject(OrganizationService);
  private formBuilder = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private changeDetectorRef = inject(ChangeDetectorRef);

  agentId = this.route.snapshot.paramMap.get('agentId');
  isEdit = Boolean(this.agentId);
  appUsers: AgentCollectionOption[] = [];
  staffOptions: AgentCollectionOption[] = [];
  officeOptions: AgentCollectionOption[] = [];
  paymentTypeOptions: AgentCollectionOption[] = [];
  currencyOptions: AgentCollectionOption[] = [];

  agentForm = this.formBuilder.group({
    locale: ['en'],
    appUserId: [
      '',
      Validators.required
    ],
    staffId: [
      '',
      Validators.required
    ],
    officeId: [
      '',
      Validators.required
    ],
    paymentTypeId: [
      '',
      Validators.required
    ],
    currencyCode: [
      '',
      [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(3)
      ]
    ],
    active: [true],
    maximumCashInHand: [
      '',
      [
        Validators.required,
        Validators.min(0.01)
      ]
    ],
    maximumDailyTotalCollection: [
      '',
      [
        Validators.required,
        Validators.min(0.01)
      ]
    ],
    transactionLimits: this.formBuilder.array([
      this.createLimitGroup('LOAN_REPAYMENT'),
      this.createLimitGroup('SAVINGS_DEPOSIT')
    ])
  });

  get transactionLimits(): FormArray {
    return this.agentForm.get('transactionLimits') as FormArray;
  }

  ngOnInit(): void {
    forkJoin({
      template: this.organizationService.getAgentTemplate({ associations: 'all' }).pipe(catchError(() => of({}))),
      agent: this.agentId ? this.organizationService.getAgent(this.agentId).pipe(catchError(() => of(null))) : of(null)
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        this.appUsers = this.templateOptions(data.template, 'users', 'userOptions', 'appUsers');
        this.staffOptions = this.templateOptions(data.template, 'staff', 'staffOptions');
        this.officeOptions = this.templateOptions(data.template, 'offices', 'officeOptions');
        this.paymentTypeOptions = this.templateOptions(data.template, 'paymentTypes', 'paymentTypeOptions');
        this.currencyOptions = this.templateOptions(data.template, 'currency', 'currencies', 'currencyOptions');
        if (data.agent) {
          this.patchAgent(data.agent);
        }
        this.changeDetectorRef.markForCheck();
      });
  }

  submit(): void {
    const payload = this.agentForm.getRawValue();
    if (this.isEdit) {
      delete payload.active;
    }
    const request = this.isEdit
      ? this.organizationService.updateAgent(this.agentId, payload)
      : this.organizationService.createAgent(payload);
    request.pipe(take(1)).subscribe(() => this.router.navigate(['../'], { relativeTo: this.route }));
  }

  optionDisplay(option: AgentCollectionOption): string {
    return option.displayName || option.name || option.value || option.code || `${option.id}`;
  }

  userDisplay(user: any): string {
    return user.name || user.username || user.displayName || user.firstname || `${user.id}`;
  }

  compareOptionIds(value: any, optionValue: any): boolean {
    return `${value}` === `${optionValue}`;
  }

  transactionTypeLabel(transactionType: string): string {
    return (
      AGENT_COLLECTION_TRANSACTION_TYPES.find((type) => type.value === transactionType)?.label ||
      'labels.inputs.Transaction Type'
    );
  }

  private createLimitGroup(transactionType: string): FormGroup {
    return this.formBuilder.group({
      transactionType: [transactionType],
      maximumSingleAmount: [
        '',
        [
          Validators.required,
          Validators.min(0.01)
        ]
      ],
      maximumDailyAmount: [
        '',
        [
          Validators.required,
          Validators.min(0.01)
        ]
      ],
      enabled: [true]
    });
  }

  private patchAgent(agent: any): void {
    const limits = agent.transactionLimits || [];
    this.agentForm.patchValue({
      appUserId: agent.appUserId,
      staffId: agent.staffId,
      officeId: agent.officeId,
      paymentTypeId: agent.paymentTypeId,
      currencyCode: agent.currencyCode,
      active: this.isAgentActive(agent),
      maximumCashInHand: agent.maximumCashInHand,
      maximumDailyTotalCollection: agent.maximumDailyTotalCollection
    });
    this.transactionLimits.controls.forEach((control) => {
      const matchingLimit = limits.find(
        (limit: any) => this.transactionTypeCode(limit.transactionType) === control.value.transactionType
      );
      if (matchingLimit) {
        control.patchValue({
          maximumSingleAmount: matchingLimit.maximumSingleAmount,
          maximumDailyAmount: matchingLimit.maximumDailyAmount,
          enabled: matchingLimit.enabled
        });
      }
    });
  }

  private isAgentActive(agent: any): boolean {
    return agent?.active || agent?.status?.code === 'agentStatusType.active' || agent?.status?.value === 'Active';
  }

  private transactionTypeCode(transactionType: any): string {
    if (transactionType?.code === 'agentTransactionType.loan.repayment') {
      return 'LOAN_REPAYMENT';
    }
    if (transactionType?.code === 'agentTransactionType.savings.deposit') {
      return 'SAVINGS_DEPOSIT';
    }
    return transactionType;
  }

  private templateOptions(template: any, ...keys: string[]): AgentCollectionOption[] {
    const matchingKey = keys.find((key) => Array.isArray(template?.[key]));
    return matchingKey ? template[matchingKey] : [];
  }
}

@Component({
  selector: 'mifosx-agent-collection-detail',
  template: `
    <div class="container">
      <mat-card>
        <mat-card-content>
          <div class="layout-row align-end gap-20px m-b-20">
            <button mat-raised-button color="primary" [routerLink]="['edit']" *mifosxHasPermission="'UPDATE_AGENT'">
              {{ 'labels.buttons.Edit' | translate }}
            </button>
            <button mat-stroked-button color="primary" [routerLink]="['statement']" *mifosxHasPermission="'READ_AGENT'">
              {{ 'labels.buttons.Statement' | translate }}
            </button>
            <button
              mat-stroked-button
              color="primary"
              [routerLink]="['/organization/agent-collections/settlements/create']"
              [queryParams]="{ agentId: agent?.id }"
              *mifosxHasPermission="'CREATE_AGENT_SETTLEMENT'"
            >
              {{ 'labels.buttons.Create Settlement' | translate }}
            </button>
            @if (agent) {
              @if (isAgentActive(agent)) {
                <button
                  mat-stroked-button
                  color="warn"
                  (click)="executeAgentCommand('deactivate')"
                  *mifosxHasPermission="'UPDATE_AGENT'"
                >
                  {{ 'labels.buttons.Deactivate' | translate }}
                </button>
              } @else {
                <button
                  mat-stroked-button
                  color="primary"
                  (click)="executeAgentCommand('activate')"
                  *mifosxHasPermission="'UPDATE_AGENT'"
                >
                  {{ 'labels.buttons.Activate' | translate }}
                </button>
              }
            }
          </div>
          <div class="layout-row responsive-column gap-20px">
            <p class="flex-30">
              <strong>{{ 'labels.inputs.Agent User' | translate }}:</strong>
              {{ agent?.appUserName || agent?.appUserId }}
            </p>
            <p class="flex-30">
              <strong>{{ 'labels.inputs.Staff' | translate }}:</strong> {{ agent?.staffName || agent?.staffId }}
            </p>
            <p class="flex-30">
              <strong>{{ 'labels.inputs.Office' | translate }}:</strong> {{ agent?.officeName || agent?.officeId }}
            </p>
          </div>
          <div class="layout-row responsive-column gap-20px">
            <p class="flex-30">
              <strong>{{ 'labels.inputs.Currency' | translate }}:</strong> {{ agent?.currencyCode }}
            </p>
            <p class="flex-30">
              <strong>{{ 'labels.inputs.Payment Type' | translate }}:</strong>
              {{ agent?.paymentTypeName || agent?.paymentTypeId }}
            </p>
            <p class="flex-30">
              <strong>{{ 'labels.inputs.Status' | translate }}:</strong>
              {{ agentStatus(agent) }}
            </p>
          </div>
          <div class="layout-row responsive-column gap-20px">
            <p class="flex-30">
              <strong>{{ 'labels.inputs.Maximum Cash In Hand' | translate }}:</strong>
              {{ agent?.maximumCashInHand | number }}
            </p>
            <p class="flex-30">
              <strong>{{ 'labels.inputs.Maximum Daily Total Collection' | translate }}:</strong>
              {{ agent?.maximumDailyTotalCollection | number }}
            </p>
          </div>
          <div class="mat-elevation-z8 table-container m-t-20">
            <table mat-table [dataSource]="collectionLimits">
              <ng-container matColumnDef="transactionType">
                <th mat-header-cell *matHeaderCellDef>{{ 'labels.inputs.Transaction Type' | translate }}</th>
                <td mat-cell *matCellDef="let limit">{{ transactionTypeDisplay(limit) }}</td>
              </ng-container>
              <ng-container matColumnDef="maximumSingleAmount">
                <th mat-header-cell *matHeaderCellDef>{{ 'labels.inputs.Maximum Single Amount' | translate }}</th>
                <td mat-cell *matCellDef="let limit">{{ limit.maximumSingleAmount | number }}</td>
              </ng-container>
              <ng-container matColumnDef="maximumDailyAmount">
                <th mat-header-cell *matHeaderCellDef>{{ 'labels.inputs.Maximum Daily Amount' | translate }}</th>
                <td mat-cell *matCellDef="let limit">{{ limit.maximumDailyAmount | number }}</td>
              </ng-container>
              <ng-container matColumnDef="enabled">
                <th mat-header-cell *matHeaderCellDef>{{ 'labels.inputs.Enabled' | translate }}</th>
                <td mat-cell *matCellDef="let limit">{{ enabledLabelKey(limit.enabled) | translate }}</td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="limitColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: limitColumns"></tr>
            </table>
          </div>
          @if (summary) {
            <h3 class="m-t-20">{{ 'labels.heading.Agent Summary' | translate }}</h3>
            <div class="summary-tables">
              <div class="summary-section mat-elevation-z2">
                <h3>{{ 'labels.heading.Collection Totals' | translate }}</h3>
                <table mat-table [dataSource]="collectionRows">
                  <ng-container matColumnDef="metric">
                    <th mat-header-cell *matHeaderCellDef>{{ 'labels.inputs.Metric' | translate }}</th>
                    <td mat-cell *matCellDef="let row">{{ row.label | translate }}</td>
                  </ng-container>
                  <ng-container matColumnDef="value">
                    <th mat-header-cell *matHeaderCellDef>{{ 'labels.inputs.Value' | translate }}</th>
                    <td mat-cell *matCellDef="let row">{{ row.value }}</td>
                  </ng-container>
                  <tr mat-header-row *matHeaderRowDef="metricColumns"></tr>
                  <tr mat-row *matRowDef="let row; columns: metricColumns"></tr>
                </table>
              </div>

              <div class="summary-section mat-elevation-z2">
                <h3>{{ 'labels.heading.Settlement Position' | translate }}</h3>
                <table mat-table [dataSource]="settlementRows">
                  <ng-container matColumnDef="metric">
                    <th mat-header-cell *matHeaderCellDef>{{ 'labels.inputs.Metric' | translate }}</th>
                    <td mat-cell *matCellDef="let row">{{ row.label | translate }}</td>
                  </ng-container>
                  <ng-container matColumnDef="value">
                    <th mat-header-cell *matHeaderCellDef>{{ 'labels.inputs.Value' | translate }}</th>
                    <td mat-cell *matCellDef="let row">{{ row.value }}</td>
                  </ng-container>
                  <tr mat-header-row *matHeaderRowDef="metricColumns"></tr>
                  <tr mat-row *matRowDef="let row; columns: metricColumns"></tr>
                </table>
              </div>

              <div class="summary-section mat-elevation-z2">
                <h3>{{ 'labels.heading.Remaining Limits' | translate }}</h3>
                <table mat-table [dataSource]="limitRows">
                  <ng-container matColumnDef="metric">
                    <th mat-header-cell *matHeaderCellDef>{{ 'labels.inputs.Metric' | translate }}</th>
                    <td mat-cell *matCellDef="let row">{{ row.label | translate }}</td>
                  </ng-container>
                  <ng-container matColumnDef="value">
                    <th mat-header-cell *matHeaderCellDef>{{ 'labels.inputs.Value' | translate }}</th>
                    <td mat-cell *matCellDef="let row">{{ row.value }}</td>
                  </ng-container>
                  <tr mat-header-row *matHeaderRowDef="metricColumns"></tr>
                  <tr mat-row *matRowDef="let row; columns: metricColumns"></tr>
                </table>
              </div>
            </div>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .table-container {
        overflow: auto;
      }

      table {
        width: 100%;
      }

      .summary-tables {
        display: grid;
        gap: 16px;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        width: 100%;
      }

      .summary-section {
        border-radius: 8px;
        overflow: auto;
        padding: 16px;
      }

      .summary-section h3 {
        font-size: 1rem;
        margin-bottom: 8px;
      }
    `
  ],
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

@Component({
  selector: 'mifosx-agent-collection-summary',
  template: `
    <div class="container">
      <mat-card>
        <mat-card-content>
          <form [formGroup]="filterForm" class="layout-row responsive-column gap-20px m-b-20">
            <mat-form-field class="flex-30">
              <mat-label>{{ 'labels.inputs.Business Date' | translate }}</mat-label>
              <input matInput [matDatepicker]="businessDatePicker" formControlName="businessDate" />
              <mat-datepicker-toggle matSuffix [for]="businessDatePicker"></mat-datepicker-toggle>
              <mat-datepicker #businessDatePicker></mat-datepicker>
            </mat-form-field>
            <button mat-raised-button color="primary" type="button" (click)="loadSummary()">
              {{ 'labels.buttons.Refresh' | translate }}
            </button>
          </form>
          @if (summary) {
            <div class="summary-section mat-elevation-z2 m-b-20">
              <table mat-table [dataSource]="agentSummaryRows">
                @for (column of agentSummaryColumns; track column) {
                  <ng-container [matColumnDef]="column">
                    <th mat-header-cell *matHeaderCellDef>{{ agentSummaryColumnLabel(column) | translate }}</th>
                    <td mat-cell *matCellDef="let row">{{ row[column] }}</td>
                  </ng-container>
                }
                <tr mat-header-row *matHeaderRowDef="agentSummaryColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: agentSummaryColumns"></tr>
              </table>
            </div>

            <div class="summary-tables">
              <div class="summary-section mat-elevation-z2">
                <h3>{{ 'labels.heading.Collection Totals' | translate }}</h3>
                <table mat-table [dataSource]="collectionRows">
                  <ng-container matColumnDef="metric">
                    <th mat-header-cell *matHeaderCellDef>{{ 'labels.inputs.Metric' | translate }}</th>
                    <td mat-cell *matCellDef="let row">{{ row.label | translate }}</td>
                  </ng-container>
                  <ng-container matColumnDef="value">
                    <th mat-header-cell *matHeaderCellDef>{{ 'labels.inputs.Value' | translate }}</th>
                    <td mat-cell *matCellDef="let row">{{ row.value }}</td>
                  </ng-container>
                  <tr mat-header-row *matHeaderRowDef="metricColumns"></tr>
                  <tr mat-row *matRowDef="let row; columns: metricColumns"></tr>
                </table>
              </div>

              <div class="summary-section mat-elevation-z2">
                <h3>{{ 'labels.heading.Settlement Position' | translate }}</h3>
                <table mat-table [dataSource]="settlementRows">
                  <ng-container matColumnDef="metric">
                    <th mat-header-cell *matHeaderCellDef>{{ 'labels.inputs.Metric' | translate }}</th>
                    <td mat-cell *matCellDef="let row">{{ row.label | translate }}</td>
                  </ng-container>
                  <ng-container matColumnDef="value">
                    <th mat-header-cell *matHeaderCellDef>{{ 'labels.inputs.Value' | translate }}</th>
                    <td mat-cell *matCellDef="let row">{{ row.value }}</td>
                  </ng-container>
                  <tr mat-header-row *matHeaderRowDef="metricColumns"></tr>
                  <tr mat-row *matRowDef="let row; columns: metricColumns"></tr>
                </table>
              </div>

              <div class="summary-section mat-elevation-z2 summary-wide">
                <h3>{{ 'labels.heading.Remaining Limits' | translate }}</h3>
                <table mat-table [dataSource]="limitRows">
                  <ng-container matColumnDef="metric">
                    <th mat-header-cell *matHeaderCellDef>{{ 'labels.inputs.Metric' | translate }}</th>
                    <td mat-cell *matCellDef="let row">{{ row.label | translate }}</td>
                  </ng-container>
                  <ng-container matColumnDef="value">
                    <th mat-header-cell *matHeaderCellDef>{{ 'labels.inputs.Value' | translate }}</th>
                    <td mat-cell *matCellDef="let row">{{ row.value }}</td>
                  </ng-container>
                  <tr mat-header-row *matHeaderRowDef="metricColumns"></tr>
                  <tr mat-row *matRowDef="let row; columns: metricColumns"></tr>
                </table>
              </div>
            </div>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .summary-tables {
        display: grid;
        gap: 16px;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        width: 100%;
      }

      .summary-section {
        border-radius: 8px;
        overflow: auto;
        padding: 16px;
      }

      .summary-section h3 {
        font-size: 1rem;
        margin-bottom: 8px;
      }

      .summary-section table {
        width: 100%;
      }

      .summary-wide {
        grid-column: 1 / -1;
      }
    `
  ],
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

@Component({
  selector: 'mifosx-agent-collection-transactions',
  template: `
    <div class="container">
      <mat-card>
        <mat-card-content>
          <form [formGroup]="filterForm" class="layout-row responsive-column gap-20px">
            <mat-form-field class="flex-20">
              <mat-label>{{ 'labels.inputs.Agent' | translate }}</mat-label>
              <mat-select formControlName="agentId" [compareWith]="compareOptionIds">
                <mat-option value="">{{ 'labels.buttons.All' | translate }}</mat-option>
                @for (agent of agentOptions; track agent.id) {
                  <mat-option [value]="agent.id">{{ optionDisplay(agent) }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field class="flex-20">
              <mat-label>{{ 'labels.inputs.Office' | translate }}</mat-label>
              <mat-select formControlName="officeId" [compareWith]="compareOptionIds">
                <mat-option value="">{{ 'labels.buttons.All' | translate }}</mat-option>
                @for (office of officeOptions; track office.id) {
                  <mat-option [value]="office.id">{{ optionDisplay(office) }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field class="flex-20">
              <mat-label>{{ 'labels.inputs.From Date' | translate }}</mat-label>
              <input matInput [matDatepicker]="transactionsFromDatePicker" formControlName="fromDate" />
              <mat-datepicker-toggle matSuffix [for]="transactionsFromDatePicker"></mat-datepicker-toggle>
              <mat-datepicker #transactionsFromDatePicker></mat-datepicker>
            </mat-form-field>
            <mat-form-field class="flex-20">
              <mat-label>{{ 'labels.inputs.To Date' | translate }}</mat-label>
              <input matInput [matDatepicker]="transactionsToDatePicker" formControlName="toDate" />
              <mat-datepicker-toggle matSuffix [for]="transactionsToDatePicker"></mat-datepicker-toggle>
              <mat-datepicker #transactionsToDatePicker></mat-datepicker>
            </mat-form-field>
            <mat-form-field class="flex-20">
              <mat-label>{{ 'labels.inputs.Transaction Type' | translate }}</mat-label>
              <mat-select formControlName="transactionType">
                <mat-option value="all">all</mat-option>
                @for (type of transactionTypes; track type.value) {
                  <mat-option [value]="type.value">{{ type.label | translate }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field class="flex-20">
              <mat-label>{{ 'labels.inputs.Status' | translate }}</mat-label>
              <mat-select formControlName="status">
                @for (status of statusOptions; track status) {
                  <mat-option [value]="status">{{ status }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field class="flex-20">
              <mat-label>{{ 'labels.inputs.Settlement Id' | translate }}</mat-label>
              <input matInput type="number" formControlName="settlementId" />
            </mat-form-field>
            <div class="layout-row align-center gap-20px">
              <button mat-raised-button color="primary" type="button" (click)="loadTransactions()">
                {{ 'labels.buttons.Search' | translate }}
              </button>
              <button mat-button type="button" (click)="resetFilters()">
                {{ 'labels.buttons.Reset' | translate }}
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    </div>

    <div class="container">
      <div class="mat-elevation-z8 table-container">
        <table mat-table [dataSource]="dataSource" matSort>
          @for (column of displayedColumns; track column) {
            <ng-container [matColumnDef]="column">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ columnLabel(column) | translate }}</th>
              <td mat-cell *matCellDef="let transaction">{{ displayCell(transaction, column) }}</td>
            </ng-container>
          }
          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
        </table>
        <mat-paginator [pageSizeOptions]="[10, 25, 50, 100]" showFirstLastButtons></mat-paginator>
      </div>
    </div>
  `,
  styles: [
    `
      .table-container {
        overflow: auto;
      }

      table {
        min-width: 1440px;
        width: 100%;
      }
    `
  ],
  imports: AGENT_COLLECTION_COMPONENT_IMPORTS,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AgentCollectionTransactionsComponent implements OnInit {
  protected organizationService = inject(OrganizationService);
  protected formBuilder = inject(FormBuilder);
  protected destroyRef = inject(DestroyRef);
  protected changeDetectorRef = inject(ChangeDetectorRef);

  transactionTypes = AGENT_COLLECTION_TRANSACTION_TYPES;
  statusOptions = AGENT_COLLECTION_TRANSACTION_STATUS_OPTIONS;
  agentOptions: AgentCollectionOption[] = [];
  officeOptions: AgentCollectionOption[] = [];
  displayedColumns = [
    'transactionDate',
    'agentName',
    'officeName',
    'transactionType',
    'amount',
    'currencyCode',
    'paymentTypeName',
    'status',
    'loanId',
    'loanTransactionId',
    'savingsAccountId',
    'savingsTransactionId',
    'settlementId',
    'settledDate',
    'externalId',
    'mobileReference'
  ];
  dataSource = new MatTableDataSource<any>([]);
  filterForm = this.formBuilder.group({
    agentId: [''],
    officeId: [''],
    fromDate: [''],
    toDate: [''],
    transactionType: ['all'],
    status: ['all'],
    settlementId: ['']
  });

  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
  @ViewChild(MatSort, { static: true }) sort: MatSort;

  ngOnInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.loadTemplate();
    this.loadTransactions();
  }

  loadTransactions(): void {
    this.organizationService
      .getAgentCollectionTransactions(this.cleanParams(this.filterForm.value))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        this.dataSource.data = this.extractList(response);
        this.changeDetectorRef.markForCheck();
      });
  }

  resetFilters(): void {
    this.filterForm.patchValue({
      agentId: '',
      officeId: '',
      fromDate: '',
      toDate: '',
      transactionType: 'all',
      status: 'all',
      settlementId: ''
    });
    this.loadTransactions();
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

  protected extractList(response: any): any[] {
    return response?.pageItems || response?.data || response || [];
  }

  protected loadTemplate(): void {
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

  protected templateOptions(template: any, ...keys: string[]): AgentCollectionOption[] {
    const matchingKey = keys.find((key) => Array.isArray(template?.[key]));
    return matchingKey ? template[matchingKey] : [];
  }

  protected cleanParams(params: any): any {
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

  protected displayValue(value: any): string {
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

@Component({
  selector: 'mifosx-agent-collection-statement',
  template: `
    <div class="container">
      <div class="mat-elevation-z8 table-container">
        <table mat-table [dataSource]="dataSource" matSort>
          @for (column of displayedColumns; track column) {
            <ng-container [matColumnDef]="column">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ columnLabel(column) | translate }}</th>
              <td mat-cell *matCellDef="let transaction">{{ displayCell(transaction, column) }}</td>
            </ng-container>
          }
          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
        </table>
        <mat-paginator [pageSizeOptions]="[10, 25, 50, 100]" showFirstLastButtons></mat-paginator>
      </div>
    </div>
  `,
  styles: [
    `
      .table-container {
        overflow: auto;
      }

      table {
        min-width: 960px;
        width: 100%;
      }
    `
  ],
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

@Component({
  selector: 'mifosx-agent-settlements',
  template: `
    <div class="container m-b-20 layout-row align-end gap-20px responsive-column">
      <button
        mat-raised-button
        color="primary"
        [routerLink]="['create']"
        *mifosxHasPermission="'CREATE_AGENT_SETTLEMENT'"
      >
        {{ 'labels.buttons.Create Settlement' | translate }}
      </button>
    </div>
    <div class="container">
      <mat-card>
        <mat-card-content>
          <form [formGroup]="filterForm">
            <div class="layout-row responsive-column gap-20px">
              <mat-form-field class="flex-20">
                <mat-label>{{ 'labels.inputs.Agent' | translate }}</mat-label>
                <mat-select formControlName="agentId" [compareWith]="compareOptionIds">
                  <mat-option value="">{{ 'labels.buttons.All' | translate }}</mat-option>
                  @for (agent of agentOptions; track agent.id) {
                    <mat-option [value]="agent.id">{{ optionDisplay(agent) }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field class="flex-20">
                <mat-label>{{ 'labels.inputs.Office' | translate }}</mat-label>
                <mat-select formControlName="officeId" [compareWith]="compareOptionIds">
                  <mat-option value="">{{ 'labels.buttons.All' | translate }}</mat-option>
                  @for (office of officeOptions; track office.id) {
                    <mat-option [value]="office.id">{{ optionDisplay(office) }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field class="flex-20">
                <mat-label>{{ 'labels.inputs.From Date' | translate }}</mat-label>
                <input matInput [matDatepicker]="settlementsFromDatePicker" formControlName="fromDate" />
                <mat-datepicker-toggle matSuffix [for]="settlementsFromDatePicker"></mat-datepicker-toggle>
                <mat-datepicker #settlementsFromDatePicker></mat-datepicker>
              </mat-form-field>
              <mat-form-field class="flex-20">
                <mat-label>{{ 'labels.inputs.To Date' | translate }}</mat-label>
                <input matInput [matDatepicker]="settlementsToDatePicker" formControlName="toDate" />
                <mat-datepicker-toggle matSuffix [for]="settlementsToDatePicker"></mat-datepicker-toggle>
                <mat-datepicker #settlementsToDatePicker></mat-datepicker>
              </mat-form-field>
              <mat-form-field class="flex-20">
                <mat-label>{{ 'labels.inputs.Status' | translate }}</mat-label>
                <mat-select formControlName="status">
                  @for (status of statusOptions; track status) {
                    <mat-option [value]="status">{{ status }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>
            <div class="layout-row align-end gap-20px">
              <button mat-raised-button color="primary" type="button" (click)="loadSettlements()">
                {{ 'labels.buttons.Search' | translate }}
              </button>
              <button mat-button type="button" (click)="resetFilters()">
                {{ 'labels.buttons.Reset' | translate }}
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
    <div class="container">
      <div class="mat-elevation-z8 table-container">
        <table mat-table [dataSource]="dataSource" matSort>
          @for (column of displayedColumns; track column) {
            <ng-container [matColumnDef]="column">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ columnLabel(column) | translate }}</th>
              <td mat-cell *matCellDef="let settlement">{{ displayCell(settlement, column) }}</td>
            </ng-container>
          }
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>{{ 'labels.inputs.Actions' | translate }}</th>
            <td mat-cell *matCellDef="let settlement">
              <button
                mat-button
                color="primary"
                [routerLink]="[settlement.id]"
                *mifosxHasPermission="'READ_AGENT_SETTLEMENT'"
              >
                {{ 'labels.buttons.View' | translate }}
              </button>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="columnsWithActions"></tr>
          <tr mat-row *matRowDef="let row; columns: columnsWithActions"></tr>
        </table>
        <mat-paginator [pageSizeOptions]="[10, 25, 50, 100]" showFirstLastButtons></mat-paginator>
      </div>
    </div>
  `,
  styles: [
    `
      .table-container {
        overflow: auto;
      }

      table {
        min-width: 1280px;
        width: 100%;
      }
    `
  ],
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

@Component({
  selector: 'mifosx-agent-settlement-form',
  template: `
    <div class="container">
      <mat-card>
        <mat-card-content>
          <form [formGroup]="settlementForm" class="settlement-form m-b-20">
            <mat-form-field>
              <mat-label>{{ 'labels.inputs.Agent' | translate }}</mat-label>
              <mat-select formControlName="agentId" [compareWith]="compareOptionIds" required>
                @for (agent of agentOptions; track agent.id) {
                  <mat-option [value]="agent.id">{{ optionDisplay(agent) }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field>
              <mat-label>{{ 'labels.inputs.Settlement Date' | translate }}</mat-label>
              <input matInput [matDatepicker]="settlementDatePicker" formControlName="settlementDate" required />
              <mat-datepicker-toggle matSuffix [for]="settlementDatePicker"></mat-datepicker-toggle>
              <mat-datepicker #settlementDatePicker></mat-datepicker>
            </mat-form-field>
            <mat-form-field>
              <mat-label>{{ 'labels.inputs.Submitted Amount' | translate }}</mat-label>
              <input matInput type="number" formControlName="submittedAmount" required readonly />
            </mat-form-field>
            <mat-form-field>
              <mat-label>{{ 'labels.inputs.Reference Number' | translate }}</mat-label>
              <input matInput formControlName="referenceNumber" />
            </mat-form-field>
            <mat-form-field>
              <mat-label>{{ 'labels.inputs.Notes' | translate }}</mat-label>
              <input matInput formControlName="notes" />
            </mat-form-field>
            <button
              mat-raised-button
              color="primary"
              type="button"
              class="settlement-form-action"
              (click)="loadPendingTransactions()"
            >
              {{ 'labels.buttons.Search' | translate }}
            </button>
          </form>
          <div class="settlement-summary m-b-20">
            <p>
              <strong>{{ 'labels.inputs.Expected Amount' | translate }}:</strong> {{ expectedAmount | number }}
            </p>
            <p>
              <strong>{{ 'labels.inputs.Difference' | translate }}:</strong> {{ amountDifference | number }}
            </p>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
    <div class="container">
      <div class="mat-elevation-z8 table-container">
        <table mat-table [dataSource]="dataSource">
          <ng-container matColumnDef="select">
            <th mat-header-cell *matHeaderCellDef>
              <mat-checkbox
                [checked]="allSelectableTransactionsSelected"
                [indeterminate]="someSelectableTransactionsSelected"
                [disabled]="selectableTransactions.length === 0"
                [matTooltip]="'labels.inputs.Select' | translate"
                (change)="toggleAllTransactions($event.checked)"
              ></mat-checkbox>
            </th>
            <td mat-cell *matCellDef="let transaction">
              <mat-checkbox
                [checked]="selectedTransactionIds.has(transaction.id)"
                [disabled]="!isSelectable(transaction)"
                [matTooltip]="selectionReason(transaction) | translate"
                (change)="toggleTransaction(transaction, $event.checked)"
              ></mat-checkbox>
            </td>
          </ng-container>
          @for (column of displayedColumns; track column) {
            <ng-container [matColumnDef]="column">
              <th mat-header-cell *matHeaderCellDef>{{ columnLabel(column) | translate }}</th>
              <td mat-cell *matCellDef="let transaction">{{ displayCell(transaction, column) }}</td>
            </ng-container>
          }
          <tr mat-header-row *matHeaderRowDef="columnsWithSelect"></tr>
          <tr mat-row *matRowDef="let row; columns: columnsWithSelect"></tr>
        </table>
      </div>
      <div class="layout-row align-end gap-20px m-t-20">
        <button mat-button [routerLink]="['../']">{{ 'labels.buttons.Cancel' | translate }}</button>
        <button
          mat-raised-button
          color="primary"
          [disabled]="settlementForm.invalid || selectedTransactionIds.size === 0 || amountDifference !== 0"
          (click)="createSettlement()"
        >
          {{ 'labels.buttons.Submit' | translate }}
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .table-container {
        overflow: auto;
      }

      table {
        min-width: 960px;
        width: 100%;
      }

      .settlement-form {
        display: flex;
        flex-direction: column;
        gap: 16px;
        max-width: 480px;
      }

      .settlement-form-action {
        align-self: flex-start;
      }

      .settlement-summary {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .settlement-summary p {
        margin: 0;
      }
    `
  ],
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

@Component({
  selector: 'mifosx-agent-settlement-detail',
  template: `
    <div class="container">
      <mat-card>
        <mat-card-content>
          <div class="layout-row align-end gap-20px m-b-20">
            @if (settlementStatusCode(settlement?.status) === 'DRAFT') {
              <button
                mat-raised-button
                color="primary"
                (click)="executeCommand('submit')"
                *mifosxHasPermission="'SUBMIT_AGENT_SETTLEMENT'"
              >
                {{ 'labels.buttons.Submit' | translate }}
              </button>
              <button
                mat-button
                color="warn"
                (click)="executeCommand('cancel')"
                *mifosxHasPermission="'CANCEL_AGENT_SETTLEMENT'"
              >
                {{ 'labels.buttons.Cancel' | translate }}
              </button>
            }
            @if (settlementStatusCode(settlement?.status) === 'SUBMITTED' && !isMaker()) {
              <button
                mat-raised-button
                color="primary"
                (click)="executeCommand('approve')"
                *mifosxHasPermission="'APPROVE_AGENT_SETTLEMENT'"
              >
                {{ 'labels.buttons.Approve' | translate }}
              </button>
              <button
                mat-button
                color="warn"
                (click)="showRejectForm = true"
                *mifosxHasPermission="'REJECT_AGENT_SETTLEMENT'"
              >
                {{ 'labels.buttons.Reject' | translate }}
              </button>
            }
          </div>
          @if (showRejectForm) {
            <form [formGroup]="rejectForm" class="layout-row responsive-column gap-20px m-b-20">
              <mat-form-field class="flex-fill">
                <mat-label>{{ 'labels.inputs.Rejection Reason' | translate }}</mat-label>
                <input matInput formControlName="rejectionReason" required />
              </mat-form-field>
              <button
                mat-raised-button
                color="warn"
                type="button"
                [disabled]="rejectForm.invalid"
                (click)="rejectSettlement()"
              >
                {{ 'labels.buttons.Submit' | translate }}
              </button>
            </form>
          }
          <div class="layout-row responsive-column gap-20px">
            <p class="flex-30">
              <strong>{{ 'labels.inputs.Settlement Id' | translate }}:</strong> {{ settlement?.id }}
            </p>
            <p class="flex-30">
              <strong>{{ 'labels.inputs.Agent' | translate }}:</strong>
              {{ settlement?.agentName || settlement?.agentId }}
            </p>
            <p class="flex-30">
              <strong>{{ 'labels.inputs.Status' | translate }}:</strong> {{ displayValue(settlement?.status) }}
            </p>
          </div>
          <div class="layout-row responsive-column gap-20px">
            <p class="flex-30">
              <strong>{{ 'labels.inputs.Expected Amount' | translate }}:</strong>
              {{ settlement?.expectedAmount | number }}
            </p>
            <p class="flex-30">
              <strong>{{ 'labels.inputs.Submitted Amount' | translate }}:</strong>
              {{ settlement?.submittedAmount | number }}
            </p>
            <p class="flex-30">
              <strong>{{ 'labels.inputs.Reference Number' | translate }}:</strong> {{ settlement?.referenceNumber }}
            </p>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
    <div class="container">
      <div class="mat-elevation-z8 table-container">
        <table mat-table [dataSource]="dataSource">
          @for (column of displayedColumns; track column) {
            <ng-container [matColumnDef]="column">
              <th mat-header-cell *matHeaderCellDef>{{ columnLabel(column) | translate }}</th>
              <td mat-cell *matCellDef="let transaction">{{ displayCell(transaction, column) }}</td>
            </ng-container>
          }
          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
        </table>
      </div>
    </div>
  `,
  styles: [
    `
      .table-container {
        overflow: auto;
      }

      table {
        min-width: 960px;
        width: 100%;
      }
    `
  ],
  imports: AGENT_COLLECTION_COMPONENT_IMPORTS,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AgentSettlementDetailComponent implements OnInit {
  private organizationService = inject(OrganizationService);
  private authenticationService = inject(AuthenticationService);
  private formBuilder = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  private changeDetectorRef = inject(ChangeDetectorRef);

  settlement: any;
  showRejectForm = false;
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
