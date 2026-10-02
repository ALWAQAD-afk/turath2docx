//#region src/types/api/page.d.ts
/**
 * Raw response returned by the `/page` endpoint.
 */
type PageApiResponse = {
  /** JSON string containing page metadata. */
  meta: string;
  /** Page body text. */
  text: string;
};
//#endregion
//#region src/types/api/search.d.ts
/**
 * Raw search hit returned by the `/search` endpoint.
 */
type SearchResult$1 = {
  /** Identifier of the matched author. */
  author_id: number;
  /** Identifier of the matched book. */
  book_id: number;
  /** Category identifier for the match. */
  cat_id: number;
  /** JSON string containing metadata for the match. */
  meta: string;
  /** Snippet of the matched content. */
  snip: string;
  /** Raw text of the matched content. */
  text: string;
};
//#endregion
//#region src/types/index.d.ts
/**
 * Metadata describing the location and attribution details for a page result.
 */
type PageMetadata = {
  /** Human-readable name of the author for the page. */
  author_name: string;
  /** Human-readable name of the book containing the page. */
  book_name: string;
  /**
   * Hierarchical headings that contextualise the page within the book's structure.
   * When no headings are available the array may be omitted.
   */
  headings?: string[];
  /** The logical page number within the book. */
  page: number;
  /** Unique identifier for the page. */
  page_id: number;
  /** Volume identifier for multi-volume works. */
  vol: string;
};
/**
 * Canonical structure returned to consumers for individual page lookups.
 */
type PageResult = {
  /** Metadata describing the page. */
  meta: PageMetadata;
} & Omit<PageApiResponse, 'meta'>;
/**
 * Fields supported by the public API for ordering search results.
 */
declare enum SortField {
  /** Sort results by page identifier. */
  PageId = "page_id",
}
/**
 * Optional arguments accepted by the {@link search} helper when querying turath.io.
 */
type SearchOptions = {
  /** Filter results by author identifier. */
  author?: number;
  /** Filter results by book identifier. */
  book?: number;
  /** Filter results by category identifier. */
  category?: number;
  /** Specific page of results to fetch when paginating. */
  page?: number;
  /** Search precision flag supported by the API. */
  precision?: number;
  /** Ordering strategy for the returned results. */
  sortField?: SortField;
};
/**
 * Search hit returned from the turath.io API with parsed metadata.
 */
type SearchResult = {
  /** Metadata describing where the hit belongs in the corpus. */
  meta: PageMetadata;
} & Omit<SearchResult$1, 'meta'>;
/**
 * Envelope containing aggregated data for a search request.
 */
type SearchResults = {
  /** Total number of search matches. */
  count: number;
  /** Individual search hits. */
  data: SearchResult[];
};
//#endregion
//#region src/types/api/author.d.ts
/**
 * Response payload returned from the `/author` endpoint.
 */
type AuthorApiResponse = {
  /** Biographical information describing the author. */
  info: string;
};
/**
 * Query parameters accepted when requesting author information.
 */
type AuthorApiQueryParameters = {
  /** Unique identifier of the author. */
  id: number;
  /** Requested API version. */
  ver: number;
};
//#endregion
//#region src/types/api/book.d.ts
/**
 * Metadata describing core attributes of the book.
 */
type BookMeta$1 = {
  /**
   * ID of the author.
   */
  author_id: number;
  /**
   * Page where author details start.
   */
  author_page_start: number;
  /**
   * Category ID that the book belongs to.
   */
  cat_id: number;
  /**
   * The date when the book metadata was built, represented as a Unix timestamp.
   */
  date_built: number;
  /**
   * Unique identifier for the book.
   */
  id: number;
  /**
   * Short information about the book.
   */
  info: string;
  /**
   * Additional detailed information about the book (may be empty).
   */
  info_long: string;
  /**
   * Name of the book.
   */
  name: string;
  /**
   * Indicates the number of times the book has been printed.
   */
  printed: number;
  /**
   * Type of the book (e.g., 5 represents a specific category or classification).
   */
  type: number;
  /**
   * Version information of the book.
   */
  version: string;
};
/**
 * Definition for each heading in the index.
 */
type BookHeading = {
  /**
   * Level of the heading (e.g., 1 for major sections, 3 for smaller subsections).
   */
  level: number;
  /**
   * Page number where this heading starts.
   */
  page: number;
  /**
   * Title of the heading.
   */
  title: string;
};
/**
 * Indexes that exist in the book.
 */
type BookIndexes$1 = {
  /**
   * Headings present within the book.
   */
  headings: BookHeading[];
  /**
   * Additional non-author content (e.g., prefaces, intros). May be empty.
   */
  non_author: any[];
  /**
   * Maps each page to the headings that begin on it.
   */
  page_headings: Record<number, number[]>;
  /**
   * Maps pages to their corresponding volume and page number.
   */
  page_map: string[];
  /**
   * Mapping from volume and print page to actual page number.
   */
  print_pg_to_pg: Record<string, number>;
  /**
   * Boundaries for each volume, specified as starting and ending page.
   */
  volume_bounds: Record<string, [number, number]>;
  /**
   * Volumes available in the book.
   */
  volumes: string[];
};
/**
 * Response payload returned from the `/book` endpoint.
 */
type BookApiResponse = {
  /**
   * Indexes of the book.
   */
  indexes: BookIndexes$1;
  /**
   * Metadata information about the book.
   */
  meta: BookMeta$1;
};
//#endregion
//#region src/types/api/bookFile.d.ts
/**
 * Meta information about a book.
 */
type BookMeta = {
  /** Identifier of the author who wrote the book. */
  author_id: number;
  /** Category identifier that classifies the book. */
  cat_id: number;
  /** Unix timestamp indicating when the data snapshot was generated. */
  date_built: number;
  /** Free-form description covering edition details and other notes. */
  details: string;
  /** Indicates whether an associated PDF is available. */
  has_pdf: boolean;
  /** Unique identifier for the book. */
  id: number;
  /** Display name of the book. */
  name: string;
  /** Size of the downloadable book asset in bytes. */
  size: number;
};
/**
 * Heading information used to navigate the book contents.
 */
type Heading = {
  /** Hierarchical level of the heading within the book structure. */
  level: number;
  /** Page number where the heading begins. */
  page: number;
  /** Human-readable title of the heading. */
  title: string;
};
/**
 * Index information about the book, including volumes and PDF mappings.
 */
type BookIndexes = {
  /** Mapping of hadith identifier to the page number where it appears. */
  hadiths: Record<string, number>;
  /** List of navigational headings within the book. */
  headings: Heading[];
  /** Base path or identifier used to locate the PDF assets. */
  pdf_base: string;
  /** Mapping of volume identifiers to their PDF filenames. */
  pdfs: Record<string, string>;
  /** Ordered list of volume names within the work. */
  volumes: string[];
};
/**
 * Generated index information providing page mappings and volume boundaries.
 */
type GeneratedIndexes = {
  /** Maximum hadith identifier present in the book. */
  hadith_max: string;
  /** Mapping of hadith identifiers to their corresponding pages. */
  hadith_pages: Record<string, string>;
  /** Mapping of page numbers to heading indices. */
  page_headings: Record<number, number[]>;
  /** Array mapping logical pages to their print-page references. */
  page_map: (null | string)[];
  /** Mapping from printed page references to logical page numbers. */
  print_pg_to_pg: Record<string, number>;
  /** Boundaries for each volume in the form of starting and ending page numbers. */
  volume_bounds: Record<string, [number, number]>;
};
/**
 * Represents an individual page within the book.
 */
type BookPage = {
  /** Page number or identifier within the volume. */
  page?: number;
  /** Text content of the page. */
  text: string;
  /** Volume identifier that the page belongs to. */
  vol?: string;
};
/**
 * Complete book information returned by the static file endpoint.
 */
type BookFileApiResponse = {
  /** Indexes for navigating the book. */
  indexes: BookIndexes;
  /** Additional generated index information for cross-references. */
  indexes_generated: GeneratedIndexes;
  /** Metadata describing the book. */
  meta: BookMeta;
  /** Full set of rendered book pages. */
  pages: BookPage[];
};
//#endregion
//#region src/api.d.ts
/**
 * Fetches author information by ID.
 *
 * @param id - The unique identifier of the author to retrieve.
 * @returns A promise that resolves to the author information.
 * @throws Will throw an error if the author is not found.
 */
declare const getAuthor: (id: number) => Promise<AuthorApiResponse>;
/**
 * Fetches the book contents by ID.
 *
 * @param id - The unique identifier of the book to retrieve.
 * @returns A promise that resolves to the book file information.
 * @throws Will throw an error if the book file is not found.
 */
declare const getBookFile: (id: number) => Promise<BookFileApiResponse>;
/**
 * Fetches the book information by ID.
 *
 * @param id - The unique identifier of the book to retrieve.
 * @returns A promise that resolves to the book information including indexes.
 */
declare const getBookInfo: (id: number) => Promise<BookApiResponse>;
/**
 * Fetches a specific page from a book by book ID and page number.
 *
 * @param bookId - The unique identifier of the book.
 * @param pageNumber - The page number to retrieve.
 * @returns A promise that resolves to the page metadata and text.
 * @throws Will throw an error if the page is not found.
 */
declare const getPage: (bookId: number, pageNumber: number) => Promise<PageResult>;
/**
 * Searches for books or content using a query string.
 *
 * @param query - The search query string.
 * @param options - Optional search options, such as category or sort field.
 * @returns A promise that resolves to the search results.
 */
declare const search: (query: string, {
  category,
  sortField,
  ...options
}?: SearchOptions) => Promise<SearchResults>;
//#endregion
export { AuthorApiQueryParameters, AuthorApiResponse, BookFileApiResponse, PageMetadata, PageResult, SearchOptions, SearchResult, SearchResults, SortField, getAuthor, getBookFile, getBookInfo, getPage, search };
//# sourceMappingURL=index.d.ts.map