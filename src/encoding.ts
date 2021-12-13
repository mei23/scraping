import * as iconv from 'iconv-lite';
import * as jschardet from 'jschardet';
import { inspect } from 'util';

const DEBUG = true;

const regCharset = new RegExp(/charset\s*=\s*["']?([\w-]+)/, 'i');

/**
 * Detect HTML encoding
 * @param contentType Content-Type
 * @param body Body in Buffer
 * @returns encoding
 */
export function detectEncoding(contentType?: string, body?: Buffer): string {
	// By detection
	const detected = jschardet.detect(body, { minimumThreshold: 0.99 });
	{
		const candicate = detected.encoding;
		if (DEBUG) console.log(`charset from content: ${candicate}`);
		const encoding = toEncoding(candicate);
		if (DEBUG) console.log(`charset from content decided: ${encoding}`);
		if (encoding != null) return encoding;
	}

	// From meta
	const matchMeta = body?.toString('ascii').match(regCharset);
	if (matchMeta) {
		const candicate = matchMeta[1];
		if (DEBUG) console.log(`charset from meta: ${candicate}`);
		const encoding = toEncoding(candicate);
		if (DEBUG) console.log(`charset from meta decided: ${encoding}`);
		if (encoding != null) return encoding;
	}

	// From HTTP heaer
	const matchHader= contentType?.match(regCharset);
	if (matchHader) {
		const candicate = matchHader[1];
		if (DEBUG) console.log(`charset from header: ${candicate}`);
		const encoding = toEncoding(candicate);
		if (DEBUG) console.log(`charset from header decided: ${encoding}`);
		if (encoding != null) return encoding;
	}

	return 'utf-8';
}

export function toUtf8(body: Buffer, encoding: string): string {
	return iconv.decode(body, encoding);
}

function toEncoding(candicate: string): string | null {
	if (iconv.encodingExists(candicate)) {
		if (['shift_jis', 'shift-jis', 'windows-31j', 'x-sjis'].includes(candicate.toLowerCase())) return 'cp932';
		return candicate;
	} else {
		return null;
	}
}
