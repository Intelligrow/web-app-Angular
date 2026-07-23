/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

/** rxjs Imports */
import { catchError, map, Observable, of } from 'rxjs';

export type OrganizationType = 'NBFC' | 'MFI' | 'SMALL_INSTITUTION';

export interface TenantFeature {
  icon: 'shield-alt' | 'users' | 'globe' | 'chart-line' | 'money-bill' | 'handshake' | 'file-alt' | 'calendar-check';
  labelKey: string;
}

export interface TenantBranding {
  organizationType: OrganizationType;
  theme: 'nbfc' | 'mfi' | 'small-institution';
  shortNameKey: string;
  titleKey: string;
  subtitleKey: string;
  trustTitleKey: string;
  trustTextKey: string;
  features: TenantFeature[];
  logoUrl?: string;
  logoUrlDark?: string;
  heroImageUrl?: string;
}

interface TenantConfigResponse {
  organizationType?: string;
  subscriptionPlan?: string;
  branding?: {
    logoUrl?: string;
    logoUrlDark?: string;
    heroImageUrl?: string;
  };
}

@Injectable({ providedIn: 'root' })
export class TenantBrandingService {
  private http = inject(HttpClient);

  getTenantBranding(tenantId: string): Observable<TenantBranding> {
    const params = new HttpParams().set('tenantIdentifier', tenantId);

    return this.http.get<TenantConfigResponse>('/tenant/config', { params }).pipe(
      map((response) => this.mergeConfig(response)),
      catchError(() => of(this.getFallbackBranding('NBFC')))
    );
  }

  getFallbackBranding(type: OrganizationType): TenantBranding {
    const variants: Record<OrganizationType, TenantBranding> = {
      NBFC: {
        organizationType: 'NBFC',
        theme: 'nbfc',
        shortNameKey: 'labels.login.NBFC',
        titleKey: 'labels.login.Lending Suite',
        subtitleKey: 'labels.login.NBFC Subtitle',
        trustTitleKey: 'labels.login.Built for regulated lenders',
        trustTextKey: 'labels.login.Secure compliant and scalable',
        heroImageUrl: 'assets/images/cover_image_resized.webp',
        features: [
          { icon: 'money-bill', labelKey: 'labels.login.Loan Origination' },
          { icon: 'chart-line', labelKey: 'labels.login.Credit Analytics' },
          { icon: 'shield-alt', labelKey: 'labels.login.Risk Management' },
          { icon: 'globe', labelKey: 'labels.login.Portfolio Monitoring' }
        ]
      },
      MFI: {
        organizationType: 'MFI',
        theme: 'mfi',
        shortNameKey: 'labels.login.MFI',
        titleKey: 'labels.login.Microfinance Suite',
        subtitleKey: 'labels.login.MFI Subtitle',
        trustTitleKey: 'labels.login.Driving financial inclusion',
        trustTextKey: 'labels.login.Simple accessible and people first',
        heroImageUrl: 'assets/images/cover_image_resized.webp',
        features: [
          { icon: 'users', labelKey: 'labels.login.Group Lending' },
          { icon: 'handshake', labelKey: 'labels.login.Client Management' },
          { icon: 'money-bill', labelKey: 'labels.login.Collection Tracking' },
          { icon: 'file-alt', labelKey: 'labels.login.Impact Reports' }
        ]
      },
      SMALL_INSTITUTION: {
        organizationType: 'SMALL_INSTITUTION',
        theme: 'small-institution',
        shortNameKey: 'labels.login.Money Lenders',
        titleKey: 'labels.login.Suite',
        subtitleKey: 'labels.login.Small Institution Subtitle',
        trustTitleKey: 'labels.login.Designed for daily operations',
        trustTextKey: 'labels.login.Fast reliable and easy to use',
        heroImageUrl: 'assets/images/cover_image_resized.webp',
        features: [
          { icon: 'money-bill', labelKey: 'labels.login.Loan Management' },
          { icon: 'users', labelKey: 'labels.login.Customer Records' },
          { icon: 'calendar-check', labelKey: 'labels.login.Repayment Tracking' },
          { icon: 'file-alt', labelKey: 'labels.login.Business Reports' }
        ]
      }
    };

    return variants[type];
  }

  private mergeConfig(response: TenantConfigResponse): TenantBranding {
    const branding = this.getFallbackBranding(this.normalizeType(response.organizationType));

    return {
      ...branding,
      logoUrl: response.branding?.logoUrl,
      logoUrlDark: response.branding?.logoUrlDark,
      heroImageUrl: response.branding?.heroImageUrl || branding.heroImageUrl
    };
  }

  private normalizeType(value?: string): OrganizationType {
    const normalized = (value || '').trim().toUpperCase().replace(/[ -]/g, '_');
    if (normalized === 'MFI' || normalized === 'MICROFINANCE') return 'MFI';
    if (normalized === 'SMALL_INSTITUTION' || normalized === 'MONEY_LENDER' || normalized === 'SMALL_MONEY_LENDER') {
      return 'SMALL_INSTITUTION';
    }
    return 'NBFC';
  }
}
