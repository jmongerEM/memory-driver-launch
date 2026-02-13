import React, { StrictMode } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { StartClient } from '@tanstack/react-start/client'

// Must mount the app: hydrateStart() only hydrates router state; StartClient renders the tree
hydrateRoot(document, React.createElement(StrictMode, null, React.createElement(StartClient)))
