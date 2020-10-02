export const CENTRAL_FILE = (relativePath: string, nameToImport: string | null) =>
  `

import { default as axios, AxiosRequestConfig } from "axios";
import { ${nameToImport ?? 'default'} as importedCentralConfig } from "${relativePath.replace(/\\/g, '/').replace(/\.([jt]sx?)$/, '')}";

export interface CentralConfig {
  readonly axios?: AxiosRequestConfig,
  readonly apiUrl: string,
  readonly logRequests?: boolean,
  readonly hideBodyInLogs?: boolean
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
): Promise<object> {
    if (config.logRequests) {
        console.debug("[NSDK] Starting Axios request with route '" + uri + "'", {
            query,
            body: config.hideBodyInLogs ? '<hidden by config>' : body,
        });
    }

    return axios({
        method,
        url: uri,
        params: query,
        data: body,
        responseType: 'json',
    })
      .then((response) => {
          if (config.logRequests) {
              console.debug('[NSDK] Received ' + response.status + " response after Axios request for route '" + uri + "'", response);
          }

          return response.data;
      })
      .catch((err) => {
          console.error("[NSDK] Axios request failed when calling route '" + uri + "'", { query, body, axiosResponse: err });
          throw new Error("Axios request failed at route '" + uri + "'");
      })
}

`.trim()
