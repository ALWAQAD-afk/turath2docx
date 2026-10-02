//#region src/types/api/book.ts
/**
* Supported include flags for enriching the `/book` response.
*/
let Includes = /* @__PURE__ */ function(Includes$1) {
	Includes$1["Indexes"] = "indexes";
	return Includes$1;
}({});

//#endregion
//#region src/utils/network.ts
const API_BASE_URL = "https://api.turath.io/";
const FILES_BASE_URL = "https://files.turath.io/books/";
/**
* Creates a typed {@link HttpError} from a failed {@link Response}.
*/
const createHttpError = (response) => {
	const error = /* @__PURE__ */ new Error(`Request to ${response.url} failed with status ${response.status}`);
	error.status = response.status;
	error.statusText = response.statusText;
	error.url = response.url;
	return error;
};
/**
* Converts a path relative to a base URL into an absolute {@link URL} instance.
*/
const toUrl = (baseUrl, path) => {
	const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
	return new URL(normalizedPath, baseUrl);
};
/**
* Performs an HTTP GET request and parses the JSON payload.
*/
const fetchJson = async (url) => {
	const response = await fetch(url, { headers: { Accept: "application/json" } });
	if (!response.ok) throw createHttpError(response);
	return await response.json();
};
/**
* Appends the provided query parameters to the supplied URL.
*/
const appendQueryParameters = (url, queryParams) => {
	Object.entries(queryParams).forEach(([key, value]) => {
		if (value === void 0 || value === null) return;
		url.searchParams.set(key, String(value));
	});
};
/**
* Fetches JSON payloads for static book files hosted on the file CDN.
*
* @param path - The file path relative to the base books endpoint (e.g. `/1207.json`).
* @returns A promise that resolves with the parsed JSON response.
*/
const getFileJson = async (path) => {
	return fetchJson(toUrl(FILES_BASE_URL, path));
};
/**
* Executes a GET request against the primary turath.io API.
*
* @param path - The endpoint path to request (e.g. `/search`).
* @param queryParams - Optional query parameters to append to the request.
* @returns A promise that resolves with the parsed JSON body.
*/
const getJson = async (path, queryParams = {}) => {
	const url = toUrl(API_BASE_URL, path);
	appendQueryParameters(url, queryParams);
	return fetchJson(url);
};

//#endregion
//#region src/api.ts
/**
* Version of the public API requested for all outbound calls.
*/
const API_VERSION_NUMBER = 3;
/**
* Runtime type guard ensuring a thrown error exposes an HTTP status code.
*/
const isHttpError = (error) => {
	return typeof error === "object" && error !== null && "status" in error && typeof error.status === "number";
};
/**
* Fetches author information by ID.
*
* @param id - The unique identifier of the author to retrieve.
* @returns A promise that resolves to the author information.
* @throws Will throw an error if the author is not found.
*/
const getAuthor = async (id) => {
	const { info } = await getJson("/author", {
		id,
		ver: API_VERSION_NUMBER
	});
	if (!info) throw new Error(`Author ${id} not found`);
	return { info };
};
/**
* Fetches the book contents by ID.
*
* @param id - The unique identifier of the book to retrieve.
* @returns A promise that resolves to the book file information.
* @throws Will throw an error if the book file is not found.
*/
const getBookFile = async (id) => {
	try {
		return await getFileJson(`/${id}.json`);
	} catch (error) {
		if (isHttpError(error) && error.status === 404) throw new Error(`Book ${id} not found`);
		throw error;
	}
};
/**
* Fetches the book information by ID.
*
* @param id - The unique identifier of the book to retrieve.
* @returns A promise that resolves to the book information including indexes.
*/
const getBookInfo = async (id) => {
	return await getJson(`/book`, {
		id,
		include: Includes.Indexes,
		ver: API_VERSION_NUMBER
	});
};
/**
* Fetches a specific page from a book by book ID and page number.
*
* @param bookId - The unique identifier of the book.
* @param pageNumber - The page number to retrieve.
* @returns A promise that resolves to the page metadata and text.
* @throws Will throw an error if the page is not found.
*/
const getPage = async (bookId, pageNumber) => {
	const { meta, text } = await getJson("/page", {
		book_id: bookId,
		pg: pageNumber,
		ver: API_VERSION_NUMBER
	});
	if (!meta && !text) throw new Error(`Book ${bookId}, page ${pageNumber} not found`);
	return {
		meta: JSON.parse(meta),
		text
	};
};
/**
* Searches for books or content using a query string.
*
* @param query - The search query string.
* @param options - Optional search options, such as category or sort field.
* @returns A promise that resolves to the search results.
*/
const search = async (query, { category, sortField, ...options } = {}) => {
	const { count, data } = await getJson("/search", {
		...options,
		...category && { cat_id: category },
		...sortField && { sort: sortField },
		q: query,
		ver: API_VERSION_NUMBER
	});
	return {
		count,
		data: data.map((r) => ({
			...r,
			meta: JSON.parse(r.meta)
		}))
	};
};

//#endregion
//#region src/types/index.ts
/**
* Fields supported by the public API for ordering search results.
*/
let SortField = /* @__PURE__ */ function(SortField$1) {
	/** Sort results by page identifier. */
	SortField$1["PageId"] = "page_id";
	return SortField$1;
}({});

//#endregion
export { SortField, getAuthor, getBookFile, getBookInfo, getPage, search };
//# sourceMappingURL=index.js.map