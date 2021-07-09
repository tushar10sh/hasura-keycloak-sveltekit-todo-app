import { v4 as uuid } from '@lukeed/uuid';
import type { LoadOutput } from '@sveltejs/kit';
import type { OIDCResponse } from '$lib/types';
import type { Locals } from '$lib/types';

const clientId = 'hasura-app';
// const clientSecret = '80b9559b-1d93-42ef-9232-5d60436901f9';
const clientSecret = 'b6621de5-054b-4942-a11f-0cbe778b6c65';
const realm = 'hasura';
export const oidcBaseUrl = `http://localhost:28080/auth/realms/${realm}/protocol/openid-connect`;

export function isTokenExpired(jwt: string): boolean {
    const tokenTimeSkew =10;  // 10 seconds before actual token exp
    const data = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64').toString());
	return ( new Date().getTime()/1000 > (data.exp - tokenTimeSkew) ) ;
}

export function initiateFrontChannelOIDCAuth(browser: boolean, path: string): LoadOutput {
    const appRedirectUrl = `http://localhost:3000${path}`;
    const oidcRedirectUrlWithParams = [
        `${oidcBaseUrl}/auth?scope=openid`,
        `client_id=${clientId}`,
        `redirect_uri=${browser ? encodeURIComponent(appRedirectUrl) : appRedirectUrl}`,
        'response_type=code',
        'response_mode=query',
        `nonce=${uuid()}`
    ];
    console.log(oidcRedirectUrlWithParams);
    return {
        redirect: oidcRedirectUrlWithParams.join('&'),
        status: 302
    }
}

export async function initiateBackChannelOIDCAuth(authCode: string, requestPath?: string): Promise<OIDCResponse>  {
    let formBody = [
        'code=' + authCode,
        'client_id=' + clientId,
        'client_secret=' + clientSecret,
        'grant_type=authorization_code',
        'redirect_uri=' + encodeURIComponent('http://localhost:3000' + requestPath || '/'),
    ];

    const res = await fetch(`${oidcBaseUrl}/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formBody.join('&')
    });

    if ( res.ok ) {
        const data: OIDCResponse = await res.json();
        return data;
    } else {
        const data: OIDCResponse = await res.json();
        console.log('response not ok');
        console.log(data);
        return data;
    }
}


export async function renewOIDCToken(requestLocals: Locals): Promise<OIDCResponse>  {
    let formBody = [
        'refresh_token=' + requestLocals.refresh_token,
        'client_id=' + clientId,
        'client_secret=' + clientSecret,
        'grant_type=refresh_token',
    ];

    const res = await fetch(`${oidcBaseUrl}/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formBody.join('&')
    });

    if ( res.ok ) {
        const newToken = await res.json()
        const data: OIDCResponse = {
            ...newToken,
            refresh_token: requestLocals.refresh_token
        };
        return data;
    } else {
        const data: OIDCResponse = await res.json();
        console.log('response not ok');
        console.log(data);
        return data;
    }
}

export function syncAuthWithBrowserState(browser: boolean, session_user: Locals): void {
    if ( browser ) {
        const { access_token, refresh_token, userid } = session_user;
        const userInfo = {
            userid,
            access_token,
            refresh_token,
            updated: true
        }
        document.cookie = `userInfo=${JSON.stringify(userInfo)}; Path=/; HttpOnly;`;
    }
} 

export function resetAuthInBrowserState(browser): void {
    const newAuthHeaders: Locals = {
        userid: null,
        access_token: null,
        refresh_token: null,
    }
    syncAuthWithBrowserState(browser, newAuthHeaders);
}