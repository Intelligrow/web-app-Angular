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
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

/** rxjs Imports */
import { forkJoin, of, take } from 'rxjs';
import { catchError } from 'rxjs/operators';

/** Custom Imports */
import { OrganizationService } from '../../organization.service';
import { AGENT_COLLECTION_COMPONENT_IMPORTS } from '../agent-collections-imports';
import { AGENT_COLLECTION_TRANSACTION_TYPES, AgentCollectionOption } from '../agent-collections.models';

@Component({
  selector: 'mifosx-agent-collection-form',
  templateUrl: './agent-collection-form.component.html',
  styleUrl: './agent-collection-form.component.scss',
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
