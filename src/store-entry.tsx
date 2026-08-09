/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import StorePortal from './portals/StorePortal';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode><StorePortal /></React.StrictMode>,
);
