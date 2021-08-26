import { AxiosRequestConfig, default as axios } from 'axios'
import type { CentralConfig } from './sdk/central'

// Base Axios configuration, used for all requests
const axiosConfig: AxiosRequestConfig = {
  baseURL: 'http://localhost:3000',
}

// SDK configuration
export const config: CentralConfig = {
  // The method that is called on every request
  handler: async ({ method, uri, query, body }) => {
    // Axios configuration to use
    const reqConfig = { ...axiosConfig, params: query }

    // Make a request and get the server's response
    const res =
      method === 'get' || method === 'delete'
        ? axios[method](uri, reqConfig)
        : axios[method](uri, body, reqConfig)

    return res.then(
      (res) => res.data,
      (err) => {
        throw !err.response
          ? 'Unknown error happened: ' + err.code
          : `Request failed: ${err.response.status} - ${
              err.response.data?.message ?? err.response.statusText
            }`
      },
    )
  },
}
