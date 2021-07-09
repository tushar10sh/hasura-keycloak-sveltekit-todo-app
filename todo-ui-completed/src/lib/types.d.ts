/**
 * Can be made globally available by placing this
 * inside `global.d.ts` and removing `export` keyword
 */
export interface Locals {
	userid: string;
	access_token: string;
	refresh_token: string;
}

export interface OIDCSuccessResponse {
	access_token: string;
	id_token: string;
	refresh_token: string;
}

export interface OIDCFailureResponse {
	error: string;
	error_description: string;
}

export type OIDCResponse = OIDCSuccessResponse & OIDCFailureResponse;