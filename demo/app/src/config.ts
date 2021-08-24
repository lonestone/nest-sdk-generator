import { AxiosRequestConfig, default as axios } from 'axios'
import { CentralConfig } from '../sdk/central'

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
    const res = method === 'get' || method === 'delete' ? axios[method](uri, reqConfig) : axios[method](uri, body, reqConfig)

    try {
      // Try to wait for the server's response and get the returned data
      return (await res).data
    } catch (error) {
      // If it failed, catch the error
      if (!error.response) {
        console.error('Unknown error happened: ' + error.code)
      } else {
        console.error(`Request failed: ${error.response.status} - ${error.response.data?.message ?? error.response.statusText}`)
      }
    }
  },
}
