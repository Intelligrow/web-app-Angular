/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'mifosx-loader',
  imports: [],
  template: `
    <div class="loader-wrapper">
      <div class="secure-loader">
        <div class="ring ring-1"><span class="node"></span></div>
        <div class="ring ring-2"><span class="node"></span></div>
        <div class="ring ring-3"><span class="node"></span></div>
        <div class="logo-container">
          <img src="assets/images/intelligrow-white.png" alt="Intelligrow" class="loader-logo">
        </div>
      </div>
      <div class="loader-text">
        Securing your workspace<span class="dots"><span>.</span><span>.</span><span>.</span></span>
      </div>
    </div>
  `,
  styles: [
    `
      .loader-wrapper {
        position: fixed;
        inset: 0;
        background: #0F172A;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        }
      
      .secure-loader {
        position: relative;
        width: 180px;
        height: 180px;
      }
      
      .ring {
        position: absolute;
        border-radius: 50%;
        border: 2px solid transparent;
        will-change: transform;
      }
      
      .ring-1 {
        inset: 0;
        border-top-color: #2563EB;
        box-shadow: 0 0 8px 0 rgba(37,99,235,.5);
        animation: rotate 2.4s cubic-bezier(0.65, 0, 0.35, 1) infinite;
      }
      
      .ring-2 {
        inset: 18px;
        border-top-color: #14B8A6;
        box-shadow: 0 0 8px 0 rgba(20,184,166,.5);
        animation: rotateReverse 3.2s cubic-bezier(0.65, 0, 0.35, 1) infinite;
      }
      
      .ring-3 {
        inset: 36px;
        border-top-color: #60A5FA;
        box-shadow: 0 0 8px 0 rgba(96,165,250,.5);
        animation: rotate 1.8s cubic-bezier(0.65, 0, 0.35, 1) infinite;
      }
      
      .node {
        position: absolute;
        width: 8px;
        height: 8px;
        background: #fff;
        border-radius: 50%;
        top: -4px;
        left: 50%;
        transform: translateX(-50%);
        box-shadow: 0 0 8px 2px rgba(255,255,255,.8);
      }

      .logo-container {
        position: absolute;
        inset: 50%;
        transform: translate(-50%, -50%);
        width: 120px;
        height: 120px;
        display: flex;
        justify-content: center;
        align-items: center;
        background: #111827;
        border-radius: 50%;
        overflow: hidden;
        box-shadow:
          0 0 24px rgba(37,99,235,.3),
          inset 0 0 1px rgba(255,255,255,.1);
        animation: pulse 3s ease-in-out infinite;
      }

      .loader-logo {
        width: 80%;
        height: 80%;
        object-fit: contain;
      }

      .loader-text {
        margin-top: 32px;
        color: #E2E8F0;
        font-size: 15px;
        font-family: Roboto, sans-serif;
        letter-spacing: 0.6px;
        display: flex;
        align-items: baseline;
        animation: textFade 2.4s ease-in-out infinite;
      }

      .dots span {
        display: inline-block;
        animation: dotBounce 1.4s ease-in-out infinite;
      }
      .dots span:nth-child(2) { animation-delay: .15s; }
      .dots span:nth-child(3) { animation-delay: .3s; }

      @keyframes rotate {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      @keyframes rotateReverse {
        from { transform: rotate(360deg); }
        to { transform: rotate(0deg); }
      }

      @keyframes pulse {
        0%, 100% {
          transform: translate(-50%, -50%) scale(1);
          box-shadow: 0 0 20px rgba(37,99,235,.3), inset 0 0 1px rgba(255,255,255,.1);
        }
        50% {
          transform: translate(-50%, -50%) scale(1.05);
          box-shadow: 0 0 36px rgba(37,99,235,.55), inset 0 0 1px rgba(255,255,255,.15);
        }
      }

      @keyframes textFade {
        0%, 100% { opacity: .55; }
        50% { opacity: 1; }
      }

      @keyframes dotBounce {
        0%, 60%, 100% { opacity: .3; transform: translateY(0); }
        30% { opacity: 1; transform: translateY(-2px); }
      }

      @media (prefers-reduced-motion: reduce) {
        .ring, .logo-container, .loader-text, .dots span {
          animation-duration: 0.001ms !important;
          animation-iteration-count: 1 !important;
        }
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoaderComponent {}
