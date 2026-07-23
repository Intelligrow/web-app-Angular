/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

const tenantDomain = 'intelligrow.co';

export function getTenantIdFromURL(): string | undefined {
  const hostname = window.location.hostname.toLowerCase();

  if (!hostname.endsWith(tenantDomain)) {
    return undefined;
  }

  const domains = hostname.split('.');
  const tenantId = domains[0];

  if (!tenantId || tenantId === 'www' || tenantId === tenantDomain.split('.')[0]) {
    return undefined;
  }

  return tenantId;
}
