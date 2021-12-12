import { httpAgent, httpsAgent } from './agent';
import { inspect } from 'util';
import got from 'got';
import * as Got from 'got';
import { StatusError } from './status-error';
import { detectEncoding, toUtf8 } from './encoding';

async function main(url: string) {
	const json = await getHtml(url);
	console.log(inspect(json));
}

const RESPONSE_TIMEOUT = 30 * 1000;
const OPERATION_TIMEOUT = 60 * 1000;
const MAX_RESPONSE_SIZE = 10 * 1024 * 1024;

export async function getHtml(url: string): Promise<void> {
	const res = await getResponse({
		url,
		headers: {
			Accept: 'text/html'
		},
	});

	const encoding = detectEncoding(res.headers['content-type'], res.rawBody);
	const str = toUtf8(res.rawBody, encoding);
	console.log(str);
}

export async function getResponse(args: { url: string, headers: Record<string, string> }) {
	const timeout = RESPONSE_TIMEOUT;
	const operationTimeout = OPERATION_TIMEOUT;

	const req = got<any>(args.url, {
		method: 'GET',
		headers: args.headers,
		timeout: {
			lookup: timeout,
			connect: timeout,
			secureConnect: timeout,
			socket: timeout,	// read timeout
			response: timeout,
			send: timeout,
			request: operationTimeout,	// whole operation timeout
		},
		agent: {
			http: httpAgent,
			https: httpsAgent,
		},
		http2: false,
		retry: 0,
	});

	return await receiveHtml(req, MAX_RESPONSE_SIZE);
}

async function receiveHtml<T>(req: Got.CancelableRequest<Got.Response<T>>, maxSize: number) {
	req.on('response', (res: Got.Response) => {
		// Check html
		if (!res.headers['content-type']?.match(/^text\/html/)) {
			req.cancel(`not a html ${res.headers['content-type']}`);
			return;
		}

		// 応答ヘッダでサイズチェック
		const contentLength = res.headers['content-length'];
		if (contentLength != null) {
			const size = Number(contentLength);
			if (size > maxSize) {
				req.cancel(`maxSize exceeded (${size} > ${maxSize}) on response`);
			}
		}
	});
	
	// 受信中のデータでサイズチェック
	req.on('downloadProgress', (progress: Got.Progress) => {
		if (progress.transferred > maxSize && progress.percent !== 1) {
			req.cancel(`maxSize exceeded (${progress.transferred} > ${maxSize}) on response`);
		}
	});

	// 応答取得 with ステータスコードエラーの整形
	const res = await req.catch(e => {
		if (e instanceof Got.HTTPError) {
			throw new StatusError(`${e.response.statusCode} ${e.response.statusMessage}`, e.response.statusCode, e.response.statusMessage);
		} else {
			throw e;
		}
	});

	return res;
}

const args = process.argv.slice(2);
const url = args[0];

main(url).catch(e => {
	console.log(inspect(e));
	console.log(`${e}`);
})
