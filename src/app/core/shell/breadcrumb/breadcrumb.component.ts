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
  TemplateRef,
  ElementRef,
  ViewChild,
  AfterViewInit,
  inject
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, NavigationEnd, Data, PRIMARY_OUTLET } from '@angular/router';

/** rxjs Imports */
import { filter } from 'rxjs/operators';
import { merge } from 'rxjs';

/** Custom Model */
import { Breadcrumb } from './breadcrumb.model';

/** Custom Services */
import { PopoverService } from '../../../configuration-wizard/popover/popover.service';
import { ConfigurationWizardService } from '../../../configuration-wizard/configuration-wizard.service';
import { TranslateService } from '@ngx-translate/core';
import { MatIcon } from '@angular/material/icon';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { formatTabLabel } from 'app/shared/utils/format-tab-label.util';

/**
 * Route data property to generate breadcrumb using a static string.
 *
 * Example- breadcrumb: 'Home'
 */
const routeDataBreadcrumb = 'breadcrumb';
/**
 * Route data property to generate breadcrumb using given route parameter name.
 *
 * Example- routeParamBreadcrumb: 'id'
 */
const routeParamBreadcrumb = 'routeParamBreadcrumb';
/**
 * Route data property to generate breadcrumb using resolved data property name.
 *
 * Use array to specify name for a nested object property.
 *
 * Example- routeResolveBreadcrumb: ['user', 'username']
 */
const routeResolveBreadcrumb = 'routeResolveBreadcrumb';
/**
 * Route data property to specify whether generated breadcrumb should have a link.
 *
 * True by default. Specify false if a link is not required.
 *
 * Example- addBreadcrumbLink: false
 */
const routeAddBreadcrumbLink = 'addBreadcrumbLink';

/**
 * Account "group" URL segments, for example /clients/154/loans-accounts.
 *
 * These URLs have no page of their own. A crumb pointing at one of them is
 * redirected to the account that is currently open: {group}/{accountId}/{tab}.
 *
 * The value is the list of account tabs the crumb may keep (for example when
 * the user is on the Transactions tab, "Loans" links back to Transactions).
 * Any other segment after the account id (actions, edit pages, transaction ids...)
 * falls back to 'general'.
 */
const ACCOUNT_GROUP_TABS: Record<string, string[]> = {
  'loans-accounts': [
    'general',
    'dashboard',
    'account-details',
    'repayment-schedule',
    'transactions',
    'delinquency-tags',
    'originators',
    'loan-collateral-details',
    'term-variations'
  ],
  'savings-accounts': [
    'general',
    'transactions'
  ],
  'shares-accounts': ['general'],
  'fixed-deposits-accounts': [
    'general',
    'transactions'
  ],
  'recurring-deposits-accounts': [
    'general',
    'transactions'
  ]
};

/** Matches any URL that is inside an account, e.g. /clients/154/loans-accounts/303/... */
const ACCOUNT_URL_PATTERN = new RegExp(`/(${Object.keys(ACCOUNT_GROUP_TABS).join('|')})/\\d+`);

/**
 * Matches the route URL of an account group crumb (".../savings-accounts")
 * or of an account crumb (".../savings-accounts/1").
 * Group 1 = group URL, group 2 = account id (only for an account crumb).
 */
const ACCOUNT_CRUMB_PATTERN = new RegExp(`^(.*/(?:${Object.keys(ACCOUNT_GROUP_TABS).join('|')}))(?:/(\\d+))?$`);

/** A crumb together with the plain URL of its route (before any link is disabled or replaced). */
interface RawCrumb extends Breadcrumb {
  routeUrl: string;
}

/**
 * Generate breadcrumbs dynamically via route configuration.
 */
@Component({
  selector: 'mifosx-breadcrumb',
  templateUrl: './breadcrumb.component.html',
  styleUrls: ['./breadcrumb.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatIcon
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BreadcrumbComponent implements AfterViewInit {
  private activatedRoute = inject(ActivatedRoute);
  private router = inject(Router);
  protected configurationWizardService = inject(ConfigurationWizardService);
  private popoverService = inject(PopoverService);
  private translateService = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  /** Array of breadcrumbs. */
  breadcrumbs: Breadcrumb[] = [];
  /* Reference of breadcrumb */
  @ViewChild('breadcrumb') breadcrumb: ElementRef<any>;
  /* Template for popover on breadcrumb */
  @ViewChild('templateBreadcrumb') templateBreadcrumb: TemplateRef<any>;

  /**
   * Generates the breadcrumbs on every navigation and on every language change.
   */
  constructor() {
    this.generateBreadcrumbs();
  }

  /** Title of the page: the label of the last crumb. */
  get pageTitle(): string {
    const last = this.breadcrumbs[this.breadcrumbs.length - 1];
    return last ? this.getTranslate(last.label) : '';
  }

  /**
   * Regenerates the breadcrumbs when navigation ends or the language changes.
   */
  generateBreadcrumbs() {
    const onNavigationEnd = this.router.events.pipe(filter((event) => event instanceof NavigationEnd));

    merge(onNavigationEnd, this.translateService.onLangChange)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        try {
          this.breadcrumbs = this.applyAccountLinks(this.buildBreadcrumbs());
        } catch (error) {
          // Never keep the crumbs of the previous page: wrong crumbs are worse than none.
          console.error('Breadcrumb generation failed', error);
          this.breadcrumbs = [];
        }
        this.cdr.markForCheck();
      });
  }

  /**
   * Walks the primary route tree and builds one crumb per route that has a label.
   * Every crumb gets the URL of the route it belongs to. The running URL is never modified
   * for a single crumb, so a custom link of one crumb cannot leak into the crumbs below it.
   */
  private buildBreadcrumbs(): RawCrumb[] {
    const crumbs: RawCrumb[] = [];
    let currentRoute: ActivatedRoute | undefined = this.activatedRoute.root;
    let currentUrl = '';

    while (currentRoute) {
      const route: ActivatedRoute | undefined = currentRoute.children.find((child) => child.outlet === PRIMARY_OUTLET);
      if (!route) {
        break;
      }
      currentRoute = route;

      const routeURL = route.snapshot.url.map((segment) => segment.path).join('/');
      currentUrl += `/${routeURL}`;
      const routeUrl = this.normalizeUrl(currentUrl);

      let label: any = currentUrl === '/' ? 'Home' : false;
      let url: string | false | undefined;

      if (route.routeConfig && route.routeConfig.data) {
        const data: Data = route.snapshot.data;
        const resolved = this.resolveLabel(route);
        if (resolved.label) {
          label = resolved.label;
        }

        if (data.hasOwnProperty(routeAddBreadcrumbLink)) {
          const link = data[routeAddBreadcrumbLink];
          url = link === false ? false : typeof link === 'string' ? link : routeUrl;
        } else if (resolved.isClient) {
          // The client crumb opens the General tab of the client.
          url = `${routeUrl}/general`;
        } else {
          url = routeUrl;
        }
      }

      if (label) {
        crumbs.push({ label: String(label), url: url || undefined, routeUrl });
      }
    }

    return crumbs;
  }

  /**
   * Finds the label of a route from its data.
   * Returns isClient = true for the crumb of a client.
   */
  private resolveLabel(route: ActivatedRoute): { label: any; isClient: boolean } {
    const data: Data = route.snapshot.data;

    // 1. Label from resolved data
    if (data.hasOwnProperty(routeResolveBreadcrumb) && data[routeResolveBreadcrumb]) {
      let label: any = data;
      data[routeResolveBreadcrumb].forEach((property: any) => {
        label = label?.[property];
      });
      return { label, isClient: false };
    }

    // 2. Label from a route parameter (and, for entities, from their resolved data)
    if (data.hasOwnProperty(routeParamBreadcrumb)) {
      const paramName: string = data[routeParamBreadcrumb];
      let label: any = route.snapshot.paramMap.get(paramName);
      if (label) {
        if (paramName === 'datatableName') {
          label = formatTabLabel(label);
        }
        const entityLabel = this.getEntityLabel(data[routeDataBreadcrumb], data);
        if (entityLabel) {
          label = entityLabel;
        }
        return { label, isClient: data[routeDataBreadcrumb] === 'Clients' };
      }
    }

    // 3. Static label
    if (data.hasOwnProperty(routeDataBreadcrumb)) {
      return { label: data[routeDataBreadcrumb], isClient: false };
    }

    return { label: undefined, isClient: false };
  }

  /**
   * Label of an entity page (client, loan, savings account, product...) taken from the resolved data.
   * Returns undefined when the data is missing so the route parameter is used instead.
   */
  private getEntityLabel(key: string, data: Data): string | undefined {
    switch (key) {
      case 'Clients':
        return this.printableValue(data.clientViewData?.displayName);
      case 'Groups':
        return data.groupViewData?.name;
      case 'Centers':
        return data.centerViewData?.name;
      case 'Loans':
        return data.loanDetailsData
          ? this.printableValue(data.loanDetailsData.loanProductName) + ' (' + data.loanDetailsData.accountNo + ')'
          : undefined;
      case 'Savings': {
        const savingsProductName = data.savingsAccountData?.savingsProductName ?? '';
        const accountNo = data.savingsAccountData?.accountNo ?? '';
        return this.printableValue(savingsProductName) + (accountNo ? ' (' + accountNo + ')' : '');
      }
      case 'Fixed Deposits':
        return data.fixedDepositsAccountData
          ? this.printableValue(data.fixedDepositsAccountData.depositProductName) +
              ' (' +
              data.fixedDepositsAccountData.accountNo +
              ')'
          : undefined;
      case 'Loan Products':
        return this.printableValue(data.loanProduct?.name);
      case 'Charges':
        return data.loansAccountCharge?.name;
      case 'Saving Products':
        return data.savingProduct?.name;
      case 'Share Products':
        return data.shareProduct?.name;
      case 'Fixed Deposit Products':
        return data.fixedDepositProduct?.name;
      case 'Recurring Deposit Products':
        return data.recurringDepositProduct?.name;
      case 'Floating Rates':
        return data.floatingRate?.name;
      case 'Tax Components':
        return data.taxComponent?.name;
      case 'Tax Groups':
        return data.taxGroup?.name;
      default:
        return undefined;
    }
  }

  /**
   * Post-processes the crumbs:
   *  1. A group crumb (".../loans-accounts") is replaced with the link of the open account:
   *     {group}/{accountId}/{tab}. If no account is open it links to the previous crumb.
   *  2. Crumbs inside an account keep the productType query param of the current page.
   */
  private applyAccountLinks(crumbs: RawCrumb[]): Breadcrumb[] {
    const tree = this.router.parseUrl(this.router.url);
    const primary = tree.root.children[PRIMARY_OUTLET];
    const currentPath = this.normalizeUrl('/' + (primary ? primary.segments.map((s) => s.path).join('/') : ''));
    const productType = tree.queryParams['productType'];

    const result: Breadcrumb[] = [];

    crumbs.forEach((crumb) => {
      let url = crumb.url;

      // Decided from the route URL, not from the crumb link, so it also works
      // when the route has addBreadcrumbLink: false or no link at all.
      const match = crumb.routeUrl.match(ACCOUNT_CRUMB_PATTERN);
      if (match) {
        const groupUrl = match[1];
        const accountId = match[2];
        const allowedTabs = ACCOUNT_GROUP_TABS[groupUrl.substring(groupUrl.lastIndexOf('/') + 1)];

        if (!accountId) {
          // Group crumb (e.g. "Savings", "Loans"): link to the open account, on the current tab.
          url = this.resolveAccountUrl(groupUrl, currentPath, allowedTabs) ?? result[result.length - 1]?.url;
        } else if (!url) {
          // Account crumb without a link: link to the General tab of that account.
          url = `${groupUrl}/${accountId}/general`;
        }
      }

      const queryParams = url && productType && ACCOUNT_URL_PATTERN.test(url) ? { productType } : undefined;
      result.push({ label: crumb.label, url, queryParams });
    });

    return result;
  }

  /**
   * Builds {groupUrl}/{accountId}/{tab} from the current page path.
   * Returns undefined when the current page is not inside an account of that group.
   */
  private resolveAccountUrl(groupUrl: string, currentPath: string, allowedTabs: string[]): string | undefined {
    if (!currentPath.startsWith(groupUrl + '/')) {
      return undefined;
    }
    const [
      accountId,
      tab
    ] = currentPath.substring(groupUrl.length + 1).split('/');
    if (!accountId || !/^\d+$/.test(accountId)) {
      return undefined;
    }
    return `${groupUrl}/${accountId}/${tab && allowedTabs.includes(tab) ? tab : 'general'}`;
  }

  /**
   * Removes duplicate and trailing slashes. The root stays '/'.
   */
  private normalizeUrl(url: string): string {
    const cleaned = url.replace(/\/+/g, '/');
    return cleaned.length > 1 ? cleaned.replace(/\/$/, '') : cleaned || '/';
  }

  printableValue(value: string): string {
    if (!value) {
      return '';
    }
    if (value.length <= 30) {
      return value;
    }
    return value.substring(0, 30) + '...';
  }

  /**
   * Popover function
   * @param template TemplateRef<any>.
   * @param target HTMLElement | ElementRef<any>.
   * @param position String.
   * @param backdrop Boolean.
   */
  showPopover(
    template: TemplateRef<any>,
    target: HTMLElement | ElementRef<any>,
    position: string,
    backdrop: boolean
  ): void {
    setTimeout(() => this.popoverService.open(template, target, position, backdrop, {}), 200);
  }

  /**
   * To show popover.
   */
  ngAfterViewInit() {
    if (this.configurationWizardService.showBreadcrumbs) {
      setTimeout(() => {
        this.showPopover(this.templateBreadcrumb, this.breadcrumb.nativeElement, 'bottom', true);
      });
    }
  }

  /**
   * Next Step (Home) Configuration Wizard.
   */
  nextStep() {
    this.configurationWizardService.showBreadcrumbs = false;
    this.configurationWizardService.showHome = true;
    this.router.routeReuseStrategy.shouldReuseRoute = () => false;
    this.router.onSameUrlNavigation = 'reload';
    this.router.navigate(['/home']);
  }

  /**
   * Previous Step (SideNavBar) Configuration Wizard.
   */
  previousStep() {
    this.configurationWizardService.showBreadcrumbs = false;
    this.configurationWizardService.showSideNavChartofAccounts = true;
    this.router.routeReuseStrategy.shouldReuseRoute = () => false;
    this.router.onSameUrlNavigation = 'reload';
    this.router.navigate(['/home']);
  }

  getTranslate(text: string): any {
    if (!text) {
      return '';
    }

    // First try labels.text.* (for static breadcrumb labels)
    let key: string = 'labels.text.' + text;
    let translation = this.translateService.instant(key);
    if (translation !== key) {
      return translation;
    }

    // Then try labels.menus.* (for action names like "View Guarantors")
    key = 'labels.menus.' + text;
    translation = this.translateService.instant(key);
    if (translation !== key) {
      return translation;
    }

    // If no translation found, return the original text
    return text;
  }
}
