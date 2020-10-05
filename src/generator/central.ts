export const CENTRAL_FILE = (relativePath: string, nameToImport: string | null) =>
  `

import { default as axios, AxiosRequestConfig, AxiosResponse } from "axios";
import { ${nameToImport ?? 'default'} as importedCentralConfig } from "${relativePath.replace(/\\/g, '/').replace(/\.([jt]sx?)$/, '')}";

export interface CentralConfig {
  readonly axios?: AxiosRequestConfig,
  readonly apiUrl: string,
  readonly logRequests?: boolean,
  readonly requestsLogger?: ((method: string, uri: string, query: Record<string, unknown>, body: unknown) => void),
  readonly requestsResponseLogger?: ((response: AxiosResponse, method: string, uri: string, query: Record<string, unknown>, body: unknown) => void),
  readonly hideBodyInLogs?: boolean,
  readonly dontLogRequestErrors?: boolean,
  readonly errorsLogger?: ((response: AxiosResponse, method: string, uri: string, query: Record<string, unknown>, body: unknown) => void)
}

export const config: CentralConfig = {...importedCentralConfig};

export const axiosClient = axios.create({
  ...(config.axios ?? {}),
  baseURL: config.apiUrl.endsWith('/') ? config.apiUrl : config.apiUrl + '/'
})

export async function req(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    uri: string,
    query: Record<string, unknown>,
    body: unknown
): Promise<any> {
    if (config.logRequests) {
        if (config.requestsLogger) {
            config.requestsLogger(method, uri, query, body);
        } else {
            console.debug("[NSDK] Starting Axios request with route '" + uri + "'", {
                query,
                body: config.hideBodyInLogs ? '<hidden by config>' : body,
            });
        }
    }

    return axiosClient({
        method,
        url: uri,
        params: query,
        data: body,
        responseType: 'json',
    })
      .then((response) => {
          if (config.logRequests) {
              if (config.requestsResponseLogger) {
                  config.requestsResponseLogger(response, method, uri, query, body);
              } else {
                  console.debug('[NSDK] Received ' + response.status + " response after Axios request for route '" + uri + "'", response.data);
              }
          }

          return response.data;
      })
      .catch((err) => {
          if (!config.dontLogRequestErrors) {
            if (config.errorsLogger) {
                config.errorsLogger(err, method, uri, query, body);
            } else {
                console.error("[NSDK] Axios request failed when calling route '" + uri + "'", {
                    query,
                    body: config.hideBodyInLogs ? '<hidden by config>' : body,
                    axiosResponse: err
                });
            }
          }

          return Promise.reject(err);
      })
}

`.trim()
