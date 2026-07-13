import { BASE_PATH } from "@/app/config/env";

export const URLs = {
    api: (endpoint) => apiURL(endpoint),
    tmp: (filename) => tmpURL(filename),
};


export function apiURL(endpoint) {

    const clean = endpoint.startsWith("/")
        ? endpoint.slice(1)
        : endpoint;
    return `${BASE_PATH}/api/${clean}`;
}


export function tmpURL(filename) {
    // remove initial / if there is one
    const clean = filename.startsWith("/")
	  ? filename.slice(1)
	  : filename;
    return `${BASE_PATH}/api/audio/${clean}`;
}

