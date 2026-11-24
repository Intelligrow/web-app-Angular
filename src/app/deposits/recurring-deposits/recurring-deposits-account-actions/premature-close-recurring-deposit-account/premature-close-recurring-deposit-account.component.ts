
/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { UntypedFormGroup, UntypedFormBuilder, Validators, UntypedFormControl} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

/** Custom Services */
import { RecurringDepositsService } from '../../recurring-deposits.service';
import { SettingsService } from 'app/settings/settings.service';
import { Dates } from 'app/core/utils/dates';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

/**
 * Premature Close Recurring Deposits Account Component
 */
@Component({
  selector: 'mifosx-premature-close-recurring-deposit-account',
  templateUrl: './premature-close-recurring-deposit-account.component.html',
  styleUrls: ['./premature-close-recurring-deposit-account.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    CdkTextareaAutosize
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PrematureCloseRecurringDepositAccountComponent implements OnInit {
  private formBuilder = inject(UntypedFormBuilder);
  private recurringDepositsService = inject(RecurringDepositsService);
  private dateUtils = inject(Dates);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private settingsService = inject(SettingsService);

  /** Minimum date allowed. */
  minDate = new Date(2000, 0, 1);
  /** Maximum date allowed. */
  maxDate = new Date();
  /** premature close Recurring Deposits Account form. */
  prematureCloseRecurringDepositsAccountForm: UntypedFormGroup;
  /** Savings Account Data */
  savingsAccountsData: any;
  /** On account Closure Options */
  onAccountClosureOptions: any;
  /** Recurring Deposits Account Id */
  accountId: any;

  /** Form submission event */
  isSubmitted = false;

  constructor() {
    this.accountId = this.route.parent.snapshot.params['recurringDepositAccountId'];
  }

  /**
   * Creates the premature close recurring deposits form.
   */
  ngOnInit() {
    this.maxDate = this.settingsService.businessDate;
    this.createPrematureCloseRecurringDepositsAccountForm();
    this.buildDependencies();
  }

  /**
   * Creates the premature close RD account form.
   */
  createPrematureCloseRecurringDepositsAccountForm() {
    this.prematureCloseRecurringDepositsAccountForm = this.formBuilder.group({
      closedOnDate: [
        '',
        Validators.required
      ]
    });
  }

  /**
   * Subscribes to value changes of parent control.
   */
  buildDependencies() {
    this.prematureCloseRecurringDepositsAccountForm.get('closedOnDate').valueChanges.subscribe((value: Date) => {
      if (!this.isSubmitted) {
        this.calculatePrematureAmount(value);
      }
    });
  }

  /**
   * Calculates premature amount based on closed on date.
   * @param {Date} date Premature Close Date
   */
  calculatePrematureAmount(date: Date) {
    const locale = this.settingsService.language.code;
    const dateFormat = this.settingsService.dateFormat;

    const data = {
      closedOnDate: this.dateUtils.formatDate(date, dateFormat),
      dateFormat,
      locale
    };

    this.recurringDepositsService
      .executeRecurringDepositsAccountCommand(this.accountId, 'calculatePrematureAmount', data)
      .subscribe((response: any) => {
        this.savingsAccountsData = response.savingsAccounts;
        this.onAccountClosureOptions = response.onAccountClosureOptions;

        this.prematureCloseRecurringDepositsAccountForm.addControl(
          'maturityAmount',
          new UntypedFormControl({ value: '', disabled: true })
        );

        this.prematureCloseRecurringDepositsAccountForm.addControl(
          'onAccountClosureId',
          new UntypedFormControl('', Validators.required)
        );

        this.prematureCloseRecurringDepositsAccountForm.addControl(
          'note',
          new UntypedFormControl('')
        );

        this.prematureCloseRecurringDepositsAccountForm.get('maturityAmount').patchValue(response.maturityAmount);

        this.addTransferDetails();
      });
  }

  /**
   * Subscribes to value changes of onAccountClosureId.
   */
  addTransferDetails() {
    this.prematureCloseRecurringDepositsAccountForm.get('onAccountClosureId').valueChanges.subscribe((id: any) => {
      if (id === 200) {
        this.prematureCloseRecurringDepositsAccountForm.addControl(
          'toSavingsAccountId',
          new UntypedFormControl('', Validators.required)
        );

        this.prematureCloseRecurringDepositsAccountForm.addControl(
          'transferDescription',
          new UntypedFormControl('')
        );
      } else {
        this.prematureCloseRecurringDepositsAccountForm.removeControl('toSavingsAccountId');
        this.prematureCloseRecurringDepositsAccountForm.removeControl('transferDescription');
      }
    });
  }

  /**
   * Submits the form and prematurely closes the recurring deposit account.
   */
  submit() {
    const prematureCloseRecurringDepositsAccountFormData = this.prematureCloseRecurringDepositsAccountForm.value;
    this.isSubmitted = true;
    const locale = this.settingsService.language.code;
    const dateFormat = this.settingsService.dateFormat;
    const prevClosedOnDate: Date = prematureCloseRecurringDepositsAccountFormData.closedOnDate;
    if (prematureCloseRecurringDepositsAccountFormData.closedOnDate instanceof Date) {
      prematureCloseRecurringDepositsAccountFormData.closedOnDate = this.dateUtils.formatDate(
        prevClosedOnDate,
        dateFormat
      );
    }
    const data = {
      ...prematureCloseRecurringDepositsAccountFormData,
      dateFormat,
      locale
    };
    this.recurringDepositsService
      .executeRecurringDepositsAccountCommand(this.accountId, 'prematureClose', data)
      .subscribe(() => {
        this.router.navigate(['../../'], { relativeTo: this.route });
      });
  }
}
