import type { Request } from '@sveltejs/kit';
import type { Locals, OIDCResponse } from '$lib/types';
import { isTokenExpired, renewOIDCToken } from '$lib/auth/auth_utils';
/*
	This module is used by the /todos.json and /todos/[uid].json
	endpoints to make calls to api.svelte.dev, which stores todos
	for each user. The leading underscore indicates that this is
	a private module, _not_ an endpoint — visiting /todos/_api
	will net you a 404 response.

	(The data on the todo app will expire periodically; no
	guarantees are made. Don't use it to organise your life.)
*/

const base = 'http://localhost:18080/api/rest';

export async function api(request: Request<Locals>, resource: string, data?: {}) {
	console.log('REQUEST: ', request.path);
	// user must have a cookie set
	if (!request.locals.access_token ) {
		return { status: 401 };
	}
	let newAuthHeaders = {
		custom_header: 'custom_header'
	};

	if ( isTokenExpired(request.locals.access_token) ) {
		console.log('TOKEN WAS EXPIRED');
		const jwts: OIDCResponse = await renewOIDCToken(request.locals);
		if ( jwts.error || jwts.error_description ) {
			return {
				status: 401,
				body: {
					...jwts
				}
			}
		}
		request.locals.access_token = jwts.access_token;
		request.locals.refresh_token = jwts.refresh_token;
		newAuthHeaders['access_token'] = jwts.access_token;
		newAuthHeaders['refresh_token'] = jwts.refresh_token;
		newAuthHeaders['userid'] = request.locals.userid;
	}
	const res = await fetch(`${base}/${resource}`, {
		method: request.method,
		headers: {
			'content-type': 'application/json',
			'Authorization': `Bearer ${request.locals.access_token}`
		},
		body: data && JSON.stringify(data)
	});

	// if the request came from a <form> submission, the browser's default
	// behaviour is to show the URL corresponding to the form's "action"
	// attribute. in those cases, we want to redirect them back to the
	// /todos page, rather than showing the response
	if (res.ok && request.method !== 'GET' && request.headers.accept !== 'application/json') {
		return {
			status: 303,
			headers: {
				location: '/todos',
				...newAuthHeaders
			}
		};
	}
	const resData = await res.json();
	return {
		status: res.status,
		headers: {
			...newAuthHeaders
		},
		body: resData,
	};
}
