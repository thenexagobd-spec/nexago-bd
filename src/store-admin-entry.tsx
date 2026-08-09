/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import StoreAdminPortal from './portals/StoreAdminPortal';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode><StoreAdminPortal /></React.StrictMode>,
);
