import { ApolloClient, InMemoryCache, createHttpLink, from } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";
import logger from "./logger";

const GQL_ENDPOINT = import.meta.env.VITE_GRAPHQL_URL || "http://localhost:4000/graphql";

const httpLink = createHttpLink({ uri: GQL_ENDPOINT });

const authLink = setContext((operation, { headers }) => {
  const token = localStorage.getItem("token");
  logger.debug("ApolloClient", `[${operation.operationName ?? "anonymous"}] attaching auth header`);
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    },
  };
});

const errorLink = onError(({ graphQLErrors, networkError, operation }) => {
  const opName = operation.operationName ?? "anonymous";
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      logger.error("ApolloClient", `[${opName}] GraphQL error: ${message}`, { locations, path });
      if (message.includes("401") || message.includes("Unauthorized")) {
        logger.warn("ApolloClient", "session expired — clearing storage and redirecting to /login");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    });
  }
  if (networkError) {
    logger.error("ApolloClient", `[${opName}] network error: ${networkError.message}`, networkError);
  }
});

export const client = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
});

logger.info("ApolloClient", `initialized — endpoint: ${GQL_ENDPOINT}`);

