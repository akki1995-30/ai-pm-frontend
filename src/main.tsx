import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ApolloProvider } from '@apollo/client';
import './index.css';
import App from './App.tsx';
import { client } from './lib/apolloClient';
import { AuthProvider } from './context/AuthContext';
import logger from './lib/logger';

logger.info("main", "FlowBoard app bootstrapping...");

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ApolloProvider client={client}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ApolloProvider>
  </StrictMode>,
);

logger.info("main", "app mounted successfully");
