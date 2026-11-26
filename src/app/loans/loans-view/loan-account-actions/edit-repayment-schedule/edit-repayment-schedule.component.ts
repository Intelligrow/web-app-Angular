/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { Dates } from 'app/core/utils/dates';
import {
  EditableRepaymentSchedule,
  EditablePeriod,
  DeletedInstallment,
  RepaymentScheduleDeleteChange,
  RepaymentScheduleEditChange,
  ScheduleChangeRecord
} from 'app/loans/models/loan-account.model';
import { ConfirmationDialogComponent } from 'app/shared/confirmation-dialog/confirmation-dialog.component';
import { FormDialogComponent } from 'app/shared/form-dialog/form-dialog.component';
import { FormfieldBase } from 'app/shared/form-dialog/formfield/model/formfield-base';
import { InputBase } from 'app/shared/form-dialog/formfield/model/input-base';
import { SelectBase } from 'app/shared/form-dialog/formfield/model/select-base';
import { RepaymentScheduleTabComponent } from '../../repayment-schedule-tab/repayment-schedule-tab.component';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { LoanAccountActionsBaseComponent } from '../loan-account-actions-base.component';
import { EnumOptionData } from 'app/shared/models/option-data.model';

@Component({
  selector: 'mifosx-edit-repayment-schedule',
  templateUrl: './edit-repayment-schedule.component.html',
  styleUrls: ['./edit-repayment-schedule.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    RepaymentScheduleTabComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditRepaymentScheduleComponent extends LoanAccountActionsBaseComponent implements OnInit {
  private dialog = inject(MatDialog);
  private dateUtils = inject(Dates);
  private translateService = inject(TranslateService);
  private changeDetectorRef = inject(ChangeDetectorRef);

  /** Indicates If the Schedule has been changed */
  wasChanged = false;
  /** Indicates If the Schedule has been validated */
  wasValidated = false;
  /** Stores the Repayment Schedule data */
  repaymentScheduleDetails: EditableRepaymentSchedule | null = null;
  /** Stores the Installments changed */
  repaymentScheduleChanges: Record<string, ScheduleChangeRecord> = {};
  /** Stores installments marked for deletion */
  deletedInstallments: Record<string, DeletedInstallment> = {};
  amortizationType: EnumOptionData | null = null;
  interestType: EnumOptionData | null = null;
  isEqualInstallment: boolean | null = false;
  isEqualPrincipal: boolean | null = false;
  isDecliningBalance: boolean | null = false;

  constructor() {
    super();
    this.getRepaymentSchedule();
  }

  ngOnInit(): void {
    this.repaymentScheduleChanges = {};
    this.deletedInstallments = {};
  }

  getRepaymentSchedule(): void {
    this.repaymentScheduleChanges = {};
    this.deletedInstallments = {};
    this.wasChanged = false;
    this.wasValidated = false;
    this.loanService.getLoanAccountResource(this.loanId, 'repaymentSchedule').subscribe({
      next: (response: {
        repaymentSchedule: EditableRepaymentSchedule;
        amortizationType: EnumOptionData;
        interestType: EnumOptionData;
      }) => {
        this.repaymentScheduleDetails = {
          ...response.repaymentSchedule,
          periods: response.repaymentSchedule.periods.map((period: EditablePeriod) => ({ ...period, changed: false }))
        };
        this.isDecliningBalance = response.interestType && response.interestType.id === 0;
        this.isEqualInstallment = response.amortizationType && response.amortizationType.id === 1;
        this.isEqualPrincipal = response.amortizationType && response.amortizationType.id === 0;
        this.changeDetectorRef.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load repayment schedule:', err);
      }
    });
  }

  onPeriodEdited(edit: RepaymentScheduleEditChange): void {
    if (!this.repaymentScheduleDetails) {
      return;
    }

    this.recordScheduleChange(edit.change);
    this.repaymentScheduleDetails = {
      ...this.repaymentScheduleDetails,
      periods: this.repaymentScheduleDetails.periods.map((period) =>
        period.period === edit.period.period ? edit.period : period
      )
    };
    this.wasChanged = true;
    this.wasValidated = false;
    this.changeDetectorRef.markForCheck();
  }

  onPeriodDeleted(edit: RepaymentScheduleDeleteChange): void {
    if (!this.repaymentScheduleDetails) {
      return;
    }

    const existingKey = Object.keys(this.repaymentScheduleChanges).find(
      (key) => key === edit.dueDate || this.repaymentScheduleChanges[key].modifiedDueDate === edit.dueDate
    );
    const originalDueDate = existingKey ?? edit.dueDate;
    const changes = { ...this.repaymentScheduleChanges };
    if (existingKey) {
      delete changes[existingKey];
    }

    this.repaymentScheduleChanges = changes;
    this.deletedInstallments = {
      ...this.deletedInstallments,
      [originalDueDate]: { dueDate: originalDueDate }
    };
    this.repaymentScheduleDetails = {
      ...this.repaymentScheduleDetails,
      periods: this.repaymentScheduleDetails.periods.filter((period) => period.period !== edit.period.period)
    };
    this.wasChanged = true;
    this.wasValidated = false;
    this.changeDetectorRef.markForCheck();
  }

  applyPattern(): void {
    if (!this.repaymentScheduleDetails) {
      return;
    }

    const periods: Array<{ idx: number; dueDate: string }> = [];
    this.repaymentScheduleDetails.periods.forEach((period: EditablePeriod) => {
      if (period.period) {
        periods.push({
          idx: period.period,
          dueDate: this.dateUtils.formatDate(period.dueDate, this.settingsService.dateFormat)
        });
      }
    });
    const formfields: FormfieldBase[] = [
      new SelectBase({
        controlName: 'fromPeriod',
        label: 'From Date',
        value: '',
        options: { label: 'dueDate', value: 'idx', data: periods },
        required: true
      }),
      new SelectBase({
        controlName: 'toPeriod',
        label: 'To Date',
        value: '',
        options: { label: 'dueDate', value: 'idx', data: periods },
        required: true
      })
    ];
    if (this.isDecliningBalance && this.isEqualInstallment) {
      formfields.push(
        new InputBase({
          controlName: 'installmentAmount',
          label: 'Installment Amount',
          value: '',
          type: 'number',
          required: true
        })
      );
    } else if (!this.isDecliningBalance || this.isEqualPrincipal) {
      formfields.push(
        new InputBase({
          controlName: 'principal',
          label: 'Principal Amount',
          value: '',
          type: 'number',
          required: true
        })
      );
    }

    const data = {
      title: 'Pattern Update',
      formfields: formfields
    };
    const addDialogRef = this.dialog.open(FormDialogComponent, { data });
    addDialogRef
      .afterClosed()
      .subscribe(
        (response: {
          data?: { value?: { fromPeriod: number; toPeriod: number; installmentAmount: number; principal: number } };
        }) => {
          if (response.data?.value && this.repaymentScheduleDetails) {
            const fromPeriod = response.data.value.fromPeriod;
            const toPeriod = response.data.value.toPeriod;
            const installmentAmount = response.data.value.installmentAmount;
            const principal = response.data.value.principal;
            const periodsVariation: EditablePeriod[] = this.repaymentScheduleDetails.periods.map(
              (period: EditablePeriod) => {
                const dueDate = this.dateUtils.formatDate(period.dueDate, this.settingsService.dateFormat);
                if (period.period && fromPeriod <= period.period && toPeriod >= period.period) {
                  const installmentChanged =
                    installmentAmount !== null &&
                    installmentAmount !== undefined &&
                    period.totalDueForPeriod !== installmentAmount;
                  const principalChanged =
                    principal !== null && principal !== undefined && period.principalDue !== principal;
                  if (installmentChanged || principalChanged) {
                    this.recordScheduleChange({
                      dueDate,
                      ...(installmentChanged ? { installmentAmount } : {}),
                      ...(principalChanged ? { principal } : {})
                    });
                    this.wasChanged = true;
                    return {
                      ...period,
                      ...(installmentChanged ? { totalDueForPeriod: installmentAmount } : {}),
                      ...(principalChanged ? { principalDue: principal } : {}),
                      changed: true
                    };
                  }
                }
                return period;
              }
            );
            this.repaymentScheduleDetails = { ...this.repaymentScheduleDetails, periods: periodsVariation };
            this.wasValidated = false;
            this.changeDetectorRef.markForCheck();
          }
        }
      );
  }

  reset(): void {
    const recoverScheduleDialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        heading: this.translateService.instant('labels.heading.Recover Original Schedule'),
        dialogContext: this.translateService.instant(
          'labels.dialogContext.Are you sure you want recover the Original Schedule'
        )
      }
    });
    recoverScheduleDialogRef.afterClosed().subscribe((responseConfirmation: { confirm?: boolean }) => {
      if (responseConfirmation.confirm) {
        this.loanService.applyCommandLoanScheduleVariations(this.loanId, 'deleteVariations', {}).subscribe({
          next: () => {
            this.getRepaymentSchedule();
            this.wasChanged = false;
            this.wasValidated = false;
            this.changeDetectorRef.markForCheck();
          },
          error: (err) => {
            console.error('Failed to delete schedule variations:', err);
          }
        });
      }
    });
  }

  validate(): void {
    if (!this.repaymentScheduleDetails) {
      return;
    }

    this.loanService
      .applyCommandLoanScheduleVariations(this.loanId, 'calculateLoanSchedule', this.getPayload())
      .subscribe({
        next: (response: EditableRepaymentSchedule) => {
          if (this.repaymentScheduleDetails) {
            this.repaymentScheduleDetails = {
              ...this.repaymentScheduleDetails,
              periods: response.periods.map((period: EditablePeriod) => ({ ...period, changed: true }))
            };
            this.wasValidated = true;
            this.changeDetectorRef.markForCheck();
          }
        },
        error: (err) => {
          console.error('Failed to calculate loan schedule:', err);
        }
      });
  }

  submit(): void {
    this.loanService.applyCommandLoanScheduleVariations(this.loanId, 'addVariations', this.getPayload()).subscribe({
      next: () => {
        this.gotoLoanView('repayment-schedule');
      },
      error: (err) => {
        console.error('Failed to add schedule variations:', err);
      }
    });
  }

  private getPayload(): {
    exceptions: { modifiedinstallments: ScheduleChangeRecord[]; deletedinstallments: DeletedInstallment[] };
    dateFormat: string;
    locale: string;
  } {
    const modifiedinstallments: ScheduleChangeRecord[] = [];
    Object.keys(this.repaymentScheduleChanges).forEach((key: string) => {
      modifiedinstallments.push(this.repaymentScheduleChanges[key]);
    });
    const deletedinstallments = Object.keys(this.deletedInstallments).map(
      (key: string) => this.deletedInstallments[key]
    );
    const dateFormat = this.settingsService.dateFormat;
    const locale = this.settingsService.language.code;
    return {
      exceptions: {
        modifiedinstallments,
        deletedinstallments
      },
      dateFormat,
      locale
    };
  }

  private recordScheduleChange(change: ScheduleChangeRecord): void {
    const existingKey = Object.keys(this.repaymentScheduleChanges).find(
      (key) => key === change.dueDate || this.repaymentScheduleChanges[key].modifiedDueDate === change.dueDate
    );
    const key = existingKey ?? change.dueDate;
    const existingChange = existingKey ? this.repaymentScheduleChanges[existingKey] : undefined;
    const mergedChange: ScheduleChangeRecord = {
      ...existingChange,
      ...change,
      dueDate: existingChange?.dueDate ?? change.dueDate
    };

    if (mergedChange.modifiedDueDate === mergedChange.dueDate) {
      delete mergedChange.modifiedDueDate;
    }

    const changes = { ...this.repaymentScheduleChanges };
    if (existingKey && existingKey !== key) {
      delete changes[existingKey];
    }
    changes[key] = mergedChange;
    this.repaymentScheduleChanges = changes;
  }
}
