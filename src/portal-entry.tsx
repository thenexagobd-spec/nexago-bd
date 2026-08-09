/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared entry for the role-based portal sites (driver.html, store.html,
 * store-admin.html, super-admin.html, super-admin-staff.html). Every portal
 * opens the full NexaGo admin panel with super admin access.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
