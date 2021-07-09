import cookie from 'cookie';
import type { Handle, GetSession } from '@sveltejs/kit';
import { oidcBaseUrl, initiateBackChannelOIDCAuth } from '$lib/auth/auth_utils';
import type { OIDCResponse } from '$lib/types';


export const handle: Handle = async ({ request, resolve }) => {

	console.log('Request path:', request.path);
	const cookies = cookie.parse(request.headers.cookie || '');
	const userInfo = cookies?.userInfo ? JSON.parse(cookies.userInfo) : {};
	

	if ( request.headers?.userid ) {
		request.locals.userid = request.headers.userid;
	} else {
		if ( userInfo?.userid ) {
			request.locals.userid = userInfo.userid;
		}
	}

	if ( request.headers?.access_token ) {
		request.locals.access_token = request.headers.access_token;
	} else {
		if ( userInfo?.access_token ) {
			request.locals.access_token = userInfo.access_token;
		}
	}

	if ( request.headers?.refresh_token ) {
		request.locals.refresh_token = request.headers.refresh_token;
	} else {
		if ( userInfo?.refresh_token ) {
			request.locals.refresh_token = userInfo.refresh_token;
		}
	}

	console.log('Request LOCALS:', request.locals);
	
	if ( request.query.get('code') ) {
		const jwts: OIDCResponse = await initiateBackChannelOIDCAuth(request.query.get('code'), request.path);
		if ( jwts.access_token ) {
			request.locals.access_token = jwts.access_token;
		}
		if ( jwts.refresh_token ) {
			request.locals.refresh_token = jwts.refresh_token;
		}
	} else {
	}
	
	console.log(request.locals.access_token);

	// TODO https://github.com/sveltejs/kit/issues/1046
	if (request.query.has('_method')) {
		request.method = request.query.get('_method').toUpperCase();
	}

	const response = await resolve(request);

	if ( !request.headers?.userid || !request.headers?.access_token || !request.headers?.refresh_token ) {
		// if this is the first time the user has visited this app,
		// set a cookie so that we recognise them when they return
		if ( request.locals.userid ) {
			response.headers['userid'] = `${request.locals.userid}`;
		}
		
		if ( request.locals.access_token ) {
			response.headers['access_token'] = `${request.locals.access_token}`;
		}
		if ( request.locals.refresh_token ) {
			response.headers['refresh_token'] = `${request.locals.refresh_token}`;
		}
	}

	if ( !userInfo?.userid || !userInfo?.access_token || !userInfo?.refresh_token ) {
		let responseCookies = {};
		let cookieSet = false;
		if ( request.locals.userid ) {
			responseCookies = {
				userid: `${request.locals.userid}`
			};
			cookieSet = true;
		}
		if ( request.locals.access_token ) {
			responseCookies['access_token'] = `${request.locals.access_token}`;
			cookieSet = true;
		}
		if ( request.locals.refresh_token ) {
			responseCookies['refresh_token'] = `${request.locals.refresh_token}`;
			cookieSet = true;
		}
		if ( cookieSet ) {
			response.headers['set-cookie'] = `userInfo=${JSON.stringify(responseCookies)}; Path=/; HttpOnly;`;
		}
	}
	return response;
};


/** @type {import('@sveltejs/kit').GetSession} */
export const getSession: GetSession = async (request) => {
	try {
		if ( request.locals?.access_token ) {
			const res = await fetch(`${oidcBaseUrl}/userinfo`, {
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${request.locals.access_token}`
				}
			});
			if ( res.ok ) {
				const data = await res.json();
				request.locals.userid = data.sub;
				return {
					user: {
						// only include properties needed client-side —
						// exclude anything else attached to the user
						// like access tokens etc
						...data
					}, 
					access_token: request.locals.access_token,
					refresh_token: request.locals.refresh_token,
					userid: data.sub
				}
			}
		} else {
			console.log('getSession request.locals.access_token ', request.locals?.access_token);
			throw {
				error: 'ACCESS JWT not found.'
			}
		}
	} catch {
		return {
			user: null,
			access_token: null,
			refresh_token: null,
			userid: null
		}
	}
}