/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

(function (window) {
  window['env'] = window['env'] || {};

  // BackEnd Environment variables
  window['env']['fineractApiUrls'] = '';

  window['env']['fineractApiUrl'] = '';

  window['env']['apiProvider'] = '';

  window['env']['apiVersion'] = '';

  window['env']['apiActuator'] = '';

  window['env']['fineractPlatformTenantId'] = '';

  window['env']['fineractPlatformTenantIds'] = 'aps,default';

  window['env']['tenantLogoUrl'] = '';
  window['env']['tenantLogoUrlDark'] = '';

  // Language Environment variables
  window['env']['defaultLanguage'] = '';

  window['env']['supportedLanguages'] = '';

  window['env']['defaultFormatDate'] = '';
  window['env']['defaultFormatDatetime'] = '';

  window['env']['preloadClients'] = '';

  // Char delimiter to Export CSV options: ',' ';' '|' ' '
  window['env']['defaultCharDelimiter'] = '';

  // Display or not the Server Selector
  window['env']['allowServerSwitch'] = 'true';

  // Display or not the BackEnd Info
  window['env']['displayBackEndInfo'] = '';

  // Show minimal production hero on login page
  window['env']['productionMode'] = '';

  // Display or not the Tenant Selector
  window['env']['displayTenantSelector'] = 'true';

  // Documentation base URL for in-app help links
  window['env']['documentationBaseUrl'] = '';

  // Time in seconds for Notifications, default 60 seconds
  window['env']['waitTimeForNotifications'] = '';

  // Time in seconds for COB Catch-Up, default 30 seconds
  window['env']['waitTimeForCOBCatchUp'] = '';

  // Time in milliseconds for Session idle timeout, default 300000 seconds
  window['env']['sessionIdleTimeout'] = '300000';

  // OAuth Server Enabled
  window['env']['oauthServerEnabled'] = '';

  // OAuth Server URL
  window['env']['oauthServerUrl'] = '';

  // OAuth Server Logout URL
  window['env']['oauthServerLogoutUrl'] = '';

  // OAuth Client Id
  window['env']['oauthAppId'] = '';

  // OAuth Authorize URL
  window['env']['oauthAuthorizeUrl'] = '';

  // OAuth Token URL
  window['env']['oauthTokenUrl'] = '';

  // OAuth Redirect URI
  window['env']['oauthRedirectUri'] = '';

  // OAuth Scope
  window['env']['oauthScope'] = '';

  // Min Password length
  window['env']['minPasswordLength'] = '';

  // Password Regex
  window['env']['minPasswordLength'] = '';

  // Enable or Disable HTTP Cache
  window['env']['httpCacheEnabled'] = '';

  // Hide client data (mask names)
  window['env']['complianceHideClientData'] = '';

  window['env']['mifosInterbankTransfersApiUrl'] = '';
  window['env']['mifosInterbankTransfersApiProvider'] = '';
  window['env']['mifosInterbankTransfersApiVersion'] = '';
  window['env']['mifosInterbankTransfersEnabled'] = '';

  // Remittance Module Environment variables
  window['env']['mifosRemittanceApiClientUrl'] = '';
  window['env']['mifosRemittanceApiProvider'] = '';
  window['env']['mifosRemittanceApiVersion'] = '';
  window['env']['mifosRemittanceEnabled'] = '';
  window['env']['mifosRemittanceApiClientHeader'] = '';
  window['env']['mifosRemittanceApiClientKey'] = '';

  // Mifos Copilot AI assistant
  // Set MIFOS_ENABLE_COPILOT=true to load the Copilot panel for this deployment (off by default)
  window['env']['enableCopilot'] = '';
  window['env']['copilotMcpBaseUrl'] = '';

  // Enable Role-Based Access Control (RBAC) for menu/button permissions
  // Set to 'true' to enable RBAC, 'false' (default) for backward compatibility
  window['env']['productionModeEnableRBAC'] = '';

  // External National ID System Integration
  // API key is injected server-side via nginx proxy_set_header — not exposed to browser
  window['env']['enableExternalNationalIdSystem'] = '';
  window['env']['externalNationalIdSystemUrl'] = '';
  window['env']['externalNationalIdSystemApiHeader'] = '';
  window['env']['externalNationalIdSystemApiKey'] = '';
  window['env']['externalNationalIdRegex'] = '';

  // OIDC Plugin Environment variables
  window['env']['oidcServerEnabled'] = '';
  window['env']['oidcBaseUrl'] = '';
  window['env']['oidcClientId'] = '';
  window['env']['oidcApiUrl'] = '';
  window['env']['oidcFrontUrl'] = '';
})(this);
