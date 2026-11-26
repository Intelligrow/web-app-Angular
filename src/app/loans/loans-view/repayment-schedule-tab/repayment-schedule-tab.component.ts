/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { Dates } from 'app/core/utils/dates';
import { TranslateService } from '@ngx-translate/core';
import {
  EditablePeriod,
  RepaymentScheduleDeleteChange,
  RepaymentScheduleEditChange,
  RepaymentSchedule,
  RepaymentSchedulePeriod,
  RepaymentScheduleEditCache
} from 'app/loans/models/loan-account.model';
import { ConfirmationDialogComponent } from 'app/shared/confirmation-dialog/confirmation-dialog.component';
import { SettingsService } from 'app/settings/settings.service';
import { FormDialogComponent } from 'app/shared/form-dialog/form-dialog.component';
import { DatepickerBase } from 'app/shared/form-dialog/formfield/model/datepicker-base';
import { FormfieldBase } from 'app/shared/form-dialog/formfield/model/formfield-base';
import { InputBase } from 'app/shared/form-dialog/formfield/model/input-base';

import { jsPDF, jsPDFOptions } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { NgClass, CurrencyPipe } from '@angular/common';
import { MatIconButton } from '@angular/material/button';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  MatTable,
  MatColumnDef,
  MatHeaderCellDef,
  MatHeaderCell,
  MatCellDef,
  MatCell,
  MatFooterCellDef,
  MatFooterCell,
  MatHeaderRowDef,
  MatHeaderRow,
  MatRowDef,
  MatRow,
  MatFooterRowDef,
  MatFooterRow
} from '@angular/material/table';
import { MatTooltip } from '@angular/material/tooltip';
import { DateFormatPipe } from '../../../pipes/date-format.pipe';
import { FormatNumberPipe } from '../../../pipes/format-number.pipe';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

@Component({
  selector: 'mifosx-repayment-schedule-tab',
  templateUrl: './repayment-schedule-tab.component.html',
  styleUrls: ['./repayment-schedule-tab.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    FaIconComponent,
    MatTable,
    MatColumnDef,
    MatHeaderCellDef,
    MatHeaderCell,
    MatCellDef,
    MatCell,
    MatFooterCellDef,
    MatFooterCell,
    NgClass,
    MatHeaderRowDef,
    MatHeaderRow,
    MatRowDef,
    MatRow,
    MatFooterRowDef,
    MatFooterRow,
    MatIconButton,
    MatTooltip,
    CurrencyPipe,
    DateFormatPipe,
    FormatNumberPipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RepaymentScheduleTabComponent implements OnInit, OnChanges {
  private route = inject(ActivatedRoute);
  private settingsService = inject(SettingsService);
  private dateUtils = inject(Dates);
  private dialog = inject(MatDialog);
  private translateService = inject(TranslateService);

  /** Currency Code */
  @Input() currencyCode: string;
  /** Loan Repayment Schedule to be Edited */
  @Input() forEditing = false;
  /** Loan Repayment Schedule Details Data */
  @Input() repaymentScheduleDetails: RepaymentSchedule | null = null;
  loanDetailsDataRepaymentSchedule: RepaymentSchedule | null = null;

  @Input() isEqualInstallment: boolean | null = false;
  @Input() isEqualPrincipal: boolean | null = false;
  @Input() isDecliningBalance: boolean | null = false;

  editCache: { [key: string]: RepaymentScheduleEditCache } = {};
  listOfData: RepaymentSchedulePeriod[] = [];

  repaymentSchedulePeriods: RepaymentSchedulePeriod[] = [];

  totalRepaymentExpected: number = 0;

  /** Stores if there is any waived amount */
  isWaived: boolean;
  /** Columns to be displayed in original schedule table. */
  displayedColumns: string[] = [
    'number',
    'days',
    'date',
    'paiddate',
    'check',
    'balanceOfLoan',
    'principalDue',
    'interest',
    'fees',
    'penalties',
    'due',
    'paid',
    'inadvance',
    'late',
    'waived',
    'outstanding'
  ];
  /** Columns to be displayed in editable schedule table. */
  displayedColumnsEdit: string[] = [
    'number',
    'date',
    'balanceOfLoan',
    'principalDue',
    'interest',
    'fees',
    'due',
    'actions'
  ];

  /** Form functions event */
  @Output() editPeriod = new EventEmitter<RepaymentScheduleEditChange>();
  @Output() deletePeriod = new EventEmitter<RepaymentScheduleDeleteChange>();

  businessDate: Date = new Date();

  private destroyRef = inject(DestroyRef);

  /**
   * Retrieves the loans with associations data from `resolve`.
   * @param {ActivatedRoute} route Activated Route.
   */
  constructor() {
    this.businessDate = this.settingsService.businessDate;
  }

  ngOnInit() {
    if (this.route.parent) {
      this.route.parent.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (data: { loanDetailsData: { repaymentSchedule?: RepaymentSchedule; currency?: { code: string } } }) => {
          this.loanDetailsDataRepaymentSchedule =
            data.loanDetailsData?.repaymentSchedule ?? this.getDefaultRepaymentSchedule();
          if (data.loanDetailsData?.currency?.code) {
            this.currencyCode = data.loanDetailsData.currency.code;
          }
          this.initializeRepaymentSchedule();
        },
        error: (err) => {
          console.error('Failed to load loan repayment schedule data:', err);
          this.loanDetailsDataRepaymentSchedule = this.getDefaultRepaymentSchedule();
          this.initializeRepaymentSchedule();
        }
      });
    } else {
      this.loanDetailsDataRepaymentSchedule = this.getDefaultRepaymentSchedule();
      this.initializeRepaymentSchedule();
    }
  }

  private initializeRepaymentSchedule(): void {
    if (!this.repaymentScheduleDetails) {
      this.repaymentScheduleDetails = this.loanDetailsDataRepaymentSchedule ?? this.getDefaultRepaymentSchedule();
    } else {
      this.repaymentScheduleDetails.periods ??= [];
      this.repaymentScheduleDetails.totalWaived ??= 0;
    }
    this.isWaived = (this.repaymentScheduleDetails.totalWaived ?? 0) > 0;
    this.updateEditCache();
  }

  private getDefaultRepaymentSchedule(): RepaymentSchedule {
    return {
      periods: [],
      totalWaived: 0,
      currency: {} as any,
      loanTermInDays: 0,
      totalPrincipalDisbursed: 0,
      totalPrincipalExpected: 0,
      totalPrincipalPaid: 0,
      totalInterestCharged: 0,
      totalFeeChargesCharged: 0,
      totalPenaltyChargesCharged: 0,
      totalWrittenOff: 0,
      totalRepaymentExpected: 0,
      totalRepayment: 0,
      totalPaidInAdvance: 0,
      totalPaidLate: 0,
      totalOutstanding: 0,
      totalCredits: 0
    };
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['repaymentScheduleDetails'] && !changes['repaymentScheduleDetails'].firstChange) {
      this.initializeRepaymentSchedule();
    }
    this.totalRepaymentExpected = 0;
    this.listOfData.forEach((item) => {
      this.totalRepaymentExpected = this.totalRepaymentExpected + item.totalDueForPeriod;
    });
  }

  installmentStyle(installment: RepaymentSchedulePeriod): string {
    if (installment.complete) {
      return 'paid';
    }
    const isCurrent: string = this.isCurrent(installment);
    if (isCurrent !== '') {
      return isCurrent;
    }
    if (installment.isAdditional) {
      return 'additional';
    } else if (installment.downPaymentPeriod) {
      return 'downpayment';
    }
    return '';
  }

  isCurrent(installment: RepaymentSchedulePeriod): string {
    if (!installment.fromDate) {
      return '';
    } else {
      this.businessDate = this.settingsService.businessDate;
      const fromDate = this.dateUtils.parseDate(installment.fromDate);
      const dueDate = this.dateUtils.parseDate(installment.dueDate);
      if (fromDate <= this.businessDate && this.businessDate < dueDate) {
        return 'current';
      }
      if (this.businessDate > dueDate) {
        return 'overdued';
      }
    }
    return '';
  }

  exportToPDF() {
    const businessDate = this.dateUtils.formatDate(this.settingsService.businessDate, Dates.DEFAULT_DATEFORMAT);
    const fileName = `repaymentschedule-${businessDate}.pdf`;

    const options: jsPDFOptions = {
      orientation: 'l',
      unit: 'in',
      format: 'letter',
      precision: 2,
      compress: true,
      putOnlyUsedFonts: true
    };
    const pdf = new jsPDF(options);

    autoTable(pdf, {
      html: '#repaymentSchedule',
      bodyStyles: { lineColor: [
          0,
          0,
          0
        ] },
      styles: {
        fontSize: 8,
        cellWidth: 'auto',
        halign: 'center'
      }
    });
    pdf.save(fileName);
  }

  editInstallment(period: RepaymentSchedulePeriod): void {
    if (period.period === undefined || period.period === null) {
      return;
    }
    const originalDueDate = this.dateUtils.formatDate(period.dueDate, this.settingsService.dateFormat);
    const periodKey = period.period.toString();
    if (this.editCache[periodKey]) {
      this.editCache[periodKey].edit = true;
    }
    const formfields: FormfieldBase[] = [
      new DatepickerBase({
        controlName: 'dueDate',
        label: 'Due Date',
        value: this.dateUtils.parseDate(period.dueDate),
        maxDate: this.settingsService.maxFutureDate,
        type: 'date',
        required: true
      })
    ];

    if (this.isDecliningBalance && this.isEqualInstallment) {
      formfields.push(
        new InputBase({
          controlName: 'installmentAmount',
          label: 'Installment Amount',
          value: period.totalDueForPeriod,
          type: 'number',
          required: true
        })
      );
    } else if (!this.isDecliningBalance || this.isEqualPrincipal) {
      formfields.push(
        new InputBase({
          controlName: 'principalDue',
          label: 'Principal Amount',
          value: period.principalDue,
          type: 'number',
          required: true
        })
      );
    }

    const data = {
      title: 'Period',
      formfields: formfields
    };
    const addDialogRef = this.dialog.open(FormDialogComponent, { data, width: '50rem' });
    addDialogRef.afterClosed().subscribe((response: { data?: { value?: Record<string, unknown> } }) => {
      const values = response?.data?.value;
      if (!values || !originalDueDate) {
        if (this.editCache[periodKey]) {
          this.editCache[periodKey].edit = false;
        }
        return;
      }

      const selectedDueDate = values.dueDate ?? period.dueDate;
      const modifiedDueDate = this.dateUtils.formatDate(selectedDueDate, this.settingsService.dateFormat);
      const installmentAmount = values.installmentAmount as number | undefined;
      const principal = values.principalDue as number | undefined;
      const updatedPeriod: EditablePeriod = {
        ...period,
        dueDate: this.dateUtils.parseDate(selectedDueDate) as unknown as number[],
        totalDueForPeriod:
          installmentAmount !== undefined && installmentAmount !== null ? installmentAmount : period.totalDueForPeriod,
        principalDue: principal !== undefined && principal !== null ? principal : period.principalDue,
        changed: true
      };
      const change: RepaymentScheduleEditChange = {
        period: updatedPeriod,
        change: {
          dueDate: originalDueDate,
          ...(modifiedDueDate && modifiedDueDate !== originalDueDate ? { modifiedDueDate } : {}),
          ...(installmentAmount !== undefined &&
          installmentAmount !== null &&
          installmentAmount !== period.totalDueForPeriod
            ? { installmentAmount }
            : {}),
          ...(principal !== undefined && principal !== null && principal !== period.principalDue ? { principal } : {})
        }
      };

      const periods = this.repaymentScheduleDetails?.periods ?? this.listOfData;
      const index = periods.findIndex((item) => item.period === period.period);
      if (index !== -1 && this.repaymentScheduleDetails) {
        const updatedPeriods = periods.map((item, itemIndex) => (itemIndex === index ? updatedPeriod : item));
        this.repaymentScheduleDetails = { ...this.repaymentScheduleDetails, periods: updatedPeriods };
      }
      if (this.editCache[periodKey]) {
        this.editCache[periodKey] = { data: updatedPeriod, edit: false };
      }
      this.editPeriod.emit(change);
    });
  }

  deleteInstallment(period: RepaymentSchedulePeriod): void {
    if (period.period === undefined || period.period === null) {
      return;
    }

    const dueDate = this.dateUtils.formatDate(period.dueDate, this.settingsService.dateFormat);
    if (!dueDate) {
      return;
    }

    const confirmationDialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        heading: this.translateService.instant('labels.heading.Delete Installment'),
        dialogContext: this.translateService.instant('labels.text.Are you sure you want to delete')
      }
    });
    confirmationDialogRef.afterClosed().subscribe((response: { confirm?: boolean }) => {
      if (response?.confirm) {
        this.deletePeriod.emit({ period: { ...period } as EditablePeriod, dueDate });
      }
    });
  }

  canEditInstallment(period: RepaymentSchedulePeriod): boolean {
    if (period.period === undefined || period.period === null) {
      return false;
    }

    const scheduledPeriods = (this.repaymentScheduleDetails?.periods ?? []).filter(
      (schedulePeriod) => schedulePeriod.period !== undefined && schedulePeriod.period !== null
    );
    const periodIndex = scheduledPeriods.findIndex((schedulePeriod) => schedulePeriod.period === period.period);

    return periodIndex !== -1 && periodIndex < scheduledPeriods.length - 1;
  }

  cancelEdit(id: string): void {
    const index = this.listOfData.findIndex((item) => item.period?.toString() === id);
    if (index === -1) {
      return;
    }
    this.editCache[id] = {
      data: { ...this.listOfData[index] },
      edit: false
    };
  }

  saveEdit(period: string): void {
    const index = this.listOfData.findIndex((item) => item.period?.toString() === period);
    if (index === -1) {
      return;
    }
    const updatedPeriod = { ...this.listOfData[index], ...this.editCache[period].data };
    this.listOfData = this.listOfData.map((item, itemIndex) => (itemIndex === index ? updatedPeriod : item));
    if (this.repaymentScheduleDetails) {
      this.repaymentScheduleDetails = { ...this.repaymentScheduleDetails, periods: this.listOfData };
    }
    this.editCache[period].edit = false;
    const dueDate = this.dateUtils.formatDate(updatedPeriod.dueDate, this.settingsService.dateFormat);
    if (dueDate) {
      this.editPeriod.emit({
        period: { ...updatedPeriod, changed: true },
        change: { dueDate }
      });
    }
  }

  updateEditCache(): void {
    this.editCache = {};
    if (this.repaymentScheduleDetails?.periods) {
      this.listOfData = this.repaymentScheduleDetails.periods;
      this.totalRepaymentExpected = 0;
      this.listOfData.forEach((item) => {
        this.editCache[item.period] = {
          edit: false,
          data: { ...item }
        };
        this.totalRepaymentExpected = this.totalRepaymentExpected + item.totalDueForPeriod;
      });
    }
  }

  numberOnly(inputFormControl: { value: string }, event: KeyboardEvent): boolean {
    const charCode = event.which ? event.which : event.keyCode;
    if (charCode === 46) {
      if (!(inputFormControl.value.indexOf('.') > -1)) {
        return true;
      }
      return false;
    } else if (charCode > 31 && (charCode < 48 || charCode > 57)) {
      return false;
    }
    return true;
  }
}
