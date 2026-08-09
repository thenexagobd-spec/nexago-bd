/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import StaffPortal from './portals/StaffPortal';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode><StaffPortal /></React.StrictMode>,
);
